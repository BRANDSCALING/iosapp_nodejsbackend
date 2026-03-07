/**
 * Admin Authentication Middleware
 * Verifies JWT tokens and checks admin access
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'brandscaling-admin-secret-key';

const adminAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'No authentication token provided' 
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get admin user from database
    const result = await query(
      'SELECT id, email, name, role, is_active FROM admin_users WHERE id = $1::uuid AND is_active = TRUE',
      [decoded.adminId]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Admin account not found or inactive.' 
      });
    }
    
    // Add admin user to request object
    req.admin = result.rows[0];
    
    console.log(`✅ [Admin Auth] ${req.admin.email} authenticated for ${req.method} ${req.path}`);
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid authentication token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication token expired' 
      });
    }
    
    console.error('❌ [Admin Auth] Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Authentication error' 
    });
  }
};

/**
 * Admin or UCWS authentication middleware.
 * Handles both token types:
 * - Admin portal: JWT with adminId, signed with JWT_SECRET → verify and allow.
 * - iOS UCWS: Cognito JWT with sub → decode only, then check users.user_type in DB.
 */
const isAdminOrUcws = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'No authentication token provided',
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const decoded = jwt.decode(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing token payload',
    });
  }

  // Admin portal token (custom JWT with adminId)
  if (decoded.adminId) {
    try {
      jwt.verify(token, JWT_SECRET);
      req.userId = decoded.adminId;
      req.user = { id: decoded.adminId };
      return next();
    } catch (err) {
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: err.name === 'TokenExpiredError' ? 'Authentication token expired' : 'Invalid authentication token',
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Authentication error',
      });
    }
  }

  // Cognito token (sub = user id)
  if (decoded.sub) {
    try {
      const result = await query(
        'SELECT user_type FROM users WHERE id = $1::uuid',
        [decoded.sub]
      );
      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin or UCWS role required.',
        });
      }
      const userType = result.rows[0].user_type;
      if (userType && (userType.toString().toLowerCase() === 'ucws' || userType.toString().toLowerCase() === 'admin')) {
        req.userId = decoded.sub;
        req.user = { id: decoded.sub, sub: decoded.sub };
        return next();
      }
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin or UCWS role required.',
      });
    } catch (error) {
      console.error('❌ [Admin/UCWS Auth] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication error',
      });
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid or missing token payload',
  });
};

module.exports = { adminAuth, isAdminOrUcws };


