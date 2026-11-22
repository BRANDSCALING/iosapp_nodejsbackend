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
const { notify } = require('../services/di/notificationService');
const { convertGuest } = require('../services/di/guestService');
const credits = require('../services/di/creditService');

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
        /* the £99 purchase carries its 10 decisions (BS-AI-007 §2) — this endpoint is the
           one Mashab's live workflow calls, and it granted nothing until 22 Nov. Once per
           person: the GHL product is one per buyer, and webhook retries must not stack. */
        try {
          const has = await query(
            `SELECT 1 FROM credit_grant WHERE UPPER(user_id::text) = UPPER($1) AND source = 'purchase_99' LIMIT 1`,
            [u.rows[0].id]);
          if (!has.rows.length) {
            await credits.grant(u.rows[0].id, 'purchase_99', 10);
            console.log(`🎁 [GHL] granted 10 credits to ${norm}`);
          }
        } catch (grantErr) {
          console.error('⚠️ [GHL] credit grant failed:', grantErr.message);
        }
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

/**
 * POST /di — the GHL → backend contract of BS-AI-013 §7, one endpoint for the four
 * outbound workflow events. Same key gating as /purchase; idempotent on event_id.
 * The backend grants credits and unlocks content on order.completed ONLY, never from
 * the client (BS-AI-007 §6).
 */
router.post('/di', async (req, res) => {
  try {
    const secret = process.env.GHL_WEBHOOK_SECRET;
    if (!secret || (req.query.key !== secret && req.headers['x-webhook-key'] !== secret)) {
      return res.status(401).json({ success: false, error: 'unauthorized' });
    }
    const b = req.body || {};
    const event = String(b.event || '');
    const eventId = b.event_id ? String(b.event_id) : null;
    if (!event) return res.status(200).json({ success: false, error: 'no event' });

    /* idempotency: a retried webhook applies once */
    if (eventId) {
      const dup = await query(
        'INSERT INTO ghl_inbound_event (event_id, event, payload) VALUES ($1, $2, $3::jsonb) ON CONFLICT (event_id) DO NOTHING RETURNING id',
        [eventId, event, JSON.stringify(b)]);
      if (!dup.rows.length) return res.status(200).json({ success: true, duplicate: true });
    }

    /* find the person by bs_user_id or email */
    let userId = b.bs_user_id || null;
    if (!userId && b.email) {
      const u = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [String(b.email)]);
      userId = u.rows.length ? u.rows[0].id : null;
    }
    if (!userId) {
      console.warn('⚠️ [GHL·DI] ' + event + ': no matching account', b.email || '(no email)');
      return res.status(200).json({ success: false, error: 'no matching account' });
    }

    if (event === 'order.completed') {
      /* the £99 report: unlock + 10 decisions (BS-AI-007 §2); a pack: its amount */
      const product = String(b.product || '').toLowerCase();
      const isPack = product.includes('pack') || b.pack;
      const amount = isPack ? parseInt(b.pack || b.amount_credits || 0, 10) || 0 : 10;
      if (!isPack) {
        await query('UPDATE user_quiz_results SET full_result_purchased = true WHERE UPPER(user_id::text) = UPPER($1)', [userId]);
      }
      if (amount > 0) {
        await credits.grant(userId, isPack ? 'pack' : 'purchase_99', amount, { stripeEventId: b.stripe_payment_id || eventId });
      }
      await convertGuest(userId);
      console.log(`✅ [GHL·DI] order.completed for ${userId}: ${isPack ? amount + '-credit pack' : 'report + 10 decisions'}`);
      return res.status(200).json({ success: true });
    }

    if (event === 'membership.payment_failed') {
      await notify({
        userId, event: 'A8', title: 'Your payment did not go through',
        body: 'We try your card again; update it to keep your decisions running',
        dedup: eventId ? 'a8:' + eventId : null,
      });
      return res.status(200).json({ success: true });
    }

    if (event === 'membership.paid') {
      return res.status(200).json({ success: true });
    }

    if (event === 'membership.cancelled') {
      await notify({
        userId, event: 'A10', title: 'Your membership is cancelled',
        body: b.ends_at ? 'It runs until ' + String(b.ends_at).slice(0, 10) : 'Your log and reports stay open',
        dedup: eventId ? 'a10:' + eventId : null,
      });
      return res.status(200).json({ success: true });
    }

    if (event === 'contact.unsubscribed') {
      /* the person switched email off in GHL: honour it for the named event, or all switchable ones */
      const ev = b.notification_event || null;
      const EVENTS = ev ? [ev] : ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N10', 'N13', 'N14'];
      for (const e of EVENTS) {
        await query(`
          INSERT INTO notification_pref (user_id, event, push, email) VALUES ($1::uuid, $2, true, false)
          ON CONFLICT (user_id, event) DO UPDATE SET email = false
        `, [userId, e]);
      }
      return res.status(200).json({ success: true });
    }

    console.warn('⚠️ [GHL·DI] unknown event:', event);
    return res.status(200).json({ success: false, error: 'unknown event' });
  } catch (e) {
    console.error('❌ [GHL·DI] webhook failed:', e.message);
    return res.status(200).json({ success: false, error: 'internal' });
  }
});

module.exports = router;
