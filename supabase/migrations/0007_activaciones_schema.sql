-- ============================================================================
-- CiMA Hub — CiMA Activaciones Module
-- Migration 0007: Activaciones schema
--
-- Second CiMA Hub module: brand clients submit activation requests
-- (Solicitudes) through the external Client Portal; the CiMA team reviews,
-- verifies, quotes, confirms, and staffs them from the Talento talent pool.
-- (Activaciones Brief §2, §9)
--
-- Adds:     brand_clients, solicitudes, solicitud_assignments,
--           solicitud_changes, solicitud_status_log, activaciones_email_log
--           + enums, triggers, RLS policies, client-safe read views, and a
--           talent date-conflict guard (Brief §16).
--
-- Existing Talento tables/columns are NOT modified. Section 11 does, however,
-- tighten six existing *read policies* that assumed every authenticated user
-- is CiMA staff — mandatory now that brand-client logins share the same
-- Supabase Auth instance (Brief §10). Staff-visible behavior is unchanged.
--
-- Run this in the Supabase SQL editor.
-- ============================================================================


-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- In-store vs field/event activation — two Solicitud forms (Brief §5).
create type activation_type as enum ('in_store', 'field_event');

-- The full Solicitud lifecycle (Brief §8). Every request always has exactly
-- one of these — nothing sits without a visible status.
create type solicitud_status as enum (
  'submitted',        -- client submitted, awaiting CiMA review
  'in_review',        -- CiMA reviewing / verifying with store / building quote
  'changes_proposed', -- CiMA proposed a change; ball in client's court
  'quote_sent',       -- quote delivered; awaiting client approval
  'client_approved',  -- client approved change/quote; CiMA to lock in
  'confirmed',        -- event locked in
  'in_progress',      -- execution underway
  'completed',        -- done
  'cancelled',        -- either party, any point before confirmed
  'rejected'          -- CiMA cannot fulfill the request
);

-- Client's verdict on a CiMA-proposed change (Brief §9 solicitud_changes).
create type change_response as enum ('pending', 'approved', 'rejected');

-- Who performed a status transition (Brief §9 solicitud_status_log).
create type solicitud_actor as enum ('cima_staff', 'client');

-- Activaciones transactional emails — nudges only, never conversations
-- (Brief §11). Reuses the existing email_status enum for delivery state.
create type activaciones_email_type as enum (
  'solicitud_received',        -- to client: "we received your request"
  'change_proposed',           -- to client: "log in to review a proposed change"
  'quote_sent',                -- to client: "your quote is ready"
  'event_confirmed',           -- to client: "your activation is confirmed"
  'event_cancelled',           -- to client: "your request has been cancelled"
  'internal_new_solicitud',    -- to CiMA: "new request from [brand]"
  'internal_client_approved',  -- to CiMA: "client approved — confirm the event"
  'internal_change_rejected'   -- to CiMA: "client rejected the change"
);


-- ============================================================================
-- 2. RLS HELPER FUNCTIONS
-- SECURITY DEFINER (like current_user_role/is_admin in 0001) so policies can
-- consult membership tables without recursing into their own RLS.
-- ============================================================================

-- True when the caller is active CiMA staff (any internal role). The
-- distinction matters now that two user populations share Supabase Auth:
-- staff have a hiring_managers row, brand clients have a brand_clients row.
create or replace function public.is_cima_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hiring_managers
    where auth_user_id = auth.uid() and active
  );
$$;

-- ============================================================================
-- 3. BRAND CLIENTS
-- One row per brand client company. One shared portal login per client
-- (Brief §3B): credentials live in Supabase Auth — auth_user_id links the
-- shared account, mirroring hiring_managers.auth_user_id. (The brief's
-- portal_password_hash column is intentionally omitted: Supabase Auth owns
-- password hashes; storing our own copy would be wrong.)
-- ============================================================================

create table public.brand_clients (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  auth_user_id  uuid unique references auth.users (id) on delete set null,
  company_name  text not null,                    -- e.g. "Raptor Energy Drink"
  brands        text[] not null default '{}',     -- brand names they manage
  portal_email  text not null unique,             -- shared login email (reference copy)
  contact_name  text,
  contact_phone text,
  active        boolean not null default true,    -- portal access switch
  created_by    uuid references public.hiring_managers (id) on delete set null
);

create trigger brand_clients_set_updated_at
  before update on public.brand_clients
  for each row execute function public.set_updated_at();

-- The caller's brand_clients.id (null if not an active portal client).
-- Defined AFTER the table on purpose: sql-language function bodies are
-- validated at creation time, so the relation must already exist.
create or replace function public.current_brand_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.brand_clients
  where auth_user_id = auth.uid() and active
  limit 1;
$$;


-- ============================================================================
-- 4. SOLICITUDES
-- One row per activation request. Multi-location in-store batches create one
-- row per location, linked by a shared batch_id (Brief §5, §9). Client-facing
-- columns come from the two Solicitud forms (§6A/§6B); internal columns (§7)
-- are never exposed to clients — see the client_solicitudes view in §10.
-- ============================================================================

create table public.solicitudes (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_id         uuid not null references public.brand_clients (id) on delete restrict,
  batch_id          uuid,                          -- groups multi-location in-store submissions; null otherwise
  status            solicitud_status not null default 'submitted',
  activation_type   activation_type not null,

  -- ---- Shared client-facing fields (§6A/§6B) --------------------------------
  brand             text not null,
  brands_featured   integer not null default 1 check (brands_featured in (1, 2)),
  num_brand_ambassadors integer check (num_brand_ambassadors is null or num_brand_ambassadors > 0),

  -- ---- In-store client fields (§6A) -----------------------------------------
  special_promotions    text,
  comments              text,
  date                  date,                      -- single activation date
  time_start            time,
  time_end              time,
  store_name            text,
  store_address         text,                      -- full address incl. city/state/ZIP
  store_type            text,                      -- Independent Supermarket / Chain Grocery / ...
  store_contact_name    text,
  store_contact_phone   text,
  distributor_rep_name  text,
  product_quantity      text,                      -- e.g. "25+ Cases"

  -- ---- Field/event client fields (§6B) --------------------------------------
  event_name            text,
  event_venue           text,
  event_address         text,
  event_dates           daterange,                 -- multi-day events
  setup_time            time,
  activation_time_start time,
  activation_time_end   time,
  teardown_time         time,
  expected_attendance   text,
  activation_needs      text[] not null default '{}',  -- tent, sampling, fabricated element, ...
  activation_vision     text,                      -- blank ⇒ CiMA proposes a concept
  client_supplied_assets text,
  special_considerations text,
  -- Slugs for the §6B ranges: Under $5k / $5k–$10k / $10k–$20k / $20k+ / Not yet defined
  budget_range          text check (budget_range is null or budget_range in
                          ('under_5k', '5k_10k', '10k_20k', '20k_plus', 'not_defined')),

  -- ---- CiMA-internal fields, both types (§7) — never client-visible ---------
  internal_notes        text,
  verification_notes    text,
  quote_amount          numeric(10,2),
  quote_line_items      jsonb,                     -- itemized quote; batches nest per location
  quote_notes           text,
  reviewed_by           uuid references public.hiring_managers (id) on delete set null,

  -- ---- CiMA-internal, in-store only (§7) -------------------------------------
  store_condition           text,
  product_location_in_store text,

  -- ---- CiMA-internal, field/event only (§7) ----------------------------------
  coi_required              boolean,
  coi_named_insured         text,
  coi_status                text check (coi_status is null or coi_status in
                              ('pending', 'submitted', 'approved')),
  participation_agreement_required boolean,
  participation_agreement_payment  boolean,
  participation_agreement_amount   numeric(10,2),
  third_party_vendors       text,
  fabrication_notes         text,
  logistics_notes           text,
  asset_delivery_status     text,
  content_creation_brief    text,

  -- ---- Milestones ------------------------------------------------------------
  confirmed_at  timestamptz,
  completed_at  timestamptz,

  -- Each type must carry its core identifying fields (soft-validates the two
  -- forms at the DB layer; full validation happens in the portal).
  constraint solicitudes_in_store_core check (
    activation_type <> 'in_store'
    or (store_name is not null and store_address is not null and date is not null)
  ),
  constraint solicitudes_field_event_core check (
    activation_type <> 'field_event'
    or (event_name is not null and event_address is not null and event_dates is not null)
  )
);

-- Queue tabs filter by status; detail views by client; batches group; the
-- events tracker sorts by date (Brief §12).
create index solicitudes_client_idx      on public.solicitudes (client_id);
create index solicitudes_status_idx      on public.solicitudes (status);
create index solicitudes_batch_idx       on public.solicitudes (batch_id) where batch_id is not null;
create index solicitudes_date_idx        on public.solicitudes (date);
create index solicitudes_created_at_idx  on public.solicitudes (created_at desc);
create index solicitudes_reviewed_by_idx on public.solicitudes (reviewed_by);

create trigger solicitudes_set_updated_at
  before update on public.solicitudes
  for each row execute function public.set_updated_at();

-- The activation's calendar span regardless of type: in-store = its single
-- date; field/event = its date range. Used by the conflict guard (§6 below)
-- and available to app queries.
create or replace function public.solicitud_date_span(s public.solicitudes)
returns daterange
language sql
stable
as $$
  select case s.activation_type
    when 'in_store' then
      case when s.date is null then null else daterange(s.date, s.date, '[]') end
    else s.event_dates
  end;
$$;


-- ============================================================================
-- 5. SOLICITUD STATUS LOG
-- Append-only transition timeline (Brief §9). Auto-logged by trigger exactly
-- like candidate_status_history; the app stamps changed_by/actor_type right
-- after a transition (same pattern as Talento's transitions.ts).
-- ============================================================================

create table public.solicitud_status_log (
  id            uuid primary key default gen_random_uuid(),
  solicitud_id  uuid not null references public.solicitudes (id) on delete cascade,
  changed_at    timestamptz not null default now(),
  from_status   solicitud_status,                  -- null on creation
  to_status     solicitud_status not null,
  changed_by    uuid,                              -- hiring_managers.id OR brand_clients.id (no FK: two possible parents)
  actor_type    solicitud_actor,                   -- disambiguates changed_by
  note          text                               -- internal context; hidden from clients
);

create index solicitud_status_log_solicitud_idx
  on public.solicitud_status_log (solicitud_id, changed_at);

-- SECURITY DEFINER (unlike 0001's candidate logger) so the timeline write
-- succeeds no matter which role triggers the status change — the log table
-- itself stays read-only for staff and invisible to clients via RLS.
create or replace function public.log_solicitud_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.solicitud_status_log (solicitud_id, from_status, to_status)
    values (new.id, null, new.status);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.solicitud_status_log (solicitud_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

create trigger solicitudes_log_status_insert
  after insert on public.solicitudes
  for each row execute function public.log_solicitud_status_change();

create trigger solicitudes_log_status_update
  after update on public.solicitudes
  for each row execute function public.log_solicitud_status_change();


-- ============================================================================
-- 6. SOLICITUD ASSIGNMENTS
-- The bridge between Activaciones and Talento (Brief §16). Activaciones only
-- READS talent_pool; assignments are recorded here.
-- ============================================================================

create table public.solicitud_assignments (
  id              uuid primary key default gen_random_uuid(),
  solicitud_id    uuid not null references public.solicitudes (id) on delete cascade,
  -- RESTRICT: talent with worked events is deactivated (talent_pool.active),
  -- never deleted out from under the event history.
  talent_pool_id  uuid not null references public.talent_pool (id) on delete restrict,
  assigned_at     timestamptz not null default now(),
  assigned_by     uuid references public.hiring_managers (id) on delete set null,
  notes           text,

  -- Same person can't be assigned twice to the same Solicitud.
  constraint solicitud_assignments_unique unique (solicitud_id, talent_pool_id)
);

create index solicitud_assignments_solicitud_idx on public.solicitud_assignments (solicitud_id);
create index solicitud_assignments_talent_idx    on public.solicitud_assignments (talent_pool_id);

-- ---- Date-conflict guard (Brief §16 — critical rule) -------------------------
-- A talent pool member physically cannot work two activations on the same
-- date. Enforced at the DB so no code path can slip past it — especially
-- multi-location batches, where several stores share one date. Cancelled and
-- rejected Solicitudes don't block. The UI should pre-check and warn; this
-- trigger is the hard backstop.
--
-- Note: if a Solicitud's date is changed AFTER talent is assigned, the app
-- must re-validate its assignments (the trigger only fires on assignment
-- writes).
create or replace function public.check_assignment_date_conflict()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_span       daterange;
  conflicting_id uuid;
begin
  select public.solicitud_date_span(s) into new_span
  from public.solicitudes s
  where s.id = new.solicitud_id;

  if new_span is null then
    return new;  -- no date on record yet; nothing to check against
  end if;

  select a.solicitud_id into conflicting_id
  from public.solicitud_assignments a
  join public.solicitudes s on s.id = a.solicitud_id
  where a.talent_pool_id = new.talent_pool_id
    and a.id is distinct from new.id
    and s.status not in ('cancelled', 'rejected')
    and public.solicitud_date_span(s) && new_span
  limit 1;

  if conflicting_id is not null then
    raise exception
      'Talent member % is already assigned to solicitud % on an overlapping date',
      new.talent_pool_id, conflicting_id
      using errcode = '23P01',  -- exclusion_violation
            hint = 'A talent pool member cannot work two activations on the same date (Brief §16).';
  end if;

  return new;
end;
$$;

create trigger solicitud_assignments_conflict_check
  before insert or update on public.solicitud_assignments
  for each row execute function public.check_assignment_date_conflict();


-- ============================================================================
-- 7. SOLICITUD CHANGES
-- CiMA-proposed changes (date/location/time) the client approves or rejects
-- inside the portal — never over email (Brief §2, §9).
-- ============================================================================

create table public.solicitud_changes (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  solicitud_id        uuid not null references public.solicitudes (id) on delete cascade,
  proposed_by         uuid references public.hiring_managers (id) on delete set null,
  change_type         text not null,               -- date_change / location_change / time_change / ...
  original_value      text,                        -- what the client requested
  proposed_value      text,                        -- what CiMA proposes instead
  reason              text,                        -- why
  client_response     change_response not null default 'pending',
  client_responded_at timestamptz
);

create index solicitud_changes_solicitud_idx
  on public.solicitud_changes (solicitud_id, created_at);


-- ============================================================================
-- 8. ACTIVACIONES EMAIL LOG
-- Every Resend nudge, both directions (Brief §11). Mirrors Talento's
-- email_log; adds recipient_email since recipients vary (client vs internal).
-- ============================================================================

create table public.activaciones_email_log (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  solicitud_id    uuid not null references public.solicitudes (id) on delete cascade,
  email_type      activaciones_email_type not null,
  recipient_email text not null,
  sent_at         timestamptz not null default now(),
  resend_id       text,                            -- Resend message id
  status          email_status not null default 'sent',
  error_message   text
);

create index activaciones_email_log_solicitud_idx
  on public.activaciones_email_log (solicitud_id, sent_at);
create index activaciones_email_log_resend_idx
  on public.activaciones_email_log (resend_id);


-- ============================================================================
-- 9. ROW LEVEL SECURITY — NEW TABLES
--
-- Two user populations share Supabase Auth (Brief §10):
--   • CiMA staff (hiring_managers row)  → full workflow access via policies
--   • Brand clients (brand_clients row) → NO direct access to base tables.
--     Clients read through the column-safe views in §10; client writes
--     (submit / approve / reject / edit) go through portal server actions
--     using the service-role client after code-level ownership checks — the
--     same pattern Talento uses for webhooks and actions.
--
-- Because RLS is row-level, a client SELECT policy on solicitudes would
-- expose internal columns (internal_notes, quote_line_items, …) via the data
-- API. Denying clients the base table entirely and projecting a safe column
-- subset in a view is what actually satisfies §10.
-- ============================================================================

alter table public.brand_clients          enable row level security;
alter table public.solicitudes            enable row level security;
alter table public.solicitud_assignments  enable row level security;
alter table public.solicitud_changes      enable row level security;
alter table public.solicitud_status_log   enable row level security;
alter table public.activaciones_email_log enable row level security;

-- ---- brand_clients -----------------------------------------------------------
-- Staff read all; only admins provision/manage accounts (Brief §10, §14:
-- "Clientes" is admin-only). A client may read their own company row (drives
-- the brand dropdown and account display in the portal).
create policy brand_clients_staff_select on public.brand_clients
  for select to authenticated
  using (public.is_cima_staff());

create policy brand_clients_admin_write on public.brand_clients
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy brand_clients_select_self on public.brand_clients
  for select to authenticated
  using (auth_user_id = auth.uid());

-- ---- solicitudes -------------------------------------------------------------
-- All staff review/quote/manage (Brief §10 — only client provisioning is
-- admin-gated). Deletes are admin-only; the workflow uses cancelled/rejected.
create policy solicitudes_staff_select on public.solicitudes
  for select to authenticated
  using (public.is_cima_staff());

create policy solicitudes_staff_insert on public.solicitudes
  for insert to authenticated
  with check (public.is_cima_staff());

create policy solicitudes_staff_update on public.solicitudes
  for update to authenticated
  using (public.is_cima_staff())
  with check (public.is_cima_staff());

create policy solicitudes_admin_delete on public.solicitudes
  for delete to authenticated
  using (public.is_admin());

-- ---- solicitud_assignments ----------------------------------------------------
-- Staff only. Clients never see talent identities (Brief §10).
create policy solicitud_assignments_staff_all on public.solicitud_assignments
  for all to authenticated
  using (public.is_cima_staff())
  with check (public.is_cima_staff());

-- ---- solicitud_changes --------------------------------------------------------
-- Staff propose and read. Clients read via the view; their approve/reject is
-- written by portal server actions (service role).
create policy solicitud_changes_staff_all on public.solicitud_changes
  for all to authenticated
  using (public.is_cima_staff())
  with check (public.is_cima_staff());

-- ---- solicitud_status_log -----------------------------------------------------
-- Read-only for staff; rows are written by the trigger / service role.
create policy solicitud_status_log_staff_select on public.solicitud_status_log
  for select to authenticated
  using (public.is_cima_staff());

-- ---- activaciones_email_log ---------------------------------------------------
-- Read-only for staff; writes are service-role only.
create policy activaciones_email_log_staff_select on public.activaciones_email_log
  for select to authenticated
  using (public.is_cima_staff());


-- ============================================================================
-- 10. CLIENT PORTAL READ VIEWS
--
-- Column-safe, row-scoped windows for the portal. SECURITY DEFINER on purpose
-- (security_invoker = false): the view must bypass the deny-all base-table
-- policies, then scope rows itself via current_brand_client_id(). Supabase's
-- linter flags definer views — here it is the mechanism, not an accident.
-- security_barrier prevents predicate-pushdown leaks.
--
-- Quote fields are NULL until CiMA actually sends the quote: §7 marks quote
-- columns internal, but §13.4 requires the client to review the quote amount
-- and per-location line items to approve them — so visibility is gated on
-- status reaching quote_sent, not hidden forever.
-- ============================================================================

create view public.client_solicitudes
with (security_invoker = false, security_barrier = true)
as
select
  s.id,
  s.created_at,
  s.updated_at,
  s.client_id,
  s.batch_id,
  s.status,
  s.activation_type,
  s.brand,
  s.brands_featured,
  s.num_brand_ambassadors,
  s.special_promotions,
  s.comments,
  s.date,
  s.time_start,
  s.time_end,
  s.store_name,
  s.store_address,
  s.store_type,
  s.store_contact_name,
  s.store_contact_phone,
  s.distributor_rep_name,
  s.product_quantity,
  s.event_name,
  s.event_venue,
  s.event_address,
  s.event_dates,
  s.setup_time,
  s.activation_time_start,
  s.activation_time_end,
  s.teardown_time,
  s.expected_attendance,
  s.activation_needs,
  s.activation_vision,
  s.client_supplied_assets,
  s.special_considerations,
  s.budget_range,
  case when s.status in ('quote_sent', 'client_approved', 'confirmed', 'in_progress', 'completed')
       then s.quote_amount end     as quote_amount,
  case when s.status in ('quote_sent', 'client_approved', 'confirmed', 'in_progress', 'completed')
       then s.quote_line_items end as quote_line_items,
  case when s.status in ('quote_sent', 'client_approved', 'confirmed', 'in_progress', 'completed')
       then s.quote_notes end      as quote_notes,
  s.confirmed_at,
  s.completed_at
from public.solicitudes s
where s.client_id = public.current_brand_client_id();

-- Proposed changes for the client's own Solicitudes (proposed_by hidden —
-- clients never see staff identities).
create view public.client_solicitud_changes
with (security_invoker = false, security_barrier = true)
as
select
  c.id,
  c.solicitud_id,
  c.created_at,
  c.change_type,
  c.original_value,
  c.proposed_value,
  c.reason,
  c.client_response,
  c.client_responded_at
from public.solicitud_changes c
join public.solicitudes s on s.id = c.solicitud_id
where s.client_id = public.current_brand_client_id();

-- Status timeline for the client's own Solicitudes — transitions only, no
-- internal notes and no actor identities (Brief §13.4).
create view public.client_solicitud_status_log
with (security_invoker = false, security_barrier = true)
as
select
  l.id,
  l.solicitud_id,
  l.changed_at,
  l.from_status,
  l.to_status
from public.solicitud_status_log l
join public.solicitudes s on s.id = l.solicitud_id
where s.client_id = public.current_brand_client_id();

-- Views are only for signed-in users; anon gets nothing. (For authenticated
-- non-clients the WHERE clause yields zero rows.)
revoke all on public.client_solicitudes          from anon, public;
revoke all on public.client_solicitud_changes    from anon, public;
revoke all on public.client_solicitud_status_log from anon, public;
grant select on public.client_solicitudes          to authenticated;
grant select on public.client_solicitud_changes    to authenticated;
grant select on public.client_solicitud_status_log to authenticated;


-- ============================================================================
-- 11. TIGHTEN EXISTING TALENTO READ POLICIES  ⚠️ read carefully
--
-- 0001/0003 policies assumed every authenticated user is CiMA staff. Once the
-- first brand-client login exists, that assumption breaks Brief §10 ("clients
-- cannot read talent_pool, candidates, or hiring_managers at all"):
--
--   • candidates_select / candidates_update / talent_pool_select and the two
--     history/email policies all contain "or metro_area is null" — a client
--     (not admin, no metros) would pass that clause and could read, and in
--     candidates' case even UPDATE, any record without a metro assigned.
--   • metros_select was using (true) — readable by any authenticated user.
--
-- Fix: AND is_cima_staff() into each. For staff nothing changes (every staff
-- account has an active hiring_managers row — Talento's assertUser already
-- requires it). No table structures are touched.
-- ============================================================================

drop policy if exists candidates_select on public.candidates;
create policy candidates_select on public.candidates
  for select to authenticated
  using (
    public.is_cima_staff()
    and (
      public.is_admin()
      or metro_area = any (public.current_user_metros())
      or metro_area is null
    )
  );

drop policy if exists candidates_update on public.candidates;
create policy candidates_update on public.candidates
  for update to authenticated
  using (
    public.is_cima_staff()
    and (
      public.is_admin()
      or metro_area = any (public.current_user_metros())
      or metro_area is null
    )
  )
  with check (
    public.is_cima_staff()
    and (
      public.is_admin()
      or metro_area = any (public.current_user_metros())
      or metro_area is null
    )
  );

drop policy if exists status_history_select on public.candidate_status_history;
create policy status_history_select on public.candidate_status_history
  for select to authenticated
  using (
    public.is_cima_staff()
    and exists (
      select 1 from public.candidates c
      where c.id = candidate_status_history.candidate_id
        and (
          public.is_admin()
          or c.metro_area = any (public.current_user_metros())
          or c.metro_area is null
        )
    )
  );

drop policy if exists talent_pool_select on public.talent_pool;
create policy talent_pool_select on public.talent_pool
  for select to authenticated
  using (
    public.is_cima_staff()
    and (
      public.is_admin()
      or metro_area = any (public.current_user_metros())
      or metro_area is null
    )
  );

drop policy if exists email_log_select on public.email_log;
create policy email_log_select on public.email_log
  for select to authenticated
  using (
    public.is_cima_staff()
    and exists (
      select 1 from public.candidates c
      where c.id = email_log.candidate_id
        and (
          public.is_admin()
          or c.metro_area = any (public.current_user_metros())
          or c.metro_area is null
        )
    )
  );

drop policy if exists metros_select on public.metros;
create policy metros_select on public.metros
  for select to authenticated
  using (public.is_cima_staff());
