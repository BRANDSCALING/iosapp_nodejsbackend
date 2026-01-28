-- ============================================
-- Update Agent Password Hash
-- Sets correct bcrypt hash for rubab@brandscaling.com
-- Password: rubab-secure-password-2026
-- ============================================

-- Update the password hash
UPDATE agent_users 
SET 
  password_hash = '$2b$10$7dyXFITFevsgj8xcGRBMmOV9yak8uFYonsIPspZhwdlXkjey2LGQK',
  updated_at = CURRENT_TIMESTAMP
WHERE email = 'rubab@brandscaling.com';

-- Verify the update
SELECT 
  'Agent password updated' as status,
  id,
  email,
  name,
  role,
  is_active,
  CASE 
    WHEN password_hash = '$2b$10$7dyXFITFevsgj8xcGRBMmOV9yak8uFYonsIPspZhwdlXkjey2LGQK' 
    THEN '✅ Hash matches' 
    ELSE '❌ Hash mismatch' 
  END as hash_status,
  updated_at
FROM agent_users 
WHERE email = 'rubab@brandscaling.com';


