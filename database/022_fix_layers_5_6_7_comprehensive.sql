-- ============================================================================
-- Migration: 022_fix_layers_5_6_7_comprehensive.sql
-- Purpose: Fix completely incorrect questions in Layers 5, 6, and 7
-- Date: 2026-01-15
-- 
-- CRITICAL ISSUES FIXED:
-- - Layer 5: Replace VALUES/WORK questions with NEURODIVERGENCE questions (Q28-Q33)
-- - Layer 6: Replace TEAM LEADERSHIP questions with MINDSET/PERSONALITY questions (Q34-Q39)
-- - Layer 7: Fix question numbers and replace with correct VALUES/BELIEFS questions (Q40-Q45)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: DELETE ALL INCORRECT QUESTIONS IN LAYERS 5, 6, 7
-- ============================================================================

-- Delete Layer 5 incorrect questions (Q26-Q31)
DELETE FROM quiz_options WHERE question_id IN (
    SELECT id FROM quiz_questions WHERE layer_number = 5
);
DELETE FROM quiz_questions WHERE layer_number = 5;

-- Delete Layer 6 incorrect questions (Q32-Q38)
DELETE FROM quiz_options WHERE question_id IN (
    SELECT id FROM quiz_questions WHERE layer_number = 6
);
DELETE FROM quiz_questions WHERE layer_number = 6;

-- Delete Layer 7 incorrect questions (Q39-Q45)
DELETE FROM quiz_options WHERE question_id IN (
    SELECT id FROM quiz_questions WHERE layer_number = 7
);
DELETE FROM quiz_questions WHERE layer_number = 7;

-- ============================================================================
-- STEP 2: INSERT CORRECT LAYER 5 QUESTIONS (NEURODIVERGENCE ASSESSMENT)
-- Q28-Q33: Focus patterns, learning preferences, sensory processing
-- ============================================================================

-- Q28: Focus patterns
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q28', 5, 'Which description sounds most like how your focus naturally works?', 'This question assesses your natural focus patterns and work rhythm preferences.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q28'), 'a', 'I work best with structure and predictable focus cycles', 'Neurotypical pattern: Structured focus'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q28'), 'b', 'I work in waves — routine drains me', 'Neurodivergent pattern: Wave-based focus'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q28'), 'c', 'I get powerful insights but my focus is inconsistent', 'Twice-Exceptional pattern: High insight, inconsistent focus');

-- Q29: Learning and processing
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q29', 5, 'When learning or processing instructions, I usually…', 'This question explores how you process information and instructions.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q29'), 'a', 'Understand most formats easily', 'Neurotypical pattern: Standard processing'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q29'), 'b', 'Prefer alternative inputs (audio, visuals, simplified steps)', 'Neurodivergent pattern: Alternative formats preferred'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q29'), 'c', 'Have strong ideas but struggle with structure or consistency', 'Twice-Exceptional pattern: Strong ideas, execution challenges');

-- Q30: Overstimulation response
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q30', 5, 'When my environment becomes overstimulating, I usually…', 'This question assesses your response to sensory overload and environmental stimulation.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q30'), 'a', 'Adjust and stay mostly grounded', 'Neurotypical pattern: Adaptive to stimulation'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q30'), 'b', 'Get overwhelmed or hyper-focused depending on intensity', 'Neurodivergent pattern: Variable response to stimulation'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q30'), 'c', 'Push through intensely and then crash hard', 'Twice-Exceptional pattern: Intense push then crash');

-- Q31: Task management
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q31', 5, 'Which sounds most like your experience managing tasks?', 'This question explores your natural task management and organizational patterns.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q31'), 'a', 'I can follow plans and stay on track with minor support', 'Neurotypical pattern: Standard task management'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q31'), 'b', 'I rely on reminders, prompts, or timing tools to stay organized', 'Neurodivergent pattern: External support needed'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q31'), 'c', 'I create strong strategies but struggle with execution or consistency', 'Twice-Exceptional pattern: Strategy vs execution gap');

-- Q32: Sensory input effects
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q32', 5, 'Sensory input (noise, clutter, tension) affects me by:', 'This question assesses how sensory input impacts your focus and performance.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q32'), 'a', 'Rarely impacting my focus', 'Neurotypical pattern: Low sensory sensitivity'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q32'), 'b', 'Distracting or energising me depending on intensity', 'Neurodivergent pattern: Variable sensory response'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q32'), 'c', 'Not affecting me when inspired but overwhelming me when tired', 'Twice-Exceptional pattern: State-dependent sensitivity');

-- Q33: Mental endurance
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q33', 5, 'When I push myself mentally for long periods…', 'This question explores your mental endurance patterns and recovery cycles.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q33'), 'a', 'I slow down gradually but stay functional', 'Neurotypical pattern: Gradual decline'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q33'), 'b', 'I speed up, then suddenly drop or lose interest', 'Neurodivergent pattern: Spike then drop'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q33'), 'c', 'I perform extremely well, then hit a hard crash or shutdown', 'Twice-Exceptional pattern: Peak performance then crash');

-- ============================================================================
-- STEP 3: INSERT CORRECT LAYER 6 QUESTIONS (MINDSET & PERSONALITY)
-- Q34-Q39: Growth mindset, abundance mindset, personality traits
-- ============================================================================

-- Q34: Response to challenges (Growth vs Fixed)
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q34', 6, 'When something stretches my abilities, my usual response is to:', 'This question assesses your mindset when facing challenges that push your current capabilities.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q34'), 'a', 'Try to learn or adjust so I can handle it', 'Growth mindset: Embrace challenges as learning opportunities'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q34'), 'b', 'Take a step back and reassess before committing to it', 'Fixed mindset: Cautious approach to stretching abilities');

-- Q35: Resource perception (Abundance vs Scarcity)
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q35', 6, 'When opportunities or resources feel limited, I usually:', 'This question explores your mindset around resources and opportunities.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q35'), 'a', 'Look for alternatives or ways to create more options', 'Abundance mindset: Create opportunities'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q35'), 'b', 'Work with what''s available and stay strategic with it', 'Scarcity mindset: Optimize limited resources');

-- Q36: Approach to unfamiliar (Challenge vs Comfort)
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q36', 6, 'When I face something new or unfamiliar, I tend to:', 'This question assesses your natural response to novelty and unfamiliar situations.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q36'), 'a', 'Explore it and see what I can learn from it', 'Challenge-seeking: Embrace the unfamiliar'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q36'), 'b', 'Start with what feels familiar and build from there', 'Comfort-seeking: Anchor in the familiar');

-- Q37: Self-perception (Confident vs Considerate)
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q37', 6, 'In important situations, I usually show up feeling:', 'This question explores how you perceive yourself in significant moments.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q37'), 'a', 'Clear about what I bring to the table', 'Confident: Clear self-awareness'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q37'), 'b', 'Thoughtful and reflective before stepping in', 'Considerate: Reflective approach');

-- Q38: Work pace (Steady vs Fast)
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q38', 6, 'When I''m working toward something meaningful, my natural pace is:', 'This question assesses your natural tempo when pursuing important goals.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q38'), 'a', 'Steady — I like to build things properly', 'Steady pace: Methodical builder'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q38'), 'b', 'Fast — I like to move things forward quickly', 'Fast pace: Quick mover');

-- Q39: Communication style (Direct vs Diplomatic)
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q39', 6, 'When something matters to me, I tend to communicate in a way that:', 'This question explores your natural communication style in important matters.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q39'), 'a', 'Gets the point across clearly, even if it''s direct', 'Direct communicator: Clear and straightforward'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q39'), 'b', 'Maintains harmony and keeps the interaction smooth', 'Diplomatic communicator: Harmony-focused');

-- ============================================================================
-- STEP 4: INSERT CORRECT LAYER 7 QUESTIONS (VALUES & BELIEFS)
-- Q40-Q45: Locus of control, fairness, honesty, growth, impact
-- ============================================================================

-- Q40: Source of grounding (Self-Reliant vs Faith-Reliant vs Dual)
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q40', 7, 'When life feels uncertain, I usually find grounding through:', 'This question explores where you find stability and grounding during uncertain times.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q40'), 'a', 'My own reasoning, planning, and personal responsibility', 'Self-Reliant: Internal locus of control'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q40'), 'b', 'Trusting a higher purpose, spiritual guidance, or divine timing', 'Faith-Reliant: External spiritual guidance'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q40'), 'c', 'A mix — I do my part, and trust the rest to unfold as it should', 'Dual-Reliant: Balanced approach');

-- Q41: Locus of control (Internal vs External vs Shared)
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q41', 7, 'When I think about my future, I mainly believe that:', 'This question assesses your beliefs about control and influence over your life outcomes.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q41'), 'a', 'My actions and choices shape most of my outcomes', 'I''m In Control: Internal locus'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q41'), 'b', 'Circumstances, timing, or external forces play a big role', 'Life Influences Me: External locus'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q41'), 'c', 'Both — my choices matter, but so do external factors and timing', 'Shared Control: Balanced view');

-- Q42: Fairness philosophy (Responsibility vs Compassion vs Balanced)
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q42', 7, 'When I think about fairness in the world, I tend to believe:', 'This question explores your core beliefs about fairness and justice.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q42'), 'a', 'Fairness is created when people take personal responsibility', 'Responsibility-focused: Individual accountability'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q42'), 'b', 'Fairness depends on compassion, support, and equity', 'Compassion-focused: Collective support'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q42'), 'c', 'Fairness comes from a balance of responsibility and shared support', 'Balanced: Both individual and collective');

-- Q43: Honesty style (Direct vs Gentle vs Balanced)
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q43', 7, 'When faced with a difficult choice, I usually prioritise:', 'This question assesses how you balance honesty with consideration for others.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q43'), 'a', 'Being honest and transparent, even when it''s uncomfortable', 'Direct Honesty: Truth-first approach'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q43'), 'b', 'Protecting people''s feelings and handling truths carefully', 'Gentle Honesty: Feelings-first approach'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q43'), 'c', 'Staying honest, but communicating it with care and respect', 'Balanced Honesty: Truth with care');

-- Q44: Growth orientation (Growth vs Comfort vs Steady)
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q44', 7, 'When I face a situation that pushes me outside my comfort zone, I usually:', 'This question explores your approach to personal growth and comfort zones.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q44'), 'a', 'Look for what I can learn or improve', 'Growth Focused: Learning-oriented'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q44'), 'b', 'Take it slowly and move at a pace that feels comfortable', 'Comfort Focused: Pace-conscious'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q44'), 'c', 'Mix both — I stretch myself, but in a steady, manageable way', 'Steady Growth: Balanced approach');

-- Q45: Impact motivation (Self vs Others vs Shared)
INSERT INTO quiz_questions (question_number, layer_number, question_text, question_description, archetype_filter)
VALUES ('Q45', 7, 'When I think about the impact I want to make, I''m most motivated by:', 'This question assesses what drives your desire to make an impact in the world.', NULL);

INSERT INTO quiz_options (question_id, option_letter, option_text, option_description)
VALUES 
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q45'), 'a', 'Achieving results that improve my life and the lives of those closest to me', 'Self-Focused Impact: Personal circle priority'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q45'), 'b', 'Helping others, supporting people, or being part of something bigger', 'Others-Focused Impact: Collective priority'),
    ((SELECT id FROM quiz_questions WHERE question_number = 'Q45'), 'c', 'Creating success that supports both my growth and the people around me', 'Shared Impact: Balanced priority');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify Layer 5 questions (should be 6 questions: Q28-Q33)
SELECT 'Layer 5 Questions' as verification, question_number, LEFT(question_text, 60) as preview
FROM quiz_questions 
WHERE layer_number = 5 
ORDER BY question_number;

-- Verify Layer 6 questions (should be 6 questions: Q34-Q39)
SELECT 'Layer 6 Questions' as verification, question_number, LEFT(question_text, 60) as preview
FROM quiz_questions 
WHERE layer_number = 6 
ORDER BY question_number;

-- Verify Layer 7 questions (should be 6 questions: Q40-Q45)
SELECT 'Layer 7 Questions' as verification, question_number, LEFT(question_text, 60) as preview
FROM quiz_questions 
WHERE layer_number = 7 
ORDER BY question_number;

-- Verify total question count per layer
SELECT layer_number, COUNT(*) as question_count
FROM quiz_questions
GROUP BY layer_number
ORDER BY layer_number;

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
