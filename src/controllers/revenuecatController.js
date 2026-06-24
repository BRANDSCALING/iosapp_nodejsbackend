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

            // NOTE: This is the £9.99 one-time "Full Detailed Report" purchase — a NON-CONSUMABLE
            // unlock, NOT a subscription. It must ONLY set full_result_purchased; it must NOT grant
            // the 'basic' subscription tier (that's sold separately on the website). Setting tier here
            // would unintentionally unlock tier-gated content the user didn't pay for. The previous
            // `UPDATE users SET tier = 'basic'` was intentionally removed for this reason.
            //
            // appUserId is the RevenueCat app user id, which the iOS app sets to the user's UPPERCASED
            // cognito id — the same value stored in user_quiz_results.user_id — so this match works.
            const updateQuizResult = await query(
                `UPDATE user_quiz_results SET full_result_purchased = true WHERE user_id = $1`,
                [appUserId]
            );

            if (updateQuizResult.rowCount > 0) {
                console.log(`💾 [DB] user_quiz_results.full_result_purchased set for user ${appUserId}.`);
            } else {
                console.warn(`⚠️ [DB] No user_quiz_results row found for user_id ${appUserId} (report unlock not persisted).`);
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
