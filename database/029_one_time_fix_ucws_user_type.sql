-- ============================================
-- ONE-TIME FIX: Set user_type = 'ucws' for admin-created users
-- File: 029_one_time_fix_ucws_user_type.sql
-- ============================================
--
-- DO NOT EXECUTE THIS FILE AUTOMATICALLY.
-- Run manually after reviewing. To see the exact SQL in the console, run:
--   node scripts/print-ucws-fix-sql.js
--
-- Purpose: Users created by the admin portal (UCWS) were not previously
--          stamped with user_type = 'ucws'. This migration sets user_type = 'ucws'
--          for existing users who have no quiz sessions (iOS users take the quiz;
--          admin-created UCWS users typically do not).
--
-- Condition: (user_type IS NULL OR user_type != 'brandscaling')
--            AND no row in quiz_sessions for this user.
--
-- Safe comparison: quiz_sessions.user_id may be VARCHAR(255) or UUID depending
-- on schema; using ::text on both sides works in all cases.
-- ============================================

-- PREVIEW: Run this first to see which users would be updated (no writes).
/*
SELECT id, email, name, user_type, created_at
FROM users u
WHERE (u.user_type IS NULL OR u.user_type != 'brandscaling')
  AND NOT EXISTS (
    SELECT 1 FROM quiz_sessions q
    WHERE q.user_id::text = u.id::text
  )
ORDER BY u.created_at DESC;
*/

-- ONE-TIME UPDATE: Run manually after review (or use output from scripts/print-ucws-fix-sql.js).
/*
UPDATE users u
SET user_type = 'ucws',
    updated_at = NOW()
WHERE (u.user_type IS NULL OR u.user_type != 'brandscaling')
  AND NOT EXISTS (
    SELECT 1 FROM quiz_sessions q
    WHERE q.user_id::text = u.id::text
  );
*/

-- Optional: verify count after running the UPDATE.
-- SELECT COUNT(*) AS updated_to_ucws FROM users WHERE user_type = 'ucws';
