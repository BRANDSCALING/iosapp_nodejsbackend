/**
 * Decision Intelligence — the Decision service and the Log service.
 * BS-AI-004 §3.1 and §3.2 (approved 19 Nov 2026), build-order steps 1–2: create, fill,
 * save, reopen and list decisions, and the Decision Log with its filters, summary and
 * review fields. The mentor endpoints (§4), credits (§5) and rooms (§6) are later steps;
 * nothing here calls a model or charges a credit.
 *
 * BS-AI-004 is written for row-level security; this backend runs as one database role,
 * so every ownership and box rule the policies would enforce is enforced here instead.
 */
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { getAuthMode, verifyBearer } = require('../middleware/cognitoVerify');
const { fiveWayKey } = require('../services/edna/workbookSelect');
const { mentorTurn } = require('../services/di/mentorService');
const credits = require('../services/di/creditService');

/* same contract as workbooks.js: verified Bearer first, x-user-id fallback in legacy mode */
const requireAuth = async (req, res, next) => {
  const payload = await verifyBearer(req);
  if (payload && payload.sub) { req.userId = payload.sub; req.authVerified = true; return next(); }
  if (getAuthMode() === 'verify') {
    return res.status(401).json({ error: 'auth', message: 'Sign in to continue.' });
  }
  const userId = req.user?.id || req.headers['x-user-id'] || req.query.userId;
  if (!userId) return res.status(401).json({ error: 'auth', message: 'Sign in to continue.' });
  req.userId = userId;
  next();
};
router.use(requireAuth);

const BOXES = ['decision', 'box1', 'box2', 'box3', 'end', 'box4'];
const CONTEXTS = ['money', 'time', 'people', 'conflict', 'personal'];

function unwrapLayer7(raw) {
  let v = raw;
  for (let i = 0; i < 3; i++) {
    if (v && typeof v === 'object') return v;
    if (typeof v !== 'string') return null;
    try { v = JSON.parse(v); } catch (e) { return null; }
  }
  return typeof v === 'object' ? v : null;
}

/** The person's v2 result record and five-way Part 1 key, or nulls. */
async function loadEdna(userId) {
  const r = await query(`
    SELECT layer7_result FROM user_quiz_results
    WHERE UPPER(user_id::text) = UPPER($1)
    ORDER BY completed_at DESC LIMIT 1
  `, [userId]);
  if (r.rows.length === 0) return { typeKey: null, result: null };
  const latest = unwrapLayer7(r.rows[0].layer7_result);
  if (!latest || !latest.ednaV2 || !latest.ednaV2.result) return { typeKey: null, result: null };
  return { typeKey: fiveWayKey(latest.ednaV2.result), result: latest.ednaV2.result };
}
async function loadTypeKey(userId) { return (await loadEdna(userId)).typeKey; }

/** The order a type begins with (BS-AI-001 §2). Null = Mixed, must choose per decision. */
function defaultOrder(typeKey) {
  if (typeKey === 'architect' || typeKey === 'architect-leaning') return 'logic_first';
  if (typeKey === 'alchemist' || typeKey === 'alchemist-leaning') return 'feeling_first';
  return null;
}

async function ownDecision(req, res) {
  const r = await query('SELECT * FROM decision WHERE id = $1', [req.params.id]);
  if (r.rows.length === 0 || String(r.rows[0].user_id).toUpperCase() !== String(req.userId).toUpperCase()) {
    res.status(404).json({ error: 'not_found', message: 'That decision was not found.' });
    return null;
  }
  return r.rows[0];
}

/* ------------------------------------------------- §3.1 Decisions and the Frame */

/** POST /decisions — {text, kind, order?, urgent?, awareness_practice?} */
router.post('/decisions', async (req, res) => {
  try {
    const { text, kind = 'new', order, urgent = false, awareness_practice = false } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'validation', message: 'Write the decision in your own words.' });
    }
    if (!['new', 'started', 'made'].includes(kind)) {
      return res.status(400).json({ error: 'validation', message: 'kind must be new, started or made.' });
    }
    if (order && !['logic_first', 'feeling_first'].includes(order)) {
      return res.status(400).json({ error: 'validation', message: 'order must be logic_first or feeling_first.' });
    }

    const typeKey = await loadTypeKey(req.userId);
    const preset = defaultOrder(typeKey);
    let chosen = order || preset;
    if (!chosen) {
      /* Mixed with no order sent (BS-AI-001 §2: Mixed must choose one) */
      return res.status(400).json({ error: 'order_required', message: 'Choose the order to begin with: Logic first or Feeling first.' });
    }
    /* A core type may take the other order only as awareness practice (BS-AI-001 §2). */
    if ((typeKey === 'architect' || typeKey === 'alchemist') && order && order !== preset && !awareness_practice) {
      return res.status(400).json({
        error: 'awareness_practice',
        message: 'That is your other loop. Tick awareness practice to begin with it.',
      });
    }

    const r = await query(`
      INSERT INTO decision (user_id, kind, "order", awareness_practice, urgent, text)
      VALUES ($1::uuid, $2, $3, $4, $5, $6) RETURNING *
    `, [req.userId, kind, chosen, !!awareness_practice, !!urgent, String(text).trim()]);
    res.status(201).json({ decision: r.rows[0], type_key: typeKey });
  } catch (e) {
    console.error('[DI] create decision failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side. Nothing you wrote is lost. Try again, or come back in a few minutes.' });
  }
});

/** GET /decisions — the caller's decisions, newest first */
router.get('/decisions', async (req, res) => {
  try {
    const r = await query(`
      SELECT * FROM decision WHERE UPPER(user_id::text) = UPPER($1)
      ORDER BY opened_at DESC LIMIT 100
    `, [req.userId]);
    res.json({ decisions: r.rows });
  } catch (e) {
    console.error('[DI] list decisions failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** GET /decisions/:id — the decision, every box entry by round, readiness, log row */
router.get('/decisions/:id', async (req, res) => {
  try {
    const d = await ownDecision(req, res); if (!d) return;
    const entries = await query(
      'SELECT * FROM decision_entry WHERE decision_id = $1 ORDER BY round, created_at', [d.id]);
    const log = await query(
      'SELECT * FROM decision_log WHERE decision_id = $1 LIMIT 1', [d.id]);
    res.json({ decision: d, entries: entries.rows, log: log.rows[0] || null });
  } catch (e) {
    console.error('[DI] get decision failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/**
 * PUT /decisions/:id/boxes/:box — write or replace the person's entry for round r.
 * Body: {text, round?, loop?}. Box 4 is rejected until Boxes 2 and 3 have an entry
 * (BS-AI-001 §4; BS-AI-004 §3.1). The first Send opens the Decision Log row,
 * status "in the Frame" (BS-AI-003 §4.7).
 */
router.put('/decisions/:id/boxes/:box', async (req, res) => {
  try {
    const d = await ownDecision(req, res); if (!d) return;
    const box = req.params.box;
    if (!BOXES.includes(box)) {
      return res.status(400).json({ error: 'validation', message: 'Unknown box.' });
    }
    if (d.status === 'checked' || d.status === 'reviewed') {
      return res.status(409).json({ error: 'checked', message: 'This decision has been checked. Open it in your log.' });
    }
    const { text, round = d.rounds, loop = null } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'validation', message: 'Write something in the box first.' });
    }
    if (box === 'box4') {
      const have = await query(`
        SELECT DISTINCT box FROM decision_entry WHERE decision_id = $1 AND box IN ('box2','box3')
      `, [d.id]);
      if (have.rows.length < 2) {
        return res.status(409).json({
          error: 'box4_early',
          message: 'Fill both checking boxes before your decision. The loop needs its round.',
        });
      }
    }

    /* replace the person's entry for that box and round, else insert */
    const existing = await query(`
      SELECT id FROM decision_entry
      WHERE decision_id = $1 AND box = $2 AND round = $3 AND UPPER(author_user_id::text) = UPPER($4)
    `, [d.id, box, round, req.userId]);
    let entry;
    if (existing.rows.length) {
      entry = (await query(
        'UPDATE decision_entry SET text = $1, loop = $2, updated_at = now() WHERE id = $3 RETURNING *',
        [String(text).trim(), loop, existing.rows[0].id])).rows[0];
    } else {
      entry = (await query(`
        INSERT INTO decision_entry (decision_id, box, round, loop, text, author_user_id)
        VALUES ($1, $2, $3, $4, $5, $6::uuid) RETURNING *
      `, [d.id, box, round, loop, String(text).trim(), req.userId])).rows[0];
    }
    await query('UPDATE decision SET status = $2, updated_at = now() WHERE id = $1', [d.id, 'in_frame']);

    /* the log row from the first Send, updated at every step */
    const began = d.order === 'logic_first' ? 'logic' : 'feeling';
    await query(`
      INSERT INTO decision_log (user_id, decision_id, text, "order", began_loop, rounds, urgent, written_by)
      SELECT $1::uuid, $2, $3, $4, $5, $6, $7, 'mentor'
      WHERE NOT EXISTS (SELECT 1 FROM decision_log WHERE decision_id = $2)
    `, [req.userId, d.id, d.text, d.order, began, d.rounds, d.urgent]);
    await query(
      'UPDATE decision_log SET rounds = $2, updated_at = now() WHERE decision_id = $1',
      [d.id, d.rounds]);

    res.json({ entry });
  } catch (e) {
    console.error('[DI] box write failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side. Nothing you wrote is lost.' });
  }
});

/** POST /decisions/:id/rounds — go round again: opens Box 2 and 3 for round r+1 */
router.post('/decisions/:id/rounds', async (req, res) => {
  try {
    const d = await ownDecision(req, res); if (!d) return;
    const r = await query(
      'UPDATE decision SET rounds = rounds + 1, updated_at = now() WHERE id = $1 RETURNING *', [d.id]);
    await query('UPDATE decision_log SET rounds = $2, updated_at = now() WHERE decision_id = $1',
      [d.id, r.rows[0].rounds]);
    res.json({ decision: r.rows[0] });
  } catch (e) {
    console.error('[DI] round failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** POST /decisions/:id/save and /reopen — turns count on from where they stopped */
router.post('/decisions/:id/save', async (req, res) => {
  const d = await ownDecision(req, res); if (!d) return;
  const r = await query("UPDATE decision SET status = 'saved', updated_at = now() WHERE id = $1 RETURNING *", [d.id]);
  res.json({ decision: r.rows[0] });
});
router.post('/decisions/:id/reopen', async (req, res) => {
  const d = await ownDecision(req, res); if (!d) return;
  if (d.status === 'checked' || d.status === 'reviewed') {
    return res.status(409).json({ error: 'checked', message: 'This decision has been checked. Open it in your log.' });
  }
  const r = await query("UPDATE decision SET status = 'in_frame', updated_at = now() WHERE id = $1 RETURNING *", [d.id]);
  res.json({ decision: r.rows[0] });
});

/* ------------------------------------------------- §3.1 the mentor and Check (BS-AI-004 §4) */

/**
 * POST /decisions/:id/mentor — one mentor turn: {event, text?, mentor?}.
 * The other mentor's read: {event:'other_read', mentor:'architect'|'alchemist'} —
 * allowed once per decision, never charged (BS-AI-005 §6).
 */
router.post('/decisions/:id/mentor', async (req, res) => {
  try {
    const d = await ownDecision(req, res); if (!d) return;
    const { event = 'replied', text = null, mentor = null } = req.body || {};
    if (event === 'other_read') {
      const prior = await query(
        "SELECT count(*)::int AS n FROM mentor_turn WHERE decision_id = $1 AND event = 'other_read'", [d.id]);
      if (prior.rows[0].n >= 1) {
        return res.status(409).json({ error: 'other_read_used', message: 'The other mentor has already read this decision once.' });
      }
    }
    /* turn 15 → the app must confirm a further credit before turn 16 (BS-AI-004 §4 step 3) */
    if (d.turn_count >= 15 && d.turn_count % 15 === 0 && !req.body.confirm_further_credit) {
      return res.status(402).json({
        error: 'further_credit',
        message: 'This decision has used 15 mentor turns. Carrying on will use a second credit at Check.',
      });
    }
    const entries = (await query(
      'SELECT * FROM decision_entry WHERE decision_id = $1 ORDER BY round, created_at', [d.id])).rows;
    const { typeKey, result } = await loadEdna(req.userId);
    const out = await mentorTurn({
      userId: req.userId, decision: d, entries, typeKey, result, event,
      personText: text, mentorOverride: mentor,
    });
    res.json({ mentor: out.mentor, response: out.json, turn: d.turn_count + 1 });
  } catch (e) {
    if (e.code === 'unavailable') {
      return res.status(503).json({ error: 'mentor_unavailable', message: 'Your mentor is not available right now. Your boxes are saved.' });
    }
    console.error('[DI] mentor turn failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side. Nothing you wrote is lost.' });
  }
});

/**
 * POST /decisions/:id/check — the mentor turn with event:check: the readiness read and
 * the log line; charges one credit; writes the log row and the review date.
 */
router.post('/decisions/:id/check', async (req, res) => {
  try {
    const d = await ownDecision(req, res); if (!d) return;
    if (d.status === 'checked' || d.status === 'reviewed') {
      return res.status(409).json({ error: 'checked', message: 'This decision has been checked. Open it in your log.' });
    }
    /* credit state before the model is called (BS-AI-004 §4 step 3) */
    if ((await credits.balance(req.userId)) <= 0) {
      return res.status(402).json({ error: 'out_of_credits', message: 'You have used your decisions. Top up to carry on. Your log, saved decisions and reviews stay open.' });
    }
    if ((await credits.checksToday(req.userId)) >= 10) {
      return res.status(429).json({ error: 'daily_cap', message: 'You have checked 10 decisions today. The cap resets at midnight.' });
    }
    const entries = (await query(
      'SELECT * FROM decision_entry WHERE decision_id = $1 ORDER BY round, created_at', [d.id])).rows;
    const have = new Set(entries.map((e) => e.box));
    if (!have.has('box4')) {
      return res.status(409).json({ error: 'box4_missing', message: 'Write your decision in the last box first.' });
    }
    const { typeKey, result } = await loadEdna(req.userId);
    const out = await mentorTurn({ userId: req.userId, decision: d, entries, typeKey, result, event: 'check' });
    const j = out.json;
    if (j.kind === 'harm_self' || j.kind === 'harm_others') {
      /* the safety process: not logged, not charged (BS-AI-004 §4 step 7) */
      return res.json({ mentor: out.mentor, response: j, charged: false });
    }

    /* the log row: readiness, decided text, loops, switch, review date, time to decide */
    const loops = { logic_first: { began: 'logic', end: 'logic' }, feeling_first: { began: 'feeling', end: 'feeling' } }[d.order];
    const endEntry = entries.filter((e) => e.box === 'end').pop();
    const box4 = entries.filter((e) => e.box === 'box4').pop();
    const finished = (box4 && box4.loop) || (endEntry && endEntry.loop) || loops.end;
    const readMap = { Ready: 'ready', 'One more round': 'one_more_round', 'Not yet': 'not_yet' };
    const readKey = j.readiness ? (readMap[Object.keys(readMap).find((k) => j.readiness.read.startsWith(k))] || null) : null;
    const reviewDate = (req.body && req.body.review_date) || null; /* default three months (BS-AI-004 §10.3) */
    await query(`
      UPDATE decision_log SET
        began_loop = $2, finished_loop = $3, switched = $4, rounds = $5,
        readiness = $6, rests_on = $7, decided_text = $8, warnings = $9::jsonb,
        review_date = COALESCE($10::date, (CURRENT_DATE + interval '3 months')::date),
        time_to_decide = now() - $11::timestamptz, written_by = 'mentor', updated_at = now()
      WHERE decision_id = $1
    `, [d.id, loops.began, finished, loops.began !== finished, d.rounds,
      readKey, j.readiness ? j.readiness.rests_on : null, box4 ? box4.text : null,
      JSON.stringify(j.warning ? [j.warning] : []), reviewDate, d.opened_at]);

    const ledger = await credits.charge(req.userId, { decisionId: d.id, mentorTurnId: out.turnRow.id, reason: 'check' });
    await query('UPDATE mentor_turn SET charged = true WHERE id = $1', [out.turnRow.id]);
    await query("UPDATE decision SET status = 'checked', checked_at = now(), updated_at = now() WHERE id = $1", [d.id]);
    const log = await query('SELECT * FROM decision_log WHERE decision_id = $1', [d.id]);
    res.json({ mentor: out.mentor, response: j, charged: true, ledger_id: ledger.id, log: log.rows[0] });
  } catch (e) {
    if (e.code === 'out_of_credits') {
      return res.status(402).json({ error: 'out_of_credits', message: 'You have used your decisions. Top up to carry on.' });
    }
    if (e.code === 'unavailable') {
      return res.status(503).json({ error: 'mentor_unavailable', message: 'Your mentor is not available right now. Your boxes are saved.' });
    }
    console.error('[DI] check failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side. Nothing you wrote is lost.' });
  }
});

/**
 * GET /profile — what the app shell needs to draw the chrome: the five-way type key,
 * the person's name, the credit balance and whether any log row exists (first open).
 */
router.get('/profile', async (req, res) => {
  try {
    const { typeKey } = await loadEdna(req.userId);
    const u = await query(
      'SELECT first_name, last_name, name, email, tier FROM users WHERE UPPER(id::text) = UPPER($1)', [req.userId]);
    const logN = await query(
      'SELECT count(*)::int AS n FROM decision_log WHERE UPPER(user_id::text) = UPPER($1)', [req.userId]);
    const row = u.rows[0] || {};
    const first = row.first_name || (row.name ? String(row.name).split(/\s+/)[0] : null) || null;
    const purchased = (await query(
      'SELECT 1 FROM user_quiz_results WHERE UPPER(user_id::text) = UPPER($1) AND full_result_purchased = true LIMIT 1',
      [req.userId])).rows.length > 0;
    /* the app's tier states (BS-AI-003): free · di (£99) · entry (membership: rooms open) */
    const rawTier = (row.tier || '').toLowerCase();
    const member = rawTier && ['free', 'none', ''].indexOf(rawTier) === -1;
    res.json({
      type_key: typeKey,
      first_name: first,
      last_name: row.last_name || null,
      email: row.email || null,
      credits: await credits.balance(req.userId),
      first_open: logN.rows[0].n === 0,
      purchased,
      tier: member ? 'entry' : purchased ? 'di' : 'free',
    });
  } catch (e) {
    console.error('[DI] profile failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/**
 * GET /edna — the result record in words for the My E-DNA screen (BS-AI-004 §3.4;
 * BS-DI-005 §9 fields the basic report uses). Words only, no raw scores on screen.
 */
router.get('/edna', async (req, res) => {
  try {
    const { CONTENT } = require('../services/edna/scoring');
    const r = await query(`
      SELECT layer7_result, full_result_purchased, completed_at FROM user_quiz_results
      WHERE UPPER(user_id::text) = UPPER($1) ORDER BY completed_at DESC
    `, [req.userId]);
    const unwrap = (raw) => unwrapLayer7(raw);
    const envs = r.rows.map((row) => ({ env: unwrap(row.layer7_result), row })).filter((x) => x.env && x.env.ednaV2 && x.env.ednaV2.result);
    if (!envs.length) return res.json({ taken: false });
    const R = envs[0].env.ednaV2.result;
    const purchased = r.rows.some((row) => row.full_result_purchased);
    const p1 = R.p1 || {}; const p2 = R.p2 || {}; const p3 = R.p3 || {};
    const p4 = R.p4 || {}; const p5 = R.p5 || {}; const p6 = R.p6 || []; const p7 = R.p7 || {};
    const SUB = CONTENT.SUBTYPES || {};

    const core = p1.core; const lean = p1.lean || null;
    const first = core === 'architect' ? 'logic' : core === 'alchemist' ? 'feeling'
      : lean === 'architect' ? 'logic' : lean === 'alchemist' ? 'feeling' : null;
    const switched = p1.switched || [];
    const stress = switched.length
      ? 'Under stress you switched in ' + switched.length + ' context' + (switched.length > 1 ? 's' : '') + ' (' +
        switched.map((s) => s.ctx + ', ' + s.kind + ' switch').join('; ') + '); your loop held everywhere else.'
      : 'Under stress your loop held in every context.';

    let p2result = null; let p2second = null;
    if (p2.result) { p2result = SUB[p2.result] || p2.result; p2second = p2.second ? (SUB[p2.second] || p2.second) : null; }
    else if (p2.likely) p2result = 'Likely subtype: ' + (SUB[p2.likely] || p2.likely);
    else if (p2.pair) p2result = 'Likely mirror pair: ' + p2.pair.map((k) => SUB[k] || k).join(' or ');

    const mixedType = core === 'mixed';
    let retake;
    if (!mixedType) retake = 'Retake available: a retake is a new assessment; the earlier report stays.';
    else {
      const lg = await query(`
        SELECT count(*)::int AS logged,
               count(*) FILTER (WHERE switched = false AND finished_loop IS NOT NULL)::int AS held
        FROM decision_log WHERE UPPER(user_id::text) = UPPER($1)
      `, [req.userId]);
      retake = 'Retake Parts 1 to 3 after Workbook 1 and 10 logged decisions, 8 of them held in the loop they began with. Your log: ' +
        lg.rows[0].logged + ' logged · ' + lg.rows[0].held + ' held.';
    }

    res.json({
      taken: true,
      purchased,
      name: p1.result || (core === 'architect' ? 'Architect' : core === 'alchemist' ? 'Alchemist' : 'Mixed'),
      first,
      light: mixedType,
      stress,
      p2: { result: p2result, second: p2second },
      p3: (p3.results || []).map((x) => ({ k: x.k, level: x.level, loop: x.loop })),
      p4: (p4.domains || []).map((d) => ({ dom: d.dom, r: d.r })),
      p5: {
        consent: !!p5.consent,
        style: p5.style || null,
        patterns: (p5.patterns && p5.patterns.length) ? p5.patterns.join(' · ') : 'No specific pattern was found.',
        strength: (p5.strengths && p5.strengths[0]) ? p5.strengths[0].n : null,
      },
      p6: (p6 || []).map((d) => ({ dom: d.dom, result: d.result })),
      p7: ((p7.beliefs) || []).map((b) => ({ belief: b.belief, result: b.none ? 'No single answer' : b.result })),
      retake,
      assessments: envs.map((x) => ({
        date: x.row.completed_at,
        name: (x.env.ednaV2.result.p1 || {}).result || '',
        purchased: !!x.row.full_result_purchased,
      })),
    });
  } catch (e) {
    console.error('[DI] edna failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** PUT /profile — first and last name (BS-AI-003 §9.1 Profile; photo upload comes later) */
router.put('/profile', async (req, res) => {
  try {
    const { first_name = null, last_name = null } = req.body || {};
    if (!first_name || !String(first_name).trim()) {
      return res.status(400).json({ error: 'validation', message: 'Your first name is needed for the room circles.' });
    }
    await query(
      'UPDATE users SET first_name = $2, last_name = $3 WHERE UPPER(id::text) = UPPER($1)',
      [req.userId, String(first_name).trim(), last_name ? String(last_name).trim() : null]);
    res.json({ saved: true });
  } catch (e) {
    console.error('[DI] profile save failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** GET /credits — balance, grants, expiry, the ledger (BS-AI-007 §7) */
router.get('/credits', async (req, res) => {
  try {
    res.json(await credits.statement(req.userId));
  } catch (e) {
    console.error('[DI] credits failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/* ------------------------------------------------- §3.2 The log and the review */

/** GET /log?view=mine|room&context=&stress=&loop=&workbook=&status=&page= */
router.get('/log', async (req, res) => {
  try {
    const { view = 'mine', context, stress, loop, workbook, status } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const conds = ['UPPER(user_id::text) = UPPER($1)'];
    const args = [req.userId];
    conds.push(view === 'room' ? 'room_id IS NOT NULL' : 'room_id IS NULL');
    if (context && CONTEXTS.includes(context)) { args.push(context); conds.push(`context = $${args.length}`); }
    if (stress === 'true') conds.push('urgent = true');
    if (loop === 'logic' || loop === 'feeling') { args.push(loop); conds.push(`began_loop = $${args.length}`); }
    if (workbook) { args.push(workbook); conds.push(`workbook_id = $${args.length}::uuid`); }
    if (status === 'in_frame') conds.push('readiness IS NULL AND decided_text IS NULL');
    if (status === 'decided') conds.push('decided_text IS NOT NULL');
    if (status === 'review_due') conds.push('review_date <= CURRENT_DATE AND outcome IS NULL');
    if (status === 'reviewed') conds.push('outcome IS NOT NULL');
    const r = await query(`
      SELECT * FROM decision_log WHERE ${conds.join(' AND ')}
      ORDER BY date DESC, created_at DESC LIMIT 50 OFFSET ${(page - 1) * 50}
    `, args);
    const total = await query(`SELECT count(*)::int AS n FROM decision_log WHERE ${conds.join(' AND ')}`, args);
    res.json({ rows: r.rows, total: total.rows[0].n, page });
  } catch (e) {
    console.error('[DI] log list failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** POST /log/manual — a hand-written row (written_by = person; plain, not shaded) */
router.post('/log/manual', async (req, res) => {
  try {
    const { text, context = null, date = null, decided_text = null } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'validation', message: 'Write the decision in your own words.' });
    }
    if (context && !CONTEXTS.includes(context)) {
      return res.status(400).json({ error: 'validation', message: 'Unknown context.' });
    }
    const r = await query(`
      INSERT INTO decision_log (user_id, text, context, decided_text, date, written_by)
      VALUES ($1::uuid, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), 'person') RETURNING *
    `, [req.userId, String(text).trim(), context, decided_text, date]);
    res.status(201).json({ row: r.rows[0] });
  } catch (e) {
    console.error('[DI] manual row failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** GET /log/summary — the counters and "How you decide" (BS-AI-003 §3, last 30 days) */
router.get('/log/summary', async (req, res) => {
  try {
    const r = await query(`
      SELECT
        count(*)::int                                                   AS decisions,
        count(*) FILTER (WHERE decided_text IS NOT NULL)::int           AS decided,
        count(*) FILTER (WHERE decided_text IS NULL AND outcome IS NULL)::int AS in_frame,
        count(*) FILTER (WHERE switched = true)::int                    AS switched,
        count(*) FILTER (WHERE began_loop = 'logic')::int               AS began_logic,
        count(*) FILTER (WHERE began_loop = 'feeling')::int             AS began_feeling,
        count(*) FILTER (WHERE switched = false AND finished_loop IS NOT NULL)::int AS held,
        count(*) FILTER (WHERE finished_loop IS NOT NULL)::int          AS finished,
        count(*) FILTER (WHERE outcome = 'held')::int                   AS reviews_held,
        count(*) FILTER (WHERE outcome = 'changed_direction')::int      AS reviews_changed,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM time_to_decide)) AS median_seconds,
        min(extract(epoch FROM time_to_decide))                         AS fastest_seconds
      FROM decision_log
      WHERE UPPER(user_id::text) = UPPER($1) AND date >= CURRENT_DATE - 30
    `, [req.userId]);
    const ctx = await query(`
      SELECT context, count(*)::int AS n FROM decision_log
      WHERE UPPER(user_id::text) = UPPER($1) AND date >= CURRENT_DATE - 30 AND switched = true
        AND context IS NOT NULL
      GROUP BY context ORDER BY n DESC
    `, [req.userId]);
    res.json({ summary: r.rows[0], switched_contexts: ctx.rows });
  } catch (e) {
    console.error('[DI] summary failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** POST /log/:id/review — {q1, q2, q3, outcome}; the mentor turns come with step 3 */
router.post('/log/:id/review', async (req, res) => {
  try {
    const { q1 = null, q2 = null, q3 = null, outcome } = req.body || {};
    if (!['held', 'held_in_part', 'changed_direction', 'reopened'].includes(outcome)) {
      return res.status(400).json({ error: 'validation', message: 'Pick an outcome: held, held in part, changed direction or reopened.' });
    }
    const r = await query(`
      UPDATE decision_log SET outcome = $2, review_answers = $3::jsonb, updated_at = now()
      WHERE id = $1 AND UPPER(user_id::text) = UPPER($4) RETURNING *
    `, [req.params.id, outcome, JSON.stringify({ q1, q2, q3 }), req.userId]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not_found', message: 'That row was not found.' });
    if (r.rows[0].decision_id) {
      await query("UPDATE decision SET status = 'reviewed', updated_at = now() WHERE id = $1", [r.rows[0].decision_id]);
    }
    res.json({ row: r.rows[0] });
  } catch (e) {
    console.error('[DI] review failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

/** GET /log/reviews/due — rows whose review date has come (Needs you) */
router.get('/log/reviews/due', async (req, res) => {
  try {
    const r = await query(`
      SELECT * FROM decision_log
      WHERE UPPER(user_id::text) = UPPER($1) AND review_date <= CURRENT_DATE AND outcome IS NULL
      ORDER BY review_date
    `, [req.userId]);
    res.json({ rows: r.rows });
  } catch (e) {
    console.error('[DI] reviews due failed:', e.message);
    res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
});

module.exports = router;
