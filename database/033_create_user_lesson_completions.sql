-- ============================================
-- user_lesson_completions: track lesson completion per user
-- Used for is_completed in GET lessons / program content.
-- ============================================

CREATE TABLE IF NOT EXISTS user_lesson_completions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_user_lesson_completions_user_id ON user_lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_completions_lesson_id ON user_lesson_completions(lesson_id);
