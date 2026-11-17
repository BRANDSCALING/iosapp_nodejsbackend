/*
 * E-DNA scoring engine (server-side).
 *
 * Port of web-app/js/02-report.js from the E-DNA Dev Package of 16 November 2026
 * (scorePart1…scorePart7, computeReport — the scoring code only; the HTML renderers
 * in that file are not ported). Scoring rules: BS-DI-004 sections 1.5, 2.4, 3.4,
 * 4.3, 5.3, 6.3, 7.4. p3list is ported from web-app/js/01-assessment.js (the only
 * assessment-file dependency scoring needs).
 *
 * Every content table is read from edna-content.json (same file as the package's
 * content/edna-content.json), so wording, weights and option tables stay identical
 * to the web app. The result record uses the exact field names (camelCase) the web
 * app produces. Differences from the browser file:
 *   - the globals `core`, `lean` and `profile` are explicit parameters, threaded
 *     through computeReport() exactly as the browser flow sets them;
 *   - answers come in as one object (see computeReport) instead of the preview's
 *     saved* globals, and there is no example-answer fallback: `example` is always
 *     all-false (the browser sets a flag per part when its preview substitutes the
 *     example answer set).
 *
 * Verified against content/example-results.json by scripts/verify-edna-scoring.js.
 */

'use strict';

const CONTENT = require('./edna-content.json');

/* ---- tables from edna-content.json (identical to the 02-report.js literals) ---- */
const P1_CODE = CONTENT.P1_CODE;   /* option index -> loop, per question position */
const P1_CTX = CONTENT.P1_CTX;
const SUBS = ['MS', 'SB', 'IA'], SUBA = ['VO', 'MP', 'EE'];
const W2 = CONTENT.W2;
const LV3 = CONTENT.LV3;
const P4_DOM = CONTENT.P4_DOM;
const P4_FLAT = CONTENT.P4_FLAT;
const P5_DOMS = CONTENT.P5_DOMS;
const P5_PAT = CONTENT.P5_PAT;
const P6_DOMS = CONTENT.P6_DOMS;
const P7_B = CONTENT.P7_B;
const part3 = CONTENT.part3;
const part4 = CONTENT.part4;
const part5 = CONTENT.part5;
const part6 = CONTENT.part6;
const part7 = CONTENT.part7;

/* ===================== Part 1 (BS-DI-004 1.5) ===================== */

function p1pattern(s) { const b = s[0], v = s[2]; if (b === 'D' || v === 'D') return 'Either'; if (b === 'L' && v === 'L') return 'Architect'; if (b === 'F' && v === 'F') return 'Alchemist'; return 'Mixed'; }

/* ans: scenario id ('1A'…'7B') -> three-letter pattern string ('LFL', 'D' for Depends) */
function scorePart1(ans) {
  const W = [1.5, 1, 1.5]; const normal = {}, stress = {}; let eithers = 0; const tot = { A: 0, B: 0 }; const pts = {};
  Object.keys(ans).forEach(id => { const s = ans[id]; let A = 0, B = 0; for (let i = 0; i < 3; i++) { if (s[i] === 'L') A += W[i]; else if (s[i] === 'F') B += W[i]; else { A += W[i] / 2; B += W[i] / 2; } }
    const pat = p1pattern(s); if (pat === 'Either') eithers++; tot.A += A; tot.B += B; (id.endsWith('A') ? normal : stress)[id[0]] = { pat, A, B }; pts[id] = { A, B, pat }; });
  const ctxs = Object.keys(normal).sort(); const n = Object.keys(ans).length; const need = ctxs.length === 4 ? 3 : 5; const unstableLimit = ctxs.length === 4 ? 2 : 3;
  const pats = ctxs.map(c => normal[c].pat); const cA = pats.filter(p => p === 'Architect').length, cB = pats.filter(p => p === 'Alchemist').length;
  const lead = cA >= need ? 'Architect' : cB >= need ? 'Alchemist' : null;
  const ctxIdx = {}; let unstable = 0; const switched = [];
  ctxs.forEach(c => { const A = normal[c].A + (stress[c] ? stress[c].A : 0), B = normal[c].B + (stress[c] ? stress[c].B : 0); ctxIdx[P1_CTX[c]] = A + B ? Math.abs(A - B) / (A + B) : 0; if (ctxIdx[P1_CTX[c]] < 0.5) unstable++;
    const np = normal[c].pat, sp = stress[c] ? stress[c].pat : np; if (lead && np === lead && sp !== lead && sp !== 'Either') switched.push({ ctx: P1_CTX[c], kind: sp === 'Mixed' ? 'partial' : 'full' }); });
  const overall = (tot.A - tot.B) / (tot.A + tot.B);
  let result, why = '';
  if (n >= 14 && eithers >= 5) { result = 'Mixed'; why = '5 or more Depends out of 14: retake in 4 weeks'; }
  else if (lead && unstable < unstableLimit && eithers < 3) { result = lead; }
  else if (lead) { result = 'Mixed (' + lead + '-leaning)'; why = lead + ' leads under normal conditions but ' + unstable + ' contexts are unstable'; }
  else if (overall >= 0.15) { result = 'Mixed (Architect-leaning)'; why = 'no pattern dominates; overall index ' + overall.toFixed(2); }
  else if (overall <= -0.15) { result = 'Mixed (Alchemist-leaning)'; why = 'no pattern dominates; overall index ' + overall.toFixed(2); }
  else { result = 'Mixed'; why = 'no pattern dominates; overall index ' + overall.toFixed(2); }
  const coreOf = result === 'Architect' ? 'architect' : result === 'Alchemist' ? 'alchemist' : 'mixed';
  const leanOf = result.indexOf('Architect-leaning') > 0 ? 'architect' : result.indexOf('Alchemist-leaning') > 0 ? 'alchemist' : 'none';
  return { result, core: coreOf, lean: leanOf, why, scenarios: n, eithers, normalPatterns: pats, switched, fullSwitch: switched.some(s => s.kind === 'full'), ctxIdx, unstable, overall: Math.round(overall * 100) / 100, pts };
}

/* ===================== Part 2 (BS-DI-004 2.4; BS-DI-003 3.9) ===================== */

/* ans: 10 subtype keys in question order. coreT/lean: from Part 1 (the browser's `core`
 * and `lean` globals). profile: P0-Q01 option (3 = more than 10 years' experience). */
function scorePart2(ans, coreT, fullSwitch, profile, lean) {
  const side = coreT === 'architect' ? SUBS : coreT === 'alchemist' ? SUBA : SUBS.concat(SUBA); const s = {}; side.forEach(k => s[k] = 0); let ultPicks = [];
  ans.forEach((k, i) => { const w = W2[i] || 1; if (k === 'UA' || k === 'UAl') { ultPicks.push(i); (k === 'UA' ? SUBS : SUBA).forEach(t => { if (t in s) s[t] += w / 3; }); } else if (k in s) s[k] += w; });
  const pairs = [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]]; const consistent = pairs.filter(p => ans[p[0]] === ans[p[1]]).length;
  const total = Object.values(s).reduce((a, b) => a + b, 0) || 1; const ranked = Object.keys(s).sort((a, b) => s[b] - s[a]);
  const out = { scores: s, consistent, flag: consistent < 3 || s[ranked[0]] / total < 0.4 };
  if (coreT === 'mixed') {
    const sumA = SUBS.reduce((a, k) => a + s[k], 0), sumR = SUBA.reduce((a, k) => a + s[k], 0); out.sideA = sumA; out.sideR = sumR;
    /* Leaning after Part 2 (BS-DI-003 3.9): each pick counts for its side (Architect subtype or The Ultimate Architect = Architect; Alchemist likewise). 7 or more of 10 on one side sets the leaning, and may reverse the Part 1 leaning; otherwise the Part 1 leaning stands. Core type stays Mixed. */
    const picksA = ans.filter(k => k === 'UA' || SUBS.indexOf(k) >= 0).length, picksR = ans.filter(k => k === 'UAl' || SUBA.indexOf(k) >= 0).length; out.picksA = picksA; out.picksR = picksR; out.lean1 = lean;
    out.lean = picksA >= 7 ? 'architect' : picksR >= 7 ? 'alchemist' : lean; lean = out.lean;
    if (lean === 'architect') out.likely = SUBS.slice().sort((a, b) => s[b] - s[a])[0];
    else if (lean === 'alchemist') out.likely = SUBA.slice().sort((a, b) => s[b] - s[a])[0];
    else { const prs = [['MS', 'VO'], ['IA', 'MP'], ['SB', 'EE']]; out.pair = prs.slice().sort((a, b) => (s[b[0]] + s[b[1]]) - (s[a[0]] + s[a[1]]))[0]; }
    return out;
  }
  /* The Ultimate (BS-DI-003 3.9, BS-DI-004 2.4): more than 10 years' experience (profile answer D) needs the Ultimate on at least 7 of 10; everyone else on all 10. The four criteria apply to both. */
  const experienced = (profile !== undefined && profile !== null) && profile === 3; const need = experienced ? 7 : 10;
  const c1 = ultPicks.length >= need && [0, 1, 8, 9].every(i => ultPicks.indexOf(i) >= 0);
  const rest = ans.filter(k => k !== 'UA' && k !== 'UAl'); const c2 = rest.length === 0 || new Set(rest).size >= 2;
  const c3 = side.every(k => s[k] >= 2); const c4 = !fullSwitch; out.ultimate = { c1, c2, c3, c4, need, experienced };
  if (c1 && c2 && c3 && c4) { out.result = coreT === 'architect' ? 'UA' : 'UAl'; return out; }
  out.result = ranked[0]; if (s[ranked[0]] - s[ranked[1]] <= 1.0) out.second = ranked[1];
  return out;
}

/* ===================== Part 3 (BS-DI-004 3.4; BS-DI-003 4.4) ===================== */

function level3(x) { return LV3.find(l => x >= l[0])[1]; }

function p3q(id) { return part3.find(q => q.id === id); }

/* Ported from 01-assessment.js. Screen order: self-awareness first, then every same-loop
 * question, then every alternate-loop question. Mixed: self, then Architects, then
 * Alchemists, then the shared questions. */
function p3list(core) {
  const out = [];
  const one = (id, ver, recall) => out.push({ q: p3q(id), ver, recall });
  if (core === 'mixed') {
    one('P3-Q01', 'architect', '1A'); one('P3-Q01', 'alchemist', '2A'); one('P3-Q02', 'architect'); one('P3-Q02', 'alchemist'); one('P3-Q03', 'architect', '2B'); one('P3-Q04', 'architect');
    one('P3-Q05', 'mixed'); one('P3-Q07', 'alchemist'); one('P3-Q12', 'alchemist');      /* awareness of Architects */
    one('P3-Q06', 'mixed'); one('P3-Q07', 'architect'); one('P3-Q12', 'architect');      /* awareness of Alchemists */
    one('P3-Q08', 'mixed'); one('P3-Q11', 'mixed'); one('P3-Q09', 'mixed'); one('P3-Q10', 'mixed');
    return out;
  }
  const sameRec = core === 'architect' ? 'P3-Q05' : 'P3-Q06', altRec = core === 'architect' ? 'P3-Q06' : 'P3-Q05';
  one('P3-Q01', core, '1A'); one('P3-Q02', core); one('P3-Q03', core, '2B'); one('P3-Q04', core);
  one(sameRec, core); one('P3-Q08', core); one('P3-Q11', core);
  one(altRec, core); one('P3-Q07', core); one('P3-Q09', core); one('P3-Q10', core); one('P3-Q12', core);
  return out;
}

function p3key(it) { return it.q.id + '-' + it.ver + (it.recall || ''); }

function p3score(it, sv, p1ans) {
  const q = it.q, ver = it.ver; const opts = (ver === 'mixed' && q.mixedOpts) ? q.mixedOpts : (q.v ? q.v[ver].opts : q.opts); const o = opts[sv.a]; if (!o) return 0;
  if (q.id === 'P3-Q01' || q.id === 'P3-Q03') { const seq = p1ans[it.recall]; if (!seq || o.k === 'NA' || !o.k) return 0; const pat = seq[0] + seq[2]; if (pat.indexOf('D') >= 0) return 50; let m = 0; if (o.k[0] === pat[0]) m++; if (o.k[1] === pat[1]) m++; return m === 2 ? 100 : m === 1 ? 50 : 0; }
  if (q.id === 'P3-Q05' || q.id === 'P3-Q06') { if (ver === 'mixed') return o.s || 0; const want = (q.loop === ver) ? 'same' : 'diff'; return o.k === want ? 100 : 0; }
  return o.s || 0;
}

/* ans: key 'P3-Q01-architect1A' (id-version+recall) -> { a: option index }.
 * p1ans: the Part 1 answers (for the recall questions). core/lean: the browser globals
 * — lean as it stands AFTER Part 2 (computeReport threads it through). */
function scorePart3(ans, p1ans, core, lean) {
  const list = p3list(core); const sc = {}; list.forEach(it => { sc[p3key(it)] = p3score(it, ans[p3key(it)] || {}, p1ans); });
  const g = k => sc[k] === undefined ? 0 : sc[k]; const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  let res;
  if (core !== 'mixed') {
    const c = core, same = c === 'architect' ? 'P3-Q05' : 'P3-Q06', alt = c === 'architect' ? 'P3-Q06' : 'P3-Q05';
    const dom = g('P3-Q01-' + c + '1A'); const non = avg([g('P3-Q02-' + c), g('P3-Q03-' + c + '2B'), g('P3-Q04-' + c)]);
    const sm = avg([g(same + '-' + c), g('P3-Q08-' + c), g('P3-Q11-' + c)]);
    const al = (g(alt + '-' + c) + 1.25 * g('P3-Q07-' + c) + g('P3-Q09-' + c) + 1.25 * g('P3-Q10-' + c) + g('P3-Q12-' + c)) / 5.5;
    res = [{ k: 'Dominant-loop awareness', v: dom, loop: c }, { k: 'Non-dominant-loop awareness', v: non, loop: c === 'architect' ? 'alchemist' : 'architect' }, { k: 'Same-loop awareness', v: sm, loop: c }, { k: 'Alternate-loop awareness', v: al, loop: c === 'architect' ? 'alchemist' : 'architect' }];
    const cap = dom; res.forEach((r, i) => { r.capped = i > 0 && r.v > cap; if (r.capped) r.v = cap; r.level = level3(r.v); });
    const trig = g('P3-Q01-' + c + '1A') === 0 && g('P3-Q03-' + c + '2B') === 0;
    return { results: res, area: [[res[0], res[1]], [res[2], res[3]]], consistency: trig ? 'triggered: P3-Q01 and P3-Q03 point to the other loop' : 'not triggered' };
  }
  /* Mixed: per loop. Preview rule (to be confirmed in BS-DI-004 3.4): Architect-loop awareness = P3-Q01 on the Architect-pattern scenario and P3-Q02 Alchemist version (understanding a logic-first decision); Alchemist-loop awareness = P3-Q01 on the Alchemist-pattern scenario and P3-Q02 Architect version; P3-Q03 and Q04 count towards the leaning loop (Architect when none). Awareness of Architects = P3-Q05, Q07 (Alchemist version) ×1.25, Q12 (Alchemist version) plus the shared Q08, Q09, Q10 ×1.25, Q11; Awareness of Alchemists the same with Q06, Q07 and Q12 (Architect version). Each result capped at 69 (Moderate) while Part 1 is unconfirmed (BS-DI-003 4.4). */
  const shared = [g('P3-Q08-mixed'), g('P3-Q09-mixed'), g('P3-Q11-mixed')], sharedW = 1.25 * g('P3-Q10-mixed');
  const lp = lean === 'alchemist' ? 'alchemist' : 'architect';
  const archSelf = [g('P3-Q01-architect1A'), g('P3-Q02-alchemist')], alchSelf = [g('P3-Q01-alchemist2A'), g('P3-Q02-architect')];
  (lp === 'architect' ? archSelf : alchSelf).push(g('P3-Q03-architect2B'), g('P3-Q04-architect'));
  const ofA = (g('P3-Q05-mixed') + 1.25 * g('P3-Q07-alchemist') + g('P3-Q12-alchemist') + shared[0] + shared[1] + shared[2] + sharedW) / 7.5;
  const ofR = (g('P3-Q06-mixed') + 1.25 * g('P3-Q07-architect') + g('P3-Q12-architect') + shared[0] + shared[1] + shared[2] + sharedW) / 7.5;
  const A = { k: 'Architect-loop awareness', v: avg(archSelf), loop: 'architect' }, R = { k: 'Alchemist-loop awareness', v: avg(alchSelf), loop: 'alchemist' };
  const OA = { k: 'Awareness of Architects', v: ofA, loop: 'architect' }, OR = { k: 'Awareness of Alchemists', v: ofR, loop: 'alchemist' };
  if (lean === 'architect') { A.k += ' (your leaning and possible Dominant loop)'; R.k += ' (your possible non-dominant loop)'; }
  if (lean === 'alchemist') { R.k += ' (your leaning and possible Dominant loop)'; A.k += ' (your possible non-dominant loop)'; }
  const all = [A, R, OA, OR]; const above = all.some(r => r.v > 69); const capDom = lean === 'alchemist' ? R.v : lean === 'architect' ? A.v : Math.max(A.v, R.v);
  all.forEach(r => { r.raw = r.v; if (r.v > capDom) r.v = capDom; if (r.v > 69) r.v = 69; r.level = level3(r.v); });
  const self = lean === 'alchemist' ? [R, A] : [A, R], others = lean === 'alchemist' ? [OR, OA] : [OA, OR];
  return { results: all, area: [self, others], consistency: above ? 'triggered: a result above Moderate before the cap' : 'not triggered' };
}

/* ===================== Part 4 (BS-DI-004 4.3) ===================== */

/* ans: 10 option indices */
function scorePart4(ans) { const out = []; let clear = 0; P4_DOM.forEach((d, i) => { const a = part4[i * 2].opts[ans[i * 2]].r, b = part4[i * 2 + 1].opts[ans[i * 2 + 1]].r; if (a === b) { out.push({ dom: d[0], r: a, clear: true }); clear++; } else out.push({ dom: d[0], r: P4_FLAT[d[0]], clear: false }); }); return { domains: out, profile: clear >= 3 ? 'clear' : 'flat' }; }

/* ===================== Part 5 (BS-DI-004 5.3) ===================== */

/* ans: 26 values 0–2; consent: Part 5 comparison consent */
function scorePart5(ans, consent) {
  const dom = P5_DOMS.map(d => { let pts = 0; part5.forEach((st, i) => { if (st.d === d) pts += st.rev ? 2 - ans[i] : ans[i]; }); const sc = pts / 8 * 100; return { dom: d, score: Math.round(sc), level: sc >= 60 ? 'High' : sc >= 40 ? 'Moderate' : 'Low', blocks: sc >= 60 ? 3 : sc >= 40 ? 2 : 1 }; });
  const patterns = dom.filter(d => d.level === 'High' && P5_PAT[d.dom]).map(d => P5_PAT[d.dom]); const layered = patterns.length >= 2;
  const strengths = ['depth of focus', 'pattern recognition', 'creativity'].map(n => { let pts = 0; part5.forEach((st, i) => { if (st.d === 'Strength: ' + n) pts += ans[i]; }); return { n, score: Math.round(pts / 4 * 100) }; }).filter(s => s.score >= 60);
  const style = patterns.length === 0 ? 'Neurotypical people' : strengths.length ? 'Neurodivergent people with exceptional strengths' : 'Neurodivergent people';
  return { domains: dom, patterns, layered, strengths, style, consent: !!consent };
}

/* ===================== Part 6 (BS-DI-004 6.3) ===================== */

/* ans: 20 values 0–4 */
function scorePart6(ans) { return P6_DOMS.map(d => { let pts = 0; part6.forEach((st, i) => { if (st.d === d[0]) pts += st.rev ? 4 - ans[i] : ans[i]; }); const sc = pts / 16 * 100; const band = sc < 40 ? 0 : sc < 70 ? 1 : 2; return { dom: d[0], score: Math.round(sc), band, labels: [d[1], d[2], d[3]], result: d[band + 1] }; }); }

/* ===================== Part 7 (BS-DI-004 7.4) ===================== */

/* ans: 21 option keys ('A', 'B', 'both', 'other'; index 20 is the override question) */
function scorePart7(ans) {
  const VAL = { A: 0, both: 50, B: 100 }; const beliefs = P7_B.map(b => { const vals = b[1].filter(i => ans[i] !== 'other').map(i => VAL[ans[i]]); const nOther = b[1].length - vals.length; if (nOther >= 2 || vals.length === 0) return { belief: b[0], none: true, a: b[2], c: b[3] }; const sc = vals.reduce((x, y) => x + y, 0) / vals.length; const r = sc < 40 ? 0 : sc < 70 ? 1 : 2; return { belief: b[0], score: Math.round(sc), band: r, a: b[2], c: b[3], both: b[4], result: r === 0 ? b[2] : r === 2 ? b[3] : 'Both' }; });
  const ends = beliefs.filter(b => !b.none).map(b => b.result); const flagged = [['Speed', 'Limited'], ['Purpose', 'Stories'], ['Craft', 'Competitors'], ['New', 'Limited']].filter(p => ends.indexOf(p[0]) >= 0 && ends.indexOf(p[1]) >= 0).map(p => p.join(' + '));
  return { beliefs, flagged, override: ans[20] };
}

/* ===================== computeReport ===================== */

/**
 * answers:
 *   profile  P0-Q01 option 0–3 (3 = more than 10 years' experience); optional
 *   p1       { '1A': 'LFL', … }  scenario id -> pattern string ('D' = Depends)
 *   p2       10 subtype keys in question order ('MS'…'EE', 'UA', 'UAl')
 *   p3       { 'P3-Q01-architect1A': { a: optionIndex }, … }  key = id + '-' + version + recall
 *   p4       10 option indices
 *   p5       26 values 0–2
 *   consent5 Part 5 comparison consent (boolean)
 *   p6       20 values 0–4
 *   p7       21 option keys, or objects { k } as the web app saves them
 *
 * Returns the same record shape the web app's computeReport() produces, except that
 * `example` is always all-false (no preview example-answer fallback server-side).
 */
function computeReport(answers) {
  const a = answers || {};
  const r1 = scorePart1(a.p1 || {});
  const core = r1.core; let lean = r1.lean;
  const p2ans = (a.p2 || []).map(k => (k && typeof k === 'object') ? k.k : k);
  const r2 = scorePart2(p2ans, core, r1.fullSwitch, a.profile, lean);
  if (core === 'mixed' && r2.lean !== undefined) { lean = r2.lean; r1.lean = r2.lean; }   /* the leaning after Part 2 is the one the report shows (BS-DI-003 3.9) */
  const r3 = scorePart3(a.p3 || {}, a.p1 || {}, core, lean);
  const r4 = scorePart4(a.p4 || []);
  const r5 = scorePart5(a.p5 || [], a.consent5 === null || a.consent5 === undefined ? false : a.consent5);
  const r6 = scorePart6(a.p6 || []);
  const p7ans = (a.p7 || []).map(x => (x && typeof x === 'object') ? x.k : x);
  const r7 = scorePart7(p7ans);
  return { p1: r1, p2: r2, p3: r3, p4: r4, p5: r5, p6: r6, p7: r7, example: { p1: false, p2: false, p3: false, p4: false, p5: false, p6: false, p7: false } };
}

module.exports = {
  computeReport,
  scorePart1,
  scorePart2,
  scorePart3,
  scorePart4,
  scorePart5,
  scorePart6,
  scorePart7,
  p1pattern,
  p3list,
  p3key,
  level3,
  CONTENT
};
