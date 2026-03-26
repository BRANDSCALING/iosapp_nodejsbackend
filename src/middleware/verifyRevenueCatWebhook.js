const crypto = require("crypto");

const verifyRevenueCatWebhook = (req, res, next) => {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!secret) {
        console.error("❌ [RevenueCat] Webhook secret is not configured.");
        return res.status(500).send("Webhook secret not configured.");
    }

    const providedSignature = req.headers["x-revenuecat-signature"];
    if (!providedSignature) {
        console.warn("⚠️ [RevenueCat] Webhook received without signature.");
        return res.status(400).send("Signature missing.");
    }

    try {
        const [timestamp, hash] = providedSignature.split(",");
        const time = timestamp.split("=")[1];
        const signature = hash.split("=")[1];

        const payload = `${time}.${JSON.stringify(req.body)}`;

        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(payload)
            .digest("hex");

        if (signature !== expectedSignature) {
            console.error("❌ [RevenueCat] Webhook signature mismatch.");
            return res.status(403).send("Invalid signature.");
        }

    } catch (error) {
        console.error("❌ [RevenueCat] Error verifying webhook signature:", error);
        return res.status(400).send("Signature verification failed.");
    }

    next();
};

module.exports = verifyRevenueCatWebhook;
