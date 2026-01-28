/**
 * Database Migration: Fix Column Sizes
 * 
 * Problem: Some columns are VARCHAR(50) which is too small for the data
 * Solution: Increase column sizes to accommodate the actual data
 * 
 * Safe to run multiple times - uses ALTER COLUMN TYPE
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
  ssl: { rejectUnauthorized: false }
});

async function fixColumnSizes() {
  const client = await pool.connect();
  
  console.log('');
  console.log('='.repeat(60));
  console.log('MIGRATION: Fix Column Sizes');
  console.log('='.repeat(60));
  console.log('');
  console.log(`📊 [MIGRATION] Database: ${process.env.DB_HOST}`);
  console.log('📊 [MIGRATION] Starting column size fix...');
  console.log('');
  
  try {
    await client.query('BEGIN');
    
    // Layer 1 columns
    console.log('📊 [MIGRATION] Fixing Layer 1 columns...');
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer1_core_type TYPE VARCHAR(100)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer1_strength TYPE VARCHAR(100)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer1_decision_loop TYPE VARCHAR(200)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer1_decision_process TYPE VARCHAR(200)`);
    console.log('   ✅ Layer 1: Done');
    
    // Layer 2 columns
    console.log('📊 [MIGRATION] Fixing Layer 2 columns...');
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer2_subtype TYPE VARCHAR(200)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer2_description TYPE TEXT`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer2_strength TYPE VARCHAR(200)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer2_blind_spot TYPE VARCHAR(200)`);
    console.log('   ✅ Layer 2: Done');
    
    // Layer 3 columns
    console.log('📊 [MIGRATION] Fixing Layer 3 columns...');
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer3_integration TYPE VARCHAR(100)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer3_description TYPE TEXT`);
    console.log('   ✅ Layer 3: Done');
    
    // Layer 4 columns
    console.log('📊 [MIGRATION] Fixing Layer 4 columns...');
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer4_modality_preference TYPE VARCHAR(100)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer4_approach TYPE VARCHAR(100)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer4_concept_processing TYPE VARCHAR(100)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer4_working_environment TYPE VARCHAR(100)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer4_pace TYPE VARCHAR(100)`);
    console.log('   ✅ Layer 4: Done');
    
    // Layer 5 columns
    console.log('📊 [MIGRATION] Fixing Layer 5 columns...');
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer5_status TYPE VARCHAR(100)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer5_description TYPE TEXT`);
    console.log('   ✅ Layer 5: Done');
    
    // Layer 6 columns
    console.log('📊 [MIGRATION] Fixing Layer 6 columns...');
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer6_communication TYPE VARCHAR(200)`);
    console.log('   ✅ Layer 6: Done');
    
    // Layer 7 columns
    console.log('📊 [MIGRATION] Fixing Layer 7 columns...');
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer7_faith_orientation TYPE VARCHAR(200)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer7_control_orientation TYPE VARCHAR(200)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer7_fairness TYPE VARCHAR(200)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer7_integrity TYPE VARCHAR(200)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer7_growth TYPE VARCHAR(200)`);
    await client.query(`ALTER TABLE user_quiz_results ALTER COLUMN layer7_impact TYPE VARCHAR(200)`);
    console.log('   ✅ Layer 7: Done');
    
    await client.query('COMMIT');
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('');
    console.log('📊 [MIGRATION] Summary:');
    console.log('   - Layer 1: VARCHAR(100-200)');
    console.log('   - Layer 2: VARCHAR(200) + TEXT for description');
    console.log('   - Layer 3: VARCHAR(100) + TEXT for description');
    console.log('   - Layer 4: All VARCHAR(100)');
    console.log('   - Layer 5: VARCHAR(100) + TEXT for description');
    console.log('   - Layer 6: VARCHAR(200)');
    console.log('   - Layer 7: All VARCHAR(200)');
    console.log('');
    
    return true;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('');
    console.error('❌ [MIGRATION] Error:', error.message);
    
    // Handle specific errors
    if (error.message.includes('does not exist')) {
      console.error('   Column does not exist yet - may need to run add_missing_layer_columns.js first');
    }
    
    throw error;
  } finally {
    client.release();
  }
}

// Run if executed directly
if (require.main === module) {
  fixColumnSizes()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = { fixColumnSizes };


