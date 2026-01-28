-- ============================================
-- Sync users.type_id from Quiz Results
-- Updates type_id to match latest quiz result (lowercase)
-- ============================================

-- Show current state before update
SELECT 'BEFORE UPDATE - Users with mismatched type_id:' as status;

SELECT 
  u.id,
  u.email,
  u.type_id as current_type,
  LOWER(qr.layer1_core_type) as quiz_type,
  qr.completed_at as quiz_completed
FROM users u
LEFT JOIN (
  SELECT DISTINCT ON (user_id)
    user_id,
    layer1_core_type,
    completed_at
  FROM user_quiz_results
  ORDER BY user_id, completed_at DESC
) qr ON LOWER(u.id::text) = LOWER(qr.user_id::text)
WHERE qr.layer1_core_type IS NOT NULL
  AND (u.type_id IS NULL OR LOWER(u.type_id) != LOWER(qr.layer1_core_type))
LIMIT 20;

-- Update users.type_id from latest quiz result
UPDATE users u
SET 
  type_id = LOWER(qr.layer1_core_type),
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (user_id)
    user_id,
    layer1_core_type
  FROM user_quiz_results
  ORDER BY user_id, completed_at DESC
) qr
WHERE LOWER(u.id::text) = LOWER(qr.user_id::text)
  AND (u.type_id IS NULL OR LOWER(u.type_id) != LOWER(qr.layer1_core_type));

-- Show how many were updated
SELECT 'AFTER UPDATE - Recently updated users:' as status;

SELECT 
  u.id,
  u.email,
  u.type_id,
  u.updated_at
FROM users u
WHERE u.updated_at > NOW() - INTERVAL '1 minute'
ORDER BY u.updated_at DESC
LIMIT 10;

-- Summary
SELECT 
  'SUMMARY' as status,
  COUNT(*) as total_users,
  COUNT(type_id) as users_with_type,
  COUNT(*) FILTER (WHERE type_id = 'architect') as architects,
  COUNT(*) FILTER (WHERE type_id = 'alchemist') as alchemists,
  COUNT(*) FILTER (WHERE type_id = 'mixed') as mixed,
  COUNT(*) FILTER (WHERE type_id IS NULL) as no_type
FROM users;


