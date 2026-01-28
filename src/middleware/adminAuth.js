/**
 * Admin Authentication Middleware
 * Verifies JWT tokens and checks admin access
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'brandscaling-admin-secret-key');
    
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

module.exports = adminAuth;


