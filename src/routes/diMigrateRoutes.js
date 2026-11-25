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

router.post('/migrate-0004', async (req, res) => {
  const given = req.query.key || req.headers['x-webhook-key'] || '';
  const expected = process.env.GHL_WEBHOOK_SECRET || '';
  if (!expected || given !== expected) {
    return res.status(401).json({ error: 'unauthorised' });
  }
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../migrations/0004_credit_grant_assessment_source.sql'), 'utf8');
    await query(sql);
    const def = await query(
      "SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'credit_grant_source_check'");
    res.json({ applied: true, constraint: def.rows[0] ? def.rows[0].def : null });
  } catch (e) {
    console.error('[DI] migration 0004 failed:', e.message);
    res.status(500).json({ applied: false, message: e.message });
  }
});

router.post('/migrate-0006', async (req, res) => {
  const given = req.query.key || req.headers['x-webhook-key'] || '';
  const expected = process.env.GHL_WEBHOOK_SECRET || '';
  if (!expected || given !== expected) {
    return res.status(401).json({ error: 'unauthorised' });
  }
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../migrations/0006_settings_profile.sql'), 'utf8');
    await query(sql);
    const cols = await query(`
      SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('phone','country','time_zone','business_name')
    `);
    res.json({ applied: true, users_columns: cols.rows[0].n });
  } catch (e) {
    console.error('[DI] migration 0006 failed:', e.message);
    res.status(500).json({ applied: false, message: e.message });
  }
});

/** POST /migrate-0007 — Settings · Subscription state (0007). Same key gate as above. */
router.post('/migrate-0007', async (req, res) => {
  const given = req.query.key || req.headers['x-webhook-key'] || '';
  const expected = process.env.GHL_WEBHOOK_SECRET || '';
  if (!expected || given !== expected) {
    return res.status(401).json({ error: 'unauthorised' });
  }
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../migrations/0007_subscription_state.sql'), 'utf8');
    await query(sql);
    const cols = await query(`
      SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name = 'users' AND column_name LIKE 'subscription_%'
    `);
    res.json({ applied: true, users_columns: cols.rows[0].n });
  } catch (e) {
    console.error('[DI] migration 0007 failed:', e.message);
    res.status(500).json({ applied: false, message: e.message });
  }
});

/** POST /migrate-0008 — Screen settings on the account; Delete my account. Same key gate. */
router.post('/migrate-0008', async (req, res) => {
  const given = req.query.key || req.headers['x-webhook-key'] || '';
  const expected = process.env.GHL_WEBHOOK_SECRET || '';
  if (!expected || given !== expected) {
    return res.status(401).json({ error: 'unauthorised' });
  }
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../migrations/0008_screen_and_deletion.sql'), 'utf8');
    await query(sql);
    const cols = await query(`
      SELECT count(*)::int AS n FROM information_schema.columns
      WHERE (table_name = 'users' AND column_name IN ('screen_settings','delete_requested_at','delete_after'))
         OR (table_name = 'room_member' AND column_name = 'left_name')
    `);
    res.json({ applied: true, columns: cols.rows[0].n });
  } catch (e) {
    console.error('[DI] migration 0008 failed:', e.message);
    res.status(500).json({ applied: false, message: e.message });
  }
});

module.exports = router;
