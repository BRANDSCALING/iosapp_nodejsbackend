const { query } = require("../config/database");

const handleWebhook = async (req, res) => {
    try {
        const event = req.body.event;
        if (!event) {
            return res.status(400).send({ success: false, error: "Missing event data." });
        }

        const appUserId = event.app_user_id;
        const eventType = event.type;
        const entitlementId = "detailed_edna_profile"; // The entitlement that grants access

        console.log(`🔔 [RevenueCat] Received webhook event: ${eventType} for user: ${appUserId}`);

        // We only care about events that grant the specific entitlement
        if (event.entitlement_ids && event.entitlement_ids.includes(entitlementId)) {
            console.log(`✅ [RevenueCat] Entitlement '${entitlementId}' granted to user: ${appUserId}`);

            // Update the user's tier in the 'users' table to 'basic'
            const updateUserTierResult = await query(
                `UPDATE users SET tier = 'basic', updated_at = NOW() WHERE id = $1`,
                [appUserId]
            );

            if (updateUserTierResult.rowCount > 0) {
                console.log(`💾 [DB] User ${appUserId} tier updated to 'basic'.`);
            } else {
                console.warn(`⚠️ [DB] User with ID ${appUserId} not found in 'users' table for tier update.`);
            }

            // Also update the 'user_quiz_results' table for consistency
            const updateQuizResult = await query(
                `UPDATE user_quiz_results SET full_result_purchased = true WHERE user_id = $1`,
                [appUserId]
            );

            if (updateQuizResult.rowCount > 0) {
                console.log(`💾 [DB] user_quiz_results.full_result_purchased set for user ${appUserId}.`);
            }

        } else {
            console.log(`ℹ️ [RevenueCat] Event ${eventType} did not contain the '${entitlementId}' entitlement. No action taken.`);
        }

        res.status(200).send({ success: true });
    } catch (error) {
        console.error("❌ [RevenueCat] Webhook processing error:", error);
        res.status(500).send({ success: false, error: "Webhook processing failed" });
    }
};

module.exports = { handleWebhook };
