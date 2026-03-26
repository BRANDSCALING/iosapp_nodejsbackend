ALTER TABLE user_quiz_results
ADD COLUMN IF NOT EXISTS full_result_purchased BOOLEAN DEFAULT false;
