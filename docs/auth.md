# Auth & roles

Supabase Auth (email/password) + Postgres RLS (Brief §10).

## Roles

| Role | Access |
|---|---|
| `admin` / `julia` | All candidates, all metros; approve/reject to talent pool; Julia's view |
| `hiring_manager` | Candidates in their `assigned_metros` (+ unmapped); mark fit/not-fit; **cannot** approve to talent pool |
| `regional_manager` | Reserved for the marketplace phase |

A user's role + metros live on their `hiring_managers` row, linked to their auth
account via `auth_user_id`.

## How access is enforced (defense in depth)

1. **Middleware** ([middleware.ts](../middleware.ts)) redirects unauthenticated
   requests for `/dashboard` and `/julia` to `/login`. Webhooks (`/api/*`) are
   exempt — they authenticate themselves.
2. **RLS** scopes every read. Dashboard/profile/talent queries use the
   session-scoped client, so Postgres returns only rows the user may see.
3. **Action guards** ([lib/auth/session.ts](../lib/auth/session.ts)) authorize
   every write: `assertCandidateAccess` (HM-in-metro or admin) for fit/not-fit,
   notes, and scorecard; `assertAdmin` for approve/reject and talent-pool toggles.

## Provisioning logins

```bash
node scripts/setup-auth.mjs
```

Creates an email/password login for every `hiring_managers` row that isn't yet
linked, prints the generated password once, and links it. Idempotent — re-run
after adding team members (insert the `hiring_managers` row first, with their
`email`, `role`, and `assigned_metros`).

## Verified behavior

login OK · admin sees all metros · metro-scoped HM sees only their metro
(candidates + talent_pool) · HM cannot read or update an out-of-metro candidate
(RLS backstop) · unauthenticated app routes → /login · webhooks not redirected.
