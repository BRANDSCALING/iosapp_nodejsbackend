-- ================================================
-- Layer 2: Subtype Quiz Data
-- CORRECTED VERSION - Uses exact text from Questions.docx
-- FIXED VERSION — Uses correct column names
-- ================================================

-- Clean up existing Layer 2 data (if any)
DELETE FROM quiz_options WHERE question_id IN (SELECT id FROM quiz_questions WHERE layer_number = 2);
DELETE FROM quiz_questions WHERE layer_number = 2;

-- ================================================
-- LAYER 2: SUBTYPE (6 Questions)
-- Note: This layer has 3 sets of questions:
-- - Architect subtype (Q9-Q14)
-- - Alchemist subtype (Q9a-Q14a)
-- - Mixed subtype (Q9m-Q14m)
-- Total: 18 questions
-- ================================================

-- ================================================
-- ARCHITECT SUBTYPE QUESTIONS (Q9-Q14)
-- ================================================

-- Q9: Under pressure protection
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q9', 'When things move fast or pressure rises, I instinctively protect:', 'subtype', 1.5);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The plan — the steps, sequence, and priorities.', '→ Prioritises sequencing and plan integrity', 'strategist'
FROM quiz_questions WHERE question_number = 'Q9' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The process — the systems, routines, and operational flow.', '→ Protects operations and processes first', 'builder'
FROM quiz_questions WHERE question_number = 'Q9' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'The proof — the accuracy, data, and assumptions.', '→ Focuses on validation and data under pressure', 'analyzer'
FROM quiz_questions WHERE question_number = 'Q9' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'The whole structure — I try to protect the plan, the system, and the data all at once.', '→ Stabilises the entire structural system rather than one part', 'ultimate_architect'
FROM quiz_questions WHERE question_number = 'Q9' AND layer_number = 2;

-- Q10: Project start
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q10', 'When starting a major project, the first thing I create is:', 'subtype', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'A roadmap or phased strategy.', '→ Strategy-first thinker (Sequencing)', 'strategist'
FROM quiz_questions WHERE question_number = 'Q10' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'A repeatable workflow or operational system.', '→ Operations-first thinker (Systems)', 'builder'
FROM quiz_questions WHERE question_number = 'Q10' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'A model, spreadsheet, or assumptions map.', '→ Data-first thinker (Analysis)', 'analyzer'
FROM quiz_questions WHERE question_number = 'Q10' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'A unified frame that combines phases, systems, and key data.', '→ Integrative thinker (Full-structure)', 'ultimate_architect'
FROM quiz_questions WHERE question_number = 'Q10' AND layer_number = 2;

-- Q11: Natural rhythm
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q11', 'When I''m working in my natural rhythm, my focus naturally goes toward:', 'subtype', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Putting decisions in the right order and mapping the sequence clearly.', '→ Strategy-first', 'strategist'
FROM quiz_questions WHERE question_number = 'Q11' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Making the workflow smooth, predictable, and efficient.', '→ Operations-first', 'builder'
FROM quiz_questions WHERE question_number = 'Q11' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'Reducing uncertainty by analysing details, data, and assumptions.', '→ Analysis-first', 'analyzer'
FROM quiz_questions WHERE question_number = 'Q11' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'Keeping the strategy, systems, and data aligned at the same time.', '→ Integration-first', 'ultimate_architect'
FROM quiz_questions WHERE question_number = 'Q11' AND layer_number = 2;

-- Q12: When things break down
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q12', 'When a project or task starts breaking down (delays, confusion, errors, or misalignment), my first instinct is to:', 'subtype', 1.5);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Zoom out, rethink the overall plan, and re-sequence the steps so everything makes sense again.', '→ Strategy Reset', 'strategist'
FROM quiz_questions WHERE question_number = 'Q12' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Tighten or redesign the workflow, system, or routine so things run smoothly again.', '→ Process Reset', 'builder'
FROM quiz_questions WHERE question_number = 'Q12' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'Analyse what''s causing the issue — look at the details, variables, or data — and test logical fixes.', '→ Analytical Reset', 'analyzer'
FROM quiz_questions WHERE question_number = 'Q12' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'Re-align everything at once: the plan, the process, and the data behind it.', '→ Full Structural Reset', 'ultimate_architect'
FROM quiz_questions WHERE question_number = 'Q12' AND layer_number = 2;

-- Q13: Building momentum
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q13', 'When I''m trying to build momentum on a project (getting myself to start, stay focused, or speed up), I find it easiest when:', 'subtype', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'I know the exact next steps — a clear sequence makes it natural for me to move forward.', '→ Step Clarity -Sequence-driven execution', 'strategist'
FROM quiz_questions WHERE question_number = 'Q13' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The workflow or routine is already set up — once the system feels smooth, I move quickly.', '→ System Flow -System-driven execution', 'builder'
FROM quiz_questions WHERE question_number = 'Q13' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'I can see proof that things are working — data, results, or validation give me the push to accelerate.', '→ Data Confirmation- Data-driven execution', 'analyzer'
FROM quiz_questions WHERE question_number = 'Q13' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'Everything feels aligned — the plan makes sense, the system is clear, and the information supports the direction.', '→ Full Alignment -Integrated structural execution', 'ultimate_architect'
FROM quiz_questions WHERE question_number = 'Q13' AND layer_number = 2;

-- Q14: Project progress
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q14', 'I feel a project is genuinely progressing when:', 'subtype', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The plan is unfolding the way I mapped it — each step is happening in the right order.', '→ Plan Progress — Sequence-led execution', 'strategist'
FROM quiz_questions WHERE question_number = 'Q14' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The workflow or operations become smoother and more consistent over time.', '→ Process Stability — System-led execution', 'builder'
FROM quiz_questions WHERE question_number = 'Q14' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'The numbers, data, or measurable indicators show clear improvement.', '→ Data Progress — Analysis-led execution', 'analyzer'
FROM quiz_questions WHERE question_number = 'Q14' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'The plan, the system, and the data all line up and reinforce each other.', '→ Structural Alignment — Integrated execution', 'ultimate_architect'
FROM quiz_questions WHERE question_number = 'Q14' AND layer_number = 2;

-- ================================================
-- ALCHEMIST SUBTYPE QUESTIONS (Q9a-Q14a)
-- ================================================

-- Q9a: Under pressure protection
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q9a', 'When things move fast or pressure rises, I instinctively protect:', 'subtype', 1.5);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The idea — the narrative, the vision, and what this could become.', '→ Idea Integrity — Vision-led execution', 'oracle'
FROM quiz_questions WHERE question_number = 'Q9a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The quality — the emotional precision, the aesthetic, or how the work feels.', '→ Quality Precision — Expression-led execution', 'perfectionist'
FROM quiz_questions WHERE question_number = 'Q9a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'The people — the emotional energy, relationships, and overall vibe of the situation.', '→ People Alignment — Energy-led execution', 'empath'
FROM quiz_questions WHERE question_number = 'Q9a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'The entire project — the idea, the quality, and the emotional field together.', '→ Holistic Harmony — Integrated alchemist execution', 'ultimate_alchemist'
FROM quiz_questions WHERE question_number = 'Q9a' AND layer_number = 2;

-- Q10a: Project start
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q10a', 'When starting a major project, the first thing I create is:', 'subtype', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The story or intuitive direction — the "future picture" of what this could become.', '→ Vision First', 'oracle'
FROM quiz_questions WHERE question_number = 'Q10a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The feel, tone, or emotional aesthetic — how it needs to look or feel.', '→ Expression First', 'perfectionist'
FROM quiz_questions WHERE question_number = 'Q10a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'The emotional alignment with the people involved — making sure the energy is right.', '→ Energy First', 'empath'
FROM quiz_questions WHERE question_number = 'Q10a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'A unified frame — the story, the expression, and the emotional tone together.', '→ Unified Creative Frame', 'ultimate_alchemist'
FROM quiz_questions WHERE question_number = 'Q10a' AND layer_number = 2;

-- Q11a: Natural rhythm
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q11a', 'When I''m working in my natural rhythm, my focus naturally goes toward:', 'subtype', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Making the idea more visionary, intuitive, or ahead of the curve.', '→ Vision Refinement', 'oracle'
FROM quiz_questions WHERE question_number = 'Q11a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Perfecting the details, tone, or emotional expression until it feels right.', '→ Expression Refinement', 'perfectionist'
FROM quiz_questions WHERE question_number = 'Q11a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'Maintaining emotional alignment — keeping energy, relationships, or the environment steady.', '→ Energy Alignment', 'empath'
FROM quiz_questions WHERE question_number = 'Q11a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'Holding the idea, the quality, and the emotional tone all together in harmony.', '→ Holistic Creative Balance', 'ultimate_alchemist'
FROM quiz_questions WHERE question_number = 'Q11a' AND layer_number = 2;

-- Q12a: When things break down
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q12a', 'When a project or task starts breaking down (delays, confusion, errors, or misalignment), my first instinct is to:', 'subtype', 1.5);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Reframe the story or intuitive direction so it feels aligned again.', '→ Narrative Reset', 'oracle'
FROM quiz_questions WHERE question_number = 'Q12a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Refine the expression or quality — adjust tone, details, or aesthetics.', '→ Expression Reset', 'perfectionist'
FROM quiz_questions WHERE question_number = 'Q12a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'Reset the emotional energy — clear tension, reconnect people, or restore alignment.', '→ Energy Reset', 'empath'
FROM quiz_questions WHERE question_number = 'Q12a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'Re-harmonise everything at once — the idea, the quality, and the emotional tone.', '→ Full Harmony Reset', 'ultimate_alchemist'
FROM quiz_questions WHERE question_number = 'Q12a' AND layer_number = 2;

-- Q13a: Building momentum
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q13a', 'When I''m trying to build momentum on a project (getting myself to start, stay focused, or speed up), I find it easiest when:', 'subtype', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The idea feels true and exciting — it sparks a sense of possibility and purpose.', '→ Creative Spark — Vision-led momentum', 'oracle'
FROM quiz_questions WHERE question_number = 'Q13a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The work looks and feels right — the details feel refined and emotionally aligned.', '→ Refined Precision — Quality-led momentum', 'perfectionist'
FROM quiz_questions WHERE question_number = 'Q13a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'The emotional field feels alive and connected — the people, energy, and rhythm feel attuned.', '→ Emotional Sync — People- and energy-led momentum', 'empath'
FROM quiz_questions WHERE question_number = 'Q13a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'All three are in sync — the idea inspires, the quality feels right, and the energy flows.', '→ Energetic Alignment — Integrated momentum', 'ultimate_alchemist'
FROM quiz_questions WHERE question_number = 'Q13a' AND layer_number = 2;

-- Q14a: Project progress
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q14a', 'I feel a project is genuinely progressing when:', 'subtype', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The vision feels like it''s becoming real — the work begins to mirror the future I imagined.', '→ Vision Alignment — Progress through intuitive direction becoming tangible', 'oracle'
FROM quiz_questions WHERE question_number = 'Q14a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The quality feels emotionally precise — the tone, details, and expression land exactly as they should.', '→ Aesthetic Precision — Progress through refined execution', 'perfectionist'
FROM quiz_questions WHERE question_number = 'Q14a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'The emotional energy is alive — people feel connected, attuned, and emotionally in sync.', '→ Emotional Field — Progress through relational and energetic coherence', 'empath'
FROM quiz_questions WHERE question_number = 'Q14a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'The vision, the quality, and the emotional energy all reinforce each other seamlessly.', '→ Holistic Resonance — Progress through full creative alignment', 'ultimate_alchemist'
FROM quiz_questions WHERE question_number = 'Q14a' AND layer_number = 2;

-- ================================================
-- MIXED SUBTYPE QUESTIONS (Q9m-Q14m)
-- ================================================

-- Q9m: Under pressure protection
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q9m', 'When things move fast or pressure rises, I instinctively protect:', 'subtype', 1.5);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The clarity of the situation — the plan, the steps, or the logical framework that keeps things stable.', '→ Logic-led', 'architect'
FROM quiz_questions WHERE question_number = 'Q9m' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The alignment of the situation — the vision, the emotional tone, or the creative spark that keeps things aligned.', '→ Intuition-led', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q9m' AND layer_number = 2;

-- Q10m: Project start
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q10m', 'When starting a major project, the first thing I create is:', 'subtype', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'A structure — a roadmap, system, or model that gives the project shape and clarity.', '→ Logic-led', 'architect'
FROM quiz_questions WHERE question_number = 'Q10m' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'A spark — a vision, tone, or story that sets the emotional direction and meaning.', '→ Intuition-led', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q10m' AND layer_number = 2;

-- Q11m: Natural rhythm
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q11m', 'When I''m working in my natural rhythm, my focus naturally goes toward:', 'subtype', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Bringing clarity — organising steps, structure, or details so things make sense.', '→ Logic-led', 'architect'
FROM quiz_questions WHERE question_number = 'Q11m' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Maintaining alignment — shaping the vision, tone, or feeling so things stay true to the direction.', '→ Intuition-led', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q11m' AND layer_number = 2;

-- Q12m: When things break down
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q12m', 'When a project or task starts breaking down (delays, confusion, errors, or misalignment), my first instinct is to:', 'subtype', 1.5);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Fix the structure — clarify the plan, tighten the workflow, or analyse what''s going wrong.', '→ Logic-led', 'architect'
FROM quiz_questions WHERE question_number = 'Q12m' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Reset the energy — shift the tone, refine the story, or reconnect to what feels true.', '→ Intuition-led', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q12m' AND layer_number = 2;

-- Q13m: Building momentum
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q13m', 'When I''m trying to build momentum on a project (starting, staying focused, or speeding up), I find it easiest when:', 'subtype', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The structure is clear — tI know the next steps, the workflow feels organised, or the data shows I''m moving in the right direction.', '→ Logic-led', 'architect'
FROM quiz_questions WHERE question_number = 'Q13m' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The feeling is right — the idea clicks, the energy lifts, or the quality inspires me to move.', '→ Intuition-led', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q13m' AND layer_number = 2;

-- Q14m: Project progress
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (2, 'Q14m', 'I feel a project is genuinely progressing when:', 'subtype', 1);

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The structure is working — the steps are unfolding clearly, things are becoming more organised, or the data shows improvement.', '→ Logic-led', 'architect'
FROM quiz_questions WHERE question_number = 'Q14m' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The alignment is working — the idea feels more real, the tone feels right, or the emotional flow is strengthening.', '→ Intuition-led', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q14m' AND layer_number = 2;

-- ================================================
-- VERIFICATION QUERY
-- ================================================
SELECT 
    q.question_number,
    LEFT(q.question_text, 50) as question_preview,
    COUNT(o.id) as option_count
FROM quiz_questions q
LEFT JOIN quiz_options o ON q.id = o.question_id
WHERE q.layer_number = 2
GROUP BY q.id, q.question_number, q.question_text
ORDER BY q.question_number;





-- -- ============================================
-- -- Layer 2: Subtype Quiz Data
-- -- FIXED VERSION - Uses correct column names
-- -- ============================================

-- -- Clean up existing Layer 2 data (if any)
-- DELETE FROM quiz_options WHERE question_id IN (SELECT id FROM quiz_questions WHERE layer_number = 2);
-- DELETE FROM quiz_questions WHERE layer_number = 2;

-- -- ============================================
-- -- LAYER 2: SUBTYPE (6 Questions)
-- -- ============================================

-- -- Q12: Strategic planning approach
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (2, 'Q12', 'When planning a major project, I prefer to:', 'subtype', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Strategic planning and logical analysis', 'Analytical expertise', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q12' AND layer_number = 2;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Creative insights and transformative ideas', 'Creative expertise', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q12' AND layer_number = 2;

-- -- Q13: Coordination style
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (2, 'Q13', 'In team coordination, I naturally:', 'subtype', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Organize and coordinate to ensure efficiency', 'Coordinator role', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q13' AND layer_number = 2;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Inspire and energize with innovative approaches', 'Catalyst role', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q13' AND layer_number = 2;

-- -- Q14: Problem-solving approach
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (2, 'Q14', 'When facing complex challenges, I tend to:', 'subtype', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Build systematic frameworks and processes', 'Systematic builder', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q14' AND layer_number = 2;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Explore creative solutions and possibilities', 'Creative explorer', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q14' AND layer_number = 2;

-- -- Q15: Decision-making style
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (2, 'Q15', 'My decision-making process is primarily:', 'subtype', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Data-driven and analytical', 'Analytical decision-maker', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q15' AND layer_number = 2;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Intuitive and vision-oriented', 'Intuitive decision-maker', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q15' AND layer_number = 2;

-- -- Q16: Leadership style
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (2, 'Q16', 'As a leader, I focus on:', 'subtype', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Establishing clear structures and accountability', 'Structural leader', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q16' AND layer_number = 2;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Inspiring transformation and breakthrough thinking', 'Transformational leader', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q16' AND layer_number = 2;

-- -- Q17: Value creation approach
-- INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
-- VALUES (2, 'Q17', 'I create the most value through:', 'subtype', 1);

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'A', 'Optimizing systems and improving efficiency', 'Efficiency optimizer', 'architect'
-- FROM quiz_questions WHERE question_number = 'Q17' AND layer_number = 2;

-- INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
-- SELECT id, 'B', 'Generating innovative ideas and new possibilities', 'Innovation generator', 'alchemist'
-- FROM quiz_questions WHERE question_number = 'Q17' AND layer_number = 2;

-- -- ============================================
-- -- Verification Queries
-- -- ============================================

-- -- Count Layer 2 questions
-- SELECT 'Layer 2 Questions:' AS info, COUNT(*) AS count 
-- FROM quiz_questions WHERE layer_number = 2;

-- -- Count Layer 2 options
-- SELECT 'Layer 2 Options:' AS info, COUNT(*) AS count 
-- FROM quiz_options WHERE question_id IN (SELECT id FROM quiz_questions WHERE layer_number = 2);

-- -- Show all Layer 2 questions with options
-- SELECT 
--     q.question_number,
--     q.question_text,
--     o.option_key,
--     o.option_text,
--     o.score_type
-- FROM quiz_questions q
-- JOIN quiz_options o ON q.id = o.question_id
-- WHERE layer_number = 2
-- ORDER BY q.question_number, o.option_key;