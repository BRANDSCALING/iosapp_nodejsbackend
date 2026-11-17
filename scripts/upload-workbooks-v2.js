/**
 * Load the 27 BS-DI-009 workbook files (17 Nov 2026 handover) into the shared database.
 *
 * - Applies src/migrations/add_workbooks_v2_columns.sql first (idempotent).
 * - Upserts by file name: safe to re-run; a re-send from Fariza replaces the content.
 * - tier is stored as 'free' for every file: access is enforced in code by the £99 purchase
 *   (workbooks.js V2_REQUIRES_PURCHASE), per Fariza's 17 Nov pricing answer; the old
 *   tier_rank mechanism does not apply to v2 files. Revisit when BS-DI-009.1 decision 2
 *   (Workbook 2/3 access) is finalised.
 * - Does NOT touch the old workbooks. Their export + removal is a separate manual step
 *   (scripts/export-workbook-data.js first).
 *
 * Usage: DATABASE_URL=postgres://... node scripts/upload-workbooks-v2.js /path/to/workbooks-json
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  const dir = process.argv[2];
  if (!url || !dir) {
    console.error('Usage: DATABASE_URL=... node scripts/upload-workbooks-v2.js <workbooks-json dir>');
    process.exit(1);
  }
  const files = fs.readdirSync(dir).filter((f) => /^WB[123]-.*\.json$/.test(f)).sort();
  if (files.length === 0) { console.error('No WB*.json files found in ' + dir); process.exit(1); }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
  });

  const migration = fs.readFileSync(path.join(__dirname, '../src/migrations/add_workbooks_v2_columns.sql'), 'utf8');
  await pool.query(migration);
  console.log('migration applied (idempotent)');

  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (!d.structure || !d.typeId || !d.workbook) {
      console.error(`SKIP ${f}: missing structure/typeId/workbook`);
      continue;
    }
    await pool.query(`
      INSERT INTO workbooks (name, title, json_structure, type_id, tier, workbook, part, subtype, created_at, original_filename)
      VALUES ($1, $2, $3, $4, 'free', $5, $6, $7, NOW(), $1)
      ON CONFLICT (name) DO UPDATE SET
        title = EXCLUDED.title,
        json_structure = EXCLUDED.json_structure,
        type_id = EXCLUDED.type_id,
        workbook = EXCLUDED.workbook,
        part = EXCLUDED.part,
        subtype = EXCLUDED.subtype
    `, [f, d.title, JSON.stringify(d.structure), d.typeId, d.workbook, d.part, d.subtype || null]);
    console.log(`upserted ${f}  (${d.title})`);
  }

  const n = await pool.query('SELECT count(*) FROM workbooks WHERE workbook IS NOT NULL');
  console.log(`\nDone: ${n.rows[0].count} v2 workbooks in the database.`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
