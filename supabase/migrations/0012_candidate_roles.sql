-- ============================================================================
-- 0012 — Candidate roles: mercaderista vs promotor/a.
--
-- CiMA runs two kinds of Meta lead ads (merchandisers and promotional staff)
-- that land in the same pipeline; until now nothing distinguished them. Each
-- lead now carries a `role`, classified at ingestion from the Meta form's name
-- (forms are duplicated per campaign, so we match on the name, not the id).
-- NULL means "sin clasificar" — staff assign it manually from the hub.
--
-- A text column with a CHECK (not an enum type) so future labels are a
-- one-line constraint change. The Meta form id/name are stored per candidate
-- so any misclassification is diagnosable after the fact.
-- ============================================================================

alter table public.candidates
  add column role text check (role in ('mercaderista', 'promotor')),
  add column meta_form_id text,
  add column meta_form_name text;
