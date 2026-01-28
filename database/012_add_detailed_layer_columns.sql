-- ============================================
-- Add Detailed Layer Columns for All 7 Layers
-- This adds specific fields for each layer instead of generic JSONB
-- ============================================

-- Check current columns first (for reference)
SELECT 'Current user_quiz_results columns:' as info;

-- Layer 1 additional fields (Core Identity)
ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer1_decision_loop TEXT,
ADD COLUMN IF NOT EXISTS layer1_decision_process TEXT;

-- Layer 2 additional fields (Subtype)
ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer2_strength TEXT,
ADD COLUMN IF NOT EXISTS layer2_blind_spot TEXT;

-- Layer 3 detailed fields (Mirror Awareness / Integration)
ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer3_integration TEXT,
ADD COLUMN IF NOT EXISTS layer3_integration_percent INTEGER,
ADD COLUMN IF NOT EXISTS layer3_description TEXT;

-- Layer 4 detailed fields (Learning Style)
ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer4_modality_preference TEXT,
ADD COLUMN IF NOT EXISTS layer4_approach TEXT,
ADD COLUMN IF NOT EXISTS layer4_concept_processing TEXT,
ADD COLUMN IF NOT EXISTS layer4_working_environment TEXT,
ADD COLUMN IF NOT EXISTS layer4_pace TEXT;

-- Layer 5 detailed fields (Neurodiversity)
ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer5_status TEXT,
ADD COLUMN IF NOT EXISTS layer5_description TEXT,
ADD COLUMN IF NOT EXISTS layer5_traits JSONB;

-- Layer 6 detailed fields (Mindset & Personality)
ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer6_mindset JSONB,
ADD COLUMN IF NOT EXISTS layer6_personality JSONB,
ADD COLUMN IF NOT EXISTS layer6_communication TEXT;

-- Layer 7 detailed fields (Meta-Beliefs / Core Values)
ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS layer7_faith_orientation TEXT,
ADD COLUMN IF NOT EXISTS layer7_control_orientation TEXT,
ADD COLUMN IF NOT EXISTS layer7_fairness TEXT,
ADD COLUMN IF NOT EXISTS layer7_integrity TEXT,
ADD COLUMN IF NOT EXISTS layer7_growth TEXT,
ADD COLUMN IF NOT EXISTS layer7_impact TEXT;

-- Verify columns were added
SELECT 'After migration - New columns added:' as info;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_quiz_results'
ORDER BY ordinal_position;

-- Success message
SELECT 'Migration complete! All 7 layer columns added successfully.' as status;


