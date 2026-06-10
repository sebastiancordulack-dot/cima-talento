-- ============================================================================
-- CiMA Talento — Seed data
-- Safe to run multiple times (idempotent upserts on email).
--
-- Seeds the internal staff roster. `auth_user_id` is left null here; link each
-- row to a real Supabase Auth user during Step 9 (Auth + roles), e.g.:
--   update public.hiring_managers set auth_user_id = '<uuid>' where email = '...';
-- ============================================================================

-- Julia Magallanes — Founder & CEO. Admin with the `julia` role so her
-- approval view (status advanced/julia_scheduled) can be scoped distinctly.
insert into public.hiring_managers (name, email, calendly_link, assigned_metros, role)
values (
  'Julia Magallanes',
  'julia@cimasales.com',
  'https://calendly.com/talento-cimasales/cima-talento-llamada-con-julia',
  '{}',                 -- admin: sees all metros regardless
  'julia'
)
on conflict (email) do update set
  calendly_link = excluded.calendly_link,
  role          = excluded.role;

-- Default hiring-manager / scheduling identity used for the candidate-facing
-- vetting call (Email 1 Calendly link). Update assigned_metros as the team grows.
insert into public.hiring_managers (name, email, calendly_link, assigned_metros, role)
values (
  'CiMA Talento — Hiring Manager',
  'talento@cimasales.com',
  'https://calendly.com/talento-cimasales/30min',
  '{}',
  'hiring_manager'
)
on conflict (email) do update set
  calendly_link = excluded.calendly_link,
  role          = excluded.role;
