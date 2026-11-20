/**
 * Guest service — BS-AI-008 §5 / BS-AI-003 §9.5 / BS-AI-007 §2: a guest has the app for
 * seven days and three decisions of their own (rooms they own included). After day 7
 * everything is read-only: the report, the log and the rooms stay; new decisions wait;
 * nothing is deleted. Buying converts the guest (set by the GHL order webhook).
 */
const { query } = require('../../config/database');

async function guestState(userId) {
  const g = (await query(`
    SELECT * FROM guest_access
    WHERE UPPER(user_id::text) = UPPER($1) AND converted_at IS NULL
    ORDER BY started_at DESC LIMIT 1
  `, [userId])).rows[0];
  if (!g) return null;
  return {
    id: g.id,
    ends_at: g.ends_at,
    ended: new Date(g.ends_at) <= new Date(),
    decisions_left: g.decisions_left,
    days_left: Math.max(0, Math.ceil((new Date(g.ends_at) - Date.now()) / 86400000)),
  };
}

/** The 403 body when a guest cannot start something new; null when they can. */
async function guestGate(userId) {
  const g = await guestState(userId);
  if (!g) return null;
  if (g.ended) {
    return { status: 403, body: { error: 'guest_ended', message: 'Your guest access has ended. Your result, report and log stay yours to read. Keep the app with the Advanced Report or a membership.' } };
  }
  if (g.decisions_left <= 0) {
    return { status: 403, body: { error: 'guest_limit', message: 'Your three guest decisions are used. Keep the app with the Advanced Report or a membership.' } };
  }
  return null;
}

async function guestSpend(userId) {
  await query(`
    UPDATE guest_access SET decisions_left = decisions_left - 1
    WHERE id = (SELECT id FROM guest_access WHERE UPPER(user_id::text) = UPPER($1) AND converted_at IS NULL ORDER BY started_at DESC LIMIT 1)
      AND decisions_left > 0
  `, [userId]);
}

/** A purchase keeps the app: the clock stops counting against them. */
async function convertGuest(userId) {
  await query(
    'UPDATE guest_access SET converted_at = now() WHERE UPPER(user_id::text) = UPPER($1) AND converted_at IS NULL',
    [userId]);
}

module.exports = { guestState, guestGate, guestSpend, convertGuest };
