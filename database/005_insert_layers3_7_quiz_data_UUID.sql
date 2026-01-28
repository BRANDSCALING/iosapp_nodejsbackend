-- ================================================
-- Layers 3-7: Quiz Data
-- CORRECTED VERSION - Uses exact text from Questions.docx
-- ================================================

-- Clean up existing Layers 3-7 data (if any)
DELETE FROM quiz_options WHERE question_id IN (SELECT id FROM quiz_questions WHERE layer_number IN (3,4,5,6,7));
DELETE FROM quiz_questions WHERE layer_number IN (3,4,5,6,7);

-- ================================================
-- LAYER 3: COMMUNICATION (5 Questions)
-- ================================================

-- Q15: Communication style
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (3, 'Q15', 'When I communicate an idea, I naturally start by:', 'communication', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Laying out the structure — the logic, steps, or framework first.', '→ Logic-first communication', 'architect'
FROM quiz_questions WHERE question_number = 'Q15' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Sharing the feeling or vision — the meaning, tone, or story first.', '→ Feeling-first communication', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q15' AND layer_number = 3;

-- Q16: Persuasion
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (3, 'Q16', 'When I''m trying to persuade someone, I tend to emphasise:', 'communication', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Why it makes sense — the evidence, logic, or clear reasoning.', '→ Logic-led persuasion', 'architect'
FROM quiz_questions WHERE question_number = 'Q16' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Why it feels right — the vision, meaning, or emotional resonance.', '→ Feeling-led persuasion', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q16' AND layer_number = 3;

-- Q17: Explaining complexity
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (3, 'Q17', 'When explaining something complex, I usually:', 'communication', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Break it into steps, categories, or logical sequences.', '→ Structure-led explanation', 'architect'
FROM quiz_questions WHERE question_number = 'Q17' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Use metaphors, stories, or intuitive analogies.', '→ Narrative-led explanation', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q17' AND layer_number = 3;

-- Q18: Feedback delivery
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (3, 'Q18', 'When giving feedback, I focus on:', 'communication', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'What needs to be fixed or improved — the specifics, logic, or structure.', '→ Logic-led feedback', 'architect'
FROM quiz_questions WHERE question_number = 'Q18' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'How the work feels or what''s missing emotionally — the tone, alignment, or meaning.', '→ Feeling-led feedback', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q18' AND layer_number = 3;

-- Q19: Listening style
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (3, 'Q19', 'When someone is explaining something to me, I listen for:', 'communication', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The logic — the structure, reasoning, or key facts.', '→ Logic-led listening', 'architect'
FROM quiz_questions WHERE question_number = 'Q19' AND layer_number = 3;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The feeling — the tone, energy, or underlying meaning.', '→ Feeling-led listening', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q19' AND layer_number = 3;

-- ================================================
-- LAYER 4: DECISION-MAKING (6 Questions)
-- ================================================

-- Q20: Decision speed
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (4, 'Q20', 'I make decisions fastest when:', 'decision', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The logic is clear and the data supports it.', '→ Logic-led speed', 'architect'
FROM quiz_questions WHERE question_number = 'Q20' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The feeling is strong and the direction feels aligned.', '→ Feeling-led speed', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q20' AND layer_number = 4;

-- Q21: Decision confidence
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (4, 'Q21', 'I feel most confident in a decision when:', 'decision', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'I can explain the reasoning clearly and it holds up logically.', '→ Logic-led confidence', 'architect'
FROM quiz_questions WHERE question_number = 'Q21' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'I can feel it''s right and it aligns with my intuition or vision.', '→ Feeling-led confidence', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q21' AND layer_number = 4;

-- Q22: Decision validation
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (4, 'Q22', 'After making a decision, I validate it by:', 'decision', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Reviewing the logic, data, or assumptions again.', '→ Logic-led validation', 'architect'
FROM quiz_questions WHERE question_number = 'Q22' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Checking if it still feels right or aligned emotionally.', '→ Feeling-led validation', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q22' AND layer_number = 4;

-- Q23: Decision reversal
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (4, 'Q23', 'I''m most likely to reverse a decision when:', 'decision', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'New data or logic shows I was wrong.', '→ Logic-led reversal', 'architect'
FROM quiz_questions WHERE question_number = 'Q23' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The feeling shifts or it no longer feels aligned.', '→ Feeling-led reversal', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q23' AND layer_number = 4;

-- Q24: Decision complexity
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (4, 'Q24', 'When facing a complex decision, I rely on:', 'decision', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Breaking it down logically — analysing parts, testing assumptions, or mapping scenarios.', '→ Logic-led complexity handling', 'architect'
FROM quiz_questions WHERE question_number = 'Q24' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Tuning into the feeling — sensing what''s aligned, meaningful, or intuitively right.', '→ Feeling-led complexity handling', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q24' AND layer_number = 4;

-- Q25: Decision under uncertainty
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (4, 'Q25', 'When I have to decide with incomplete information, I:', 'decision', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Look for the best logical path based on what I know.', '→ Logic-led uncertainty handling', 'architect'
FROM quiz_questions WHERE question_number = 'Q25' AND layer_number = 4;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Trust my intuition or feeling about the right direction.', '→ Feeling-led uncertainty handling', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q25' AND layer_number = 4;

-- ================================================
-- LAYER 5: VALUE SYSTEM (6 Questions)
-- ================================================

-- Q26: Core value
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (5, 'Q26', 'I value work that is:', 'values', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Clear, efficient, and logically sound.', '→ Logic-led values', 'architect'
FROM quiz_questions WHERE question_number = 'Q26' AND layer_number = 5;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Meaningful, inspiring, and emotionally resonant.', '→ Feeling-led values', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q26' AND layer_number = 5;

-- Q27: Success definition
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (5, 'Q27', 'I feel successful when:', 'values', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Things work well — systems are efficient, results are measurable, and logic holds.', '→ Logic-led success', 'architect'
FROM quiz_questions WHERE question_number = 'Q27' AND layer_number = 5;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Things feel right — work is meaningful, aligned, and emotionally fulfilling.', '→ Feeling-led success', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q27' AND layer_number = 5;

-- Q28: Priority setting
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (5, 'Q28', 'When setting priorities, I focus on:', 'values', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'What makes the most logical sense — impact, efficiency, or clear outcomes.', '→ Logic-led priorities', 'architect'
FROM quiz_questions WHERE question_number = 'Q28' AND layer_number = 5;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'What feels most meaningful — alignment, purpose, or emotional significance.', '→ Feeling-led priorities', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q28' AND layer_number = 5;

-- Q29: Quality standards
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (5, 'Q29', 'I judge quality by:', 'values', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Whether it works well — accuracy, functionality, and logical consistency.', '→ Logic-led quality', 'architect'
FROM quiz_questions WHERE question_number = 'Q29' AND layer_number = 5;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Whether it feels right — aesthetic, emotional precision, and meaningful expression.', '→ Feeling-led quality', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q29' AND layer_number = 5;

-- Q30: Work satisfaction
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (5, 'Q30', 'I''m most satisfied with my work when:', 'values', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'It''s well-structured, efficient, and produces clear results.', '→ Logic-led satisfaction', 'architect'
FROM quiz_questions WHERE question_number = 'Q30' AND layer_number = 5;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'It''s meaningful, aligned with my values, and emotionally fulfilling.', '→ Feeling-led satisfaction', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q30' AND layer_number = 5;

-- Q31: Trade-offs
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (5, 'Q31', 'When forced to choose, I''d rather have work that is:', 'values', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Logically sound and efficient, even if it''s not emotionally inspiring.', '→ Logic-led trade-off', 'architect'
FROM quiz_questions WHERE question_number = 'Q31' AND layer_number = 5;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Meaningful and aligned, even if it''s not perfectly efficient.', '→ Feeling-led trade-off', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q31' AND layer_number = 5;

-- ================================================
-- LAYER 6: LEADERSHIP (7 Questions)
-- ================================================

-- Q32: Leadership style
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (6, 'Q32', 'When leading a team, I focus on:', 'leadership', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Clear structure — roles, processes, and logical execution.', '→ Logic-led leadership', 'architect'
FROM quiz_questions WHERE question_number = 'Q32' AND layer_number = 6;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Shared vision — meaning, alignment, and emotional connection.', '→ Feeling-led leadership', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q32' AND layer_number = 6;

-- Q33: Team motivation
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (6, 'Q33', 'I motivate others by:', 'leadership', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Showing them the plan, the logic, or the clear path forward.', '→ Logic-led motivation', 'architect'
FROM quiz_questions WHERE question_number = 'Q33' AND layer_number = 6;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Inspiring them with the vision, meaning, or emotional purpose.', '→ Feeling-led motivation', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q33' AND layer_number = 6;

-- Q34: Conflict resolution
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (6, 'Q34', 'When resolving team conflict, I focus on:', 'leadership', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Finding the logical solution — clarifying facts, roles, or processes.', '→ Logic-led conflict resolution', 'architect'
FROM quiz_questions WHERE question_number = 'Q34' AND layer_number = 6;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Restoring emotional alignment — understanding feelings, values, or relational dynamics.', '→ Feeling-led conflict resolution', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q34' AND layer_number = 6;

-- Q35: Delegation
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (6, 'Q35', 'When delegating, I emphasise:', 'leadership', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'What needs to be done — the tasks, steps, and expected outcomes.', '→ Logic-led delegation', 'architect'
FROM quiz_questions WHERE question_number = 'Q35' AND layer_number = 6;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Why it matters — the meaning, purpose, and emotional context.', '→ Feeling-led delegation', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q35' AND layer_number = 6;

-- Q36: Team performance
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (6, 'Q36', 'I know my team is performing well when:', 'leadership', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Results are clear, processes are smooth, and logic is sound.', '→ Logic-led performance assessment', 'architect'
FROM quiz_questions WHERE question_number = 'Q36' AND layer_number = 6;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Energy is high, alignment is strong, and work feels meaningful.', '→ Feeling-led performance assessment', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q36' AND layer_number = 6;

-- Q37: Decision-making authority
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (6, 'Q37', 'When making team decisions, I:', 'leadership', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Gather data, analyse options, and choose the most logical path.', '→ Logic-led decision authority', 'architect'
FROM quiz_questions WHERE question_number = 'Q37' AND layer_number = 6;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Sense the team''s energy, align with values, and choose what feels right.', '→ Feeling-led decision authority', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q37' AND layer_number = 6;

-- Q38: Team culture
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (6, 'Q38', 'I want my team culture to be:', 'leadership', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Structured, efficient, and results-oriented.', '→ Logic-led culture', 'architect'
FROM quiz_questions WHERE question_number = 'Q38' AND layer_number = 6;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Inspiring, aligned, and emotionally connected.', '→ Feeling-led culture', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q38' AND layer_number = 6;

-- ================================================
-- LAYER 7: VISION & IMPACT (7 Questions)
-- ================================================

-- Q39: Long-term vision
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (7, 'Q39', 'My long-term vision is driven by:', 'vision', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Building something that works well — systems, structures, or solutions that are efficient and logical.', '→ Logic-led vision', 'architect'
FROM quiz_questions WHERE question_number = 'Q39' AND layer_number = 7;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Creating something meaningful — ideas, experiences, or movements that inspire and align with values.', '→ Feeling-led vision', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q39' AND layer_number = 7;

-- Q40: Legacy
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (7, 'Q40', 'I want to be remembered for:', 'vision', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Building systems, solving problems, or creating clear, lasting structures.', '→ Logic-led legacy', 'architect'
FROM quiz_questions WHERE question_number = 'Q40' AND layer_number = 7;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Inspiring people, creating meaning, or shaping culture and emotional impact.', '→ Feeling-led legacy', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q40' AND layer_number = 7;

-- Q41: Impact measurement
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (7, 'Q41', 'I measure my impact by:', 'vision', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Clear results — data, outcomes, or measurable improvements.', '→ Logic-led impact', 'architect'
FROM quiz_questions WHERE question_number = 'Q41' AND layer_number = 7;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Emotional resonance — how people feel, the meaning created, or cultural shift.', '→ Feeling-led impact', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q41' AND layer_number = 7;

-- Q42: Future orientation
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (7, 'Q42', 'When I think about the future, I focus on:', 'vision', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'What needs to be built — the systems, structures, or solutions required.', '→ Logic-led future', 'architect'
FROM quiz_questions WHERE question_number = 'Q42' AND layer_number = 7;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'What could be possible — the vision, meaning, or transformative potential.', '→ Feeling-led future', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q42' AND layer_number = 7;

-- Q43: Change catalyst
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (7, 'Q43', 'I create change by:', 'vision', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Designing better systems, processes, or logical frameworks.', '→ Logic-led change', 'architect'
FROM quiz_questions WHERE question_number = 'Q43' AND layer_number = 7;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Inspiring new ideas, shifting culture, or creating emotional momentum.', '→ Feeling-led change', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q43' AND layer_number = 7;

-- Q44: Purpose
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (7, 'Q44', 'My sense of purpose comes from:', 'vision', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Solving problems, building systems, or making things work better.', '→ Logic-led purpose', 'architect'
FROM quiz_questions WHERE question_number = 'Q44' AND layer_number = 7;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Creating meaning, inspiring others, or aligning with deeper values.', '→ Feeling-led purpose', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q44' AND layer_number = 7;

-- Q45: Ultimate contribution
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (7, 'Q45', 'My ultimate contribution to the world would be:', 'vision', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'A system, framework, or solution that makes life more efficient and logical.', '→ Logic-led contribution', 'architect'
FROM quiz_questions WHERE question_number = 'Q45' AND layer_number = 7;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'A vision, movement, or cultural shift that makes life more meaningful and aligned.', '→ Feeling-led contribution', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q45' AND layer_number = 7;

-- ================================================
-- VERIFICATION QUERY
-- ================================================
SELECT 
    q.layer_number,
    q.question_number,
    LEFT(q.question_text, 50) as question_preview,
    COUNT(o.id) as option_count
FROM quiz_questions q
LEFT JOIN quiz_options o ON q.id = o.question_id
WHERE q.layer_number IN (3,4,5,6,7)
GROUP BY q.id, q.layer_number, q.question_number, q.question_text
ORDER BY q.layer_number, q.question_number;




-- -- ============================================
-- -- Layers 3-7: Complete Quiz Data
-- -- FIXED VERSION - Uses correct column names
-- -- ============================================

-- -- Clean up existing Layers 3-7 data (if any)
-- DELETE FROM quiz_options WHERE question_id IN (SELECT id FROM quiz_questions WHERE layer_number BETWEEN 3 AND 7);
-- DELETE FROM quiz_questions WHERE layer_number BETWEEN 3 AND 7;

-- -- ============================================
-- -- LAYER 3: COMMUNICATION STYLE (5 Questions)
-- -- ============================================

-- -- Q18: Communication preference
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (3, 'Q18', 'When communicating ideas, I prefer to:', 'communication', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Use structured frameworks and clear logic', 'Structured communicator', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q18' AND layer_number = 3;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Share inspiring stories and possibilities', 'Inspirational communicator', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q18' AND layer_number = 3;

-- -- Q19: Presentation style
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (3, 'Q19', 'In presentations, I focus on:', 'communication', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Data, metrics, and logical arguments', 'Data-focused presenter', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q19' AND layer_number = 3;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Vision, emotion, and transformative impact', 'Vision-focused presenter', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q19' AND layer_number = 3;

-- -- Q20: Persuasion approach
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (3, 'Q20', 'I persuade others by:', 'communication', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Presenting evidence and rational arguments', 'Logical persuader', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q20' AND layer_number = 3;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Painting compelling visions of the future', 'Visionary persuader', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q20' AND layer_number = 3;

-- -- Q21: Feedback style
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (3, 'Q21', 'When giving feedback, I emphasize:', 'communication', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Specific improvements and actionable steps', 'Actionable feedback', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q21' AND layer_number = 3;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Potential and growth opportunities', 'Growth-focused feedback', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q21' AND layer_number = 3;

-- -- Q22: Listening approach
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (3, 'Q22', 'When listening to others, I focus on:', 'communication', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Facts, details, and logical consistency', 'Analytical listener', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q22' AND layer_number = 3;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Underlying emotions and deeper meanings', 'Intuitive listener', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q22' AND layer_number = 3;

-- -- ============================================
-- -- LAYER 4: DECISION-MAKING (6 Questions)
-- -- ============================================

-- -- Q23: Risk assessment
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (4, 'Q23', 'When assessing risks, I:', 'decision_making', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Analyze probabilities and create contingency plans', 'Risk analyzer', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q23' AND layer_number = 4;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Trust intuition and embrace calculated uncertainty', 'Intuitive risk-taker', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q23' AND layer_number = 4;

-- -- Q24: Information gathering
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (4, 'Q24', 'Before making decisions, I:', 'decision_making', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Gather comprehensive data and analyze thoroughly', 'Data gatherer', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q24' AND layer_number = 4;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Seek diverse perspectives and creative insights', 'Insight seeker', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q24' AND layer_number = 4;

-- -- Q25: Decision speed
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (4, 'Q25', 'My decision-making pace is:', 'decision_making', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Deliberate and methodical', 'Methodical decider', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q25' AND layer_number = 4;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Quick and adaptive', 'Adaptive decider', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q25' AND layer_number = 4;

-- -- Q26: Consensus building
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (4, 'Q26', 'When building consensus, I:', 'decision_making', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Present logical arguments and structured proposals', 'Logical consensus builder', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q26' AND layer_number = 4;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Create shared vision and emotional alignment', 'Visionary consensus builder', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q26' AND layer_number = 4;

-- -- Q27: Implementation focus
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (4, 'Q27', 'After deciding, I prioritize:', 'decision_making', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Detailed execution plans and milestones', 'Execution planner', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q27' AND layer_number = 4;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Momentum and adaptive progress', 'Momentum creator', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q27' AND layer_number = 4;

-- -- Q28: Course correction
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (4, 'Q28', 'When plans need adjustment, I:', 'decision_making', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Review data and revise systematically', 'Systematic adjuster', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q28' AND layer_number = 4;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Pivot quickly based on emerging insights', 'Agile adjuster', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q28' AND layer_number = 4;

-- -- ============================================
-- -- LAYER 5: VALUE SYSTEM (6 Questions)
-- -- ============================================

-- -- Q29: Core motivation
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (5, 'Q29', 'I am most motivated by:', 'value_system', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Achieving measurable results and excellence', 'Achievement-driven', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q29' AND layer_number = 5;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Creating meaningful impact and transformation', 'Impact-driven', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q29' AND layer_number = 5;

-- -- Q30: Success definition
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (5, 'Q30', 'Success to me means:', 'value_system', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Building sustainable systems that deliver consistent results', 'Systems success', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q30' AND layer_number = 5;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Catalyzing breakthrough innovations and paradigm shifts', 'Innovation success', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q30' AND layer_number = 5;

-- -- Q31: Work satisfaction
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (5, 'Q31', 'I find satisfaction in:', 'value_system', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Mastering complexity and optimizing performance', 'Mastery satisfaction', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q31' AND layer_number = 5;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Exploring possibilities and inspiring others', 'Exploration satisfaction', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q31' AND layer_number = 5;

-- -- Q32: Priority focus
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (5, 'Q32', 'My top priority is:', 'value_system', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Efficiency, reliability, and quality', 'Quality priority', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q32' AND layer_number = 5;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Innovation, growth, and possibility', 'Innovation priority', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q32' AND layer_number = 5;

-- -- Q33: Legacy aspiration
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (5, 'Q33', 'I want to be known for:', 'value_system', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Building enduring structures and systems', 'Builder legacy', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q33' AND layer_number = 5;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Inspiring transformation and new possibilities', 'Transformer legacy', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q33' AND layer_number = 5;

-- -- Q34: Value contribution
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (5, 'Q34', 'My greatest contribution is:', 'value_system', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Creating order from chaos', 'Order creator', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q34' AND layer_number = 5;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Unlocking hidden potential', 'Potential unlocker', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q34' AND layer_number = 5;

-- -- ============================================
-- -- LAYER 6: GROWTH PATTERN (7 Questions)
-- -- ============================================

-- -- Q35: Learning preference
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (6, 'Q35', 'I learn best through:', 'growth_pattern', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Structured courses and systematic study', 'Structured learner', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q35' AND layer_number = 6;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Experimentation and creative exploration', 'Experimental learner', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q35' AND layer_number = 6;

-- -- Q36: Skill development
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (6, 'Q36', 'When developing new skills, I:', 'growth_pattern', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Follow proven methods and best practices', 'Method follower', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q36' AND layer_number = 6;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Discover my own unique approach', 'Path creator', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q36' AND layer_number = 6;

-- -- Q37: Challenge response
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (6, 'Q37', 'When facing obstacles, I:', 'growth_pattern', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Analyze root causes and develop solutions', 'Problem analyzer', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q37' AND layer_number = 6;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Reframe challenges as opportunities', 'Opportunity reframer', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q37' AND layer_number = 6;

-- -- Q38: Feedback utilization
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (6, 'Q38', 'I use feedback to:', 'growth_pattern', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Refine processes and improve efficiency', 'Process refiner', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q38' AND layer_number = 6;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Spark new ideas and evolve my approach', 'Approach evolver', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q38' AND layer_number = 6;

-- -- Q39: Growth mindset
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (6, 'Q39', 'My growth philosophy is:', 'growth_pattern', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Continuous improvement through discipline', 'Disciplined improver', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q39' AND layer_number = 6;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Quantum leaps through breakthrough insights', 'Breakthrough seeker', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q39' AND layer_number = 6;

-- -- Q40: Mastery approach
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (6, 'Q40', 'I achieve mastery by:', 'growth_pattern', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Deliberate practice and repetition', 'Practice-based mastery', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q40' AND layer_number = 6;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Intuitive understanding and creative application', 'Intuitive mastery', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q40' AND layer_number = 6;

-- -- Q41: Knowledge integration
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (6, 'Q41', 'I integrate new knowledge by:', 'growth_pattern', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Organizing it into existing frameworks', 'Framework organizer', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q41' AND layer_number = 6;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Connecting it to create new patterns', 'Pattern connector', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q41' AND layer_number = 6;

-- -- ============================================
-- -- LAYER 7: LEGACY VISION (7 Questions)
-- -- ============================================

-- -- Q42: Long-term vision
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (7, 'Q42', 'My long-term vision focuses on:', 'legacy_vision', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Building lasting institutions and systems', 'Institution builder', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q42' AND layer_number = 7;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Catalyzing movements and cultural shifts', 'Movement catalyst', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q42' AND layer_number = 7;

-- -- Q43: Impact measurement
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (7, 'Q43', 'I measure my impact by:', 'legacy_vision', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Tangible outcomes and metrics', 'Metrics-based impact', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q43' AND layer_number = 7;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Lives transformed and possibilities unlocked', 'Transformation impact', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q43' AND layer_number = 7;

-- -- Q44: Future orientation
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (7, 'Q44', 'When thinking about the future, I:', 'legacy_vision', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Plan strategically with clear milestones', 'Strategic planner', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q44' AND layer_number = 7;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Envision possibilities and inspire others', 'Possibility visionary', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q44' AND layer_number = 7;

-- -- Q45: Contribution style
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (7, 'Q45', 'My ideal contribution to the world is:', 'legacy_vision', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Creating frameworks others can build upon', 'Framework creator', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q45' AND layer_number = 7;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Igniting inspiration that spreads organically', 'Inspiration igniter', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q45' AND layer_number = 7;

-- -- Q46: Generational impact
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (7, 'Q46', 'For future generations, I want to leave:', 'legacy_vision', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Proven systems and methodologies', 'System legacy', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q46' AND layer_number = 7;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Expanded consciousness and new paradigms', 'Paradigm legacy', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q46' AND layer_number = 7;

-- -- Q47: Purpose fulfillment
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (7, 'Q47', 'I fulfill my purpose by:', 'legacy_vision', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Executing with precision and consistency', 'Precision executor', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q47' AND layer_number = 7;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Living authentically and inspiring transformation', 'Authentic transformer', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q47' AND layer_number = 7;

-- -- Q48: Ultimate aspiration
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (7, 'Q48', 'My ultimate aspiration is to:', 'legacy_vision', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Perfect the art of execution and delivery', 'Execution perfecter', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q48' AND layer_number = 7;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Unlock infinite potential in myself and others', 'Potential unlocker', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q48' AND layer_number = 7;

-- -- ============================================
-- -- Verification Queries
-- -- ============================================

-- -- Count questions by layer
-- SELECT layer_number, COUNT(*) AS question_count
-- FROM quiz_questions
-- WHERE layer_number BETWEEN 3 AND 7
-- GROUP BY layer_number
-- ORDER BY layer_number;

-- -- Total questions across all layers
-- SELECT 'Total Questions (All Layers):' AS info, COUNT(*) AS count
-- FROM quiz_questions;

-- -- Total options across all layers
-- SELECT 'Total Options (All Layers):' AS info, COUNT(*) AS count
-- FROM quiz_options;

-- -- Show summary by layer
-- SELECT 
--     q.layer_number,
--     COUNT(DISTINCT q.id) AS questions,
--     COUNT(o.id) AS options
-- FROM quiz_questions q
-- LEFT JOIN quiz_options o ON q.id = o.question_id
-- GROUP BY q.layer_number
-- ORDER BY q.layer_number;