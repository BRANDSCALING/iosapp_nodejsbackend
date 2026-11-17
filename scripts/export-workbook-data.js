/**
 * Export ALL workbook data before the old workbooks are removed (Fariza, 17 Nov 2026:
 * "save and export historic data and remove them, make sure you save first").
 *
 * READ-ONLY: this script only SELECTs. Removal is a separate, manual step that must not
 * run until this export has been checked. Run at cutover, not during the iOS 1.4 review.
 *
 * Usage:  DATABASE_URL=postgres://... node scripts/export-workbook-data.js [outDir]
 * Writes workbook-export-<timestamp>/ with one JSON file per table and a summary.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Set DATABASE_URL to the shared database before running.');
    process.exit(1);
  }
  const outDir = path.resolve(
    process.argv[2] || `workbook-export-${new Date().toISOString().replace(/[:.]/g, '-')}`
  );
  fs.mkdirSync(outDir, { recursive: true });

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
  });

  const tables = {
    workbooks: 'SELECT * FROM workbooks ORDER BY created_at',
    workbook_instances: 'SELECT * FROM workbook_instances',
    workbook_answers: 'SELECT * FROM workbook_answers ORDER BY instance_id, field_key',
  };

  const summary = { exportedAt: new Date().toISOString(), counts: {} };
  for (const [name, sql] of Object.entries(tables)) {
    const { rows } = await pool.query(sql);
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(rows, null, 1));
    summary.counts[name] = rows.length;
    console.log(`exported ${name}: ${rows.length} rows`);
  }

  // Per-user flat view so answers stay readable even without the tables
  const { rows: flat } = await pool.query(`
    SELECT u.email, u.name AS user_name, w.title AS workbook_title, w.name AS workbook_name,
           wi.data AS progress, wi.last_saved_at, wa.field_key, wa.value, wa.updated_at
    FROM workbook_instances wi
    LEFT JOIN users u ON LOWER(u.id::text) = LOWER(wi.user_id::text)
    LEFT JOIN workbooks w ON w.id = wi.workbook_id
    LEFT JOIN workbook_answers wa ON wa.instance_id = wi.id
    ORDER BY u.email, w.title, wa.field_key
  `);
  fs.writeFileSync(path.join(outDir, 'answers-by-user.json'), JSON.stringify(flat, null, 1));
  summary.counts.answers_by_user_rows = flat.length;

  fs.writeFileSync(path.join(outDir, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
  console.log(`\nDone. Export in ${outDir}`);
  console.log('Check the files, copy the folder somewhere safe (and to Fariza), and only');
  console.log('then remove the old workbooks (separate, manual step — not this script).');
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
