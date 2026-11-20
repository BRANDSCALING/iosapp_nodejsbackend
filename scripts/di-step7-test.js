/**
 * Step-7 test — notifications (BS-AI-009), guests (BS-AI-008 §5), attachments
 * (BS-AI-004 step 5) and the GHL webhook contract (BS-AI-013 §7), against a running
 * local server (BASE, default http://127.0.0.1:8010) in AUTH_MODE=legacy with the stub
 * model. Talks to the database directly (DB_* env) for the time-travel setups the API
 * rightly refuses. Exits non-zero on the first failure.
 */
const { Pool } = require('pg');

const BASE = process.env.BASE || 'http://127.0.0.1:8010';
const API = BASE + '/api/di';
const A = 'aaaaaaa1-0000-4000-8000-000000000001'; /* seeded member, tier entry */
const G = 'cccccccc-0000-4000-8000-000000000001'; /* fresh free user: becomes a guest */
const GEMAIL = 'guest.step7@test.local';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'edna_wb_test',
  user: process.env.DB_USER || 'brandscaling',
  password: process.env.DB_PASSWORD || undefined,
});

let failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('  ✓ ' + name); } else { failures++; console.log('  ✗ ' + name + (extra ? ' — ' + JSON.stringify(extra).slice(0, 300) : '')); }
}
async function call(user, method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'content-type': 'application/json', 'x-user-id': user },
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = null; try { j = await res.json(); } catch (e) { j = {}; }
  j.__status = res.status;
  return j;
}

(async () => {
  /* ---------- setup: a clean slate for the two actors ---------- */
  await pool.query('DELETE FROM guest_access WHERE user_id = $1', [G]);
  await pool.query("DELETE FROM users WHERE id = $1", [G]);
  await pool.query(`
    INSERT INTO users (id, email, name, first_name, tier)
    VALUES ($1, $2, 'Guest Step7', 'Guest', NULL)
  `, [G, GEMAIL]);
  await pool.query("DELETE FROM notification WHERE user_id IN ($1,$2)", [A, G]);
  await pool.query('DELETE FROM ghl_outbox');
  await pool.query('DELETE FROM ghl_inbound_event');
  /* rows this test made on earlier runs */
  await pool.query("DELETE FROM decision_log WHERE user_id IN ($1,$2) AND (text LIKE 'Step-7%' OR text LIKE 'Guest decision%' OR text LIKE 'After day 7%')", [A, G]);
  await pool.query("DELETE FROM decision WHERE user_id IN ($1,$2) AND (text LIKE 'Step-7%' OR text LIKE 'Guest decision%' OR text LIKE 'After day 7%')", [A, G]);
  await pool.query("DELETE FROM decision_room WHERE owner_user_id = $1 AND decision_text LIKE 'Step-7%'", [A]);
  await pool.query('DELETE FROM credit_ledger WHERE user_id = $1', [G]);
  await pool.query('DELETE FROM credit_grant WHERE user_id = $1', [G]);
  await pool.query('DELETE FROM notification_pref WHERE user_id IN ($1,$2)', [A, G]);

  console.log('\n1 · Attachments (upload → extract → confirm → in the box)');
  const d1 = await call(A, 'POST', '/decisions', { text: 'Step-7: choose the office', kind: 'new' });
  ok('decision created', d1.__status === 201, d1);
  const did = d1.decision.id;
  const txt = Buffer.from('Rent £2,400 a month. Break clause at 12 months. 14 desks.').toString('base64');
  const up = await call(A, 'POST', '/decisions/' + did + '/attachments', { box: 'box1', filename: 'lease-notes.txt', mime: 'text/plain', data: txt });
  ok('upload accepted with an extract', up.__status === 201 && up.attachment && !!up.attachment.extract, up);
  ok('extract is the stub (no key in this run)', String(up.attachment.extract).indexOf('[stub]') === 0, up.attachment);
  const bad = await call(A, 'POST', '/decisions/' + did + '/attachments', { box: 'box1', filename: 'x.exe', mime: 'application/x-msdownload', data: txt });
  ok('wrong type refused with the app wording', bad.__status === 400 && /PDF, Word, text and images/.test(bad.message || ''), bad);
  const cf = await call(A, 'POST', '/attachments/' + up.attachment.id + '/confirm', {});
  ok('confirm works', cf.__status === 200, cf);
  const det = await call(A, 'GET', '/decisions/' + did);
  ok('the extract entered the box as an entry', (det.entries || []).some((e) => e.box === 'box1' && /From lease-notes\.txt/.test(e.text)), det.entries);
  const lst = await call(A, 'GET', '/decisions/' + did + '/attachments');
  ok('list shows it confirmed', lst.__status === 200 && lst.attachments.length === 1 && !!lst.attachments[0].confirmed_at, lst);
  const fil = await fetch(API + '/attachments/' + up.attachment.id + '/file', { headers: { 'x-user-id': A } });
  ok('the stored file comes back', fil.status === 200 && (await fil.text()).indexOf('Rent £2,400') >= 0);
  const del = await call(A, 'DELETE', '/attachments/' + up.attachment.id);
  ok('delete is soft and works', del.__status === 200 && del.removed === true, del);

  console.log('\n2 · Room events → Needs you and the bell (N1, N2, N3, N5)');
  const room = await call(A, 'POST', '/rooms', { decision_text: 'Step-7 room: pick the venue', kind: 'new' });
  ok('room created', room.__status === 201, room);
  const rid = room.room.id;
  const inv = await call(A, 'POST', '/rooms/' + rid + '/invites', { email: GEMAIL, role: 'collaborator' });
  ok('invite created', inv.__status === 201, inv);
  let nyG = await call(G, 'GET', '/needs-you');
  ok('N1 shows in the guest’s Needs you before accepting', nyG.items.some((i) => i.event === 'N1' && i.invite_token === inv.invite.token), nyG);
  const outb1 = await pool.query("SELECT event FROM ghl_outbox WHERE event = 'room.invited'");
  ok('room.invited queued for GHL (pending, no URL configured)', outb1.rows.length === 1);
  const acc = await call(G, 'POST', '/invites/' + inv.invite.token + '/accept', { consent: true });
  ok('accept with consent', acc.__status === 200 && acc.joined, acc);
  const profG = await call(G, 'GET', '/profile');
  ok('the joiner became a guest: 7 days, 3 decisions', profG.guest && profG.guest.decisions_left === 3 && profG.guest.days_left === 7, profG.guest);
  nyG = await call(G, 'GET', '/needs-you');
  ok('N1 left Needs you by the action, not dismissal', !nyG.items.some((i) => i.event === 'N1'), nyG);
  const rd = await call(A, 'POST', '/rooms/' + rid + '/rounds', {});
  ok('round opened', rd.__status === 200, rd);
  nyG = await call(G, 'GET', '/needs-you');
  ok('N2 waits on the guest', nyG.items.some((i) => i.event === 'N2' && i.room_id === rid), nyG);
  const bellG = await call(G, 'GET', '/notifications');
  ok('the bell holds the N2 record', bellG.notifications.some((x) => x.event === 'N2'), bellG);
  const ent = await call(G, 'POST', '/rooms/' + rid + '/entries', { box: 'box2', text: 'It feels rushed: nobody has seen the second venue.' });
  ok('guest entry accepted', ent.__status === 201, ent);
  nyG = await call(G, 'GET', '/needs-you');
  ok('N2 cleared itself once the entry is in', !nyG.items.some((i) => i.event === 'N2'), nyG);
  const nyA = await call(A, 'GET', '/needs-you');
  ok('N3 waits on the owner', nyA.items.some((i) => i.event === 'N3' && i.room_id === rid), nyA);
  for (const [box, text] of [['box1', 'Venue A is £3k, venue B £4k; both free on the date.'], ['end', 'The budget decides it.'], ['box4', 'We take venue A.']]) {
    await call(A, 'PUT', '/rooms/' + rid + '/boxes/' + box, { text });
  }
  const chk = await call(A, 'POST', '/rooms/' + rid + '/check', {});
  ok('owner check runs (stub)', chk.__status === 200, chk);
  const n5 = await pool.query("SELECT 1 FROM notification WHERE user_id = $1 AND event = 'N5'", [G]);
  ok('N5 reached the collaborator', n5.rows.length === 1);

  console.log('\n3 · The guest’s three decisions and day 7');
  let made = 0;
  for (let i = 0; i < 3; i++) {
    const r = await call(G, 'POST', '/decisions', { text: 'Guest decision ' + (i + 1), kind: 'new', order: 'logic_first' });
    if (r.__status === 201) made++;
  }
  ok('three guest decisions allowed', made === 3);
  const over = await call(G, 'POST', '/decisions', { text: 'Guest decision 4', kind: 'new', order: 'logic_first' });
  ok('the fourth is refused with the keep-the-app line', over.__status === 403 && over.error === 'guest_limit', over);
  await pool.query("UPDATE guest_access SET ends_at = now() - interval '1 hour' WHERE user_id = $1", [G]);
  const ended = await call(G, 'POST', '/decisions', { text: 'After day 7', kind: 'new', order: 'logic_first' });
  ok('after day 7: new decisions wait, nothing deleted', ended.__status === 403 && ended.error === 'guest_ended', ended);
  const profG2 = await call(G, 'GET', '/profile');
  ok('profile says the guest access ended', profG2.guest && profG2.guest.ended === true, profG2.guest);
  const logG = await call(G, 'GET', '/log');
  ok('the log stays readable', logG.__status === 200);

  console.log('\n4 · The scheduler: review due (N6), the one reminder (N7), guest day 5 (N12)');
  await pool.query("UPDATE decision_log SET review_date = CURRENT_DATE - 8, decided_text = COALESCE(decided_text,'We take venue A.') WHERE user_id = $1 AND room_id = $2", [A, rid]);
  await pool.query("UPDATE guest_access SET ends_at = now() + interval '36 hours' WHERE user_id = $1", [G]);
  const scheduler = require('../src/services/di/scheduler');
  await scheduler.tick();
  await scheduler.tick(); /* idempotency: the second pass must add nothing */
  const n6 = await pool.query("SELECT count(*)::int AS n FROM notification WHERE user_id = $1 AND event = 'N6'", [A]);
  const n7 = await pool.query("SELECT count(*)::int AS n FROM notification WHERE user_id = $1 AND event = 'N7'", [A]);
  ok('N6 sent once', n6.rows[0].n === 1, n6.rows);
  ok('N7 sent once (8 days past the date)', n7.rows[0].n === 1, n7.rows);
  const n12 = await pool.query("SELECT count(*)::int AS n FROM notification WHERE user_id = $1 AND event = 'N12_5'", [G]);
  ok('guest day-5 notice sent once', n12.rows[0].n === 1, n12.rows);
  const nyA2 = await call(A, 'GET', '/needs-you');
  ok('the review shows under Needs you', nyA2.items.some((i) => i.event === 'N6'), nyA2);
  const pend = await pool.query("SELECT count(*)::int AS n FROM ghl_outbox WHERE status = 'pending'");
  ok('every email event is queued for GHL, none lost, none sent (no URL yet)', pend.rows[0].n >= 3, pend.rows);

  console.log('\n5 · The GHL → backend contract (order.completed, payment_failed, unsubscribed)');
  const whBase = BASE + '/api/webhooks/ghl/di?key=' + (process.env.GHL_WEBHOOK_SECRET || 'localtest');
  const post = (b) => fetch(whBase, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());
  const noKey = await fetch(BASE + '/api/webhooks/ghl/di', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  ok('no key → 401', noKey.status === 401);
  const o1 = await post({ event: 'order.completed', event_id: 'evt-s7-1', email: GEMAIL, product: 'E-DNA Advanced Report', amount: 99 });
  ok('order.completed applies', o1.success === true, o1);
  const grant = await pool.query("SELECT amount, source FROM credit_grant WHERE user_id = $1 ORDER BY granted_at DESC LIMIT 1", [G]);
  ok('10 decisions granted as purchase_99', grant.rows.length && grant.rows[0].amount === 10 && grant.rows[0].source === 'purchase_99', grant.rows);
  const conv = await pool.query('SELECT converted_at FROM guest_access WHERE user_id = $1', [G]);
  ok('the guest converted: the clock stops', !!conv.rows[0].converted_at);
  const dup = await post({ event: 'order.completed', event_id: 'evt-s7-1', email: GEMAIL, product: 'E-DNA Advanced Report' });
  ok('a retried webhook applies once', dup.duplicate === true, dup);
  const g2 = await pool.query('SELECT count(*)::int AS n FROM credit_grant WHERE user_id = $1', [G]);
  ok('no second grant', g2.rows[0].n === 1, g2.rows);
  await post({ event: 'membership.payment_failed', event_id: 'evt-s7-2', email: GEMAIL, attempt: 1 });
  const a8 = await pool.query("SELECT 1 FROM notification WHERE user_id = $1 AND event = 'A8'", [G]);
  ok('payment failed → the A8 banner record', a8.rows.length === 1);
  await post({ event: 'contact.unsubscribed', event_id: 'evt-s7-3', email: GEMAIL });
  const prefs = await call(G, 'GET', '/notification-prefs');
  ok('unsubscribed → email off for the switchable events', prefs.prefs.every((p) => p.email === false), prefs);

  console.log('\n6 · Settings · Notifications (the switches)');
  const put = await call(A, 'PUT', '/notification-prefs', { event: 'N6', push: true, email: false });
  ok('a switch saves', put.__status === 200, put);
  const got = await call(A, 'GET', '/notification-prefs');
  const n6p = got.prefs.find((p) => p.event === 'N6');
  ok('and reads back', n6p && n6p.email === false && n6p.push === true, n6p);
  const n15 = await call(A, 'PUT', '/notification-prefs', { event: 'N15', email: false });
  ok('security notices cannot be switched off', n15.__status === 400, n15);

  await pool.end();
  console.log(failures === 0 ? '\nALL STEP-7 CHECKS PASS' : '\n' + failures + ' FAILURE(S)');
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('test run failed:', e); process.exit(1); });
