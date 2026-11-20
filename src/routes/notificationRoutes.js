/**
 * Notifications — BS-AI-009 §5 (Needs you, the bell) and §6 (Settings · Notifications).
 * Needs you is derived live from state, so rows clear themselves when the action is
 * done, never by dismissal. The bell count is the Needs you count.
 */
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyBearer, getAuthMode } = require('../middleware/cognitoVerify');
const { needsYou } = require('../services/di/notificationService');

const requireAuth = async (req, res, next) => {
  const payload = await verifyBearer(req);
  if (payload && payload.sub) { req.userId = payload.sub; return next(); }
  if (getAuthMode() === 'verify') return res.status(401).json({ error: 'auth', message: 'Sign in to continue.' });
  const userId = req.user?.id || req.headers['x-user-id'] || req.query.userId;
  if (!userId) return res.status(401).json({ error: 'auth', message: 'Sign in to continue.' });
  req.userId = userId;
  next();
};
router.use(requireAuth);

/** GET /needs-you — the open items and the bell count */
router.get('/needs-you', async (req, res) => {
  try {
    const items = await needsYou(req.userId);
    res.json({ count: items.length, items });
  } catch (e) {
    console.error('[DI] needs-you failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** GET /notifications — the bell history (newest 50); opening it marks them read */
router.get('/notifications', async (req, res) => {
  try {
    const r = await query(`
      SELECT id, event, title, body, object_type, object_id, created_at, opened_at
      FROM notification WHERE UPPER(user_id::text) = UPPER($1) AND channel = 'inapp'
      ORDER BY created_at DESC LIMIT 50
    `, [req.userId]);
    await query(
      "UPDATE notification SET opened_at = now() WHERE UPPER(user_id::text) = UPPER($1) AND channel = 'inapp' AND opened_at IS NULL",
      [req.userId]);
    res.json({ notifications: r.rows });
  } catch (e) {
    console.error('[DI] notifications failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/* the events a person can switch, with their defaults (BS-AI-009 §3; N15 cannot be off) */
const SWITCHABLE = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N10', 'N13', 'N14'];

/** GET /notification-prefs — every switchable event with the saved or default switches */
router.get('/notification-prefs', async (req, res) => {
  try {
    const saved = (await query(
      'SELECT event, push, email FROM notification_pref WHERE UPPER(user_id::text) = UPPER($1)',
      [req.userId])).rows;
    const map = Object.fromEntries(saved.map((r) => [r.event, r]));
    res.json({
      prefs: SWITCHABLE.map((ev) => ({
        event: ev,
        push: map[ev] ? map[ev].push !== false : true,
        email: map[ev] ? map[ev].email !== false : true,
      })),
      always_on: ['N15'],
    });
  } catch (e) {
    console.error('[DI] prefs failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** PUT /notification-prefs — {event, push?, email?} */
router.put('/notification-prefs', async (req, res) => {
  try {
    const { event, push = true, email = true } = req.body || {};
    if (!SWITCHABLE.includes(event)) {
      return res.status(400).json({ error: 'validation', message: 'Security and legal notices stay on; that event cannot be changed.' });
    }
    await query(`
      INSERT INTO notification_pref (user_id, event, push, email) VALUES ($1::uuid, $2, $3, $4)
      ON CONFLICT (user_id, event) DO UPDATE SET push = $3, email = $4
    `, [req.userId, event, !!push, !!email]);
    res.json({ saved: true });
  } catch (e) {
    console.error('[DI] pref save failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

module.exports = router;
