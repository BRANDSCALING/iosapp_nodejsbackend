/**
 * Admin Routes
 * GET /lms/programs and related UCWS read routes use isAdminOrUcws; all other routes use adminAuth (admin only).
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminWorkbookController = require('../controllers/adminWorkbookController');
const lmsController = require('../controllers/lmsController');
const { adminAuth, isAdminOrUcws } = require('../middleware/adminAuth');

// ============================================
// Dashboard
// ============================================

router.get('/stats', adminAuth, adminController.getStats);

// ============================================
// User Management
// ============================================

router.get('/users', adminAuth, adminController.getUsers);
router.get('/users/:id', adminAuth, adminController.getUserDetails);
router.delete('/users/:id', adminAuth, adminController.deleteUser);
router.get('/users/:id/edna', adminAuth, adminController.getUserEdnaProfile);
router.get('/users/:id/workbooks', adminAuth, adminController.getUserWorkbooks);
router.get('/users/:id/quiz-results', adminAuth, adminController.getUserQuizResults);
router.put('/users/:id/tier', adminAuth, adminController.updateUserTier);

// ============================================
// Workbook Management
// ============================================

router.get('/workbooks', adminAuth, adminController.getWorkbooks);
router.post('/workbooks/upload', adminAuth, adminController.uploadWorkbook);
router.put('/workbooks/:id', adminAuth, adminController.updateWorkbook);
router.delete('/workbooks/:id', adminAuth, adminController.deleteWorkbook);

// ============================================
// Workbook Progress Monitoring (Admin)
// ============================================

router.get('/workbooks/progress', adminAuth, adminWorkbookController.getAllUsersProgress);
router.get('/users/:userId/workbooks/progress', adminAuth, adminWorkbookController.getUserWorkbooksProgress);
router.get('/workbooks/instances/:instanceId', adminAuth, adminWorkbookController.getWorkbookInstanceDetails);
router.get('/users/:userId/workbooks/:workbookId/full', adminAuth, adminWorkbookController.getFullWorkbookWithUserData);

// ============================================
// UCWS Content Management
// ============================================

router.get('/lms/programs', isAdminOrUcws, adminController.getPrograms);
router.post('/lms/programs', adminAuth, adminController.createProgram);

router.get('/lms/programs/:programId/modules', isAdminOrUcws, adminController.getModules);
router.get('/lms/modules', adminAuth, adminController.getModules);
router.post('/lms/modules', adminAuth, adminController.createModule);

router.get('/lms/modules/:moduleId/lessons', isAdminOrUcws, adminController.getLessons);
router.get('/lms/lessons', adminAuth, adminController.getLessons);
router.post('/lms/lessons', adminAuth, adminController.createLesson);

router.get('/lms/lessons/:lessonId/content-items', isAdminOrUcws, adminController.getContentItems);
router.get('/lms/content-items', adminAuth, adminController.getContentItems);
router.post('/lms/content-items', adminAuth, adminController.createContentItem);

router.post('/lms/lessons/:lessonId/complete', isAdminOrUcws, lmsController.markLessonComplete);

router.post('/lms/users/ucws', adminAuth, adminController.createUcwsUser);

module.exports = router;
