/**
 * BrandScaling E-DNA Quiz Backend API
 * Main Server Entry Point
 */

// Load environment variables FIRST with explicit path
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const { healthCheck } = require('./config/database');
const quizRoutes = require('./routes/quizRoutes');
const workbooksRoutes = require('./routes/workbooks');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminRoutes = require('./routes/adminRoutes');
const agentAuthRoutes = require('./routes/agentAuthRoutes');
const agentRoutes = require('./routes/agentRoutes');
const userRoutes = require('./routes/userRoutes');
const lmsRoutes = require('./routes/lmsRoutes');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

// ============================================
// Middleware
// ============================================

// Security
app.use(helmet());

// CORS - Allow iOS app to connect
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsing (increased limit for workbook uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting
app.use(rateLimiter);

// ============================================
// Routes
// ============================================

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: dbHealth
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// API info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'BrandScaling E-DNA Quiz API',
    version: API_VERSION,
    status: 'running',
    endpoints: {
      health: '/health',
      quiz: `/api/${API_VERSION}/quiz`,
      userProfile: '/api/user/sync-profile',
      workbooks: '/api/user/workbooks',
      lms: `/api/${API_VERSION}/lms`,
      adminAuth: '/api/admin/auth',
      admin: '/api/admin',
      agentAuth: '/api/agent/auth',
      agent: '/api/agent',
      docs: '/api/docs'
    }
  });
});

// API Routes
app.use(`/api/${API_VERSION}/quiz`, quizRoutes);
app.use('/api/user/workbooks', workbooksRoutes);
app.use(`/api/${API_VERSION}/lms`, lmsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/users', userRoutes);

// Admin Routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);

// Agent Routes (for AI agent portal)
app.use('/api/agent/auth', agentAuthRoutes);
app.use('/api/agent', agentRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error Handler (must be last)
app.use(errorHandler);

// ============================================
// Start Server
// ============================================

const server = app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ============================================');
  console.log('   BrandScaling E-DNA Quiz Backend API');
  console.log('   ============================================');
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Port: ${PORT}`);
  console.log(`   API Version: ${API_VERSION}`);
  console.log(`   Base URL: http://localhost:${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`   Quiz API: http://localhost:${PORT}/api/${API_VERSION}/quiz`);
  console.log(`   Workbooks API: http://localhost:${PORT}/api/user/workbooks`);
  console.log(`   LMS API: http://localhost:${PORT}/api/${API_VERSION}/lms`);
  console.log(`   Admin Auth: http://localhost:${PORT}/api/admin/auth`);
  console.log(`   Admin API: http://localhost:${PORT}/api/admin`);
  console.log(`   Agent Auth: http://localhost:${PORT}/api/agent/auth`);
  console.log(`   Agent API: http://localhost:${PORT}/api/agent`);
  console.log('   ============================================');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;

