/**
 * Zoom Recordings — user-facing read-only routes.
 * Mounted at /api/v1/zoom (see server.js). Consumed by the iOS app.
 *
 * Auth: authenticateUser (Bearer token -> sub, with x-user-id fallback),
 * same middleware style as the other authenticated user reads.
 */

const express = require('express');
const router = express.Router();
const zoomController = require('../controllers/zoomController');
const { authenticateUser } = require('../middleware/authMiddleware');

router.use(authenticateUser);

// GET /api/v1/zoom/categories
router.get('/categories', zoomController.getCategories);

// GET /api/v1/zoom/folders?category=deal_clinic
router.get('/folders', zoomController.getFolders);

// GET /api/v1/zoom/folders/:id
router.get('/folders/:id', zoomController.getFolderById);

// GET /api/v1/zoom/recordings/:id
router.get('/recordings/:id', zoomController.getRecordingById);

module.exports = router;
