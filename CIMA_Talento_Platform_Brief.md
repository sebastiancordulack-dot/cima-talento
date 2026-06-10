# CiMA Talento — Talent Pipeline Platform
## Claude Code Project Brief

---

## 1. Project Overview

CiMA Sales Strategies is a Hispanic channel marketing agency operating across 14+ states with ~22 full-time merchandisers and 6–15 active brand clients. The agency is building a **talent pipeline platform** to replace a fragmented, multi-spreadsheet hiring process with a single, organized, automated system for recruiting in-store merchandisers.

This platform is the **foundation for a future staffing marketplace** — an Uber-like dispatch system where client companies can request merchandisers from a national talent pool. Every architectural decision must account for this future state.

**Company:** CiMA Sales Strategies  
**Founder & CEO:** Julia Magallanes  
**Sender identity for all automated emails:** Cima Talento `<talento@cimasales.com>`  
**Website:** cimasales.com  
**Target candidate profile:** Spanish-first speakers, predominantly Hispanic, located across metro areas in 14+ US states

---

## 2. Tech Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Database + Auth | Supabase |
| Email automation | Resend (CIMA domain) |
| Scheduling | Calendly (to be integrated) |
| Hosting | Vercel |
| Form intake | Fillout (existing, via webhook) |
| Styling | Tailwind CSS |

> **Note:** The stack mirrors the Coal House Pizza project (Next.js 14 + Supabase + Resend + Vercel). Reuse patterns where applicable.

---

## 3. Candidate Pipeline Flow

The full hiring funnel has the following stages. Every candidate must have a visible status at all times — nothing should sit in limbo.

```
[Fillout form submitted]
        ↓ webhook
[Platform ingests candidate + assigns metro area from ZIP]
        ↓ auto
[Email 1 sent — availability / Calendly link] ← Spanish
        ↓ candidate schedules
[Hiring manager queue — call scheduled]
        ↓ HM conducts vetting call + fills scorecard
    ┌───┴───┐
  [No fit] [Fit]
    ↓         ↓
[Email 2]  [Email 3 — schedule call with Julia] ← Spanish
           ↓ Julia conducts approval call
       ┌───┴───┐
     [No]    [Yes]
      ↓         ↓
  [Email 5]  [Email 4 — welcome to talent pool] ← Spanish
             ↓
         [Added to talent pool with full profile]
```

### Candidate statuses (exhaustive)
- `new` — form submitted, Email 1 sent, awaiting scheduling
- `scheduled` — call booked with hiring manager
- `in_review` — call completed, awaiting HM decision
- `advanced` — HM approved, Email 3 sent, awaiting Julia call
- `julia_scheduled` — Julia call booked
- `approved` — Julia approved, Email 4 sent, added to talent pool
- `rejected_hm` — HM marked not a fit, Email 2 sent
- `rejected_julia` — Julia did not approve, Email 5 sent
- `no_show` — candidate did not show for scheduled call (handle with follow-up logic)

---

## 4. Database Schema

Design the Supabase schema to support both the current pipeline and the future dispatch marketplace. Every table should be built with extensibility in mind.

### `candidates`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `created_at` | timestamp | |
| `first_name` | text | |
| `last_name` | text | |
| `email` | text | unique |
| `phone` | text | |
| `city` | text | From form |
| `zip_code` | text | From form |
| `metro_area` | text | Derived from ZIP on ingestion |
| `state` | text | Derived from ZIP |
| `status` | enum | See candidate statuses above |
| `source_ad_location` | text | Which Meta ad/location brought them in |
| `fillout_submission_id` | text | For deduplication |
| `notes` | text | HM or Julia call notes |
| `bilingual` | boolean | Captured on scorecard |
| `prior_experience` | boolean | Captured on scorecard |
| `app_comfortable` | boolean | Captured on scorecard |
| `has_vehicle` | boolean | Hard filter |
| `work_authorized` | boolean | Hard filter — verbal confirmation only |
| `available_mf` | boolean | Hard filter |
| `works_independently` | boolean | Hard filter |
| `score_total` | integer | Out of 21 — from vetting scorecard |
| `scorecard_data` | jsonb | Full per-question scores |
| `hm_decision` | text | `fit` / `not_fit` |
| `julia_decision` | text | `approved` / `not_approved` |
| `hm_call_at` | timestamp | |
| `julia_call_at` | timestamp | |
| `talent_pool_added_at` | timestamp | |

### `talent_pool`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `candidate_id` | uuid FK → candidates | |
| `created_at` | timestamp | |
| `metro_area` | text | |
| `state` | text | |
| `availability` | jsonb | Days/hours available — for future dispatch |
| `active` | boolean | Whether currently available for assignments |
| `onboarding_complete` | boolean | |

### `hiring_managers`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `email` | text | |
| `calendly_link` | text | Their personal scheduling URL |
| `assigned_metros` | text[] | Which metro areas they manage |
| `role` | text | `hiring_manager` / `admin` / `julia` |

### `email_log`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `candidate_id` | uuid FK | |
| `email_type` | text | `availability` / `rejection_hm` / `schedule_julia` / `welcome` / `rejection_julia` |
| `sent_at` | timestamp | |
| `resend_id` | text | For delivery tracking |
| `status` | text | `sent` / `delivered` / `failed` |

---

## 5. Platform Views & UI

### 5.1 Hiring Manager Dashboard

The primary day-to-day view. Should feel like a clean CRM queue, not a spreadsheet.

**Tabs:**
1. **Nuevos interesados** — All candidates with status `new` or `scheduled`. Sorted by metro area, then by submission date. Hiring manager's action queue.
2. **En proceso** — Candidates with status `in_review`, `advanced`, `julia_scheduled`.
3. **Red de talento** — All approved candidates in the talent pool. Full profiles accessible.
4. **Archivo** — Rejected candidates. Searchable but out of the main flow.

**Candidate card (in queue view) should show:**
- Name, city/metro, phone, email
- Status badge (color-coded)
- Date submitted
- Quick action buttons: Mark as fit / Mark as not fit / View full profile
- Notes field (inline editable)

**Candidate full profile should show:**
- All contact info
- Scorecard results (per-question breakdown + total score)
- Hard filter checklist results
- Bonus signals (bilingual, experience, app comfort)
- Full call notes
- Status history / timeline
- Email log (which emails were sent and when)

### 5.2 Julia's View

Simplified version of the dashboard showing only candidates with status `advanced` or `julia_scheduled`. Julia sees:
- Candidate profile + scorecard from HM call
- HM notes
- Approve / Do not advance buttons
- Her Calendly scheduling link auto-populated in Email 3

### 5.3 Talent Pool View

Organized by metro area / state. Should be filterable by:
- Metro area
- State
- Active / inactive
- Bilingual
- Prior experience
- Onboarding complete

> **Future state note:** This view becomes the dispatch board. Build the data structure now so that availability, location, and active status are first-class fields — they will drive assignment matching in the marketplace phase.

---

## 6. Fillout Webhook Integration

CiMA has an existing Fillout form that captures:
- First name
- Last name
- City
- Email
- Phone

**On form submission, the platform must:**
1. Receive the Fillout webhook payload
2. Parse and store the candidate in the `candidates` table
3. Derive `metro_area` and `state` from the city field (use a city → metro mapping or a geocoding API)
4. Set status to `new`
5. Trigger Email 1 immediately via Resend

**Webhook endpoint:** `POST /api/webhooks/fillout`

Validate the webhook with a secret header. Deduplicate on email address — if a candidate resubmits, update the record rather than creating a duplicate.

---

## 7. Email Automation

All emails are sent via **Resend** from `talento@cimasales.com`. All emails are in **Spanish**. Emails trigger automatically on status changes — no manual sending.

### Trigger map

| Status change | Email triggered |
|---|---|
| Candidate created (`new`) | Email 1 — Disponibilidad |
| HM marks `not_fit` → `rejected_hm` | Email 2 — No es un fit |
| HM marks `fit` → `advanced` | Email 3 — Agenda con Julia |
| Julia marks `approved` | Email 4 — Bienvenido/a |
| Julia marks `not_approved` → `rejected_julia` | Email 5 — No avanza |

### Email templates (Spanish)

---

#### Email 1 — Disponibilidad
**Asunto:** Recibimos tu información — agenda tu llamada aquí

```
Hola [Nombre],

Gracias por tu interés en unirte al equipo de CiMA Sales como Mercaderista. Nos da mucho gusto que hayas dado ese primer paso.

Queremos conocerte. El siguiente paso es una llamada corta de 15 a 20 minutos con uno de nuestros representantes para platicar sobre ti y sobre lo que ofrecemos.

Agenda tu llamada directamente aquí — es rápido y sencillo:

👉 [ENLACE DE CALENDLY]

Si tienes alguna pregunta antes de la llamada, responde a este correo y te atendemos con gusto.

¡Esperamos hablar contigo muy pronto!

— Cima Talento
CiMA Sales | cimasales.com
```

---

#### Email 2 — No es un fit (post-HM call)
**Asunto:** Gracias por tu interés en CiMA Sales

```
Hola [Nombre],

Gracias por tomarte el tiempo de conectar con nosotros y conocer más sobre la posición de Mercaderista en CiMA Sales. Apreciamos sinceramente tu interés.

Después de evaluar tu perfil, hemos decidido continuar con otros candidatos cuya experiencia se ajusta mejor a lo que buscamos en este momento.

Esto no es un reflejo de tu potencial — simplemente es una cuestión de fit para esta posición en particular. Te invitamos a estar pendiente de futuras oportunidades en cimasales.com.

Te deseamos mucho éxito en tu búsqueda.

— Cima Talento
CiMA Sales | cimasales.com
```

---

#### Email 3 — Agenda con Julia
**Asunto:** ¡Vas avanzando! — agenda tu llamada con Julia

```
Hola [Nombre],

Excelentes noticias — después de hablar con nuestro equipo, nos gustaría continuar conociéndote.

El siguiente paso es una llamada breve con Julia Magallanes, Fundadora y CEO de CiMA Sales. Es tu oportunidad de conocer más sobre nuestra visión y para que Julia pueda conocerte mejor.

Agenda tu llamada aquí:

👉 [ENLACE DE CALENDLY — JULIA]

La llamada será de aproximadamente [X] minutos. Ven listo/a para hablar sobre ti y lo que te emociona de esta oportunidad.

¡Estamos emocionados de seguir adelante contigo!

— Cima Talento
CiMA Sales | cimasales.com
```

---

#### Email 4 — Bienvenido/a al talent pool
**Asunto:** Bienvenido/a a la Red de Talento de CiMA

```
Hola [Nombre],

Es un placer darte la bienvenida oficial a la Red de Talento de CiMA Sales.

Has sido agregado/a a nuestro equipo de mercaderistas, y ahora formas parte de un grupo que representa algunas de las marcas más emocionantes en el mercado hispano independiente a nivel nacional.

Esto es lo que viene:
• Nuestro equipo se pondrá en contacto contigo pronto con los detalles de tu incorporación.
• Recibirás información sobre tu territorio asignado, tu horario, y cómo configurar la aplicación móvil de CiMA.
• Si tienes preguntas mientras tanto, responde a este correo y te atendemos rápidamente.

En CiMA creemos en una sola cosa: que las personas extraordinarias construyen marcas extraordinarias. Nos alegra que seas parte de eso.

¡Bienvenido/a al equipo!

— Julia Magallanes y el equipo de Cima Talento
CiMA Sales | cimasales.com
```

---

#### Email 5 — No avanza (post-Julia call)
**Asunto:** Seguimiento a tu proceso con CiMA Sales

```
Hola [Nombre],

Gracias por tomarte el tiempo de hablar con Julia y por tu paciencia durante nuestro proceso. Lo valoramos genuinamente.

Después de nuestra evaluación final, hemos decidido continuar en otra dirección para esta posición. Sabemos que no es fácil escuchar esto, y queremos que sepas que tampoco fue una decisión fácil para nosotros — pusiste esfuerzo real en este proceso y eso se notó.

CiMA sigue creciendo y guardaremos tu información. Si surge una nueva oportunidad que sea un buen match para ti, serás de los primeros en saberlo.

Gracias nuevamente por tu interés en CiMA Sales. Te deseamos lo mejor.

— Cima Talento
CiMA Sales | cimasales.com
```

---

## 8. Vetting Call Scorecard

The scorecard is completed by the hiring manager inside the platform during or after the vetting call. It is stored in `candidates.scorecard_data` (jsonb) and `candidates.score_total` (integer).

### Step 1 — Hard filters (disqualify immediately if any are unchecked)

| # | Question | Pass condition |
|---|---|---|
| 1 | Do you have a valid driver's license and a reliable personal vehicle? | Yes |
| 2 | Are you currently authorized to work in the United States? | Yes (verbal only — docs verified later) |
| 3 | Are you available Monday through Friday, full time (40 hrs/week)? | Yes |
| 4 | Are you comfortable working independently and managing your own daily route? | Yes |

If any hard filter fails → status set to `rejected_hm` → Email 2 sent automatically.

### Step 2 — Scored questions (1 = weak, 2 = acceptable, 3 = strong)

| # | Category | Question | What to listen for |
|---|---|---|---|
| 1 | Self-management & reliability | Tell me about a time you had to manage your own schedule or workload without someone checking on you. How did you stay on track? | Specific example, self-discipline, proactive planning. Vague = 1. |
| 2 | Problem solving | Describe a situation where something went wrong on the job and you had to figure it out on your own. What did you do? | Ownership, creative thinking, didn't freeze. Blaming others = 1. |
| 3 | People & sales orientation | This role involves visiting multiple stores a day and building relationships with store managers. How do you typically build trust with people you've just met? | Warmth, confidence, specific tactics. Generic answer = 1. |
| 4 | Adaptability | Routes and priorities can change week to week. How do you handle last-minute changes to your plans? | Flexibility, positive framing. Resistance to change = 1. |
| 5 | Reliability & commitment | What does being reliable mean to you, and can you give me an example of how you've shown that in a past role? | Specific example, accountability. "I'm always on time" with no example = 1. |
| 6 | Initiative | If you noticed a product wasn't placed well in a store and no one told you to fix it — what would you do? | Takes initiative without being asked. "Wait for instructions" = 1. |
| 7 | Brand & merchandising instinct | Walk me through how you'd represent a brand inside a store you've never visited before. | Structured thinking, attention to detail. Vague = 1. |

**Maximum score: 21 points**

### Step 3 — Bonus signals (not scored, but inform borderline decisions)

| Signal | Field |
|---|---|
| Bilingual English/Spanish | `bilingual` boolean |
| Prior merchandising/retail/CPG/route experience | `prior_experience` boolean |
| Comfortable using smartphone app for daily reporting | `app_comfortable` boolean |

### Verdict logic

| Score range | Verdict |
|---|---|
| 17–21 | Strong yes — advance to Julia's call |
| 12–16 | Borderline — use judgment; bonus signals tip the decision |
| Below 12 | Not a fit — do not advance |

---

## 9. Location Organization Logic

Candidates submit a city on the Fillout form. The platform must:

1. Map city → metro area on ingestion (e.g., "Fort Worth" → "Dallas–Fort Worth")
2. Store both `city`, `zip_code` (if available), `metro_area`, and `state`
3. All platform views organize candidates by metro area, not by raw city or ZIP
4. Hiring managers are assigned to metro areas, not individual ZIPs
5. In edge cases, a merchandiser in one metro can be deployed to an adjacent metro — the data model must support this

**Suggested metro mapping approach:** Use a static city-to-metro lookup table for common cities in CiMA's operating states (NY, NJ, CT, MA, RI, MD, VA, DC, IL, GA, TN, TX, FL — and growing). Fall back to a geocoding API (e.g., Google Maps, Radar.io) for cities not in the static table.

---

## 10. Authentication & Roles

| Role | Access |
|---|---|
| `admin` (Julia) | Full access to all candidates, all metros, all decisions |
| `hiring_manager` | Access to candidates in their assigned metros only; can mark fit/not fit; cannot approve to talent pool |
| (Future) `regional_manager` | Subset of hiring_manager permissions scoped to a region |

Use Supabase Auth with row-level security (RLS) policies to enforce role-based access.

---

## 11. Calendly Integration

- Hiring manager has their own Calendly link stored in `hiring_managers.calendly_link`
- Julia has her own Calendly link (stored as a config variable or in the `hiring_managers` table)
- Email 1 auto-populates the hiring manager's Calendly link for the candidate's metro area
- Email 3 auto-populates Julia's Calendly link
- **Future:** Use Calendly webhooks to automatically update candidate status when a call is booked (`new` → `scheduled`, `advanced` → `julia_scheduled`)

---

## 12. Future State — Staffing Marketplace

Every decision in this build should account for the following future features:

- **Dispatch:** Client companies request a merchandiser for a specific store, date, and time
- **Matching:** Platform matches request to available talent pool members by metro area, availability, and skills
- **Scheduling:** Merchandisers receive assignments and confirm via the platform or mobile app
- **Client dashboard:** Brand clients can see talent coverage by region
- **Regional hiring managers:** Multiple HMs managing separate geographic territories, each with their own queue and Calendly link

**What this means for the current build:**
- `talent_pool.availability` must be a structured jsonb field (days + hours), not a free-text note
- `talent_pool.active` must be a boolean that can be toggled
- `candidates.metro_area` and `talent_pool.metro_area` must be consistent and normalized
- Do not build anything in a way that would require a full rewrite to add dispatch logic later

---

## 13. Build Order (Recommended)

Build in this sequence to validate the core loop as early as possible:

1. **Supabase schema** — Create all tables, enums, and RLS policies
2. **Fillout webhook** — `POST /api/webhooks/fillout` → ingest candidate → set status → trigger Email 1
3. **Resend email system** — All 5 templates wired to status change triggers
4. **Hiring manager dashboard** — Candidate queue, status management, scorecard UI
5. **Scorecard feature** — Hard filters + scored questions + verdict logic + save to Supabase
6. **Julia view** — Filtered queue, approve/reject actions, Email 4/5 triggers
7. **Talent pool view** — Full profiles, filterable by metro/state/bilingual/experience
8. **Calendly integration** — Link injection into emails, webhook for auto status updates
9. **Auth + roles** — Supabase Auth, RLS policies, role-based UI rendering
10. **Metro area mapping** — City → metro logic, static lookup + geocoding fallback

---

## 14. Key Constraints & Non-Negotiables

- **No candidate should ever sit without a status.** Every record must have a clear status at all times.
- **No email is ever sent manually.** All five emails trigger automatically on status changes.
- **All candidate-facing communication is in Spanish.**
- **Hard filter failures disqualify immediately** — the scored section of the scorecard should not be accessible if any hard filter is unchecked.
- **The data model must support the future marketplace.** Do not cut corners on `talent_pool` fields or location normalization.
- **Legal work status is confirmed verbally on the call only** — it is not on the interest form and not verified until formal onboarding (I-9). Do not build any verification step into the pipeline UI.
- **Resend domain:** `coalhousepizza.com` domain verification pattern is already known — apply the same DNS verification approach for `cimasales.com`.

---

*Built for CiMA Sales Strategies | Prepared for Claude Code | June 2026*
