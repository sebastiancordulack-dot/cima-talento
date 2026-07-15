-- ============================================================================
-- 0011 — Rejection now permanently deletes the candidate.
--
-- "No es un fit" / "No avanzar" stop parking candidates in rejected_* statuses
-- and instead hard-delete the row (plus resume file, history, email log via
-- the existing ON DELETE CASCADE FKs). The Archivo becomes exclusively the
-- "promise for the future" pool. Two things survive a deletion:
--
--   1. candidate_outcomes  — one anonymous row per decision (no PII), so the
--      hiring funnel (applied → stage reached → outcome, per metro/month)
--      stays measurable after the person is gone.
--   2. rejected_applicants — a SHA-256 hash of the email + when they were
--      rejected, so a re-application can be flagged "rechazado anteriormente"
--      without storing who they were.
--
-- The rejected_* status enum values stay: rows rejected before this change
-- remain in the Archivo tab until manually deleted.
-- ============================================================================

-- ---- 1. Anonymous funnel outcomes -------------------------------------------

create table public.candidate_outcomes (
  id            uuid primary key default gen_random_uuid(),
  decided_at    timestamptz not null default now(),
  applied_at    date,               -- candidates.created_at, day precision only
  metro_area    text,
  state         text,
  source        text,               -- candidates.source_ad_location
  stage_reached text not null,      -- candidate status at the moment of deletion
  outcome       text not null check (outcome in (
    'rejected_hm',        -- staff decision during the vetting phase
    'rejected_julia',     -- Julia's "No avanzar"
    'deleted_from_archive' -- manual purge from the Archivo tab
  ))
);

create index candidate_outcomes_decided_idx on public.candidate_outcomes (decided_at);
create index candidate_outcomes_metro_idx   on public.candidate_outcomes (metro_area);

alter table public.candidate_outcomes enable row level security;

-- Staff can read the stats; writes happen through the service role only.
create policy candidate_outcomes_staff_select on public.candidate_outcomes
  for select to authenticated
  using (public.is_cima_staff());

-- ---- 2. Re-applicant suppression list ----------------------------------------

create table public.rejected_applicants (
  email_hash  text primary key,     -- sha256 of lowercased/trimmed email
  rejected_at timestamptz not null default now(),
  stage       text not null         -- status they held when rejected
);

alter table public.rejected_applicants enable row level security;

create policy rejected_applicants_staff_select on public.rejected_applicants
  for select to authenticated
  using (public.is_cima_staff());

-- ---- 3. Re-applicant flag on candidates ---------------------------------------

-- Stamped by ingest when a new submission's email hash matches
-- rejected_applicants; shown as a "Rechazado anteriormente" badge.
alter table public.candidates
  add column previously_rejected_at timestamptz;
