/**
 * Workbook placeholder substitution (BS-DI-009, 17 Nov 2026).
 *
 * Fariza's 27 workbook files carry {{placeholder}} values that come from the person's E-DNA
 * result record (variables.csv in the handover package names all 38). The engine has no
 * templating, and BS-DI-009.1 §5 leaves the mechanism to the development team: we substitute
 * SERVER-SIDE when the instance is fetched, so iOS, Android and the website all render the
 * same text with no client work.
 *
 * Every derivation below replicates how the APPROVED report renders the same value
 * (02-report.js / 03-detailed.js in Fariza's web-app) or follows variables.csv's words.
 * A value that cannot be derived from the stored record becomes an em dash and is logged —
 * never invented.
 */

const CONTENT = require('./edna-content.json');
const P1_CTX = CONTENT.P1_CTX;

const WORD = { L: 'Logic', F: 'Feeling', D: 'Depends' };
function seqWords(seq) {
  if (!seq || typeof seq !== 'string') return '—';
  return seq.split('').map((ch) => WORD[ch] || ch).join(' → ');
}

function fmtPts(x) {
  const r = Math.round(x * 100) / 100;
  return String(r % 1 === 0 ? Math.round(r) : r);
}

/** 'Pricing' / 'Pricing and Launching' / 'Pricing, Launching and Investing money' */
function joinAnd(list) {
  if (!list.length) return '—';
  if (list.length === 1) return list[0];
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}

const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* The exercises built for the lowest Part 3 result — fixed mapping from variables.csv. */
const LOWEST_EXERCISES = {
  'Dominant-loop awareness': 'Exercises 1 and 2',
  'Non-dominant-loop awareness': 'Exercises 1 and 2',
  'Same-loop awareness': 'Exercises 3 and 5',
  'Alternate-loop awareness': 'Exercises 3, 4 and 5',
  'Architect-loop awareness': 'Exercises 1, 2 and 4',
  'Alchemist-loop awareness': 'Exercises 1, 2 and 4',
  'Awareness of Architects': 'Exercises 3 and 5',
  'Awareness of Alchemists': 'Exercises 3 and 5',
};

/* P3-Q03's trigger options (01-assessment.js), "stored as the switching context". */
const TRIGGERS = ['time pressure', 'money at risk', 'conflict in the conversation', 'other'];

/**
 * Build every placeholder value from the stored v2 record.
 * @param {object} v2 { answers, result } — the ednaV2 envelope's content.
 * @returns {{ values: Object<string,string>, rows: Object<string,string[]>,
 *             perContext: Object<string, Object<string,string>>, hideIfEmpty: string[] }}
 */
function buildValues(v2) {
  const R = (v2 && v2.result) || {};
  const A = (v2 && v2.answers) || {};
  const p1 = R.p1 || {};
  const pts = p1.pts || {};
  const values = {};
  const rows = {};
  const perContext = {};

  /* ---------- Part 1 ---------- */
  const scenIds = Object.keys(pts);
  const ctxLetters = [...new Set(scenIds.filter((id) => id.endsWith('A')).map((id) => id[0]))].sort();
  let totA = 0; let totB = 0;
  scenIds.forEach((id) => { totA += pts[id].A || 0; totB += pts[id].B || 0; });
  const tot = totA + totB || 1;

  const domLabel = p1.core === 'architect' ? 'Architect' : p1.core === 'alchemist' ? 'Alchemist' : null;
  const leanLabel = p1.lean === 'architect' ? 'Architect' : p1.lean === 'alchemist' ? 'Alchemist' : null;
  const otherOf = (label) => (label === 'Architect' ? 'Alchemist' : 'Architect');

  values['p1.context_count'] = String(ctxLetters.length || 4);
  values['p1.points_architect'] = fmtPts(totA);
  values['p1.points_alchemist'] = fmtPts(totB);
  const domPts = p1.core === 'alchemist' ? totB : totA;
  values['p1.share_dominant_pct'] = Math.round((domPts / tot) * 100) + '%';
  values['p1.share_nondominant_pct'] = (100 - Math.round((domPts / tot) * 100)) + '%';
  values['p1.points_each_loop'] = fmtPts(totA); /* Mixed with level split: A and B are equal */
  values['p1.logic_pct'] = Math.round((totA / tot) * 100) + '%';
  values['p1.feeling_pct'] = (100 - Math.round((totA / tot) * 100)) + '%';
  values['p1.half_pct'] = '50%';

  /* Per-context facts, from the answers and per-scenario points (as the detailed report). */
  const ctxFacts = ctxLetters.map((c) => {
    const name = P1_CTX[c] || ('Context ' + c);
    const nPat = pts[c + 'A'] ? pts[c + 'A'].pat : null;
    const sPat = pts[c + 'B'] ? pts[c + 'B'].pat : nPat;
    return {
      name,
      normalSeq: (A.p1 || {})[c + 'A'],
      stressSeq: (A.p1 || {})[c + 'B'],
      nPat,
      sPat,
      switched: (p1.switched || []).find((s) => s.ctx === name) || null,
    };
  });

  ctxFacts.forEach((f) => {
    const label = f.switched
      ? `${f.nPat} · ${CAP(f.switched.kind)} switch under stress`
      : `${f.nPat || '—'} · stable`;
    perContext[f.name] = {
      'p1.ctx.normal_sequence': seqWords(f.normalSeq),
      'p1.ctx.stress_sequence': seqWords(f.stressSeq),
      'p1.ctx.loop_label_and_switch': label,
    };
  });

  const switched = p1.switched || [];
  values['p1.unstable_count'] = String(p1.unstable !== undefined ? p1.unstable : switched.length);
  values['p1.unstable_contexts'] = joinAnd(switched.map((s) => s.ctx));
  values['p1.unstable_contexts_with_switch'] = joinAnd(switched.map((s) => `${s.ctx} (${s.kind})`));
  rows['p1.unstable_context_row'] = switched.map((s) => `${s.ctx} · ${CAP(s.kind)} switch`);

  if (domLabel) {
    values['p1.normal_dominant_count'] = String((p1.normalPatterns || []).filter((p) => p === domLabel).length);
  }
  if (leanLabel) {
    const other = otherOf(leanLabel);
    values['p1.normal_leaning_count'] = String(ctxFacts.filter((f) => f.nPat === leanLabel).length);
    values['p1.stress_leaning_count'] = String(ctxFacts.filter((f) => f.sPat === leanLabel).length);
    const otherUnderStress = ctxFacts.filter((f) => f.sPat === other);
    values['p1.contexts_other_loop_under_stress'] = joinAnd(otherUnderStress.map((f) => f.name));
    rows['p1.other_loop_context_row'] = otherUnderStress.map(
      (f) => `${f.name} · normal: ${seqWords(f.normalSeq)} · stress: ${seqWords(f.stressSeq)}`
    );
    const otherNormal = ctxFacts.find((f) => f.nPat === other);
    values['p1.other_loop_normal_context'] = otherNormal ? otherNormal.name : '';
    /* Wording pending BS-DI-009 review; factual sentence only, empty when there is none. */
    values['p1.other_loop_normal_context_line'] = otherNormal
      ? `Under normal conditions you also used the ${other} loop in ${otherNormal.name}.`
      : '';
  }
  if (p1.core === 'mixed') {
    values['p1.normal_architect_count'] = String(ctxFacts.filter((f) => f.nPat === 'Architect').length);
    values['p1.normal_alchemist_count'] = String(ctxFacts.filter((f) => f.nPat === 'Alchemist').length);
    values['p1.contexts_loop_changed_under_stress'] = joinAnd(
      ctxFacts.filter((f) => f.nPat !== f.sPat).map((f) => f.name)
    );
  }

  /* ---------- Part 2 ---------- */
  const p2 = R.p2 || {};
  if (p2.consistent !== undefined) values['p2.same_count'] = String(p2.consistent);
  if (p2.picksA !== undefined) values['p2.architect_picks'] = String(p2.picksA);
  if (p2.picksR !== undefined) values['p2.alchemist_picks'] = String(p2.picksR);

  /* p2.share.<subtype> and p2.same_answer.<measure>: in the WB2 files but not in
   * variables.csv (flagged to Fariza). Derived exactly as the approved detailed report
   * renders them (03-detailed.js d2boxes/d2dims, Fariza 15 Nov 2026): a subtype's share
   * is its points as a share of its side's three subtypes; The Ultimate box is the share
   * of the 10 answers that chose it; a measure gets ✓ when both contexts answered the
   * same, – when not. */
  const SUB_NAME = {
    MS: 'master-strategist', SB: 'systemised-builder', IA: 'internal-analyser',
    UA: 'the-ultimate-architect', VO: 'visionary-oracle', MP: 'magnetic-perfectionist',
    EE: 'energetic-empath', UAl: 'the-ultimate-alchemist',
  };
  const SUBS = ['MS', 'SB', 'IA'];
  const SUBA = ['VO', 'MP', 'EE'];
  const p2ans = Array.isArray(A.p2) ? A.p2 : [];
  if (p2.scores) {
    [[SUBS, 'UA'], [SUBA, 'UAl']].forEach(([side, ult]) => {
      if (!(side[0] in p2.scores)) return;
      const total = side.reduce((a, k) => a + (p2.scores[k] || 0), 0) || 1;
      side.forEach((k) => { values[`p2.share.${SUB_NAME[k]}`] = Math.round((100 * (p2.scores[k] || 0)) / total) + '%'; });
      const picks = p2ans.filter((k) => k === ult).length;
      values[`p2.share.${SUB_NAME[ult]}`] = Math.round((100 * picks) / 10) + '%';
    });
  }
  const MEASURES = ['when-time-is-cut', 'your-rhythm', 'keeping-scope-in-bounds', 'the-first-thing-you-create', 'under-pressure'];
  if (p2ans.length >= 10) {
    MEASURES.forEach((m, i) => {
      values[`p2.same_answer.${m}`] = p2ans[i * 2] === p2ans[i * 2 + 1] ? '✓' : '–';
    });
  }

  /* ---------- Part 3 ---------- */
  const p3 = R.p3 || {};
  const results = p3.results || [];
  const baseName = (k) => k.replace(/\s*\(.*\)\s*$/, '');
  results.forEach((r) => {
    const slug = baseName(r.k).toLowerCase().replace(/\s+/g, '-');
    values[`p3.${slug}_level`] = r.level;
  });
  if (results.length) {
    const lowest = results.reduce((a, b) => (b.v < a.v ? b : a));
    const name = baseName(lowest.k);
    values['p3.lowest_result'] = name;
    values['p3.lowest_level'] = lowest.level;
    values['p3.lowest_exercises'] = LOWEST_EXERCISES[name] || '—';
  }
  const p3ans = A.p3 || {};
  const trigKey = Object.keys(p3ans).find(
    (k) => k.indexOf('P3-Q03') === 0 && p3ans[k] && p3ans[k].trig !== undefined && p3ans[k].trig !== null
  );
  values['p3.switch_trigger'] = trigKey ? (TRIGGERS[p3ans[trigKey].trig] || 'other') : 'none reported';

  return { values, rows, perContext, hideIfEmpty: ['p1.other_loop_normal_context'] };
}

const TOKEN_RE = /\{\{\s*([a-z0-9_.\-]+)\s*\}\}/gi;

/**
 * Substitute every {{placeholder}} in a workbook structure.
 * Returns { structure, missing } — a deep copy; the original is not touched.
 */
function substitutePlaceholders(structure, v2) {
  const { values, rows, perContext, hideIfEmpty } = buildValues(v2 || {});
  const missing = new Set();

  const sub = (text, ctxName) => text.replace(TOKEN_RE, (whole, token) => {
    if (ctxName && perContext[ctxName] && token in perContext[ctxName]) return perContext[ctxName][token];
    if (token in values) return values[token];
    missing.add(token);
    return '—';
  });

  const hasToken = (text, token) => text.indexOf('{{') >= 0 && text.indexOf(token) >= 0;
  const subRuns = (runs, ctxName) => (runs || []).map((r) => ({ ...r, text: typeof r.text === 'string' ? sub(r.text, ctxName) : r.text }));
  const subCell = (cell, ctxName) => {
    if (typeof cell === 'string') return sub(cell, ctxName);
    return { ...cell, text: sub(cell.text || '', ctxName), runs: subRuns(cell.runs, ctxName) };
  };
  const cellText = (cell) => (typeof cell === 'string' ? cell : (cell && cell.text) || '');

  const subItem = (item) => {
    /* An item whose text carries a hide-if-empty placeholder with no value is dropped
       (variables.csv: "the question is hidden if none"). */
    const flat = JSON.stringify(item);
    for (const t of hideIfEmpty) {
      if (flat.indexOf('{{' + t + '}}') >= 0 && !values[t]) return null;
    }
    const out = { ...item };
    ['text', 'value', 'questionText', 'label', 'placeholder'].forEach((k) => {
      if (typeof out[k] === 'string') out[k] = sub(out[k]);
    });
    out.runs = out.runs ? subRuns(out.runs) : out.runs;
    out.questionRuns = out.questionRuns ? subRuns(out.questionRuns) : out.questionRuns;
    if (out.items) out.items = out.items.map((li) => ({ ...li, text: sub(li.text || ''), runs: subRuns(li.runs) }));
    if (out.options) out.options = out.options.map((o) => (typeof o === 'string' ? sub(o) : o));

    if (out.tableConfig) {
      const tc = { ...out.tableConfig };
      tc.headers = (tc.headers || []).map((h) => subCell(h));
      const newRows = [];
      (tc.rows || []).forEach((row) => {
        const first = cellText(row[0]);
        const rowToken = Object.keys(rows).find((t) => hasToken(first, t));
        if (rowToken) {
          /* "One pre-filled row per …": the template row expands to one row per entry. */
          rows[rowToken].forEach((labelText) => {
            newRows.push(row.map((c, i) => (i === 0
              ? (typeof c === 'string' ? labelText : { ...c, text: labelText, runs: [{ text: labelText, marks: [] }] })
              : subCell(c))));
          });
          return; /* zero entries ⇒ the template row disappears */
        }
        const ctxName = perContext[first] ? first : null;
        newRows.push(row.map((c) => subCell(c, ctxName)));
      });
      tc.rows = newRows;
      out.tableConfig = tc;
    }
    return out;
  };

  const copy = JSON.parse(JSON.stringify(structure));
  (copy.sections || []).forEach((sec) => {
    if (Array.isArray(sec.content)) sec.content = sec.content.map(subItem).filter(Boolean);
  });
  return { structure: copy, missing: [...missing] };
}

module.exports = { buildValues, substitutePlaceholders };
