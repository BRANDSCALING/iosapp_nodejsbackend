/**
 * The mentor call, step by step — BS-AI-004 §4 with BS-AI-005 (approved 19 Nov 2026).
 * One call = instructions (versioned, from mentor_instruction) + the context block built
 * server-side + the thread, answered with the §5 JSON object, validated here. Timeout
 * 30 s, one retry on timeout or invalid JSON, then the unavailable state; a failed call
 * is never charged.
 *
 * Providers: MODEL_PROVIDER=anthropic calls Anthropic with DI_MODEL (default Haiku);
 * MODEL_PROVIDER=openai calls OpenAI with OPENAI_MODEL_PRIMARY (23 Nov 2026 — the key
 * Mashab supplied for the demo); anything else runs the deterministic stub so local
 * builds and tests never bill. Both paths return the same shape and are validated the
 * same way, so the provider is an env switch, not a code change.
 */
const { query } = require('../../config/database');
const { VERSION, INSTRUCTIONS, VERSION_1_1, INSTRUCTIONS_1_1 } = require('./instructions');

const KINDS = ['decision', 'several', 'not_decision', 'small', 'personal', 'regulated',
  'harm_self', 'harm_others', 'decide_for_me', 'hostile', 'clash'];
const BOXES = ['decision', 'box1', 'box2', 'box3', 'end', 'box4'];
const READS = ['Ready', 'One more round', 'Not yet'];

/** The current instruction text; the table is seeded once from BS-AI-005 v1.0.
 *  MENTOR_INSTRUCTION_VERSION overrides which stored version is used — the BS-AI-006
 *  re-run harness runs v1.1 this way while v1.0 stays current in production (Fariza,
 *  24 Nov: "v1.0 stays in production until the re-run passes"). */
async function currentInstruction() {
  const want = process.env.MENTOR_INSTRUCTION_VERSION;
  if (want) {
    const o = await query('SELECT version, text FROM mentor_instruction WHERE version = $1 LIMIT 1', [want]);
    if (o.rows.length) return o.rows[0];
    if (want === VERSION_1_1) return { version: VERSION_1_1, text: INSTRUCTIONS_1_1 };
  }
  const r = await query('SELECT version, text FROM mentor_instruction WHERE current = true LIMIT 1');
  if (r.rows.length) return r.rows[0];
  await query(`
    INSERT INTO mentor_instruction (version, text, approved_by, approved_at, current)
    SELECT $1, $2, 'Fariza Javed', '2026-11-19', true
    WHERE NOT EXISTS (SELECT 1 FROM mentor_instruction WHERE current = true)
  `, [VERSION, INSTRUCTIONS]);
  return { version: VERSION, text: INSTRUCTIONS };
}

const loopWord = (l) => (l === 'logic' ? 'Logic' : 'Feeling');
function boxLoops(order) {
  /* which loop each box carries, by order (BS-AI-001 §2) */
  return order === 'logic_first'
    ? { box1: 'logic', box2: 'feeling', box3: 'logic', end: 'logic' }
    : { box1: 'feeling', box2: 'logic', box3: 'feeling', end: 'feeling' };
}

/** Which mentor leads (BS-AI-005 §6): core/leaning → their mentor; Mixed → the order's. */
function mentorFor(typeKey, order) {
  if (typeKey === 'architect' || typeKey === 'architect-leaning') return 'architect';
  if (typeKey === 'alchemist' || typeKey === 'alchemist-leaning') return 'alchemist';
  return order === 'logic_first' ? 'architect' : 'alchemist';
}

/** The EVENT line wordings of BS-AI-005 §3; unknown codes pass through as sent. */
function eventLine(event) {
  if (event === 'start') return 'the person sent the Decision box';
  if (event === 'check') return 'the person pressed Check';
  if (event === 'round_again') return 'the person pressed Go round again';
  if (event === 'other_read') return 'the person asked for the other mentor’s read';
  if (event === 'replied') return 'the person replied';
  if (event === 'reopened') return 'the person opened a saved decision';
  var m = /^filled_(box\d|end)$/.exec(event);
  if (m) return 'the person filled ' + (m[1] === 'end' ? 'End with' : 'Box ' + m[1].slice(3));
  var r = /^review_(\d)$/.exec(event);
  if (r) return 'review question ' + r[1];
  return event;
}

/** The context block of BS-AI-005 §3, from the server's records only.
 *  v1.1 (§3 change, Fariza 24 Nov): two lines after THE FRAME NOW — TODAY: and
 *  REVIEW DATE: — the backend writes both; the model copies them, never computes one. */
function todayLine() { return 'TODAY: ' + new Date().toISOString().slice(0, 10); }
function reviewLine(reviewDate) {
  /* no date chosen yet: the date the Check routes will log (three months, BS-AI-004 §10.3), so
     the reply and the log line agree — '(not set)' made the model invent "two weeks" (24 Nov) */
  const d = reviewDate || (function (x) { x.setMonth(x.getMonth() + 3); return x; })(new Date());
  return 'REVIEW DATE: ' + String(d instanceof Date ? d.toISOString() : d).slice(0, 10);
}
/* The stress and Part 2 lines in the words My E-DNA shows the member (decisionRoutes GET /edna).
   24 Nov: these read p1.stress / p2.subtype / R.commitment, none of which exist on the v2
   result, so every turn said "unknown" — and urgent turns told the member so. */
function stressText(R) {
  const p1 = R.p1 || {};
  if (!p1.core) return 'no E-DNA result yet';
  if (R.legacy) return 'not measured (an earlier version of the E-DNA)';
  const sw = p1.switched || [];
  return sw.length
    ? `under stress they switched in ${sw.length} context${sw.length > 1 ? 's' : ''} (${sw.map((s) => s.ctx + ', ' + s.kind + ' switch').join('; ')}); the loop held everywhere else`
    : 'under stress the loop held in every context';
}
function subtypeText(R) {
  const p2 = R.p2 || {};
  let SUB = {};
  try { SUB = (require('../edna/scoring').CONTENT || {}).SUBTYPES || {}; } catch (e) { SUB = {}; }
  if (p2.result) return SUB[p2.result] || p2.result;
  if (p2.likely) return 'likely ' + (SUB[p2.likely] || p2.likely);
  if (p2.pair) return 'likely mirror pair ' + p2.pair.map((k) => SUB[k] || k).join(' or ');
  return 'not known yet';
}
/** The person's own Workbook 1 commitment line, when they have written one. */
async function workbookCommitment(userId) {
  try {
    const r = await query(`
      SELECT wa.value FROM workbook_answers wa
      JOIN workbook_instances wi ON wi.id = wa.instance_id
      JOIN workbooks w ON w.id = wi.workbook_id
      WHERE UPPER(wi.user_id::text) = UPPER($1) AND w.workbook = 1 AND wa.field_key ILIKE '%commit%'
      ORDER BY wa.updated_at DESC NULLS LAST LIMIT 1
    `, [userId]);
    if (!r.rows.length) return null;
    let v = r.rows[0].value;
    try { v = JSON.parse(v); } catch (e) { /* stored as plain text */ }
    v = typeof v === 'string' ? v.trim() : '';
    return v || null;
  } catch (e) { return null; }
}
function buildContext({ mentor, typeKey, result, decision, entries, event, turnNo, reviewDate, commitment = null }) {
  const lines = [];
  const mixed = !typeKey || typeKey === 'mixed' || typeKey.endsWith('-leaning');
  lines.push(`YOU ARE: ${mentor === 'architect' ? 'AI Architect' : 'AI Alchemist'}` +
    (mixed ? `; this person is ${typeKey === 'mixed' || !typeKey ? 'Mixed' : typeKey.replace('-', ' ')}; both mentors are equal; they chose the ${decision.order === 'logic_first' ? 'Architect' : 'Alchemist'} order` : ''));

  const R = result || {};
  const p1 = R.p1 || {};
  lines.push(`THE PERSON'S E-DNA: Part 1: ${p1.core || 'unknown'}${p1.lean && p1.lean !== 'none' ? ` (leaning ${p1.lean})` : ''}; ` +
    `Dominant loop ${decision.order === 'logic_first' ? 'Logic → Feeling → Logic' : 'Feeling → Logic → Feeling'}, ` +
    `${p1.core === 'mixed' ? 'NOT yet confirmed' : 'confirmed'}. ` +
    `Stress result: ${stressText(R)}. ` +
    `Workbook 1 commitment: ${commitment ? `"${commitment}"` : 'none written yet (do not mention it)'}. ` +
    `Part 2: ${subtypeText(R)}. Part 3: ${R.p3 ? JSON.stringify(R.p3).slice(0, 120) : 'unknown'}. ` +
    `Part 6 disposition: ${R.p6 ? JSON.stringify(R.p6).slice(0, 120) : 'unknown'}. ` +
    `Part 7 beliefs: ${R.p7 ? JSON.stringify(R.p7).slice(0, 160) : 'unknown'}.`);

  const kindLine = decision.kind === 'started' ? 'a decision ALREADY STARTED (past tense)'
    : decision.kind === 'made' ? 'an EXISTING decision being checked' : 'a NEW decision';
  lines.push(`THE FRAME NOW: ${kindLine}; order=${decision.order}; urgent=${decision.urgent}; ` +
    `rounds=${decision.rounds}; turn=${turnNo} of 15; awareness practice=${decision.awareness_practice}`);
  lines.push(todayLine());
  lines.push(reviewLine(reviewDate));

  const loops = boxLoops(decision.order);
  const byBox = {};
  (entries || []).forEach((e) => { (byBox[e.box] = byBox[e.box] || []).push(e); });
  const text = (box) => (byBox[box] ? byBox[box].map((e) => e.text).join(' | ') : '(empty)');
  lines.push(`Decision box: ${decision.text}`);
  lines.push(`Box 1 (${loopWord(loops.box1)}): ${text('box1')}`);
  (byBox.box2 || [{ round: 1 }]).forEach((e, i) => { if (i === 0) lines.push(`Box 2 (${loopWord(loops.box2)}) round ${decision.rounds}: ${text('box2')}`); });
  lines.push(`Box 3 (${loopWord(loops.box3)}) round ${decision.rounds}: ${text('box3')}`);
  lines.push(`End with (${loopWord(loops.end)}): ${text('end')}`);
  lines.push(`Box 4: ${text('box4')}`);
  lines.push(`EVENT: ${eventLine(event)}`);
  return lines.join('\n');
}

/** BS-AI-005 §5 — validate the model's JSON; throws on any violation. */
function validateReply(obj) {
  const fail = (m) => { const e = new Error(m); e.code = 'invalid_json'; throw e; };
  if (!obj || typeof obj !== 'object') fail('not an object');
  if (typeof obj.reply !== 'string' || !obj.reply.trim()) fail('reply missing');
  if (!KINDS.includes(obj.kind)) fail('kind invalid');
  if (obj.focus_box !== null && obj.focus_box !== undefined && !BOXES.includes(obj.focus_box)) fail('focus_box invalid');
  if (obj.missing !== undefined && !Array.isArray(obj.missing)) fail('missing not a list');
  if (obj.warning != null && (typeof obj.warning !== 'object' || typeof obj.warning.box !== 'string' || typeof obj.warning.gap !== 'string')) fail('warning invalid');
  if (obj.readiness != null) {
    const r = obj.readiness;
    if (typeof r !== 'object' || typeof r.rests_on !== 'string' || typeof r.missing !== 'string') fail('readiness invalid');
    if (!READS.some((k) => String(r.read || '').startsWith(k))) fail('readiness.read invalid');
  }
  if (obj.log_line != null && typeof obj.log_line !== 'string') fail('log_line invalid');
  if (typeof obj.leave_frame !== 'boolean') fail('leave_frame missing');
  if (obj.outcome != null && !['held', 'changed direction', 'reopened'].includes(obj.outcome)) fail('outcome invalid');
  return obj;
}

/* ---------------------------------------------------------------- providers */

/** The JSON object in a model reply. It starts at the first "{" that opens a key — not the
 *  first "{" of any kind: v1.1 has the model write {today}/{review}, so a reply with prose
 *  before the JSON began at "{today}" and failed to parse (24 Nov). A reply with no JSON
 *  object throws invalid_json, which retries with an explicit correction. */
const JSON_ONLY = 'Your last reply could not be used: reply again with only the JSON object described in OUTPUT, starting with { and ending with }, nothing before or after it.';
function parseReplyJson(raw) {
  const text = String(raw || '');
  const m = /\{\s*"/.exec(text);
  const start = m ? m.index : -1;
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) {
    const e = new Error('reply was not a JSON object'); e.code = 'invalid_json'; throw e;
  }
  try { return JSON.parse(text.slice(start, end + 1)); } catch (x) {
    const e = new Error('reply JSON did not parse: ' + x.message); e.code = 'invalid_json'; throw e;
  }
}

async function callAnthropic({ instruction, context, thread, timeoutMs = 30000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const messages = [{ role: 'user', content: context }];
    (thread || []).forEach((t) => messages.push({ role: t.role, content: t.content }));
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: Object.assign({
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      }, process.env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID } : {}),
      body: JSON.stringify(Object.assign({
        model: process.env.DI_MODEL || 'claude-haiku-4-5-20251001',
        /* a thinking model spends max_tokens on its reasoning first: at 700 the Check
           reasoned past the cap and returned empty, reading as "mentor unavailable"
           (measured 24 Nov, claude-sonnet-5-5). Headroom plus ANTHROPIC_THINKING
           (e.g. between_tools) keeps the reply inside the budget at ~4s a turn. */
        max_tokens: 4000,
        system: instruction.text,
        messages,
      }, process.env.ANTHROPIC_THINKING ? { thinking: { type: process.env.ANTHROPIC_THINKING } } : {})),
    });
    if (!res.ok) { const e = new Error(`provider ${res.status}`); e.code = 'provider'; throw e; }
    const data = await res.json();
    const raw = (data.content || []).map((c) => c.text || '').join('');
    return {
      json: parseReplyJson(raw),
      model: data.model,
      input_tokens: data.usage ? data.usage.input_tokens : null,
      output_tokens: data.usage ? data.usage.output_tokens : null,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAI({ instruction, context, thread, timeoutMs = 30000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const messages = [
      { role: 'system', content: instruction.text },
      { role: 'user', content: context },
    ];
    (thread || []).forEach((t) => messages.push({ role: t.role, content: t.content }));
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL_PRIMARY || 'gpt-6-luna',
        /* a reasoning model spends max_completion_tokens on its reasoning FIRST: at 700
           the room cross-check reasoned past the cap and returned empty (23 Nov). Low
           effort + headroom keeps the visible reply inside the budget. */
        max_completion_tokens: 4000,
        reasoning_effort: process.env.OPENAI_REASONING_EFFORT || 'low',
        /* about 1 turn in 8 came back as prose, failing §5 validation and reading as
           "mentor unavailable" (measured 24 Nov); JSON mode pins the output shape */
        response_format: { type: 'json_object' },
        messages,
      }),
    });
    if (!res.ok) { const e = new Error(`provider ${res.status}`); e.code = 'provider'; throw e; }
    const data = await res.json();
    const raw = (((data.choices || [])[0] || {}).message || {}).content || '';
    return {
      json: parseReplyJson(raw),
      model: data.model,
      input_tokens: data.usage ? data.usage.prompt_tokens : null,
      output_tokens: data.usage ? data.usage.completion_tokens : null,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** The live provider by env, or null for the stub. */
function liveCall() {
  if (process.env.MODEL_PROVIDER === 'anthropic' && process.env.ANTHROPIC_API_KEY) return callAnthropic;
  if (process.env.MODEL_PROVIDER === 'openai' && process.env.OPENAI_API_KEY) return callOpenAI;
  return null;
}

/** Deterministic stub: valid §5 JSON per event, so local builds never bill (labelled). */
function stubReply({ mentor, decision, entries, event }) {
  const loops = boxLoops(decision.order);
  const has = (b) => (entries || []).some((e) => e.box === b);
  const order = ['box1', 'box2', 'box3', 'end', 'box4'];
  const next = order.find((b) => !has(b)) || null;
  const name = mentor === 'architect' ? 'AI Architect' : 'AI Alchemist';
  let json;
  if (event === 'check') {
    const today = new Date(); const review = new Date(today.getTime() + 90 * 86400000);
    json = {
      reply: `[stub ${name}] Your decision rests on what you wrote in Box 1 and Box 3. Nothing essential is missing. Ready.`,
      kind: 'decision', focus_box: null, missing: [],
      warning: null,
      readiness: { rests_on: 'Box 1 and Box 3 as written', missing: 'nothing named', read: 'Ready' },
      log_line: `${today.toISOString().slice(0, 10)} · ${decision.text.slice(0, 60)} · ${decision.order} · ${decision.rounds} rounds · no warnings · decided · rests on the written boxes · review ${review.toISOString().slice(0, 10)}`,
      leave_frame: false,
    };
  } else {
    const q = next === 'box1'
      ? (loops.box1 === 'logic' ? 'What data, facts or numbers do you already have?' : 'How does it feel, and what is the story?')
      : 'What answers the box before this one?';
    json = {
      reply: `[stub ${name}] One decision: "${decision.text.slice(0, 80)}". ${q}`,
      kind: 'decision', focus_box: next, missing: next ? [next] : [],
      warning: null, readiness: null, log_line: null, leave_frame: false,
    };
  }
  return { json, model: 'stub', input_tokens: 0, output_tokens: 0 };
}

/**
 * One mentor turn (BS-AI-004 §4 steps 1–9, without the charge — the route charges at
 * Check). Returns {json, turnRow} or throws {code:'unavailable'} after the retry.
 */
async function mentorTurn({ userId, decision, entries, typeKey, result, event, personText = null, mentorOverride = null }) {
  const instruction = await currentInstruction();
  const mentor = mentorOverride || mentorFor(typeKey, decision.order);

  const prior = await query(`
    SELECT response->>'reply' AS reply FROM mentor_turn
    WHERE decision_id = $1 ORDER BY created_at DESC LIMIT 30
  `, [decision.id]);
  const thread = prior.rows.reverse().map((r) => ({ role: 'assistant', content: r.reply || '' }))
    .filter((t) => t.content);
  if (personText) thread.push({ role: 'user', content: personText });
  if (thread.length === 0 || thread[thread.length - 1].role === 'assistant') {
    thread.push({ role: 'user', content: `EVENT: ${eventLine(event)}` });
  }

  const turnNo = (decision.turn_count || 0) + 1;
  const rv = await query(
    'SELECT review_date FROM decision_log WHERE decision_id = $1 LIMIT 1', [decision.id]);
  const context = buildContext({
    mentor, typeKey, result, decision, entries, event, turnNo,
    reviewDate: rv.rows.length ? rv.rows[0].review_date : null,
    commitment: await workbookCommitment(userId),
  });

  const live = liveCall();
  const started = Date.now();
  let out = null;
  /* three attempts (24 Nov): one transient API error must never reach the member as
     "mentor unavailable" — transport errors pause and retry, invalid replies retry at once */
  for (let attempt = 0; attempt < 3 && !out; attempt++) {
    try {
      const got = live
        ? await live({ instruction, context, thread })
        : stubReply({ mentor, decision, entries, event });
      got.json = validateReply(got.json);
      /* BS-AI-006 change 7 (Fariza, 24 Nov): at Check the readiness read is GIVEN, not
         offered. A check reply without it is treated as invalid and retried once with
         the instruction made explicit. */
      if (event === 'check' && !got.json.readiness) {
        const e = new Error('check reply without the readiness read'); e.code = 'invalid_json'; throw e;
      }
      out = got;
    } catch (e) {
      console.error(`[DI] mentor attempt ${attempt + 1} failed:`, e.message);
      if (attempt === 2) { const err = new Error('mentor unavailable'); err.code = 'unavailable'; throw err; }
      if (e.code === 'invalid_json') {
        thread.push({ role: 'user', content: JSON_ONLY + (event === 'check' ? ' Give the readiness read in the field readiness: what the decision rests on, what is missing, and your read.' : '') });
      } else {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }

  const turnRow = (await query(`
    INSERT INTO mentor_turn (decision_id, user_id, mentor, event, instruction_version, model,
                             input_tokens, output_tokens, latency_ms, response, charged)
    VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, false) RETURNING *
  `, [decision.id, userId, mentor, event, instruction.version, out.model,
    out.input_tokens, out.output_tokens, Date.now() - started, JSON.stringify(out.json)])).rows[0];
  await query('UPDATE decision SET turn_count = turn_count + 1, updated_at = now() WHERE id = $1', [decision.id]);

  /* kind handling (BS-AI-004 §4 step 7) */
  if (out.json.kind === 'harm_self' || out.json.kind === 'harm_others') {
    await query(`
      INSERT INTO safety_event (user_id, mentor_turn_id, kind) VALUES ($1::uuid, $2, $3)
    `, [userId, turnRow.id, out.json.kind]);
  }

  return { json: out.json, turnRow, mentor };
}

/**
 * The owner's Check in a Decision Room (BS-AI-008 §4; BS-AI-005 §2.2 "IN A DECISION
 * ROOM"): the cross-check and readiness read from the owner's mentor, reading every
 * collaborator's tagged entries as material. In a clash the JSON may carry split and
 * rule. Same timeout/retry/validation as a decision turn.
 */
async function roomCheck({ userId, room, entries, mentor }) {
  const instruction = await currentInstruction();
  const lines = [];
  lines.push(`YOU ARE: ${mentor === 'architect' ? 'AI Architect' : 'AI Alchemist'}`);
  lines.push(`THE FRAME NOW: a Decision Room: role Decision owner, kind ${room.kind}; order=${room.order}; rounds=${room.round}`);
  lines.push(todayLine());
  lines.push(reviewLine(room.review_date));
  lines.push(`Decision box: ${room.decision_text}`);
  const tag = (e) => {
    const name = e.first_name || e.author_name || 'Member';
    return `${name} · ${e.author_role === 'decision_owner' ? 'owner' : 'collaborator'} · ${e.loop || ''}`;
  };
  ['box1', 'clash_decision', 'box2', 'box3', 'end', 'box4', 'rule'].forEach((box) => {
    const got = entries.filter((e) => e.box === box);
    if (got.length) lines.push(box + ': ' + got.map((e) => `[${tag(e)}] ${e.text}`).join(' | '));
  });
  lines.push('EVENT: the Decision owner pressed Check. Give the cross-check (what it rests on, what is not answered), the readiness read and the log line.' +
    (room.kind === 'clash' ? ' This is a clash: name the box where it split (JSON field split) and propose the decision rule (JSON field rule).' : ''));
  const context = lines.join('\n');
  const thread = [{ role: 'user', content: 'EVENT: check' }];

  const live = liveCall();
  const started = Date.now();
  let out = null;
  for (let attempt = 0; attempt < 3 && !out; attempt++) {
    try {
      let got;
      if (live) got = await live({ instruction, context, thread });
      else {
        const today = new Date(); const review = new Date(today.getTime() + 90 * 86400000);
        got = {
          json: {
            reply: `[stub ${mentor === 'architect' ? 'AI Architect' : 'AI Alchemist'}] The room's entries answer the decision. Rests on Box 1 and the room's Box 3. Ready.`,
            kind: room.kind === 'clash' ? 'clash' : 'decision', focus_box: null, missing: [],
            warning: null,
            readiness: { rests_on: 'Box 1 and the room’s entries in Box 3', missing: 'nothing named', read: 'Ready' },
            log_line: `${today.toISOString().slice(0, 10)} · ${room.decision_text.slice(0, 60)} · ${room.order} · ${room.round} rounds · room · decided · review ${review.toISOString().slice(0, 10)}`,
            leave_frame: false,
            split: room.kind === 'clash' ? { box: 'box2', line: '[stub] The split happened at what each person checked the facts against.' } : null,
            rule: room.kind === 'clash' ? { measure_a: 'one measure Logic trusts', measure_b: 'one measure Feeling trusts', stop: 'the stop point', expand: 'the expand point', date: new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10), leads: 'the owner' } : null,
          },
          model: 'stub', input_tokens: 0, output_tokens: 0,
        };
      }
      got.json = validateReply(got.json);
      if (!got.json.readiness) { /* the room's cross-check must carry the readiness read too */
        const e = new Error('room check without the readiness read'); e.code = 'invalid_json'; throw e;
      }
      out = got;
    } catch (e) {
      console.error(`[DI] room check attempt ${attempt + 1} failed:`, e.message);
      if (attempt === 2) { const err = new Error('mentor unavailable'); err.code = 'unavailable'; throw err; }
      if (e.code === 'invalid_json') {
        thread.push({ role: 'user', content: JSON_ONLY + ' Give the readiness read in the field readiness: what the decision rests on, what is missing, and your read.' });
      } else {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }
  const turnRow = (await query(`
    INSERT INTO mentor_turn (room_id, user_id, mentor, event, instruction_version, model,
                             input_tokens, output_tokens, latency_ms, response, charged)
    VALUES ($1, $2::uuid, $3, 'check', $4, $5, $6, $7, $8, $9::jsonb, false) RETURNING *
  `, [room.id, userId, mentor, instruction.version, out.model,
    out.input_tokens, out.output_tokens, Date.now() - started, JSON.stringify(out.json)])).rows[0];
  return { json: out.json, turnRow, mentor };
}

/**
 * BS-AI-006 change 9 (Fariza, 24 Nov): dates come from the backend; the model never
 * writes one. The routes compose the member-facing log line from the server's own
 * records and dates, replacing whatever the model wrote (scripts 18–20 invented
 * "2025-01" dates). The raw model output stays in mentor_turn for the audit trail.
 */
function serverLogLine({ decisionText, order, rounds, warning, decidedText, restsOn, reviewDate }) {
  const today = new Date().toISOString().slice(0, 10);
  const rev = reviewDate instanceof Date ? reviewDate.toISOString().slice(0, 10) : String(reviewDate).slice(0, 10);
  return today + ' · ' + String(decisionText || '').slice(0, 60) +
    ' · ' + (order === 'logic_first' ? 'Logic first' : 'Feeling first') +
    ' · ' + rounds + (rounds === 1 ? ' round' : ' rounds') +
    ' · ' + (warning ? '1 warning' : 'no warnings') +
    (decidedText ? ' · decided: ' + String(decidedText).slice(0, 60) : '') +
    (restsOn ? ' · rests on ' + restsOn : '') +
    ' · review ' + rev;
}

module.exports = { mentorTurn, mentorFor, buildContext, validateReply, currentInstruction, boxLoops, roomCheck, serverLogLine };
