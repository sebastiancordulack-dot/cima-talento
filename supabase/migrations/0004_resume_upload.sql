-- ============================================================================
-- Migration 0004: Candidate resume upload
--
-- Candidates upload their resume before the first HM call, via a tokenized
-- public page (/cv/<upload_token>). The file lives in a private Storage bucket
-- and is linked to the candidate row. Scheduling is gated behind the upload,
-- so the page reveals the Calendly link only after a resume is received.
-- Run this in the Supabase SQL editor.
-- ============================================================================

alter table public.candidates
  add column if not exists resume_path        text,        -- storage object path
  add column if not exists resume_filename    text,        -- original filename (display)
  add column if not exists resume_uploaded_at timestamptz,
  add column if not exists upload_token        uuid not null default gen_random_uuid();

-- Unguessable token used as the candidate's auth on the public upload page.
create unique index if not exists candidates_upload_token_idx
  on public.candidates (upload_token);

-- Private bucket for resumes. All access is through the service-role client
-- (server actions + signed URLs), so no public/anon storage policies are needed.
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;
