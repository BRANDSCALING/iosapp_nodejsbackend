/**
 * Database Migration: Create user_compliance table
 *
 * Safe to run multiple times (uses IF NOT EXISTS).
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function createUserComplianceTable() {
  const client = await pool.connect();

  try {
    console.log('');
    console.log('='.repeat(60));
    console.log('MIGRATION: Create user_compliance table');
    console.log('='.repeat(60));
    console.log('');

    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_compliance (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) UNIQUE NOT NULL,
        amiqus_record_id VARCHAR(255),
        kyc_status VARCHAR(50) DEFAULT 'pending',
        dbs_status VARCHAR(50) DEFAULT 'pending',
        hspsla_submission_id VARCHAR(255),
        hspsla_signed BOOLEAN DEFAULT false,
        tenants_sla_submission_id VARCHAR(255),
        tenants_sla_signed BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');

    console.log('✅ [MIGRATION] user_compliance table is ready');
    console.log('');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [MIGRATION] Failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { createUserComplianceTable };

if (require.main === module) {
  createUserComplianceTable()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
    .finally(() => {
      pool.end();
    });
}

