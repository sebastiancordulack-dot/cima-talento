-- ============================================================================
-- Migration 0009: Client file attachments on Solicitudes
--
-- Clients attach files (brand assets, product sheets, planograms) to their
-- requests from the portal detail page; staff download them in the Hub
-- workspace. Follows the platform's storage pattern (migration 0004): a
-- private bucket, all access through the service-role client — uploads via
-- portal server actions after code-level ownership checks, downloads via
-- short-lived signed URLs minted server-side.
-- Run this in the Supabase SQL editor (additive; safe on production).
-- ============================================================================

create table public.solicitud_attachments (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  solicitud_id  uuid not null references public.solicitudes (id) on delete cascade,
  uploaded_by   solicitud_actor not null default 'client',
  storage_path  text not null,               -- object path in the private bucket
  file_name     text not null,               -- sanitized original filename (display)
  content_type  text,
  size_bytes    bigint not null
);

create index solicitud_attachments_solicitud_idx
  on public.solicitud_attachments (solicitud_id, created_at);

-- Same posture as the other activaciones tables (0007 §9): staff read via
-- RLS; clients have no base-table access — their reads go through the view
-- below and their writes/deletes through portal server actions (service role)
-- gated by ownership + status checks in code.
alter table public.solicitud_attachments enable row level security;

create policy solicitud_attachments_staff_select on public.solicitud_attachments
  for select to authenticated
  using (public.is_cima_staff());

-- Client read view (mirrors 0007 §10: SECURITY DEFINER on purpose, scoped by
-- current_brand_client_id, security_barrier against predicate pushdown).
-- storage_path is exposed deliberately: the bucket is private with no anon or
-- authenticated storage policies, so a raw path is unusable by itself — the
-- portal needs it server-side to mint signed download URLs in one read.
create view public.client_solicitud_attachments
with (security_invoker = false, security_barrier = true)
as
select
  a.id,
  a.created_at,
  a.solicitud_id,
  a.uploaded_by,
  a.storage_path,
  a.file_name,
  a.content_type,
  a.size_bytes
from public.solicitud_attachments a
join public.solicitudes s on s.id = a.solicitud_id
where s.client_id = public.current_brand_client_id();

revoke all on public.client_solicitud_attachments from anon, public;
grant select on public.client_solicitud_attachments to authenticated;

-- Private bucket. All access is through the service-role client (server
-- actions + signed URLs), so no public/anon storage policies are needed.
insert into storage.buckets (id, name, public)
values ('solicitud-attachments', 'solicitud-attachments', false)
on conflict (id) do nothing;
