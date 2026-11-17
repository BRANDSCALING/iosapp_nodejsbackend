#!/usr/bin/env node
/*
 * Parity check for the server-side E-DNA scoring engine (src/services/edna/scoring.js,
 * a port of web-app/js/02-report.js from the E-DNA Dev Package of 16 November 2026).
 *
 * For every variant in example-results.json (architect, alchemist, mixedA, mixedR,
 * mixed) it rebuilds the example answer set from the EX_P1…EX_P7 tables in
 * edna-content.json — the same tables the web preview substitutes when a part is
 * unanswered — runs computeReport() on them, and deep-compares the result to the
 * expected record. Exact equality is required; a tiny relative tolerance (1e-9) is
 * allowed only for floating-point noise. The top-level `example` field is excluded:
 * the expected records were generated in the web preview (all true), while the
 * server engine never substitutes example answers (all false).
 *
 * Usage: node scripts/verify-edna-scoring.js    (exit 0 only on full parity)
 */

'use strict';

const path = require('path');
const scoring = require(path.join(__dirname, '..', 'src', 'services', 'edna', 'scoring.js'));
const EXPECTED = require(path.join(__dirname, '..', 'src', 'services', 'edna', 'example-results.json'));

const C = scoring.CONTENT;

/* The variant's Part 1 core type ('mixedA'/'mixedR'/'mixed' are all Mixed). */
function coreOf(variant) { return variant === 'architect' || variant === 'alchemist' ? variant : 'mixed'; }

/* Rebuild the example answer set for a variant, exactly as the web preview's
 * pNanswers() functions substitute it (02-report.js EX_* tables, now in
 * edna-content.json). */
function exampleAnswers(variant) {
  const core = coreOf(variant);
  /* Part 3 example answers are the option index chosen on each screen, in p3list() order. */
  const p3 = {};
  scoring.p3list(core).forEach((it, i) => { p3[scoring.p3key(it)] = { a: C.EX_P3[core][i] }; });
  return {
    p1: C.EX_P1[variant],
    p2: C.EX_P2[variant],
    p3,
    p4: C.EX_P4,
    p5: C.EX_P5,
    consent5: true,   /* p5answers(): consent5 === null -> consent true when the example set is used */
    p6: C.EX_P6,
    /* p7answers(): the plain 'mixed' preview uses EX_P7_MIXED (two Other answers on one belief) */
    p7: variant === 'mixed' ? C.EX_P7_MIXED : C.EX_P7
  };
}

/* ---- deep compare ---- */

function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }

function numEq(a, b) {
  if (a === b) return true;
  if (typeof a !== 'number' || typeof b !== 'number') return false;
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) <= 1e-9 * scale;   /* floating-point noise only */
}

function diff(expected, actual, pathStr, out) {
  if (typeof expected === 'number' && typeof actual === 'number') {
    if (!numEq(expected, actual)) out.push(`${pathStr}: expected ${expected}, got ${actual}`);
    return;
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) { out.push(`${pathStr}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); return; }
    if (expected.length !== actual.length) out.push(`${pathStr}: expected length ${expected.length}, got ${actual.length}`);
    const n = Math.min(expected.length, actual.length);
    for (let i = 0; i < n; i++) diff(expected[i], actual[i], `${pathStr}[${i}]`, out);
    return;
  }
  if (isObj(expected) || isObj(actual)) {
    if (!isObj(expected) || !isObj(actual)) { out.push(`${pathStr}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); return; }
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    for (const k of keys) {
      const p = `${pathStr}.${k}`;
      if (!(k in expected)) { if (actual[k] !== undefined) out.push(`${p}: unexpected field (got ${JSON.stringify(actual[k])})`); continue; }
      if (!(k in actual)) { if (expected[k] !== undefined) out.push(`${p}: missing field (expected ${JSON.stringify(expected[k])})`); continue; }
      diff(expected[k], actual[k], p, out);
    }
    return;
  }
  if (expected !== actual) out.push(`${pathStr}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

/* ---- run every variant ---- */

const variants = Object.keys(EXPECTED);
let failures = 0;
const summary = [];

for (const variant of variants) {
  const expected = EXPECTED[variant];
  const actual = scoring.computeReport(exampleAnswers(variant));
  const out = [];
  for (const part of Object.keys(expected)) {
    if (part === 'example') continue;   /* preview-only flag: expected all-true, server engine all-false by design */
    diff(expected[part], actual[part], `${variant}.${part}`, out);
  }
  if (out.length === 0) { summary.push(`PASS  ${variant}`); }
  else {
    failures++;
    summary.push(`FAIL  ${variant}  (${out.length} differing field${out.length === 1 ? '' : 's'})`);
    for (const line of out) console.error('  ' + line);
  }
}

console.log('');
console.log('E-DNA scoring parity (server port vs content/example-results.json):');
for (const line of summary) console.log('  ' + line);
console.log(`  (the 'example' flags are excluded by design: preview-only field)`);
console.log('');
if (failures) { console.error(`${failures} of ${variants.length} variants differ.`); process.exit(1); }
console.log(`Full parity: ${variants.length} of ${variants.length} variants match.`);
process.exit(0);
