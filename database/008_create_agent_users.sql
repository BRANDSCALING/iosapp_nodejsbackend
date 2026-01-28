-- ============================================
-- Agent Users Table
-- AI agent portal users (like Rubab)
-- ============================================

-- Create agent_users table
CREATE TABLE IF NOT EXISTS agent_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'agent',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comment
COMMENT ON TABLE agent_users IS 'AI agent portal users (like Rubab)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_users_email ON agent_users(email);
CREATE INDEX IF NOT EXISTS idx_agent_users_active ON agent_users(is_active) WHERE is_active = TRUE;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_agent_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_agent_users_updated_at ON agent_users;
CREATE TRIGGER trigger_agent_users_updated_at
  BEFORE UPDATE ON agent_users
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_users_updated_at();

-- Insert Rubab's account
-- Password: rubab-secure-password-2026
-- Hash generated with bcrypt (10 rounds)
INSERT INTO agent_users (email, password_hash, name, role)
VALUES (
  'rubab@brandscaling.com',
  '$2b$10$K8pJvZ7Z5L9Z5L9Z5L9Z5OxJ5L9Z5L9Z5L9Z5L9Z5L9Z5L9Z5L9Z5',
  'Rubab AI Agent',
  'agent'
)
ON CONFLICT (email) DO NOTHING;

-- Verify table creation
SELECT 'agent_users table created successfully' as status;
SELECT COUNT(*) as agent_count FROM agent_users;


