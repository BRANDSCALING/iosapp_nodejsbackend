/**
 * Which workbook files a person gets (BS-DI-009 README, 17 Nov 2026).
 *
 * One file per version; the lookup runs on the person's v2 result record:
 *  - Workbook 1 and 3: the five-way Part 1 result (architect / alchemist / architect-leaning /
 *    alchemist-leaning / mixed).
 *  - Workbook 2: the subtype (architect/alchemist), likely subtype (leaning) or likely mirror
 *    pair (mixed) — BS-DI-003 §3.8, carried in result.p2.
 *  - Workbook 3 opens after Workbook 2 and, for the Mixed types (mixed and both leanings),
 *    after the retake.
 *
 * Files are matched by their deterministic names (WB1-architect.json, WB2-mixed-ms-vo.json…),
 * which the upload keeps as the workbooks.name column.
 */

/** architect | alchemist | architect-leaning | alchemist-leaning | mixed */
function fiveWayKey(result) {
  const p1 = (result && result.p1) || {};
  if (p1.core === 'architect' || p1.core === 'alchemist') return p1.core;
  if (p1.core === 'mixed') {
    /* Part 2 can set or reverse the leaning (BS-DI-003 §3.9); result.p2.lean is the final one. */
    const lean = (result.p2 && result.p2.lean) || p1.lean;
    if (lean === 'architect') return 'architect-leaning';
    if (lean === 'alchemist') return 'alchemist-leaning';
    return 'mixed';
  }
  return null;
}

/** MS → ms, UAl → ual … */
const code = (k) => (k ? String(k).toLowerCase() : null);

/**
 * The three file names this person is entitled to, from their v2 result.
 * Returns { key, wb1, wb2, wb3 } (each a file name or null when not derivable).
 */
function entitledFiles(result) {
  const key = fiveWayKey(result);
  if (!key) return { key: null, wb1: null, wb2: null, wb3: null };
  const p2 = (result && result.p2) || {};

  let wb2 = null;
  if (key === 'architect' || key === 'alchemist') {
    if (p2.result) wb2 = `WB2-${key}-${code(p2.result)}.json`;
  } else if (key === 'architect-leaning' || key === 'alchemist-leaning') {
    if (p2.likely) wb2 = `WB2-${key}-${code(p2.likely)}.json`;
  } else if (Array.isArray(p2.pair)) {
    wb2 = `WB2-mixed-${code(p2.pair[0])}-${code(p2.pair[1])}.json`;
  }

  return {
    key,
    wb1: `WB1-${key}.json`,
    wb2,
    wb3: `WB3-${key}.json`,
  };
}

/** The Mixed types need the retake before Workbook 3 (BS-DI-009 README). */
function isMixedType(key) {
  return key === 'mixed' || key === 'architect-leaning' || key === 'alchemist-leaning';
}

/**
 * Availability of each entitled file.
 * @param {object} result   the v2 result record
 * @param {object} state    { wb2Completed: boolean, retaken: boolean }
 * @returns [{ name, workbook, available, lockedReason }]
 */
function entitledWorkbooks(result, state) {
  const { key, wb1, wb2, wb3 } = entitledFiles(result);
  if (!key) return [];
  const out = [];
  if (wb1) out.push({ name: wb1, workbook: 1, available: true, lockedReason: null });
  if (wb2) out.push({ name: wb2, workbook: 2, available: true, lockedReason: null });
  if (wb3) {
    const needsRetake = isMixedType(key) && !state.retaken;
    const locked = !state.wb2Completed || needsRetake;
    out.push({
      name: wb3,
      workbook: 3,
      available: !locked,
      lockedReason: locked
        ? (!state.wb2Completed
          ? 'Workbook 3 opens after Workbook 2.'
          : 'Workbook 3 opens after your E-DNA retake.')
        : null,
    });
  }
  return out;
}

module.exports = { fiveWayKey, entitledFiles, entitledWorkbooks, isMixedType };
