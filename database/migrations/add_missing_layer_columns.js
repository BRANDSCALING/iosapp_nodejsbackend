/**
 * Database Migration: Add Missing Layer Columns
 * 
 * Current state: 16 layer columns exist
 * Target state: 30+ layer columns (including old generic ones = ~40)
 * 
 * This migration adds the 14+ missing specific columns for layers 1-7
 * Safe to run multiple times (uses IF NOT EXISTS)
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

async function addMissingColumns() {
  const client = await pool.connect();
  
  try {
    console.log('');
    console.log('='.repeat(60));
    console.log('MIGRATION: Add Missing Layer Columns');
    console.log('='.repeat(60));
    console.log('');
    console.log(`📊 [MIGRATION] Database: ${process.env.DB_HOST}`);
    console.log('📊 [MIGRATION] Adding missing layer columns...');
    console.log('');
    
    await client.query('BEGIN');
    
    // Layer 1: Add missing columns (decision_loop, decision_process)
    console.log('📊 [Layer 1] Adding decision_loop and decision_process...');
    await client.query(`
      ALTER TABLE user_quiz_results 
      ADD COLUMN IF NOT EXISTS layer1_decision_loop TEXT,
      ADD COLUMN IF NOT EXISTS layer1_decision_process TEXT;
    `);
    console.log('   ✅ Layer 1: 2 new columns added');
    
    // Layer 2: Add missing columns (strength, blind_spot)
    console.log('📊 [Layer 2] Adding strength and blind_spot...');
    await client.query(`
      ALTER TABLE user_quiz_results 
      ADD COLUMN IF NOT EXISTS layer2_strength TEXT,
      ADD COLUMN IF NOT EXISTS layer2_blind_spot TEXT;
    `);
    console.log('   ✅ Layer 2: 2 new columns added');
    
    // Layer 3: Add missing columns (integration, integration_percent)
    console.log('📊 [Layer 3] Adding integration and integration_percent...');
    await client.query(`
      ALTER TABLE user_quiz_results 
      ADD COLUMN IF NOT EXISTS layer3_integration TEXT,
      ADD COLUMN IF NOT EXISTS layer3_integration_percent INTEGER;
    `);
    console.log('   ✅ Layer 3: 2 new columns added');
    
    // Layer 4: Add missing columns (learning style details)
    console.log('📊 [Layer 4] Adding learning style preferences...');
    await client.query(`
      ALTER TABLE user_quiz_results 
      ADD COLUMN IF NOT EXISTS layer4_modality_preference TEXT,
      ADD COLUMN IF NOT EXISTS layer4_approach TEXT,
      ADD COLUMN IF NOT EXISTS layer4_concept_processing TEXT,
      ADD COLUMN IF NOT EXISTS layer4_working_environment TEXT,
      ADD COLUMN IF NOT EXISTS layer4_pace TEXT;
    `);
    console.log('   ✅ Layer 4: 5 new columns added');
    
    // Layer 5: Add missing columns (neurodiversity details)
    console.log('📊 [Layer 5] Adding neurodiversity status and traits...');
    await client.query(`
      ALTER TABLE user_quiz_results 
      ADD COLUMN IF NOT EXISTS layer5_status TEXT,
      ADD COLUMN IF NOT EXISTS layer5_traits JSONB;
    `);
    console.log('   ✅ Layer 5: 2 new columns added');
    
    // Layer 6: Add missing columns (mindset, personality, communication)
    console.log('📊 [Layer 6] Adding mindset, personality, and communication...');
    await client.query(`
      ALTER TABLE user_quiz_results 
      ADD COLUMN IF NOT EXISTS layer6_mindset JSONB,
      ADD COLUMN IF NOT EXISTS layer6_personality JSONB,
      ADD COLUMN IF NOT EXISTS layer6_communication TEXT;
    `);
    console.log('   ✅ Layer 6: 3 new columns added');
    
    // Layer 7: Add missing columns (meta-beliefs / core values)
    console.log('📊 [Layer 7] Adding meta-beliefs columns...');
    await client.query(`
      ALTER TABLE user_quiz_results 
      ADD COLUMN IF NOT EXISTS layer7_faith_orientation TEXT,
      ADD COLUMN IF NOT EXISTS layer7_control_orientation TEXT,
      ADD COLUMN IF NOT EXISTS layer7_fairness TEXT,
      ADD COLUMN IF NOT EXISTS layer7_integrity TEXT,
      ADD COLUMN IF NOT EXISTS layer7_growth TEXT,
      ADD COLUMN IF NOT EXISTS layer7_impact TEXT;
    `);
    console.log('   ✅ Layer 7: 6 new columns added');
    
    await client.query('COMMIT');
    
    console.log('');
    console.log('✅ [MIGRATION] All missing columns added successfully!');
    console.log('');
    
    // Verify all layer columns
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'user_quiz_results' 
      AND column_name LIKE 'layer%'
      ORDER BY column_name;
    `);
    
    console.log(`📊 [VERIFY] Total layer columns: ${result.rows.length}`);
    console.log('');
    
    // Count columns per layer
    const layers = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    result.rows.forEach(row => {
      const match = row.column_name.match(/layer(\d)/);
      if (match) {
        const layerNum = parseInt(match[1]);
        layers[layerNum]++;
      }
    });
    
    console.log('📊 [VERIFY] Columns per layer:');
    for (let i = 1; i <= 7; i++) {
      console.log(`   Layer ${i}: ${layers[i]} columns`);
    }
    
    console.log('');
    console.log('📋 [COLUMN LIST] All layer columns:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('');
    console.log('🎉 Database is now ready for all 7 layers!');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('   1. Restart the backend server');
    console.log('   2. Test quiz submission from iOS app');
    console.log('   3. Verify all layers are saved correctly');
    console.log('');
    
    return true;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('');
    console.error('❌ [MIGRATION] Failed:', error.message);
    console.error('   Error details:', error.stack);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { addMissingColumns };

// Run if executed directly
if (require.main === module) {
  addMissingColumns()
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


