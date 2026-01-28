-- ============================================
-- Migration: Add Missing Layer Columns
-- ============================================
-- Currently: 16 layer columns exist
-- Adding: 22 new specific columns
-- Total after: ~38 layer columns
-- ============================================

-- Layer 1: Add missing columns (decision loop and process)
ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer1_decision_loop TEXT,
ADD COLUMN IF NOT EXISTS layer1_decision_process TEXT;

-- Layer 2: Add missing columns (strength and blind spot)
ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer2_strength TEXT,
ADD COLUMN IF NOT EXISTS layer2_blind_spot TEXT;

-- Layer 3: Add missing columns (integration details)
ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer3_integration TEXT,
ADD COLUMN IF NOT EXISTS layer3_integration_percent INTEGER;

-- Layer 4: Add missing columns (learning style preferences)
ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer4_modality_preference TEXT,
ADD COLUMN IF NOT EXISTS layer4_approach TEXT,
ADD COLUMN IF NOT EXISTS layer4_concept_processing TEXT,
ADD COLUMN IF NOT EXISTS layer4_working_environment TEXT,
ADD COLUMN IF NOT EXISTS layer4_pace TEXT;

-- Layer 5: Add missing columns (neurodiversity details)
ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer5_status TEXT,
ADD COLUMN IF NOT EXISTS layer5_traits JSONB;

-- Layer 6: Add missing columns (mindset and personality)
ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer6_mindset JSONB,
ADD COLUMN IF NOT EXISTS layer6_personality JSONB,
ADD COLUMN IF NOT EXISTS layer6_communication TEXT;

-- Layer 7: Add missing columns (meta-beliefs / core values)
ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer7_faith_orientation TEXT,
ADD COLUMN IF NOT EXISTS layer7_control_orientation TEXT,
ADD COLUMN IF NOT EXISTS layer7_fairness TEXT,
ADD COLUMN IF NOT EXISTS layer7_integrity TEXT,
ADD COLUMN IF NOT EXISTS layer7_growth TEXT,
ADD COLUMN IF NOT EXISTS layer7_impact TEXT;

-- ============================================
-- Verification Query
-- ============================================

SELECT 'MIGRATION COMPLETE - Layer columns:' as status;

SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'user_quiz_results' 
AND column_name LIKE 'layer%'
ORDER BY column_name;

-- Count columns per layer
SELECT 
  'Column counts by layer:' as info,
  COUNT(*) FILTER (WHERE column_name LIKE 'layer1%') as layer1,
  COUNT(*) FILTER (WHERE column_name LIKE 'layer2%') as layer2,
  COUNT(*) FILTER (WHERE column_name LIKE 'layer3%') as layer3,
  COUNT(*) FILTER (WHERE column_name LIKE 'layer4%') as layer4,
  COUNT(*) FILTER (WHERE column_name LIKE 'layer5%') as layer5,
  COUNT(*) FILTER (WHERE column_name LIKE 'layer6%') as layer6,
  COUNT(*) FILTER (WHERE column_name LIKE 'layer7%') as layer7,
  COUNT(*) as total
FROM information_schema.columns 
WHERE table_name = 'user_quiz_results' 
AND column_name LIKE 'layer%';


