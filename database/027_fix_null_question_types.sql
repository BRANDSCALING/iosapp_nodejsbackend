-- Migration: 027_fix_null_question_types.sql
-- Purpose: Fix NULL question_type values causing iOS decoding errors
-- Issue: Layers 5, 6, 7 questions have NULL question_type, causing API response decoding to fail
--

BEGIN;

-- ============================================
-- DIAGNOSTIC: Check current state
-- ============================================

\echo ''
\echo '=========================================='
\echo 'BEFORE FIX: Checking NULL question_types'
\echo '=========================================='

SELECT 
    layer_number,
    COUNT(*) as total_questions,
    COUNT(question_type) as with_type,
    COUNT(*) - COUNT(question_type) as null_type
FROM quiz_questions
WHERE layer_number IN (5, 6, 7)
GROUP BY layer_number
ORDER BY layer_number;

-- ============================================
-- FIX: Set question_type for all NULL values
-- ============================================

\echo ''
\echo '=========================================='
\echo 'FIXING: Setting question_type to single-choice'
\echo '=========================================='

-- Layer 5: Neurodivergence Assessment (Q28-Q33)
-- All are single-choice questions
UPDATE quiz_questions
SET question_type = 'single-choice'
WHERE layer_number = 5
  AND question_type IS NULL;

-- Layer 6: Mindset & Personality (Q34-Q39)
-- All are single-choice questions
UPDATE quiz_questions
SET question_type = 'single-choice'
WHERE layer_number = 6
  AND question_type IS NULL;

-- Layer 7: Values & Beliefs (Q40-Q45)
-- All are single-choice questions
UPDATE quiz_questions
SET question_type = 'single-choice'
WHERE layer_number = 7
  AND question_type IS NULL;

-- ============================================
-- VERIFICATION: Confirm all fixed
-- ============================================

\echo ''
\echo '=========================================='
\echo 'AFTER FIX: Verifying question_types'
\echo '=========================================='

SELECT 
    layer_number,
    COUNT(*) as total_questions,
    COUNT(question_type) as with_type,
    COUNT(*) - COUNT(question_type) as null_type
FROM quiz_questions
WHERE layer_number IN (5, 6, 7)
GROUP BY layer_number
ORDER BY layer_number;

\echo ''
\echo '=========================================='
\echo 'DETAILED VIEW: Layer 5, 6, 7 Questions'
\echo '=========================================='

SELECT 
    layer_number,
    question_number,
    LEFT(question_text, 60) as question_preview,
    question_type
FROM quiz_questions
WHERE layer_number IN (5, 6, 7)
ORDER BY layer_number, question_number;

-- ============================================
-- ALSO CHECK: Layers 1-4 for consistency
-- ============================================

\echo ''
\echo '=========================================='
\echo 'CONSISTENCY CHECK: All Layers'
\echo '=========================================='

SELECT 
    layer_number,
    COUNT(*) as total_questions,
    COUNT(question_type) as with_type,
    COUNT(*) - COUNT(question_type) as null_type
FROM quiz_questions
GROUP BY layer_number
ORDER BY layer_number;

COMMIT;

\echo ''
\echo '=========================================='
\echo '✅ MIGRATION COMPLETE'
\echo '=========================================='
\echo 'All Layer 5, 6, 7 questions now have question_type = single-choice'
\echo 'iOS app should now be able to decode API responses correctly'
\echo ''
