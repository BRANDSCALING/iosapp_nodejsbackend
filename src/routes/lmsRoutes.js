/**
 * LMS Routes (UCWS)
 * For the iOS app to fetch programs, content, and record lesson progress.
 * POST /lessons/:lessonId/complete uses isAdminOrUcws (Cognito + admin tokens).
 * Other routes use requireAuth (x-user-id or query).
 */

const express = require('express');
const router = express.Router();
const lmsController = require('../controllers/lmsController');
const { isAdminOrUcws } = require('../middleware/adminAuth');

/**
 * User auth: same pattern as workbooks
 * Expects userId in: req.user.id (JWT), req.headers['x-user-id'], or req.query.userId
 */
const requireAuth = (req, res, next) => {
  const userId = req.user?.id || req.userId || req.headers['x-user-id'] || req.query.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Provide userId via x-user-id header or userId query param.',
    });
  }

  req.userId = userId;
  next();
};

// POST lesson complete: use isAdminOrUcws so iOS (Cognito) and admin portal tokens both work
router.post('/lessons/:lessonId/complete', isAdminOrUcws, lmsController.markLessonComplete);

router.use(requireAuth);

// Get all programs for the logged-in user
// GET /api/user/lms/programs
router.get('/programs', lmsController.getPrograms);

// Get the full content structure of a single program
// GET /api/user/lms/programs/:programId
router.get('/programs/:programId', lmsController.getProgramContent);

module.exports = router;
