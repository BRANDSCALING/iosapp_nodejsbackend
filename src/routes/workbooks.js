/**
 * Workbook Routes
 * Handles workbook fetching, instances, answers, progress tracking, and completion
 * 
 * Endpoints:
 * - GET  /                                  - Get workbooks for user (filtered by type/tier)
 * - GET  /:workbookId/instance              - Get or create workbook instance
 * - POST /instances/:instanceId/answers     - Save answer for a field
 * - POST /instances/:instanceId/answers/bulk - Save multiple answers at once
 * - POST /instances/:instanceId/complete    - Mark workbook as complete
 * - PUT  /instances/:instanceId/progress    - Update workbook progress data
 * - GET  /instances/:instanceId/progress    - Get workbook progress data
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { body, param } = require('express-validator');
const { validationResult } = require('express-validator');

// ============================================
// Helper Functions
// ============================================

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array()
    });
    return true;
  }
  return false;
};

/**
 * Simple auth middleware
 * Expects userId in:
 * - req.user.id (from JWT middleware)
 * - req.headers['x-user-id'] (for testing)
 * - req.query.userId (for testing)
 */
const requireAuth = (req, res, next) => {
  const userId = req.user?.id || req.headers['x-user-id'] || req.query.userId;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Provide userId via x-user-id header or userId query param.'
    });
  }
  
  req.userId = userId;
  next();
};

// Apply auth to all routes
router.use(requireAuth);

// ============================================
// Validation Middleware
// ============================================

const validateWorkbookId = param('workbookId')
  .isUUID()
  .withMessage('Workbook ID must be a valid UUID');

const validateInstanceId = param('instanceId')
  .isUUID()
  .withMessage('Instance ID must be a valid UUID');

const validateAnswerSave = [
  body('fieldKey')
    .notEmpty()
    .withMessage('Field key is required')
    .isString()
    .withMessage('Field key must be a string'),
  body('value')
    .exists()
    .withMessage('Value is required')
];

// ============================================
// Routes
// ============================================

/**
 * GET /api/user/workbooks
 * Fetch workbooks for the authenticated user
 * Filtered by user's type_id and subscription tier
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log(`📚 [Workbooks] Fetching workbooks for user: ${userId}`);
    
    // Step 1: Get user's type_id and tier
    const userResult = await query(
      'SELECT type_id, tier FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    const userTypeId = user.type_id || 'mixed'; // Default to mixed if no type set
    const userTier = user.tier || 'free';       // Default to free tier
    
    console.log(`📚 [Workbooks] User type: ${userTypeId}, tier: ${userTier}`);
    
    // Step 2: Get user's tier rank
    const tierRankResult = await query(
      'SELECT rank FROM tier_rank WHERE tier = $1',
      [userTier]
    );
    
    const userTierRank = tierRankResult.rows.length > 0 ? tierRankResult.rows[0].rank : 1;
    
    // Step 3: Fetch workbooks matching user's type and tier
    // - workbooks.type_id = user's type_id OR 'mixed'
    // - workbooks.tier rank <= user's tier rank
    const workbooksResult = await query(`
      SELECT 
        w.id,
        w.name,
        w.title,
        w.type_id,
        w.tier,
        w.created_at,
        CASE WHEN wi.id IS NOT NULL THEN true ELSE false END as has_instance,
        wi.last_saved_at,
        COALESCE((wi.data->>'completed')::boolean, false) as is_completed
      FROM workbooks w
      LEFT JOIN tier_rank tr ON w.tier = tr.tier
      LEFT JOIN workbook_instances wi ON w.id = wi.workbook_id AND wi.user_id = $1
      WHERE (w.type_id = $2 OR w.type_id = 'mixed' OR w.type_id IS NULL)
        AND (tr.rank IS NULL OR tr.rank <= $3)
      ORDER BY w.created_at DESC
    `, [userId, userTypeId, userTierRank]);
    
    console.log(`✅ [Workbooks] Found ${workbooksResult.rows.length} workbooks for user`);
    
    res.json({
      success: true,
      user: {
        typeId: userTypeId,
        tier: userTier,
        tierRank: userTierRank
      },
      workbooks: workbooksResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        title: row.title,
        typeId: row.type_id,
        tier: row.tier,
        createdAt: row.created_at,
        hasInstance: row.has_instance,
        lastSavedAt: row.last_saved_at,
        isCompleted: row.is_completed
      }))
    });
    
  } catch (error) {
    console.error('❌ [Workbooks] Error fetching workbooks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workbooks',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/user/workbooks/:workbookId/instance
 * Get or create a workbook instance for the user
 * Returns the instance, workbook structure, and existing answers
 */
router.get('/:workbookId/instance', validateWorkbookId, async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) return;
    
    const userId = req.userId;
    const { workbookId } = req.params;
    
    console.log(`📖 [Workbooks] Getting instance for workbook ${workbookId}, user ${userId}`);
    
    // Step 1: Check if workbook exists
    const workbookResult = await query(
      'SELECT id, name, title, json_structure, type_id, tier FROM workbooks WHERE id = $1',
      [workbookId]
    );
    
    if (workbookResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workbook not found'
      });
    }
    
    const workbook = workbookResult.rows[0];
    
    // Step 2: Get or create instance
    let instanceResult = await query(
      'SELECT id, data, last_saved_at FROM workbook_instances WHERE user_id = $1 AND workbook_id = $2',
      [userId, workbookId]
    );
    
    let instance;
    let isNewInstance = false;
    
    if (instanceResult.rows.length === 0) {
      // Create new instance
      console.log(`📖 [Workbooks] Creating new instance for user ${userId}`);
      
      const createResult = await query(`
        INSERT INTO workbook_instances (user_id, workbook_id, data, last_saved_at)
        VALUES ($1, $2, '{}', NULL)
        RETURNING id, data, last_saved_at
      `, [userId, workbookId]);
      
      instance = createResult.rows[0];
      isNewInstance = true;
    } else {
      instance = instanceResult.rows[0];
    }
    
    // Step 3: Fetch existing answers
    const answersResult = await query(
      'SELECT field_key, value FROM workbook_answers WHERE instance_id = $1',
      [instance.id]
    );
    
    // Convert answers array to object { fieldKey: value }
    const answers = {};
    answersResult.rows.forEach(row => {
      answers[row.field_key] = row.value;
    });
    
    console.log(`✅ [Workbooks] Returning instance with ${answersResult.rows.length} answers`);
    
    res.json({
      success: true,
      isNewInstance,
      instance: {
        id: instance.id,
        workbookId: workbookId,
        data: instance.data,
        lastSavedAt: instance.last_saved_at,
        isCompleted: instance.data?.completed || false
      },
      workbook: {
        id: workbook.id,
        name: workbook.name,
        title: workbook.title,
        typeId: workbook.type_id,
        tier: workbook.tier,
        structure: workbook.json_structure
      },
      answers,
      answerCount: answersResult.rows.length
    });
    
  } catch (error) {
    console.error('❌ [Workbooks] Error getting instance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workbook instance',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/user/workbooks/instances/:instanceId/answers
 * Save a single answer for a workbook field
 */
router.post('/instances/:instanceId/answers', validateInstanceId, validateAnswerSave, async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) return;
    
    const userId = req.userId;
    const { instanceId } = req.params;
    const { fieldKey, value } = req.body;
    
    console.log(`💾 [Workbooks] Saving answer for instance ${instanceId}, field: ${fieldKey}`);
    
    // Step 1: Verify instance belongs to user
    const instanceResult = await query(
      'SELECT id, user_id FROM workbook_instances WHERE id = $1',
      [instanceId]
    );
    
    if (instanceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workbook instance not found'
      });
    }
    
    if (instanceResult.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this workbook instance'
      });
    }
    
    // Step 2: Insert or update answer
    await query(`
      INSERT INTO workbook_answers (instance_id, field_key, value, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (instance_id, field_key)
      DO UPDATE SET 
        value = $3,
        updated_at = NOW()
    `, [instanceId, fieldKey, JSON.stringify(value)]);
    
    // Step 3: Update instance's last_saved_at
    await query(
      'UPDATE workbook_instances SET last_saved_at = NOW() WHERE id = $1',
      [instanceId]
    );
    
    console.log(`✅ [Workbooks] Answer saved for field: ${fieldKey}`);
    
    res.json({
      success: true,
      message: 'Answer saved successfully',
      fieldKey,
      savedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [Workbooks] Error saving answer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save answer',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/user/workbooks/instances/:instanceId/complete
 * Mark a workbook as complete
 */
router.post('/instances/:instanceId/complete', validateInstanceId, async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) return;
    
    const userId = req.userId;
    const { instanceId } = req.params;
    
    console.log(`🎉 [Workbooks] Marking instance ${instanceId} as complete`);
    
    // Step 1: Verify instance belongs to user
    const instanceResult = await query(
      'SELECT id, user_id, workbook_id FROM workbook_instances WHERE id = $1',
      [instanceId]
    );
    
    if (instanceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workbook instance not found'
      });
    }
    
    if (instanceResult.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this workbook instance'
      });
    }
    
    // Step 2: Update instance data to mark as completed
    const updateResult = await query(`
      UPDATE workbook_instances 
      SET 
        data = jsonb_set(COALESCE(data, '{}'), '{completed}', 'true'),
        last_saved_at = NOW()
      WHERE id = $1
      RETURNING id, data, last_saved_at
    `, [instanceId]);
    
    // Step 3: Get answer count for response
    const answerCountResult = await query(
      'SELECT COUNT(*) as count FROM workbook_answers WHERE instance_id = $1',
      [instanceId]
    );
    
    console.log(`✅ [Workbooks] Instance ${instanceId} marked as complete`);
    
    res.json({
      success: true,
      message: 'Workbook marked as complete',
      instance: {
        id: instanceId,
        workbookId: instanceResult.rows[0].workbook_id,
        isCompleted: true,
        completedAt: updateResult.rows[0].last_saved_at,
        answerCount: parseInt(answerCountResult.rows[0].count)
      }
    });
    
  } catch (error) {
    console.error('❌ [Workbooks] Error marking complete:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark workbook as complete',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/user/workbooks/instances/:instanceId/answers/bulk
 * Save multiple answers at once (for batch saves)
 */
router.post('/instances/:instanceId/answers/bulk', validateInstanceId, async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) return;
    
    const userId = req.userId;
    const { instanceId } = req.params;
    const { answers } = req.body;
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: 'Answers must be an array'
      });
    }
    
    console.log(`💾 [Workbooks] Bulk saving ${answers.length} answers for instance ${instanceId}`);
    
    // Verify instance belongs to user
    const instanceResult = await query(
      'SELECT id, user_id FROM workbook_instances WHERE id = $1',
      [instanceId]
    );
    
    if (instanceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workbook instance not found'
      });
    }
    
    if (instanceResult.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this workbook instance'
      });
    }
    
    // Save each answer
    let saved = 0;
    let failed = 0;
    
    for (const answer of answers) {
      try {
        if (!answer.fieldKey) continue;
        
        await query(`
          INSERT INTO workbook_answers (instance_id, field_key, value, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          ON CONFLICT (instance_id, field_key)
          DO UPDATE SET 
            value = $3,
            updated_at = NOW()
        `, [instanceId, answer.fieldKey, JSON.stringify(answer.value)]);
        
        saved++;
      } catch (err) {
        console.error(`Failed to save answer for field ${answer.fieldKey}:`, err.message);
        failed++;
      }
    }
    
    // Update instance's last_saved_at
    await query(
      'UPDATE workbook_instances SET last_saved_at = NOW() WHERE id = $1',
      [instanceId]
    );
    
    console.log(`✅ [Workbooks] Bulk save complete: ${saved} saved, ${failed} failed`);
    
    res.json({
      success: true,
      message: `Saved ${saved} answers`,
      saved,
      failed,
      savedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [Workbooks] Error bulk saving:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save answers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/user/workbooks/instances/:instanceId/progress
 * Update workbook instance progress data
 * 
 * Request body:
 * {
 *   "progressData": {
 *     "completed": false,
 *     "overallProgress": 0.67,
 *     "modules": [
 *       {
 *         "id": "section-1",
 *         "title": "Module 1 – Welcome & Orientation",
 *         "progress": 1.0,
 *         "completed": true,
 *         "sections": [...]
 *       }
 *     ]
 *   }
 * }
 */
router.put('/instances/:instanceId/progress', validateInstanceId, async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) return;
    
    const { instanceId } = req.params;
    const { progressData } = req.body;
    const userId = req.userId;
    
    console.log(`📊 [Workbooks] Updating progress for instance: ${instanceId}`);
    console.log(`   User: ${userId}`);
    
    // Validate progressData exists
    if (!progressData) {
      return res.status(400).json({ 
        success: false,
        error: 'progressData is required' 
      });
    }
    
    // Verify instance exists and belongs to user
    const verifyResult = await query(
      'SELECT id, user_id, workbook_id FROM workbook_instances WHERE id = $1',
      [instanceId]
    );
    
    if (verifyResult.rows.length === 0) {
      console.log(`❌ [Workbooks] Instance not found: ${instanceId}`);
      return res.status(404).json({ 
        success: false,
        error: 'Workbook instance not found' 
      });
    }
    
    const instance = verifyResult.rows[0];
    
    // Verify user owns this instance
    if (instance.user_id !== userId) {
      console.log(`❌ [Workbooks] Unauthorized access attempt by ${userId} to instance ${instanceId}`);
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized access to this workbook instance' 
      });
    }
    
    // Update progress data in database
    const updateResult = await query(
      `UPDATE workbook_instances 
       SET data = $1, last_saved_at = NOW() 
       WHERE id = $2
       RETURNING id, data, last_saved_at`,
      [JSON.stringify(progressData), instanceId]
    );
    
    if (updateResult.rows.length === 0) {
      console.log(`❌ [Workbooks] Failed to update instance: ${instanceId}`);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to update progress' 
      });
    }
    
    const updatedInstance = updateResult.rows[0];
    
    // Log success with progress details
    console.log(`✅ [Workbooks] Progress updated for instance: ${instanceId}`);
    console.log(`   Workbook: ${instance.workbook_id}`);
    console.log(`   Overall Progress: ${((progressData.overallProgress || 0) * 100).toFixed(0)}%`);
    console.log(`   Completed: ${progressData.completed || false}`);
    console.log(`   Modules: ${progressData.modules?.length || 0}`);
    
    res.json({ 
      success: true, 
      progressData: updatedInstance.data,
      lastSavedAt: updatedInstance.last_saved_at
    });
    
  } catch (error) {
    console.error('❌ [Workbooks] Error updating progress:', error);
    console.error('   Stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error while updating progress',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/user/workbooks/instances/:instanceId/progress
 * Get workbook instance progress data
 */
router.get('/instances/:instanceId/progress', validateInstanceId, async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) return;
    
    const { instanceId } = req.params;
    const userId = req.userId;
    
    console.log(`📊 [Workbooks] Getting progress for instance: ${instanceId}`);
    
    // Get instance with progress data
    const result = await query(
      `SELECT wi.id, wi.user_id, wi.workbook_id, wi.data, wi.last_saved_at,
              w.title as workbook_title, w.name as workbook_name
       FROM workbook_instances wi
       JOIN workbooks w ON wi.workbook_id = w.id
       WHERE wi.id = $1`,
      [instanceId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Workbook instance not found' 
      });
    }
    
    const instance = result.rows[0];
    
    // Verify user owns this instance
    if (instance.user_id !== userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized access to this workbook instance' 
      });
    }
    
    // Get answer count
    const answerCountResult = await query(
      'SELECT COUNT(*) as count FROM workbook_answers WHERE instance_id = $1',
      [instanceId]
    );
    
    const answerCount = parseInt(answerCountResult.rows[0].count);
    const progressData = instance.data || {};
    
    console.log(`✅ [Workbooks] Returning progress for instance: ${instanceId}`);
    console.log(`   Overall Progress: ${((progressData.overallProgress || 0) * 100).toFixed(0)}%`);
    console.log(`   Answer Count: ${answerCount}`);
    
    res.json({
      success: true,
      instance: {
        id: instance.id,
        workbookId: instance.workbook_id,
        workbookTitle: instance.workbook_title,
        workbookName: instance.workbook_name
      },
      progressData: progressData,
      overallProgress: progressData.overallProgress || 0,
      completed: progressData.completed || false,
      moduleCount: progressData.modules?.length || 0,
      answerCount: answerCount,
      lastSavedAt: instance.last_saved_at
    });
    
  } catch (error) {
    console.error('❌ [Workbooks] Error getting progress:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get progress data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

