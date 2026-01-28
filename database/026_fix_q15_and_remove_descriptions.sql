-- ============================================================================
-- Migration: 026_fix_q15_and_remove_descriptions.sql
-- Purpose: Fix Layer 2 Q15 question text and remove descriptions from Layers 3-7
-- Date: 2026-01-15
-- 
-- CRITICAL ISSUES FIXED:
-- - Layer 2 Q15: Fix question text from "When communicating what I'm good at..." 
--   to "The thing that slows me down the most is:"
-- - Layers 3-7: Remove all option_description values (set to NULL) as source 
--   document does not include descriptions for these layers
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: DELETE USER TEST DATA (CLEAN SLATE FOR TESTING)
-- ============================================================================

DELETE FROM user_quiz_progress;
DELETE FROM user_quiz_results;

SELECT 'User data cleared' as status, 
       (SELECT COUNT(*) FROM user_quiz_progress) as progress_count,
       (SELECT COUNT(*) FROM user_quiz_results) as results_count;

-- ============================================================================
-- STEP 2: FIX LAYER 2 Q15 QUESTION TEXT (ALL ARCHETYPES)
-- ============================================================================

-- Fix Q15 (Architect version)
UPDATE quiz_questions 
SET question_text = 'The thing that slows me down the most is:'
WHERE question_number = 'Q15' AND layer_number = 2 AND archetype_filter = 'Architect';

-- Fix Q15a (Alchemist version)
UPDATE quiz_questions 
SET question_text = 'The thing that slows me down the most is:'
WHERE question_number = 'Q15a' AND layer_number = 2 AND archetype_filter = 'Alchemist';

-- Fix Q15m (Mixed version)
UPDATE quiz_questions 
SET question_text = 'The thing that slows me down the most is:'
WHERE question_number = 'Q15m' AND layer_number = 2 AND archetype_filter = 'Mixed';

-- Verify Q15 fix
SELECT 'Q15 Fixed' as verification, question_number, archetype_filter, question_text
FROM quiz_questions 
WHERE question_number IN ('Q15', 'Q15a', 'Q15m')
ORDER BY question_number;

-- ============================================================================
-- STEP 3: REMOVE DESCRIPTIONS FROM LAYERS 3-7 OPTIONS
-- Source document does not include option descriptions for these layers
-- ============================================================================

-- Remove descriptions from Layer 3 options
UPDATE quiz_options 
SET option_description = NULL
WHERE question_id IN (SELECT id FROM quiz_questions WHERE layer_number = 3);

-- Remove descriptions from Layer 4 options
UPDATE quiz_options 
SET option_description = NULL
WHERE question_id IN (SELECT id FROM quiz_questions WHERE layer_number = 4);

-- Remove descriptions from Layer 5 options
UPDATE quiz_options 
SET option_description = NULL
WHERE question_id IN (SELECT id FROM quiz_questions WHERE layer_number = 5);

-- Remove descriptions from Layer 6 options
UPDATE quiz_options 
SET option_description = NULL
WHERE question_id IN (SELECT id FROM quiz_questions WHERE layer_number = 6);

-- Remove descriptions from Layer 7 options
UPDATE quiz_options 
SET option_description = NULL
WHERE question_id IN (SELECT id FROM quiz_questions WHERE layer_number = 7);

-- ============================================================================
-- STEP 4: VERIFICATION QUERIES
-- ============================================================================

SELECT 'User Data Status' as verification, 
       (SELECT COUNT(*) FROM user_quiz_progress) as progress_count,
       (SELECT COUNT(*) FROM user_quiz_results) as results_count;

SELECT 'Layer 2 Q15 Fixed' as verification, question_number, archetype_filter, question_text
FROM quiz_questions 
WHERE question_number IN ('Q15', 'Q15a', 'Q15m')
ORDER BY question_number, archetype_filter;

-- Verify descriptions removed from Layer 3
SELECT 'Layer 3 Descriptions Removed' as verification,
       q.question_number,
       COUNT(o.id) as total_options,
       COUNT(o.option_description) as options_with_description
FROM quiz_questions q
JOIN quiz_options o ON q.id = o.question_id
WHERE q.layer_number = 3
GROUP BY q.question_number
ORDER BY q.question_number;

-- Verify descriptions removed from Layer 4
SELECT 'Layer 4 Descriptions Removed' as verification,
       q.question_number,
       COUNT(o.id) as total_options,
       COUNT(o.option_description) as options_with_description
FROM quiz_questions q
JOIN quiz_options o ON q.id = o.question_id
WHERE q.layer_number = 4
GROUP BY q.question_number
ORDER BY q.question_number;

-- Verify descriptions removed from Layer 5
SELECT 'Layer 5 Descriptions Removed' as verification,
       q.question_number,
       COUNT(o.id) as total_options,
       COUNT(o.option_description) as options_with_description
FROM quiz_questions q
JOIN quiz_options o ON q.id = o.question_id
WHERE q.layer_number = 5
GROUP BY q.question_number
ORDER BY q.question_number;

-- Verify descriptions removed from Layer 6
SELECT 'Layer 6 Descriptions Removed' as verification,
       q.question_number,
       COUNT(o.id) as total_options,
       COUNT(o.option_description) as options_with_description
FROM quiz_questions q
JOIN quiz_options o ON q.id = o.question_id
WHERE q.layer_number = 6
GROUP BY q.question_number
ORDER BY q.question_number;

-- Verify descriptions removed from Layer 7
SELECT 'Layer 7 Descriptions Removed' as verification,
       q.question_number,
       COUNT(o.id) as total_options,
       COUNT(o.option_description) as options_with_description
FROM quiz_questions q
JOIN quiz_options o ON q.id = o.question_id
WHERE q.layer_number = 7
GROUP BY q.question_number
ORDER BY q.question_number;

-- Summary: Check which layers still have descriptions
SELECT 'Description Summary' as verification,
       q.layer_number,
       COUNT(o.id) as total_options,
       COUNT(o.option_description) as options_with_description,
       COUNT(CASE WHEN o.option_description IS NULL THEN 1 END) as options_without_description
FROM quiz_questions q
JOIN quiz_options o ON q.id = o.question_id
GROUP BY q.layer_number
ORDER BY q.layer_number;

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
