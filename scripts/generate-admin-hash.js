/**
 * Script to generate bcrypt password hash for admin user
 * Run with: node scripts/generate-admin-hash.js
 */

const bcrypt = require('bcrypt');

const password = 'Admin@123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('');
  console.log('SQL INSERT:');
  console.log(`INSERT INTO admin_users (email, password_hash, name, role)
VALUES (
  'abdullah@brandscaling.com',
  '${hash}',
  'Abdullah',
  'admin'
)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;`);
});


