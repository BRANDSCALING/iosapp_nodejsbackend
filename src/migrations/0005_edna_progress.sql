-- 0005: an unfinished E-DNA v2 assessment, one row per person (23 Nov 2026).
-- The browser keeps the working copy; this mirror makes the resume email's link work on
-- any device. The row is deleted the moment the finished result is stored.
CREATE TABLE IF NOT EXISTS edna_progress (
  user_id uuid PRIMARY KEY,
  snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
