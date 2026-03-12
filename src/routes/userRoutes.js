/**
 * USER PROFILE API
 *
 * Handles syncing user profile data from AWS Cognito to the database.
 *
 * Endpoints:
 *
 * 1. GET /api/user/profile
 *    - Fetches the authenticated user's profile (requires auth: JWT, x-user-id, or userId query)
 *    - Response: { success, user }
 *
 * 2. POST /api/user/sync-profile
 * 2. POST /api/user/sync-profile
 *    - Syncs a single user's profile (email and name)
 *    - Request: { userId, email, name }
 *    - Response: { success, user }
 *
 * 3. GET /api/user/profile/:userId
 *    - Gets a user's profile data by ID
 *    - Response: { success, user }
 *
 * 4. POST /api/user/bulk-sync-profiles
 *    - Syncs multiple users at once
 *    - Request: { users: [{ userId, email, name }] }
 *    - Response: { success, results }
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query, getClient } = require('../config/database');

/**
 * Auth for "current user" endpoints.
 * PRIMARY: Bearer token in Authorization header (Cognito JWT) — decode and use sub as userId.
 * FALLBACK: req.user.id, req.userId, x-user-id header, userId query.
 * Sets req.userId for the route handler.
 */
const requireAuth = (req, res, next) => {
  // 1. Try Bearer token first (Cognito JWT)
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace(/^\s*Bearer\s+/i, '').trim();
    const decoded = jwt.decode(token);
    if (decoded && decoded.sub) {
      req.userId = decoded.sub;
      return next();
    }
  }

  // 2. Fallbacks
  const userId = req.user?.id || req.userId || req.headers['x-user-id'] || req.query.userId;
  if (userId) {
    req.userId = userId;
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Authentication required. Provide Bearer token, x-user-id header, or userId query param.',
  });
};

// ========== /me/... routes MUST be first (before any /:param routes) ==========

/**
 * DELETE /api/v1/users/me (also /api/user/me and /api/users/me)
 * Permanently delete the authenticated user's account and all associated data.
 * Requires auth. Returns 200 OK on success.
 */
router.delete('/me', requireAuth, async (req, res) => {
  const userId = req.userId;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    // Quiz and E-DNA data (no FK CASCADE from users): delete by user_id
    await client.query(
      `DELETE FROM user_quiz_progress WHERE session_id IN (SELECT id FROM quiz_sessions WHERE LOWER(user_id::text) = LOWER($1))`,
      [userId]
    );
    await client.query(
      `DELETE FROM user_quiz_results WHERE session_id IN (SELECT id FROM quiz_sessions WHERE LOWER(user_id::text) = LOWER($1))`,
      [userId]
    );
    await client.query(
      'DELETE FROM quiz_sessions WHERE LOWER(user_id::text) = LOWER($1)',
      [userId]
    );
    try {
      await client.query(
        'DELETE FROM edna_profiles WHERE LOWER(user_id::text) = LOWER($1)',
        [userId]
      );
    } catch (err) {
      if (err.code !== '42P01') throw err; // 42P01 = undefined_table, ignore if missing
    }
    // User row: CASCADE will remove user_program_access, lesson_progress, user_lesson_completions, workbook_instances, agent_sessions
    const deleteUser = await client.query(
      'DELETE FROM users WHERE LOWER(id::text) = LOWER($1) RETURNING id',
      [userId]
    );
    if (deleteUser.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }
    await client.query('COMMIT');
    return res.status(200).json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ [Delete Account] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete account',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/user/me/quiz-status (also /api/users/me/quiz-status)
 * Returns whether the authenticated user has completed the onboarding quiz.
 */
router.get('/me/quiz-status', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const result = await query(
      'SELECT has_completed_quiz FROM users WHERE LOWER(id::text) = LOWER($1)',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }
    const hasCompletedQuiz = Boolean(result.rows[0].has_completed_quiz);
    return res.json({ hasCompletedQuiz });
  } catch (error) {
    console.error('❌ [Quiz Status] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get quiz status',
    });
  }
});

/**
 * POST /api/user/me/quiz-complete (also /api/users/me/quiz-complete)
 * Marks the onboarding quiz as complete for the authenticated user.
 */
router.post('/me/quiz-complete', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    await query(
      'UPDATE users SET has_completed_quiz = TRUE WHERE LOWER(id::text) = LOWER($1)',
      [userId]
    );
    return res.json({ success: true, hasCompletedQuiz: true });
  } catch (error) {
    console.error('❌ [Quiz Complete] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark quiz complete',
    });
  }
});

// ========== Other routes (profile, sync-profile, etc.) ==========

/**
 * GET /api/user/profile
 * Fetches the full profile of the authenticated user (req.userId from auth).
 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;

    const result = await query(
      `SELECT id, email, name, type_id, tier, user_type, created_at, updated_at
       FROM users
       WHERE LOWER(id::text) = LOWER($1)`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found in database.',
      });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        typeId: user.type_id,
        tier: user.tier,
        userType: user.user_type ?? null,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    console.error('❌ [Get Profile] Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/user/sync-profile
 * Sync user profile data from Cognito to database
 *
 * Request Body:
 * {
 *   "userId": "cognito-user-id",
 *   "email": "user@example.com",
 *   "name": "User Name",
 *   "source": "ios"   // optional: "ios" → user_type = 'brandscaling'; missing or other → 'ucws'. Only applied on INSERT.
 * }
 *
 * Rule: user_type is set once (on INSERT from source) and NEVER overwritten on UPDATE.
 */
router.post('/sync-profile', async (req, res) => {
  const startTime = Date.now();

  try {
    const { userId, email, name, source } = req.body;

    console.log('='.repeat(50));
    console.log('📧 [SYNC PROFILE REQUEST]');
    console.log('   Timestamp:', new Date().toISOString());
    console.log('   User ID:', userId);
    console.log('   Email:', email);
    console.log('   Name:', name || '(not provided)');
    console.log('   Source:', source || '(not provided)');
    console.log('='.repeat(50));

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ [Sync Profile] Invalid email format');
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Determine user_type for INSERT only. It will be ignored on UPDATE.
    const userTypeForInsert = req.body.source === 'ios' ? 'brandscaling' : 'ucws';

    const result = await query(
      `INSERT INTO users (id, email, name, user_type, created_at, updated_at)
       VALUES ($1::uuid, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (email) 
       DO UPDATE SET
         name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
         updated_at = NOW()
       RETURNING id, email, name, user_type, type_id, tier, created_at, updated_at`,
      [req.body.userId, req.body.email, req.body.name || '', userTypeForInsert]
    );

    const user = result.rows[0];

    const duration = Date.now() - startTime;
    console.log(`✅ [Sync Profile] Success in ${duration}ms`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   user_type: ${user.user_type} (unchanged on update)`);

    res.json({
      success: true,
      message: 'Profile synced successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        typeId: user.type_id,
        tier: user.tier,
        userType: user.user_type ?? null,
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
      SELECT id, email, name, type_id, tier, user_type, created_at, updated_at
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
        userType: user.user_type ?? null,
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


