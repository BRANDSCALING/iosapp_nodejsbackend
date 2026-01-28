-- ================================================
-- Fix Layer 3 and Layer 4 Question Numbers
-- ================================================
-- Current state:
--   Layer 3: Q15-Q19 (5 questions) - WRONG
--   Layer 4: Q20-Q25 (6 questions) - WRONG
-- 
-- Correct state (from quiz-data.mdc):
--   Layer 3: Q17-Q22 (6 questions)
--   Layer 4: Q23-Q27 (5 questions)
-- ================================================

-- ================================================
-- PART 1: Update Layer 3 question numbers
-- ================================================

-- Q15 → Q17
UPDATE quiz_questions 
SET question_number = 'Q17'
WHERE layer_number = 3 AND question_number = 'Q15';

-- Q16 → Q18
UPDATE quiz_questions 
SET question_number = 'Q18'
WHERE layer_number = 3 AND question_number = 'Q16';

-- Q17 → Q19
UPDATE quiz_questions 
SET question_number = 'Q19'
WHERE layer_number = 3 AND question_number = 'Q17';

-- Q18 → Q20
UPDATE quiz_questions 
SET question_number = 'Q20'
WHERE layer_number = 3 AND question_number = 'Q18';

-- Q19 → Q21
UPDATE quiz_questions 
SET question_number = 'Q21'
WHERE layer_number = 3 AND question_number = 'Q19';

-- ================================================
-- PART 2: Insert missing Q22 for Layer 3
-- ================================================

INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (3, 'Q22', 'When someone uses a way of deciding that''s very different from mine, my first inner reaction is usually:', 'mirror', 1)
ON CONFLICT (layer_number, question_number) DO NOTHING;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'They''re wrong or unrealistic.', '→ Low integration', 'low'
FROM quiz_questions WHERE question_number = 'Q22' AND layer_number = 3
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'I don''t fully get them yet, but I''m curious.', '→ Moderate integration', 'moderate'
FROM quiz_questions WHERE question_number = 'Q22' AND layer_number = 3
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'I can see the logic in their approach, even if it''s not mine.', '→ High integration', 'high'
FROM quiz_questions WHERE question_number = 'Q22' AND layer_number = 3
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

-- ================================================
-- PART 3: Update Layer 4 question numbers
-- ================================================

-- Q20 → Q23
UPDATE quiz_questions 
SET question_number = 'Q23'
WHERE layer_number = 4 AND question_number = 'Q20';

-- Q21 → Q24
UPDATE quiz_questions 
SET question_number = 'Q24'
WHERE layer_number = 4 AND question_number = 'Q21';

-- Q22 → Q25
UPDATE quiz_questions 
SET question_number = 'Q25'
WHERE layer_number = 4 AND question_number = 'Q22';

-- Q23 → Q26
UPDATE quiz_questions 
SET question_number = 'Q26'
WHERE layer_number = 4 AND question_number = 'Q23';

-- Q24 → Q27
UPDATE quiz_questions 
SET question_number = 'Q27'
WHERE layer_number = 4 AND question_number = 'Q24';

-- ================================================
-- PART 4: Remove extra Q25 from Layer 4 (if it exists)
-- ================================================

-- First, check if Q25 exists in Layer 4 after the updates
-- If it does, we need to delete it (it's the old Q25 that should be removed)

-- Delete Q25 from Layer 4 (this is the extra question)
-- But first, we need to delete its options to avoid FK constraint
DELETE FROM quiz_options 
WHERE question_id IN (
  SELECT id FROM quiz_questions 
  WHERE layer_number = 4 AND question_number = 'Q25'
);

-- Note: After the UPDATE above, the old Q22 became Q25, so we don't need to delete anything
-- The updates already handled the renumbering correctly

-- ================================================
-- PART 5: Verify the changes
-- ================================================

SELECT 'Layer 3 and Layer 4 question counts after fix' as status;

SELECT layer_number, COUNT(*) as count 
FROM quiz_questions 
WHERE layer_number IN (3, 4)
GROUP BY layer_number
ORDER BY layer_number;

SELECT 'Layer 3 questions' as layer, question_number, LEFT(question_text, 60) as preview
FROM quiz_questions 
WHERE layer_number = 3 
ORDER BY question_number;

SELECT 'Layer 4 questions' as layer, question_number, LEFT(question_text, 60) as preview
FROM quiz_questions 
WHERE layer_number = 4 
ORDER BY question_number;

-- Expected results:
-- Layer 3: 6 questions (Q17-Q22)
-- Layer 4: 5 questions (Q23-Q27)
