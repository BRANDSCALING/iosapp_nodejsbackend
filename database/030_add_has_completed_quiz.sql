-- Add quiz completion flag to users for onboarding status
-- Run manually or via your migration process.

ALTER TABLE users ADD COLUMN IF NOT EXISTS has_completed_quiz BOOLEAN DEFAULT FALSE;
