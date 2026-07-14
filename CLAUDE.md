# CiMA Talento

pnpm/Turborepo monorepo. Two Next.js apps (`apps/hub` = internal staff, `apps/portal` = external brand clients) sharing packages in `packages/*` (`@cima/db`, `@cima/email`, `@cima/ui`, `@cima/activaciones`). One Supabase project; the service-role admin client lives in `packages/db/src/admin.ts` and bypasses RLS, so every admin call site must be behind an auth guard.

## Use the graphify knowledge graph for codebase questions

A prebuilt graph of this repo lives in `graphify-out/graph.json` (function/type/concept nodes; call/implements/reference edges; community + god-node analysis).

**Before grepping or reading many files to answer a structural question** — "how does X flow work", "what calls Y", "what's the blast radius of changing Z", "which files touch the solicitud status transitions" — query the graph first:

```
graphify query "<question>"
```

Use the graph to *localize* — find the right files and understand what connects to what — then open only those files. This is the token-saving step: it makes the expensive read/edit phase surgical instead of exploratory.

### Scope — what the graph is and isn't for

- **Good for:** locating code, tracing call paths, impact/blast-radius analysis, understanding architecture. It is a static structural + semantic map.
- **Not for:** finding bugs (no runtime info — no execution, tests, or data values), and it is never a substitute for reading the actual file before editing or for running tests to verify a fix.
- Treat recalled edges as a map, not ground truth: confirm a node/function still exists in the source before relying on it.

### Keep it fresh

The graph is a snapshot. After any significant code change, refresh it so the map doesn't go stale:

```
/graphify . --update
```

This re-extracts only changed files (cheap). `graphify-out/` is gitignored and local-only.
