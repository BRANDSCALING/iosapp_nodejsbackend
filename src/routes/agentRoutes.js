/**
 * Agent Routes
 * Endpoints for AI agent portal
 * Used by Rubab's agent system to access user data
 * 
 * All routes require JWT authentication (except as noted)
 */

const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { verifyAgentToken } = require('../middleware/agentAuth');

// ============================================
// All agent routes require authentication
// ============================================
router.use(verifyAgentToken);

// ============================================
// User Management
// ============================================

// Get all users with pagination and search
// GET /api/agent/users?page=1&limit=50&search=<text>
router.get('/users', agentController.getAllUsers);

// Get user by email (must be before :userId to avoid conflict)
// GET /api/agent/users/by-email/:email
router.get('/users/by-email/:email', agentController.getUserByEmail);

// Get user by ID
// GET /api/agent/users/:userId
router.get('/users/:userId', agentController.getUserById);

// Get user E-DNA profile
// GET /api/agent/users/:userId/profile
router.get('/users/:userId/profile', agentController.getUserProfile);

// Get user workbooks with answers
// GET /api/agent/users/:userId/workbooks
router.get('/users/:userId/workbooks', agentController.getUserWorkbooks);

// Get user quiz history (summary)
// GET /api/agent/users/:userId/quiz-history
router.get('/users/:userId/quiz-history', agentController.getUserQuizHistory);

// Get complete quiz results with all 7 layers
// GET /api/agent/users/:userId/quiz-results
router.get('/users/:userId/quiz-results', agentController.getCompleteQuizResults);

// Get user's sessions
// GET /api/agent/users/:userId/sessions?active=true&limit=20
router.get('/users/:userId/sessions', agentController.getUserSessions);

// ============================================
// Session Management
// ============================================

// Create a new session
// POST /api/agent/sessions
router.post('/sessions', agentController.createSession);

// Get session details
// GET /api/agent/sessions/:sessionId
router.get('/sessions/:sessionId', agentController.getSession);

// Update session
// PATCH /api/agent/sessions/:sessionId
router.patch('/sessions/:sessionId', agentController.updateSession);

// Delete session
// DELETE /api/agent/sessions/:sessionId
router.delete('/sessions/:sessionId', agentController.deleteSession);

// ============================================
// Message Management
// ============================================

// Get messages in a session
// GET /api/agent/sessions/:sessionId/messages?limit=100&offset=0
router.get('/sessions/:sessionId/messages', agentController.getMessages);

// Create a message
// POST /api/agent/sessions/:sessionId/messages
router.post('/sessions/:sessionId/messages', agentController.createMessage);

// Get last message in a session
// GET /api/agent/sessions/:sessionId/messages/last
router.get('/sessions/:sessionId/messages/last', agentController.getLastMessage);

// Get message count in a session
// GET /api/agent/sessions/:sessionId/messages/count
router.get('/sessions/:sessionId/messages/count', agentController.getMessageCount);

module.exports = router;
