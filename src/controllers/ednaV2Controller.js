/**
 * E-DNA v2 (the 16 Nov 2026 redesign) — website endpoint.
 *
 * POST /api/v2/edna/complete  { userId?, email?, name?, savedAt, answers, clientResult? }
 *
 * The WEBSITE submits the raw answers when the assessment finishes; the report is computed
 * HERE, server-side (BS-DI-005 §8), with src/services/edna/scoring.js — the verbatim port of
 * the reference implementation (web-app/js/02-report.js), proven against example-results.json.
 *
 * The stored record is IDENTICAL in shape to what the iOS app (EDNASyncService.swift) writes
 * through POST /api/v1/quiz/results: legacy layer columns for the admin/agent views, and the
 * full v2 record embedded in layer7_result as {"override":…, "ednaV2":{version,savedAt,answers,
 * result}} — so a report taken on the web restores in the app and vice versa.
 *
 * Auth is STRICT regardless of AUTH_MODE (this endpoint is new; nothing legacy calls it):
 * a verified Cognito Bearer token is required and the userId must be the token's sub.
 *
 * clientResult, when sent, is the browser's own computation (same reference code). The server
 * result is authoritative; a mismatch is logged loudly because it means a port/normalisation
 * bug, not a user problem.
 */
const { computeReport } = require('../services/edna/scoring');
const { verifyBearer, sameUser } = require('../middleware/cognitoVerify');
const quizController = require('./quizController');
const { query } = require('../config/database'); // held GHL purchases (19 Nov 2026)

/* Subtype display names/lines (SUB_TXT in the reference 02-report.js). */
const SUB_TXT = {
  MS: ['Master Strategist', 'Win by sequencing the right bets at the right time.'],
  SB: ['Systemised Builder', 'Win by making the business run predictably.'],
  IA: ['Internal Analyser', 'Win by being right: truth through data and models.'],
  UA: ['The Ultimate Architect', 'Strategy, systems and proof integrated.'],
  VO: ['Visionary Oracle', 'Win by seeing the future pattern first.'],
  MP: ['Magnetic Perfectionist', 'Win by crafting product quality and features that draw people in.'],
  EE: ['Energetic Empath', 'Win by mobilising people and energy around a cause.'],
  UAl: ['The Ultimate Alchemist', 'Vision, quality and people integrated, with proof.'],
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** The same legacy-column mapping EDNASyncService.mapToLegacy performs on iOS. */
function mapToLegacy(result, envelope) {
  const r = result;
  const patterns = (r.p1 && r.p1.normalPatterns) || [];
  const architectCount = patterns.filter((p) => p === 'Architect').length;
  const alchemistCount = patterns.filter((p) => p === 'Alchemist').length;
  const strength = r.p1.core === 'mixed' ? 'Mixed' : (r.p1.unstable === 0 ? 'Strong' : 'Medium');

  const subtypeKey = r.p2 && (r.p2.result || r.p2.likely || (r.p2.pair && r.p2.pair[0]));
  const sub = subtypeKey && SUB_TXT[subtypeKey];

  const p3results = (r.p3 && r.p3.results) || [];
  const dom3 = p3results[0];
  const layer3 = JSON.stringify({
    awarenessLevel: dom3 ? dom3.level : undefined,
    integrationPercent: p3results.length
      ? Math.round(p3results.reduce((a, b) => a + (b.v || 0), 0) / p3results.length)
      : undefined,
    description: p3results.map((x) => `${x.k}: ${x.level}`).join(' · '),
  });

  const d4 = (r.p4 && r.p4.domains) || [];
  const p4r = (i) => (d4[i] ? d4[i].r : undefined);
  const layer4 = JSON.stringify({
    modalityPreference: p4r(0), approach: p4r(1), conceptProcessing: p4r(2),
    workingEnvironment: p4r(3), pace: p4r(4),
  });

  const style = r.p5 && r.p5.style;
  const neuroProfile = style === 'Neurotypical people' ? 'Neurotypical'
    : style === 'Neurodivergent people' ? 'Neurodivergent' : 'Twice-Exceptional';
  const layer5 = JSON.stringify({
    neuroProfile,
    consent: r.p5 ? r.p5.consent : undefined,
    domains: ((r.p5 && r.p5.domains) || []).map((d) => ({ domain: d.dom, score: d.score, level: d.level })),
  });

  const p6 = r.p6 || [];
  const mind = p6.find((d) => d.dom === 'Mindset');
  const layer6 = JSON.stringify({
    mindset: mind ? mind.result : undefined,
    personality: p6.map((d) => `${d.dom}: ${d.result}`).join(' · '),
    domains: p6.map((d) => ({ domain: d.dom, score: d.score, result: d.result })),
  });

  return {
    layer1CoreType: cap(r.p1.core === 'mixed' ? 'mixed' : r.p1.core),
    layer1Strength: strength,
    layer1ArchitectScore: architectCount,
    layer1AlchemistScore: alchemistCount,
    layer2Subtype: sub ? sub[0] : (subtypeKey || null),
    layer2Description: sub ? sub[1] : null,
    layer3Result: layer3,
    layer4Result: layer4,
    layer5Result: layer5,
    layer6Result: layer6,
    layer7Result: JSON.stringify(envelope),
  };
}

/** Run an existing (req,res,next) controller with a synthetic request; returns the json it sent. */
async function invoke(handler, body, params = {}) {
  let out = null; let code = 200;
  const req = { body, params, query: {}, headers: {} };
  const res = {
    status(c) { code = c; return this; },
    json(o) { out = o; return this; },
  };
  await handler(req, res, (err) => { if (err) throw err; });
  return { code, json: out };
}

/** Strips the preview-only `example` flags before comparing results. */
function comparable(r) {
  if (!r || typeof r !== 'object') return r;
  const { example, ...rest } = r;
  return JSON.stringify(rest);
}

exports.completeAssessment = async (req, res) => {
  try {
    // STRICT auth, always (see header comment).
    const token = await verifyBearer(req);
    if (!token || !token.sub) {
      return res.status(401).json({ success: false, error: 'A valid Cognito Bearer token is required.' });
    }
    const { userId, email, name, savedAt, answers, clientResult } = req.body || {};
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ success: false, error: 'answers is required' });
    }
    if (userId && !sameUser(userId, token.sub)) {
      return res.status(403).json({ success: false, error: 'userId does not belong to the authenticated user.' });
    }
    // iOS writes the Cognito sub UPPERCASED into the quiz tables; keep the one convention.
    const uid = String(userId || token.sub).toUpperCase();

    // Server-side scoring (the reference implementation's port).
    let result;
    try {
      result = computeReport(answers);
    } catch (e) {
      console.error('❌ [EDNA v2] Scoring failed:', e.message);
      return res.status(422).json({ success: false, error: `The answers could not be scored: ${e.message}` });
    }

    if (clientResult && comparable(clientResult) !== comparable(result)) {
      console.error(`🚨 [EDNA v2] Server/client result MISMATCH for user ${uid} — investigate the port/normalisation. Storing the SERVER result.`);
    }

    const envelope = {
      ...(result.p7 && result.p7.override ? { override: result.p7.override } : {}),
      ednaV2: {
        version: 2,
        savedAt: savedAt || new Date().toISOString(),
        answers,
        result,
      },
    };

    // Reuse the existing session + results handlers so every side effect (user upsert, session
    // completion, retake window, users.type_id, edna_profiles) stays identical to the iOS path.
    const sessionResp = await invoke(quizController.createSession, {
      userId: uid, email: email || token.email || null, name: name || token.name || null,
      startedAt: envelope.ednaV2.savedAt,
    });
    if (!sessionResp.json || !sessionResp.json.success) {
      return res.status(502).json({ success: false, error: 'Could not create the assessment session.' });
    }
    const sessionId = sessionResp.json.session.id;

    const legacy = mapToLegacy(result, envelope);
    const saveResp = await invoke(quizController.saveResults, {
      userId: uid, sessionId, ...legacy,
    });
    if (!saveResp.json || !saveResp.json.success) {
      console.error('❌ [EDNA v2] saveResults failed:', saveResp.json && saveResp.json.error);
      return res.status(502).json({ success: false, error: 'The result could not be stored.' });
    }

    console.log(`✅ [EDNA v2] Stored web assessment for ${uid} (session ${sessionId})`);

    /* A GHL purchase made before this result existed is applied now (ghl_pending_purchases). */
    try {
      const buyerEmail = (email || token.email || '').trim().toLowerCase();
      if (buyerEmail) {
        const pend = await query('DELETE FROM ghl_pending_purchases WHERE email = $1 RETURNING email', [buyerEmail]);
        if (pend.rowCount > 0) {
          await query('UPDATE user_quiz_results SET full_result_purchased = true WHERE UPPER(user_id::text) = UPPER($1)', [uid]);
          /* the held £99 purchase carries its 10 decisions too, once per person */
          const has = await query(
            `SELECT 1 FROM credit_grant WHERE UPPER(user_id::text) = UPPER($1) AND source = 'purchase_99' LIMIT 1`, [uid]);
          if (!has.rows.length) {
            const credits = require('../services/di/creditService');
            await credits.grant(uid, 'purchase_99', 10);
          }
          console.log(`💳 [EDNA v2] applied held GHL purchase for ${buyerEmail}`);
        }
      }
    } catch (e) { console.warn('⚠️ [EDNA v2] pending-purchase check failed:', e.message); }

    return res.status(201).json({
      success: true,
      sessionId,
      result,
      retakeAvailableAt: saveResp.json.retakeAvailableAt
        || (saveResp.json.data && saveResp.json.data.retakeAvailableAt) || null,
    });
  } catch (error) {
    console.error('❌ [EDNA v2] complete failed:', error);
    return res.status(500).json({ success: false, error: 'Internal error storing the assessment.' });
  }
};
