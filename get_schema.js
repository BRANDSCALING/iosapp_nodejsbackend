// get_schema.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

async function getSchema() {
  try {
    console.log('🔍 Fetching workbook_instances schema...\n');
    
    const instancesSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'workbook_instances'
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 workbook_instances table:');
    console.log('─'.repeat(80));
    console.table(instancesSchema.rows);
    
    console.log('\n🔍 Fetching workbooks schema...\n');
    
    const workbooksSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'workbooks'
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 workbooks table:');
    console.log('─'.repeat(80));
    console.table(workbooksSchema.rows);
    
    // Also get a sample row
    console.log('\n🔍 Fetching sample workbook_instance...\n');
    
    const sampleInstance = await pool.query(`
      SELECT * FROM workbook_instances LIMIT 1;
    `);
    
    if (sampleInstance.rows.length > 0) {
      console.log('📄 Sample workbook_instance:');
      console.log('─'.repeat(80));
      console.log(JSON.stringify(sampleInstance.rows[0], null, 2));
    } else {
      console.log('⚠️  No workbook instances found in database');
    }
    
    await pool.end();
    console.log('\n✅ Schema extraction complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

getSchema();
