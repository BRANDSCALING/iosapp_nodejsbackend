-- 25 Nov 2026 (Munawar):
-- 1. Settings · Screen carries across devices (the approved design: "They carry across your
--    devices"): the six settings are kept on the account, not only in one browser.
-- 2. Delete my account (BS-AI-003 §9.2, BS-AI-004 §3.4, BS-AI-009 A11): password and the word
--    DELETE, then a 14-day wait during which signing in cancels it.
-- 3. Entries in other people's rooms stay with the person's name after deletion (BS-AI-003
--    §9.2; BS-AI-008 §5): the name is copied onto the room membership before the user row goes.
ALTER TABLE users ADD COLUMN IF NOT EXISTS screen_settings     jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS delete_requested_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS delete_after        timestamptz;
ALTER TABLE room_member ADD COLUMN IF NOT EXISTS left_name text;
CREATE INDEX IF NOT EXISTS users_delete_after_idx ON users (delete_after) WHERE delete_after IS NOT NULL;
