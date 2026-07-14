-- ============================================================================
-- 0010 — Open metro visibility: all staff see all candidates.
--
-- assigned_metros stops being an access wall. Every active staff member
-- (any hiring_managers role) can now read and update candidates in every
-- metro; the column stays on hiring_managers as informational data only.
-- Brand clients remain excluded via is_cima_staff() (0007). Admin-only
-- surfaces (approve to talent pool, Julia decisions) are still enforced by
-- the app-layer guards and the unchanged insert/delete/talent-pool-write
-- policies.
--
-- These policies were last (re)created in 0007 §"Fix"; this rewrites them
-- without the current_user_metros() condition.
-- ============================================================================

drop policy if exists candidates_select on public.candidates;
create policy candidates_select on public.candidates
  for select to authenticated
  using (public.is_cima_staff());

drop policy if exists candidates_update on public.candidates;
create policy candidates_update on public.candidates
  for update to authenticated
  using (public.is_cima_staff())
  with check (public.is_cima_staff());

drop policy if exists status_history_select on public.candidate_status_history;
create policy status_history_select on public.candidate_status_history
  for select to authenticated
  using (public.is_cima_staff());

drop policy if exists talent_pool_select on public.talent_pool;
create policy talent_pool_select on public.talent_pool
  for select to authenticated
  using (public.is_cima_staff());

drop policy if exists email_log_select on public.email_log;
create policy email_log_select on public.email_log
  for select to authenticated
  using (public.is_cima_staff());
