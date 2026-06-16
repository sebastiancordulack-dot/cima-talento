# Meta Lead Ads webhook setup

Endpoint: `GET/POST https://cima-talento.vercel.app/api/meta-lead`

Meta posts a `leadgen` event that contains **only a `leadgen_id`** — not the
answers. The route verifies the signature, calls the Graph API (with a Page
Access Token) to fetch the lead's `field_data`, maps it to a candidate, and runs
the **same `ingestCandidate()`** path as Jotform: dedup on email, derive metro,
send Email 1 (Disponibilidad), log status history. It runs **alongside** the
Jotform webhook — nothing about the existing flow changes.

## Field mapping

Matching is case-insensitive on the Meta field `name` keys. Meta's standard
fields keep canonical English names even when the question label is in Spanish;
Spanish aliases are also accepted for custom questions.

| Meta field name (aliases) | → candidate column |
|---|---|
| `email`, `correo`, `correo_electronico` | `email` (**required** — dedup key) |
| `first_name`/`last_name`, or `full_name` (auto-split), `nombre`/`apellido` | `first_name`, `last_name` |
| `phone_number`, `phone`, `telefono`, `celular`, `whatsapp` | `phone` |
| `city`, `ciudad`, **or** the extracted city below | `city` |
| `state`, `province`, `estado` | `state` |
| `zip_code`, `postal_code`, `cp` | `zip_code` |

**City extraction** (these forms have no standard `city` field). When `city`
isn't present, the mapper recovers it two ways:
- **Qualifier in the field name** — `vives_en_<city>_y_cuentas_con_vehículo…`
  (Sí/No): the city is the `<city>` in the name, used **only when the answer is
  `sí`** (a `no` means they don't live there → left unassigned).
- **City question in the value** — `¿en qué ciudad vives actualmente?`: the
  answer (e.g. `new_york,_ny`, `área_metropolitana_de_new_orleans`) is cleaned to
  a city name.

The vehicle part of the qualifier is intentionally **not** captured — the hiring
manager verifies hard filters during vetting.

`metro_area` is derived from city/state/ZIP via the existing lookup. Cities not
yet in the metro catalog (e.g. New Orleans, Indianapolis) stay unassigned until
that metro is added (Agregar metro), then route automatically. `source` is
set to `Meta Lead Ad`. A lead with **no email is skipped** (logged), since the
pipeline keys on email. Unmapped field names are logged on the first run so the
mapping can be confirmed against your real form.

## Required env vars (Vercel: Production + Preview + Development)

```
META_APP_SECRET=<Meta app secret — used to verify the X-Hub-Signature-256 HMAC>
META_PAGE_ACCESS_TOKEN=<long-lived Page token with leads_retrieval>
META_VERIFY_TOKEN=<any random string you choose; entered again in the Meta UI>
# optional:
META_PAGE_ID=<your Page ID — if set, only that page's leads are processed>
META_GRAPH_VERSION=v21.0
```

After adding/changing env vars in Vercel, **redeploy** (they are read at runtime,
but a redeploy guarantees the new values are live).

## One-time Meta setup

### 1. App + permissions
1. In <https://developers.facebook.com> create (or reuse) a **Business** app.
2. Add the **Webhooks** and **Lead Ads** (a.k.a. "Leads Access") products.
3. The app needs the `leads_retrieval` permission. For reading **your own
   Page's** leads, the simplest reliable route is a **System User token** from
   Business Manager → Business Settings → System Users:
   - Assign the System User to the Page with **Manage** access.
   - Generate a token with scopes: `leads_retrieval`, `pages_show_list`,
     `pages_read_engagement`, `pages_manage_metadata`.
   - This is your `META_PAGE_ACCESS_TOKEN` (system-user tokens don't expire).
   - (A short-lived Page token from Graph API Explorer also works for testing,
     but expires — prefer the System User token for production.)

### 2. Configure the webhook
1. App Dashboard → **Webhooks** → **Page** object → **Subscribe to this object**.
2. **Callback URL:** `https://cima-talento.vercel.app/api/meta-lead`
3. **Verify token:** the exact value of `META_VERIFY_TOKEN`.
4. Click **Verify and Save** — Meta sends a `GET` handshake; the route echoes
   `hub.challenge` if the token matches.
5. Under the Page object, **subscribe to the `leadgen` field**.

### 3. Subscribe the Page to the app
The app must be subscribed to receive the Page's leadgen events. Either use the
"Add subscriptions" UI on the Webhooks page, or call once (with the Page token):

```
POST https://graph.facebook.com/v21.0/{PAGE_ID}/subscribed_apps
  ?subscribed_fields=leadgen
  &access_token={META_PAGE_ACCESS_TOKEN}
```

### 4. Test
1. Use Meta's **Lead Ads Testing Tool**
   (<https://developers.facebook.com/tools/lead-ads-testing>): pick the Page +
   form, **Create lead**.
2. The candidate should appear in the dashboard within seconds and receive
   Email 1.
3. If nothing arrives, check the Vercel function logs for `[meta-lead]` lines
   (signature failures, skipped no-email leads, or the unmapped field names).

## Security model
- **POST** is rejected unless `X-Hub-Signature-256` matches an HMAC-SHA256 of the
  raw body keyed by `META_APP_SECRET` (fail-closed, like the Calendly webhook).
- **GET** handshake only succeeds when `hub.verify_token` equals
  `META_VERIFY_TOKEN`.
- Ingestion is **idempotent** (dedup on email), so Meta's retries never create
  duplicates. Transient Graph/DB errors return `5xx` so Meta retries.
