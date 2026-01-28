-- ================================================
-- UPDATED Layer 2: Subtype Quiz Data
-- WITH archetype_filter column
-- ================================================
-- 
-- Layer 2 has 3 sets of questions (24 total):
-- - Architect subtype (Q9-Q16): archetype_filter = 'Architect'
-- - Alchemist subtype (Q9a-Q16a): archetype_filter = 'Alchemist'
-- - Mixed subtype (Q9m-Q16m): archetype_filter = 'Mixed'
-- ================================================

-- Clean up existing Layer 2 data
DELETE FROM quiz_options WHERE question_id IN (SELECT id FROM quiz_questions WHERE layer_number = 2);
DELETE FROM quiz_questions WHERE layer_number = 2;

-- ================================================
-- ARCHITECT SUBTYPE QUESTIONS (Q9-Q16) - 8 questions
-- archetype_filter = 'Architect'
-- ================================================

-- Q9: Under pressure protection
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q9', 'When things move fast or pressure rises, I instinctively protect:', 'subtype', 1.5, 'Architect');

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
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q10', 'When starting a major project, the first thing I create is:', 'subtype', 1, 'Architect');

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
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q11', 'When I''m working in my natural rhythm, my focus naturally goes toward:', 'subtype', 1, 'Architect');

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
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q12', 'When a project or task starts breaking down (delays, confusion, errors, or misalignment), my first instinct is to:', 'subtype', 1.5, 'Architect');

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
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q13', 'When I''m trying to build momentum on a project (getting myself to start, stay focused, or speed up), I find it easiest when:', 'subtype', 1, 'Architect');

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
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q14', 'I feel a project is genuinely progressing when:', 'subtype', 1, 'Architect');

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

-- Q15: Communicating expertise
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q15', 'When communicating what I''m good at (expertise, skills, or what I bring to the table), I naturally highlight:', 'subtype', 1, 'Architect');

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'How I can think strategically and sequence things in the right order to make complex things simple.', '→ Strategic sequencing expertise', 'strategist'
FROM quiz_questions WHERE question_number = 'Q15' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'How I can build smooth systems, routines, or processes that run efficiently over time.', '→ Systems and process expertise', 'builder'
FROM quiz_questions WHERE question_number = 'Q15' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'How I can analyse information, reduce uncertainty, and find the truth in the data.', '→ Analytical and data expertise', 'analyzer'
FROM quiz_questions WHERE question_number = 'Q15' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'How I can hold the full picture — the strategy, the systems, and the data — all together and keep them aligned.', '→ Full structural integration expertise', 'ultimate_architect'
FROM quiz_questions WHERE question_number = 'Q15' AND layer_number = 2;

-- Q16: Trusting my own work
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q16', 'When I start to truly trust my own work, it''s because:', 'subtype', 1, 'Architect');

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The plan holds up — the sequence is right, and the strategy feels airtight.', '→ Strategic confidence', 'strategist'
FROM quiz_questions WHERE question_number = 'Q16' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The system runs smoothly — the workflow is repeatable and efficient.', '→ Systems confidence', 'builder'
FROM quiz_questions WHERE question_number = 'Q16' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'The data confirms it — the analysis checks out, and the assumptions are validated.', '→ Analytical confidence', 'analyzer'
FROM quiz_questions WHERE question_number = 'Q16' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'All of it holds — the plan, the system, and the data align as one stable structure.', '→ Full structural confidence', 'ultimate_architect'
FROM quiz_questions WHERE question_number = 'Q16' AND layer_number = 2;

-- ================================================
-- ALCHEMIST SUBTYPE QUESTIONS (Q9a-Q16a) - 8 questions
-- archetype_filter = 'Alchemist'
-- ================================================

-- Q9a: Under pressure protection
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q9a', 'When things move fast or pressure rises, I instinctively protect:', 'subtype', 1.5, 'Alchemist');

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
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q10a', 'When starting a major project, the first thing I create is:', 'subtype', 1, 'Alchemist');

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
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q11a', 'When I''m working in my natural rhythm, my focus naturally goes toward:', 'subtype', 1, 'Alchemist');

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
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q12a', 'When a project or task starts breaking down (delays, confusion, errors, or misalignment), my first instinct is to:', 'subtype', 1.5, 'Alchemist');

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
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q13a', 'When I''m trying to build momentum on a project (getting myself to start, stay focused, or speed up), I find it easiest when:', 'subtype', 1, 'Alchemist');

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
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q14a', 'I feel a project is genuinely progressing when:', 'subtype', 1, 'Alchemist');

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

-- Q15a: Communicating expertise
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q15a', 'When communicating what I''m good at (expertise, skills, or what I bring to the table), I naturally highlight:', 'subtype', 1, 'Alchemist');

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'How I can see the future picture — sensing patterns, possibilities, and where things are heading.', '→ Vision expertise', 'oracle'
FROM quiz_questions WHERE question_number = 'Q15a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'How I can refine and perfect the details — ensuring the quality and emotional expression land exactly right.', '→ Expression expertise', 'perfectionist'
FROM quiz_questions WHERE question_number = 'Q15a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'How I can read and harmonise the emotional field — sensing people, energy, and relational dynamics.', '→ Energy expertise', 'empath'
FROM quiz_questions WHERE question_number = 'Q15a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'How I can hold all three together — visioning, refining, and harmonising as one integrated creative flow.', '→ Full creative integration expertise', 'ultimate_alchemist'
FROM quiz_questions WHERE question_number = 'Q15a' AND layer_number = 2;

-- Q16a: Trusting my own work
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q16a', 'When I start to truly trust my own work, it''s because:', 'subtype', 1, 'Alchemist');

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The vision feels right — the story, the future picture, or the intuitive direction is landing.', '→ Vision confidence', 'oracle'
FROM quiz_questions WHERE question_number = 'Q16a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The quality feels precise — the details, tone, and expression are emotionally accurate.', '→ Expression confidence', 'perfectionist'
FROM quiz_questions WHERE question_number = 'Q16a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'C', 'The energy feels alive — the people, the field, and the emotional rhythm are all in sync.', '→ Energy confidence', 'empath'
FROM quiz_questions WHERE question_number = 'Q16a' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'D', 'All three are in harmony — the vision, the quality, and the energy are flowing as one.', '→ Full creative confidence', 'ultimate_alchemist'
FROM quiz_questions WHERE question_number = 'Q16a' AND layer_number = 2;

-- ================================================
-- MIXED SUBTYPE QUESTIONS (Q9m-Q16m) - 8 questions
-- archetype_filter = 'Mixed'
-- ================================================

-- Q9m: Under pressure protection
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q9m', 'When things move fast or pressure rises, I instinctively protect:', 'subtype', 1.5, 'Mixed');

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The clarity of the situation — the plan, the steps, or the logical framework that keeps things stable.', '→ Logic-led', 'architect'
FROM quiz_questions WHERE question_number = 'Q9m' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The alignment of the situation — the vision, the emotional tone, or the creative spark that keeps things aligned.', '→ Intuition-led', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q9m' AND layer_number = 2;

-- Q10m: Project start
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q10m', 'When starting a major project, the first thing I create is:', 'subtype', 1, 'Mixed');

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'A structure — a roadmap, system, or model that gives the project shape and clarity.', '→ Logic-led', 'architect'
FROM quiz_questions WHERE question_number = 'Q10m' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'A spark — a vision, tone, or story that sets the emotional direction and meaning.', '→ Intuition-led', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q10m' AND layer_number = 2;

-- Q11m: Natural rhythm
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q11m', 'When I''m working in my natural rhythm, my focus naturally goes toward:', 'subtype', 1, 'Mixed');

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Bringing clarity — organising steps, structure, or details so things make sense.', '→ Logic-led', 'architect'
FROM quiz_questions WHERE question_number = 'Q11m' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Maintaining alignment — shaping the vision, tone, or feeling so things stay true to the direction.', '→ Intuition-led', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q11m' AND layer_number = 2;

-- Q12m: When things break down
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q12m', 'When a project or task starts breaking down (delays, confusion, errors, or misalignment), my first instinct is to:', 'subtype', 1.5, 'Mixed');

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'Fix the structure — clarify the plan, tighten the workflow, or analyse what''s going wrong.', '→ Logic-led', 'architect'
FROM quiz_questions WHERE question_number = 'Q12m' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'Reset the energy — shift the tone, refine the story, or reconnect to what feels true.', '→ Intuition-led', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q12m' AND layer_number = 2;

-- Q13m: Building momentum
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q13m', 'When I''m trying to build momentum on a project (starting, staying focused, or speeding up), I find it easiest when:', 'subtype', 1, 'Mixed');

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The structure is clear — I know the next steps, the workflow feels organised, or the data shows I''m moving in the right direction.', '→ Logic-led', 'architect'
FROM quiz_questions WHERE question_number = 'Q13m' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The feeling is right — the idea clicks, the energy lifts, or the quality inspires me to move.', '→ Intuition-led', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q13m' AND layer_number = 2;

-- Q14m: Project progress
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q14m', 'I feel a project is genuinely progressing when:', 'subtype', 1, 'Mixed');

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The structure is working — the steps are unfolding clearly, things are becoming more organised, or the data shows improvement.', '→ Logic-led', 'architect'
FROM quiz_questions WHERE question_number = 'Q14m' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The alignment is working — the idea feels more real, the tone feels right, or the emotional flow is strengthening.', '→ Intuition-led', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q14m' AND layer_number = 2;

-- Q15m: Communicating expertise
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q15m', 'When communicating what I''m good at (expertise, skills, or what I bring to the table), I naturally highlight:', 'subtype', 1, 'Mixed');

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'How I can bring clarity, structure, and organisation to complex situations.', '→ Logic-led expertise', 'architect'
FROM quiz_questions WHERE question_number = 'Q15m' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'How I can bring vision, emotional depth, and creative alignment to meaningful work.', '→ Intuition-led expertise', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q15m' AND layer_number = 2;

-- Q16m: Trusting my own work
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight, archetype_filter)
VALUES (2, 'Q16m', 'When I start to truly trust my own work, it''s because:', 'subtype', 1, 'Mixed');

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'A', 'The structure holds — the plan is clear, the system works, or the data supports it.', '→ Logic-led confidence', 'architect'
FROM quiz_questions WHERE question_number = 'Q16m' AND layer_number = 2;

INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
SELECT id, 'B', 'The alignment holds — the vision feels true, the quality is right, or the energy is flowing.', '→ Intuition-led confidence', 'alchemist'
FROM quiz_questions WHERE question_number = 'Q16m' AND layer_number = 2;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

SELECT 'Layer 2 question counts by archetype_filter:' as info;
SELECT archetype_filter, COUNT(*) as count 
FROM quiz_questions 
WHERE layer_number = 2 
GROUP BY archetype_filter
ORDER BY archetype_filter;

SELECT 'Total Layer 2 questions:' as info, COUNT(*) as total FROM quiz_questions WHERE layer_number = 2;


