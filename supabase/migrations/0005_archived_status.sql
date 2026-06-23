-- ============================================================================
-- Migration 0005: "Archive for later" outcome
--
-- A softer alternative to a hard rejection at Julia's decision step: the
-- candidate is kept on file (status `archived`) and sent a warm "we'll reach
-- out if a need arises" email (email_type `archived`). Archived candidates show
-- in the Archivo tab and can be reactivated back into the pipeline later.
-- Run this in the Supabase SQL editor.
-- ============================================================================

alter type candidate_status add value if not exists 'archived';
alter type email_type       add value if not exists 'archived';
