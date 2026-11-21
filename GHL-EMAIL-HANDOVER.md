# GHL handover — the emails the backend already queues, 21 Nov 2026

The backend's side of these emails is built and waiting. Nothing sends until the GHL
side below is done. Reference: BS-AI-013 (GHL Handover) §4 workflows, §7 webhook
contract; BS-AI-009 for every email's copy rules.

## What the backend already does

Each event writes one row into `ghl_outbox` with the §7 payload: `event`, `event_id`
(idempotency key), `bs_user_id`, `email`, `first_name`, `last_name`, `site` ("uk" or
"ai" — send to that site's sub-account), plus the extra fields below. Rows stay
**pending** until the outbound webhook is configured; then they deliver with retries
(max 5 attempts). Nothing is lost and nothing sends twice.

| Event | Fired when | Extra fields | Starts (BS-AI-013 §4) |
| --- | --- | --- | --- |
| `account.created` | An account is created (app sign-up via `/api/user/sync-profile`, or first quiz session) — once per account | `tier` | W3 — the sign-up confirmation email |
| `edna.save_progress` | "Save my progress by email" is tapped in the app (BS-AI-009 A1) | — | W1 — email A1 "Carry on with your E-DNA" |

## What the GHL team needs to do

1. Create the inbound webhook in each sub-account (uk and ai) and give the dev team
   the URL(s) and a shared secret.
2. Dev team sets on App Runner (merge into the existing env map, never replace):
   - `GHL_INBOUND_WEBHOOK_URL`
   - `GHL_INBOUND_WEBHOOK_SECRET` (sent as the `x-webhook-key` header)
3. Build workflow **W3** (sign-up): starts on webhook `account.created`, creates or
   updates the contact, sends the sign-up confirmation email, stops.
4. Build workflow **W1** (resume): starts on webhook `edna.save_progress`, sends
   email **A1** at once, stops. A1 copy per BS-AI-013 §5: subject "Carry on with your
   E-DNA"; body "Your E-DNA is saved at Part [n]. This link opens it where you left
   it, on any device, for 24 hours. → Carry on".

## Notes and open points

- **App sign-ups differ from the web journey W3 was written for.** BS-AI-013 §7 gives
  `account.created` the extras `set_password_url`, `core_type_line`, `mentor` — those
  belong to the web's claim-the-report flow. An APP sign-up has already set a password
  and has no result yet, so those fields are absent. The W3 workflow should branch on
  their absence (or a separate app-welcome template be agreed with Fariza).
- **Payment confirmation:** website orders go through GHL's own order pages, so the
  purchase event and receipt (W5 / N11) are GHL-native — nothing needed from the
  backend. App In-App Purchases get Apple's own receipt email; there is no §7 event
  for them. If Fariza wants a branded email for app purchases too, that needs a new
  §7 event agreed first.
- The A1 payload does not yet carry the part number `[n]` or a resume link — on iOS
  progress stays on the phone (BS-AI-003 §9.2). Agree the iOS variant's merge fields
  with Fariza before the template is finalised.
- The same `GHL_INBOUND_WEBHOOK_URL` also releases every other queued DI notification
  email (N1–N14 rows already accumulate in `ghl_outbox`), so wiring it turns on all
  of BS-AI-013 §4, not just W1 and W3.
