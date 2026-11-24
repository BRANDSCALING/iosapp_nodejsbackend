/**
 * Decision Rooms — BS-AI-004 §3.3 and §6, enforcing BS-AI-008 (approved 19 Nov 2026).
 * One decision, one owner, up to six people, in the owner's order. Roles decide writes:
 * the owner alone writes decision/box1/end/box4 (and the rule); collaborators add to
 * box2/box3 (own box1 and clash_decision in a clash); read_only writes nothing. Entries
 * are append-only and only their author edits them while the round is open. The owner's
 * Check charges the owner one credit and writes a room row to EVERY member's log.
 * New entries push to members over SSE (GET /rooms/:id/events).
 */
const express = require('express');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const router = express.Router();
const { query } = require('../config/database');
const { getAuthMode, verifyBearer } = require('../middleware/cognitoVerify');
const credits = require('../services/di/creditService');
const { roomCheck, serverLogLine } = require('../services/di/mentorService');
const { notify, queueGhl } = require('../services/di/notificationService');
const { guestState, guestGate, guestSpend } = require('../services/di/guestService');
const { legacyResult } = require('../services/edna/legacyResult');

/** First name for a message, never box content (BS-AI-009 §2 rule 2). */
async function firstNameOf(userId) {
  const r = await query('SELECT first_name, name FROM users WHERE UPPER(id::text) = UPPER($1)', [userId]);
  const u = r.rows[0] || {};
  return u.first_name || (u.name ? String(u.name).split(/\s+/)[0] : 'Someone');
}

const requireAuth = async (req, res, next) => {
  const payload = await verifyBearer(req);
  if (payload && payload.sub) { req.userId = payload.sub; return next(); }
  if (getAuthMode() === 'verify') return res.status(401).json({ error: 'auth', message: 'Sign in to continue.' });
  const userId = req.user?.id || req.headers['x-user-id'] || req.query.userId;
  if (!userId) return res.status(401).json({ error: 'auth', message: 'Sign in to continue.' });
  req.userId = userId;
  next();
};

/* ---------- push: one emitter per process; the build note in BS-AI-004 §6 ---------- */
const bus = new EventEmitter();
bus.setMaxListeners(500);
function push(roomId, event) { bus.emit('room:' + roomId, event); }

const OWNER_BOXES = ['decision', 'box1', 'end', 'box4', 'rule'];
const COLLAB_BOXES = ['box2', 'box3'];

async function membership(roomId, userId) {
  const r = await query(`
    SELECT m.*, rm.owner_user_id, rm.kind, rm."order", rm.status, rm.round, rm.decision_text
    FROM room_member m JOIN decision_room rm ON rm.id = m.room_id
    WHERE m.room_id = $1 AND UPPER(m.user_id::text) = UPPER($2) AND m.left_at IS NULL
  `, [roomId, userId]);
  return r.rows[0] || null;
}

async function memberCount(roomId) {
  const r = await query('SELECT count(*)::int AS n FROM room_member WHERE room_id = $1 AND left_at IS NULL', [roomId]);
  return r.rows[0].n;
}

async function loadOrderAndLoop(userId) {
  /* the loop a person adds in, from their result; null when they have no E-DNA yet */
  try {
    const r = await query(`
      SELECT layer7_result, layer1_core_type, layer2_subtype FROM user_quiz_results
      WHERE UPPER(user_id::text) = UPPER($1) ORDER BY completed_at DESC LIMIT 1
    `, [userId]);
    if (!r.rows.length) return { loop: null, order: null, mentor: null };
    let v = r.rows[0].layer7_result;
    for (let i = 0; i < 3 && typeof v === 'string'; i++) v = JSON.parse(v);
    let p1 = v && v.ednaV2 && v.ednaV2.result && v.ednaV2.result.p1;
    if (!p1) {
      const legacy = legacyResult(r.rows[0]); /* pre-v2 run: most members, 21 Nov 2026 */
      p1 = legacy && legacy.p1;
    }
    if (!p1) return { loop: null, order: null, mentor: null };
    const side = p1.core === 'mixed' ? p1.lean : p1.core;
    if (side === 'architect') return { loop: 'logic', order: 'logic_first', mentor: 'architect' };
    if (side === 'alchemist') return { loop: 'feeling', order: 'feeling_first', mentor: 'alchemist' };
    return { loop: null, order: null, mentor: null };
  } catch (e) { return { loop: null, order: null, mentor: null }; }
}

router.use(requireAuth);

/** POST /rooms — {decision_text, kind, order?}; the creator is the Decision owner */
router.post('/rooms', async (req, res) => {
  try {
    const { decision_text, kind = 'new', order } = req.body || {};
    if (!decision_text || !String(decision_text).trim()) {
      return res.status(400).json({ error: 'validation', message: 'Name the decision the room is for.' });
    }
    if (!['new', 'stuck', 'clash'].includes(kind)) {
      return res.status(400).json({ error: 'validation', message: 'kind must be new, stuck or clash.' });
    }
    const own = await loadOrderAndLoop(req.userId);
    const chosen = order || own.order;
    if (!chosen) return res.status(400).json({ error: 'order_required', message: 'Choose the order the room runs in: Logic first or Feeling first.' });
    /* Rooms open with Entry membership; an active guest may own one (BS-AI-012 §6.3;
       Fariza, 22 Nov: everyone sees rooms, only members use them). The app hides the
       button for others — this enforces it for every client, the website included. */
    const tierRow = (await query(
      'SELECT tier FROM users WHERE UPPER(id::text) = UPPER($1)', [req.userId])).rows[0];
    const rawTier = ((tierRow && tierRow.tier) || '').toLowerCase();
    const member = rawTier && ['free', 'none', ''].indexOf(rawTier) === -1;
    const g = member ? null : await guestState(req.userId);
    if (!member && (!g || g.ended)) {
      return res.status(403).json({
        error: 'rooms_membership',
        message: 'Rooms open with Entry membership. Your decisions and your log stay yours on every tier.',
      });
    }

    /* a room a guest owns counts as one of their three decisions (BS-AI-008 §6 amendment) */
    const gate = await guestGate(req.userId);
    if (gate) return res.status(gate.status).json(gate.body);
    const room = (await query(`
      INSERT INTO decision_room (owner_user_id, kind, decision_text, "order")
      VALUES ($1::uuid, $2, $3, $4) RETURNING *
    `, [req.userId, kind, String(decision_text).trim(), chosen])).rows[0];
    await query(`
      INSERT INTO room_member (room_id, user_id, role, loop, mentor, consent_at, joined_at)
      VALUES ($1, $2::uuid, 'decision_owner', $3, $4, now(), now())
    `, [room.id, req.userId, own.loop, own.mentor]);
    await guestSpend(req.userId);
    res.status(201).json({ room });
  } catch (e) {
    console.error('[DI] room create failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** GET /rooms — the caller's rooms with status and waiting flags */
router.get('/rooms', async (req, res) => {
  try {
    const r = await query(`
      SELECT rm.*, m.role AS my_role,
        (SELECT count(*)::int FROM room_member x WHERE x.room_id = rm.id AND x.left_at IS NULL) AS people,
        (SELECT max(e.created_at) FROM room_entry e WHERE e.room_id = rm.id) AS last_entry_at
      FROM decision_room rm
      JOIN room_member m ON m.room_id = rm.id AND UPPER(m.user_id::text) = UPPER($1) AND m.left_at IS NULL
      ORDER BY rm.created_at DESC
    `, [req.userId]);
    res.json({ rooms: r.rows });
  } catch (e) {
    console.error('[DI] rooms list failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** GET /rooms/:id — members only; the caller's own mentor turns only */
router.get('/rooms/:id', async (req, res) => {
  try {
    const me = await membership(req.params.id, req.userId);
    if (!me) return res.status(404).json({ error: 'not_found', message: 'That room was not found.' });
    const room = (await query('SELECT * FROM decision_room WHERE id = $1', [req.params.id])).rows[0];
    const members = (await query(`
      SELECT m.id, m.user_id, m.role, m.loop, m.mentor, m.joined_at, m.left_at,
             u.first_name, u.last_name, u.name, u.photo_url
      FROM room_member m LEFT JOIN users u ON UPPER(u.id::text) = UPPER(m.user_id::text)
      WHERE m.room_id = $1 ORDER BY m.created_at
    `, [req.params.id])).rows;
    const entries = (await query(`
      SELECT e.*, m.user_id AS author_user_id, m.role AS author_role,
             u.first_name, u.name AS author_name
      FROM room_entry e JOIN room_member m ON m.id = e.member_id
      LEFT JOIN users u ON UPPER(u.id::text) = UPPER(m.user_id::text)
      WHERE e.room_id = $1 ORDER BY e.round, e.created_at
    `, [req.params.id])).rows;
    const split = (await query('SELECT * FROM room_split WHERE room_id = $1', [req.params.id])).rows;
    const myTurns = (await query(`
      SELECT mentor, event, response, created_at FROM mentor_turn
      WHERE room_id = $1 AND UPPER(user_id::text) = UPPER($2) ORDER BY created_at DESC LIMIT 30
    `, [req.params.id, req.userId])).rows;
    res.json({ room, me: { role: me.role, member_id: me.id }, members, entries, split, my_turns: myTurns });
  } catch (e) {
    console.error('[DI] room read failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** GET /rooms/:id/events — SSE push of new entries (BS-AI-004 §6) */
router.get('/rooms/:id/events', async (req, res) => {
  const me = await membership(req.params.id, req.userId);
  if (!me) return res.status(404).json({ error: 'not_found', message: 'That room was not found.' });
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  /* the compression middleware buffers responses; flush every SSE write through it */
  const send = (s) => { res.write(s); if (typeof res.flush === 'function') res.flush(); };
  send('retry: 3000\n\n');
  const onEvent = (ev) => send('data: ' + JSON.stringify(ev) + '\n\n');
  bus.on('room:' + req.params.id, onEvent);
  const ping = setInterval(() => send(': ping\n\n'), 25000);
  req.on('close', () => { bus.off('room:' + req.params.id, onEvent); clearInterval(ping); });
});

/** POST /rooms/:id/invites — owner only; {email?, role}; seven-day token */
router.post('/rooms/:id/invites', async (req, res) => {
  try {
    const me = await membership(req.params.id, req.userId);
    if (!me) return res.status(404).json({ error: 'not_found', message: 'That room was not found.' });
    if (me.role !== 'decision_owner') return res.status(403).json({ error: 'owner_only', message: 'Only the Decision owner can invite.' });
    if ((await memberCount(req.params.id)) >= 6) return res.status(409).json({ error: 'full', message: 'The room is full: six people including you.' });
    const { email = null, role = 'collaborator' } = req.body || {};
    const token = crypto.randomBytes(24).toString('base64url');
    const inv = (await query(`
      INSERT INTO room_invite (room_id, token, email, role, expires_at)
      VALUES ($1, $2, $3, $4, now() + interval '7 days') RETURNING *
    `, [req.params.id, token, email ? String(email).toLowerCase() : null, role === 'read_only' ? 'read_only' : 'collaborator'])).rows[0];
    /* N1 — invited to a room: in-app for an existing account, the email through GHL (BS-AI-009 N1) */
    if (inv.email) {
      const inviter = await firstNameOf(req.userId);
      const link = '/app/#invite=' + inv.token;
      const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [inv.email]);
      if (existing.rows.length) {
        const invitee = existing.rows[0].id;
        await notify({
          userId: invitee, event: 'N1', title: me.decision_text,
          body: inviter + ' invited you to decide', objectType: 'room', objectId: req.params.id,
          dedup: 'n1:' + inv.id,
        });
        await queueGhl({
          userId: invitee, event: 'N1', dedup: 'n1:' + inv.id,
          extra: { inviter_name: inviter, decision: me.decision_text, deep_link: link, is_guest: false, invitation_url: link },
        });
      } else {
        /* no account yet: the guest invitation email is GHL's, started with the email address itself */
        await query(
          'INSERT INTO ghl_outbox (event, user_id, payload, site) VALUES ($1, NULL, $2::jsonb, $3)',
          ['room.invited', JSON.stringify({
            event: 'room.invited', email: inv.email, inviter_name: inviter,
            decision: me.decision_text, deep_link: link, is_guest: true, invitation_url: link, site: 'uk',
          }), 'uk']);
      }
    }
    res.status(201).json({ invite: { id: inv.id, token: inv.token, expires_at: inv.expires_at, link: '/app/index.html#invite=' + inv.token } });
  } catch (e) {
    console.error('[DI] invite failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** POST /invites/:token/accept — joining records consent and the person's loop */
router.post('/invites/:token/accept', async (req, res) => {
  try {
    const inv = (await query('SELECT * FROM room_invite WHERE token = $1', [req.params.token])).rows[0];
    if (!inv || inv.accepted_at || new Date(inv.expires_at) < new Date()) {
      return res.status(410).json({ error: 'expired', message: 'This invitation has expired. Ask for a new one.' });
    }
    if ((await memberCount(inv.room_id)) >= 6) return res.status(409).json({ error: 'full', message: 'The room is full.' });
    const existing = await membership(inv.room_id, req.userId);
    if (existing) return res.json({ joined: true, room_id: inv.room_id });
    const who = await loadOrderAndLoop(req.userId);
    if (!req.body || req.body.consent !== true) {
      return res.status(400).json({ error: 'consent_required', message: 'Joining shares your name, type, loop, mentor and entries with this room, for this decision only. Send consent: true to join.' });
    }
    await query(`
      INSERT INTO room_member (room_id, user_id, role, loop, mentor, consent_at, invited_by, joined_at)
      VALUES ($1, $2::uuid, $3, $4, $5, now(), $6::uuid, now())
    `, [inv.room_id, req.userId, inv.role, who.loop, who.mentor, (await query('SELECT owner_user_id FROM decision_room WHERE id = $1', [inv.room_id])).rows[0].owner_user_id]);
    await query('UPDATE room_invite SET accepted_at = now(), accepted_user_id = $2::uuid WHERE id = $1', [inv.id, req.userId]);

    /* A joiner with no membership and no purchase is a guest: the seven-day clock and
       three decisions of their own start now (BS-AI-008 §5; BS-AI-003 §9.5) */
    const u = (await query('SELECT tier FROM users WHERE UPPER(id::text) = UPPER($1)', [req.userId])).rows[0] || {};
    const rawTier = (u.tier || '').toLowerCase();
    const isMember = rawTier && ['free', 'none', ''].indexOf(rawTier) === -1;
    const bought = (await query(
      'SELECT 1 FROM user_quiz_results WHERE UPPER(user_id::text) = UPPER($1) AND full_result_purchased = true LIMIT 1',
      [req.userId])).rows.length > 0;
    if (!isMember && !bought) {
      const already = await query(
        'SELECT 1 FROM guest_access WHERE UPPER(user_id::text) = UPPER($1) LIMIT 1', [req.userId]);
      if (!already.rows.length) {
        const owner = (await query('SELECT owner_user_id FROM decision_room WHERE id = $1', [inv.room_id])).rows[0];
        await query(`
          INSERT INTO guest_access (user_id, invited_by, room_id, ends_at, decisions_left)
          VALUES ($1::uuid, $2::uuid, $3, now() + interval '7 days', 3)
        `, [req.userId, owner ? owner.owner_user_id : null, inv.room_id]);
      }
    }
    push(inv.room_id, { type: 'member' });
    res.json({ joined: true, room_id: inv.room_id, needs_edna: !who.loop });
  } catch (e) {
    console.error('[DI] accept failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** PUT /rooms/:id/boxes/:box — the owner's fields only (403 for anyone else) */
router.put('/rooms/:id/boxes/:box', async (req, res) => {
  try {
    const me = await membership(req.params.id, req.userId);
    if (!me) return res.status(404).json({ error: 'not_found', message: 'That room was not found.' });
    if (me.role !== 'decision_owner') return res.status(403).json({ error: 'owner_only', message: 'Only the Decision owner writes this box.' });
    const box = req.params.box;
    if (!OWNER_BOXES.includes(box)) return res.status(400).json({ error: 'validation', message: 'Not an owner box.' });
    const { text, round = me.round, loop = null } = req.body || {};
    if (!text || !String(text).trim()) return res.status(400).json({ error: 'validation', message: 'Write something in the box first.' });
    const existing = await query(
      'SELECT id FROM room_entry WHERE room_id = $1 AND member_id = $2 AND box = $3 AND round = $4',
      [req.params.id, me.id, box, round]);
    let entry;
    if (existing.rows.length) {
      entry = (await query('UPDATE room_entry SET text = $1, loop = $2 WHERE id = $3 RETURNING *',
        [String(text).trim(), loop, existing.rows[0].id])).rows[0];
    } else {
      entry = (await query(`
        INSERT INTO room_entry (room_id, member_id, box, round, loop, text)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `, [req.params.id, me.id, box, round, loop, String(text).trim()])).rows[0];
    }
    await query("UPDATE decision_room SET status = 'open', updated_at = now() WHERE id = $1", [req.params.id]);
    /* N4 — a clash: the owner wrote the decision and the rule; the other person confirms */
    if (me.kind === 'clash' && box === 'rule') {
      try {
        const others = (await query(
          "SELECT user_id FROM room_member WHERE room_id = $1 AND left_at IS NULL AND role <> 'decision_owner'",
          [req.params.id])).rows;
        const who = await firstNameOf(req.userId);
        for (const o of others) {
          const dedup = 'n4:' + req.params.id + ':' + o.user_id;
          const fresh = await notify({
            userId: o.user_id, event: 'N4', title: me.decision_text,
            body: who + ' wrote the decision: confirm or reply',
            objectType: 'room', objectId: req.params.id, dedup,
          });
          if (fresh) {
            await queueGhl({
              userId: o.user_id, event: 'N4', dedup,
              extra: { inviter_name: who, decision: me.decision_text, deep_link: '/app/#room=' + req.params.id },
            });
          }
        }
      } catch (e) { console.warn('[DI] N4 notify:', e.message); }
    }
    push(req.params.id, { type: 'entry', box, round });
    res.json({ entry });
  } catch (e) {
    console.error('[DI] room box failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** POST /rooms/:id/entries — collaborators (and the owner) add to the open round */
router.post('/rooms/:id/entries', async (req, res) => {
  try {
    const me = await membership(req.params.id, req.userId);
    if (!me) return res.status(404).json({ error: 'not_found', message: 'That room was not found.' });
    if (me.role === 'read_only') return res.status(403).json({ error: 'read_only', message: 'You can read this room, not write in it.' });
    const { box, text, loop = me.loop } = req.body || {};
    const clashExtras = me.kind === 'clash' ? ['box1', 'clash_decision'] : [];
    const allowed = me.role === 'decision_owner' ? OWNER_BOXES.concat(COLLAB_BOXES, clashExtras) : COLLAB_BOXES.concat(clashExtras);
    if (!allowed.includes(box)) {
      return res.status(403).json({ error: 'box_not_yours', message: 'That box is not open to you in this room.' });
    }
    if (!text || !String(text).trim()) return res.status(400).json({ error: 'validation', message: 'Write something first.' });
    if (['ready', 'decided', 'reviewed', 'closed'].includes(me.status)) {
      return res.status(409).json({ error: 'closed', message: 'This room has been checked. Open it in your log.' });
    }
    const entry = (await query(`
      INSERT INTO room_entry (room_id, member_id, box, round, loop, text)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [req.params.id, me.id, box, me.round, loop, String(text).trim()])).rows[0];
    await query("UPDATE decision_room SET status = 'waiting_owner', updated_at = now() WHERE id = $1 AND status IN ('open','waiting_room')", [req.params.id]);
    /* N3 — the owner, once per round, not per entry (BS-AI-009 N3 digest rule) */
    if (me.role !== 'decision_owner') {
      try {
        const dedup = 'n3:' + req.params.id + ':' + me.round;
        const who = await firstNameOf(req.userId);
        const fresh = await notify({
          userId: me.owner_user_id, event: 'N3', title: me.decision_text,
          body: who + ' added to your decision', objectType: 'room', objectId: req.params.id, dedup,
        });
        if (fresh) {
          await queueGhl({
            userId: me.owner_user_id, event: 'N3', dedup,
            extra: { inviter_name: who, decision: me.decision_text, deep_link: '/app/#room=' + req.params.id },
          });
        }
      } catch (e) { console.warn('[DI] N3 notify:', e.message); }
    }
    push(req.params.id, { type: 'entry', box, round: me.round });
    res.status(201).json({ entry });
  } catch (e) {
    console.error('[DI] room entry failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** POST /rooms/:id/rounds — the owner asks the room for one more round */
router.post('/rooms/:id/rounds', async (req, res) => {
  try {
    const me = await membership(req.params.id, req.userId);
    if (!me) return res.status(404).json({ error: 'not_found', message: 'That room was not found.' });
    if (me.role !== 'decision_owner') return res.status(403).json({ error: 'owner_only', message: 'Only the Decision owner asks for a round.' });
    const r = await query("UPDATE decision_room SET round = round + 1, status = 'waiting_room', updated_at = now() WHERE id = $1 RETURNING *", [req.params.id]);
    /* N2 — every collaborator who has not yet added in this round (BS-AI-009 N2) */
    try {
      const waiting = (await query(`
        SELECT m.user_id, m.loop FROM room_member m
        WHERE m.room_id = $1 AND m.left_at IS NULL AND m.role = 'collaborator'
      `, [req.params.id])).rows;
      for (const w of waiting) {
        const dedup = 'n2:' + req.params.id + ':' + r.rows[0].round + ':' + w.user_id;
        const fresh = await notify({
          userId: w.user_id, event: 'N2', title: me.decision_text,
          body: 'Add your ' + (w.loop === 'logic' ? 'Logic' : w.loop === 'feeling' ? 'Feeling' : 'input'),
          objectType: 'room', objectId: req.params.id, dedup,
        });
        if (fresh) {
          await queueGhl({
            userId: w.user_id, event: 'N2', dedup,
            extra: { decision: me.decision_text, deep_link: '/app/#room=' + req.params.id },
          });
        }
      }
    } catch (e) { console.warn('[DI] N2 notify:', e.message); }
    push(req.params.id, { type: 'round', round: r.rows[0].round });
    res.json({ room: r.rows[0] });
  } catch (e) {
    console.error('[DI] room round failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/**
 * POST /rooms/:id/check — the owner's Check: the cross-check and readiness read from
 * the OWNER's mentor; one credit to the owner; the room row to every member's log.
 */
router.post('/rooms/:id/check', async (req, res) => {
  try {
    const me = await membership(req.params.id, req.userId);
    if (!me) return res.status(404).json({ error: 'not_found', message: 'That room was not found.' });
    if (me.role !== 'decision_owner') return res.status(403).json({ error: 'owner_only', message: 'Only the Decision owner takes the room to Check.' });
    if (['decided', 'reviewed', 'closed'].includes(me.status)) {
      return res.status(409).json({ error: 'checked', message: 'This room has been checked. Open it in your log.' });
    }
    if ((await credits.balance(req.userId)) <= 0) {
      return res.status(402).json({ error: 'out_of_credits', message: 'You have used your decisions. Top up to carry on.' });
    }
    const room = (await query('SELECT * FROM decision_room WHERE id = $1', [req.params.id])).rows[0];
    const entries = (await query(`
      SELECT e.*, m.role AS author_role, m.loop AS author_loop, u.first_name, u.name AS author_name
      FROM room_entry e JOIN room_member m ON m.id = e.member_id
      LEFT JOIN users u ON UPPER(u.id::text) = UPPER(m.user_id::text)
      WHERE e.room_id = $1 ORDER BY e.round, e.created_at
    `, [req.params.id])).rows;
    const box4 = entries.filter((e) => e.box === 'box4').pop();
    if (!box4) return res.status(409).json({ error: 'box4_missing', message: 'Write your decision in the last box first.' });

    const out = await roomCheck({ userId: req.userId, room, entries, mentor: me.mentor || (room.order === 'logic_first' ? 'architect' : 'alchemist') });
    const j = out.json;
    /* the log line members see is composed here with the server's dates; the model never
       writes a date (BS-AI-006 change 9, Fariza, 24 Nov) */
    j.log_line = serverLogLine({
      decisionText: room.decision_text, order: room.order, rounds: room.round, warning: j.warning,
      decidedText: box4.text, restsOn: j.readiness ? j.readiness.rests_on : null,
      reviewDate: (function (x) { x.setMonth(x.getMonth() + 3); return x; })(new Date()),
    });

    /* the room row in every member's log (BS-AI-008 §6) */
    const members = (await query('SELECT * FROM room_member WHERE room_id = $1 AND left_at IS NULL', [req.params.id])).rows;
    const began = room.order === 'logic_first' ? 'logic' : 'feeling';
    const reviewDate = null; /* default three months */
    for (const m of members) {
      await query(`
        INSERT INTO decision_log (user_id, decision_id, text, "order", began_loop, finished_loop, switched,
          rounds, readiness, rests_on, decided_text, written_by, review_date, room_id, role, rule)
        VALUES ($1::uuid, NULL, $2, $3, $4, $4, false, $5, $6, $7, $8, 'mentor',
                COALESCE($9::date, (CURRENT_DATE + interval '3 months')::date), $10, $11, $12::jsonb)
      `, [m.user_id, room.decision_text, room.order, began, room.round,
        j.readiness ? ({ Ready: 'ready', 'One more round': 'one_more_round', 'Not yet': 'not_yet' }[(Object.keys({ Ready: 1, 'One more round': 1, 'Not yet': 1 }).find((k) => String(j.readiness.read).startsWith(k)))] || null) : null,
        j.readiness ? j.readiness.rests_on : null, box4.text, reviewDate, room.id, m.role,
        j.rule ? JSON.stringify(j.rule) : null]);
    }
    const ledger = await credits.charge(req.userId, { roomId: room.id, mentorTurnId: out.turnRow.id, reason: 'check' });
    await query('UPDATE mentor_turn SET charged = true WHERE id = $1', [out.turnRow.id]);
    await query("UPDATE decision_room SET status = 'decided', checked_at = now(), review_date = (CURRENT_DATE + interval '3 months')::date, rule = $2::jsonb, updated_at = now() WHERE id = $1",
      [room.id, j.rule ? JSON.stringify(j.rule) : null]);
    if (j.split && j.split.box) {
      await query('INSERT INTO room_split (room_id, box, line) VALUES ($1, $2, $3)', [room.id, j.split.box, j.split.line || '']);
    }
    /* N5 — decided: every participant, push/in-app only (the log is in the app) */
    try {
      for (const m of members) {
        if (String(m.user_id).toUpperCase() === String(req.userId).toUpperCase()) continue;
        await notify({
          userId: m.user_id, event: 'N5', title: room.decision_text,
          body: 'Decided · the room row is in your log',
          objectType: 'room', objectId: room.id, dedup: 'n5:' + room.id + ':' + m.user_id,
        });
      }
    } catch (e) { console.warn('[DI] N5 notify:', e.message); }
    push(room.id, { type: 'checked' });
    res.json({ mentor: out.mentor, response: j, charged: true, ledger_id: ledger.id });
  } catch (e) {
    if (e.code === 'out_of_credits') return res.status(402).json({ error: 'out_of_credits', message: 'You have used your decisions. Top up to carry on.' });
    if (e.code === 'unavailable') return res.status(503).json({ error: 'mentor_unavailable', message: 'Your mentor is not available right now. Everyone’s entries are saved.' });
    console.error('[DI] room check failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** POST /rooms/:id/confirm — the other person in a clash confirms the decision and rule */
router.post('/rooms/:id/confirm', async (req, res) => {
  try {
    const me = await membership(req.params.id, req.userId);
    if (!me) return res.status(404).json({ error: 'not_found', message: 'That room was not found.' });
    if (me.role === 'decision_owner') return res.status(403).json({ error: 'not_you', message: 'The other person confirms, not the owner.' });
    await query(`
      UPDATE room_entry SET confirmed_by = $2::uuid
      WHERE room_id = $1 AND box IN ('box4','rule') AND confirmed_by IS NULL
    `, [req.params.id, req.userId]);
    push(req.params.id, { type: 'confirmed' });
    res.json({ confirmed: true });
  } catch (e) {
    console.error('[DI] confirm failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** Remove, leave, close — entries stay attributed (BS-AI-008 §5) */
router.delete('/rooms/:id/members/:user', async (req, res) => {
  const me = await membership(req.params.id, req.userId);
  if (!me) return res.status(404).json({ error: 'not_found', message: 'That room was not found.' });
  if (me.role !== 'decision_owner') return res.status(403).json({ error: 'owner_only', message: 'Only the Decision owner removes people.' });
  await query('UPDATE room_member SET left_at = now() WHERE room_id = $1 AND UPPER(user_id::text) = UPPER($2)', [req.params.id, req.params.user]);
  /* N14 — one email, no content of the room (BS-AI-009 N14) */
  const dedupR = 'n14r:' + req.params.id + ':' + req.params.user;
  const freshR = await notify({
    userId: req.params.user, event: 'N14', title: me.decision_text,
    body: 'You were removed from a Decision Room', objectType: 'room', objectId: req.params.id, dedup: dedupR,
  });
  if (freshR) await queueGhl({ userId: req.params.user, event: 'N14', dedup: dedupR, extra: { decision: me.decision_text, removed: true } });
  push(req.params.id, { type: 'member' });
  res.json({ removed: true });
});
router.post('/rooms/:id/leave', async (req, res) => {
  const me = await membership(req.params.id, req.userId);
  if (!me) return res.status(404).json({ error: 'not_found', message: 'That room was not found.' });
  if (me.role === 'decision_owner') return res.status(409).json({ error: 'owner', message: 'The owner closes the room rather than leaving it.' });
  await query('UPDATE room_member SET left_at = now() WHERE id = $1', [me.id]);
  push(req.params.id, { type: 'member' });
  res.json({ left: true });
});
router.post('/rooms/:id/close', async (req, res) => {
  const me = await membership(req.params.id, req.userId);
  if (!me) return res.status(404).json({ error: 'not_found', message: 'That room was not found.' });
  if (me.role !== 'decision_owner') return res.status(403).json({ error: 'owner_only', message: 'Only the Decision owner closes the room.' });
  await query("UPDATE decision_room SET status = 'closed', closed_at = now(), updated_at = now() WHERE id = $1", [req.params.id]);
  /* N14 — every participant on close */
  try {
    const others = (await query(
      "SELECT user_id FROM room_member WHERE room_id = $1 AND left_at IS NULL AND role <> 'decision_owner'",
      [req.params.id])).rows;
    for (const o of others) {
      const dedup = 'n14c:' + req.params.id + ':' + o.user_id;
      const fresh = await notify({
        userId: o.user_id, event: 'N14', title: me.decision_text,
        body: 'The room was closed', objectType: 'room', objectId: req.params.id, dedup,
      });
      if (fresh) await queueGhl({ userId: o.user_id, event: 'N14', dedup, extra: { decision: me.decision_text, removed: false } });
    }
  } catch (e) { console.warn('[DI] N14 notify:', e.message); }
  res.json({ closed: true });
});

module.exports = router;
