/**
 * Agent Authentication Routes
 * Public routes for agent login/logout
 */

const express = require('express');
const router = express.Router();
const agentAuthController = require('../controllers/agentAuthController');
const { verifyAgentToken } = require('../middleware/agentAuth');

// ============================================
// Public routes (no authentication required)
// ============================================

// Agent login
router.post('/login', agentAuthController.login);

// Refresh token
router.post('/refresh', agentAuthController.refreshToken);

// ============================================
// Protected routes (authentication required)
// ============================================

// Logout
router.post('/logout', verifyAgentToken, agentAuthController.logout);

// Get current agent info
router.get('/me', verifyAgentToken, agentAuthController.me);

module.exports = router;


