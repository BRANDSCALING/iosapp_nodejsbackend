const jwt = require('jsonwebtoken');
const { getAuthMode, verifyBearer } = require('./cognitoVerify');

/**
 * Standard user authentication for API routes (Cognito Bearer + fallbacks).
 * Sets req.userId when successful.
 *
 * 17 Nov 2026: tokens are now REALLY verified (signature + expiry, see cognitoVerify.js).
 * AUTH_MODE=legacy (default) keeps the old decode/x-user-id fallbacks so deployed iOS builds
 * keep working; AUTH_MODE=verify requires a verified token and ignores the fallbacks.
 */
async function authenticateUser(req, res, next) {
  // 1. Verified Cognito token (signature checked against the pool's JWKS)
  const payload = await verifyBearer(req);
  if (payload && payload.sub) {
    req.userId = payload.sub;
    req.authVerified = true;
    return next();
  }

  if (getAuthMode() === 'verify') {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Provide a valid Cognito Bearer token.',
    });
  }

  // 2. LEGACY fallbacks (AUTH_MODE=legacy only) — decode without verification, then
  // client-supplied ids. Kept so iOS builds in the field keep working during the transition.
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace(/^\s*Bearer\s+/i, '').trim();
    const decoded = jwt.decode(token);
    if (decoded && decoded.sub) {
      req.userId = decoded.sub;
      return next();
    }
  }

  const userId = req.user?.id || req.userId || req.headers['x-user-id'] || req.query.userId;
  if (userId) {
    req.userId = userId;
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Authentication required. Provide Bearer token, x-user-id header, or userId query param.',
  });
}

module.exports = { authenticateUser };
