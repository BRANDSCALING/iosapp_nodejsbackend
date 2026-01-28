/**
 * Agent Authentication Middleware
 * Verifies JWT tokens for agent endpoints
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'brandscaling-admin-secret-key';

/**
 * Verify agent JWT token
 * Attaches agent info to req.agent if valid
 */
const verifyAgentToken = async (req, res, next) => {
  try {
    console.log('🔐 [Agent Auth] Verifying token...');
    
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [Agent Auth] No token provided');
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      console.log('❌ [Agent Auth] Token verification failed:', jwtError.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    // Check if this is an agent token
    if (decoded.type !== 'agent') {
      console.log('❌ [Agent Auth] Token is not an agent token');
      return res.status(401).json({
        success: false,
        error: 'Invalid token type'
      });
    }
    
    // Get agent from database and verify is_active
    const result = await query(
      'SELECT id, email, name, role, is_active FROM agent_users WHERE id = $1::uuid',
      [decoded.id]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ [Agent Auth] Agent not found in database');
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    const agent = result.rows[0];
    
    if (!agent.is_active) {
      console.log('❌ [Agent Auth] Agent account is disabled:', agent.email);
      return res.status(401).json({
        success: false,
        error: 'Account disabled'
      });
    }
    
    // Attach agent to request
    req.agent = {
      id: agent.id,
      email: agent.email,
      name: agent.name,
      role: agent.role
    };
    
    console.log('✅ [Agent Auth] Token valid for:', agent.email);
    
    next();
  } catch (error) {
    console.error('❌ [Agent Auth] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

module.exports = {
  verifyAgentToken
};


