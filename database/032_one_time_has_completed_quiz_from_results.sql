-- ============================================
-- ONE-TIME: Set has_completed_quiz = true for users who have quiz results
-- File: 032_one_time_has_completed_quiz_from_results.sql
-- ============================================
-- Run manually once. Safe to re-run (idempotent).
-- user_quiz_results.user_id may be VARCHAR or UUID; compare as text.

-- Preview: users that will be updated (optional)
-- SELECT u.id, u.email, u.has_completed_quiz
-- FROM users u
-- WHERE EXISTS (
--     SELECT 1 FROM user_quiz_results ur
--     WHERE ur.user_id::text = u.id::text
-- );

UPDATE users u
SET has_completed_quiz = true
WHERE EXISTS (
    SELECT 1
    FROM user_quiz_results ur
    WHERE ur.user_id::text = u.id::text
);
