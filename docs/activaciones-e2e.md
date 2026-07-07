# CiMA Activaciones — End-to-End Walkthrough (Step 10)

The programmatic sweep (security matrix with a real client session, DB guards,
trigger/log consistency, email health) passes 30/30. This checklist covers what
only eyes can verify. Run both apps first:

```bash
pnpm dev:hub      # Hub    → http://localhost:3000
pnpm dev:portal   # Portal → http://localhost:3001
```

**Logins** — Hub: your staff account. Portal: `sebastiancordulack+raptor@gmail.com`
/ `CimaPortal-Demo-2026`. All internal emails currently route to
sebastiancordulack@gmail.com; Raptor client emails to the +raptor alias.

Current demo state worth knowing: three Raptor rows sit in *client_approved*
(awaiting "Confirmar evento"), the Doña Rosa batch is fully *quote_sent*, your
"Si Si / Hello Fresh" batch is in *Nuevas*, Fan Zone is *in progress* (today).

## 1 · Client Portal (as Raptor)

- [ ] Wrong password shows a friendly error; correct login lands on the dashboard
- [ ] Dashboard: "Waiting on you" is empty (you already answered everything); active requests show correct badges
- [ ] Submit a **single in-store** request → lands on detail with the green "submitted" banner
- [ ] Confirmation email arrives (+raptor inbox); internal alert arrives (main inbox); request appears in Hub → Nuevas within a refresh
- [ ] Submit a **field event** (checkboxes, budget range, vision) → detail renders every section correctly
- [ ] **Edit request** visible on a *submitted* row; change the time; save; detail reflects it
- [ ] My Requests: filter chips work; counts feel right
- [ ] Open a *quote_sent* Doña Rosa row — wrong account! It must **not** appear at all (that's Sabor's data; Raptor sees only its own 8+ rows)
- [ ] Sign out → any URL bounces to /login

## 2 · Hub (as staff/Julia)

- [ ] Queue: five tabs with sane counts; `lote` chips on batch rows; "Asignada a" and "hace N días" columns
- [ ] Open **Si Si** (your test batch): Iniciar revisión → Tomar solicitud → save internal notes + verification
- [ ] **Quote builder**: sections for BOTH batch locations with subtotals; save draft; **Enviar cotización** → whole batch flips to quote_sent (both rows — this was the bug fixed in this pass), client email arrives **once**
- [ ] Portal: approve that quote → both locations → *Approved by you*; internal email arrives
- [ ] **Confirmar evento** on a client_approved row (e.g. BBQ Battle) → confirmed; client "confirmed" email with details; event appears in **Eventos** calendar
- [ ] **Propose change** on an in_review row (Fiestas Patrias) → violet status; portal shows Approve/Decline; decline it → back to En revisión; internal "rechazó" email
- [ ] **Talent panel** on a confirmed event: suggested metro chip; assign someone; assign the same person to another same-date confirmed event → friendly conflict error; unassign works
- [ ] **Eventos tracker**: Día/Semana/Mes switch; Hoy button; chips link to workspace; Iniciar ejecución → chip turns solid green; Marcar completada → moves to Historial
- [ ] **Clientes** (admin): create a test client (use a +alias email) → credentials box shows once → log into the portal with them → Nueva contraseña (old stops working) → Desactivar (portal bounces them) → Reactivar
- [ ] Non-admin staff (e.g. Paula) sees no Clientes nav and /activaciones/clientes bounces her

## 3 · Emails (inbox spot-check)

- [ ] Every email renders with the CiMA banner, readable on mobile
- [ ] English ones (client): received / change proposed / quote ready / confirmed / cancelled
- [ ] Spanish ones (internal): nueva solicitud / cliente aprobó / cambio rechazado
- [ ] Portal CTA links point at the portal URL (dead until NEXT_PUBLIC_PORTAL_URL is set — expected for now)

## 4 · Edge cases

- [ ] Two tabs on the same solicitud: transition in one, then act in the other → "La solicitud cambió de estado…" (not a crash)
- [ ] Edit window closes: once a row passes in_review, the portal Edit button is gone and /edit redirects to the detail
- [ ] Batch quote on a batch with one cancelled location: cancelled row stays cancelled

## 5 · Talento regression (5 minutes)

- [ ] Dashboard queues load with candidates; filters work
- [ ] Candidate detail + scorecard open; status history + email log render
- [ ] Talent pool map renders; Vista de Julia loads
- [ ] (If convenient) a Jotform test submission still ingests

## Before production (deliberately not done yet)

1. Push branch → PR → Vercel previews → merge
2. Hub Vercel env: `ACTIVACIONES_INTERNAL_EMAILS` (Julia's real address), `NEXT_PUBLIC_PORTAL_URL`
3. Portal Vercel project: confirm root `apps/portal` + Supabase env vars; custom domain
4. Wipe demo data (`cleanup_activaciones_demo.py` equivalent) and re-point the demo client emails, or provision the first real client via Clientes
