-- ============================================
-- Migration: Add archetype_filter column to quiz_questions
-- ============================================
-- This column is essential for Layer 2 to work correctly
-- Layer 2 has different questions for Architect, Alchemist, and Mixed types
-- ============================================

-- Add the archetype_filter column
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS archetype_filter VARCHAR(50);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quiz_questions_archetype_filter 
ON quiz_questions(archetype_filter);

-- Add composite index for layer + archetype queries
CREATE INDEX IF NOT EXISTS idx_quiz_questions_layer_archetype 
ON quiz_questions(layer_number, archetype_filter);

-- Verify the column was added
SELECT 'Column added successfully!' as status;

SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'quiz_questions' 
AND column_name = 'archetype_filter';

-- Show current question counts per layer
SELECT 'Current question counts:' as info;
SELECT layer_number, COUNT(*) as question_count 
FROM quiz_questions 
GROUP BY layer_number 
ORDER BY layer_number;


