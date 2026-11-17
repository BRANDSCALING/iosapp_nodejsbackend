#!/usr/bin/env node
/*
 * Checks the BS-DI-009 workbook pipeline against REAL scored results (no database needed):
 * for each example variant (architect, alchemist, mixedA, mixedR, mixed) it scores the
 * example answer set (as verify-edna-scoring.js does), derives the entitled file names,
 * asserts those files exist in the handover package, substitutes the placeholders into
 * each, and fails if any {{token}} survives or a value could not be derived.
 *
 * Usage: node scripts/test-workbooks-v2.js /path/to/workbooks-json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const scoring = require('../src/services/edna/scoring.js');
const { entitledFiles, entitledWorkbooks } = require('../src/services/edna/workbookSelect.js');
const { substitutePlaceholders } = require('../src/services/edna/placeholders.js');

const dir = process.argv[2];
if (!dir) { console.error('Usage: node scripts/test-workbooks-v2.js <workbooks-json dir>'); process.exit(1); }

const C = scoring.CONTENT;
function coreOf(v) { return v === 'architect' || v === 'alchemist' ? v : 'mixed'; }
function exampleAnswers(variant) {
  const core = coreOf(variant);
  const p3 = {};
  scoring.p3list(core).forEach((it, i) => { p3[scoring.p3key(it)] = { a: C.EX_P3[core][i] }; });
  return {
    p1: C.EX_P1[variant], p2: C.EX_P2[variant], p3,
    p4: C.EX_P4, p5: C.EX_P5, consent5: true, p6: C.EX_P6,
    p7: variant === 'mixed' ? C.EX_P7_MIXED : C.EX_P7,
  };
}

let failures = 0;
const fail = (msg) => { failures++; console.error('  ❌ ' + msg); };

for (const variant of ['architect', 'alchemist', 'mixedA', 'mixedR', 'mixed']) {
  const answers = exampleAnswers(variant);
  const result = scoring.computeReport(answers);
  const v2 = { version: 2, answers, result };
  const ent = entitledFiles(result);
  console.log(`\n=== ${variant} → key=${ent.key}  wb1=${ent.wb1}  wb2=${ent.wb2}  wb3=${ent.wb3}`);

  for (const name of [ent.wb1, ent.wb2, ent.wb3]) {
    if (!name) { fail('a workbook file could not be derived'); continue; }
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) { fail(`${name} not in the package`); continue; }
    const d = JSON.parse(fs.readFileSync(p, 'utf8'));
    const { structure, missing } = substitutePlaceholders(d.structure, v2);
    const flat = JSON.stringify(structure);
    const leftovers = [...new Set((flat.match(/\{\{\s*[a-z0-9_.\-]+\s*\}\}/gi) || []))];
    if (leftovers.length) fail(`${name}: tokens left in output: ${leftovers.join(', ')}`);
    if (missing.length) fail(`${name}: underivable values (rendered as —): ${missing.join(', ')}`);
    if (!leftovers.length && !missing.length) console.log(`  ✓ ${name}: every placeholder substituted`);
  }

  /* gating sanity */
  const locked = entitledWorkbooks(result, { wb2Completed: false, retaken: false }).find((e) => e.workbook === 3);
  const open = entitledWorkbooks(result, { wb2Completed: true, retaken: true }).find((e) => e.workbook === 3);
  if (locked && locked.available) fail('WB3 should be locked before WB2 is complete');
  if (open && !open.available) fail('WB3 should open after WB2 (+ retake for Mixed types)');
}

/* show one substituted sample so the words can be eyeballed */
const sample = scoring.computeReport(exampleAnswers('architect'));
const d = JSON.parse(fs.readFileSync(path.join(dir, 'WB1-architect.json'), 'utf8'));
const s = substitutePlaceholders(d.structure, { answers: exampleAnswers('architect'), result: sample }).structure;
const texts = [];
(s.sections || []).forEach((sec) => (sec.content || []).forEach((it) => {
  const t = it.text || '';
  if (/points|unstable|switch|Split/.test(t)) texts.push(t);
  if (it.tableConfig) it.tableConfig.rows.forEach((r) => {
    const c0 = typeof r[0] === 'string' ? r[0] : r[0].text;
    if (/·|→/.test(c0)) texts.push('[row] ' + r.map((c) => (typeof c === 'string' ? c : c.text)).join(' | '));
  });
}));
console.log('\n--- substituted sample (WB1-architect, example answers) ---');
texts.slice(0, 10).forEach((t) => console.log('  ' + t.slice(0, 160)));

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
