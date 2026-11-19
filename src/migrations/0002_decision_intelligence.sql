-- 0002_decision_intelligence.sql — BS-AI-004 §7 (approved 19 Nov 2026), adapted to this
-- backend: no row-level security (the API runs as one database role, so every §7.2 policy
-- is enforced in the route layer instead — decisionRoutes.js), soft user references like
-- the existing tables (users.id is the Cognito sub), gen_random_uuid() for ids.
-- Apply:  psql "$DB_URL" -f src/migrations/0002_decision_intelligence.sql

BEGIN;

-- ---------------------------------------------------------------- decisions (BS-AI-003 §4, §5)
CREATE TABLE IF NOT EXISTS decision (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL,
  kind               text NOT NULL DEFAULT 'new' CHECK (kind IN ('new','started','made')),
  "order"            text NOT NULL CHECK ("order" IN ('logic_first','feeling_first')),
  awareness_practice boolean NOT NULL DEFAULT false,
  urgent             boolean NOT NULL DEFAULT false,
  text               text NOT NULL,
  status             text NOT NULL DEFAULT 'in_frame' CHECK (status IN ('in_frame','saved','checked','reviewed')),
  opened_at          timestamptz NOT NULL DEFAULT now(),
  checked_at         timestamptz,
  rounds             integer NOT NULL DEFAULT 1,
  turn_count         integer NOT NULL DEFAULT 0,
  room_id            uuid,
  workbook_id        uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS decision_user_idx ON decision (user_id, opened_at DESC);

-- one entry per box per round; append-only, own entries editable until Check (API-enforced)
CREATE TABLE IF NOT EXISTS decision_entry (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id    uuid NOT NULL REFERENCES decision(id) ON DELETE CASCADE,
  box            text NOT NULL CHECK (box IN ('decision','box1','box2','box3','end','box4')),
  round          integer NOT NULL DEFAULT 1,
  loop           text CHECK (loop IN ('logic','feeling')),
  text           text NOT NULL,
  author_user_id uuid NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS decision_entry_decision_idx ON decision_entry (decision_id, box, round);

CREATE TABLE IF NOT EXISTS attachment (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id  uuid,
  room_id      uuid,
  box          text,
  user_id      uuid NOT NULL,
  file_url     text NOT NULL,
  mime         text,
  size         integer,
  extract      text,            -- facts extract, <= 800 tokens (BS-AI-007 §5)
  confirmed_at timestamptz,     -- enters the box only after confirm
  deleted_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mentor_turn (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id         uuid,
  room_id             uuid,
  user_id             uuid NOT NULL,
  mentor              text CHECK (mentor IN ('architect','alchemist')),
  event               text,
  instruction_version text,
  model               text,
  input_tokens        integer,
  output_tokens       integer,
  latency_ms          integer,
  response            jsonb,    -- the validated JSON of BS-AI-005 §5
  charged             boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mentor_turn_decision_idx ON mentor_turn (decision_id, created_at);

CREATE TABLE IF NOT EXISTS mentor_instruction (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version     text NOT NULL,
  text        text NOT NULL,
  approved_by text,
  approved_at timestamptz,
  current     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- the Decision Log (BS-AI-001 §6)
CREATE TABLE IF NOT EXISTS decision_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  decision_id    uuid,                 -- null for a hand-written row
  date           date NOT NULL DEFAULT CURRENT_DATE,
  text           text NOT NULL,
  context        text CHECK (context IN ('money','time','people','conflict','personal')),
  "order"        text CHECK ("order" IN ('logic_first','feeling_first')),
  began_loop     text CHECK (began_loop IN ('logic','feeling')),
  finished_loop  text CHECK (finished_loop IN ('logic','feeling')),
  switched       boolean,
  rounds         integer,
  urgent         boolean NOT NULL DEFAULT false,
  warnings       jsonb,
  rests_on       text,
  decided_text   text,
  readiness      text CHECK (readiness IN ('ready','one_more_round','not_yet')),
  written_by     text NOT NULL DEFAULT 'person' CHECK (written_by IN ('mentor','person')),
  workbook_id    uuid,
  time_to_decide interval,
  review_date    date,
  outcome        text CHECK (outcome IN ('held','held_in_part','changed_direction','reopened')),
  review_answers jsonb,
  room_id        uuid,
  role           text,
  rule           jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS decision_log_user_idx ON decision_log (user_id, date DESC);
CREATE INDEX IF NOT EXISTS decision_log_review_idx ON decision_log (user_id, review_date) WHERE outcome IS NULL;

-- ---------------------------------------------------------------- rooms (BS-AI-008)
CREATE TABLE IF NOT EXISTS decision_room (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  kind          text NOT NULL DEFAULT 'new' CHECK (kind IN ('new','stuck','clash')),
  decision_text text NOT NULL,
  "order"       text CHECK ("order" IN ('logic_first','feeling_first')),
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','waiting_owner','waiting_room','ready','decided','reviewed','closed')),
  round         integer NOT NULL DEFAULT 1,
  checked_at    timestamptz,
  review_date   date,
  outcome       text,
  rule          jsonb,
  closed_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_member (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid NOT NULL REFERENCES decision_room(id) ON DELETE CASCADE,
  user_id    uuid,
  role       text NOT NULL DEFAULT 'collaborator' CHECK (role IN ('decision_owner','collaborator','read_only')),
  loop       text,
  mentor     text,
  consent_at timestamptz,
  invited_by uuid,
  joined_at  timestamptz,
  left_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS room_member_room_idx ON room_member (room_id);

CREATE TABLE IF NOT EXISTS room_entry (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id            uuid NOT NULL REFERENCES decision_room(id) ON DELETE CASCADE,
  member_id          uuid NOT NULL REFERENCES room_member(id),
  box                text NOT NULL CHECK (box IN ('decision','box1','box2','box3','end','box4','clash_decision','rule')),
  round              integer NOT NULL DEFAULT 1,
  loop               text,
  text               text NOT NULL,
  attachment_id      uuid,
  confirmed_by       uuid,
  mentor_translation boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_split (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id  uuid NOT NULL REFERENCES decision_room(id) ON DELETE CASCADE,
  box      text,
  line     text,
  found_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_invite (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id          uuid NOT NULL REFERENCES decision_room(id) ON DELETE CASCADE,
  token            text NOT NULL UNIQUE,
  email            text,
  role             text NOT NULL DEFAULT 'collaborator',
  expires_at       timestamptz NOT NULL,
  accepted_at      timestamptz,
  accepted_user_id uuid,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- credits (BS-AI-007)
CREATE TABLE IF NOT EXISTS credit_grant (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  source          text NOT NULL CHECK (source IN ('tier','purchase_99','pack','admin')),
  amount          integer NOT NULL,
  granted_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz,
  stripe_event_id text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credit_grant_user_idx ON credit_grant (user_id);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  grant_id       uuid REFERENCES credit_grant(id),
  decision_id    uuid,
  room_id        uuid,
  mentor_turn_id uuid,
  amount         integer NOT NULL DEFAULT 1,
  reason         text NOT NULL CHECK (reason IN ('check','further_turns','manual_check')),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credit_ledger_user_idx ON credit_ledger (user_id);

CREATE TABLE IF NOT EXISTS tier_allowance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier            text NOT NULL,
  monthly_credits integer NOT NULL,
  daily_cap       integer NOT NULL DEFAULT 10,
  rooms_allowed   boolean NOT NULL DEFAULT false,
  guests_allowed  boolean NOT NULL DEFAULT false,
  effective_from  date NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS guest_access (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  invited_by     uuid,
  room_id        uuid,
  started_at     timestamptz NOT NULL DEFAULT now(),
  ends_at        timestamptz NOT NULL,
  decisions_left integer NOT NULL DEFAULT 3,
  converted_at   timestamptz
);

-- ---------------------------------------------------------------- notifications (BS-AI-009)
CREATE TABLE IF NOT EXISTS notification (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  event       text NOT NULL,
  object_type text,
  object_id   uuid,
  channel     text NOT NULL DEFAULT 'inapp' CHECK (channel IN ('inapp','push','email')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz,
  opened_at   timestamptz,
  digest_id   uuid
);
CREATE INDEX IF NOT EXISTS notification_user_idx ON notification (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_pref (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  event      text NOT NULL,
  push       boolean NOT NULL DEFAULT true,
  email      boolean NOT NULL DEFAULT true,
  quiet_from time,
  quiet_to   time,
  digest     boolean NOT NULL DEFAULT false,
  time_zone  text,
  UNIQUE (user_id, event)
);

CREATE TABLE IF NOT EXISTS device_token (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  platform   text NOT NULL DEFAULT 'ios',
  token      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS safety_event (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  mentor_turn_id uuid,
  kind           text NOT NULL,
  reviewed_by    uuid,
  reviewed_at    timestamptz,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- sessions, terms, devices (BS-AI-004 §3.4, §8)
CREATE TABLE IF NOT EXISTS edna_session (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answers        jsonb NOT NULL DEFAULT '{}'::jsonb,
  part_reached   integer NOT NULL DEFAULT 1,
  last_answer_at timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  resume_token   text UNIQUE,
  claimed_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS terms_acceptance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  document    text NOT NULL CHECK (document IN ('terms_of_use','privacy_policy','membership_terms')),
  version     text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  "where"     text CHECK ("where" IN ('gate','checkout','settings')),
  ip_hash     text
);
CREATE INDEX IF NOT EXISTS terms_acceptance_user_idx ON terms_acceptance (user_id);

CREATE TABLE IF NOT EXISTS auth_device (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  device_name         text,
  platform            text,
  first_seen_at       timestamptz NOT NULL DEFAULT now(),
  last_seen_at        timestamptz NOT NULL DEFAULT now(),
  remembered          boolean NOT NULL DEFAULT true,
  two_step_verified_at timestamptz
);

-- ---------------------------------------------------------------- existing tables: new columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name  text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url  text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS site       text DEFAULT 'uk' CHECK (site IN ('uk','ai'));

COMMIT;
