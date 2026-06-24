-- ============================================================================
-- Migration 0006: WhatsApp bump tracking
--
-- Tier-1 "click-to-WhatsApp" reminders: staff open WhatsApp with a pre-filled
-- bump message (CV upload + scheduling link) from the candidate card. We stamp
-- last_bumped_at on each click so the dashboard shows who has already been
-- nudged and staff can avoid double-texting. No message is sent server-side —
-- the actual send happens from the user's own WhatsApp.
-- Run this in the Supabase SQL editor.
-- ============================================================================

alter table public.candidates
  add column if not exists last_bumped_at timestamptz;
