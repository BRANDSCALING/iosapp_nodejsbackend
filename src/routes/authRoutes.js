const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// GET /api/v1/auth/password-reset-eligibility?email=user@example.com
router.get("/password-reset-eligibility", authController.checkPasswordResetEligibility);

module.exports = router;
