-- ================================================
-- CLEAN SLATE FIX: Layer 3 and Layer 4 Questions
-- ================================================
-- This migration:
-- 1. Deletes all test user quiz data (clears FK constraints)
-- 2. Deletes incorrect Layer 3 & 4 questions
-- 3. Re-inserts correct questions with proper numbering
-- 
-- Target state:
--   Layer 3: Q17-Q22 (6 questions)
--   Layer 4: Q23-Q27 (5 questions)
-- ================================================

-- ================================================
-- PART 1: Clear all test user quiz data
-- ================================================

-- Delete user quiz progress (clears FK to quiz_options)
DELETE FROM user_quiz_progress;

-- Delete quiz sessions
DELETE FROM quiz_sessions;

-- Delete quiz results
DELETE FROM user_quiz_results;

-- Delete EDNA profiles (optional - keeps user accounts but clears quiz data)
DELETE FROM edna_profiles;

SELECT 'Test data cleared successfully' as status;

-- ================================================
-- PART 2: Delete incorrect Layer 3 & 4 questions
-- ================================================

-- Delete options first (FK constraint)
DELETE FROM quiz_options 
WHERE question_id IN (
  SELECT id FROM quiz_questions WHERE layer_number IN (3, 4)
);

-- Delete questions
DELETE FROM quiz_questions WHERE layer_number IN (3, 4);

SELECT 'Old Layer 3 & 4 questions deleted' as status;

-- ================================================
-- PART 3: Insert correct Layer 3 questions (Q17-Q22)
-- ================================================

-- Q17
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (3, 'Q17', 'When I work with someone who decides very differently from me (more structure-led or more meaning-led), I usually feel:', 'mirror', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Frustrated or misunderstood — we clash often.', '→ Low integration', 'low'
FROM quiz_questions WHERE question_number = 'Q17' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Mixed — sometimes we clash, sometimes we work well.', '→ Moderate integration', 'moderate'
FROM quiz_questions WHERE question_number = 'Q17' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'Challenged in a useful way — they help me see things I would miss.', '→ High integration', 'high'
FROM quiz_questions WHERE question_number = 'Q17' AND layer_number = 3;

-- Q18
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (3, 'Q18', 'When someone I disagree with brings a completely different view, I mostly use it to…', 'mirror', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Defend my own view more strongly', '→ Low integration', 'low'
FROM quiz_questions WHERE question_number = 'Q18' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Think about it later, but I rarely change my approach', '→ Moderate integration', 'moderate'
FROM quiz_questions WHERE question_number = 'Q18' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'Actively adjust my decision if their view reveals something I missed', '→ High integration', 'high'
FROM quiz_questions WHERE question_number = 'Q18' AND layer_number = 3;

-- Q19
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (3, 'Q19', 'In group decisions with strong personalities who think differently to me, I usually…', 'mirror', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Push for my way and feel stressed when they don''t ''get it''', '→ Low integration', 'low'
FROM quiz_questions WHERE question_number = 'Q19' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Try to compromise, but it''s often a tug-of-war', '→ Moderate integration', 'moderate'
FROM quiz_questions WHERE question_number = 'Q19' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'Listen for the value in each style and combine them into a better decision', '→ High integration', 'high'
FROM quiz_questions WHERE question_number = 'Q19' AND layer_number = 3;

-- Q20
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (3, 'Q20', 'When I realise someone approaches decisions very differently from me (more structure-led or more meaning-led), I usually:', 'mirror', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Struggle to understand how they think or how to work with them', '→ Low integration', 'low'
FROM quiz_questions WHERE question_number = 'Q20' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Get the general idea, but their way of thinking still confuses me sometimes', '→ Moderate integration', 'moderate'
FROM quiz_questions WHERE question_number = 'Q20' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'Understand how they think and can adjust how I work with them easily', '→ High integration', 'high'
FROM quiz_questions WHERE question_number = 'Q20' AND layer_number = 3;

-- Q21
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (3, 'Q21', 'Looking at the last few projects where I worked with people who think differently from me, the results were mostly:', 'mirror', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Messy or draining — it didn''t go smoothly', '→ Low integration', 'low'
FROM quiz_questions WHERE question_number = 'Q21' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Mixed — some wins, some unnecessary friction', '→ Moderate integration', 'moderate'
FROM quiz_questions WHERE question_number = 'Q21' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'Strong — the mix of styles made the outcome better', '→ High integration', 'high'
FROM quiz_questions WHERE question_number = 'Q21' AND layer_number = 3;

-- Q22
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (3, 'Q22', 'When someone uses a way of deciding that''s very different from mine, my first inner reaction is usually:', 'mirror', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'They''re wrong or unrealistic.', '→ Low integration', 'low'
FROM quiz_questions WHERE question_number = 'Q22' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'I don''t fully get them yet, but I''m curious.', '→ Moderate integration', 'moderate'
FROM quiz_questions WHERE question_number = 'Q22' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'Good — this might show me something I can''t see.', '→ High integration', 'high'
FROM quiz_questions WHERE question_number = 'Q22' AND layer_number = 3;

SELECT 'Layer 3 questions (Q17-Q22) inserted successfully' as status;

-- ================================================
-- PART 4: Insert correct Layer 4 questions (Q23-Q27)
-- ================================================

-- Q23
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (4, 'Q23', 'When something new is being explained, I understand it fastest when it''s presented as:', 'learning', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'A visual example (diagram, sketch, chart, images)', '→ Visual', 'visual'
FROM quiz_questions WHERE question_number = 'Q23' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'A conversation or explanation I can listen to', '→ Auditory', 'auditory'
FROM quiz_questions WHERE question_number = 'Q23' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'Written instructions or notes I can read', '→ Read/Write', 'read_write'
FROM quiz_questions WHERE question_number = 'Q23' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'Something I can try, test, or explore hands on', '→ Kinesthetic', 'kinesthetic'
FROM quiz_questions WHERE question_number = 'Q23' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'E', 'A mix of formats — I learn well several different formats', '→ Multimodal', 'multimodal'
FROM quiz_questions WHERE question_number = 'Q23' AND layer_number = 4;

-- Q24
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (4, 'Q24', 'When I''m learning something new, I make sense of it best when:', 'learning', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'It''s explained in a clear step-by-step order', '→ Sequential', 'sequential'
FROM quiz_questions WHERE question_number = 'Q24' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'I see the whole concept first, then connect the pieces myself', '→ Global', 'global'
FROM quiz_questions WHERE question_number = 'Q24' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'I can switch between steps and big-picture depending on the situation', '→ Flexible', 'flexible'
FROM quiz_questions WHERE question_number = 'Q24' AND layer_number = 4;

-- Q25
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (4, 'Q25', 'I understand new ideas better when they''re shown through:', 'learning', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Real examples, demonstrations, or practical use cases', '→ Concrete', 'concrete'
FROM quiz_questions WHERE question_number = 'Q25' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Core principles, patterns, or the big underlying idea', '→ Abstract', 'abstract'
FROM quiz_questions WHERE question_number = 'Q25' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'A mix of both depending on what I''m learning', '→ Balanced', 'balanced'
FROM quiz_questions WHERE question_number = 'Q25' AND layer_number = 4;

-- Q26
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (4, 'Q26', 'I learn and work best when I''m:', 'learning', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'On my own, in my own space, with minimal interruption', '→ Solo', 'solo'
FROM quiz_questions WHERE question_number = 'Q26' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Around others — discussing, exchanging ideas, or collaborating', '→ Collaborative', 'collaborative'
FROM quiz_questions WHERE question_number = 'Q26' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'Mix of Both - Switching between solo and group environments depending on the task or mood', '→ Adaptive', 'adaptive'
FROM quiz_questions WHERE question_number = 'Q26' AND layer_number = 4;

-- Q27
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (4, 'Q27', 'When learning something new, my natural pace is:', 'learning', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'I pick up things quickly, get the overview, and refine later', '→ Fast', 'fast'
FROM quiz_questions WHERE question_number = 'Q27' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'I prefer a slower, consistent pace to absorb things properly and accurately', '→ Steady', 'steady'
FROM quiz_questions WHERE question_number = 'Q27' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'Sometimes fast, sometimes steady, depending on complexity', '→ Variable', 'variable'
FROM quiz_questions WHERE question_number = 'Q27' AND layer_number = 4;

SELECT 'Layer 4 questions (Q23-Q27) inserted successfully' as status;

-- ================================================
-- PART 5: Verify the final state
-- ================================================

SELECT 'Final verification' as status;

SELECT layer_number, COUNT(*) as count 
FROM quiz_questions 
GROUP BY layer_number
ORDER BY layer_number;

SELECT 'Layer 3 questions (Q17-Q22)' as info;
SELECT question_number, LEFT(question_text, 60) as preview
FROM quiz_questions 
WHERE layer_number = 3 
ORDER BY question_number;

SELECT 'Layer 4 questions (Q23-Q27)' as info;
SELECT question_number, LEFT(question_text, 60) as preview
FROM quiz_questions 
WHERE layer_number = 4 
ORDER BY question_number;

-- Expected results:
-- Layer 1: 8 questions
-- Layer 2: 24 questions
-- Layer 3: 6 questions (Q17-Q22)
-- Layer 4: 5 questions (Q23-Q27)
-- Layer 5: 6 questions
-- Layer 6: 7 questions
-- Layer 7: 7 questions
-- TOTAL: 63 questions
