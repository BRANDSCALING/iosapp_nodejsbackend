/**
 * Real Cognito JWT verification (signature + expiry against the user pool's JWKS).
 *
 * Added 17 Nov 2026 for the website build: until now every middleware only jwt.decode()d the
 * token (no signature check) and fell back to a client-supplied x-user-id header. That was
 * tolerable while only the iOS app called this API; it is not once browsers do.
 *
 * AUTH_MODE env controls enforcement so the iOS app (v1.3/v1.4 in the field) keeps working:
 *   - 'legacy'  (default): behaviour is unchanged — but when a Bearer token is present we TRY
 *     to verify it and log the outcome. Verified requests get req.authVerified = true.
 *   - 'verify': a verified token is REQUIRED on routes that use these helpers; x-user-id and
 *     ?userId fallbacks are ignored for identity. Flip this only after confirming the iOS app's
 *     tokens verify in production logs (they should — the app sends its Cognito ID token).
 *
 * The iOS app sends the Cognito ID token; the website may send ID or access tokens, so both
 * token uses are accepted. COGNITO_CLIENT_IDS (comma-separated) pins the allowed app clients;
 * unset, any client of the pool is accepted.
 */
const { CognitoJwtVerifier } = require('aws-jwt-verify');

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_IDS = process.env.COGNITO_CLIENT_IDS
  ? process.env.COGNITO_CLIENT_IDS.split(',').map((s) => s.trim()).filter(Boolean)
  : null; // null = accept any client of this pool (must be explicit for aws-jwt-verify)

let idVerifier = null;
let accessVerifier = null;
if (USER_POOL_ID) {
  idVerifier = CognitoJwtVerifier.create({
    userPoolId: USER_POOL_ID,
    tokenUse: 'id',
    clientId: CLIENT_IDS || null,
  });
  accessVerifier = CognitoJwtVerifier.create({
    userPoolId: USER_POOL_ID,
    tokenUse: 'access',
    clientId: CLIENT_IDS || null,
  });
} else {
  console.warn('⚠️ [Auth] COGNITO_USER_POOL_ID is not set — token verification disabled, legacy decode only.');
}

function getAuthMode() {
  return process.env.AUTH_MODE === 'verify' ? 'verify' : 'legacy';
}

function extractBearer(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (h && typeof h === 'string' && h.startsWith('Bearer ')) {
    return h.replace(/^\s*Bearer\s+/i, '').trim();
  }
  return null;
}

/**
 * Verify the request's Bearer token against the user pool. Returns the token payload
 * (with .sub) on success, or null when there is no token / verification fails / the
 * verifier is unavailable. Never throws.
 */
async function verifyBearer(req) {
  const token = extractBearer(req);
  if (!token || !idVerifier) return null;
  try {
    return await idVerifier.verify(token);
  } catch (_) {
    try {
      return await accessVerifier.verify(token);
    } catch (err) {
      console.warn(`⚠️ [Auth] Bearer token failed verification: ${err.message}`);
      return null;
    }
  }
}

/**
 * Attach-only middleware: verifies the Bearer token when present and sets
 * req.authVerified / req.verifiedSub / req.tokenPayload. Never rejects —
 * route-level auth decides what to do with the result.
 */
async function attachVerifiedAuth(req, _res, next) {
  const payload = await verifyBearer(req);
  if (payload && payload.sub) {
    req.authVerified = true;
    req.verifiedSub = payload.sub;
    req.tokenPayload = payload;
  }
  next();
}

/** Case-insensitive user-id equality (Cognito subs arrive upper- or lowercased). */
function sameUser(a, b) {
  return (
    typeof a === 'string' && typeof b === 'string' &&
    a.trim().toLowerCase() === b.trim().toLowerCase()
  );
}

/**
 * User-scoped auth for routes that carry a userId (body, params or query), e.g. the quiz routes,
 * which historically had NO auth at all — the userId in the request was trusted blindly.
 *
 * - legacy mode: never rejects (identical behaviour for deployed iOS builds). When a verified
 *   token IS present and contradicts the supplied userId, it logs the mismatch.
 * - verify mode: requires a verified token, and when the request names a userId it must match
 *   the token's sub (case-insensitive — iOS uppercases the Cognito sub, the web will not).
 */
async function userScopedAuth(req, res, next) {
  const payload = await verifyBearer(req);
  if (payload && payload.sub) {
    req.authVerified = true;
    req.verifiedSub = payload.sub;
  }

  const suppliedId = req.body?.userId || req.params?.userId || req.query?.userId;

  if (getAuthMode() === 'verify') {
    if (!req.authVerified) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Provide a valid Cognito Bearer token.',
      });
    }
    if (suppliedId && !sameUser(suppliedId, req.verifiedSub)) {
      return res.status(403).json({
        success: false,
        error: 'The userId in this request does not belong to the authenticated user.',
      });
    }
  } else if (req.authVerified && suppliedId && !sameUser(suppliedId, req.verifiedSub)) {
    console.warn(
      `⚠️ [Auth] userId mismatch on ${req.method} ${req.originalUrl}: token sub differs from supplied userId (legacy mode, allowed).`
    );
  }

  next();
}

module.exports = { getAuthMode, verifyBearer, attachVerifiedAuth, sameUser, userScopedAuth };
