/**
 * Notification service — BS-AI-009 (events, rules, surfaces) and BS-AI-013 §7 (the
 * webhook contract with GHL). Three jobs:
 *
 *  1. notify(): the in-app record (always, BS-AI-009 §2 rule 1), idempotent on a dedup
 *     key so an event is never sent twice on one channel.
 *  2. queueGhl(): one ghl_outbox row per event that has an email. GHL owns every email
 *     (Fariza Javed, 19 Nov): the backend only starts the workflow with the §7 payload.
 *     Until the GHL team gives us the inbound URL and secret, rows wait as pending —
 *     nothing is lost and nothing is sent twice (event_id is the idempotency key).
 *  3. needsYou(): the live "Needs you" rows (BS-AI-003 §3; BS-AI-009 §5) derived from
 *     state, so rows clear themselves when the action is done, never by dismissal.
 *
 * A message names the decision and what is needed, never the content of a box
 * (BS-AI-009 §2 rule 2): nothing here reads box text except the decision's own title.
 */
const { query } = require('../../config/database');

/* notification event → the GHL workflow event it starts (BS-AI-013 §7) */
const GHL_EVENT = {
  N1: 'room.invited',
  N2: 'room.input_needed',
  N3: 'room.new_input',
  N4: 'room.confirm',
  N6: 'review.due',
  N7: 'review.reminder',
  N10: 'credits.zero',
  N12_5: 'guest.day5',
  N12_7: 'guest.day7',
  N14: 'room.closed',
};

/* events a person may switch off; security/legal (N15) and guest N12 stay on (BS-AI-009 §2 rule 6) */
const ALWAYS_ON = new Set(['N15', 'N12_5', 'N12_7']);

async function emailPrefOn(userId, event) {
  if (ALWAYS_ON.has(event)) return true;
  const r = await query(
    'SELECT email FROM notification_pref WHERE UPPER(user_id::text) = UPPER($1) AND event = $2',
    [userId, event.split('_')[0]]);
  return r.rows.length ? r.rows[0].email !== false : true; /* default on (BS-AI-009 §3) */
}

/** The in-app row. Returns the row, or null when the dedup key already exists. */
async function notify({ userId, event, title, body = null, objectType = null, objectId = null, dedup = null }) {
  try {
    const r = await query(`
      INSERT INTO notification (user_id, event, title, body, object_type, object_id, channel, dedup, sent_at)
      VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, 'inapp', $7, now())
      ON CONFLICT (dedup) WHERE dedup IS NOT NULL DO NOTHING RETURNING *
    `, [userId, event, title, body, objectType, objectId, dedup]);
    return r.rows[0] || null;
  } catch (e) {
    /* a notification must never break the action it rides on */
    console.warn('[DI] notify failed:', e.message);
    return null;
  }
}

/** Queue the §7 payload that starts a GHL workflow. Respects the person's email switch. */
async function queueGhl({ userId, event, extra = {}, dedup = null }) {
  try {
    const ghlEvent = GHL_EVENT[event] || event;
    if (!(await emailPrefOn(userId, event))) return null;
    if (dedup) {
      const dup = await query("SELECT 1 FROM ghl_outbox WHERE payload->>'dedup' = $1 LIMIT 1", [dedup]);
      if (dup.rows.length) return null;
    }
    const u = (await query(
      'SELECT id, email, first_name, last_name, name, site FROM users WHERE UPPER(id::text) = UPPER($1)',
      [userId])).rows[0];
    if (!u || !u.email) return null;
    const payload = {
      event: ghlEvent,
      bs_user_id: u.id,
      email: u.email,
      first_name: u.first_name || (u.name ? String(u.name).split(/\s+/)[0] : null),
      last_name: u.last_name || null,
      site: u.site || 'uk',
      ...(dedup ? { dedup } : {}),
      ...extra,
    };
    const r = await query(
      'INSERT INTO ghl_outbox (event, user_id, payload, site) VALUES ($1, $2::uuid, $3::jsonb, $4) RETURNING *',
      [ghlEvent, userId, JSON.stringify(payload), payload.site]);
    deliverOutbox().catch(() => {}); /* best effort now; the scheduler retries */
    return r.rows[0];
  } catch (e) {
    console.warn('[DI] queueGhl failed:', e.message);
    return null;
  }
}

/** Send pending outbox rows when the GHL inbound webhook is configured; otherwise leave them. */
async function deliverOutbox() {
  const url = process.env.GHL_INBOUND_WEBHOOK_URL;
  if (!url) return { sent: 0, pending: true };
  const secret = process.env.GHL_INBOUND_WEBHOOK_SECRET || '';
  const rows = (await query(
    "SELECT * FROM ghl_outbox WHERE status = 'pending' AND attempts < 5 ORDER BY created_at LIMIT 20")).rows;
  let sent = 0;
  for (const row of rows) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-webhook-key': secret },
        body: JSON.stringify({ ...row.payload, event_id: row.event_id }),
      });
      await query(
        'UPDATE ghl_outbox SET status = $2, attempts = attempts + 1, last_attempt_at = now() WHERE id = $1',
        [row.id, res.ok ? 'sent' : 'pending']);
      if (res.ok) sent += 1;
    } catch (e) {
      await query('UPDATE ghl_outbox SET attempts = attempts + 1, last_attempt_at = now() WHERE id = $1', [row.id]);
    }
  }
  return { sent };
}

/**
 * The live Needs you rows (BS-AI-009 §5): open N1 to N4, N6 and N7 items, derived from
 * state so they leave when the action is done. Each row: {event, title, line, action, …ids}.
 */
async function needsYou(userId) {
  const items = [];
  const me = (await query('SELECT email FROM users WHERE UPPER(id::text) = UPPER($1)', [userId])).rows[0];

  /* N1 · invited to a room (by my email, unaccepted, unexpired) */
  if (me && me.email) {
    const inv = await query(`
      SELECT i.token, i.expires_at, rm.decision_text, rm.id AS room_id,
             u.first_name, u.name AS owner_name
      FROM room_invite i
      JOIN decision_room rm ON rm.id = i.room_id
      LEFT JOIN users u ON UPPER(u.id::text) = UPPER(rm.owner_user_id::text)
      WHERE LOWER(i.email) = LOWER($1) AND i.accepted_at IS NULL AND i.expires_at > now()
        AND rm.status NOT IN ('decided','reviewed','closed')
    `, [me.email]);
    inv.rows.forEach((r) => items.push({
      event: 'N1', title: r.decision_text,
      line: (r.first_name || r.owner_name || 'Someone') + ' invited you to decide',
      action: 'Open the room', room_id: r.room_id, invite_token: r.token,
    }));
  }

  /* N2 · a round is open and I have not added (collaborator) */
  const n2 = await query(`
    SELECT rm.id AS room_id, rm.decision_text, rm.round, m.loop
    FROM room_member m JOIN decision_room rm ON rm.id = m.room_id
    WHERE UPPER(m.user_id::text) = UPPER($1) AND m.left_at IS NULL
      AND m.role = 'collaborator' AND rm.status = 'waiting_room'
      AND NOT EXISTS (SELECT 1 FROM room_entry e WHERE e.room_id = rm.id AND e.member_id = m.id AND e.round = rm.round)
  `, [userId]);
  n2.rows.forEach((r) => items.push({
    event: 'N2', title: r.decision_text,
    line: 'Add your ' + (r.loop === 'logic' ? 'Logic' : r.loop === 'feeling' ? 'Feeling' : 'input'),
    action: 'Add your input', room_id: r.room_id,
  }));

  /* N3 · waiting on me as the owner (someone added, or everyone has) */
  const n3 = await query(`
    SELECT rm.id AS room_id, rm.decision_text
    FROM decision_room rm
    WHERE UPPER(rm.owner_user_id::text) = UPPER($1) AND rm.status = 'waiting_owner'
  `, [userId]);
  n3.rows.forEach((r) => items.push({
    event: 'N3', title: r.decision_text, line: 'Your room has new input',
    action: 'Open the room', room_id: r.room_id,
  }));

  /* N4 · a clash decision waits for my confirmation */
  const n4 = await query(`
    SELECT DISTINCT rm.id AS room_id, rm.decision_text
    FROM room_member m JOIN decision_room rm ON rm.id = m.room_id
    WHERE UPPER(m.user_id::text) = UPPER($1) AND m.left_at IS NULL AND m.role <> 'decision_owner'
      AND rm.kind = 'clash'
      AND EXISTS (SELECT 1 FROM room_entry e WHERE e.room_id = rm.id AND e.box = 'box4' AND e.confirmed_by IS NULL)
  `, [userId]);
  n4.rows.forEach((r) => items.push({
    event: 'N4', title: r.decision_text, line: 'Confirm the decision and the rule',
    action: 'Read and confirm', room_id: r.room_id,
  }));

  /* N6/N7 · reviews due */
  const n6 = await query(`
    SELECT id, decision_id, text, review_date FROM decision_log
    WHERE UPPER(user_id::text) = UPPER($1) AND outcome IS NULL
      AND decided_text IS NOT NULL AND review_date IS NOT NULL AND review_date <= CURRENT_DATE
    ORDER BY review_date
  `, [userId]);
  n6.rows.forEach((r) => items.push({
    event: 'N6', title: r.text, line: 'Three questions with your mentor',
    action: 'Review it', log_id: r.id, decision_id: r.decision_id,
  }));

  return items;
}

module.exports = { notify, queueGhl, deliverOutbox, needsYou, GHL_EVENT };
