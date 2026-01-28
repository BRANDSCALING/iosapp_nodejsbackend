/**
 * Agent Authentication Controller
 * Handles agent login, logout, and token refresh
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'brandscaling-admin-secret-key';
const JWT_EXPIRES_IN = '24h';

/**
 * Agent login
 * POST /api/agent/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 [Agent Auth] Login attempt:', email);
    
    // Validate input
    if (!email || !password) {
      console.log('❌ [Agent Auth] Login failed: Missing credentials');
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    // Query agent by email (case-insensitive)
    const result = await query(
      'SELECT id, email, password_hash, name, role, is_active FROM agent_users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ [Agent Auth] Login failed:', email, '- Agent not found');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    const agent = result.rows[0];
    
    // Check if agent is active
    if (!agent.is_active) {
      console.log('❌ [Agent Auth] Login failed:', email, '- Account disabled');
      return res.status(401).json({
        success: false,
        error: 'Account disabled'
      });
    }
    
    // Compare password
    const isPasswordValid = await bcrypt.compare(password, agent.password_hash);
    
    if (!isPasswordValid) {
      console.log('❌ [Agent Auth] Login failed:', email, '- Invalid password');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: agent.id,
        email: agent.email,
        role: agent.role,
        type: 'agent'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    console.log('✅ [Agent Auth] Login successful:', email);
    
    res.json({
      success: true,
      token,
      expiresIn: JWT_EXPIRES_IN,
      agent: {
        id: agent.id,
        email: agent.email,
        name: agent.name,
        role: agent.role
      }
    });
    
  } catch (error) {
    console.error('❌ [Agent Auth] Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

/**
 * Refresh token
 * POST /api/agent/auth/refresh
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    console.log('🔐 [Agent Auth] Refreshing token...');
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }
    
    // Verify the refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (jwtError) {
      console.log('❌ [Agent Auth] Invalid refresh token');
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }
    
    // Check if agent still exists and is active
    const result = await query(
      'SELECT id, email, name, role, is_active FROM agent_users WHERE id = $1::uuid',
      [decoded.id]
    );
    
    if (result.rows.length === 0 || !result.rows[0].is_active) {
      console.log('❌ [Agent Auth] Agent not found or inactive');
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    const agent = result.rows[0];
    
    // Generate new token
    const token = jwt.sign(
      {
        id: agent.id,
        email: agent.email,
        role: agent.role,
        type: 'agent'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    console.log('✅ [Agent Auth] Token refreshed for:', agent.email);
    
    res.json({
      success: true,
      token,
      expiresIn: JWT_EXPIRES_IN
    });
    
  } catch (error) {
    console.error('❌ [Agent Auth] Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
};

/**
 * Logout
 * POST /api/agent/auth/logout
 */
exports.logout = async (req, res) => {
  try {
    console.log('🔐 [Agent Auth] Logout');
    
    // Token invalidation happens client-side
    // Server just acknowledges the logout
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('❌ [Agent Auth] Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
};

/**
 * Get current agent info
 * GET /api/agent/auth/me
 */
exports.me = async (req, res) => {
  try {
    // req.agent is set by agentAuth middleware
    res.json({
      success: true,
      agent: req.agent
    });
  } catch (error) {
    console.error('❌ [Agent Auth] Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent info'
    });
  }
};

module.exports = exports;


