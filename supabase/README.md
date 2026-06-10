# Supabase — CiMA Talento

## Apply the schema

The migration uses DDL (creating types/tables/policies), which the service-role
key can't run over the data API. Apply it one of two ways:

### Option A — SQL editor (quickest)

1. Open the project's [SQL editor](https://supabase.com/dashboard/project/ycvxxtiaajwubocqllpr/sql/new).
2. Paste the full contents of [`migrations/0001_initial_schema.sql`](migrations/0001_initial_schema.sql), run it.
3. Paste the contents of [`seed.sql`](seed.sql), run it.

### Option B — Supabase CLI

```bash
brew install supabase/tap/supabase   # if not installed
supabase link --project-ref ycvxxtiaajwubocqllpr
supabase db push                     # applies migrations/
psql "$DATABASE_URL" -f supabase/seed.sql   # or paste seed.sql in the editor
```

## What the schema includes

- **Enums** — `candidate_status` (all 9 pipeline statuses), `user_role`,
  `hm_decision`, `julia_decision`, `email_type`, `email_status`.
- **Tables** — `hiring_managers`, `candidates`, `candidate_status_history`
  (auto-logged timeline), `talent_pool` (dispatch-ready: structured
  `availability` jsonb + `active` flag), `email_log`.
- **Triggers** — `updated_at` maintenance + automatic status-history logging.
- **RLS** — enabled on every table. The service-role key (webhook, automated
  emails, status transitions) bypasses RLS. Authenticated staff policies:
  admin/Julia see everything; hiring managers see candidates in their
  `assigned_metros`. Full auth wiring lands in Step 9.

## After applying

Regenerate the TypeScript types so `lib/database.types.ts` stays authoritative:

```bash
supabase gen types typescript --project-id ycvxxtiaajwubocqllpr > lib/database.types.ts
```

(The current `lib/database.types.ts` is hand-written to match this migration.)
