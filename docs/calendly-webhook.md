# Calendly webhook setup

Endpoint: `POST /api/webhooks/calendly` · goes live once deployed with the
signing key below.

## What it does (Brief §11)

Auto-updates candidate status when a call is booked or canceled — no email is
sent on these transitions:

| Event | Candidate status change | Stamps |
|---|---|---|
| `invitee.created` | `new` → `scheduled` | `hm_call_at` |
| `invitee.created` | `advanced` → `julia_scheduled` | `julia_call_at` |
| `invitee.canceled` | `scheduled` → `new` | — |
| `invitee.canceled` | `julia_scheduled` → `advanced` | — |

The candidate is matched by the invitee's email. Which call a booking refers to
is inferred from the candidate's current status (a candidate only has Julia's
link once they're `advanced`), so no event-type matching is needed. Bookings on
any other status are a safe no-op.

## Create the subscription (one-time, after deploy)

Calendly webhooks are created via its API and return a **signing key**. You need
a Calendly **Personal Access Token** (Calendly → Integrations → API & Webhooks)
and your organization + user URIs (`GET https://api.calendly.com/users/me`).

```bash
curl -X POST https://api.calendly.com/webhook_subscriptions \
  -H "Authorization: Bearer <PERSONAL_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<your-vercel-domain>/api/webhooks/calendly",
    "events": ["invitee.created", "invitee.canceled"],
    "organization": "https://api.calendly.com/organizations/<ORG_UUID>",
    "scope": "organization"
  }'
```

The response includes a `signing_key`. Set it in Vercel (Production + Preview):

```
CALENDLY_WEBHOOK_SIGNING_KEY=<signing_key from the response>
```

Redeploy so the value is picked up.

## Security

Every request must carry a valid `Calendly-Webhook-Signature` header
(HMAC-SHA256 of `t.body` with the signing key) **and** a timestamp within 5
minutes. Anything else → 401, before any DB access.

## Verified behavior (local)

bad/wrong-key signature → 401 · `created` new→scheduled (hm_call_at set) ·
`created` advanced→julia_scheduled (julia_call_at set) · `canceled`
scheduled→new (no Email 1 re-sent) · unknown invitee → no-op · unmapped status →
no-op. Zero emails fired across all transitions.
