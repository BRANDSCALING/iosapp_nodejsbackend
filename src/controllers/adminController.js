/**
 * Admin Controller
 * Handles user management and dashboard stats for admin portal
 */

const { query } = require('../config/database');

/**
 * Get all users with pagination and filtering
 * GET /api/admin/users
 * 
 * Query params:
 * - page (default: 1)
 * - limit (default: 50)
 * - search (email or name)
 * - type (architect, alchemist, mixed)
 * - tier (free, basic, standard, pro, elite)
 */
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, type, tier } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    // Add search filter
    if (search) {
      paramCount++;
      whereClause += ` AND (u.email ILIKE $${paramCount} OR u.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    // Add type filter
    if (type) {
      paramCount++;
      whereClause += ` AND u.type_id = $${paramCount}`;
      params.push(type);
    }
    
    // Add tier filter
    if (tier) {
      paramCount++;
      whereClause += ` AND u.tier = $${paramCount}`;
      params.push(tier);
    }
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);
    
    // Get users with E-DNA profile and activity stats
    paramCount++;
    const limitParam = paramCount;
    params.push(parseInt(limit));
    
    paramCount++;
    const offsetParam = paramCount;
    params.push(offset);
    
    const result = await query(
      `SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.type_id, 
        u.tier, 
        u.created_at,
        u.updated_at,
        e.core_type,
        e.subtype,
        e.confidence,
        e.completion_percentage,
        (SELECT COUNT(*) FROM workbook_instances wi WHERE LOWER(wi.user_id::text) = LOWER(u.id::text)) as workbooks_started,
        (SELECT COUNT(*) FROM user_quiz_results qr WHERE LOWER(qr.user_id::text) = LOWER(u.id::text)) as quiz_completions
      FROM users u
      LEFT JOIN edna_profiles e ON LOWER(u.id::text) = LOWER(e.user_id::text)
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    );
    
    console.log(`✅ [Admin] Retrieved ${result.rows.length} users (page ${page})`);
    
    res.json({
      success: true,
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ [Admin] Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
};

/**
 * Get user details with quiz results and workbook progress
 * GET /api/admin/users/:id
 */
exports.getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user info with E-DNA profile
    const userResult = await query(
      `SELECT 
        u.id, u.email, u.name, u.type_id, u.tier, u.created_at, u.updated_at,
        e.core_type, e.subtype, e.confidence, e.completion_percentage, e.updated_at as profile_updated_at
       FROM users u
       LEFT JOIN edna_profiles e ON LOWER(u.id::text) = LOWER(e.user_id::text)
       WHERE LOWER(u.id::text) = LOWER($1)`,
      [id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get quiz results
    const quizResult = await query(
      `SELECT id, session_id, layer1_core_type, layer1_strength, 
              layer1_architect_score, layer1_alchemist_score,
              layer2_subtype, completed_at, retake_available_at
       FROM user_quiz_results 
       WHERE LOWER(user_id::text) = LOWER($1) 
       ORDER BY completed_at DESC`,
      [id]
    );
    
    // Get quiz answer history
    const answersResult = await query(
      `SELECT 
        p.layer_number,
        COUNT(*) as answers_count,
        MAX(p.answered_at) as last_answered
       FROM user_quiz_progress p
       WHERE LOWER(p.user_id::text) = LOWER($1)
       GROUP BY p.layer_number
       ORDER BY p.layer_number`,
      [id]
    );
    
    // Get workbook progress
    const workbooksResult = await query(
      `SELECT 
        wi.id as instance_id,
        wi.workbook_id,
        wi.data,
        wi.last_saved_at,
        w.title,
        w.name,
        w.type_id as workbook_type,
        w.tier as workbook_tier,
        (SELECT COUNT(*) FROM workbook_answers wa WHERE wa.instance_id = wi.id) as answers_count
       FROM workbook_instances wi
       JOIN workbooks w ON wi.workbook_id = w.id
       WHERE LOWER(wi.user_id::text) = LOWER($1)
       ORDER BY wi.last_saved_at DESC NULLS LAST`,
      [id]
    );
    
    console.log(`✅ [Admin] Retrieved details for user: ${id}`);
    
    res.json({
      success: true,
      user: userResult.rows[0],
      quizResults: quizResult.rows,
      quizProgress: answersResult.rows,
      workbooks: workbooksResult.rows
    });
    
  } catch (error) {
    console.error('❌ [Admin] Get user details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user details'
    });
  }
};

/**
 * Update user tier
 * PUT /api/admin/users/:id/tier
 */
exports.updateUserTier = async (req, res) => {
  try {
    const { id } = req.params;
    const { tier } = req.body;
    
    const validTiers = ['free', 'basic', 'standard', 'pro', 'elite'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({
        success: false,
        error: `Invalid tier. Must be one of: ${validTiers.join(', ')}`
      });
    }
    
    const result = await query(
      `UPDATE users 
       SET tier = $1, updated_at = NOW() 
       WHERE LOWER(id::text) = LOWER($2)
       RETURNING id, email, tier`,
      [tier, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    console.log(`✅ [Admin] Updated tier for user ${id} to: ${tier}`);
    
    res.json({
      success: true,
      user: result.rows[0],
      message: `User tier updated to ${tier}`
    });
    
  } catch (error) {
    console.error('❌ [Admin] Update user tier error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user tier'
    });
  }
};

/**
 * Get dashboard statistics
 * GET /api/admin/stats
 */
exports.getStats = async (req, res) => {
  try {
    // Get overall stats
    const statsResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE type_id IS NOT NULL) as users_completed_quiz,
        (SELECT COUNT(*) FROM users WHERE type_id = 'architect') as architect_count,
        (SELECT COUNT(*) FROM users WHERE type_id = 'alchemist') as alchemist_count,
        (SELECT COUNT(*) FROM users WHERE type_id = 'mixed') as mixed_count,
        (SELECT COUNT(*) FROM workbooks) as total_workbooks,
        (SELECT COUNT(*) FROM workbook_instances) as workbook_instances,
        (SELECT COUNT(*) FROM quiz_sessions WHERE created_at > NOW() - INTERVAL '7 days') as active_users_week,
        (SELECT COUNT(*) FROM quiz_sessions WHERE created_at > NOW() - INTERVAL '30 days') as active_users_month
    `);
    
    // Get tier breakdown
    const tierResult = await query(`
      SELECT tier, COUNT(*) as count
      FROM users
      GROUP BY tier
      ORDER BY 
        CASE tier 
          WHEN 'free' THEN 1
          WHEN 'basic' THEN 2
          WHEN 'standard' THEN 3
          WHEN 'pro' THEN 4
          WHEN 'elite' THEN 5
        END
    `);
    
    // Get recent activity (last 7 days)
    const activityResult = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as quiz_starts
      FROM quiz_sessions
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    console.log('✅ [Admin] Retrieved dashboard stats');
    
    res.json({
      success: true,
      stats: statsResult.rows[0],
      tierBreakdown: tierResult.rows,
      recentActivity: activityResult.rows
    });
    
  } catch (error) {
    console.error('❌ [Admin] Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats'
    });
  }
};

/**
 * Get all workbooks
 * GET /api/admin/workbooks
 */
exports.getWorkbooks = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        w.id,
        w.name,
        w.title,
        w.type_id,
        w.tier,
        w.original_filename,
        w.file_type,
        w.created_at,
        (SELECT COUNT(*) FROM workbook_instances wi WHERE wi.workbook_id = w.id) as instances_count,
        (SELECT COUNT(*) FROM workbook_instances wi 
         WHERE wi.workbook_id = w.id 
         AND (wi.data->>'completed')::boolean = true) as completed_count
      FROM workbooks w
      ORDER BY w.created_at DESC
    `);
    
    console.log(`✅ [Admin] Retrieved ${result.rows.length} workbooks`);
    
    res.json({
      success: true,
      workbooks: result.rows
    });
    
  } catch (error) {
    console.error('❌ [Admin] Get workbooks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workbooks'
    });
  }
};

/**
 * Delete a workbook
 * DELETE /api/admin/workbooks/:id
 */
exports.deleteWorkbook = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if workbook exists
    const checkResult = await query(
      'SELECT id, title FROM workbooks WHERE id = $1::uuid',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workbook not found'
      });
    }
    
    const workbookTitle = checkResult.rows[0].title;
    
    // Delete workbook (cascades to instances and answers)
    await query('DELETE FROM workbooks WHERE id = $1::uuid', [id]);
    
    console.log(`✅ [Admin] Deleted workbook: ${workbookTitle} (${id})`);
    
    res.json({
      success: true,
      message: `Workbook "${workbookTitle}" deleted successfully`
    });
    
  } catch (error) {
    console.error('❌ [Admin] Delete workbook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete workbook'
    });
  }
};

/**
 * Get user E-DNA profile
 * GET /api/admin/users/:id/edna
 */
exports.getUserEdnaProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 [Admin] Getting complete E-DNA profile (all 7 layers) for user: ${id}`);
    
    // Check if user exists
    const userCheck = await query(
      'SELECT id, email, name, type_id, tier FROM users WHERE LOWER(id::text) = LOWER($1)',
      [id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get complete quiz results with ALL 7 layers
    const quizResult = await query(`
      SELECT 
        id, session_id,
        
        -- Layer 1: Core Identity
        layer1_core_type, layer1_strength,
        layer1_architect_score, layer1_alchemist_score,
        layer1_decision_loop, layer1_decision_process,
        
        -- Layer 2: Subtype
        layer2_subtype, layer2_description,
        layer2_strength, layer2_blind_spot,
        
        -- Layer 3: Mirror Awareness
        layer3_integration, layer3_integration_percent, layer3_description,
        
        -- Layer 4: Learning Style
        layer4_modality_preference, layer4_approach,
        layer4_concept_processing, layer4_working_environment, layer4_pace,
        
        -- Layer 5: Neurodiversity
        layer5_status, layer5_description, layer5_traits,
        
        -- Layer 6: Mindset & Personality
        layer6_mindset, layer6_personality, layer6_communication,
        
        -- Layer 7: Meta-Beliefs
        layer7_faith_orientation, layer7_control_orientation,
        layer7_fairness, layer7_integrity, layer7_growth, layer7_impact,
        
        -- Metadata
        completed_at, retake_available_at, created_at
      FROM user_quiz_results
      WHERE LOWER(user_id::text) = LOWER($1)
      ORDER BY completed_at DESC
      LIMIT 1
    `, [id]);
    
    // Build response with all 7 layers
    let ednaProfile = null;
    let allLayers = null;
    
    if (quizResult.rows.length > 0) {
      const quiz = quizResult.rows[0];
      
      // Basic E-DNA profile
      ednaProfile = {
        coreType: quiz.layer1_core_type,
        subtype: quiz.layer2_subtype,
        architectScore: quiz.layer1_architect_score || 0,
        alchemistScore: quiz.layer1_alchemist_score || 0,
        strength: quiz.layer1_strength,
        quizCompletedAt: quiz.completed_at
      };
      
      // Complete 7-layer profile
      allLayers = {
        layer1: {
          coreType: quiz.layer1_core_type,
          strength: quiz.layer1_strength,
          architectScore: quiz.layer1_architect_score,
          alchemistScore: quiz.layer1_alchemist_score,
          decisionLoop: quiz.layer1_decision_loop,
          decisionProcess: quiz.layer1_decision_process
        },
        layer2: {
          subtype: quiz.layer2_subtype,
          description: quiz.layer2_description,
          strength: quiz.layer2_strength,
          blindSpot: quiz.layer2_blind_spot
        },
        layer3: {
          integration: quiz.layer3_integration,
          integrationPercent: quiz.layer3_integration_percent,
          description: quiz.layer3_description
        },
        layer4: {
          modalityPreference: quiz.layer4_modality_preference,
          approach: quiz.layer4_approach,
          conceptProcessing: quiz.layer4_concept_processing,
          workingEnvironment: quiz.layer4_working_environment,
          pace: quiz.layer4_pace
        },
        layer5: {
          status: quiz.layer5_status,
          description: quiz.layer5_description,
          traits: quiz.layer5_traits
        },
        layer6: {
          mindset: quiz.layer6_mindset,
          personality: quiz.layer6_personality,
          communication: quiz.layer6_communication
        },
        layer7: {
          faithOrientation: quiz.layer7_faith_orientation,
          controlOrientation: quiz.layer7_control_orientation,
          fairness: quiz.layer7_fairness,
          integrity: quiz.layer7_integrity,
          growth: quiz.layer7_growth,
          impact: quiz.layer7_impact
        }
      };
    }
    
    console.log(`✅ [Admin] Got complete E-DNA profile for user: ${id}`);
    console.log(`   Layer 1: ${ednaProfile?.coreType || 'N/A'}`);
    console.log(`   Layer 2: ${allLayers?.layer2?.subtype || 'N/A'}`);
    console.log(`   Layer 3: ${allLayers?.layer3?.integration || 'N/A'}`);
    console.log(`   Layer 4: ${allLayers?.layer4?.modalityPreference || 'N/A'}`);
    console.log(`   Layer 5: ${allLayers?.layer5?.status || 'N/A'}`);
    console.log(`   Layer 6: ${allLayers?.layer6?.communication || 'N/A'}`);
    console.log(`   Layer 7: ${allLayers?.layer7?.faithOrientation || 'N/A'}`);
    
    res.json({
      success: true,
      userId: id,
      user: userCheck.rows[0],
      ednaProfile: ednaProfile,
      allLayers: allLayers,
      hasProfile: ednaProfile !== null
    });
    
  } catch (error) {
    console.error('❌ [Admin] Get user E-DNA profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user E-DNA profile'
    });
  }
};

/**
 * Get user workbooks
 * GET /api/admin/users/:id/workbooks
 */
exports.getUserWorkbooks = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 [Admin] Getting workbooks for user: ${id}`);
    
    // Check if user exists
    const userCheck = await query(
      'SELECT id, email, name FROM users WHERE LOWER(id::text) = LOWER($1)',
      [id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get workbook instances with workbook details
    const workbooksResult = await query(
      `SELECT 
        wi.id as instance_id,
        wi.workbook_id,
        wi.data,
        wi.last_saved_at,
        w.name,
        w.title,
        w.type_id,
        w.tier,
        w.json_structure,
        (SELECT COUNT(*) FROM workbook_answers wa WHERE wa.instance_id = wi.id) as answers_count
       FROM workbook_instances wi
       JOIN workbooks w ON wi.workbook_id = w.id
       WHERE LOWER(wi.user_id::text) = LOWER($1)
       ORDER BY wi.last_saved_at DESC NULLS LAST`,
      [id]
    );
    
    // Format response
    const workbooks = workbooksResult.rows.map(wb => ({
      instanceId: wb.instance_id,
      workbookId: wb.workbook_id,
      title: wb.title,
      name: wb.name,
      typeId: wb.type_id,
      tier: wb.tier,
      data: wb.data || {},
      lastSavedAt: wb.last_saved_at,
      completed: wb.data?.completed || false,
      answersCount: parseInt(wb.answers_count) || 0,
      structure: wb.json_structure
    }));
    
    console.log(`✅ [Admin] Got ${workbooks.length} workbooks for user: ${id}`);
    
    res.json({
      success: true,
      userId: id,
      user: userCheck.rows[0],
      workbooksCount: workbooks.length,
      workbooks: workbooks
    });
    
  } catch (error) {
    console.error('❌ [Admin] Get user workbooks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user workbooks'
    });
  }
};

/**
 * Upload/Create a new workbook
 * POST /api/admin/workbooks/upload
 */
exports.uploadWorkbook = async (req, res) => {
  try {
    // ============================================
    // DEBUG LOGGING - START
    // ============================================
    console.log('📤 [Admin] ========================================');
    console.log('📤 [Admin] WORKBOOK UPLOAD REQUEST RECEIVED');
    console.log('📤 [Admin] ========================================');
    console.log('📤 [Admin] Content-Type:', req.headers['content-type']);
    console.log('📤 [Admin] Body type:', typeof req.body);
    console.log('📤 [Admin] Body is null:', req.body === null);
    console.log('📤 [Admin] Body is undefined:', req.body === undefined);
    console.log('📤 [Admin] Body keys:', req.body ? Object.keys(req.body) : 'N/A');
    console.log('📤 [Admin] Full body:', JSON.stringify(req.body, null, 2));
    console.log('📤 [Admin] ----------------------------------------');
    console.log('📤 [Admin] Individual fields:');
    console.log('   - name:', req.body?.name);
    console.log('   - title:', req.body?.title);
    console.log('   - description:', req.body?.description);
    console.log('   - type_id:', req.body?.type_id);
    console.log('   - tier:', req.body?.tier);
    console.log('   - json_structure type:', typeof req.body?.json_structure);
    console.log('   - is_active:', req.body?.is_active);
    console.log('📤 [Admin] ========================================');
    // ============================================
    // DEBUG LOGGING - END
    // ============================================
    
    // Handle case where body might be empty
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('❌ [Admin] Request body is empty or not parsed!');
      return res.status(400).json({
        success: false,
        error: 'Request body is empty. Make sure Content-Type is application/json',
        debug: {
          contentType: req.headers['content-type'],
          bodyType: typeof req.body,
          bodyKeys: req.body ? Object.keys(req.body) : []
        }
      });
    }
    
    const { name, title, description, type_id, tier, json_structure, is_active } = req.body;
    
    console.log(`📤 [Admin] Processing workbook: ${name}`);
    
    // Validate required fields with specific error messages
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!title) missingFields.push('title');
    if (!type_id) missingFields.push('type_id');
    if (!tier) missingFields.push('tier');
    if (!json_structure) missingFields.push('json_structure');
    
    if (missingFields.length > 0) {
      console.log(`❌ [Admin] Missing required fields: ${missingFields.join(', ')}`);
      return res.status(400).json({
        success: false,
        error: `Missing required field(s): ${missingFields.join(', ')}`,
        missingFields: missingFields,
        receivedFields: Object.keys(req.body)
      });
    }
    
    // Validate type_id
    const validTypes = ['architect', 'alchemist', 'mixed'];
    if (!validTypes.includes(type_id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type_id. Must be one of: ${validTypes.join(', ')}`
      });
    }
    
    // Validate tier
    const validTiers = ['free', 'basic', 'standard', 'pro', 'elite'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({
        success: false,
        error: `Invalid tier. Must be one of: ${validTiers.join(', ')}`
      });
    }
    
    // Validate json_structure is an object
    if (typeof json_structure !== 'object' || json_structure === null) {
      return res.status(400).json({
        success: false,
        error: 'json_structure must be a valid JSON object'
      });
    }
    
    // Check if workbook name already exists
    const existingCheck = await query(
      'SELECT id FROM workbooks WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    
    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Workbook with name "${name}" already exists`
      });
    }
    
    // Log who is uploading
    console.log('📤 [Admin] Workbook being uploaded by admin:', req.admin?.email, req.admin?.id);
    
    // Get admin ID from auth middleware
    const adminId = req.admin?.id;
    
    if (!adminId) {
      console.log('❌ [Admin] No admin ID found in request - auth middleware may not be working');
      return res.status(401).json({
        success: false,
        error: 'Admin authentication required'
      });
    }
    
    // Insert workbook with proper UUID casting for created_by
    const result = await query(
      `INSERT INTO workbooks (
        name, 
        title, 
        json_structure, 
        type_id, 
        tier,
        created_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6::uuid, NOW())
      RETURNING id, name, title, type_id, tier, created_by, created_at`,
      [
        name,
        title,
        JSON.stringify(json_structure),
        type_id,
        tier,
        adminId
      ]
    );
    
    const createdWorkbook = result.rows[0];
    
    console.log('✅ [Admin] Workbook created with ID:', createdWorkbook.id);
    console.log('✅ [Admin] Created by admin ID:', createdWorkbook.created_by);
    
    console.log(`✅ [Admin] Uploaded workbook: ${name} (${createdWorkbook.id})`);
    
    res.status(201).json({
      success: true,
      message: 'Workbook uploaded successfully',
      workbook: {
        id: createdWorkbook.id,
        name: createdWorkbook.name,
        title: createdWorkbook.title,
        description: description || null,
        typeId: createdWorkbook.type_id,
        tier: createdWorkbook.tier,
        jsonStructure: json_structure,
        isActive: is_active !== false,
        createdAt: createdWorkbook.created_at
      }
    });
    
  } catch (error) {
    console.error('❌ [Admin] Upload workbook error:', error);
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        error: 'Workbook with this name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload workbook'
    });
  }
};

/**
 * Get user's full quiz results with answers
 * GET /api/admin/users/:id/quiz-results
 */
exports.getUserQuizResults = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📊 [Admin] Getting quiz results for user: ${id}`);
    
    // Get latest quiz result
    const resultQuery = await query(`
      SELECT 
        id,
        session_id,
        layer1_core_type,
        layer1_strength,
        layer1_architect_score,
        layer1_alchemist_score,
        layer2_subtype,
        layer2_description,
        layer3_result,
        layer4_result,
        layer5_result,
        layer6_result,
        layer7_result,
        completed_at,
        retake_available_at,
        created_at
      FROM user_quiz_results
      WHERE LOWER(user_id::text) = LOWER($1)
      ORDER BY completed_at DESC
      LIMIT 1
    `, [id]);
    
    if (resultQuery.rows.length === 0) {
      console.log(`⚠️ [Admin] No quiz results found for user: ${id}`);
      return res.status(404).json({ 
        success: false, 
        error: 'No quiz results found for this user' 
      });
    }
    
    const result = resultQuery.rows[0];
    
    console.log(`📊 [Admin] Found quiz result: ${result.layer1_core_type} (${result.layer1_strength})`);
    
    // Get all quiz answers with questions
    const answersQuery = await query(`
      SELECT 
        p.id,
        p.layer_number,
        p.answered_at,
        q.id as question_id,
        q.question_number,
        q.question_text,
        q.question_type,
        o.id as selected_option_id,
        o.option_key as selected_option_key,
        o.option_text as selected_option_text,
        o.option_description as selected_option_description,
        o.score_type as selected_score_type
      FROM user_quiz_progress p
      JOIN quiz_questions q ON p.question_id = q.id
      JOIN quiz_options o ON p.selected_option_id = o.id
      WHERE LOWER(p.user_id::text) = LOWER($1)
      ORDER BY p.layer_number, q.question_number
    `, [id]);
    
    console.log(`📊 [Admin] Found ${answersQuery.rows.length} quiz answers`);
    
    // Group answers by layer
    const answersByLayer = {};
    answersQuery.rows.forEach(a => {
      const layer = a.layer_number;
      if (!answersByLayer[layer]) {
        answersByLayer[layer] = [];
      }
      answersByLayer[layer].push({
        id: a.id,
        answeredAt: a.answered_at,
        question: {
          id: a.question_id,
          number: a.question_number,
          text: a.question_text,
          type: a.question_type
        },
        selectedOption: {
          id: a.selected_option_id,
          key: a.selected_option_key,
          text: a.selected_option_text,
          description: a.selected_option_description,
          scoreType: a.selected_score_type
        }
      });
    });
    
    // Format response
    const response = {
      success: true,
      result: {
        id: result.id,
        sessionId: result.session_id,
        layer1: {
          coreType: result.layer1_core_type,
          strength: result.layer1_strength,
          architectScore: result.layer1_architect_score,
          alchemistScore: result.layer1_alchemist_score
        },
        layer2: {
          subtype: result.layer2_subtype,
          description: result.layer2_description
        },
        layer3Result: result.layer3_result,
        layer4Result: result.layer4_result,
        layer5Result: result.layer5_result,
        layer6Result: result.layer6_result,
        layer7Result: result.layer7_result,
        completedAt: result.completed_at,
        retakeAvailableAt: result.retake_available_at,
        createdAt: result.created_at
      },
      totalAnswers: answersQuery.rows.length,
      layersCompleted: Object.keys(answersByLayer).map(Number).sort((a, b) => a - b),
      answersByLayer: answersByLayer
    };
    
    console.log(`✅ [Admin] Returning quiz results for user: ${id}`);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ [Admin] Error getting quiz results:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get quiz results'
    });
  }
};

module.exports = exports;

