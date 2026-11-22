/**
 * Legacy E-DNA results — assessments taken on the old website, before the v2 cutover.
 * Those runs filled only the layer columns (layer1_core_type, layer2_subtype, …); the
 * ednaV2 envelope inside layer7_result exists only for v2 runs. On 21 Nov 2026, 24 of
 * 31 member accounts (Fariza's included) had a legacy latest result, and every DI
 * surface treated them as never assessed: type chip "Mixed", dashboard asking to
 * retake, decision Start refused with order_required. The DI readers therefore fall
 * back to this synthesis when the envelope is missing.
 *
 * Only what the old assessment actually measured is carried over: the core type, the
 * subtype, and — for mixed people — the leaning, which the old scoring encoded in the
 * subtype itself ("Architect-like" / "Alchemist-like"). Everything v2 measures and v1
 * did not (stress switching, contexts, domains, beliefs) stays absent; callers must
 * not present those as "none found".
 */
function legacyResult(row) {
  const core = String(row.layer1_core_type || '').toLowerCase();
  if (!['architect', 'alchemist', 'mixed'].includes(core)) return null;
  const sub = row.layer2_subtype || null;
  const lean = core === 'mixed'
    ? (/^architect/i.test(sub || '') ? 'architect'
      : /^alchemist/i.test(sub || '') ? 'alchemist' : null)
    : null;
  const name = core === 'architect' ? 'Architect' : core === 'alchemist' ? 'Alchemist' : 'Mixed';
  return {
    legacy: true,
    p1: { core, lean, result: name },
    /* "-like" subtypes are the leaning, not a subtype of their own */
    p2: sub && !/-like$/i.test(sub) ? { result: sub } : {},
  };
}

module.exports = { legacyResult };
