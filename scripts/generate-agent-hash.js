/**
 * Script to generate bcrypt password hash for agent user
 * Run with: node scripts/generate-agent-hash.js
 */

const bcrypt = require('bcrypt');

const password = 'rubab-secure-password-2026';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  
  console.log('Agent Password Hash Generator');
  console.log('==============================');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('');
  console.log('SQL UPDATE (run this to set the correct password):');
  console.log(`UPDATE agent_users SET password_hash = '${hash}' WHERE email = 'rubab@brandscaling.com';`);
  console.log('');
  console.log('Or INSERT new agent:');
  console.log(`INSERT INTO agent_users (email, password_hash, name, role)
VALUES (
  'rubab@brandscaling.com',
  '${hash}',
  'Rubab AI Agent',
  'agent'
)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;`);
});


