/**
 * Database Inspection Script
 * 
 * This script connects to your PostgreSQL database and shows you
 * the EXACT data stored in the json_structure field for the test workbook.
 * 
 * This will confirm whether the 30-character truncation is in the database
 * or happening somewhere else in the data flow.
 */

const { Pool } = require('pg');
require('dotenv').config();

// Database connection using your existing .env configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false // Required for AWS RDS
  }
});

async function inspectWorkbook() {
  try {
    console.log('🔍 ============================================');
    console.log('🔍 DATABASE INSPECTION: Test Workbook');
    console.log('🔍 ============================================\n');
    
    // The test workbook ID from your logs
    const workbookId = 'e30be0af-8e6c-4f2b-818b-fb430e6b7950';
    
    console.log(`📊 Fetching workbook: ${workbookId}\n`);
    
    // Get the workbook from database
    const result = await pool.query(
      'SELECT id, name, title, json_structure FROM workbooks WHERE id = $1',
      [workbookId]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Workbook not found in database!');
      await pool.end();
      return;
    }
    
    const workbook = result.rows[0];
    
    console.log('✅ Workbook found:');
    console.log(`   ID: ${workbook.id}`);
    console.log(`   Name: ${workbook.name}`);
    console.log(`   Title: ${workbook.title}\n`);
    
    // Parse the JSON structure
    const structure = typeof workbook.json_structure === 'string' 
      ? JSON.parse(workbook.json_structure) 
      : workbook.json_structure;
    
    console.log('📦 JSON Structure Overview:');
    console.log(`   Total modules: ${structure.modules?.length || 0}\n`);
    
    // Find the "About You" module and inspect its content
    if (structure.modules && structure.modules.length > 0) {
      // Look for the first module (usually "About You" or similar)
      const firstModule = structure.modules[0];
      
      console.log('🔍 Inspecting First Module:');
      console.log(`   Module ID: ${firstModule.id}`);
      console.log(`   Module Title: ${firstModule.title}\n`);
      
      if (firstModule.sections && firstModule.sections.length > 0) {
        const firstSection = firstModule.sections[0];
        
        console.log('🔍 Inspecting First Section:');
        console.log(`   Section ID: ${firstSection.id}`);
        console.log(`   Section Title: ${firstSection.title}\n`);
        
        if (firstSection.content && firstSection.content.length > 0) {
          console.log('📄 Content Items:\n');
          
          // Inspect first 5 content items
          const itemsToInspect = firstSection.content.slice(0, 5);
          
          itemsToInspect.forEach((item, index) => {
            console.log(`--- Content Item #${index + 1} ---`);
            console.log(`Type: ${item.type}`);
            console.log(`Text: "${item.text}"`);
            console.log(`Text Length: ${item.text?.length || 0} characters`);
            
            if (item.runs && item.runs.length > 0) {
              console.log(`Runs: ${item.runs.length} run(s)`);
              
              item.runs.forEach((run, runIndex) => {
                console.log(`  Run #${runIndex + 1}:`);
                console.log(`    Text: "${run.text}"`);
                console.log(`    Length: ${run.text?.length || 0} characters`);
                console.log(`    Marks: [${run.marks?.join(', ') || 'none'}]`);
                
                // Check if truncated to 30 chars
                if (run.text && run.text.length === 30) {
                  console.log(`    ⚠️  WARNING: Exactly 30 characters - likely truncated!`);
                }
              });
            } else {
              console.log(`Runs: None (using fallback text)`);
            }
            
            console.log('');
          });
        } else {
          console.log('❌ No content found in first section');
        }
      } else {
        console.log('❌ No sections found in first module');
      }
    } else {
      console.log('❌ No modules found in structure');
    }
    
    console.log('\n🔍 ============================================');
    console.log('🔍 DIAGNOSIS');
    console.log('🔍 ============================================\n');
    
    // Analyze the data
    let foundTruncation = false;
    let totalRuns = 0;
    let truncatedRuns = 0;
    
    if (structure.modules) {
      structure.modules.forEach(module => {
        if (module.sections) {
          module.sections.forEach(section => {
            if (section.content) {
              section.content.forEach(item => {
                if (item.runs) {
                  item.runs.forEach(run => {
                    totalRuns++;
                    if (run.text && run.text.length === 30) {
                      truncatedRuns++;
                      foundTruncation = true;
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
    
    console.log(`📊 Statistics:`);
    console.log(`   Total runs found: ${totalRuns}`);
    console.log(`   Runs with exactly 30 chars: ${truncatedRuns}`);
    console.log(`   Percentage truncated: ${totalRuns > 0 ? Math.round((truncatedRuns / totalRuns) * 100) : 0}%\n`);
    
    if (foundTruncation) {
      console.log('❌ TRUNCATION CONFIRMED IN DATABASE!');
      console.log('   The database contains truncated text (30 chars).');
      console.log('   This means the admin portal saved truncated data.');
      console.log('   You need to:');
      console.log('   1. Fix the admin portal to not truncate');
      console.log('   2. Re-upload the workbook with full text\n');
    } else {
      console.log('✅ NO TRUNCATION IN DATABASE!');
      console.log('   The database has full text.');
      console.log('   The truncation must be happening in:');
      console.log('   - The backend API when sending to iOS');
      console.log('   - The iOS app when parsing (unlikely)\n');
    }
    
    console.log('🔍 ============================================\n');
    
    // Optionally save full structure to file for detailed inspection
    const fs = require('fs');
    const outputPath = '/tmp/workbook_structure.json';
    fs.writeFileSync(outputPath, JSON.stringify(structure, null, 2));
    console.log(`💾 Full JSON structure saved to: ${outputPath}`);
    console.log('   You can open this file to inspect the complete data.\n');
    
  } catch (error) {
    console.error('❌ Error inspecting database:', error);
    console.error('   Make sure your .env file has correct database credentials.');
  } finally {
    await pool.end();
    console.log('✅ Database connection closed.');
  }
}

// Run the inspection
inspectWorkbook();