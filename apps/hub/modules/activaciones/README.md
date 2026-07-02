# CiMA Activaciones (module)

Domain logic for the Activaciones module lives here (queries, server actions,
types), colocated the same way Talento's logic currently lives under
`apps/hub/lib/`. Import it from routes under `app/(activaciones)/`.

Convention going forward: new Hub modules own a folder here
(`modules/<name>/`) and a route group `app/(<name>)/`. Talento predates this
convention and still lives in `apps/hub/lib/`; it can be migrated into
`modules/talento/` incrementally without changing behavior.

Shared, cross-module plumbing (Supabase clients, DB types) comes from
`@cima/db`, never from a module.
