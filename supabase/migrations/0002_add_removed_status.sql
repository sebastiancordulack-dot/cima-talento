-- ============================================================================
-- Migration 0002: add a `removed` candidate status
--
-- Supports manual removal from the talent pool: the pool record is deleted but
-- the candidate is kept and moved to Archivo with this status (distinct from
-- the rejection statuses, so reporting stays clean). Additive and backward
-- compatible — existing code simply never sets it. Apply this BEFORE deploying
-- the code that uses it.
-- ============================================================================

alter type candidate_status add value if not exists 'removed';
