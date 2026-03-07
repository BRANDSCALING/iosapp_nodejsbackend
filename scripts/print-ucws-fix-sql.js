#!/usr/bin/env node
/**
 * Prints the one-time UCWS user_type fix SQL to the console for review before running.
 * Run: node scripts/print-ucws-fix-sql.js
 * Then copy the UPDATE block and run it manually in your DB client.
 */

const PREVIEW_SQL = `-- PREVIEW: Run this first to see which users would be updated (no writes).
SELECT id, email, name, user_type, created_at
FROM users u
WHERE (u.user_type IS NULL OR u.user_type != 'brandscaling')
  AND NOT EXISTS (
    SELECT 1 FROM quiz_sessions q
    WHERE q.user_id::text = u.id::text
  )
ORDER BY u.created_at DESC;
`;

const UPDATE_SQL = `-- ONE-TIME UPDATE: Review above, then run this manually.
UPDATE users u
SET user_type = 'ucws',
    updated_at = NOW()
WHERE (u.user_type IS NULL OR u.user_type != 'brandscaling')
  AND NOT EXISTS (
    SELECT 1 FROM quiz_sessions q
    WHERE q.user_id::text = u.id::text
  );
`;

console.log('========== UCWS user_type one-time fix SQL ==========\n');
console.log('1) PREVIEW (run first to see affected users):\n');
console.log(PREVIEW_SQL);
console.log('\n2) UPDATE (run manually after review):\n');
console.log(UPDATE_SQL);
console.log('========== End ==========');
