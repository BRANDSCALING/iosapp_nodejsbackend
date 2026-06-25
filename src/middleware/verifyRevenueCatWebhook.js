const crypto = require("crypto");

/**
 * Verifies RevenueCat webhook requests.
 *
 * RevenueCat webhook auth is a simple shared secret — NOT an HMAC signature.
 * In the RevenueCat dashboard (Integrations → Webhooks) you set an
 * "Authorization header value"; RevenueCat then sends that value verbatim as the
 * `Authorization` HTTP header on every webhook POST. We compare that header to
 * our shared secret using a constant-time comparison.
 *
 * Set the SAME string in BOTH places:
 *   • RevenueCat dashboard → Webhooks → "Authorization header value"
 *   • REVENUECAT_WEBHOOK_SECRET env var (AWS App Runner)
 */
const verifyRevenueCatWebhook = (req, res, next) => {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!secret) {
        console.error("❌ [RevenueCat] Webhook secret is not configured (REVENUECAT_WEBHOOK_SECRET).");
        return res.status(500).send("Webhook secret not configured.");
    }

    const provided = req.headers["authorization"];
    if (!provided) {
        console.warn("⚠️ [RevenueCat] Webhook received without an Authorization header.");
        return res.status(401).send("Authorization header missing.");
    }

    // Constant-time comparison. Hash both sides first so timingSafeEqual always
    // receives equal-length buffers (it throws on length mismatch) and the secret
    // length isn't leaked via timing.
    const providedHash = crypto.createHash("sha256").update(provided).digest();
    const expectedHash = crypto.createHash("sha256").update(secret).digest();

    if (!crypto.timingSafeEqual(providedHash, expectedHash)) {
        console.error("❌ [RevenueCat] Webhook Authorization header did not match the configured secret.");
        return res.status(403).send("Invalid authorization.");
    }

    next();
};

module.exports = verifyRevenueCatWebhook;
