# CiMA Platform — UI Overhaul Design Spec (v1)

Status: **approved 2026-07-08** — governs all `design/*` branches
Scope: CiMA Hub (Talento + Activaciones) and CiMA Client Portal. Visual/layout only — no
business logic, no schema, no env changes anywhere in this overhaul.

---

## 1. Goals

- One coherent, professional design system across all three surfaces, replacing the
  current unstyled-template look (Arial body, bare `bg-gray-50` pages, three separate
  top-nav headers in the Hub).
- Dashboard-grade information layout: the most important numbers visible at a glance,
  no scrolling or hunting to find people/requests.
- Ship in small, safe, individually revertable phases with Vercel previews before merge.

**Non-goals (v1):** dark mode, charts/graphs beyond live counts, widget customization,
AI panels, marketing pages, offline/mobile-native patterns (responsive fallback only).

## 2. Design principles

1. **One clear main KPI per screen** — headline numbers first, visible without scrolling.
2. **Minimal clutter** — generous whitespace, soft canvas background, white cards; the
   data does the talking.
3. **Progressive disclosure** — stat cards → table rows → detail workspace. Summary up
   top, drill-down for the "why".
4. **Context-driven color** — neutral by default; color only carries meaning (status,
   risk, success, action needed) or brand identity. Never decorative.
5. **Consistency over novelty** — every surface built from the same `@cima/ui`
   primitives, tokens, and spacing rhythm.

## 3. Reference DNA (from approved screenshots)

| Reference | What we take |
|---|---|
| Vento | Soft warm-gray canvas + white sidebar; KPI cards with colored dot + big number + delta chip; subtle borders over shadows |
| Trackify | Grouped sidebar sections with small caps labels; table with search/sort/filter in its header row; page-on-tinted-canvas framing |
| Salezy | Welcome header + date; segmented pill control (Monthly/Yearly → our día/semana/mes); status chips in tables (Pending/Completed); ⌘K-style search field styling |
| Nexo Co | Section headers with one-line descriptions; near-black primary CTA; restrained single-accent color use |
| Noteflow | Status columns with count pills (→ our queue tabs); priority/status flag chips; progress + due-date metadata rows on cards |
| Sage inventory shot | Muted, warm, sophisticated tint palette; calm data-dense grids |
| Zazu / Assemble (websites) | Clear structure: headline, concise copy, expandable detail; design-system cohesion; "mental ease" as the bar |

Dribbble note: dribbble.com search/tag pages are JS-rendered (unscrapeable statically);
the screenshots above are representative of its top dashboard genre and serve as the
reference set.

## 4. Foundations (design tokens)

Tokens live in `packages/ui` as CSS variables + a Tailwind preset consumed by both apps.

### 4.1 Color

Brand sampled from the CiMA banner (`apps/hub/public/email-banner-v2.jpg`):
lime `#8fb72a`, warm charcoal `#282220`, warm grays.

- **Neutrals — Tailwind `stone`** (warm gray, matches brand): canvas
  **`#F0F2E7` soft sage paper** (palette v2, 2026-07-10 — the original
  `#F7F6F4` read as "too white"; the sage tint makes white cards pop),
  surface `#FFFFFF`, line `stone-200`, muted text `stone-500`, body text
  `stone-700`, headings/ink `stone-900`.
- **Brand (CiMA lime)** — custom scale around `#8fb72a`:
  - `brand-50 #f6f9ec` · `brand-100 #eaf2d3` · `brand-200 #d8e6ab` · `brand-500 #8fb72a`
    (base, decorative/accent only) · `brand-600 #7aa021` · `brand-700 #5c7d18`
    (readable text on tints) · `brand-800 #476113`
  - Usage: active nav fill (brand-50 bg + brand-700 text), focus rings, brand chip,
    selected states, positive accents. **Not** for solid buttons — white-on-lime fails
    contrast.
- **Primary actions — deep CiMA green** (`brand-700 #5D7D19`, hover `brand-800`;
  white text, AA-compliant). Palette v2: replaced the near-black ink CTAs after
  live review ("dark black boxes"); active pill tabs and today-markers follow.
  Ink (`stone-900`) remains for headings only.
- **Semantic/status** — keep the existing hue assignments in `SOLICITUD_STATUS_META` /
  `CLIENT_STATUS_META` (they already encode meaning); unify the rendering as one
  StatusPill style: tint bg `*-100` + text `*-800` + inset ring `*-600/20` +
  optional dot (palette v2 — the `*-50` tints washed out on white cards).
  Deltas/trends: green up, rose down. Danger: rose. Warning/waiting: amber.

### 4.2 Typography

- **Geist Sans** (already vendored in `apps/hub/app/fonts/`, variable weight) becomes
  the real UI font on both apps — today it's loaded but overridden by an Arial rule in
  `globals.css`. Copy the woffs to the portal; expose as `--font-sans` via
  `next/font/local`; preset maps `font-sans` to it.
- Scale: page title 24/semibold tracking-tight · section/card title 14/semibold ·
  body 14 · secondary 13 · labels 12/medium, muted (small-caps-style labels:
  11/medium uppercase tracking-wide) · **KPI numbers 30/semibold tabular-nums
  tracking-tight** · table numerics tabular-nums.

### 4.3 Shape, depth, spacing

- Radius: cards `rounded-2xl` (16px) · controls/inputs `rounded-xl` (12px) · pills full.
- Depth: 1px `stone-200/70` border + `shadow-[0_1px_2px_rgba(28,25,23,0.04)]`; hover on
  interactive cards raises to a soft md shadow. No heavy drop shadows.
- Spacing rhythm: page padding `px-6 py-6` · card padding `p-5` · grid gaps `gap-4`
  (KPI rows) / `gap-5` (content) · section stacking `space-y-5`.
- Focus: visible ring `ring-2 ring-brand-500/40` on all interactive elements.

### 4.4 Iconography

`lucide-react` (tree-shaken, the style used across all reference shots), 16–18px,
`stroke-width 1.75`, muted color inheriting text. **Only new dependency in the overhaul.**

## 5. App shell & navigation

### 5.1 Hub — left sidebar (replaces the three per-section headers)

- Fixed 256px, white, `border-r`, full height; content area on canvas with
  `max-w-[1280px]` inner width.
- Top: CiMA wordmark (logo asset if provided; otherwise text wordmark + lime dot).
- Groups (small-caps group labels):
  - **Activaciones** — Solicitudes (inbox icon; optional `nuevas` count badge),
    Eventos (calendar), Clientes (building)
  - **Talento** — Dashboard/Pipeline (users), Vista de Julia (star, **admin-only —
    preserve existing `isAdminRole` gating exactly**)
- Bottom: user card — initials avatar, name, email truncated, sign-out. (Replaces the
  name + SignOutButton in each old header.)
- Item states: default `stone-600` + icon `stone-400`; hover `bg-stone-50`; active
  `bg-brand-50 text-brand-800` rounded-lg fill + `stone-900`-strength icon.
- Responsive: below `lg` the sidebar hides; slim top bar with hamburger opens it as an
  overlay drawer. Internal tool = desktop-first, but nothing may break on mobile.
- Login / sin-acceso / privacy pages: centered card on canvas with wordmark (no sidebar).

### 5.2 Portal — polished top bar (kept, not a sidebar)

Clients touch 3 destinations; a sidebar is overhead. Restyle instead:
- White top bar: CiMA wordmark + "Client Portal" chip (brand-50/brand-700) · nav
  (Dashboard, My Requests) · right: New Request (ink button), company name, avatar
  menu w/ sign out.
- Content width `max-w-5xl` on the same canvas tokens. Login: centered card.

## 6. Core patterns (the `@cima/ui` vocabulary)

- **PageHeader** — title + one-line muted description (Nexo pattern); right slot for
  actions (search, filters, CTA).
- **StatCard** — label w/ colored dot or icon · big tabular number · optional sub-line
  (delta chip or "needs action" hint). Clickable variant with active ring for
  filter-by-stat.
- **Card / CardHeader** — white, rounded-2xl, border, p-5; header row = small semibold
  title + right action slot.
- **Table** — small-caps muted column headers, `divide-y stone-100` rows, row hover
  `bg-stone-50/60`, full-row click targets to detail pages, numerics right-aligned
  tabular; header row can host search/filter controls (Trackify).
- **StatusPill** — unified chip for every status enum on all three surfaces.
- **Tabs** (link/GET-based, preserving current URL-param behavior) — pill style with
  count chips; **SegmentedControl** for view switching (calendar día/semana/mes).
- **Buttons** — primary (ink solid) · secondary (white, border) · ghost · destructive
  (rose solid) · sizes sm/md. Loading state built in.
- **Form controls** — Input/Select/Textarea rounded-xl, stone borders, brand focus
  ring; Field wrapper = label + control + error line.
- **EmptyState** — icon, one-line explanation, optional action (every list gets one).
- **Avatar** (initials), **Badge**, **Skeleton** (loading), **Toolbar/FilterBar**.

All primitives presentational/server-component-safe; client interactivity stays in the
apps where it already lives.

## 7. Surface-by-surface application

### 7.1 Hub — Activaciones
- **Queue (`/activaciones`)**: PageHeader ("Solicitudes") with search + client filter
  restyled into it (same GET form semantics). KPI row = clickable StatCards from the
  existing `queueCounts` (Nuevas · En revisión · Con el cliente · Confirmadas) acting
  as the tab controls, + quiet "Historial" tab. List becomes a Table (Marca/Cliente,
  Tipo, Lugar, Fechas, Estado, Revisor, Días); StatusPill everywhere.
- **Detail workspace**: sticky summary header card (brand + client + StatusPill + dates
  + reviewer + manual status actions); below, the existing two-column card layout
  restyled — left: submission, changes, timeline; right: internal fields, quote
  builder, propose change, talent panel. The `in_review` hint banner stays.
- **Eventos**: keep the Google-style calendar; swap chrome to tokens (SegmentedControl,
  ink "Hoy" button, tinted event chips by status), consistent card frame.
- **Clientes**: table + per-row kebab actions; create/edit forms in Cards with Field
  primitives.

### 7.2 Hub — Talento
- Dashboard (decisions 2026-07-10): tabs are clickable StatCards (Activaciones
  pattern); candidate tabs get a **Lista/Tarjetas** segmented toggle, URL-driven
  (`vista=`), defaulting to **Lista** — one flat lean table (metro as a column,
  no inline actions; the row opens the profile). Tarjetas keeps the metro-grouped
  card grid. Toolbar adds view-layer **search** (name/email/phone/metro) over the
  fetched list; Nuevos filters ride along. Scorecard/metro controls on form
  primitives.
- Vista de Julia: same treatment; JuliaCandidateCard on Card primitives.
- CV pages: typography + Card polish only.

### 7.3 Portal (client-facing, EN)
- Dashboard: greeting header ("Welcome back, {name}") + 3 StatCards computed from the
  already-fetched requests (Active requests · Needs your action · Upcoming activation)
  + request Table/cards with StatusPills.
- Request detail: current section stack onto Card primitives; quote card emphasized
  (ink total, clean line items); Approve = primary ink button, question form styled in.
- New/Edit request forms: two-step flow onto Field primitives with clear step header.
- Login / no-access: centered card treatment.

## 8. `@cima/ui` package

```
packages/ui/
  package.json          # @cima/ui — dependency-free (react/tailwind dev-only)
  tailwind-preset.ts    # colors (brand/canvas/ink...), fonts, radii, shadows
  src/styles/tokens.css # CSS variables (+ base resets both apps import)
  src/components/*.tsx  # primitives from §6, exported individually
```

Both apps: `presets: [cimaPreset]` (relative import of the preset), add
`../../packages/ui/src` to Tailwind `content`, import tokens.css in `globals.css`.
Geist woffs are duplicated per-app in `app/fonts/` (`next/font/local` wants in-app
paths); icons (`lucide-react`) are added per-app when a phase first uses them.
Also in Phase 1: delete the template Arial
override and the `prefers-color-scheme: dark` variable flip in both `globals.css`
(currently inverts the background for dark-mode users).

## 9. Rollout plan (safety first)

| Phase | Branch | Contents | Merge gate |
|---|---|---|---|
| 1 | `design/foundations` | `@cima/ui` pkg, preset, tokens, fonts wired into both apps (visible: font + canvas only) | builds + previews on both apps |
| 2 | `design/hub-shell` | Sidebar replacing 3 headers; hub login/sin-acceso | preview + role-gating check (admin vs hm vs client→sin-acceso) |
| 3 | `design/hub-activaciones` | Queue, detail workspace, eventos, clientes | preview + e2e sweep + visual checklist |
| 4 | `design/hub-talento` | Dashboard, Julia, CV | preview + Paula/Julia role views |
| 5 | `design/portal` | Portal shell, dashboard KPIs, detail, forms, login | preview + client flow (submit→quote→approve on demo client) |
| 6 | `design/polish` | Empty states, skeletons, favicons/titles, stragglers | final visual sweep |

**Hard rules for every design branch:**
1. Files touched: layouts, page/component markup, `@cima/ui`, Tailwind/global CSS,
   font/static assets. **Never**: `lib/`, `modules/**/actions|queries|*.ts` logic,
   middleware, auth/session, migrations, `.env*`. (Exception: consuming data a page
   already fetches. Any new query — e.g. optional sidebar count badge — is called out
   explicitly in the PR description.)
2. One PR per phase, Vercel previews on affected apps, user visual pass on preview
   before merge; builds + e2e sweep (30/30) re-run per phase.
3. Previews point at the production Supabase: visual checks are read-only, or use the
   demo client (`+raptor`) only. No destructive actions from previews.
4. Rollback = revert the phase PR. No env or schema coupling anywhere.
5. Pre-commit diff check: confirm no action/query/middleware files in the diff.

## 10. Decisions (resolved 2026-07-08)

1. **Primary button color**: ink/near-black; lime reserved for accents. ✔
2. **Portal nav**: restyled top bar. ✔
3. **Font**: Geist Sans. ✔
4. **Logo asset**: provided — `docs/cima-logo.png` (RGBA, 640×207), copied to both
   apps as `public/cima-logo.png` for the Phase 2/5 shells. ✔
