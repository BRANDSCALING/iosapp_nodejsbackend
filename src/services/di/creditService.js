/**
 * Credits in code — BS-AI-007 §3, §5, §6 via BS-AI-004 §5 (approved 19 Nov 2026).
 * The ledger is append-only; the balance is grants minus ledger rows; grants come only
 * from the Stripe/GHL webhook, the tier allowance job, the £99 purchase or an admin
 * grant. A credit is consumed by the first Check on a decision, +1 per further 15 turns.
 * The daily cap (10 checks a day) returns a message, never a silent failure.
 */
const { query } = require('../../config/database');

async function balance(userId) {
  const r = await query(`
    SELECT COALESCE((SELECT sum(amount) FROM credit_grant
                     WHERE UPPER(user_id::text) = UPPER($1)
                       AND (expires_at IS NULL OR expires_at > now())), 0)
         - COALESCE((SELECT sum(amount) FROM credit_ledger
                     WHERE UPPER(user_id::text) = UPPER($1)), 0) AS balance
  `, [userId]);
  return Number(r.rows[0].balance);
}

/** Checks charged today (the daily cap of 10, BS-AI-007 §2). */
async function checksToday(userId) {
  const r = await query(`
    SELECT count(*)::int AS n FROM credit_ledger
    WHERE UPPER(user_id::text) = UPPER($1)
      AND reason IN ('check','manual_check')
      AND created_at >= date_trunc('day', now())
  `, [userId]);
  return r.rows[0].n;
}

/**
 * Append one ledger row against the oldest open grant.
 * Throws {code:'out_of_credits'} when the balance is zero.
 */
async function charge(userId, { decisionId = null, roomId = null, mentorTurnId = null, reason = 'check' }) {
  if ((await balance(userId)) <= 0) {
    const e = new Error('out of credits');
    e.code = 'out_of_credits';
    throw e;
  }
  const grant = await query(`
    SELECT g.id FROM credit_grant g
    WHERE UPPER(g.user_id::text) = UPPER($1)
      AND (g.expires_at IS NULL OR g.expires_at > now())
      AND g.amount > COALESCE((SELECT count(*) FROM credit_ledger l WHERE l.grant_id = g.id), 0)
    ORDER BY g.expires_at NULLS LAST, g.granted_at
    LIMIT 1
  `, [userId]);
  const r = await query(`
    INSERT INTO credit_ledger (user_id, grant_id, decision_id, room_id, mentor_turn_id, amount, reason)
    VALUES ($1::uuid, $2, $3, $4, $5, 1, $6) RETURNING *
  `, [userId, grant.rows[0] ? grant.rows[0].id : null, decisionId, roomId, mentorTurnId, reason]);
  return r.rows[0];
}

/** Grants with expiry and the ledger, for GET /credits (BS-AI-007 §7). */
async function statement(userId) {
  const grants = await query(`
    SELECT id, source, amount, granted_at, expires_at FROM credit_grant
    WHERE UPPER(user_id::text) = UPPER($1) ORDER BY granted_at DESC
  `, [userId]);
  const ledger = await query(`
    SELECT l.id, l.decision_id, l.room_id, l.reason, l.created_at, d.text AS decision_text
    FROM credit_ledger l LEFT JOIN decision d ON d.id = l.decision_id
    WHERE UPPER(l.user_id::text) = UPPER($1) ORDER BY l.created_at DESC LIMIT 100
  `, [userId]);
  return { balance: await balance(userId), grants: grants.rows, ledger: ledger.rows };
}

async function grant(userId, source, amount, { expiresAt = null, stripeEventId = null } = {}) {
  const r = await query(`
    INSERT INTO credit_grant (user_id, source, amount, expires_at, stripe_event_id)
    VALUES ($1::uuid, $2, $3, $4, $5) RETURNING *
  `, [userId, source, amount, expiresAt, stripeEventId]);
  return r.rows[0];
}

module.exports = { balance, checksToday, charge, statement, grant };
