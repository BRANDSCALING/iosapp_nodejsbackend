-- ================================================
-- Layer 1: Core Identity Questions (8 questions)
-- CORRECTED VERSION - Uses exact text from Questions.docx
-- ================================================

-- Clean up existing Layer 1 data (if any)
DELETE FROM quiz_options WHERE question_id IN (SELECT id FROM quiz_questions WHERE layer_number = 1);
DELETE FROM quiz_questions WHERE layer_number = 1;

-- ================================================
-- LAYER 1: CORE IDENTITY (8 Questions)
-- ================================================

-- Q1: Decision starting point
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (1, 'Q1', 'When I''m about to make an important decision, my natural starting point is:', 'core', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'I begin by clarifying the facts, structure, or logic. If it feels right after that, I validate it logically before deciding.', '→ (Decision loop activates —I begin with logic)', 'architect'
FROM quiz_questions WHERE question_number = 'Q1' AND layer_number = 1;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'I begin by tuning into what feels meaningful or aligned. If the logic supports it, I check the feeling again before deciding.', '→ (Decision loop activates —I begin with emotion)', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q1' AND layer_number = 1;

-- Q2: Final validator
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (1, 'Q2', 'I trust a decision the most when the final check is based on:', 'core', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Whether the logic still holds up clearly. Even if the feeling isn''t fully there yet,If I can test and prove it logically, I''ll move forward.', '→ Logic as final validator', 'architect'
FROM quiz_questions WHERE question_number = 'Q2' AND layer_number = 1;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Whether the feeling still feels aligned and true. Even if the logic isn''t perfect yet. If it still feels right to me, I''ll trust the decision', '→ Emotion as final validator', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q2' AND layer_number = 1;

-- Q3: Finding clarity
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (1, 'Q3', 'When something is unclear or uncertain, my natural way of finding clarity is to start by checking:', 'core', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Whether the structure or facts make sense first. I anchor in logic, then check how it feels, and confirm the logic again before deciding.', 'Pattern:(Logic → Emotion → Logic)', 'architect'
FROM quiz_questions WHERE question_number = 'Q3' AND layer_number = 1;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Whether something feels off or right first. I anchor in feeling, then look for logic to support it, and return to the feeling before deciding.', 'Pattern:(Emotion → Logic → Emotion)', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q3' AND layer_number = 1;

-- Q4: Under pressure
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (1, 'Q4', 'Under time pressure or stress, to ensure delivery I tend to:', 'core', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'I check whether the plan or steps still make logical sense. I stabilise the structure first, sense how it feels, and commit once the logic holds.', 'Pattern: (Logic → Emotion → Logic)', 'architect'
FROM quiz_questions WHERE question_number = 'Q4' AND layer_number = 1;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'I check whether the situation still feels aligned. I notice the feeling first, look at the logic next, and commit once the emotional signal is steady.', 'Pattern: (Emotion → Logic → Emotion)', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q4' AND layer_number = 1;

-- Q5: Regret
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (1, 'Q5', 'When I regret a decision, it''s usually because:', 'core', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'I relied too heavily on my emotions causing me to ignore the logical signs and i went with my feelings.', '(my regret — logic was ignored)', 'architect'
FROM quiz_questions WHERE question_number = 'Q5' AND layer_number = 1;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'I relied too heavily on logic and didn''t listen to the feeling or intuition and i went with facts or data.', '(my regret — feelings were ignored)', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q5' AND layer_number = 1;

-- Q6: Explaining decisions
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (1, 'Q6', 'When someone asks me to explain a decision , my usual response or explanation sounds like:', 'core', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'I show the structure — the reasoning & logic, then explain the thoughts and emotion that supported the logic and why it still made sense after I checked how I felt.', '→ Process: (logic-led explanation)', 'architect'
FROM quiz_questions WHERE question_number = 'Q6' AND layer_number = 1;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'I describe what felt right — the alignment & energy , then describe the emotion  and logic that supported that feeling, why it still felt right  after I checked the logic.', '→ Process: (feeling-led explanation)', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q6' AND layer_number = 1;

-- Q7: Final check before commit
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (1, 'Q7', 'Right before I commit to a decision, the last thing I check is:', 'core', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Whether the logic still holds — I double-check the reasoning, structure, or assumptions after noticing how it feels.', '→ (logic as final validator)', 'architect'
FROM quiz_questions WHERE question_number = 'Q7' AND layer_number = 1;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Whether it still feels right — I recheck the emotional signal or intuition after reviewing the logic.', '→ (emotion as final validator)', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q7' AND layer_number = 1;

-- Q8: When challenged
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (1, 'Q8', 'When someone challenges my decision strongly, I naturally check:', 'core', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'If my reasoning still stands - Did I miss an assumption or key piece of data — and does it still make logical sense after noticing how I feel about it?', 'Recheck decison loop - logic - emotion -logic', 'architect'
FROM quiz_questions WHERE question_number = 'Q8' AND layer_number = 1;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'If my feelings still hold - "Am I ignoring something I can feel but haven''t been able to explain — and does the logic still support that feeling?"', 'Recheck decison loop - emotion -logic- emotion', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q8' AND layer_number = 1;

-- ================================================
-- VERIFICATION QUERY
-- ================================================
SELECT 
    q.question_number,
    LEFT(q.question_text, 60) as question_preview,
    o.option_key,
    LEFT(o.option_text, 60) as option_preview,
    o.score_type
FROM quiz_questions q
JOIN quiz_options o ON q.id = o.question_id
WHERE q.layer_number = 1
ORDER BY q.question_number, o.option_key;


-- -- ================================================
-- -- UPDATE LAYER 1 QUESTIONS WITH CORRECT CONTENT
-- -- Source: Questions.docx
-- -- Date: January 9, 2026
-- -- ================================================

-- -- Q1
-- UPDATE quiz_questions
-- SET question_text = 'When I''m about to make an important decision, my natural starting point is:'
-- WHERE question_number = 'Q1' AND layer_number = 1;

-- UPDATE quiz_options
-- SET 
--     option_text = 'I begin by clarifying the facts, structure, or logic. If it feels right after that, I validate it logically before deciding.',
--     option_description = '(Decision loop activates —I begin with logic)'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q1' AND layer_number = 1)
-- AND option_key = 'A';

-- UPDATE quiz_options
-- SET 
--     option_text = 'I begin by tuning into what feels meaningful or aligned. If the logic supports it, I check the feeling again before deciding.',
--     option_description = '(Decision loop activates —I begin with emotion)'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q1' AND layer_number = 1)
-- AND option_key = 'B';

-- -- Q2
-- UPDATE quiz_questions
-- SET question_text = 'I trust a decision the most when the final check is based on:'
-- WHERE question_number = 'Q2' AND layer_number = 1;

-- UPDATE quiz_options
-- SET 
--     option_text = 'Whether the logic still holds up clearly. Even if the feeling isn''t fully there yet, if I can test and prove it logically, I''ll move forward.',
--     option_description = '→ Logic as final validator'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q2' AND layer_number = 1)
-- AND option_key = 'A';

-- UPDATE quiz_options
-- SET 
--     option_text = 'Whether the feeling still feels aligned and true. Even if the logic isn''t perfect yet, if it still feels right to me, I''ll trust the decision.',
--     option_description = '→ Emotion as final validator'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q2' AND layer_number = 1)
-- AND option_key = 'B';

-- -- Q3
-- UPDATE quiz_questions
-- SET question_text = 'When something is unclear or uncertain, my natural way of finding clarity is to start by checking:'
-- WHERE question_number = 'Q3' AND layer_number = 1;

-- UPDATE quiz_options
-- SET 
--     option_text = 'Whether the structure or facts make sense first. I anchor in logic, then check how it feels, and confirm by re-validating the logic.',
--     option_description = 'Pattern:(Logic → Emotion → Logic)'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q3' AND layer_number = 1)
-- AND option_key = 'A';

-- UPDATE quiz_options
-- SET 
--     option_text = 'Whether something feels off or right first. I anchor in feeling, then look for logic to support it, and confirm by rechecking the feeling.',
--     option_description = 'Pattern:(Emotion → Logic → Emotion)'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q3' AND layer_number = 1)
-- AND option_key = 'B';

-- -- Q4
-- UPDATE quiz_questions
-- SET question_text = 'Under time pressure or stress, to ensure delivery I tend to:'
-- WHERE question_number = 'Q4' AND layer_number = 1;

-- UPDATE quiz_options
-- SET 
--     option_text = 'I check whether the plan or steps still make logical sense. I stabilise the structure first, sense how it feels, and commit once the logic holds.',
--     option_description = 'Pattern: (Logic → Emotion → Logic)'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q4' AND layer_number = 1)
-- AND option_key = 'A';

-- UPDATE quiz_options
-- SET 
--     option_text = 'I check whether the situation still feels aligned. I notice the feeling first, look at the logic next, and commit once the emotional signal is steady.',
--     option_description = 'Pattern: (Emotion → Logic → Emotion)'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q4' AND layer_number = 1)
-- AND option_key = 'B';

-- -- Q5
-- UPDATE quiz_questions
-- SET question_text = 'When I regret a decision, it''s usually because:'
-- WHERE question_number = 'Q5' AND layer_number = 1;

-- UPDATE quiz_options
-- SET 
--     option_text = 'I relied too heavily on my emotions causing me to ignore the logical signs and I went with my feeling even when the logic didn''t fully support it.',
--     option_description = '(my regret — logic was ignored)'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q5' AND layer_number = 1)
-- AND option_key = 'A';

-- UPDATE quiz_options
-- SET 
--     option_text = 'I relied too heavily on logic and didn''t listen to the feeling or intuition and I went with facts or reasoning even when it didn''t feel right.',
--     option_description = '(my regret — feelings were ignored)'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q5' AND layer_number = 1)
-- AND option_key = 'B';

-- -- Q6
-- UPDATE quiz_questions
-- SET question_text = 'When someone asks me to explain a decision, my usual response or explanation sounds like:'
-- WHERE question_number = 'Q6' AND layer_number = 1;

-- UPDATE quiz_options
-- SET 
--     option_text = 'I show the structure — the reasoning & logic, then explain the thoughts and emotion that supported the logic and why it still made sense after I checked how I felt.',
--     option_description = '→ Process: (logic-led explanation)'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q6' AND layer_number = 1)
-- AND option_key = 'A';

-- UPDATE quiz_options
-- SET 
--     option_text = 'I describe what felt right — the alignment & energy, then describe the emotion and logic that supported that feeling, why it still felt right after I checked the logic.',
--     option_description = '→ Process: (feeling-led explanation)'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q6' AND layer_number = 1)
-- AND option_key = 'B';

-- -- Q7
-- UPDATE quiz_questions
-- SET question_text = 'Right before I commit to a decision, the last thing I check is:'
-- WHERE question_number = 'Q7' AND layer_number = 1;

-- UPDATE quiz_options
-- SET 
--     option_text = 'Whether the logic still holds — I double-check the reasoning, structure, or assumptions after noticing how it feels.',
--     option_description = '→ Final check: Logic'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q7' AND layer_number = 1)
-- AND option_key = 'A';

-- UPDATE quiz_options
-- SET 
--     option_text = 'Whether it still feels right — I recheck the emotional signal or intuition after reviewing the logic.',
--     option_description = '→ Final check: Emotion'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q7' AND layer_number = 1)
-- AND option_key = 'B';

-- -- Q8
-- UPDATE quiz_questions
-- SET question_text = 'When someone challenges my decision strongly, I naturally check:'
-- WHERE question_number = 'Q8' AND layer_number = 1;

-- UPDATE quiz_options
-- SET 
--     option_text = 'Whether my reasoning or logic still holds. I revisit the structure first, notice how it feels, and reconfirm the logic before responding.',
--     option_description = '→ Check: Logic → Emotion → Logic'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q8' AND layer_number = 1)
-- AND option_key = 'A';

-- UPDATE quiz_options
-- SET 
--     option_text = 'Whether it still feels right to me. I check my feeling first, review the logic next, and reconfirm the feeling before responding.',
--     option_description = '→ Check: Emotion → Logic → Emotion'
-- WHERE question_id = (SELECT id FROM quiz_questions WHERE question_number = 'Q8' AND layer_number = 1)
-- AND option_key = 'B';

-- -- ================================================
-- -- VERIFICATION QUERY
-- -- ================================================
-- SELECT 
--     q.question_number,
--     LEFT(q.question_text, 60) as question_preview,
--     o.option_key,
--     LEFT(o.option_text, 60) as option_preview,
--     LEFT(o.option_description, 40) as description_preview
-- FROM quiz_questions q
-- JOIN quiz_options o ON q.id = o.question_id
-- WHERE q.layer_number = 1
-- ORDER BY q.question_number, o.option_key;




-- -- ============================================
-- -- Layer 1: Core Identity Questions (8 questions)
-- -- SCHEMA FIXED VERSION - Matches Layer 2 structure
-- -- ============================================

-- -- Clean up existing Layer 1 data (if any)
-- DELETE FROM quiz_options WHERE question_id IN (SELECT id FROM quiz_questions WHERE layer_number = 1);
-- DELETE FROM quiz_questions WHERE layer_number = 1;

-- -- ============================================
-- -- LAYER 1: CORE IDENTITY (8 Questions)
-- -- ============================================

-- -- Q1: When I'm about to make an important decision, I usually:
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (1, 'Q1', 'When I''m about to make an important decision, I usually:', 'core_identity', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'I begin by clarifying the facts, weighing pros and cons, and thinking through the logical outcomes.', 'Logical decision-maker', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q1' AND layer_number = 1;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'I trust my intuition and let my vision guide me toward what feels right.', 'Intuitive decision-maker', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q1' AND layer_number = 1;

-- -- Q2: When I think about my brand or business, I feel most energized by:
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (1, 'Q2', 'When I think about my brand or business, I feel most energized by:', 'core_identity', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Building systems, structures, and strategies that create lasting impact.', 'Systems builder', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q2' AND layer_number = 1;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Bringing transformative ideas to life and inspiring others to see new possibilities.', 'Transformative innovator', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q2' AND layer_number = 1;

-- -- Q3: If someone asked me to describe my approach to problem-solving, I'd say:
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (1, 'Q3', 'If someone asked me to describe my approach to problem-solving, I''d say:', 'core_identity', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'I analyze the situation, break it down into steps, and create a clear plan.', 'Analytical problem-solver', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q3' AND layer_number = 1;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'I explore creative solutions, experiment with ideas, and trust the process to unfold.', 'Creative problem-solver', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q3' AND layer_number = 1;

-- -- Q4: When I communicate with my audience or clients, I tend to:
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (1, 'Q4', 'When I communicate with my audience or clients, I tend to:', 'core_identity', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Focus on clarity, data, and actionable insights.', 'Data-focused communicator', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q4' AND layer_number = 1;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Inspire them with stories, emotions, and a compelling vision.', 'Inspirational communicator', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q4' AND layer_number = 1;

-- -- Q5: My ideal work environment is one where:
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (1, 'Q5', 'My ideal work environment is one where:', 'core_identity', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'There are clear goals, organized processes, and measurable outcomes.', 'Structured environment', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q5' AND layer_number = 1;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'There is freedom to explore, create, and push boundaries.', 'Creative environment', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q5' AND layer_number = 1;

-- -- Q6: When I look at successful brands or leaders, I'm most drawn to those who:
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (1, 'Q6', 'When I look at successful brands or leaders, I''m most drawn to those who:', 'core_identity', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Have built scalable systems, strong frameworks, and sustainable growth.', 'Systems-focused admiration', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q6' AND layer_number = 1;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Have disrupted industries, challenged norms, and redefined what is possible.', 'Innovation-focused admiration', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q6' AND layer_number = 1;

-- -- Q7: If I had to choose between these two strengths, I'd say I'm better at:
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (1, 'Q7', 'If I had to choose between these two strengths, I''d say I''m better at:', 'core_identity', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Planning, organizing, and executing strategies with precision.', 'Execution strength', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q7' AND layer_number = 1;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Innovating, inspiring, and creating breakthroughs.', 'Innovation strength', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q7' AND layer_number = 1;

-- -- Q8: When I think about the legacy I want to leave, I imagine:
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (1, 'Q8', 'When I think about the legacy I want to leave, I imagine:', 'core_identity', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'A well-built foundation, a reliable system, or a lasting structure.', 'Structural legacy', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q8' AND layer_number = 1;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'A spark of transformation, a movement, or a shift in how people think.', 'Transformational legacy', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q8' AND layer_number = 1;

-- -- Verification queries
-- SELECT 
--     'Layer 1 Questions:' as info,
--     COUNT(*) as count
-- FROM quiz_questions
-- WHERE layer_number = 1;

-- SELECT 
--     'Layer 1 Options:' as info,
--     COUNT(*) as count
-- FROM quiz_options qo
-- JOIN quiz_questions qq ON qo.question_id = qq.id
-- WHERE qq.layer_number = 1;

-- -- Display sample data
-- SELECT 
--     qq.question_number,
--     qq.question_text,
--     qo.option_key,
--     qo.option_text,
--     qo.score_type
-- FROM quiz_questions qq
-- JOIN quiz_options qo ON qq.id = qo.question_id
-- WHERE qq.layer_number = 1
-- ORDER BY qq.question_number, qo.option_key;