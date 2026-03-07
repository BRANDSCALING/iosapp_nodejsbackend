/**
 * One-off test: run the same queries as admin LMS endpoints for a given programId.
 * Usage: node scripts/test-lms-endpoints.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PROGRAM_ID = '52919292-1647-4424-a08c-0f4eb23c2816';

async function run() {
  const { query } = require('../src/config/database');

  console.log('\n=== Testing LMS endpoint logic for programId:', PROGRAM_ID, '===\n');

  try {
    const programResult = await query(
      'SELECT id, name, title, tier, display_order FROM programs WHERE id = $1::uuid',
      [PROGRAM_ID]
    );
    if (programResult.rows.length === 0) {
      console.log('❌ Program not found.');
      process.exit(1);
    }
    console.log('✅ Program found:', programResult.rows[0].title || programResult.rows[0].name);

    const modulesResult = await query(
      `SELECT id, title, display_order FROM modules
       WHERE program_id = $1::uuid
       ORDER BY display_order`,
      [PROGRAM_ID]
    );
    console.log('✅ GET /api/admin/lms/modules?programId=' + PROGRAM_ID + ' →', modulesResult.rows.length, 'modules');

    let lessonId = null;
    if (modulesResult.rows.length > 0) {
      const moduleId = modulesResult.rows[0].id;
      const lessonsResult = await query(
        `SELECT id, title FROM lessons WHERE module_id = $1::uuid ORDER BY display_order`,
        [moduleId]
      );
      console.log('✅ GET /api/admin/lms/lessons?moduleId=' + moduleId + ' →', lessonsResult.rows.length, 'lessons');
      if (lessonsResult.rows.length > 0) lessonId = lessonsResult.rows[0].id;
    }

    if (lessonId) {
      const itemsResult = await query(
        `SELECT id, title, content_type FROM content_items WHERE lesson_id = $1::uuid ORDER BY display_order`,
        [lessonId]
      );
      console.log('✅ GET /api/admin/lms/content-items?lessonId=' + lessonId + ' →', itemsResult.rows.length, 'items');
    }

    console.log('\n=== All queries OK. ===\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

run();
