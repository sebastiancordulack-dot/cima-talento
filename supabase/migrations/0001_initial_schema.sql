-- ============================================================================
-- CiMA Talento — Talent Pipeline Platform
-- Migration 0001: Initial schema
--
-- Builds the full candidate hiring pipeline AND the foundation for the future
-- staffing marketplace (dispatch board). Location, availability, and active
-- status are first-class fields so dispatch matching can be layered on later
-- without a rewrite.
--
-- Tables:  hiring_managers, candidates, candidate_status_history,
--          talent_pool, email_log
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto (available by default on Supabase).
create extension if not exists pgcrypto;


-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- The exhaustive candidate pipeline status. Every candidate always has one of
-- these — nothing sits in limbo. (Brief §3)
create type candidate_status as enum (
  'new',              -- form submitted, Email 1 sent, awaiting scheduling
  'scheduled',        -- call booked with hiring manager
  'in_review',        -- HM call completed, awaiting HM decision
  'advanced',         -- HM approved, Email 3 sent, awaiting Julia call
  'julia_scheduled',  -- Julia call booked
  'approved',         -- Julia approved, Email 4 sent, added to talent pool
  'rejected_hm',      -- HM marked not a fit, Email 2 sent
  'rejected_julia',   -- Julia did not approve, Email 5 sent
  'no_show'           -- candidate did not show for a scheduled call
);

-- Platform roles. `julia` is kept distinct from `admin` so her simplified
-- approval view and the general admin view can diverge; `regional_manager`
-- is reserved for the future marketplace (Brief §10, §12).
create type user_role as enum (
  'admin',
  'hiring_manager',
  'julia',
  'regional_manager'
);

-- HM verdict from the vetting scorecard.
create type hm_decision as enum ('fit', 'not_fit');

-- Julia's final approval verdict.
create type julia_decision as enum ('approved', 'not_approved');

-- Maps 1:1 to the five Spanish email templates (Brief §7).
create type email_type as enum (
  'availability',     -- Email 1 — Disponibilidad
  'rejection_hm',     -- Email 2 — No es un fit
  'schedule_julia',   -- Email 3 — Agenda con Julia
  'welcome',          -- Email 4 — Bienvenido/a
  'rejection_julia'   -- Email 5 — No avanza
);

-- Resend delivery lifecycle.
create type email_status as enum ('queued', 'sent', 'delivered', 'failed', 'bounced');


-- ============================================================================
-- 2. UPDATED_AT TRIGGER HELPER
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================================
-- 3. HIRING MANAGERS
-- Internal staff: hiring managers, Julia (admin), future regional managers.
-- `auth_user_id` links to Supabase Auth and drives RLS (wired up in Step 9).
-- ============================================================================

create table public.hiring_managers (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  auth_user_id    uuid unique references auth.users (id) on delete set null,
  name            text not null,
  email           text not null unique,
  calendly_link   text,
  assigned_metros text[] not null default '{}',  -- metro areas this person manages
  role            user_role not null default 'hiring_manager',
  active          boolean not null default true
);

create index hiring_managers_role_idx       on public.hiring_managers (role);
create index hiring_managers_metros_idx      on public.hiring_managers using gin (assigned_metros);
create index hiring_managers_auth_user_idx   on public.hiring_managers (auth_user_id);

create trigger hiring_managers_set_updated_at
  before update on public.hiring_managers
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 4. CANDIDATES
-- The heart of the pipeline. One row per person from form submission through
-- every funnel stage. Scorecard data lives here (jsonb + denormalized total).
-- ============================================================================

create table public.candidates (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Contact / identity (from form)
  first_name            text not null,
  last_name             text,
  email                 text not null unique,
  phone                 text,

  -- Location (city/zip from form; metro/state derived on ingestion — Brief §9)
  city                  text,
  zip_code              text,
  metro_area            text,
  state                 text,

  -- Pipeline state
  status                candidate_status not null default 'new',

  -- Attribution & dedup
  source_ad_location    text,   -- which Meta ad/location brought them in
  fillout_submission_id text,   -- raw submission id, for traceability

  -- Free-form HM / Julia call notes
  notes                 text,

  -- Bonus signals (Brief §8 step 3 — not scored, inform borderline calls)
  bilingual             boolean,
  prior_experience      boolean,
  app_comfortable       boolean,

  -- Hard filters (Brief §8 step 1 — any false ⇒ rejected_hm). Verbal only;
  -- no document verification is built into the pipeline (Brief §14).
  has_vehicle           boolean,
  work_authorized       boolean,
  available_mf          boolean,
  works_independently   boolean,

  -- Scorecard (Brief §8 step 2 — 7 questions × 1–3 pts, max 21)
  score_total           integer check (score_total is null or score_total between 0 and 21),
  scorecard_data        jsonb not null default '{}'::jsonb,

  -- Decisions
  hm_decision           hm_decision,
  julia_decision        julia_decision,

  -- Key timestamps
  hm_call_at            timestamptz,
  julia_call_at         timestamptz,
  talent_pool_added_at  timestamptz
);

-- Views organize by metro and filter by status (Brief §5); index accordingly.
create index candidates_status_idx        on public.candidates (status);
create index candidates_metro_area_idx     on public.candidates (metro_area);
create index candidates_state_idx          on public.candidates (state);
create index candidates_created_at_idx     on public.candidates (created_at desc);
create index candidates_fillout_sub_idx    on public.candidates (fillout_submission_id);

create trigger candidates_set_updated_at
  before update on public.candidates
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 5. CANDIDATE STATUS HISTORY
-- Append-only timeline powering the "Status history" panel on the full
-- profile (Brief §5.1). One row per transition.
-- ============================================================================

create table public.candidate_status_history (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  candidate_id  uuid not null references public.candidates (id) on delete cascade,
  from_status   candidate_status,                 -- null on creation
  to_status     candidate_status not null,
  changed_by    uuid references public.hiring_managers (id) on delete set null,
  note          text
);

create index candidate_status_history_candidate_idx
  on public.candidate_status_history (candidate_id, created_at);

-- Auto-log every status change (and the initial insert) into the timeline.
create or replace function public.log_candidate_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.candidate_status_history (candidate_id, from_status, to_status)
    values (new.id, null, new.status);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.candidate_status_history (candidate_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

create trigger candidates_log_status_insert
  after insert on public.candidates
  for each row execute function public.log_candidate_status_change();

create trigger candidates_log_status_update
  after update on public.candidates
  for each row execute function public.log_candidate_status_change();


-- ============================================================================
-- 6. TALENT POOL
-- Approved candidates. This becomes the dispatch board, so availability,
-- location, and active status are first-class structured fields (Brief §12).
-- ============================================================================

create table public.talent_pool (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  candidate_id        uuid not null unique references public.candidates (id) on delete cascade,
  metro_area          text,
  state               text,
  -- Structured days/hours for future dispatch matching, e.g.
  -- {"mon": ["09:00-17:00"], "tue": [...]} — NOT free text (Brief §12).
  availability        jsonb not null default '{}'::jsonb,
  active              boolean not null default true,   -- available for assignments
  onboarding_complete boolean not null default false
);

create index talent_pool_metro_area_idx on public.talent_pool (metro_area);
create index talent_pool_state_idx        on public.talent_pool (state);
create index talent_pool_active_idx       on public.talent_pool (active);

create trigger talent_pool_set_updated_at
  before update on public.talent_pool
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 7. EMAIL LOG
-- Every automated Resend send, for the email log panel and delivery tracking.
-- ============================================================================

create table public.email_log (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  candidate_id  uuid not null references public.candidates (id) on delete cascade,
  email_type    email_type not null,
  sent_at       timestamptz not null default now(),
  resend_id     text,                              -- Resend message id
  status        email_status not null default 'sent',
  error_message text
);

create index email_log_candidate_idx on public.email_log (candidate_id, sent_at);
create index email_log_type_idx        on public.email_log (email_type);
create index email_log_resend_idx      on public.email_log (resend_id);


-- ============================================================================
-- 8. RLS HELPER FUNCTIONS
-- SECURITY DEFINER so policies can read hiring_managers without recursing
-- into its own RLS. Used by the policies below.
-- ============================================================================

-- The role of the currently authenticated user (null if not internal staff).
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.hiring_managers
  where auth_user_id = auth.uid() and active
  limit 1;
$$;

-- True for admins and Julia (full access to all metros/candidates).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'julia');
$$;

-- Metro areas the current user is allowed to see ('{}' if none/not staff).
create or replace function public.current_user_metros()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select assigned_metros from public.hiring_managers
       where auth_user_id = auth.uid() and active limit 1),
    '{}'::text[]
  );
$$;


-- ============================================================================
-- 9. ROW LEVEL SECURITY
-- Enable RLS on every table. The service-role key (used by server actions and
-- the Fillout webhook) bypasses RLS entirely, so ingestion/email logging keep
-- working. These policies scope what authenticated *staff* can see in the UI:
--   • admin / julia  → everything
--   • hiring_manager → candidates in their assigned metros
-- Full auth wiring happens in Step 9; policies are defined now so access is
-- closed-by-default from day one.
-- ============================================================================

alter table public.hiring_managers          enable row level security;
alter table public.candidates               enable row level security;
alter table public.candidate_status_history enable row level security;
alter table public.talent_pool              enable row level security;
alter table public.email_log                enable row level security;

-- ---- hiring_managers --------------------------------------------------------
-- Staff can read their own row; admins manage everyone.
create policy hiring_managers_select_self on public.hiring_managers
  for select to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());

create policy hiring_managers_admin_all on public.hiring_managers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- candidates -------------------------------------------------------------
-- Admin/Julia see all; HMs see candidates in their metros (or unassigned ones,
-- so nothing falls through the cracks before a metro is mapped).
create policy candidates_select on public.candidates
  for select to authenticated
  using (
    public.is_admin()
    or metro_area = any (public.current_user_metros())
    or metro_area is null
  );

create policy candidates_update on public.candidates
  for update to authenticated
  using (
    public.is_admin()
    or metro_area = any (public.current_user_metros())
    or metro_area is null
  )
  with check (
    public.is_admin()
    or metro_area = any (public.current_user_metros())
    or metro_area is null
  );

-- Inserts come from the webhook (service role); admins may also add manually.
create policy candidates_admin_insert on public.candidates
  for insert to authenticated
  with check (public.is_admin());

create policy candidates_admin_delete on public.candidates
  for delete to authenticated
  using (public.is_admin());

-- ---- candidate_status_history ----------------------------------------------
-- Visible to whoever can see the underlying candidate. Append-only via
-- triggers (service role), so no insert/update/delete policies for staff.
create policy status_history_select on public.candidate_status_history
  for select to authenticated
  using (
    exists (
      select 1 from public.candidates c
      where c.id = candidate_status_history.candidate_id
        and (
          public.is_admin()
          or c.metro_area = any (public.current_user_metros())
          or c.metro_area is null
        )
    )
  );

-- ---- talent_pool ------------------------------------------------------------
-- All authenticated staff can read the talent network; admins manage it.
create policy talent_pool_select on public.talent_pool
  for select to authenticated
  using (
    public.is_admin()
    or metro_area = any (public.current_user_metros())
    or metro_area is null
  );

create policy talent_pool_admin_write on public.talent_pool
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- email_log --------------------------------------------------------------
-- Visible alongside the candidate; writes are service-role only.
create policy email_log_select on public.email_log
  for select to authenticated
  using (
    exists (
      select 1 from public.candidates c
      where c.id = email_log.candidate_id
        and (
          public.is_admin()
          or c.metro_area = any (public.current_user_metros())
          or c.metro_area is null
        )
    )
  );
