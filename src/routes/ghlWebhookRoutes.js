/**
 * GoHighLevel purchase webhook (19 Nov 2026, for the website's £99 detailed report).
 *
 * A GHL workflow ("product purchased" on the checkout funnel) POSTs here with the buyer's
 * contact details. We match the email to an account and set full_result_purchased on their
 * quiz results — the same flag RevenueCat sets for iOS purchases — so the detailed report
 * and workbooks unlock on both platforms.
 *
 * If the buyer has no result yet (bought before finishing the assessment, or before
 * creating the account), the purchase is held in ghl_pending_purchases and applied the
 * moment their result is stored (see ednaV2Controller).
 *
 * Security: the URL carries ?key=<GHL_WEBHOOK_SECRET> (GHL cannot sign requests); requests
 * without the right key are rejected. Always answers 200 to valid-key calls so GHL
 * workflows do not error; the outcome is in the body and the logs.
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

function extractEmail(body) {
  if (!body || typeof body !== 'object') return null;
  const direct = body.email || body.contact_email || body.Email;
  if (direct) return String(direct);
  for (const k of ['contact', 'customData', 'customer', 'payload', 'data']) {
    const v = body[k];
    if (v && typeof v === 'object' && (v.email || v.Email)) return String(v.email || v.Email);
  }
  return null;
}

router.post('/purchase', async (req, res) => {
  try {
    const secret = process.env.GHL_WEBHOOK_SECRET;
    if (!secret || (req.query.key !== secret && req.headers['x-webhook-key'] !== secret)) {
      console.warn('⚠️ [GHL] purchase webhook rejected: bad or missing key');
      return res.status(401).json({ success: false, error: 'unauthorized' });
    }

    const email = extractEmail(req.body);
    if (!email || !email.includes('@')) {
      console.warn('⚠️ [GHL] purchase webhook: no buyer email in payload', Object.keys(req.body || {}));
      return res.status(200).json({ success: false, error: 'no email in payload' });
    }
    const norm = email.trim().toLowerCase();
    console.log(`💳 [GHL] purchase webhook for ${norm}`);

    const u = await query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [norm]);
    if (u.rows.length > 0) {
      const upd = await query(
        'UPDATE user_quiz_results SET full_result_purchased = true WHERE UPPER(user_id::text) = UPPER($1)',
        [u.rows[0].id]
      );
      if (upd.rowCount > 0) {
        console.log(`✅ [GHL] unlocked detailed report for ${norm} (${upd.rowCount} result row/s)`);
        return res.status(200).json({ success: true, unlocked: true });
      }
    }

    /* no account or no result yet: hold the purchase; applied when the result is stored */
    await query(
      `INSERT INTO ghl_pending_purchases (email, created_at) VALUES ($1, NOW())
       ON CONFLICT (email) DO UPDATE SET created_at = NOW()`,
      [norm]
    );
    console.log(`🕗 [GHL] purchase held for ${norm} (no result yet); applies on completion`);
    return res.status(200).json({ success: true, unlocked: false, pending: true });
  } catch (e) {
    console.error('❌ [GHL] purchase webhook failed:', e.message);
    return res.status(200).json({ success: false, error: 'internal' });
  }
});

module.exports = router;
