-- ============================================
-- BrandScaling Workbook Tables
-- File: 006_create_workbook_tables.sql
-- Description: Creates workbook-related tables for admin portal
--              workbook upload and user progress tracking
-- ============================================

-- ============================================
-- Table 1: tier_rank
-- Purpose: Lookup table for tier ranking used for workbook access control
--          Higher rank = more access privileges
-- ============================================

CREATE TABLE IF NOT EXISTS tier_rank (
    tier VARCHAR(50) PRIMARY KEY,
    rank INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE tier_rank IS 'Lookup table for subscription tier rankings - used for workbook access control';
COMMENT ON COLUMN tier_rank.tier IS 'Tier name (free, basic, standard, pro, elite)';
COMMENT ON COLUMN tier_rank.rank IS 'Tier ranking (1-5) - higher rank means more access';

-- Insert default tier data
INSERT INTO tier_rank (tier, rank) VALUES
    ('free', 1),
    ('basic', 2),
    ('standard', 3),
    ('pro', 4),
    ('elite', 5)
ON CONFLICT (tier) DO NOTHING;

-- ============================================
-- Table 2: workbooks
-- Purpose: Stores workbook templates uploaded by admins
--          Contains the parsed JSON structure of uploaded workbooks
-- ============================================

CREATE TABLE IF NOT EXISTS workbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    json_structure JSONB NOT NULL,
    type_id VARCHAR(50),
    tier VARCHAR(50),
    original_filename VARCHAR(255),
    file_type VARCHAR(50),
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_workbooks_tier 
        FOREIGN KEY (tier) REFERENCES tier_rank(tier) ON DELETE SET NULL,
    CONSTRAINT fk_workbooks_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE workbooks IS 'Workbook templates uploaded by admins - contains parsed structure from uploaded files';
COMMENT ON COLUMN workbooks.name IS 'Admin-assigned internal name for the workbook';
COMMENT ON COLUMN workbooks.title IS 'Display title shown to users';
COMMENT ON COLUMN workbooks.json_structure IS 'Parsed workbook structure containing pages, sections, and fields';
COMMENT ON COLUMN workbooks.type_id IS 'E-DNA type targeting (architect, alchemist, or mixed)';
COMMENT ON COLUMN workbooks.tier IS 'Minimum subscription tier required to access this workbook';
COMMENT ON COLUMN workbooks.original_filename IS 'Original uploaded file name';
COMMENT ON COLUMN workbooks.file_type IS 'MIME type of the original file';
COMMENT ON COLUMN workbooks.created_by IS 'Admin user who uploaded this workbook';

-- Index for filtering workbooks by type and tier
CREATE INDEX IF NOT EXISTS idx_workbooks_type_tier 
    ON workbooks(type_id, tier);

-- ============================================
-- Table 3: workbook_instances
-- Purpose: User-specific workbook copies
--          Each user gets their own instance of a workbook to track progress
-- ============================================

CREATE TABLE IF NOT EXISTS workbook_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    workbook_id UUID NOT NULL,
    data JSONB DEFAULT '{}',
    last_saved_at TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_workbook_instances_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_workbook_instances_workbook 
        FOREIGN KEY (workbook_id) REFERENCES workbooks(id) ON DELETE CASCADE,
    
    -- One instance per user per workbook
    CONSTRAINT unique_user_workbook 
        UNIQUE (user_id, workbook_id)
);

COMMENT ON TABLE workbook_instances IS 'User-specific workbook copies - tracks individual user progress on each workbook';
COMMENT ON COLUMN workbook_instances.user_id IS 'The user who owns this workbook instance';
COMMENT ON COLUMN workbook_instances.workbook_id IS 'The template workbook this instance is based on';
COMMENT ON COLUMN workbook_instances.data IS 'Completion metadata (e.g., progress percentage, completed sections)';
COMMENT ON COLUMN workbook_instances.last_saved_at IS 'Timestamp of last user activity on this workbook';

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workbook_instances_user_id 
    ON workbook_instances(user_id);

CREATE INDEX IF NOT EXISTS idx_workbook_instances_workbook_id 
    ON workbook_instances(workbook_id);

CREATE INDEX IF NOT EXISTS idx_workbook_instances_last_saved_at 
    ON workbook_instances(last_saved_at DESC);

-- ============================================
-- Table 4: workbook_answers
-- Purpose: Individual field answers within a workbook instance
--          Stores each answer separately for granular tracking
-- ============================================

CREATE TABLE IF NOT EXISTS workbook_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL,
    field_key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_workbook_answers_instance 
        FOREIGN KEY (instance_id) REFERENCES workbook_instances(id) ON DELETE CASCADE,
    
    -- One answer per field per instance
    CONSTRAINT unique_instance_field 
        UNIQUE (instance_id, field_key)
);

COMMENT ON TABLE workbook_answers IS 'Individual field answers within workbook instances - allows granular save/restore';
COMMENT ON COLUMN workbook_answers.instance_id IS 'The workbook instance this answer belongs to';
COMMENT ON COLUMN workbook_answers.field_key IS 'Unique identifier for the field within the workbook (e.g., "page1.section2.question3")';
COMMENT ON COLUMN workbook_answers.value IS 'The user''s answer value (can be string, array, object, etc.)';
COMMENT ON COLUMN workbook_answers.updated_at IS 'Timestamp of last modification to this answer';

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workbook_answers_instance_id 
    ON workbook_answers(instance_id);

CREATE INDEX IF NOT EXISTS idx_workbook_answers_field_key 
    ON workbook_answers(field_key);

CREATE INDEX IF NOT EXISTS idx_workbook_answers_updated_at 
    ON workbook_answers(updated_at DESC);

-- ============================================
-- Trigger: Auto-update updated_at on workbook_answers
-- ============================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_workbook_answers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (to avoid duplicates)
DROP TRIGGER IF EXISTS trigger_workbook_answers_updated_at ON workbook_answers;

-- Create trigger
CREATE TRIGGER trigger_workbook_answers_updated_at
    BEFORE UPDATE ON workbook_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_workbook_answers_updated_at();

-- ============================================
-- Verification Queries
-- ============================================

-- Show all created tables
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name IN ('tier_rank', 'workbooks', 'workbook_instances', 'workbook_answers')
ORDER BY table_name;

-- Show tier_rank data
SELECT * FROM tier_rank ORDER BY rank;

-- Show index count per table
SELECT 
    tablename,
    COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('workbooks', 'workbook_instances', 'workbook_answers')
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- Success Message
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '  ✅ Workbook Tables Created Successfully!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '  Tables Created:';
    RAISE NOTICE '    - tier_rank (5 tiers inserted)';
    RAISE NOTICE '    - workbooks (admin templates)';
    RAISE NOTICE '    - workbook_instances (user copies)';
    RAISE NOTICE '    - workbook_answers (field answers)';
    RAISE NOTICE '';
    RAISE NOTICE '  Indexes Created: 7';
    RAISE NOTICE '  Triggers Created: 1 (auto-update updated_at)';
    RAISE NOTICE '============================================';
END $$;


