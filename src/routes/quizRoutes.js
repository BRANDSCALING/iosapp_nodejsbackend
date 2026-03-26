/**
 * Quiz Routes - ENHANCED VERSION
 * 
 * Endpoints:
 * - GET  /questions                   - Get quiz questions for a layer
 * - POST /session                     - Create a new quiz session
 * - POST /progress                    - Save quiz progress (single answer)
 * - GET  /progress/:userId            - Get user's quiz progress (handles both userId and sessionId)
 * - GET  /progress/session/:sessionId - Get quiz progress by session ID
 * - POST /sync                        - Sync multiple offline answers
 * - POST /results                     - Save quiz results
 * - GET  /results/:userId             - Get user's quiz results
 * - GET  /retake-check/:userId        - Check if user can retake the quiz
 * - GET  /status/:userId              - Get quiz status and in-progress session
 * - GET  /layer-intro/:layer          - Get layer introduction content
 * - GET  /user-answers/:userId        - Get user's complete answer history
 */

const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { body, param, query } = require('express-validator');

// ============================================
// Validation Middleware
// ============================================

// NOTE: Step 1 requires layer to be REQUIRED for /questions
const validateLayerRequired = query('layer')
  .notEmpty()
  .withMessage('Layer number is required')
  .isInt({ min: 1, max: 7 })
  .withMessage('Layer must be between 1 and 7');

const validateUserId = param('userId')
  .notEmpty()
  .withMessage('User ID is required')
  .isString()
  .withMessage('User ID must be a string');

const validateSessionCreate = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('name').optional().isString().withMessage('Name must be a string'),
  body('startedAt').optional().isISO8601().withMessage('Invalid date format')
];

const validateProgressSave = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('questionId').isUUID().withMessage('Question ID must be a valid UUID'),
  body('selectedOptionId').isUUID().withMessage('Selected option ID must be a valid UUID'),
  body('layerNumber').isInt({ min: 1, max: 7 }).withMessage('Layer number must be between 1 and 7'),
  body('answeredAt').optional().isISO8601().withMessage('Invalid date format')
];

const validateSync = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('pendingAnswers').isArray().withMessage('Pending answers must be an array')
];

const validateResultsSave = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  // Make layer1 fields more flexible - accept various formats from iOS
  body('layer1CoreType')
    .optional()
    .isString()
    .withMessage('Layer 1 core type must be a string'),
  body('layer1Strength')
    .optional()
    .isString()
    .withMessage('Layer 1 strength must be a string'),
  body('layer1ArchitectScore')
    .optional()
    .isNumeric()
    .withMessage('Architect score must be a number'),
  body('layer1AlchemistScore')
    .optional()
    .isNumeric()
    .withMessage('Alchemist score must be a number')
];

// ============================================
// Routes
// ============================================

// Get questions for a layer (NEW / REQUIRED layer) — placed before all other routes
router.get('/questions', validateLayerRequired, quizController.getQuestions);

/**
 * POST /api/v1/quiz/session
 * Create a new quiz session
 * Body: { userId, startedAt }
 */
router.post('/session', validateSessionCreate, quizController.createSession);

/**
 * POST /api/v1/quiz/progress
 * Save quiz progress (single answer)
 * Body: { userId, sessionId, questionId, selectedOptionId, layerNumber, answeredAt }
 */
router.post('/progress', validateProgressSave, quizController.saveProgress);

/**
 * GET /api/v1/quiz/progress/:userId
 * Get user's quiz progress (by userId - finds latest session)
 */
router.get('/progress/:userId', validateUserId, quizController.getProgress);

/**
 * GET /api/v1/quiz/progress/session/:sessionId
 * Get quiz progress for a specific session (by sessionId)
 * Used by iOS to resume quiz from where user left off
 */
router.get('/progress/session/:sessionId', quizController.getProgressBySession);

/**
 * POST /api/v1/quiz/sync
 * Sync multiple offline answers
 * Body: { userId, sessionId, answers: [...] }
 */
router.post('/sync', validateSync, quizController.syncAnswers);

/**
 * POST /api/v1/quiz/results
 * Save quiz results
 * Body: { userId, sessionId, layer1CoreType, layer1Strength, ... }
 */
router.post('/results', validateResultsSave, quizController.saveResults);

/**
 * GET /api/v1/quiz/results/:userId
 * Get user's quiz results
 */
router.get('/results/:userId', validateUserId, quizController.getResults);

/**
 * GET /api/v1/quiz/retake-check/:userId
 * Check if user can retake the quiz (7-day restriction)
 */
router.get('/retake-check/:userId', validateUserId, quizController.checkRetake);

/**
 * GET /api/v1/quiz/status/:userId
 * Get quiz status and in-progress session for a user
 * Used by iOS to determine if user should resume quiz or start fresh
 */
router.get('/status/:userId', validateUserId, quizController.getQuizStatus);

/**
 * GET /api/v1/quiz/layer-intro/:layer
 * Get layer introduction content
 */
router.get(
  '/layer-intro/:layer',
  param('layer').isInt({ min: 1, max: 7 }).withMessage('Layer must be between 1 and 7'),
  quizController.getLayerIntro
);

/**
 * NEW ENDPOINT: GET /api/v1/quiz/user-answers/:userId
 * Get user's complete answer history with question details
 * Query params: sessionId (optional) - filter by specific session
 */
router.get(
  '/user-answers/:userId',
  validateUserId,
  query('sessionId').optional().isUUID().withMessage('Session ID must be a valid UUID'),
  quizController.getUserAnswerHistory
);

module.exports = router;





// /**
//  * Quiz Routes - ENHANCED VERSION
//  * Added: GET /api/v1/quiz/user-answers/:userId endpoint
//  * 
//  * INSTRUCTIONS:
//  * 1. Copy this file to: brandscaling-nodejs-backend/src/routes/quizRoutes.js
//  * 2. Or add just the new route (user-answers) to your existing file
//  */

// const express = require('express');
// const router = express.Router();
// const quizController = require('../controllers/quizController');
// const { body, param, query } = require('express-validator');

// // ============================================
// // Validation Middleware
// // ============================================

// const validateLayer = query('layer')
//   .optional()
//   .isInt({ min: 1, max: 7 })
//   .withMessage('Layer must be between 1 and 7');

// const validateUserId = param('userId')
//   .notEmpty()
//   .withMessage('User ID is required')
//   .isString()
//   .withMessage('User ID must be a string');

// const validateSessionCreate = [
//   body('userId').notEmpty().withMessage('User ID is required'),
//   body('startedAt').optional().isISO8601().withMessage('Invalid date format')
// ];

// const validateProgressSave = [
//   body('userId').notEmpty().withMessage('User ID is required'),
//   body('sessionId').notEmpty().withMessage('Session ID is required'),
//   body('questionId').isUUID().withMessage('Question ID must be a valid UUID'),
//   body('selectedOptionId').isUUID().withMessage('Selected option ID must be a valid UUID'),
//   body('layerNumber').isInt({ min: 1, max: 7 }).withMessage('Layer number must be between 1 and 7'),
//   body('answeredAt').optional().isISO8601().withMessage('Invalid date format')
// ];

// const validateSync = [
//   body('userId').notEmpty().withMessage('User ID is required'),
//   body('sessionId').notEmpty().withMessage('Session ID is required'),
//   body('answers').isArray().withMessage('Answers must be an array'),
//   body('answers.*.questionId').isInt().withMessage('Question ID must be an integer'),
//   body('answers.*.selectedOptionId').isInt().withMessage('Selected option ID must be an integer'),
//   body('answers.*.layerNumber').isInt({ min: 1, max: 7 }).withMessage('Layer number must be between 1 and 7')
// ];

// const validateResultsSave = [
//   body('userId').notEmpty().withMessage('User ID is required'),
//   body('sessionId').notEmpty().withMessage('Session ID is required'),
//   body('layer1CoreType').notEmpty().withMessage('Layer 1 core type is required'),
//   body('layer1Strength').notEmpty().withMessage('Layer 1 strength is required'),
//   body('layer1ArchitectScore').isInt().withMessage('Architect score must be an integer'),
//   body('layer1AlchemistScore').isInt().withMessage('Alchemist score must be an integer')
// ];

// // ============================================
// // Routes
// // ============================================

// /**
//  * GET /api/v1/quiz/questions
//  * Get quiz questions
//  * Query params: layer (optional, 1-7), type (optional)
//  */
// router.get('/questions', validateLayer, quizController.getQuestions);

// /**
//  * POST /api/v1/quiz/session
//  * Create a new quiz session
//  * Body: { userId, startedAt }
//  */
// router.post('/session', validateSessionCreate, quizController.createSession);

// /**
//  * POST /api/v1/quiz/progress
//  * Save quiz progress (single answer)
//  * Body: { userId, sessionId, questionId, selectedOptionId, layerNumber, answeredAt }
//  */
// router.post('/progress', validateProgressSave, quizController.saveProgress);

// /**
//  * GET /api/v1/quiz/progress/:userId
//  * Get user's quiz progress
//  */
// router.get('/progress/:userId', validateUserId, quizController.getProgress);

// /**
//  * POST /api/v1/quiz/sync
//  * Sync multiple offline answers
//  * Body: { userId, sessionId, answers: [...] }
//  */
// router.post('/sync', validateSync, quizController.syncAnswers);

// /**
//  * POST /api/v1/quiz/results
//  * Save quiz results
//  * Body: { userId, sessionId, layer1CoreType, layer1Strength, ... }
//  */
// router.post('/results', validateResultsSave, quizController.saveResults);

// /**
//  * GET /api/v1/quiz/results/:userId
//  * Get user's quiz results
//  */
// router.get('/results/:userId', validateUserId, quizController.getResults);

// /**
//  * GET /api/v1/quiz/retake-check/:userId
//  * Check if user can retake the quiz (7-day restriction)
//  */
// router.get('/retake-check/:userId', validateUserId, quizController.checkRetake);

// /**
//  * GET /api/v1/quiz/layer-intro/:layer
//  * Get layer introduction content
//  */
// router.get('/layer-intro/:layer', 
//   param('layer').isInt({ min: 1, max: 7 }).withMessage('Layer must be between 1 and 7'),
//   quizController.getLayerIntro
// );

// /**
//  * NEW ENDPOINT: GET /api/v1/quiz/user-answers/:userId
//  * Get user's complete answer history with question details
//  * Query params: sessionId (optional) - filter by specific session
//  * 
//  * Returns:
//  * - All user answers with question text
//  * - Selected options with descriptions
//  * - Grouped by layer
//  * - Perfect for dashboard display
//  */
// router.get('/user-answers/:userId', 
//   validateUserId,
//   query('sessionId').optional().isUUID().withMessage('Session ID must be a valid UUID'),
//   quizController.getUserAnswerHistory
// );

// module.exports = router;
