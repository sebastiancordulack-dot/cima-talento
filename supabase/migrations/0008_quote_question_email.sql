-- ============================================================================
-- Migration 0008: quote-question internal email type
--
-- Clients can now push back on a quote from the portal ("ask a question /
-- request changes") instead of falling back to email threads: the Solicitud
-- returns to in_review (a legal §8 transition), the question is recorded on
-- the status log, and the team gets this nudge.
-- Run this in the Supabase SQL editor.
-- ============================================================================

alter type activaciones_email_type add value if not exists 'internal_quote_question';
