# GHL handover — "Save my progress by email" (A1), 21 Nov 2026

The backend's side of the resume email is built and waiting. Nothing sends until the
GHL side below is done. Reference: BS-AI-013 (GHL Handover) §4 workflow W1, §7 webhook
contract; BS-AI-009 row A1.

## What the backend already does

- The iOS app's "Save my progress by email" link calls
  `POST /api/v1/quiz/save-progress-email` (Cognito bearer + `x-user-id`, the usual pair).
- That writes one row into `ghl_outbox` with event **`edna.save_progress`** and the §7
  payload: `event`, `event_id` (idempotency key), `bs_user_id`, `email`, `first_name`,
  `last_name`, `site` ("uk" or "ai" — send to that site's sub-account).
- Rows stay **pending** until the outbound webhook is configured; then they deliver with
  retries (max 5 attempts). Nothing is lost and nothing sends twice.

## What the GHL team needs to do

1. Create the inbound webhook in each sub-account (uk and ai) and give the dev team the
   URL(s) and a shared secret.
2. Dev team sets on App Runner (merge into the existing env map, never replace):
   - `GHL_INBOUND_WEBHOOK_URL`
   - `GHL_INBOUND_WEBHOOK_SECRET` (sent as the `x-webhook-key` header)
3. Build workflow **W1** (BS-AI-013 §4): starts on webhook `edna.save_progress`, sends
   email **A1** at once, stops.
4. Email A1 (BS-AI-013 §5): subject "Carry on with your E-DNA"; body "Your E-DNA is
   saved at Part [n]. This link opens it where you left it, on any device, for 24
   hours. → Carry on". Template rules in §5 (brand header, Inter, one button,
   plain-text alternative, the site's company footer).

## Open points for the dev team (noted, not blocking)

- The payload does not yet carry the part number `[n]` or the 24-hour resume link —
  those are the web assessment's (BS-AI-009 A1 is a web resume flow; on iOS progress
  stays on the phone). Agree the iOS variant's merge fields with Fariza before the
  template is finalised.
- The same `GHL_INBOUND_WEBHOOK_URL` also releases every other queued DI notification
  email (N1–N14 rows already accumulate in `ghl_outbox`), so wiring it turns on all of
  BS-AI-013 §4, not just W1.
