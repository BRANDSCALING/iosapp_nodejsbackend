const jwt = require('jsonwebtoken');

/**
 * Standard user authentication for API routes (Cognito Bearer + fallbacks).
 * Sets req.userId when successful.
 */
function authenticateUser(req, res, next) {
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
