/**
 * Rate Limiter Middleware
 * Prevents API abuse
 *
 * 25 Nov 2026 (Munawar): App Runner sits in front of Express, and with 'trust proxy' off
 * req.ip is the proxy's address, so every member shared ONE allowance (500 per 15 minutes):
 * a busy hour, or one person's heavy use, answered everyone with 429 "Too many requests"
 * (logged as ERR_ERL_UNEXPECTED_X_FORWARDED_FOR). The key is now the visitor's own
 * address: the LAST entry of X-Forwarded-For, the one App Runner's proxy appends (earlier
 * entries come from the client and can be forged). The ceiling is per visitor, set by
 * RATE_LIMIT_MAX_PER_IP (default 2000 per window), since an office or event Wi-Fi puts many
 * members behind one address.
 */

const rateLimit = require('express-rate-limit');

function clientIp(req) {
  const xff = String(req.headers['x-forwarded-for'] || '');
  const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : (req.ip || req.socket.remoteAddress || 'unknown');
}

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_PER_IP || '2000'),
  keyGenerator: clientIp,
  validate: { xForwardedForHeader: false, trustProxy: false },
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

module.exports = limiter;
