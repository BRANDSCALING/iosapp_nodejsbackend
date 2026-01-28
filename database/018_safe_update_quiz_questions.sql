-- ================================================
-- SAFE Migration: Update Quiz Questions
-- ================================================
-- This migration:
-- 1. Updates existing questions with archetype_filter
-- 2. Inserts missing questions (Q15, Q16 for Layer 2)
-- 3. Fixes Layer 3 and Layer 4 counts
-- ================================================

-- ================================================
-- PART 1: Update Layer 2 existing questions with archetype_filter
-- ================================================

-- Update Architect questions (Q9-Q14)
UPDATE quiz_questions 
SET archetype_filter = 'Architect'
WHERE layer_number = 2 
  AND question_number IN ('Q9', 'Q10', 'Q11', 'Q12', 'Q13', 'Q14');

-- Update Alchemist questions (Q9a-Q14a)
UPDATE quiz_questions 
SET archetype_filter = 'Alchemist'
WHERE layer_number = 2 
  AND question_number IN ('Q9a', 'Q10a', 'Q11a', 'Q12a', 'Q13a', 'Q14a');

-- Update Mixed questions (Q9m-Q14m)
UPDATE quiz_questions 
SET archetype_filter = 'Mixed'
WHERE layer_number = 2 
  AND question_number IN ('Q9m', 'Q10m', 'Q11m', 'Q12m', 'Q13m', 'Q14m');

-- Verify archetype_filter was set
SELECT 'Layer 2 archetype_filter update complete' as status;
SELECT archetype_filter, COUNT(*) as count 
FROM quiz_questions 
WHERE layer_number = 2 
GROUP BY archetype_filter;

-- ================================================
-- PART 2: Insert missing Layer 2 questions (Q15, Q16)
-- ================================================

-- Q15 - Architect
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q15', 'The thing that slows me down the most is:', 'subtype', 1, 'Architect')
ON CONFLICT (layer_number, question_number) DO NOTHING;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'When the priorities keep shifting or the sequence of steps isn''t clear.', '→ Sequence Disruption — Plan-dependent execution', 'strategist'
FROM quiz_questions WHERE question_number = 'Q15' AND layer_number = 2 AND archetype_filter = 'Architect'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'When the workflow or process is unclear, inconsistent, or keeps breaking.', '→ Process Disruption — System-dependent execution', 'builder'
FROM quiz_questions WHERE question_number = 'Q15' AND layer_number = 2 AND archetype_filter = 'Architect'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'When I don''t have enough clarity, data, or validation to know what''s correct.', '→ Clarity Gap — Data-dependent execution', 'analyzer'
FROM quiz_questions WHERE question_number = 'Q15' AND layer_number = 2 AND archetype_filter = 'Architect'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'When the plan, the system, and the data don''t line up — everything feels out of sync.', '→ Structural Misalignment — Integrated execution', 'ultimate_architect'
FROM quiz_questions WHERE question_number = 'Q15' AND layer_number = 2 AND archetype_filter = 'Architect'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

-- Q16 - Architect
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q16', 'Before I finalise or approve a project, the thing I double-check most carefully is:', 'subtype', 1, 'Architect')
ON CONFLICT (layer_number, question_number) DO NOTHING;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'That the steps make logical sense — the sequence, order, and reasoning all hold up.', '→ Step Logic Check — Sequence-driven', 'strategist'
FROM quiz_questions WHERE question_number = 'Q16' AND layer_number = 2 AND archetype_filter = 'Architect'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'That the system or workflow can actually support the work — it won''t break once we start.', '→ System Capacity Check — Process-driven', 'builder'
FROM quiz_questions WHERE question_number = 'Q16' AND layer_number = 2 AND archetype_filter = 'Architect'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'That the data, details, or assumptions behind the decision are accurate and validated.', '→ Data Validity Check — Analysis-driven', 'analyzer'
FROM quiz_questions WHERE question_number = 'Q16' AND layer_number = 2 AND archetype_filter = 'Architect'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'That everything fits together — the plan, the process, and the data are all aligned and consistent.', '→ Full Alignment Check — Integrated / full-architecture', 'ultimate_architect'
FROM quiz_questions WHERE question_number = 'Q16' AND layer_number = 2 AND archetype_filter = 'Architect'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

-- Q15a - Alchemist
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q15a', 'The thing that slows me down the most is:', 'subtype', 1, 'Alchemist')
ON CONFLICT (layer_number, question_number) DO NOTHING;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'When the vision feels unclear or not aligned — the direction stops feeling true.', '→ Vision Block — Loss of intuitive direction', 'oracle'
FROM quiz_questions WHERE question_number = 'Q15a' AND layer_number = 2 AND archetype_filter = 'Alchemist'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'When the expression or quality doesn''t feel right — the tone or details are off.', '→ Expression Block — Misalignment in aesthetic or emotional precision', 'perfectionist'
FROM quiz_questions WHERE question_number = 'Q15a' AND layer_number = 2 AND archetype_filter = 'Alchemist'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'When the emotional energy feels tense, low, or overwhelming — the field feels "off."', '→ Emotional Block — Disrupted relational or energetic flow', 'empath'
FROM quiz_questions WHERE question_number = 'Q15a' AND layer_number = 2 AND archetype_filter = 'Alchemist'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'When all three — the vision, the quality, and the emotional energy — are out of sync.', '→ Holistic Block — Full-system creative dissonance', 'ultimate_alchemist'
FROM quiz_questions WHERE question_number = 'Q15a' AND layer_number = 2 AND archetype_filter = 'Alchemist'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

-- Q16a - Alchemist
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q16a', 'Before I finalise or approve a project, the thing I double-check most carefully is:', 'subtype', 1, 'Alchemist')
ON CONFLICT (layer_number, question_number) DO NOTHING;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Whether the story or direction still feels emotionally true — the vision must resonate fully before I commit.', '→ Vision Anchor — Final narrative/intuition check', 'oracle'
FROM quiz_questions WHERE question_number = 'Q16a' AND layer_number = 2 AND archetype_filter = 'Alchemist'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Whether the quality and expression feel complete — the tone, details, and emotional precision must land correctly.', '→ Polish Anchor — Final execution/quality check', 'perfectionist'
FROM quiz_questions WHERE question_number = 'Q16a' AND layer_number = 2 AND archetype_filter = 'Alchemist'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'Whether the emotional energy feels right — I sense how people (including myself) feel about moving forward.', '→ Energy Anchor — Final emotional-field check', 'empath'
FROM quiz_questions WHERE question_number = 'Q16a' AND layer_number = 2 AND archetype_filter = 'Alchemist'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'Whether all three — the vision, the expression, and the emotional energy — are aligned in harmony.', '→ Resonance Anchor — Full creative alignment check', 'ultimate_alchemist'
FROM quiz_questions WHERE question_number = 'Q16a' AND layer_number = 2 AND archetype_filter = 'Alchemist'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

-- Q15m - Mixed
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q15m', 'The thing that slows me down the most is:', 'subtype', 1, 'Mixed')
ON CONFLICT (layer_number, question_number) DO NOTHING;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'When the structure feels unclear — the steps, systems, or information don''t make sense yet.', '→ Logic-led', 'logic'
FROM quiz_questions WHERE question_number = 'Q15m' AND layer_number = 2 AND archetype_filter = 'Mixed'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'When the direction feels off — the idea doesn''t feel right, the tone feels wrong, or the emotional flow is disrupted.', '→ Intuition-led', 'intuition'
FROM quiz_questions WHERE question_number = 'Q15m' AND layer_number = 2 AND archetype_filter = 'Mixed'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

-- Q16m - Mixed
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q16m', 'Before I finalise or approve a project, the thing I double-check most carefully is:', 'subtype', 1, 'Mixed')
ON CONFLICT (layer_number, question_number) DO NOTHING;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Whether the structure still holds — the logic, systems, processes, and information all line up clearly.', '→ Logic-led', 'logic'
FROM quiz_questions WHERE question_number = 'Q16m' AND layer_number = 2 AND archetype_filter = 'Mixed'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Whether the direction still feels right — the idea, the vision, the quality, and the emotional tone are fully aligned.', '→ Intuition-led', 'intuition'
FROM quiz_questions WHERE question_number = 'Q16m' AND layer_number = 2 AND archetype_filter = 'Mixed'
ON CONFLICT (question_id, option_key) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  option_description = EXCLUDED.option_description;

-- ================================================
-- PART 3: Verify Layer 2 is now complete
-- ================================================

SELECT 'Layer 2 question count after inserts' as status;
SELECT archetype_filter, COUNT(*) as count 
FROM quiz_questions 
WHERE layer_number = 2 
GROUP BY archetype_filter;

SELECT 'Total Layer 2 questions' as status, COUNT(*) as total
FROM quiz_questions 
WHERE layer_number = 2;

-- Expected: Architect=8, Alchemist=8, Mixed=8, Total=24
