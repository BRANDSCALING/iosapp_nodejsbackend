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
const { VERSION, INSTRUCTIONS } = require('./instructions');

const KINDS = ['decision', 'several', 'not_decision', 'small', 'personal', 'regulated',
  'harm_self', 'harm_others', 'decide_for_me', 'hostile', 'clash'];
const BOXES = ['decision', 'box1', 'box2', 'box3', 'end', 'box4'];
const READS = ['Ready', 'One more round', 'Not yet'];

/** The current instruction text; the table is seeded once from BS-AI-005 v1.0. */
async function currentInstruction() {
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

/** The context block of BS-AI-005 §3, from the server's records only. */
function buildContext({ mentor, typeKey, result, decision, entries, event, turnNo }) {
  const lines = [];
  const mixed = !typeKey || typeKey === 'mixed' || typeKey.endsWith('-leaning');
  lines.push(`YOU ARE: ${mentor === 'architect' ? 'AI Architect' : 'AI Alchemist'}` +
    (mixed ? `; this person is ${typeKey === 'mixed' || !typeKey ? 'Mixed' : typeKey.replace('-', ' ')}; both mentors are equal; they chose the ${decision.order === 'logic_first' ? 'Architect' : 'Alchemist'} order` : ''));

  const R = result || {};
  const p1 = R.p1 || {}; const p2 = R.p2 || {};
  lines.push(`THE PERSON'S E-DNA: Part 1: ${p1.core || 'unknown'}${p1.lean ? ` (leaning ${p1.lean})` : ''}; ` +
    `Dominant loop ${decision.order === 'logic_first' ? 'Logic → Feeling → Logic' : 'Feeling → Logic → Feeling'}, ` +
    `${p1.core === 'mixed' ? 'NOT yet confirmed' : 'confirmed'}. ` +
    `Stress result: ${p1.stress ? JSON.stringify(p1.stress) : 'unknown'}. ` +
    `Workbook 1 commitment: "${R.commitment || 'unknown'}". ` +
    `Part 2: ${p2.subtype || p2.likely || 'unknown'}. Part 3: ${R.p3 ? JSON.stringify(R.p3).slice(0, 120) : 'unknown'}. ` +
    `Part 6 disposition: ${R.p6 ? JSON.stringify(R.p6).slice(0, 120) : 'unknown'}. ` +
    `Part 7 beliefs: ${R.p7 ? JSON.stringify(R.p7).slice(0, 160) : 'unknown'}.`);

  const kindLine = decision.kind === 'started' ? 'a decision ALREADY STARTED (past tense)'
    : decision.kind === 'made' ? 'an EXISTING decision being checked' : 'a NEW decision';
  lines.push(`THE FRAME NOW: ${kindLine}; order=${decision.order}; urgent=${decision.urgent}; ` +
    `rounds=${decision.rounds}; turn=${turnNo} of 15; awareness practice=${decision.awareness_practice}`);

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

async function callAnthropic({ instruction, context, thread, timeoutMs = 30000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const messages = [{ role: 'user', content: context }];
    (thread || []).forEach((t) => messages.push({ role: t.role, content: t.content }));
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.DI_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        system: instruction.text,
        messages,
      }),
    });
    if (!res.ok) { const e = new Error(`provider ${res.status}`); e.code = 'provider'; throw e; }
    const data = await res.json();
    const raw = (data.content || []).map((c) => c.text || '').join('');
    const jsonText = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    return {
      json: JSON.parse(jsonText),
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
        max_completion_tokens: 700,
        messages,
      }),
    });
    if (!res.ok) { const e = new Error(`provider ${res.status}`); e.code = 'provider'; throw e; }
    const data = await res.json();
    const raw = (((data.choices || [])[0] || {}).message || {}).content || '';
    const jsonText = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    return {
      json: JSON.parse(jsonText),
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
  const context = buildContext({ mentor, typeKey, result, decision, entries, event, turnNo });

  const live = liveCall();
  const started = Date.now();
  let out = null;
  for (let attempt = 0; attempt < 2 && !out; attempt++) {
    try {
      const got = live
        ? await live({ instruction, context, thread })
        : stubReply({ mentor, decision, entries, event });
      got.json = validateReply(got.json);
      out = got;
    } catch (e) {
      if (attempt === 1) { const err = new Error('mentor unavailable'); err.code = 'unavailable'; throw err; }
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
  for (let attempt = 0; attempt < 2 && !out; attempt++) {
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
      out = got;
    } catch (e) {
      if (attempt === 1) { const err = new Error('mentor unavailable'); err.code = 'unavailable'; throw err; }
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

module.exports = { mentorTurn, mentorFor, buildContext, validateReply, currentInstruction, boxLoops, roomCheck };
