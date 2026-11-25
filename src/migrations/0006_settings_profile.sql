-- Settings (25 Nov 2026, Munawar): the Profile panel of the approved app design asks for
-- phone, country, time zone and an optional business name; nothing stored them. The
-- device list reads auth_device (0002), which nothing wrote until now.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone         text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS country       text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS time_zone     text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name text;
CREATE INDEX IF NOT EXISTS auth_device_user_idx ON auth_device (user_id, last_seen_at DESC);
