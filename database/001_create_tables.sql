-- ============================================
-- BrandScaling E-DNA Quiz Database Setup
-- File: 001_create_tables.sql
-- Description: Creates all 6 tables with indexes and triggers
-- ============================================

-- Drop existing tables (in reverse dependency order)
DROP TABLE IF EXISTS user_quiz_results CASCADE;
DROP TABLE IF EXISTS user_quiz_progress CASCADE;
DROP TABLE IF EXISTS quiz_sessions CASCADE;
DROP TABLE IF EXISTS quiz_options CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS layer_intro_content CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS calculate_retake_available_at() CASCADE;

-- ============================================
-- Helper Functions
-- ============================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate retake_available_at (7 days from completed_at)
CREATE OR REPLACE FUNCTION calculate_retake_available_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.retake_available_at = NEW.completed_at + INTERVAL '7 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Table 1: quiz_questions
-- ============================================

CREATE TABLE quiz_questions (
    id SERIAL PRIMARY KEY,
    layer_number INTEGER NOT NULL CHECK (layer_number >= 1 AND layer_number <= 7),
    question_number VARCHAR(10) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50),
    weight INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster layer queries
CREATE INDEX idx_quiz_questions_layer ON quiz_questions(layer_number);

-- Trigger for updated_at
CREATE TRIGGER update_quiz_questions_updated_at
    BEFORE UPDATE ON quiz_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE quiz_questions IS 'Stores all quiz questions across 7 layers';

-- ============================================
-- Table 2: quiz_options
-- ============================================

CREATE TABLE quiz_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_key VARCHAR(10) NOT NULL,
    option_text TEXT NOT NULL,
    option_description TEXT,
    score_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster question lookups
CREATE INDEX idx_quiz_options_question ON quiz_options(question_id);

-- Trigger for updated_at
CREATE TRIGGER update_quiz_options_updated_at
    BEFORE UPDATE ON quiz_options
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE quiz_options IS 'Stores answer options for each question';

-- ============================================
-- Table 3: quiz_sessions
-- ============================================

CREATE TABLE quiz_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for user and completion status
CREATE INDEX idx_quiz_sessions_user ON quiz_sessions(user_id);
CREATE INDEX idx_quiz_sessions_completed ON quiz_sessions(is_completed);

-- Trigger for updated_at
CREATE TRIGGER update_quiz_sessions_updated_at
    BEFORE UPDATE ON quiz_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE quiz_sessions IS 'Tracks individual quiz-taking sessions';

-- ============================================
-- Table 4: user_quiz_progress
-- ============================================

CREATE TABLE user_quiz_progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_option_id INTEGER NOT NULL REFERENCES quiz_options(id) ON DELETE CASCADE,
    layer_number INTEGER NOT NULL CHECK (layer_number >= 1 AND layer_number <= 7),
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Unique constraint: one answer per question per session
    UNIQUE(session_id, question_id)
);

-- Indexes for faster lookups
CREATE INDEX idx_user_quiz_progress_user ON user_quiz_progress(user_id);
CREATE INDEX idx_user_quiz_progress_session ON user_quiz_progress(session_id);
CREATE INDEX idx_user_quiz_progress_layer ON user_quiz_progress(layer_number);

-- Trigger for updated_at
CREATE TRIGGER update_user_quiz_progress_updated_at
    BEFORE UPDATE ON user_quiz_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_quiz_progress IS 'Stores user answers during quiz-taking';

-- ============================================
-- Table 5: user_quiz_results
-- ============================================

CREATE TABLE user_quiz_results (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    -- Layer 1 Results
    layer1_core_type VARCHAR(50),
    layer1_strength VARCHAR(50),
    layer1_architect_score INTEGER,
    layer1_alchemist_score INTEGER,
    -- Layer 2 Results
    layer2_subtype VARCHAR(100),
    layer2_description TEXT,
    -- Layers 3-7 Results (JSONB for flexibility)
    layer3_result JSONB,
    layer4_result JSONB,
    layer5_result JSONB,
    layer6_result JSONB,
    layer7_result JSONB,
    -- Timestamps
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    retake_available_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster lookups
CREATE INDEX idx_user_quiz_results_user ON user_quiz_results(user_id);
CREATE INDEX idx_user_quiz_results_session ON user_quiz_results(session_id);
CREATE INDEX idx_user_quiz_results_completed ON user_quiz_results(completed_at);

-- Trigger for updated_at
CREATE TRIGGER update_user_quiz_results_updated_at
    BEFORE UPDATE ON user_quiz_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-calculate retake_available_at
CREATE TRIGGER calculate_retake_date
    BEFORE INSERT OR UPDATE OF completed_at ON user_quiz_results
    FOR EACH ROW
    WHEN (NEW.completed_at IS NOT NULL)
    EXECUTE FUNCTION calculate_retake_available_at();

COMMENT ON TABLE user_quiz_results IS 'Stores completed quiz results with 7-day retake restriction';

-- ============================================
-- Table 6: layer_intro_content
-- ============================================

CREATE TABLE layer_intro_content (
    id SERIAL PRIMARY KEY,
    layer_number INTEGER NOT NULL UNIQUE CHECK (layer_number >= 1 AND layer_number <= 7),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
CREATE TRIGGER update_layer_intro_content_updated_at
    BEFORE UPDATE ON layer_intro_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE layer_intro_content IS 'Introduction content for each quiz layer';

-- ============================================
-- Verification Queries
-- ============================================

-- Verify all tables exist
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name IN (
    'quiz_questions', 
    'quiz_options', 
    'quiz_sessions', 
    'user_quiz_progress', 
    'user_quiz_results', 
    'layer_intro_content'
)
ORDER BY table_name;

-- Verify triggers exist
SELECT 
    trigger_name,
    event_object_table as table_name,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Verify indexes exist
SELECT
    indexname,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- Setup Complete Message
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '  ✅ Database Tables Created Successfully!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '  Tables: 6';
    RAISE NOTICE '  Triggers: 7 (6 updated_at + 1 retake_date)';
    RAISE NOTICE '  Indexes: 10 custom indexes';
    RAISE NOTICE '============================================';
END $$;


