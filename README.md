# CiMA Platform

Monorepo for CiMA Sales Strategies. Managed with **pnpm workspaces** + **Turborepo**.
Both apps deploy independently on Vercel and share **one** Supabase instance.

## Layout

```
apps/
  hub/        @cima/hub    — internal app "CiMA Hub" (Talento + Activaciones + future modules)
  portal/     @cima/portal — client-facing "CiMA Client Portal" (separate Vercel deploy)
packages/
  db/         @cima/db     — Supabase clients (server/client/admin) + Database types (single source)
  config/     @cima/config — shared tsconfig base
supabase/     migrations + seed for the shared instance (single-sourced here)
```

### Hub modules
Each Hub module owns a route group `apps/hub/app/(<name>)/` and a logic folder
`apps/hub/modules/<name>/`. Talento predates this convention and its logic still
lives in `apps/hub/lib/`; it can migrate into `modules/talento/` incrementally.
Cross-cutting DB access always comes from `@cima/db`, never from a module.

## Develop

```bash
corepack enable                # first time: makes `pnpm` available
pnpm install
pnpm dev:hub                   # Hub on :3000
pnpm dev:portal                # Portal on :3001
pnpm build                     # build everything via Turborepo
```

Copy each app's `.env.example` to `.env.local`. Both apps point at the same
Supabase project (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## Deploy (Vercel)

Create **two** Vercel projects from this repo:

| Project | Root Directory | Notes |
|---|---|---|
| CiMA Hub    | `apps/hub`    | existing project — change its Root Directory to this |
| CiMA Portal | `apps/portal` | new project |

Both use `pnpm` (auto-detected) and share the same Supabase env vars.
