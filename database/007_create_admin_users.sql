-- ============================================
-- Admin Users Table
-- Separate from regular users for security
-- ============================================

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active) WHERE is_active = TRUE;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_admin_users_updated_at ON admin_users;
CREATE TRIGGER trigger_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- Insert default admin user
-- Password: Admin@123
-- Hash generated with bcrypt (10 rounds)
INSERT INTO admin_users (email, password_hash, name, role)
VALUES (
  'abdullah@brandscaling.com',
  '$2b$10$8K1p/a0dL1LXzIQM1VXOJeD7yYxZ7WKEhZT9QF4RmOzC5wQGxZVXa',
  'Abdullah',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

-- Verify table creation
SELECT 'admin_users table created successfully' as status;
SELECT COUNT(*) as admin_count FROM admin_users;


