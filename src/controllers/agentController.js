/**
 * Agent Controller
 * Endpoints for AI agent portal to access user data
 * Used by Rubab's agent system
 * 
 * Includes:
 * - User profile and data access
 * - User management (list, search, get by email)
 * - Session management
 * - Message management
 */

const { query } = require('../config/database');

// ============================================
// USER PROFILE ENDPOINTS (Existing)
// ============================================

/**
 * Get user E-DNA profile
 * GET /api/agent/users/:userId/profile
 */
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🤖 [Agent] Getting profile for user: ${userId}`);
    
    const result = await query(
      `SELECT 
        u.id, u.email, u.name, u.type_id, u.tier, u.created_at, u.updated_at,
        e.core_type, e.subtype, e.confidence, e.completion_percentage, e.updated_at as profile_updated_at
       FROM users u
       LEFT JOIN edna_profiles e ON LOWER(u.id::text) = LOWER(e.user_id::text)
       WHERE LOWER(u.id::text) = LOWER($1)`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      console.log(`⚠️ [Agent] User not found: ${userId}`);
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const user = result.rows[0];
    console.log(`✅ [Agent] Profile retrieved for: ${user.email}`);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      ednaProfile: user.core_type ? {
        typeId: user.type_id,
        coreType: user.core_type,
        subtype: user.subtype,
        confidence: user.confidence,
        completionPercentage: user.completion_percentage,
        updatedAt: user.profile_updated_at
      } : null
    });
    
  } catch (error) {
    console.error('❌ [Agent] Get user profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user profile' });
  }
};

/**
 * Get user workbooks with progress
 * GET /api/agent/users/:userId/workbooks
 */
exports.getUserWorkbooks = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🤖 [Agent] Getting workbooks for user: ${userId}`);
    
    const userCheck = await query(
      'SELECT id, email FROM users WHERE LOWER(id::text) = LOWER($1)',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      console.log(`⚠️ [Agent] User not found: ${userId}`);
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const workbooksResult = await query(
      `SELECT 
        wi.id as instance_id, wi.workbook_id, wi.data, wi.last_saved_at,
        w.name, w.title, w.type_id as workbook_type, w.tier as workbook_tier, w.json_structure
       FROM workbook_instances wi
       JOIN workbooks w ON wi.workbook_id = w.id
       WHERE LOWER(wi.user_id::text) = LOWER($1)
       ORDER BY wi.last_saved_at DESC NULLS LAST`,
      [userId]
    );
    
    const workbooks = [];
    for (const wb of workbooksResult.rows) {
      const answersResult = await query(
        'SELECT field_key, value, updated_at FROM workbook_answers WHERE instance_id = $1::uuid ORDER BY updated_at DESC',
        [wb.instance_id]
      );
      
      const answers = {};
      answersResult.rows.forEach(answer => {
        answers[answer.field_key] = answer.value;
      });
      
      workbooks.push({
        instanceId: wb.instance_id,
        workbookId: wb.workbook_id,
        name: wb.name,
        title: wb.title,
        workbookType: wb.workbook_type,
        workbookTier: wb.workbook_tier,
        completed: wb.data?.completed || false,
        lastSavedAt: wb.last_saved_at,
        answersCount: answersResult.rows.length,
        answers: answers,
        structure: wb.json_structure
      });
    }
    
    console.log(`✅ [Agent] Retrieved ${workbooks.length} workbooks for user: ${userId}`);
    
    res.json({
      success: true,
      userId: userId,
      workbooksCount: workbooks.length,
      workbooks: workbooks
    });
    
  } catch (error) {
    console.error('❌ [Agent] Get user workbooks error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user workbooks' });
  }
};

/**
 * Get user quiz history
 * GET /api/agent/users/:userId/quiz-history
 */
exports.getUserQuizHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🤖 [Agent] Getting quiz history for user: ${userId}`);
    
    const resultsResult = await query(
      `SELECT id, session_id, layer1_core_type, layer1_strength, layer1_architect_score, layer1_alchemist_score,
              layer2_subtype, completed_at, retake_available_at
       FROM user_quiz_results WHERE LOWER(user_id::text) = LOWER($1) ORDER BY completed_at DESC`,
      [userId]
    );
    
    const answersResult = await query(
      `SELECT p.layer_number, q.question_number, q.question_text, o.option_key as selected_option, o.option_text, o.score_type, p.answered_at
       FROM user_quiz_progress p
       JOIN quiz_questions q ON p.question_id = q.id
       JOIN quiz_options o ON p.selected_option_id = o.id
       WHERE LOWER(p.user_id::text) = LOWER($1)
       ORDER BY p.layer_number, q.question_number`,
      [userId]
    );
    
    const answersByLayer = {};
    answersResult.rows.forEach(answer => {
      const layer = answer.layer_number;
      if (!answersByLayer[layer]) answersByLayer[layer] = [];
      answersByLayer[layer].push({
        questionNumber: answer.question_number,
        questionText: answer.question_text,
        selectedOption: answer.selected_option,
        optionText: answer.option_text,
        scoreType: answer.score_type,
        answeredAt: answer.answered_at
      });
    });
    
    console.log(`✅ [Agent] Retrieved quiz history for user: ${userId}`);
    
    res.json({
      success: true,
      userId: userId,
      quizResults: resultsResult.rows,
      quizAnswers: answersByLayer,
      totalAnswers: answersResult.rows.length,
      layersCompleted: Object.keys(answersByLayer).map(Number)
    });
    
  } catch (error) {
    console.error('❌ [Agent] Get user quiz history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user quiz history' });
  }
};

/**
 * Get complete quiz results with all 7 layers
 * GET /api/agent/users/:userId/quiz-results
 * 
 * Returns the latest quiz result with detailed data for all 7 layers
 */
exports.getCompleteQuizResults = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`📊 [Agent] Getting complete quiz results for user: ${userId}`);
    
    // Get user info first
    const userResult = await query(
      `SELECT id, email, name, type_id, tier, created_at
       FROM users WHERE LOWER(id::text) = LOWER($1)`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`⚠️ [Agent] User not found: ${userId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    const user = userResult.rows[0];
    
    // Get latest quiz result with all 7 layers
    const quizResult = await query(`
      SELECT 
        id,
        user_id,
        session_id,
        completed_at,
        
        -- Layer 1: Core Identity
        layer1_core_type,
        layer1_strength,
        layer1_architect_score,
        layer1_alchemist_score,
        layer1_decision_loop,
        layer1_decision_process,
        
        -- Layer 2: Subtype Identity
        layer2_subtype,
        layer2_description,
        layer2_strength,
        layer2_blind_spot,
        
        -- Layer 3: Mirror Awareness
        layer3_integration,
        layer3_integration_percent,
        layer3_description,
        layer3_result,
        
        -- Layer 4: Learning Style
        layer4_modality_preference,
        layer4_approach,
        layer4_concept_processing,
        layer4_working_environment,
        layer4_pace,
        layer4_result,
        
        -- Layer 5: Neurodiversity
        layer5_status,
        layer5_description,
        layer5_traits,
        layer5_result,
        
        -- Layer 6: Mindset & Personality
        layer6_mindset,
        layer6_personality,
        layer6_communication,
        layer6_result,
        
        -- Layer 7: Meta-Beliefs
        layer7_faith_orientation,
        layer7_control_orientation,
        layer7_fairness,
        layer7_integrity,
        layer7_growth,
        layer7_impact,
        layer7_result,
        
        retake_available_at
      FROM user_quiz_results
      WHERE LOWER(user_id::text) = LOWER($1)
      ORDER BY completed_at DESC
      LIMIT 1
    `, [userId]);
    
    if (quizResult.rows.length === 0) {
      console.log(`⚠️ [Agent] No quiz results found for user: ${userId}`);
      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          createdAt: user.created_at
        },
        hasQuizResults: false,
        message: 'User has not completed the quiz yet'
      });
    }
    
    const data = quizResult.rows[0];
    
    // Log what layers have data
    console.log(`✅ [Agent] Quiz results found for user: ${userId}`);
    console.log(`   Layer 1: ${data.layer1_core_type || 'N/A'} (${data.layer1_strength || 'N/A'})`);
    console.log(`   Layer 2: ${data.layer2_subtype || 'N/A'}`);
    console.log(`   Layer 3: ${data.layer3_integration || 'N/A'}`);
    console.log(`   Layer 4: ${data.layer4_modality_preference || 'N/A'}`);
    console.log(`   Layer 5: ${data.layer5_status || 'N/A'}`);
    console.log(`   Layer 6: Mindset=${data.layer6_mindset ? 'Present' : 'N/A'}`);
    console.log(`   Layer 7: Faith=${data.layer7_faith_orientation || 'N/A'}`);
    
    // Format response with all 7 layers in camelCase
    const formattedResult = {
      id: data.id,
      userId: data.user_id,
      sessionId: data.session_id,
      completedAt: data.completed_at,
      
      // Layer 1: Core Identity
      layer1: {
        coreType: data.layer1_core_type,
        strength: data.layer1_strength,
        architectScore: data.layer1_architect_score,
        alchemistScore: data.layer1_alchemist_score,
        decisionLoop: data.layer1_decision_loop,
        decisionProcess: data.layer1_decision_process
      },
      
      // Layer 2: Subtype Identity
      layer2: {
        subtype: data.layer2_subtype,
        description: data.layer2_description,
        strength: data.layer2_strength,
        blindSpot: data.layer2_blind_spot
      },
      
      // Layer 3: Mirror Awareness
      layer3: {
        integration: data.layer3_integration,
        integrationPercent: data.layer3_integration_percent,
        description: data.layer3_description,
        result: data.layer3_result
      },
      
      // Layer 4: Learning Style
      layer4: {
        modalityPreference: data.layer4_modality_preference,
        approach: data.layer4_approach,
        conceptProcessing: data.layer4_concept_processing,
        workingEnvironment: data.layer4_working_environment,
        pace: data.layer4_pace,
        result: data.layer4_result
      },
      
      // Layer 5: Neurodiversity
      layer5: {
        status: data.layer5_status,
        description: data.layer5_description,
        traits: data.layer5_traits,
        result: data.layer5_result
      },
      
      // Layer 6: Mindset & Personality
      layer6: {
        mindset: data.layer6_mindset,
        personality: data.layer6_personality,
        communication: data.layer6_communication,
        result: data.layer6_result
      },
      
      // Layer 7: Meta-Beliefs / Core Values
      layer7: {
        faithOrientation: data.layer7_faith_orientation,
        controlOrientation: data.layer7_control_orientation,
        fairness: data.layer7_fairness,
        integrity: data.layer7_integrity,
        growth: data.layer7_growth,
        impact: data.layer7_impact,
        result: data.layer7_result
      },
      
      retakeAvailableAt: data.retake_available_at
    };
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        createdAt: user.created_at
      },
      hasQuizResults: true,
      quizResult: formattedResult
    });
    
  } catch (error) {
    console.error('❌ [Agent] Error getting complete quiz results:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get quiz results' 
    });
  }
};

// ============================================
// USER MANAGEMENT ENDPOINTS (New)
// ============================================

/**
 * Get all users with pagination and search
 * GET /api/agent/users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const search = req.query.search || '';
    const offset = (page - 1) * limit;
    
    console.log(`👥 [Agent] Getting all users (page: ${page}, limit: ${limit}, search: ${search})`);
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (search) {
      paramCount++;
      whereClause += ` AND (u.email ILIKE $${paramCount} OR u.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);
    
    // Get users
    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);
    
    const result = await query(
      `SELECT 
        u.id, u.email, u.name, u.type_id, u.tier, u.created_at,
        CASE WHEN qr.id IS NOT NULL THEN true ELSE false END as has_completed_quiz
       FROM users u
       LEFT JOIN (SELECT DISTINCT user_id, id FROM user_quiz_results) qr ON LOWER(u.id::text) = LOWER(qr.user_id::text)
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );
    
    const users = result.rows.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      typeId: u.type_id,
      tier: u.tier,
      hasCompletedQuiz: u.has_completed_quiz,
      createdAt: u.created_at
    }));
    
    console.log(`✅ [Agent] Retrieved ${users.length} users`);
    
    res.json({
      success: true,
      users: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('❌ [Agent] Get all users error:', error);
    res.status(500).json({ success: false, error: 'Failed to get users' });
  }
};

/**
 * Get user by ID
 * GET /api/agent/users/:userId
 */
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`👤 [Agent] Getting user by ID: ${userId}`);
    
    const result = await query(
      'SELECT id, email, name, type_id, tier, created_at, updated_at FROM users WHERE LOWER(id::text) = LOWER($1)',
      [userId]
    );
    
    if (result.rows.length === 0) {
      console.log(`⚠️ [Agent] User not found: ${userId}`);
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const user = result.rows[0];
    console.log(`✅ [Agent] User found: ${user.email}`);
    
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
    console.error('❌ [Agent] Get user by ID error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
};

/**
 * Get user by email
 * GET /api/agent/users/by-email/:email
 */
exports.getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log(`👤 [Agent] Getting user by email: ${email}`);
    
    const result = await query(
      'SELECT id, email, name, type_id, tier, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log(`⚠️ [Agent] User not found: ${email}`);
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const user = result.rows[0];
    console.log(`✅ [Agent] User found: ${user.id}`);
    
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
    console.error('❌ [Agent] Get user by email error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
};

// ============================================
// SESSION MANAGEMENT ENDPOINTS (New)
// ============================================

/**
 * Create a new session
 * POST /api/agent/sessions
 */
exports.createSession = async (req, res) => {
  try {
    const { userId, title, context } = req.body;
    const agentId = req.agent.id;
    
    console.log(`💬 [Agent] Creating session for user: ${userId}`);
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    
    // Verify user exists
    const userCheck = await query(
      'SELECT id FROM users WHERE LOWER(id::text) = LOWER($1)',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      console.log(`⚠️ [Agent] User not found: ${userId}`);
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Create session
    const result = await query(
      `INSERT INTO agent_sessions (user_id, agent_id, title, context)
       VALUES ($1::uuid, $2::uuid, $3, $4)
       RETURNING id, user_id, agent_id, title, context, is_active, started_at, created_at`,
      [userId, agentId, title || null, JSON.stringify(context || {})]
    );
    
    const session = result.rows[0];
    console.log(`✅ [Agent] Session created: ${session.id}`);
    
    res.status(201).json({
      success: true,
      session: {
        id: session.id,
        userId: session.user_id,
        agentId: session.agent_id,
        title: session.title,
        context: session.context,
        isActive: session.is_active,
        startedAt: session.started_at
      }
    });
    
  } catch (error) {
    console.error('❌ [Agent] Create session error:', error);
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
};

/**
 * Get user's sessions
 * GET /api/agent/users/:userId/sessions
 */
exports.getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const active = req.query.active;
    const limit = parseInt(req.query.limit) || 20;
    
    console.log(`💬 [Agent] Getting sessions for user: ${userId}`);
    
    let whereClause = 'WHERE LOWER(s.user_id::text) = LOWER($1)';
    const params = [userId];
    
    if (active !== undefined) {
      params.push(active === 'true');
      whereClause += ` AND s.is_active = $${params.length}`;
    }
    
    params.push(limit);
    
    const result = await query(
      `SELECT 
        s.id, s.title, s.is_active, s.started_at, s.ended_at,
        (SELECT COUNT(*) FROM agent_messages m WHERE m.session_id = s.id) as message_count
       FROM agent_sessions s
       ${whereClause}
       ORDER BY s.started_at DESC
       LIMIT $${params.length}`,
      params
    );
    
    const sessions = result.rows.map(s => ({
      id: s.id,
      title: s.title,
      isActive: s.is_active,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      messageCount: parseInt(s.message_count)
    }));
    
    console.log(`✅ [Agent] Retrieved ${sessions.length} sessions`);
    
    res.json({
      success: true,
      sessions: sessions
    });
    
  } catch (error) {
    console.error('❌ [Agent] Get user sessions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get sessions' });
  }
};

/**
 * Get session details
 * GET /api/agent/sessions/:sessionId
 */
exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`💬 [Agent] Getting session: ${sessionId}`);
    
    const result = await query(
      `SELECT id, user_id, agent_id, title, context, is_active, started_at, ended_at, created_at, updated_at
       FROM agent_sessions WHERE id = $1::uuid`,
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      console.log(`⚠️ [Agent] Session not found: ${sessionId}`);
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    const session = result.rows[0];
    console.log(`✅ [Agent] Session found`);
    
    res.json({
      success: true,
      session: {
        id: session.id,
        userId: session.user_id,
        agentId: session.agent_id,
        title: session.title,
        context: session.context,
        isActive: session.is_active,
        startedAt: session.started_at,
        endedAt: session.ended_at
      }
    });
    
  } catch (error) {
    console.error('❌ [Agent] Get session error:', error);
    res.status(500).json({ success: false, error: 'Failed to get session' });
  }
};

/**
 * Update session
 * PATCH /api/agent/sessions/:sessionId
 */
exports.updateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title, context, isActive } = req.body;
    
    console.log(`💬 [Agent] Updating session: ${sessionId}`);
    
    // Check if session exists
    const checkResult = await query(
      'SELECT id FROM agent_sessions WHERE id = $1::uuid',
      [sessionId]
    );
    
    if (checkResult.rows.length === 0) {
      console.log(`⚠️ [Agent] Session not found: ${sessionId}`);
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramCount = 0;
    
    if (title !== undefined) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      params.push(title);
    }
    
    if (context !== undefined) {
      paramCount++;
      updates.push(`context = $${paramCount}`);
      params.push(JSON.stringify(context));
    }
    
    if (isActive !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      params.push(isActive);
      
      if (isActive === false) {
        updates.push(`ended_at = CURRENT_TIMESTAMP`);
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }
    
    paramCount++;
    params.push(sessionId);
    
    const result = await query(
      `UPDATE agent_sessions SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}::uuid
       RETURNING id, user_id, agent_id, title, context, is_active, started_at, ended_at`,
      params
    );
    
    const session = result.rows[0];
    console.log(`✅ [Agent] Session updated`);
    
    res.json({
      success: true,
      session: {
        id: session.id,
        userId: session.user_id,
        agentId: session.agent_id,
        title: session.title,
        context: session.context,
        isActive: session.is_active,
        startedAt: session.started_at,
        endedAt: session.ended_at
      }
    });
    
  } catch (error) {
    console.error('❌ [Agent] Update session error:', error);
    res.status(500).json({ success: false, error: 'Failed to update session' });
  }
};

/**
 * Delete session
 * DELETE /api/agent/sessions/:sessionId
 */
exports.deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`💬 [Agent] Deleting session: ${sessionId}`);
    
    const result = await query(
      'DELETE FROM agent_sessions WHERE id = $1::uuid RETURNING id',
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      console.log(`⚠️ [Agent] Session not found: ${sessionId}`);
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    console.log(`✅ [Agent] Session deleted`);
    
    res.json({
      success: true,
      message: 'Session deleted'
    });
    
  } catch (error) {
    console.error('❌ [Agent] Delete session error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete session' });
  }
};

// ============================================
// MESSAGE MANAGEMENT ENDPOINTS (New)
// ============================================

/**
 * Get messages in a session
 * GET /api/agent/sessions/:sessionId/messages
 */
exports.getMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    console.log(`💬 [Agent] Getting messages for session: ${sessionId}`);
    
    // Verify session exists
    const sessionCheck = await query(
      'SELECT id FROM agent_sessions WHERE id = $1::uuid',
      [sessionId]
    );
    
    if (sessionCheck.rows.length === 0) {
      console.log(`⚠️ [Agent] Session not found: ${sessionId}`);
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as total FROM agent_messages WHERE session_id = $1::uuid',
      [sessionId]
    );
    const total = parseInt(countResult.rows[0].total);
    
    // Get messages
    const result = await query(
      `SELECT id, session_id, role, content, metadata, created_at
       FROM agent_messages
       WHERE session_id = $1::uuid
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [sessionId, limit, offset]
    );
    
    const messages = result.rows.map(m => ({
      id: m.id,
      sessionId: m.session_id,
      role: m.role,
      content: m.content,
      metadata: m.metadata,
      createdAt: m.created_at
    }));
    
    console.log(`✅ [Agent] Retrieved ${messages.length} messages`);
    
    res.json({
      success: true,
      messages: messages,
      total: total
    });
    
  } catch (error) {
    console.error('❌ [Agent] Get messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to get messages' });
  }
};

/**
 * Create a message
 * POST /api/agent/sessions/:sessionId/messages
 */
exports.createMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { role, content, metadata } = req.body;
    
    console.log(`💬 [Agent] Creating message in session: ${sessionId}`);
    console.log(`   Role: ${role}`);
    
    // Validate role
    if (!role || !['user', 'agent'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role. Must be "user" or "agent"' });
    }
    
    // Validate content
    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }
    
    // Verify session exists
    const sessionCheck = await query(
      'SELECT id FROM agent_sessions WHERE id = $1::uuid',
      [sessionId]
    );
    
    if (sessionCheck.rows.length === 0) {
      console.log(`⚠️ [Agent] Session not found: ${sessionId}`);
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    // Create message
    const result = await query(
      `INSERT INTO agent_messages (session_id, role, content, metadata)
       VALUES ($1::uuid, $2, $3, $4)
       RETURNING id, session_id, role, content, metadata, created_at`,
      [sessionId, role, content, JSON.stringify(metadata || {})]
    );
    
    const message = result.rows[0];
    console.log(`✅ [Agent] Message created`);
    
    res.status(201).json({
      success: true,
      message: {
        id: message.id,
        sessionId: message.session_id,
        role: message.role,
        content: message.content,
        metadata: message.metadata,
        createdAt: message.created_at
      }
    });
    
  } catch (error) {
    console.error('❌ [Agent] Create message error:', error);
    res.status(500).json({ success: false, error: 'Failed to create message' });
  }
};

/**
 * Get last message in a session
 * GET /api/agent/sessions/:sessionId/messages/last
 */
exports.getLastMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`💬 [Agent] Getting last message for session: ${sessionId}`);
    
    const result = await query(
      `SELECT id, session_id, role, content, metadata, created_at
       FROM agent_messages
       WHERE session_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT 1`,
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      console.log(`✅ [Agent] No messages found`);
      return res.json({
        success: true,
        message: null
      });
    }
    
    const message = result.rows[0];
    console.log(`✅ [Agent] Last message retrieved`);
    
    res.json({
      success: true,
      message: {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.created_at
      }
    });
    
  } catch (error) {
    console.error('❌ [Agent] Get last message error:', error);
    res.status(500).json({ success: false, error: 'Failed to get last message' });
  }
};

/**
 * Get message count in a session
 * GET /api/agent/sessions/:sessionId/messages/count
 */
exports.getMessageCount = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`💬 [Agent] Counting messages for session: ${sessionId}`);
    
    const result = await query(
      'SELECT COUNT(*) as count FROM agent_messages WHERE session_id = $1::uuid',
      [sessionId]
    );
    
    const count = parseInt(result.rows[0].count);
    console.log(`✅ [Agent] Message count: ${count}`);
    
    res.json({
      success: true,
      count: count
    });
    
  } catch (error) {
    console.error('❌ [Agent] Get message count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get message count' });
  }
};

module.exports = exports;
