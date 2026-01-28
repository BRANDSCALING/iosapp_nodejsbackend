-- ============================================
-- Migration: Fix Column Sizes
-- ============================================
-- Problem: Some VARCHAR columns are too small (50 chars)
-- Solution: Increase to VARCHAR(100-200) or TEXT
-- ============================================

-- Layer 1: Core Identity
ALTER TABLE user_quiz_results ALTER COLUMN layer1_core_type TYPE VARCHAR(100);
ALTER TABLE user_quiz_results ALTER COLUMN layer1_strength TYPE VARCHAR(100);
ALTER TABLE user_quiz_results ALTER COLUMN layer1_decision_loop TYPE VARCHAR(200);
ALTER TABLE user_quiz_results ALTER COLUMN layer1_decision_process TYPE VARCHAR(200);

-- Layer 2: Subtype
ALTER TABLE user_quiz_results ALTER COLUMN layer2_subtype TYPE VARCHAR(200);
ALTER TABLE user_quiz_results ALTER COLUMN layer2_description TYPE TEXT;
ALTER TABLE user_quiz_results ALTER COLUMN layer2_strength TYPE VARCHAR(200);
ALTER TABLE user_quiz_results ALTER COLUMN layer2_blind_spot TYPE VARCHAR(200);

-- Layer 3: Mirror Awareness
ALTER TABLE user_quiz_results ALTER COLUMN layer3_integration TYPE VARCHAR(100);
ALTER TABLE user_quiz_results ALTER COLUMN layer3_description TYPE TEXT;

-- Layer 4: Learning Style
ALTER TABLE user_quiz_results ALTER COLUMN layer4_modality_preference TYPE VARCHAR(100);
ALTER TABLE user_quiz_results ALTER COLUMN layer4_approach TYPE VARCHAR(100);
ALTER TABLE user_quiz_results ALTER COLUMN layer4_concept_processing TYPE VARCHAR(100);
ALTER TABLE user_quiz_results ALTER COLUMN layer4_working_environment TYPE VARCHAR(100);
ALTER TABLE user_quiz_results ALTER COLUMN layer4_pace TYPE VARCHAR(100);

-- Layer 5: Neurodiversity
ALTER TABLE user_quiz_results ALTER COLUMN layer5_status TYPE VARCHAR(100);
ALTER TABLE user_quiz_results ALTER COLUMN layer5_description TYPE TEXT;

-- Layer 6: Mindset & Personality
ALTER TABLE user_quiz_results ALTER COLUMN layer6_communication TYPE VARCHAR(200);

-- Layer 7: Meta-Beliefs
ALTER TABLE user_quiz_results ALTER COLUMN layer7_faith_orientation TYPE VARCHAR(200);
ALTER TABLE user_quiz_results ALTER COLUMN layer7_control_orientation TYPE VARCHAR(200);
ALTER TABLE user_quiz_results ALTER COLUMN layer7_fairness TYPE VARCHAR(200);
ALTER TABLE user_quiz_results ALTER COLUMN layer7_integrity TYPE VARCHAR(200);
ALTER TABLE user_quiz_results ALTER COLUMN layer7_growth TYPE VARCHAR(200);
ALTER TABLE user_quiz_results ALTER COLUMN layer7_impact TYPE VARCHAR(200);

-- ============================================
-- Verification
-- ============================================

SELECT 'Migration complete! Column sizes updated:' as status;

SELECT 
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'user_quiz_results' 
AND column_name LIKE 'layer%'
ORDER BY column_name;


