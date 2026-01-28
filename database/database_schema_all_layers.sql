-- ============================================
-- DATABASE SCHEMA FOR ALL 7 LAYERS
-- ============================================
-- Run this FIRST before any other implementation
-- ============================================

-- Check current schema
\d user_quiz_results

-- ============================================
-- STEP 1: ADD LAYER 1 ADDITIONAL FIELDS
-- ============================================

ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer1_decision_loop TEXT,
ADD COLUMN IF NOT EXISTS layer1_decision_process TEXT;

-- ============================================
-- STEP 2: ADD LAYER 2 FIELDS (EXECUTION STYLE)
-- ============================================

ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer2_description TEXT,
ADD COLUMN IF NOT EXISTS layer2_strength TEXT,
ADD COLUMN IF NOT EXISTS layer2_blind_spot TEXT;

-- ============================================
-- STEP 3: ADD LAYER 3 FIELDS (MIRROR AWARENESS)
-- ============================================

ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer3_integration VARCHAR(50),
ADD COLUMN IF NOT EXISTS layer3_integration_percent INTEGER,
ADD COLUMN IF NOT EXISTS layer3_description TEXT;

-- ============================================
-- STEP 4: ADD LAYER 4 FIELDS (LEARNING STYLE)
-- ============================================

ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer4_modality_preference VARCHAR(50),
ADD COLUMN IF NOT EXISTS layer4_approach VARCHAR(50),
ADD COLUMN IF NOT EXISTS layer4_concept_processing VARCHAR(50),
ADD COLUMN IF NOT EXISTS layer4_working_environment VARCHAR(50),
ADD COLUMN IF NOT EXISTS layer4_pace VARCHAR(50);

-- ============================================
-- STEP 5: ADD LAYER 5 FIELDS (NEURODIVERSITY)
-- ============================================

ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer5_status VARCHAR(100),
ADD COLUMN IF NOT EXISTS layer5_description TEXT,
ADD COLUMN IF NOT EXISTS layer5_traits JSONB;

-- ============================================
-- STEP 6: ADD LAYER 6 FIELDS (MINDSET & PERSONALITY)
-- ============================================

ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer6_mindset JSONB,
ADD COLUMN IF NOT EXISTS layer6_personality JSONB,
ADD COLUMN IF NOT EXISTS layer6_communication VARCHAR(100);

-- ============================================
-- STEP 7: ADD LAYER 7 FIELDS (META-BELIEFS)
-- ============================================

ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer7_faith_orientation VARCHAR(100),
ADD COLUMN IF NOT EXISTS layer7_control_orientation VARCHAR(100),
ADD COLUMN IF NOT EXISTS layer7_fairness VARCHAR(100),
ADD COLUMN IF NOT EXISTS layer7_integrity VARCHAR(100),
ADD COLUMN IF NOT EXISTS layer7_growth VARCHAR(100),
ADD COLUMN IF NOT EXISTS layer7_impact VARCHAR(100);

-- ============================================
-- STEP 8: ADD INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id 
ON user_quiz_results(user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_results_completed_at 
ON user_quiz_results(completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_results_layer1_core_type 
ON user_quiz_results(layer1_core_type);

-- ============================================
-- STEP 9: VERIFY SCHEMA
-- ============================================

-- Check all columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_quiz_results'
ORDER BY ordinal_position;

-- ============================================
-- STEP 10: TEST QUERY
-- ============================================

-- This query should return all 7 layers for a user
SELECT 
  -- Layer 1
  layer1_core_type,
  layer1_strength,
  layer1_architect_score,
  layer1_alchemist_score,
  layer1_decision_loop,
  layer1_decision_process,
  
  -- Layer 2
  layer2_subtype,
  layer2_description,
  layer2_strength,
  layer2_blind_spot,
  
  -- Layer 3
  layer3_integration,
  layer3_integration_percent,
  layer3_description,
  
  -- Layer 4
  layer4_modality_preference,
  layer4_approach,
  layer4_concept_processing,
  layer4_working_environment,
  layer4_pace,
  
  -- Layer 5
  layer5_status,
  layer5_description,
  layer5_traits,
  
  -- Layer 6
  layer6_mindset,
  layer6_personality,
  layer6_communication,
  
  -- Layer 7
  layer7_faith_orientation,
  layer7_control_orientation,
  layer7_fairness,
  layer7_integrity,
  layer7_growth,
  layer7_impact,
  
  -- Metadata
  completed_at,
  created_at
FROM user_quiz_results
WHERE user_id = 'YOUR_TEST_USER_ID'
ORDER BY completed_at DESC
LIMIT 1;

-- ============================================
-- EXPECTED RESULT AFTER iOS IMPLEMENTATION
-- ============================================

-- All fields should have values (not NULL)
-- Example:
/*
layer1_core_type: 'architect'
layer1_strength: 'strong'
layer1_architect_score: 8
layer1_alchemist_score: 0
layer2_subtype: 'Master Strategist'
layer2_description: 'Sees the world as a sequence of moves'
layer3_integration: 'HIGH'
layer3_integration_percent: 85
layer4_modality_preference: 'Visual'
layer4_approach: 'Sequential'
layer5_status: 'Neurotypical'
layer6_mindset: '["Growth", "Abundance"]'
layer6_personality: '["Confident & Steady"]'
layer6_communication: 'Direct Communicator'
layer7_faith_orientation: 'Self-Reliant'
layer7_control_orientation: 'I\'m In Control'
... etc
*/

-- ============================================
-- ROLLBACK (IF NEEDED)
-- ============================================

-- ONLY USE THIS IF YOU NEED TO UNDO THE CHANGES
-- WARNING: This will delete the columns and their data!

/*
ALTER TABLE user_quiz_results 
DROP COLUMN IF EXISTS layer1_decision_loop,
DROP COLUMN IF EXISTS layer1_decision_process,
DROP COLUMN IF EXISTS layer2_description,
DROP COLUMN IF EXISTS layer2_strength,
DROP COLUMN IF EXISTS layer2_blind_spot,
DROP COLUMN IF EXISTS layer3_integration,
DROP COLUMN IF EXISTS layer3_integration_percent,
DROP COLUMN IF EXISTS layer3_description,
DROP COLUMN IF EXISTS layer4_modality_preference,
DROP COLUMN IF EXISTS layer4_approach,
DROP COLUMN IF EXISTS layer4_concept_processing,
DROP COLUMN IF EXISTS layer4_working_environment,
DROP COLUMN IF EXISTS layer4_pace,
DROP COLUMN IF EXISTS layer5_status,
DROP COLUMN IF EXISTS layer5_description,
DROP COLUMN IF EXISTS layer5_traits,
DROP COLUMN IF EXISTS layer6_mindset,
DROP COLUMN IF EXISTS layer6_personality,
DROP COLUMN IF EXISTS layer6_communication,
DROP COLUMN IF EXISTS layer7_faith_orientation,
DROP COLUMN IF EXISTS layer7_control_orientation,
DROP COLUMN IF EXISTS layer7_fairness,
DROP COLUMN IF EXISTS layer7_integrity,
DROP COLUMN IF EXISTS layer7_growth,
DROP COLUMN IF EXISTS layer7_impact;
*/

-- ============================================
-- NOTES
-- ============================================

-- 1. Run this script BEFORE implementing iOS/Backend changes
-- 2. All columns use IF NOT EXISTS to be safe
-- 3. JSONB columns for arrays (traits, mindset, personality)
-- 4. VARCHAR for single values
-- 5. TEXT for long descriptions
-- 6. INTEGER for scores and percentages
-- 7. Indexes added for common queries

-- ============================================
-- END OF SCHEMA
-- ============================================
