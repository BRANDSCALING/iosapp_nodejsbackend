/**
 * Admin Authentication Controller
 * Handles admin login, token management, and password changes
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'brandscaling-admin-secret-key';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

/**
 * Admin login
 * POST /api/admin/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    console.log(`🔐 [Admin Auth] Login attempt for: ${email}`);
    
    // Get admin user from database
    const result = await query(
      'SELECT * FROM admin_users WHERE LOWER(email) = LOWER($1) AND is_active = TRUE',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log(`❌ [Admin Auth] Admin not found: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    const admin = result.rows[0];
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!isPasswordValid) {
      console.log(`❌ [Admin Auth] Invalid password for: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin.id,
        email: admin.email,
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    console.log(`✅ [Admin Auth] Login successful: ${email}`);
    
    // Return token and admin info
    res.json({
      success: true,
      token,
      expiresIn: JWT_EXPIRES_IN,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
    
  } catch (error) {
    console.error('❌ [Admin Auth] Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

/**
 * Get current admin info
 * GET /api/admin/auth/me
 */
exports.me = async (req, res) => {
  try {
    // req.admin is set by adminAuth middleware
    res.json({
      success: true,
      admin: {
        id: req.admin.id,
        email: req.admin.email,
        name: req.admin.name,
        role: req.admin.role
      }
    });
  } catch (error) {
    console.error('❌ [Admin Auth] Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get admin info'
    });
  }
};

/**
 * Change password
 * POST /api/admin/auth/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters'
      });
    }
    
    // Get admin with password hash
    const result = await query(
      'SELECT password_hash FROM admin_users WHERE id = $1::uuid',
      [req.admin.id]
    );
    
    const admin = result.rows[0];
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await query(
      'UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2::uuid',
      [newPasswordHash, req.admin.id]
    );
    
    console.log(`✅ [Admin Auth] Password changed for: ${req.admin.email}`);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('❌ [Admin Auth] Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
};

/**
 * Refresh token
 * POST /api/admin/auth/refresh
 */
exports.refreshToken = async (req, res) => {
  try {
    // Generate new token with same claims
    const token = jwt.sign(
      { 
        adminId: req.admin.id,
        email: req.admin.email,
        role: req.admin.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    console.log(`🔄 [Admin Auth] Token refreshed for: ${req.admin.email}`);
    
    res.json({
      success: true,
      token,
      expiresIn: JWT_EXPIRES_IN
    });
    
  } catch (error) {
    console.error('❌ [Admin Auth] Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
};

/**
 * Logout (optional - for token blacklisting)
 * POST /api/admin/auth/logout
 */
exports.logout = async (req, res) => {
  try {
    console.log(`👋 [Admin Auth] Logout: ${req.admin.email}`);
    
    // In a production system, you might want to:
    // 1. Add the token to a blacklist in Redis
    // 2. Or use short-lived tokens with refresh tokens
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('❌ [Admin Auth] Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout'
    });
  }
};

module.exports = exports;


