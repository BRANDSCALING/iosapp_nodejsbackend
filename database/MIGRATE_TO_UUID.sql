-- ============================================
-- MIGRATION: Convert INTEGER IDs to UUID
-- BrandScaling Database Schema Update
-- ============================================

-- This script will:
-- 1. Drop all existing tables
-- 2. Recreate with UUID primary keys
-- 3. Ready for data insertion with UUID format

-- ============================================
-- STEP 1: Drop all existing tables
-- ============================================

DROP TABLE IF EXISTS user_quiz_results CASCADE;
DROP TABLE IF EXISTS user_quiz_progress CASCADE;
DROP TABLE IF EXISTS quiz_sessions CASCADE;
DROP TABLE IF EXISTS quiz_options CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;

-- ============================================
-- STEP 2: Create quiz_questions with UUID
-- ============================================

CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layer_number INTEGER NOT NULL CHECK (layer_number BETWEEN 1 AND 7),
    question_number VARCHAR(10) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20),
    weight INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(layer_number, question_number)
);

CREATE INDEX idx_questions_layer ON quiz_questions(layer_number);
CREATE INDEX idx_questions_type ON quiz_questions(question_type);

-- ============================================
-- STEP 3: Create quiz_options with UUID
-- ============================================

CREATE TABLE quiz_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_key VARCHAR(5) NOT NULL,
    option_text TEXT NOT NULL,
    option_description TEXT,
    score_type VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, option_key)
);

CREATE INDEX idx_options_question ON quiz_options(question_id);

-- ============================================
-- STEP 4: Create quiz_sessions (already UUID)
-- ============================================

CREATE TABLE quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON quiz_sessions(user_id);
CREATE INDEX idx_sessions_completed ON quiz_sessions(is_completed);

-- ============================================
-- STEP 5: Create user_quiz_progress with UUID references
-- ============================================

CREATE TABLE user_quiz_progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES quiz_questions(id),
    selected_option_id UUID NOT NULL REFERENCES quiz_options(id),
    layer_number INTEGER NOT NULL,
    answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE,
    UNIQUE(session_id, question_id)
);

CREATE INDEX idx_progress_user ON user_quiz_progress(user_id);
CREATE INDEX idx_progress_session ON user_quiz_progress(session_id);
CREATE INDEX idx_progress_layer ON user_quiz_progress(layer_number);

-- ============================================
-- STEP 6: Create user_quiz_results
-- ============================================

CREATE TABLE user_quiz_results (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    
    -- Layer 1: Decision Identity
    layer1_core_type VARCHAR(50),
    layer1_strength VARCHAR(50),
    layer1_architect_score INTEGER,
    layer1_alchemist_score INTEGER,
    
    -- Layer 2: Execution Style
    layer2_subtype VARCHAR(50),
    layer2_description TEXT,
    
    -- Layer 3: Communication Approach
    layer3_result VARCHAR(50),
    layer3_description TEXT,
    
    -- Layer 4: Decision-Making Process
    layer4_result VARCHAR(50),
    layer4_description TEXT,
    
    -- Layer 5: Value System
    layer5_result VARCHAR(50),
    layer5_description TEXT,
    
    -- Layer 6: Growth Pattern
    layer6_result VARCHAR(50),
    layer6_description TEXT,
    
    -- Layer 7: Legacy Vision
    layer7_result VARCHAR(50),
    layer7_description TEXT,
    
    -- Metadata
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retake_available_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, session_id)
);

CREATE INDEX idx_results_user ON user_quiz_results(user_id);
CREATE INDEX idx_results_session ON user_quiz_results(session_id);
CREATE INDEX idx_results_completed ON user_quiz_results(completed_at);

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================

-- Next steps:
-- 1. Run this migration script
-- 2. Insert quiz data with UUID format
-- 3. Test iOS app - should work perfectly!

SELECT 'Migration completed successfully! Tables recreated with UUID primary keys.' AS status;
