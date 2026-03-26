const express = require("express");
const router = express.Router();
const { handleWebhook } = require("../controllers/revenuecatController");
const verifyRevenueCatWebhook = require("../middleware/verifyRevenueCatWebhook");

// POST /api/v1/webhooks/revenuecat
// This single, secure endpoint will handle all purchase-related events from RevenueCat.
router.post("/revenuecat", verifyRevenueCatWebhook, handleWebhook);

module.exports = router;
