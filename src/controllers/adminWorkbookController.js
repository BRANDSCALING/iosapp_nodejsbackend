/**
 * FIXED Admin Workbook Controller
 * 
 * CHANGES MADE:
 * - Line 202: Removed wi.created_at (doesn't exist) - now using last_saved_at as instance_created_at fallback
 * - Line 294: Removed wi.created_at (doesn't exist) - now using last_saved_at as instance_created_at fallback
 * 
 * REASON:
 * The workbook_instances table only has: id, user_id, workbook_id, data, last_saved_at
 * It does NOT have created_at column
 */

const { query } = require('../config/database');

/**
 * Get all users' workbook progress
 * GET /api/admin/workbooks/progress
 * 
 * Query params:
 * - limit (default: 50) - Number of records to return
 * - offset (default: 0) - Pagination offset
 * - completed (optional) - Filter by completion status (true/false)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllUsersProgress = async (req, res) => {
  try {
    const { limit = 50, offset = 0, completed } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 50, 100); // Max 100
    const parsedOffset = parseInt(offset) || 0;
    
    console.log(`📊 [Admin] Getting workbook progress for all users`);
    console.log(`   Limit: ${parsedLimit}, Offset: ${parsedOffset}, Completed filter: ${completed}`);
    
    // Build completion filter
    let completedFilter = '';
    const params = [];
    let paramCount = 0;
    
    if (completed !== undefined) {
      const isCompleted = completed === 'true' || completed === true;
      paramCount++;
      completedFilter = `WHERE COALESCE((wi.data->>'completed')::boolean, false) = $${paramCount}`;
      params.push(isCompleted);
    }
    
    // Get total count of users with workbook instances
    const countQuery = await query(`
      SELECT COUNT(DISTINCT wi.user_id) as total
      FROM workbook_instances wi
      LEFT JOIN users u ON LOWER(wi.user_id::text) = LOWER(u.id::text)
      ${completedFilter}
    `, params);
    
    const totalUsers = parseInt(countQuery.rows[0].total) || 0;
    
    // Get users with their workbook progress
    paramCount++;
    params.push(parsedLimit);
    const limitParam = paramCount;
    
    paramCount++;
    params.push(parsedOffset);
    const offsetParam = paramCount;
    
    const usersQuery = await query(`
      WITH user_workbook_stats AS (
        SELECT 
          wi.user_id,
          COUNT(DISTINCT wi.id) as total_workbooks,
          COUNT(DISTINCT CASE WHEN COALESCE((wi.data->>'completed')::boolean, false) = true THEN wi.id END) as completed_workbooks,
          MAX(wi.last_saved_at) as last_activity
        FROM workbook_instances wi
        ${completedFilter}
        GROUP BY wi.user_id
      )
      SELECT 
        uws.user_id,
        u.email,
        u.name,
        uws.total_workbooks,
        uws.completed_workbooks,
        (uws.total_workbooks - uws.completed_workbooks) as in_progress_workbooks,
        uws.last_activity
      FROM user_workbook_stats uws
      LEFT JOIN users u ON LOWER(uws.user_id::text) = LOWER(u.id::text)
      ORDER BY uws.last_activity DESC NULLS LAST
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `, params);
    
    // Get workbook details for each user
    const usersWithWorkbooks = await Promise.all(
      usersQuery.rows.map(async (user) => {
        // Get workbook instances for this user
        const workbooksResult = await query(`
          SELECT 
            wi.id as instance_id,
            wi.workbook_id,
            w.title as workbook_title,
            w.name as workbook_name,
            COALESCE((wi.data->>'overallProgress')::float, 0) as progress,
            COALESCE((wi.data->>'completed')::boolean, false) as completed,
            wi.last_saved_at,
            (SELECT COUNT(*) FROM workbook_answers wa WHERE wa.instance_id = wi.id) as answers_count
          FROM workbook_instances wi
          LEFT JOIN workbooks w ON wi.workbook_id = w.id
          WHERE LOWER(wi.user_id::text) = LOWER($1)
          ORDER BY wi.last_saved_at DESC NULLS LAST
        `, [user.user_id]);
        
        // Calculate overall progress
        const totalProgress = workbooksResult.rows.reduce((sum, wb) => sum + (wb.progress || 0), 0);
        const overallProgress = workbooksResult.rows.length > 0 
          ? totalProgress / workbooksResult.rows.length 
          : 0;
        
        return {
          userId: user.user_id,
          email: user.email,
          name: user.name,
          totalWorkbooks: parseInt(user.total_workbooks) || 0,
          completedWorkbooks: parseInt(user.completed_workbooks) || 0,
          inProgressWorkbooks: parseInt(user.in_progress_workbooks) || 0,
          overallProgress: Math.round(overallProgress * 100) / 100,
          lastActivity: user.last_activity,
          workbooks: workbooksResult.rows.map(wb => ({
            workbookId: wb.workbook_id,
            workbookTitle: wb.workbook_title,
            workbookName: wb.workbook_name,
            instanceId: wb.instance_id,
            progress: wb.progress || 0,
            completed: wb.completed || false,
            lastSavedAt: wb.last_saved_at,
            answersCount: parseInt(wb.answers_count) || 0
          }))
        };
      })
    );
    
    console.log(`✅ [Admin] Retrieved workbook progress for ${usersWithWorkbooks.length} users`);
    
    res.json({
      success: true,
      totalUsers,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: (parsedOffset + parsedLimit) < totalUsers
      },
      users: usersWithWorkbooks
    });
    
  } catch (error) {
    console.error('❌ [Admin] Get all users progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users workbook progress',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get specific user's workbook progress
 * GET /api/admin/users/:userId/workbooks/progress
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserWorkbooksProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`📊 [Admin] Getting workbooks progress for user: ${userId}`);
    
    // Validate UUID format (accepts all UUID versions, case-insensitive)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format. Must be a valid UUID.'
      });
    }
    
    // Check if user exists
    const userResult = await query(
      'SELECT id, email, name, type_id, tier FROM users WHERE LOWER(id::text) = LOWER($1)',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`❌ [Admin] User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // Get user's workbook instances with detailed progress
    // FIXED: Removed wi.created_at (doesn't exist in workbook_instances table)
    const workbooksResult = await query(`
      SELECT 
        wi.id as instance_id,
        wi.workbook_id,
        wi.data,
        wi.last_saved_at,
        wi.last_saved_at as instance_created_at,
        w.title as workbook_title,
        w.name as workbook_name,
        w.type_id as workbook_type,
        w.tier as workbook_tier,
        (SELECT COUNT(*) FROM workbook_answers wa WHERE wa.instance_id = wi.id) as answers_count
      FROM workbook_instances wi
      LEFT JOIN workbooks w ON wi.workbook_id = w.id
      WHERE LOWER(wi.user_id::text) = LOWER($1)
      ORDER BY wi.last_saved_at DESC NULLS LAST
    `, [userId]);
    
    // Format workbooks with progress data
    const workbooks = workbooksResult.rows.map(wb => {
      const progressData = wb.data || {};
      return {
        workbookId: wb.workbook_id,
        workbookTitle: wb.workbook_title,
        workbookName: wb.workbook_name,
        workbookType: wb.workbook_type,
        workbookTier: wb.workbook_tier,
        instanceId: wb.instance_id,
        progress: progressData.overallProgress || 0,
        completed: progressData.completed || false,
        lastSavedAt: wb.last_saved_at,
        instanceCreatedAt: wb.instance_created_at,
        answersCount: parseInt(wb.answers_count) || 0,
        progressData: progressData
      };
    });
    
    // Calculate summary stats
    const totalWorkbooks = workbooks.length;
    const completedWorkbooks = workbooks.filter(wb => wb.completed).length;
    const inProgressWorkbooks = totalWorkbooks - completedWorkbooks;
    
    console.log(`✅ [Admin] Found ${totalWorkbooks} workbooks for user ${userId}`);
    console.log(`   Completed: ${completedWorkbooks}, In Progress: ${inProgressWorkbooks}`);
    
    res.json({
      success: true,
      userId: user.id,
      email: user.email,
      name: user.name,
      userType: user.type_id,
      userTier: user.tier,
      totalWorkbooks,
      completedWorkbooks,
      inProgressWorkbooks,
      workbooks
    });
    
  } catch (error) {
    console.error('❌ [Admin] Get user workbooks progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user workbooks progress',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get workbook instance details with all answers
 * GET /api/admin/workbooks/instances/:instanceId
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getWorkbookInstanceDetails = async (req, res) => {
  try {
    const { instanceId } = req.params;
    
    console.log(`📊 [Admin] Getting instance details: ${instanceId}`);
    
    // Validate UUID format (accepts all UUID versions, case-insensitive)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;
    if (!uuidRegex.test(instanceId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid instance ID format. Must be a valid UUID.'
      });
    }
    
    // Get instance details with workbook and user info
    // FIXED: Removed wi.created_at (doesn't exist in workbook_instances table)
    const instanceResult = await query(`
      SELECT 
        wi.id,
        wi.user_id,
        wi.workbook_id,
        wi.data,
        wi.last_saved_at,
        wi.last_saved_at as instance_created_at,
        w.title as workbook_title,
        w.name as workbook_name,
        w.type_id as workbook_type,
        w.tier as workbook_tier,
        w.json_structure,
        u.email as user_email,
        u.name as user_name
      FROM workbook_instances wi
      LEFT JOIN workbooks w ON wi.workbook_id = w.id
      LEFT JOIN users u ON LOWER(wi.user_id::text) = LOWER(u.id::text)
      WHERE wi.id = $1
    `, [instanceId]);
    
    if (instanceResult.rows.length === 0) {
      console.log(`❌ [Admin] Instance not found: ${instanceId}`);
      return res.status(404).json({
        success: false,
        error: 'Workbook instance not found'
      });
    }
    
    const instance = instanceResult.rows[0];
    const progressData = instance.data || {};
    
    // Get all answers for this instance
    const answersResult = await query(`
      SELECT 
        field_key,
        value,
        created_at,
        updated_at
      FROM workbook_answers
      WHERE instance_id = $1
      ORDER BY updated_at DESC
    `, [instanceId]);
    
    // Convert answers array to object { fieldKey: value }
    const answers = {};
    answersResult.rows.forEach(row => {
      // Value is already JSONB, so we get it directly
      answers[row.field_key] = row.value;
    });
    
    // Calculate total fields from workbook structure if available
    let totalFields = 0;
    if (instance.json_structure) {
      try {
        const structure = typeof instance.json_structure === 'string' 
          ? JSON.parse(instance.json_structure) 
          : instance.json_structure;
        
        // Count fields in structure (adjust based on actual structure format)
        const countFields = (obj) => {
          if (!obj) return 0;
          let count = 0;
          
          if (obj.modules && Array.isArray(obj.modules)) {
            obj.modules.forEach(module => {
              if (module.sections && Array.isArray(module.sections)) {
                count += module.sections.length;
              }
            });
          }
          
          return count;
        };
        
        totalFields = countFields(structure);
      } catch (parseError) {
        console.error('Error parsing workbook structure:', parseError);
      }
    }
    
    const answeredFields = Object.keys(answers).length;
    const completionPercentage = totalFields > 0 
      ? Math.round((answeredFields / totalFields) * 100) 
      : 0;
    
    console.log(`✅ [Admin] Retrieved instance ${instanceId}`);
    console.log(`   User: ${instance.user_email}`);
    console.log(`   Workbook: ${instance.workbook_title}`);
    console.log(`   Completion: ${completionPercentage}% (${answeredFields}/${totalFields} fields)`);
    
    res.json({
      success: true,
      instance: {
        id: instance.id,
        userId: instance.user_id,
        userEmail: instance.user_email,
        userName: instance.user_name,
        workbookId: instance.workbook_id,
        workbookTitle: instance.workbook_title,
        workbookName: instance.workbook_name,
        workbookType: instance.workbook_type,
        workbookTier: instance.workbook_tier,
        lastSavedAt: instance.last_saved_at,
        instanceCreatedAt: instance.instance_created_at,
        progressData: progressData,
        answers: answers,
        stats: {
          totalFields,
          answeredFields,
          completionPercentage
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [Admin] Get instance details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workbook instance details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get complete workbook structure with user's progress and answers
 * GET /api/admin/users/:userId/workbooks/:workbookId/full
 * 
 * Similar to what iOS gets, but accessible by admin for monitoring
 * Returns the complete workbook structure + user's instance data + answers
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getFullWorkbookWithUserData = async (req, res) => {
  try {
    const { userId, workbookId } = req.params;

    console.log(`📚 [Admin] Getting full workbook ${workbookId} for user ${userId}`);

    // Validate UUID formats
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;
    
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format. Must be a valid UUID.'
      });
    }
    
    if (!uuidRegex.test(workbookId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid workbook ID format. Must be a valid UUID.'
      });
    }

    // 1. Get workbook structure from workbooks table
    const workbookResult = await query(`
      SELECT 
        id,
        name,
        title,
        type_id,
        tier,
        json_structure,
        created_at,
        original_filename
      FROM workbooks
      WHERE id = $1
    `, [workbookId]);
    
    if (workbookResult.rows.length === 0) {
      console.log(`❌ [Admin] Workbook not found: ${workbookId}`);
      return res.status(404).json({
        success: false,
        error: 'Workbook not found'
      });
    }

    const workbook = workbookResult.rows[0];

    // 2. Check if user exists
    const userResult = await query(
      'SELECT id, email, name, type_id, tier FROM users WHERE LOWER(id::text) = LOWER($1)',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`❌ [Admin] User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];

    // 3. Get user's workbook instance (if exists)
    const instanceResult = await query(`
      SELECT 
        id,
        user_id,
        workbook_id,
        data,
        last_saved_at
      FROM workbook_instances
      WHERE LOWER(user_id::text) = LOWER($1) AND workbook_id = $2
    `, [userId, workbookId]);
    
    let userInstance = null;
    let userProgress = null;
    let answers = {};
    
    if (instanceResult.rows.length > 0) {
      userInstance = instanceResult.rows[0];
      userProgress = userInstance.data; // This contains modules with progress
      
      // 4. Get all answers for this instance from workbook_answers table
      const answersResult = await query(`
        SELECT 
          field_key,
          value,
          created_at,
          updated_at
        FROM workbook_answers
        WHERE instance_id = $1
        ORDER BY updated_at DESC
      `, [userInstance.id]);
      
      // Convert answers array to object { fieldKey: value }
      answersResult.rows.forEach(row => {
        answers[row.field_key] = row.value;
      });
    }

    // 5. Calculate overall progress
    let overallProgress = 0;
    let isCompleted = false;
    
    if (userProgress && userProgress.modules && userProgress.modules.length > 0) {
      const totalProgress = userProgress.modules.reduce((sum, module) => {
        return sum + (module.progress || 0);
      }, 0);
      overallProgress = (totalProgress / userProgress.modules.length) * 100;
      
      // Check if all modules are completed
      isCompleted = userProgress.modules.every(module => module.completed === true);
    }
    
    // Also check the top-level completed flag
    if (userProgress && userProgress.completed === true) {
      isCompleted = true;
    }

    // 6. Parse workbook structure
    let structure = null;
    if (workbook.json_structure) {
      try {
        structure = typeof workbook.json_structure === 'string' 
          ? JSON.parse(workbook.json_structure) 
          : workbook.json_structure;
      } catch (e) {
        console.error('Error parsing workbook structure:', e);
        structure = workbook.json_structure;
      }
    }

    // 7. Build response
    const fullWorkbook = {
      workbook: {
        id: workbook.id,
        name: workbook.name,
        title: workbook.title,
        typeId: workbook.type_id,
        tier: workbook.tier,
        structure: structure, // Complete workbook structure (modules, sections, questions)
        createdAt: workbook.created_at,
        originalFilename: workbook.original_filename
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        typeId: user.type_id,
        tier: user.tier
      },
      instance: userInstance ? {
        id: userInstance.id,
        userId: userInstance.user_id,
        workbookId: userInstance.workbook_id,
        lastSavedAt: userInstance.last_saved_at,
        progressData: userProgress // User's module-level progress
      } : null,
      answers: answers, // User's answers from workbook_answers table
      answersCount: Object.keys(answers).length,
      hasStarted: userInstance !== null,
      overallProgress: Math.round(overallProgress * 100) / 100, // Round to 2 decimals
      isCompleted: isCompleted
    };

    console.log(`✅ [Admin] Successfully retrieved full workbook for user ${userId}`);
    console.log(`   Workbook: ${workbook.title}`);
    console.log(`   User: ${user.email}`);
    console.log(`   Has Started: ${userInstance !== null}`);
    console.log(`   Progress: ${fullWorkbook.overallProgress}%`);
    console.log(`   Answers: ${fullWorkbook.answersCount}`);
    console.log(`   Completed: ${isCompleted}`);

    res.json({
      success: true,
      data: fullWorkbook
    });

  } catch (error) {
    console.error('❌ [Admin] Get full workbook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get full workbook data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// /**
//  * Admin Workbook Controller
//  * Handles admin endpoints for viewing users' workbook progress, answers, and completion status
//  */

// const { query } = require('../config/database');

// /**
//  * Get all users' workbook progress
//  * GET /api/admin/workbooks/progress
//  * 
//  * Query params:
//  * - limit (default: 50) - Number of records to return
//  * - offset (default: 0) - Pagination offset
//  * - completed (optional) - Filter by completion status (true/false)
//  * 
//  * @param {Object} req - Express request object
//  * @param {Object} res - Express response object
//  */
// exports.getAllUsersProgress = async (req, res) => {
//   try {
//     const { limit = 50, offset = 0, completed } = req.query;
//     const parsedLimit = Math.min(parseInt(limit) || 50, 100); // Max 100
//     const parsedOffset = parseInt(offset) || 0;
    
//     console.log(`📊 [Admin] Getting workbook progress for all users`);
//     console.log(`   Limit: ${parsedLimit}, Offset: ${parsedOffset}, Completed filter: ${completed}`);
    
//     // Build completion filter
//     let completedFilter = '';
//     const params = [];
//     let paramCount = 0;
    
//     if (completed !== undefined) {
//       const isCompleted = completed === 'true' || completed === true;
//       paramCount++;
//       completedFilter = `WHERE COALESCE((wi.data->>'completed')::boolean, false) = $${paramCount}`;
//       params.push(isCompleted);
//     }
    
//     // Get total count of users with workbook instances
//     const countQuery = await query(`
//       SELECT COUNT(DISTINCT wi.user_id) as total
//       FROM workbook_instances wi
//       LEFT JOIN users u ON LOWER(wi.user_id::text) = LOWER(u.id::text)
//       ${completedFilter}
//     `, params);
    
//     const totalUsers = parseInt(countQuery.rows[0].total) || 0;
    
//     // Get users with their workbook progress
//     paramCount++;
//     params.push(parsedLimit);
//     const limitParam = paramCount;
    
//     paramCount++;
//     params.push(parsedOffset);
//     const offsetParam = paramCount;
    
//     const usersQuery = await query(`
//       WITH user_workbook_stats AS (
//         SELECT 
//           wi.user_id,
//           COUNT(DISTINCT wi.id) as total_workbooks,
//           COUNT(DISTINCT CASE WHEN COALESCE((wi.data->>'completed')::boolean, false) = true THEN wi.id END) as completed_workbooks,
//           MAX(wi.last_saved_at) as last_activity
//         FROM workbook_instances wi
//         ${completedFilter}
//         GROUP BY wi.user_id
//       )
//       SELECT 
//         uws.user_id,
//         u.email,
//         u.name,
//         uws.total_workbooks,
//         uws.completed_workbooks,
//         (uws.total_workbooks - uws.completed_workbooks) as in_progress_workbooks,
//         uws.last_activity
//       FROM user_workbook_stats uws
//       LEFT JOIN users u ON LOWER(uws.user_id::text) = LOWER(u.id::text)
//       ORDER BY uws.last_activity DESC NULLS LAST
//       LIMIT $${limitParam} OFFSET $${offsetParam}
//     `, params);
    
//     // Get workbook details for each user
//     const usersWithWorkbooks = await Promise.all(
//       usersQuery.rows.map(async (user) => {
//         // Get workbook instances for this user
//         const workbooksResult = await query(`
//           SELECT 
//             wi.id as instance_id,
//             wi.workbook_id,
//             w.title as workbook_title,
//             w.name as workbook_name,
//             COALESCE((wi.data->>'overallProgress')::float, 0) as progress,
//             COALESCE((wi.data->>'completed')::boolean, false) as completed,
//             wi.last_saved_at,
//             (SELECT COUNT(*) FROM workbook_answers wa WHERE wa.instance_id = wi.id) as answers_count
//           FROM workbook_instances wi
//           LEFT JOIN workbooks w ON wi.workbook_id = w.id
//           WHERE LOWER(wi.user_id::text) = LOWER($1)
//           ORDER BY wi.last_saved_at DESC NULLS LAST
//         `, [user.user_id]);
        
//         // Calculate overall progress
//         const totalProgress = workbooksResult.rows.reduce((sum, wb) => sum + (wb.progress || 0), 0);
//         const overallProgress = workbooksResult.rows.length > 0 
//           ? totalProgress / workbooksResult.rows.length 
//           : 0;
        
//         return {
//           userId: user.user_id,
//           email: user.email,
//           name: user.name,
//           totalWorkbooks: parseInt(user.total_workbooks) || 0,
//           completedWorkbooks: parseInt(user.completed_workbooks) || 0,
//           inProgressWorkbooks: parseInt(user.in_progress_workbooks) || 0,
//           overallProgress: Math.round(overallProgress * 100) / 100,
//           lastActivity: user.last_activity,
//           workbooks: workbooksResult.rows.map(wb => ({
//             workbookId: wb.workbook_id,
//             workbookTitle: wb.workbook_title,
//             workbookName: wb.workbook_name,
//             instanceId: wb.instance_id,
//             progress: wb.progress || 0,
//             completed: wb.completed || false,
//             lastSavedAt: wb.last_saved_at,
//             answersCount: parseInt(wb.answers_count) || 0
//           }))
//         };
//       })
//     );
    
//     console.log(`✅ [Admin] Retrieved workbook progress for ${usersWithWorkbooks.length} users`);
    
//     res.json({
//       success: true,
//       totalUsers,
//       pagination: {
//         limit: parsedLimit,
//         offset: parsedOffset,
//         hasMore: (parsedOffset + parsedLimit) < totalUsers
//       },
//       users: usersWithWorkbooks
//     });
    
//   } catch (error) {
//     console.error('❌ [Admin] Get all users progress error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to get users workbook progress',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * Get specific user's workbook progress
//  * GET /api/admin/users/:userId/workbooks/progress
//  * 
//  * @param {Object} req - Express request object
//  * @param {Object} res - Express response object
//  */
// exports.getUserWorkbooksProgress = async (req, res) => {
//   try {
//     const { userId } = req.params;
    
//     console.log(`📊 [Admin] Getting workbooks progress for user: ${userId}`);
    
//     // Validate UUID format (accepts all UUID versions, case-insensitive)
//     const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;
//     if (!uuidRegex.test(userId)) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid user ID format. Must be a valid UUID.'
//       });
//     }
    
//     // Check if user exists
//     const userResult = await query(
//       'SELECT id, email, name, type_id, tier FROM users WHERE LOWER(id::text) = LOWER($1)',
//       [userId]
//     );
    
//     if (userResult.rows.length === 0) {
//       console.log(`❌ [Admin] User not found: ${userId}`);
//       return res.status(404).json({
//         success: false,
//         error: 'User not found'
//       });
//     }
    
//     const user = userResult.rows[0];
    
//     // Get user's workbook instances with detailed progress
//     const workbooksResult = await query(`
//       SELECT 
//         wi.id as instance_id,
//         wi.workbook_id,
//         wi.data,
//         wi.last_saved_at,
//         wi.created_at as instance_created_at,
//         w.title as workbook_title,
//         w.name as workbook_name,
//         w.type_id as workbook_type,
//         w.tier as workbook_tier,
//         (SELECT COUNT(*) FROM workbook_answers wa WHERE wa.instance_id = wi.id) as answers_count
//       FROM workbook_instances wi
//       LEFT JOIN workbooks w ON wi.workbook_id = w.id
//       WHERE LOWER(wi.user_id::text) = LOWER($1)
//       ORDER BY wi.last_saved_at DESC NULLS LAST
//     `, [userId]);
    
//     // Format workbooks with progress data
//     const workbooks = workbooksResult.rows.map(wb => {
//       const progressData = wb.data || {};
//       return {
//         workbookId: wb.workbook_id,
//         workbookTitle: wb.workbook_title,
//         workbookName: wb.workbook_name,
//         workbookType: wb.workbook_type,
//         workbookTier: wb.workbook_tier,
//         instanceId: wb.instance_id,
//         progress: progressData.overallProgress || 0,
//         completed: progressData.completed || false,
//         lastSavedAt: wb.last_saved_at,
//         instanceCreatedAt: wb.instance_created_at,
//         answersCount: parseInt(wb.answers_count) || 0,
//         progressData: progressData
//       };
//     });
    
//     // Calculate summary stats
//     const totalWorkbooks = workbooks.length;
//     const completedWorkbooks = workbooks.filter(wb => wb.completed).length;
//     const inProgressWorkbooks = totalWorkbooks - completedWorkbooks;
    
//     console.log(`✅ [Admin] Found ${totalWorkbooks} workbooks for user ${userId}`);
//     console.log(`   Completed: ${completedWorkbooks}, In Progress: ${inProgressWorkbooks}`);
    
//     res.json({
//       success: true,
//       userId: user.id,
//       email: user.email,
//       name: user.name,
//       userType: user.type_id,
//       userTier: user.tier,
//       totalWorkbooks,
//       completedWorkbooks,
//       inProgressWorkbooks,
//       workbooks
//     });
    
//   } catch (error) {
//     console.error('❌ [Admin] Get user workbooks progress error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to get user workbooks progress',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * Get workbook instance details with all answers
//  * GET /api/admin/workbooks/instances/:instanceId
//  * 
//  * @param {Object} req - Express request object
//  * @param {Object} res - Express response object
//  */
// exports.getWorkbookInstanceDetails = async (req, res) => {
//   try {
//     const { instanceId } = req.params;
    
//     console.log(`📊 [Admin] Getting instance details: ${instanceId}`);
    
//     // Validate UUID format (accepts all UUID versions, case-insensitive)
//     const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;
//     if (!uuidRegex.test(instanceId)) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid instance ID format. Must be a valid UUID.'
//       });
//     }
    
//     // Get instance details with workbook and user info
//     const instanceResult = await query(`
//       SELECT 
//         wi.id,
//         wi.user_id,
//         wi.workbook_id,
//         wi.data,
//         wi.last_saved_at,
//         wi.created_at as instance_created_at,
//         w.title as workbook_title,
//         w.name as workbook_name,
//         w.type_id as workbook_type,
//         w.tier as workbook_tier,
//         w.json_structure,
//         u.email as user_email,
//         u.name as user_name
//       FROM workbook_instances wi
//       LEFT JOIN workbooks w ON wi.workbook_id = w.id
//       LEFT JOIN users u ON LOWER(wi.user_id::text) = LOWER(u.id::text)
//       WHERE wi.id = $1
//     `, [instanceId]);
    
//     if (instanceResult.rows.length === 0) {
//       console.log(`❌ [Admin] Instance not found: ${instanceId}`);
//       return res.status(404).json({
//         success: false,
//         error: 'Workbook instance not found'
//       });
//     }
    
//     const instance = instanceResult.rows[0];
//     const progressData = instance.data || {};
    
//     // Get all answers for this instance
//     const answersResult = await query(`
//       SELECT 
//         field_key,
//         value,
//         created_at,
//         updated_at
//       FROM workbook_answers
//       WHERE instance_id = $1
//       ORDER BY updated_at DESC
//     `, [instanceId]);
    
//     // Convert answers array to object { fieldKey: value }
//     const answers = {};
//     answersResult.rows.forEach(row => {
//       // Value is already JSONB, so we get it directly
//       answers[row.field_key] = row.value;
//     });
    
//     // Calculate total fields from workbook structure if available
//     let totalFields = 0;
//     if (instance.json_structure) {
//       try {
//         const structure = typeof instance.json_structure === 'string' 
//           ? JSON.parse(instance.json_structure) 
//           : instance.json_structure;
        
//         // Count fields in structure (adjust based on actual structure format)
//         const countFields = (obj) => {
//           if (!obj) return 0;
//           let count = 0;
          
//           // Handle array of sections/modules
//           if (Array.isArray(obj)) {
//             obj.forEach(item => {
//               count += countFields(item);
//             });
//           } else if (typeof obj === 'object') {
//             // Count fields in current object
//             if (obj.fields && Array.isArray(obj.fields)) {
//               count += obj.fields.length;
//             }
//             // Recurse into nested structures
//             if (obj.sections && Array.isArray(obj.sections)) {
//               obj.sections.forEach(section => {
//                 count += countFields(section);
//               });
//             }
//             if (obj.modules && Array.isArray(obj.modules)) {
//               obj.modules.forEach(module => {
//                 count += countFields(module);
//               });
//             }
//             if (obj.pages && Array.isArray(obj.pages)) {
//               obj.pages.forEach(page => {
//                 count += countFields(page);
//               });
//             }
//           }
          
//           return count;
//         };
        
//         totalFields = countFields(structure);
//       } catch (e) {
//         console.log(`⚠️ [Admin] Could not parse workbook structure: ${e.message}`);
//       }
//     }
    
//     const answersCount = answersResult.rows.length;
    
//     console.log(`✅ [Admin] Found instance with ${answersCount} answers`);
//     console.log(`   Workbook: ${instance.workbook_title}`);
//     console.log(`   User: ${instance.user_email}`);
//     console.log(`   Progress: ${((progressData.overallProgress || 0) * 100).toFixed(0)}%`);
    
//     res.json({
//       success: true,
//       instance: {
//         id: instance.id,
//         userId: instance.user_id,
//         userEmail: instance.user_email,
//         userName: instance.user_name,
//         workbookId: instance.workbook_id,
//         workbookTitle: instance.workbook_title,
//         workbookName: instance.workbook_name,
//         workbookType: instance.workbook_type,
//         workbookTier: instance.workbook_tier,
//         progress: progressData.overallProgress || 0,
//         completed: progressData.completed || false,
//         lastSavedAt: instance.last_saved_at,
//         createdAt: instance.instance_created_at
//       },
//       answers,
//       progressData,
//       answersCount,
//       totalFields: totalFields || null,
//       completionRate: totalFields > 0 
//         ? Math.round((answersCount / totalFields) * 100) / 100 
//         : null
//     });
    
//   } catch (error) {
//     console.error('❌ [Admin] Get instance details error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to get workbook instance details',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// module.exports = exports;

