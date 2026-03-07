/**
 * Admin Authentication Routes
 * Public and protected routes for admin authentication
 */

const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { adminAuth } = require('../middleware/adminAuth');

// ============================================
// Public routes (no authentication required)
// ============================================

// Admin login
router.post('/login', adminAuthController.login);

// ============================================
// Protected routes (authentication required)
// ============================================

// Get current admin info
router.get('/me', adminAuth, adminAuthController.me);

// Refresh token
router.post('/refresh', adminAuth, adminAuthController.refreshToken);

// Change password
router.post('/change-password', adminAuth, adminAuthController.changePassword);

// Logout
router.post('/logout', adminAuth, adminAuthController.logout);

module.exports = router;


