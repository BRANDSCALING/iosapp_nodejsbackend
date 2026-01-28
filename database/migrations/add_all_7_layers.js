/**
 * Database Migration: Add All 7 Layers Columns
 * 
 * This migration adds all 30 columns for the 7 layers of quiz results
 * to the user_quiz_results table.
 * 
 * Safe to run multiple times (uses IF NOT EXISTS)
 * Uses transactions for safety
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = require('pg');

// Database connection config
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('📊 [MIGRATION] Starting migration: Add all 7 layers columns');
    console.log(`📊 [MIGRATION] Database: ${process.env.DB_HOST}`);
    
    await client.query('BEGIN');
    
    // Layer 1: Core Identity (6 columns)
    console.log('📊 [MIGRATION] Adding Layer 1 columns (Core Identity)...');
    await client.query(`
      ALTER TABLE user_quiz_results 
      ADD COLUMN IF NOT EXISTS layer1_core_type TEXT,
      ADD COLUMN IF NOT EXISTS layer1_strength TEXT,
      ADD COLUMN IF NOT EXISTS layer1_architect_score INTEGER,
      ADD COLUMN IF NOT EXISTS layer1_alchemist_score INTEGER,
      ADD COLUMN IF NOT EXISTS layer1_decision_loop TEXT,
      ADD COLUMN IF NOT EXISTS layer1_decision_process TEXT;
    `);
    console.log('   ✅ Layer 1: 6 columns added');
    
    // Layer 2: Execution Style / Subtype (4 columns)
    console.log('📊 [MIGRATION] Adding Layer 2 columns (Subtype)...');
    await client.query(`
      ALTER TABLE user_quiz_results 
      ADD COLUMN IF NOT EXISTS layer2_subtype TEXT,
      ADD COLUMN IF NOT EXISTS layer2_description TEXT,
      ADD COLUMN IF NOT EXISTS layer2_strength TEXT,
      ADD COLUMN IF NOT EXISTS layer2_blind_spot TEXT;
    `);
    console.log('   ✅ Layer 2: 4 columns added');
    
    // Layer 3: Mirror Awareness / Integration (3 columns)
    console.log('📊 [MIGRATION] Adding Layer 3 columns (Mirror Awareness)...');
    await client.query(`
      ALTER TABLE user_quiz_results 
      ADD COLUMN IF NOT EXISTS layer3_integration TEXT,
      ADD COLUMN IF NOT EXISTS layer3_integration_percent INTEGER,
      ADD COLUMN IF NOT EXISTS layer3_description TEXT;
    `);
    console.log('   ✅ Layer 3: 3 columns added');
    
    // Layer 4: Learning Style (5 columns)
    console.log('📊 [MIGRATION] Adding Layer 4 columns (Learning Style)...');
    await client.query(`
      ALTER TABLE user_quiz_results 
      ADD COLUMN IF NOT EXISTS layer4_modality_preference TEXT,
      ADD COLUMN IF NOT EXISTS layer4_approach TEXT,
      ADD COLUMN IF NOT EXISTS layer4_concept_processing TEXT,
      ADD COLUMN IF NOT EXISTS layer4_working_environment TEXT,
      ADD COLUMN IF NOT EXISTS layer4_pace TEXT;
    `);
    console.log('   ✅ Layer 4: 5 columns added');
    
    // Layer 5: Neurodiversity (3 columns)
    console.log('📊 [MIGRATION] Adding Layer 5 columns (Neurodiversity)...');
    await client.query(`
      ALTER TABLE user_quiz_results 
      ADD COLUMN IF NOT EXISTS layer5_status TEXT,
      ADD COLUMN IF NOT EXISTS layer5_description TEXT,
      ADD COLUMN IF NOT EXISTS layer5_traits JSONB;
    `);
    console.log('   ✅ Layer 5: 3 columns added');
    
    // Layer 6: Mindset & Personality (3 columns)
    console.log('📊 [MIGRATION] Adding Layer 6 columns (Mindset & Personality)...');
    await client.query(`
      ALTER TABLE user_quiz_results 
      ADD COLUMN IF NOT EXISTS layer6_mindset JSONB,
      ADD COLUMN IF NOT EXISTS layer6_personality JSONB,
      ADD COLUMN IF NOT EXISTS layer6_communication TEXT;
    `);
    console.log('   ✅ Layer 6: 3 columns added');
    
    // Layer 7: Meta-Beliefs / Core Values (6 columns)
    console.log('📊 [MIGRATION] Adding Layer 7 columns (Meta-Beliefs)...');
    await client.query(`
      ALTER TABLE user_quiz_results 
      ADD COLUMN IF NOT EXISTS layer7_faith_orientation TEXT,
      ADD COLUMN IF NOT EXISTS layer7_control_orientation TEXT,
      ADD COLUMN IF NOT EXISTS layer7_fairness TEXT,
      ADD COLUMN IF NOT EXISTS layer7_integrity TEXT,
      ADD COLUMN IF NOT EXISTS layer7_growth TEXT,
      ADD COLUMN IF NOT EXISTS layer7_impact TEXT;
    `);
    console.log('   ✅ Layer 7: 6 columns added');
    
    await client.query('COMMIT');
    
    console.log('');
    console.log('✅ [MIGRATION] All columns added successfully!');
    console.log('');
    
    // Verify all columns
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'user_quiz_results' 
      AND column_name LIKE 'layer%'
      ORDER BY column_name;
    `);
    
    console.log(`✅ [MIGRATION] Verified: ${result.rows.length} layer columns exist`);
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
    
    console.log('✅ [MIGRATION] Columns per layer:');
    let totalExpected = 0;
    const expected = { 1: 6, 2: 4, 3: 3, 4: 5, 5: 3, 6: 3, 7: 6 };
    for (let i = 1; i <= 7; i++) {
      const status = layers[i] >= expected[i] ? '✅' : '⚠️';
      console.log(`   ${status} Layer ${i}: ${layers[i]} columns (expected ${expected[i]})`);
      totalExpected += expected[i];
    }
    
    console.log('');
    console.log(`📊 [MIGRATION] Total layer columns: ${result.rows.length} (expected ${totalExpected})`);
    console.log('');
    
    // List all layer columns
    console.log('📋 [MIGRATION] All layer columns:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
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

module.exports = { runMigration };

// Run if executed directly
if (require.main === module) {
  console.log('');
  console.log('='.repeat(60));
  console.log('DATABASE MIGRATION: Add All 7 Layers Columns');
  console.log('='.repeat(60));
  console.log('');
  
  runMigration()
    .then(() => {
      console.log('');
      console.log('='.repeat(60));
      console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('='.repeat(60));
      console.log('');
      process.exit(0);
    })
    .catch((error) => {
      console.error('');
      console.error('='.repeat(60));
      console.error('❌ MIGRATION FAILED:', error.message);
      console.error('='.repeat(60));
      console.error('');
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}


