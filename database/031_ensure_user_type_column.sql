-- Ensure user_type column exists on users (UCWS vs BrandScaling).
-- Safe to run: ADD COLUMN IF NOT EXISTS, default 'brandscaling'.

ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'brandscaling';
