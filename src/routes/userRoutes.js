/**
 * USER PROFILE API
 * 
 * Handles syncing user profile data from AWS Cognito to the database.
 * 
 * Endpoints:
 * 
 * 1. POST /api/user/sync-profile
 *    - Syncs a single user's profile (email and name)
 *    - Request: { userId, email, name }
 *    - Response: { success, user }
 * 
 * 2. GET /api/user/profile/:userId
 *    - Gets a user's profile data
 *    - Response: { success, user }
 * 
 * 3. POST /api/user/bulk-sync-profiles
 *    - Syncs multiple users at once
 *    - Request: { users: [{ userId, email, name }] }
 *    - Response: { success, results }
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * POST /api/user/sync-profile
 * Sync user profile data from Cognito to database
 * 
 * Request Body:
 * {
 *   "userId": "cognito-user-id",
 *   "email": "user@example.com",
 *   "name": "User Name"
 * }
 */
router.post('/sync-profile', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId, email, name } = req.body;
    
    console.log('='.repeat(50));
    console.log('📧 [SYNC PROFILE REQUEST]');
    console.log('   Timestamp:', new Date().toISOString());
    console.log('   User ID:', userId);
    console.log('   Email:', email);
    console.log('   Name:', name || '(not provided)');
    console.log('='.repeat(50));
    
    // Validate required fields
    if (!userId) {
      console.error('❌ [Sync Profile] Missing userId');
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required' 
      });
    }
    
    if (!email) {
      console.error('❌ [Sync Profile] Missing email');
      return res.status(400).json({ 
        success: false, 
        error: 'email is required' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ [Sync Profile] Invalid email format');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }
    
    // Upsert user (insert or update)
    const result = await query(`
      INSERT INTO users (id, email, name, created_at, updated_at)
      VALUES ($1::uuid, $2, $3, NOW(), NOW())
      ON CONFLICT (id) 
      DO UPDATE SET 
        email = EXCLUDED.email,
        name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
        updated_at = NOW()
      RETURNING id, email, name, type_id, tier, created_at, updated_at
    `, [userId, email, name || '']);
    
    const user = result.rows[0];
    
    const duration = Date.now() - startTime;
    console.log(`✅ [Sync Profile] Success in ${duration}ms`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    
    res.json({ 
      success: true, 
      message: 'Profile synced successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        typeId: user.type_id,
        tier: user.tier,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Sync Profile] Error after ${duration}ms:`, error.message);
    console.error('   Stack trace:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to sync profile',
      details: error.message 
    });
  }
});

/**
 * GET /api/user/profile/:userId
 * Get user profile data
 */
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`📖 [Get Profile] Fetching profile for user ${userId}`);
    
    const result = await query(`
      SELECT id, email, name, type_id, tier, created_at, updated_at
      FROM users
      WHERE LOWER(id::text) = LOWER($1)
    `, [userId]);
    
    if (result.rows.length === 0) {
      console.log(`⚠️ [Get Profile] User not found: ${userId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    const user = result.rows[0];
    
    console.log(`✅ [Get Profile] Profile found for: ${user.email}`);
    
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        typeId: user.type_id,
        tier: user.tier,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
    
  } catch (error) {
    console.error('❌ [Get Profile] Error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get profile' 
    });
  }
});

/**
 * POST /api/user/bulk-sync-profiles
 * Sync multiple user profiles at once
 * 
 * Request Body:
 * {
 *   "users": [
 *     { "userId": "id1", "email": "email1", "name": "name1" },
 *     { "userId": "id2", "email": "email2", "name": "name2" }
 *   ]
 * }
 */
router.post('/bulk-sync-profiles', async (req, res) => {
  try {
    const { users } = req.body;
    
    if (!users || !Array.isArray(users)) {
      return res.status(400).json({ 
        success: false, 
        error: 'users array is required' 
      });
    }
    
    console.log(`📧 [Bulk Sync] Syncing ${users.length} user profiles`);
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const user of users) {
      try {
        const { userId, email, name } = user;
        
        if (!userId || !email) {
          results.failed++;
          results.errors.push({ userId, error: 'Missing userId or email' });
          continue;
        }
        
        await query(`
          INSERT INTO users (id, email, name, created_at, updated_at)
          VALUES ($1::uuid, $2, $3, NOW(), NOW())
          ON CONFLICT (id) 
          DO UPDATE SET 
            email = EXCLUDED.email,
            name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
            updated_at = NOW()
        `, [userId, email, name || '']);
        
        results.success++;
        console.log(`   ✅ Synced: ${email}`);
        
      } catch (error) {
        results.failed++;
        results.errors.push({ 
          userId: user.userId, 
          error: error.message 
        });
        console.error(`   ❌ Failed: ${user.userId} - ${error.message}`);
      }
    }
    
    console.log(`✅ [Bulk Sync] Complete: ${results.success} success, ${results.failed} failed`);
    
    res.json({ 
      success: true, 
      results 
    });
    
  } catch (error) {
    console.error('❌ [Bulk Sync] Error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to bulk sync profiles' 
    });
  }
});

/**
 * PUT /api/user/profile/:userId
 * Update user profile data
 */
router.put('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, name, tier } = req.body;
    
    console.log(`✏️ [Update Profile] Updating profile for user ${userId}`);
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramCount = 0;
    
    if (email !== undefined) {
      paramCount++;
      updates.push(`email = $${paramCount}`);
      params.push(email);
    }
    
    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(name);
    }
    
    if (tier !== undefined) {
      const validTiers = ['free', 'basic', 'standard', 'pro', 'elite'];
      if (!validTiers.includes(tier)) {
        return res.status(400).json({
          success: false,
          error: `Invalid tier. Must be one of: ${validTiers.join(', ')}`
        });
      }
      paramCount++;
      updates.push(`tier = $${paramCount}`);
      params.push(tier);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    updates.push('updated_at = NOW()');
    paramCount++;
    params.push(userId);
    
    const result = await query(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE LOWER(id::text) = LOWER($${paramCount})
      RETURNING id, email, name, type_id, tier, created_at, updated_at
    `, params);
    
    if (result.rows.length === 0) {
      console.log(`⚠️ [Update Profile] User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = result.rows[0];
    console.log(`✅ [Update Profile] Profile updated for: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        typeId: user.type_id,
        tier: user.tier,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
    
  } catch (error) {
    console.error('❌ [Update Profile] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

module.exports = router;


