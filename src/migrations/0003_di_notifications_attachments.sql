-- 0003 · Decision Intelligence step 7: notifications, the GHL outbox, attachments storage.
-- Idempotent, like 0002. BS-AI-009 (events), BS-AI-013 §7 (the webhook contract),
-- BS-AI-004 §2 (attachment service; file bytes live in the row, served by the backend).

ALTER TABLE attachment ADD COLUMN IF NOT EXISTS file_data bytea;
ALTER TABLE attachment ADD COLUMN IF NOT EXISTS filename text;

-- one in-app row per event instance: the dedup key says what "once" means (n6:<log id>, n12d5:<guest id>…)
ALTER TABLE notification ADD COLUMN IF NOT EXISTS dedup text;
ALTER TABLE notification ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE notification ADD COLUMN IF NOT EXISTS body text;
CREATE UNIQUE INDEX IF NOT EXISTS notification_dedup_idx ON notification (dedup) WHERE dedup IS NOT NULL;

-- Backend → GHL (BS-AI-013 §7): one row per event; sent when the GHL inbound URL and secret
-- are configured, held as pending until then. Idempotent on event_id at the GHL end.
CREATE TABLE IF NOT EXISTS ghl_outbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL DEFAULT gen_random_uuid(),
  event           text NOT NULL,
  user_id         uuid,
  payload         jsonb NOT NULL,
  site            text NOT NULL DEFAULT 'uk',
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  attempts        integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ghl_outbox_pending_idx ON ghl_outbox (status, created_at);

-- GHL → backend: idempotency on the event id (retried webhooks apply once)
CREATE TABLE IF NOT EXISTS ghl_inbound_event (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    text UNIQUE,
  event       text,
  payload     jsonb,
  received_at timestamptz NOT NULL DEFAULT now()
);
