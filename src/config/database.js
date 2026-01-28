/**
 * Database Configuration
 * AWS Aurora PostgreSQL Connection Pool
 */

const { Pool } = require('pg');
const path = require('path');

// Load .env from project root
// __dirname = src/config, so we need to go up 2 levels to get to project root
const envPath = path.join(__dirname, '..', '..', '.env');
console.log('🔧 [Database] Loading .env from:', envPath);
const result = require('dotenv').config({ path: envPath });

if (result.error) {
  console.error('❌ [Database] Failed to load .env:', result.error.message);
  // Try loading from current working directory as fallback
  console.log('🔧 [Database] Trying fallback: loading from cwd');
  require('dotenv').config();
}

// Debug: Log database configuration (hide password)
console.log('🔧 [Database] Configuration:');
console.log(`   Host: ${process.env.DB_HOST || 'NOT SET (will use localhost)'}`);
console.log(`   Port: ${process.env.DB_PORT || '5432'}`);
console.log(`   Database: ${process.env.DB_NAME || 'NOT SET'}`);
console.log(`   User: ${process.env.DB_USER || 'NOT SET'}`);
console.log(`   Password: ${process.env.DB_PASSWORD ? '***SET***' : 'NOT SET'}`);

// Validate required environment variables
if (!process.env.DB_HOST) {
  console.error('❌ [Database] ERROR: DB_HOST environment variable is not set!');
  console.error('   Make sure .env file exists in project root with DB_HOST defined.');
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '60000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '20000'),
  // AWS Aurora requires SSL for all connections
  ssl: { rejectUnauthorized: false }
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to Aurora PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Helper function to get a client from the pool
const getClient = () => {
  return pool.connect();
};

// Health check function
const healthCheck = async () => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as db_version');
    return {
      status: 'healthy',
      timestamp: result.rows[0].current_time,
      version: result.rows[0].db_version
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

module.exports = {
  pool,
  query,
  getClient,
  healthCheck
};
