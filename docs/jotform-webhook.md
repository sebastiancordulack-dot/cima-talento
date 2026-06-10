# Jotform webhook setup

Form: **261605489959071** · Endpoint: `POST /api/webhooks/jotform`

The webhook ingests a submission, dedups on email, derives location, and sends
Email 1 (Disponibilidad). It only goes live once the app is deployed with the
env vars below.

## Field mapping (from the Jotform API)

| Jotform field (qid) | → candidate column |
|---|---|
| Nombre Completo (3) | `first_name` + `last_name` |
| Correo Electrónico (4) | `email` (dedup key) |
| Teléfono (5) | `phone` |
| Ciudad (7) | `city` |
| Estado (8) | `state` |
| Código postal (9) | `zip_code` |

`metro_area` is derived later (Step 10).

## Required env vars (add to Vercel: Production + Preview + Development)

```
JOTFORM_WEBHOOK_TOKEN=<the token from .env.local — keep secret>
JOTFORM_FORM_ID=261605489959071
```

## Register the webhook in Jotform

1. Open the form → **Settings → Integrations → Webhooks** (or **Add Form
   Element → Webhooks**).
2. Paste the URL, **including the `?token=` secret**:

   ```
   https://<your-vercel-domain>/api/webhooks/jotform?token=<JOTFORM_WEBHOOK_TOKEN>
   ```

3. Complete (no payload format options needed — Jotform posts form-data).

## Security

Jotform has no native webhook signing, so the endpoint rejects anything that
fails **either** check before touching the database:

- the URL `token` must equal `JOTFORM_WEBHOOK_TOKEN` (constant-time compare)
- the submission's `formID` must equal `JOTFORM_FORM_ID`

If the token ever leaks, run `openssl rand -hex 24`, update the env var, and
re-paste the new URL in Jotform.

## Verified behavior (local)

bad token → 401 · wrong formID → 403 · malformed body → 400 · missing email →
400 · valid submission → 200 (candidate created, all fields mapped, Email 1
sent) · resubmission → 200 with `isNew:false` (no duplicate row, no second Email 1).
