/**
 * One-time runner for migration 0002 (Decision Intelligence), for when the database is
 * only reachable from inside AWS. It executes ONLY the bundled migration file — never
 * arbitrary SQL — and needs the GHL webhook secret. The file is idempotent
 * (IF NOT EXISTS throughout), so calling it twice is harmless. Remove after launch.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { query } = require('../config/database');

router.post('/migrate-0002', async (req, res) => {
  const given = req.query.key || req.headers['x-webhook-key'] || '';
  const expected = process.env.GHL_WEBHOOK_SECRET || '';
  if (!expected || given !== expected) {
    return res.status(401).json({ error: 'unauthorised' });
  }
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../migrations/0002_decision_intelligence.sql'), 'utf8');
    await query(sql);
    const t = await query(`
      SELECT count(*)::int AS n FROM information_schema.tables
      WHERE table_name IN ('decision','decision_entry','decision_log','decision_room','room_member',
        'room_entry','credit_grant','credit_ledger','mentor_turn','mentor_instruction',
        'edna_session','terms_acceptance','auth_device','notification','guest_access')
    `);
    const cols = await query(`
      SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('first_name','last_name','photo_url','site')
    `);
    res.json({ applied: true, di_tables: t.rows[0].n, users_columns: cols.rows[0].n });
  } catch (e) {
    console.error('[DI] migration 0002 failed:', e.message);
    res.status(500).json({ applied: false, message: e.message });
  }
});

router.post('/migrate-0003', async (req, res) => {
  const given = req.query.key || req.headers['x-webhook-key'] || '';
  const expected = process.env.GHL_WEBHOOK_SECRET || '';
  if (!expected || given !== expected) {
    return res.status(401).json({ error: 'unauthorised' });
  }
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../migrations/0003_di_notifications_attachments.sql'), 'utf8');
    await query(sql);
    const t = await query(`
      SELECT count(*)::int AS n FROM information_schema.tables
      WHERE table_name IN ('ghl_outbox','ghl_inbound_event')
    `);
    const cols = await query(`
      SELECT count(*)::int AS n FROM information_schema.columns
      WHERE (table_name = 'attachment' AND column_name IN ('file_data','filename'))
         OR (table_name = 'notification' AND column_name IN ('dedup','title','body'))
    `);
    res.json({ applied: true, new_tables: t.rows[0].n, new_columns: cols.rows[0].n });
  } catch (e) {
    console.error('[DI] migration 0003 failed:', e.message);
    res.status(500).json({ applied: false, message: e.message });
  }
});

module.exports = router;
