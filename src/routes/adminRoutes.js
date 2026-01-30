/**
 * Admin Routes
 * Protected routes for admin portal functionality
 * All routes require admin authentication
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminWorkbookController = require('../controllers/adminWorkbookController');
const adminAuth = require('../middleware/adminAuth');

// ============================================
// All admin routes require authentication
// ============================================
router.use(adminAuth);

// ============================================
// Dashboard
// ============================================

// Get dashboard statistics
router.get('/stats', adminController.getStats);

// ============================================
// User Management
// ============================================

// Get all users (with pagination and filtering)
router.get('/users', adminController.getUsers);

// Get user details
router.get('/users/:id', adminController.getUserDetails);

// Get user E-DNA profile
router.get('/users/:id/edna', adminController.getUserEdnaProfile);

// Get user workbooks
router.get('/users/:id/workbooks', adminController.getUserWorkbooks);

// Get user full quiz results with answers
router.get('/users/:id/quiz-results', adminController.getUserQuizResults);

// Update user tier
router.put('/users/:id/tier', adminController.updateUserTier);

// ============================================
// Workbook Management
// ============================================

// Get all workbooks
router.get('/workbooks', adminController.getWorkbooks);

// Upload/Create a new workbook
router.post('/workbooks/upload', adminController.uploadWorkbook);

// Delete a workbook
router.delete('/workbooks/:id', adminController.deleteWorkbook);

// ============================================
// Workbook Progress Monitoring (Admin)
// ============================================

// Get all users' workbook progress overview
// GET /api/admin/workbooks/progress?limit=50&offset=0&completed=true
router.get('/workbooks/progress', adminWorkbookController.getAllUsersProgress);

// Get specific user's detailed workbook progress
// GET /api/admin/users/:userId/workbooks/progress
router.get('/users/:userId/workbooks/progress', adminWorkbookController.getUserWorkbooksProgress);

// Get workbook instance details with all answers
// GET /api/admin/workbooks/instances/:instanceId
router.get('/workbooks/instances/:instanceId', adminWorkbookController.getWorkbookInstanceDetails);

// Get complete workbook structure with user's progress and answers
// GET /api/admin/users/:userId/workbooks/:workbookId/full
router.get('/users/:userId/workbooks/:workbookId/full', adminWorkbookController.getFullWorkbookWithUserData);

module.exports = router;

