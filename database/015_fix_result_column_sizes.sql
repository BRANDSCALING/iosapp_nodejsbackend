-- Fix layer result column sizes
ALTER TABLE user_quiz_results ALTER COLUMN layer3_result TYPE VARCHAR(500);
ALTER TABLE user_quiz_results ALTER COLUMN layer4_result TYPE VARCHAR(500);
ALTER TABLE user_quiz_results ALTER COLUMN layer5_result TYPE VARCHAR(500);
ALTER TABLE user_quiz_results ALTER COLUMN layer6_result TYPE VARCHAR(500);
ALTER TABLE user_quiz_results ALTER COLUMN layer7_result TYPE VARCHAR(500);

-- Verify
SELECT column_name, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'user_quiz_results' 
AND column_name LIKE '%_result';


