/**
 * Quiz Controller - ENHANCED VERSION
 * Added: getUserAnswerHistory endpoint for dashboard
 * Added: getQuestions endpoint (layer required, aggregated options)
 *
 * INSTRUCTIONS:
 * Copy this file to: brandscaling-nodejs-backend/src/controllers/quizController.js
 */

const { validationResult } = require('express-validator');
const { query } = require('../config/database');

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

// ============================================
// NEW ENDPOINT: Get User Answer History
// ============================================

/**
 * Get user's complete answer history with question details
 * GET /api/v1/quiz/user-answers/:userId
 *
 * Returns all answers with:
 * - Question text
 * - Selected option text
 * - Layer information
 * - Timestamps
 */
exports.getUserAnswerHistory = async (req, res, next) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { userId } = req.params;
    const { sessionId } = req.query; // Optional: filter by specific session

    let queryText = `
      SELECT 
        p.id,
        p.session_id,
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
    `;

    const params = [userId];

    if (sessionId) {
      params.push(sessionId);
      queryText += ` AND p.session_id = $${params.length}`;
    }

    queryText += ' ORDER BY p.layer_number, q.question_number';

    const result = await query(queryText, params);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        userId,
        hasAnswers: false,
        answers: [],
        message: 'No quiz answers found for this user'
      });
    }

    // Group answers by layer
    const answersByLayer = {};

    result.rows.forEach(row => {
      const layerNum = row.layer_number;

      if (!answersByLayer[layerNum]) {
        answersByLayer[layerNum] = {
          layerNumber: layerNum,
          answers: []
        };
      }

      answersByLayer[layerNum].answers.push({
        id: row.id,
        sessionId: row.session_id,
        questionId: row.question_id,
        questionNumber: row.question_number,
        questionText: row.question_text,
        questionType: row.question_type,
        selectedOption: {
          id: row.selected_option_id,
          key: row.selected_option_key,
          text: row.selected_option_text,
          description: row.selected_option_description,
          scoreType: row.selected_score_type
        },
        answeredAt: row.answered_at
      });
    });

    // Convert to array and sort by layer
    const layers = Object.values(answersByLayer).sort((a, b) => a.layerNumber - b.layerNumber);

    res.json({
      success: true,
      userId,
      hasAnswers: true,
      totalAnswers: result.rows.length,
      layers,
      // Flat list for simple iteration
      allAnswers: result.rows.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        layerNumber: row.layer_number,
        questionId: row.question_id,
        questionNumber: row.question_number,
        questionText: row.question_text,
        questionType: row.question_type,
        selectedOption: {
          id: row.selected_option_id,
          key: row.selected_option_key,
          text: row.selected_option_text,
          description: row.selected_option_description,
          scoreType: row.selected_score_type
        },
        answeredAt: row.answered_at
      }))
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// NEW/UPDATED ENDPOINT: Get Questions for a Specific Layer
// ============================================

/**
 * Helper function to get user's archetype from Layer 1 results
 * Returns 'Architect', 'Alchemist', or 'Mixed'
 */
const getUserArchetype = async (userId) => {
  if (!userId) {
    console.log('⚠️ [Quiz] No userId provided, defaulting to Architect');
    return 'Architect';
  }

  try {
    // Option 1: Check user_quiz_results for completed Layer 1
    const resultQuery = await query(`
      SELECT layer1_core_type 
      FROM user_quiz_results 
      WHERE LOWER(user_id::text) = LOWER($1)
      ORDER BY completed_at DESC 
      LIMIT 1
    `, [userId]);
    
    if (resultQuery.rows.length > 0 && resultQuery.rows[0].layer1_core_type) {
      const archetype = resultQuery.rows[0].layer1_core_type;
      // Ensure proper capitalization
      const formattedArchetype = archetype.charAt(0).toUpperCase() + archetype.slice(1).toLowerCase();
      console.log(`✅ [Quiz] Found archetype from quiz results: ${formattedArchetype}`);
      return formattedArchetype;
    }
    
    // Option 2: Check users table type_id
    const userQuery = await query(`
      SELECT type_id 
      FROM users 
      WHERE LOWER(id::text) = LOWER($1)
    `, [userId]);
    
    if (userQuery.rows.length > 0 && userQuery.rows[0].type_id) {
      const typeId = userQuery.rows[0].type_id;
      // Ensure proper capitalization: 'architect' -> 'Architect'
      const formattedArchetype = typeId.charAt(0).toUpperCase() + typeId.slice(1).toLowerCase();
      console.log(`✅ [Quiz] Found archetype from users table: ${formattedArchetype}`);
      return formattedArchetype;
    }
    
    console.log('⚠️ [Quiz] No archetype found for user, defaulting to Architect');
    return 'Architect';
    
  } catch (error) {
    console.error('❌ [Quiz] Error getting user archetype:', error);
    return 'Architect';
  }
};

/**
 * Get questions for a specific layer
 * GET /api/v1/quiz/questions?layer=1&userId=xxx
 * 
 * For Layer 2:
 * - Automatically determines user's archetype from Layer 1 results
 * - Can also pass archetype explicitly: ?layer=2&archetype=Architect
 * - Returns 8 questions filtered by archetype
 */
exports.getQuestions = async (req, res) => {
  try {
    const { layer, archetype, userId } = req.query;
    // Also check for userId in headers (common auth pattern)
    const userIdFromHeaders = req.headers['x-user-id'] || req.headers['userid'];
    const effectiveUserId = userId || userIdFromHeaders;

    if (!layer) {
      return res.status(400).json({
        success: false,
        error: 'Layer number is required'
      });
    }

    const layerNumber = parseInt(layer);

    if (isNaN(layerNumber) || layerNumber < 1 || layerNumber > 7) {
      return res.status(400).json({
        success: false,
        error: 'Layer must be between 1 and 7'
      });
    }

    // Determine the archetype for Layer 2
    let effectiveArchetype = archetype;
    
    if (layerNumber === 2) {
      if (!archetype) {
        // Automatically determine archetype from user's Layer 1 results
        if (!effectiveUserId) {
          console.log('⚠️ [Quiz] Layer 2 requested without userId or archetype, defaulting to Architect');
          effectiveArchetype = 'Architect';
        } else {
          effectiveArchetype = await getUserArchetype(effectiveUserId);
          console.log(`🔍 [Quiz] Auto-detected archetype for user ${effectiveUserId}: ${effectiveArchetype}`);
        }
      }
      
      // Validate archetype
      const validArchetypes = ['Architect', 'Alchemist', 'Mixed'];
      if (!validArchetypes.includes(effectiveArchetype)) {
        console.log(`⚠️ [Quiz] Invalid archetype '${effectiveArchetype}', defaulting to Architect`);
        effectiveArchetype = 'Architect';
      }
    }

    console.log(`📚 [API] Fetching questions for layer ${layerNumber}${effectiveArchetype ? ` (archetype: ${effectiveArchetype})` : ''}`);

    // Build query based on whether we need archetype filtering
    let queryText = `
      SELECT 
        q.id,
        q.question_number,
        q.question_text,
        q.question_type,
        q.layer_number,
        q.weight,
        q.archetype_filter,
        json_agg(
          json_build_object(
            'id', o.id,
            'optionKey', o.option_key,
            'optionText', o.option_text,
            'optionDescription', o.option_description,
            'scoreType', o.score_type
          ) ORDER BY o.option_key
        ) as options
      FROM quiz_questions q
      LEFT JOIN quiz_options o ON q.id = o.question_id
      WHERE q.layer_number = $1
    `;
    
    const params = [layerNumber];
    
    // Add archetype filter for Layer 2
    if (layerNumber === 2 && effectiveArchetype) {
      queryText += ` AND q.archetype_filter = $2`;
      params.push(effectiveArchetype);
    }
    
    queryText += `
      GROUP BY q.id, q.question_number, q.question_text, q.question_type, q.layer_number, q.weight, q.archetype_filter
      ORDER BY q.question_number
    `;

    const result = await query(queryText, params);

    console.log(`✅ [API] Found ${result.rows.length} questions for layer ${layerNumber}${effectiveArchetype ? ` (${effectiveArchetype})` : ''}`);

    // Log warning if Layer 2 doesn't return exactly 8 questions
    if (layerNumber === 2 && result.rows.length !== 8) {
      console.warn(`⚠️ [Quiz] Layer 2 returned ${result.rows.length} questions instead of expected 8 for archetype ${effectiveArchetype}`);
    }

    res.json({
      success: true,
      layer: layerNumber,
      archetype: effectiveArchetype || null,
      questionCount: result.rows.length,
      questions: result.rows
    });

  } catch (error) {
    console.error('❌ [API] Error fetching questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch questions',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// ============================================
// EXISTING ENDPOINTS (Keep all of these)
// ============================================

/**
 * Create a new quiz session
 * POST /api/v1/quiz/session
 * 
 * This endpoint also ensures the user exists in the users table.
 * If the user doesn't exist (e.g., new Cognito user), it creates them automatically.
 */
exports.createSession = async (req, res, next) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { userId, email, name, startedAt } = req.body;

    console.log(`🔍 [Quiz] Creating session for user: ${userId}`);

    // ============================================
    // STEP 1: Ensure user exists in users table
    // ============================================
    try {
      const userCheck = await query(
        'SELECT id FROM users WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        // User doesn't exist - create them
        console.log(`👤 [Quiz] User not found, creating new user: ${userId}`);
        
        await query(`
          INSERT INTO users (id, email, name, tier, created_at, updated_at)
          VALUES ($1, $2, $3, 'free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO NOTHING
        `, [userId, email || null, name || null]);
        
        console.log(`✅ [Quiz] Created new user: ${userId} (email: ${email || 'not provided'})`);
      } else {
        console.log(`✅ [Quiz] User already exists: ${userId}`);
      }
    } catch (userError) {
      // Log but don't fail - quiz can still proceed
      console.error(`⚠️ [Quiz] Error checking/creating user: ${userError.message}`);
    }

    // ============================================
    // STEP 2: Create the quiz session
    // ============================================
    const queryText = `
      INSERT INTO quiz_sessions (user_id, started_at)
      VALUES ($1, $2)
      RETURNING id, user_id, started_at, is_completed
    `;

    const result = await query(queryText, [
      userId,
      startedAt || new Date().toISOString()
    ]);

    console.log(`✅ [Quiz] Session created: ${result.rows[0].id}`);

    res.status(201).json({
      success: true,
      session: {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        startedAt: result.rows[0].started_at,
        isCompleted: result.rows[0].is_completed
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Save quiz progress (single answer)
 * POST /api/v1/quiz/progress
 */
exports.saveProgress = async (req, res, next) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { userId, sessionId, questionId, selectedOptionId, layerNumber, answeredAt } = req.body;

    const queryText = `
      INSERT INTO user_quiz_progress 
      (user_id, session_id, question_id, selected_option_id, layer_number, answered_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (session_id, question_id) 
      DO UPDATE SET 
        selected_option_id = EXCLUDED.selected_option_id,
        answered_at = EXCLUDED.answered_at
      RETURNING id
    `;

    const result = await query(queryText, [
      userId,
      sessionId,
      questionId,
      selectedOptionId,
      layerNumber,
      answeredAt || new Date().toISOString()
    ]);

    res.json({
      success: true,
      message: 'Progress saved',
      progressId: result.rows[0].id
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get user's quiz progress
 * GET /api/v1/quiz/progress/:userId
 */
exports.getProgress = async (req, res, next) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { userId } = req.params;

    console.log(`📊 [Quiz Progress] Getting progress for param: ${userId}`);

    // First, try to find this as a session_id in user_quiz_progress
    // This handles the case where iOS passes sessionId instead of userId
    const sessionProgressQuery = `
      SELECT 
        uqp.id,
        uqp.user_id,
        uqp.session_id,
        uqp.question_id,
        uqp.selected_option_id,
        uqp.layer_number,
        uqp.answered_at,
        q.question_number,
        q.question_text,
        q.question_type,
        o.option_key as selected_option_key,
        o.option_text as selected_option_text,
        o.score_type
      FROM user_quiz_progress uqp
      LEFT JOIN quiz_questions q ON uqp.question_id = q.id
      LEFT JOIN quiz_options o ON uqp.selected_option_id = o.id
      WHERE LOWER(uqp.session_id::text) = LOWER($1)
      ORDER BY uqp.layer_number ASC, q.question_number ASC, uqp.answered_at ASC
    `;

    const sessionProgressResult = await query(sessionProgressQuery, [userId]);
    
    // If we found progress by session_id, return it
    if (sessionProgressResult.rows.length > 0) {
      console.log(`📊 [Quiz Progress] Found ${sessionProgressResult.rows.length} answers by session_id`);
      
      const answers = sessionProgressResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        questionId: row.question_id,
        selectedOptionId: row.selected_option_id,
        layerNumber: row.layer_number,
        answeredAt: row.answered_at,
        questionNumber: row.question_number,
        questionText: row.question_text,
        questionType: row.question_type,
        selectedOptionKey: row.selected_option_key,
        selectedOptionText: row.selected_option_text,
        scoreType: row.score_type
      }));
      
      const maxLayer = Math.max(...sessionProgressResult.rows.map(r => r.layer_number));
      
      if (answers.length > 0) {
        console.log(`   First answer: Layer ${answers[0].layerNumber}, Question ${answers[0].questionNumber}`);
        console.log(`   Last answer: Layer ${answers[answers.length - 1].layerNumber}, Question ${answers[answers.length - 1].questionNumber}`);
      }
      
      return res.json({
        success: true,
        sessionId: userId,
        userId: sessionProgressResult.rows[0]?.user_id,
        hasSession: true,
        answersCount: answers.length,
        currentLayer: maxLayer,
        progress: answers.map(a => ({
          id: a.id,
          userId: a.userId,
          sessionId: a.sessionId,
          questionId: a.questionId,
          selectedOptionId: a.selectedOptionId,
          layerNumber: a.layerNumber,
          answeredAt: a.answeredAt,
          questionNumber: a.questionNumber,
          questionText: a.questionText,
          questionType: a.questionType,
          selectedOptionKey: a.selectedOptionKey,
          selectedOptionText: a.selectedOptionText,
          scoreType: a.scoreType
        })),
        answers: answers,
        totalAnswered: answers.length
      });
    }

    // If not found by session_id, try the original logic (finding by user_id)
    console.log(`📊 [Quiz Progress] No progress found by session_id, trying as user_id`);
    
    // Get latest session for this user
    const sessionQuery = `
      SELECT id, started_at, is_completed, completed_at
      FROM quiz_sessions
      WHERE LOWER(user_id::text) = LOWER($1)
      ORDER BY started_at DESC
      LIMIT 1
    `;

    const sessionResult = await query(sessionQuery, [userId]);

    if (sessionResult.rows.length === 0) {
      // Also check user_quiz_progress directly by user_id
      const directProgressQuery = `
        SELECT 
          uqp.id,
          uqp.user_id,
          uqp.session_id,
          uqp.question_id,
          uqp.selected_option_id,
          uqp.layer_number,
          uqp.answered_at,
          q.question_number,
          q.question_text,
          q.question_type,
          o.option_key as selected_option_key,
          o.option_text as selected_option_text,
          o.score_type
        FROM user_quiz_progress uqp
        LEFT JOIN quiz_questions q ON uqp.question_id = q.id
        LEFT JOIN quiz_options o ON uqp.selected_option_id = o.id
        WHERE LOWER(uqp.user_id::text) = LOWER($1)
        ORDER BY uqp.layer_number ASC, q.question_number ASC
      `;
      
      const directResult = await query(directProgressQuery, [userId]);
      
      if (directResult.rows.length > 0) {
        console.log(`📊 [Quiz Progress] Found ${directResult.rows.length} answers by user_id directly`);
        
        const answers = directResult.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          sessionId: row.session_id,
          questionId: row.question_id,
          selectedOptionId: row.selected_option_id,
          layerNumber: row.layer_number,
          answeredAt: row.answered_at,
          questionNumber: row.question_number,
          questionText: row.question_text,
          questionType: row.question_type,
          selectedOptionKey: row.selected_option_key,
          selectedOptionText: row.selected_option_text,
          scoreType: row.score_type
        }));
        
        return res.json({
          success: true,
          userId,
          hasSession: true,
          answersCount: answers.length,
          progress: answers,
          answers: answers,
          totalAnswered: answers.length
        });
      }
      
      console.log(`📊 [Quiz Progress] No progress found for: ${userId}`);
      return res.json({
        success: true,
        userId,
        hasSession: false,
        progress: [],
        answers: [],
        totalAnswered: 0
      });
    }

    const session = sessionResult.rows[0];

    // Get progress for this session
    const progressQuery = `
      SELECT 
        uqp.id,
        uqp.user_id,
        uqp.session_id,
        uqp.question_id, 
        uqp.selected_option_id, 
        uqp.layer_number, 
        uqp.answered_at,
        q.question_number,
        q.question_text,
        q.question_type,
        o.option_key as selected_option_key,
        o.option_text as selected_option_text,
        o.score_type
      FROM user_quiz_progress uqp
      LEFT JOIN quiz_questions q ON uqp.question_id = q.id
      LEFT JOIN quiz_options o ON uqp.selected_option_id = o.id
      WHERE LOWER(uqp.session_id::text) = LOWER($1)
      ORDER BY uqp.layer_number ASC, q.question_number ASC
    `;

    const progressResult = await query(progressQuery, [session.id]);
    
    console.log(`📊 [Quiz Progress] Found ${progressResult.rows.length} answers for user's session`);

    const answers = progressResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      questionId: row.question_id,
      selectedOptionId: row.selected_option_id,
      layerNumber: row.layer_number,
      answeredAt: row.answered_at,
      questionNumber: row.question_number,
      questionText: row.question_text,
      questionType: row.question_type,
      selectedOptionKey: row.selected_option_key,
      selectedOptionText: row.selected_option_text,
      scoreType: row.score_type
    }));

    res.json({
      success: true,
      userId,
      hasSession: true,
      session: {
        id: session.id,
        startedAt: session.started_at,
        isCompleted: session.is_completed,
        completedAt: session.completed_at
      },
      progress: answers,
      answers: answers,
      totalAnswered: progressResult.rows.length
    });

  } catch (error) {
    console.error('❌ [Quiz Progress] Error:', error);
    next(error);
  }
};

/**
 * Get quiz progress for a specific session (by sessionId)
 * GET /api/v1/quiz/progress/session/:sessionId
 * 
 * Used by iOS to resume quiz from where user left off
 * Returns: Array of answered questions with user's selections
 */
exports.getProgressBySession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`📊 [Quiz Progress] Getting progress for session: ${sessionId}`);
    
    // Query to get all answers for this session with question details
    const progressQuery = `
      SELECT 
        uqp.id,
        uqp.user_id,
        uqp.session_id,
        uqp.question_id,
        uqp.selected_option_id,
        uqp.layer_number,
        uqp.answered_at,
        q.question_number,
        q.question_text,
        q.question_type,
        o.option_key as selected_option_key,
        o.option_text as selected_option_text,
        o.score_type
      FROM user_quiz_progress uqp
      LEFT JOIN quiz_questions q ON uqp.question_id = q.id
      LEFT JOIN quiz_options o ON uqp.selected_option_id = o.id
      WHERE LOWER(uqp.session_id::text) = LOWER($1)
      ORDER BY uqp.layer_number ASC, q.question_number ASC, uqp.answered_at ASC
    `;
    
    const result = await query(progressQuery, [sessionId]);
    
    console.log(`📊 [Quiz Progress] Found ${result.rows.length} answered questions`);
    
    if (result.rows.length > 0) {
      console.log(`   First answer: Layer ${result.rows[0].layer_number}, Question ${result.rows[0].question_number}`);
      console.log(`   Last answer: Layer ${result.rows[result.rows.length - 1].layer_number}, Question ${result.rows[result.rows.length - 1].question_number}`);
      
      // Get unique layers answered
      const layersAnswered = [...new Set(result.rows.map(r => r.layer_number))];
      console.log(`   Layers answered: ${layersAnswered.join(', ')}`);
    }
    
    // Format the response
    const answers = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
        questionId: row.question_id,
        selectedOptionId: row.selected_option_id,
        layerNumber: row.layer_number,
      answeredAt: row.answered_at,
      questionNumber: row.question_number,
      questionText: row.question_text,
      questionType: row.question_type,
      selectedOptionKey: row.selected_option_key,
      selectedOptionText: row.selected_option_text,
      scoreType: row.score_type
    }));
    
    // Calculate current position
    const maxLayer = result.rows.length > 0 ? Math.max(...result.rows.map(r => r.layer_number)) : 0;
    
    // Create progress array with ALL fields for iOS compatibility
    const progress = answers.map(a => ({
      id: a.id,
      userId: a.userId,
      sessionId: a.sessionId,
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId,
      layerNumber: a.layerNumber,
      answeredAt: a.answeredAt,
      questionNumber: a.questionNumber,
      questionText: a.questionText,
      questionType: a.questionType,
      selectedOptionKey: a.selectedOptionKey,
      selectedOptionText: a.selectedOptionText,
      scoreType: a.scoreType
    }));
    
    return res.json({
      success: true,
      sessionId: sessionId,
      userId: result.rows.length > 0 ? result.rows[0].user_id : null,
      hasSession: result.rows.length > 0,
      answersCount: result.rows.length,
      currentLayer: maxLayer,
      progress: progress,  // Include progress array for iOS
      answers: answers,
      totalAnswered: result.rows.length
    });

  } catch (error) {
    console.error('❌ [Quiz Progress] Error:', error);
    console.error('❌ [Quiz Progress] Stack:', error.stack);
    next(error);
  }
};

/**
 * Sync multiple offline answers
 * POST /api/v1/quiz/sync
 */
exports.syncAnswers = async (req, res, next) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { userId, sessionId, answers } = req.body;

    let synced = 0;
    let failed = 0;

    for (const answer of answers) {
      try {
        const queryText = `
          INSERT INTO user_quiz_progress 
          (user_id, session_id, question_id, selected_option_id, layer_number, answered_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (session_id, question_id) 
          DO UPDATE SET 
            selected_option_id = EXCLUDED.selected_option_id,
            answered_at = EXCLUDED.answered_at
        `;

        await query(queryText, [
          userId,
          sessionId,
          answer.questionId,
          answer.selectedOptionId,
          answer.layerNumber,
          answer.answeredAt || new Date().toISOString()
        ]);

        synced++;
      } catch (error) {
        console.error('Failed to sync answer:', error);
        failed++;
      }
    }

    res.json({
      success: true,
      synced,
      failed,
      message: `Synced ${synced} answers successfully`
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Save quiz results
 * POST /api/v1/quiz/results
 * 
 * This endpoint:
 * 1. Saves complete quiz results (all 7 layers) to user_quiz_results table
 * 2. Marks the quiz session as completed
 * 3. Updates the user's type_id in the users table
 * 4. Creates/updates the user's E-DNA profile in edna_profiles table
 */
exports.saveResults = async (req, res, next) => {
  try {
    // ============================================
    // DEBUG: Log incoming request
    // ============================================
    console.log('📊 [Quiz Results] ================================');
    console.log('📊 [Quiz Results] Receiving complete quiz results...');
    console.log('📊 [Quiz Results] Request body keys:', Object.keys(req.body));
    console.log('📊 [Quiz Results] Has results object:', !!req.body.results);
    console.log('📊 [Quiz Results] Full request body:', JSON.stringify(req.body, null, 2));
    console.log('📊 [Quiz Results] ================================');

    if (handleValidationErrors(req, res)) return;

    // ============================================
    // IMPORTANT: iOS sends data inside "results" object!
    // Support both formats: req.body.results (iOS) and req.body (direct)
    // ============================================
    const results = req.body.results || req.body;
    
    console.log('📊 [Quiz Results] Using data source:', req.body.results ? 'req.body.results (iOS format)' : 'req.body (direct format)');
    console.log('📊 [Quiz Results] Results keys:', Object.keys(results));

    // Extract userId and sessionId from either location
    const userId = req.body.userId || req.body.user_id || results.userId || results.user_id;
    const sessionId = req.body.sessionId || req.body.session_id || results.sessionId || results.session_id;
    
    // ============================================
    // Layer 1: Core Identity (flat fields)
    // ============================================
    const layer1CoreType = results.layer1CoreType || results.layer1_core_type || results.coreType || 'mixed';
    const layer1Strength = results.layer1Strength || results.layer1_strength || results.strength || 'moderate';
    const layer1ArchitectScore = parseInt(results.layer1ArchitectScore || results.layer1_architect_score || results.architectScore || 0) || 0;
    const layer1AlchemistScore = parseInt(results.layer1AlchemistScore || results.layer1_alchemist_score || results.alchemistScore || 0) || 0;
    const layer1DecisionLoop = results.layer1DecisionLoop || results.layer1_decision_loop || null;
    const layer1DecisionProcess = results.layer1DecisionProcess || results.layer1_decision_process || null;
    
    console.log('📊 [Layer 1] Raw values:', { 
      coreType: results.layer1CoreType, 
      strength: results.layer1Strength,
      archScore: results.layer1ArchitectScore,
      alchScore: results.layer1AlchemistScore
    });
    
    // ============================================
    // Layer 2: Subtype (flat fields)
    // ============================================
    const layer2Subtype = results.layer2Subtype || results.layer2_subtype || results.subtype || null;
    const layer2Description = results.layer2Description || results.layer2_description || null;
    const layer2Strength = results.layer2Strength || results.layer2_strength || null;
    const layer2BlindSpot = results.layer2BlindSpot || results.layer2_blind_spot || null;
    
    console.log('📊 [Layer 2] Raw values:', { subtype: results.layer2Subtype, description: results.layer2Description });
    
    // ============================================
    // Layer 3: Mirror Awareness (JSON string from iOS)
    // ============================================
    let layer3Integration = null;
    let layer3IntegrationPercent = null;
    let layer3Description = null;
    const layer3Result = results.layer3Result || results.layer3_result || null;
    
    if (layer3Result) {
      try {
        const layer3Data = typeof layer3Result === 'string' ? JSON.parse(layer3Result) : layer3Result;
        console.log('📊 [Layer 3] Parsed JSON:', layer3Data);
        layer3Integration = layer3Data.awarenessLevel || null;
        layer3IntegrationPercent = layer3Data.integrationPercent || 0;
        layer3Description = layer3Data.description || null;
      } catch (e) {
        console.error('❌ [Quiz] Failed to parse layer3Result:', e.message);
      }
    }
    // Also check for direct fields (non-JSON format)
    layer3Integration = layer3Integration || results.layer3Integration || results.layer3_integration || null;
    layer3IntegrationPercent = layer3IntegrationPercent || parseInt(results.layer3IntegrationPercent || results.layer3_integration_percent || 0) || 0;
    layer3Description = layer3Description || results.layer3Description || results.layer3_description || null;
    
    // ============================================
    // Layer 4: Learning Style (JSON string from iOS)
    // ============================================
    let layer4ModalityPreference = null;
    let layer4Approach = null;
    let layer4ConceptProcessing = null;
    let layer4WorkingEnvironment = null;
    let layer4Pace = null;
    const layer4Result = results.layer4Result || results.layer4_result || null;
    
    if (layer4Result) {
      try {
        const layer4Data = typeof layer4Result === 'string' ? JSON.parse(layer4Result) : layer4Result;
        console.log('📊 [Layer 4] Parsed JSON:', layer4Data);
        layer4ModalityPreference = layer4Data.modalityPreference || null;
        layer4Approach = layer4Data.approach || null;
        layer4ConceptProcessing = layer4Data.conceptProcessing || null;
        layer4WorkingEnvironment = layer4Data.workingEnvironment || null;
        layer4Pace = layer4Data.pace || null;
      } catch (e) {
        console.error('❌ [Quiz] Failed to parse layer4Result:', e.message);
      }
    }
    // Also check for direct fields (non-JSON format)
    layer4ModalityPreference = layer4ModalityPreference || results.layer4ModalityPreference || results.layer4_modality_preference || null;
    layer4Approach = layer4Approach || results.layer4Approach || results.layer4_approach || null;
    layer4ConceptProcessing = layer4ConceptProcessing || results.layer4ConceptProcessing || results.layer4_concept_processing || null;
    layer4WorkingEnvironment = layer4WorkingEnvironment || results.layer4WorkingEnvironment || results.layer4_working_environment || null;
    layer4Pace = layer4Pace || results.layer4Pace || results.layer4_pace || null;
    
    // ============================================
    // Layer 5: Neurodiversity (JSON string from iOS)
    // ============================================
    let layer5Status = null;
    let layer5Description = null;
    let layer5Traits = null;
    const layer5Result = results.layer5Result || results.layer5_result || null;
    
    if (layer5Result) {
      try {
        const layer5Data = typeof layer5Result === 'string' ? JSON.parse(layer5Result) : layer5Result;
        console.log('📊 [Layer 5] Parsed JSON:', layer5Data);
        layer5Status = layer5Data.neuroProfile || null;
        layer5Traits = JSON.stringify({
          ntScore: layer5Data.ntScore || 0,
          ndScore: layer5Data.ndScore || 0,
          teScore: layer5Data.teScore || 0
        });
      } catch (e) {
        console.error('❌ [Quiz] Failed to parse layer5Result:', e.message);
      }
    }
    // Also check for direct fields (non-JSON format)
    layer5Status = layer5Status || results.layer5Status || results.layer5_status || null;
    layer5Description = layer5Description || results.layer5Description || results.layer5_description || null;
    layer5Traits = layer5Traits || results.layer5Traits || results.layer5_traits || null;
    
    // ============================================
    // Layer 6: Mindset & Personality (JSON string from iOS)
    // ============================================
    let layer6Mindset = null;
    let layer6Personality = null;
    let layer6Communication = null;
    const layer6Result = results.layer6Result || results.layer6_result || null;
    
    if (layer6Result) {
      try {
        const layer6Data = typeof layer6Result === 'string' ? JSON.parse(layer6Result) : layer6Result;
        console.log('📊 [Layer 6] Parsed JSON:', layer6Data);
        // Combine mindset fields into a single string
        const mindsetParts = [];
        if (layer6Data.mindsetChallenge) mindsetParts.push(layer6Data.mindsetChallenge);
        if (layer6Data.mindsetResources) mindsetParts.push(layer6Data.mindsetResources);
        layer6Mindset = mindsetParts.length > 0 ? mindsetParts.join('/') : null;
        layer6Personality = layer6Data.personalityCore || null;
        layer6Communication = layer6Data.communicationStyle || null;
      } catch (e) {
        console.error('❌ [Quiz] Failed to parse layer6Result:', e.message);
      }
    }
    // Also check for direct fields (non-JSON format)
    layer6Mindset = layer6Mindset || results.layer6Mindset || results.layer6_mindset || null;
    layer6Personality = layer6Personality || results.layer6Personality || results.layer6_personality || null;
    layer6Communication = layer6Communication || results.layer6Communication || results.layer6_communication || null;
    
    // ============================================
    // Layer 7: Meta-Beliefs / Core Values (JSON string from iOS)
    // ============================================
    let layer7FaithOrientation = null;
    let layer7ControlOrientation = null;
    let layer7Fairness = null;
    let layer7Integrity = null;
    let layer7Growth = null;
    let layer7Impact = null;
    const layer7Result = results.layer7Result || results.layer7_result || null;
    
    if (layer7Result) {
      try {
        const layer7Data = typeof layer7Result === 'string' ? JSON.parse(layer7Result) : layer7Result;
        console.log('📊 [Layer 7] Parsed JSON:', layer7Data);
        layer7FaithOrientation = layer7Data.grounding || null;
        layer7ControlOrientation = layer7Data.control || null;
        layer7Fairness = layer7Data.fairness || null;
        layer7Integrity = layer7Data.honesty || null;
        layer7Growth = layer7Data.growth || null;
        layer7Impact = layer7Data.impact || null;
      } catch (e) {
        console.error('❌ [Quiz] Failed to parse layer7Result:', e.message);
      }
    }
    // Also check for direct fields (non-JSON format)
    layer7FaithOrientation = layer7FaithOrientation || results.layer7FaithOrientation || results.layer7_faith_orientation || null;
    layer7ControlOrientation = layer7ControlOrientation || results.layer7ControlOrientation || results.layer7_control_orientation || null;
    layer7Fairness = layer7Fairness || results.layer7Fairness || results.layer7_fairness || null;
    layer7Integrity = layer7Integrity || results.layer7Integrity || results.layer7_integrity || null;
    layer7Growth = layer7Growth || results.layer7Growth || results.layer7_growth || null;
    layer7Impact = layer7Impact || results.layer7Impact || results.layer7_impact || null;
    
    const completedAt = req.body.completedAt || req.body.completed_at || results.completedAt || results.completed_at || new Date().toISOString();

    // ============================================
    // Log parsed values for all 7 layers
    // ============================================
    console.log('');
    console.log('📊 [Quiz Results] ========== PARSED VALUES ==========');
    console.log(`   - userId: ${userId}`);
    console.log(`   - sessionId: ${sessionId}`);
    console.log(`   - Layer 1: ${layer1CoreType} (${layer1Strength}) - Arch:${layer1ArchitectScore} Alch:${layer1AlchemistScore}`);
    console.log(`   - Layer 2: ${layer2Subtype || 'N/A'} - Strength:${layer2Strength || 'N/A'} BlindSpot:${layer2BlindSpot || 'N/A'}`);
    console.log(`   - Layer 3: ${layer3Integration || 'N/A'} (${layer3IntegrationPercent || 0}%)`);
    console.log(`   - Layer 4: ${layer4ModalityPreference || 'N/A'} - ${layer4Approach || 'N/A'} - ${layer4ConceptProcessing || 'N/A'}`);
    console.log(`   - Layer 5: ${layer5Status || 'N/A'}`);
    console.log(`   - Layer 6: Mindset=${layer6Mindset || 'N/A'} Personality=${layer6Personality || 'N/A'} Comm=${layer6Communication || 'N/A'}`);
    console.log(`   - Layer 7: Faith=${layer7FaithOrientation || 'N/A'} Control=${layer7ControlOrientation || 'N/A'}`);
    console.log('📊 [Quiz Results] ===================================');
    console.log('');

    // Validate required fields
    if (!userId) {
      console.error('❌ [Quiz Results] Missing userId');
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    if (!sessionId) {
      console.error('❌ [Quiz Results] Missing sessionId');
      return res.status(400).json({ success: false, error: 'Session ID is required' });
    }

    // Calculate retake date (7 days from now)
    const retakeDate = new Date();
    retakeDate.setDate(retakeDate.getDate() + 7);

    // Normalize core type to lowercase
    const normalizedCoreType = (layer1CoreType || 'mixed').toLowerCase();

    // ============================================
    // STEP 1: Save complete results to user_quiz_results
    // ============================================
    const queryText = `
      INSERT INTO user_quiz_results (
        user_id, session_id,
        
        -- Layer 1: Core Identity
        layer1_core_type, layer1_strength, 
        layer1_architect_score, layer1_alchemist_score,
        layer1_decision_loop, layer1_decision_process,
        
        -- Layer 2: Subtype
        layer2_subtype, layer2_description,
        layer2_strength, layer2_blind_spot,
        
        -- Layer 3: Mirror Awareness
        layer3_integration, layer3_integration_percent, layer3_description,
        layer3_result,
        
        -- Layer 4: Learning Style
        layer4_modality_preference, layer4_approach,
        layer4_concept_processing, layer4_working_environment, layer4_pace,
        layer4_result,
        
        -- Layer 5: Neurodiversity
        layer5_status, layer5_description, layer5_traits,
        layer5_result,
        
        -- Layer 6: Mindset & Personality
        layer6_mindset, layer6_personality, layer6_communication,
        layer6_result,
        
        -- Layer 7: Meta-Beliefs
        layer7_faith_orientation, layer7_control_orientation,
        layer7_fairness, layer7_integrity, layer7_growth, layer7_impact,
        layer7_result,
        
        -- Metadata
        completed_at, retake_available_at
      ) VALUES (
        $1, $2,
        $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22,
        $23, $24, $25, $26,
        $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37,
        $38, $39
      )
      RETURNING id, retake_available_at
    `;

    const result = await query(queryText, [
      userId,
      sessionId,
      
      // Layer 1
      normalizedCoreType,
      layer1Strength,
      layer1ArchitectScore,
      layer1AlchemistScore,
      layer1DecisionLoop,
      layer1DecisionProcess,
      
      // Layer 2
      layer2Subtype,
      layer2Description,
      layer2Strength,
      layer2BlindSpot,
      
      // Layer 3
      layer3Integration,
      layer3IntegrationPercent,
      layer3Description,
      layer3Result ? JSON.stringify(layer3Result) : null,
      
      // Layer 4
      layer4ModalityPreference,
      layer4Approach,
      layer4ConceptProcessing,
      layer4WorkingEnvironment,
      layer4Pace,
      layer4Result ? JSON.stringify(layer4Result) : null,
      
      // Layer 5
      layer5Status,
      layer5Description,
      layer5Traits ? JSON.stringify(layer5Traits) : null,
      layer5Result ? JSON.stringify(layer5Result) : null,
      
      // Layer 6
      layer6Mindset ? JSON.stringify(layer6Mindset) : null,
      layer6Personality ? JSON.stringify(layer6Personality) : null,
      layer6Communication,
      layer6Result ? JSON.stringify(layer6Result) : null,
      
      // Layer 7
      layer7FaithOrientation,
      layer7ControlOrientation,
      layer7Fairness,
      layer7Integrity,
      layer7Growth,
      layer7Impact,
      layer7Result ? JSON.stringify(layer7Result) : null,
      
      // Metadata
      completedAt || new Date().toISOString(),
      retakeDate.toISOString()
    ]);

    console.log(`✅ [Quiz] Saved complete results with ID: ${result.rows[0].id}`);

    // ============================================
    // STEP 2: Mark session as completed
    // ============================================
    await query(
      'UPDATE quiz_sessions SET is_completed = TRUE, completed_at = $1 WHERE id = $2',
      [completedAt || new Date().toISOString(), sessionId]
    );
    console.log(`✅ [Quiz] Marked session ${sessionId} as completed`);

    // ============================================
    // STEP 3: Update users.type_id
    // ============================================
    try {
      await query(
        'UPDATE users SET type_id = $1, updated_at = NOW() WHERE id = $2',
        [normalizedCoreType, userId]
      );
      console.log(`✅ [Quiz] Updated user ${userId} type_id to: ${normalizedCoreType}`);
    } catch (userUpdateError) {
      console.error('⚠️ [Quiz] Failed to update users.type_id:', userUpdateError.message);
    }

    // ============================================
    // STEP 4: Insert/Update edna_profiles
    // ============================================
    try {
      // Calculate confidence score based on how decisive the answers were
      const totalScore = (layer1ArchitectScore || 0) + (layer1AlchemistScore || 0);
      const scoreDifference = Math.abs((layer1ArchitectScore || 0) - (layer1AlchemistScore || 0));
      const confidence = totalScore > 0 ? Math.min(0.50 + (scoreDifference / totalScore) * 0.50, 1.00) : 0.95;

      await query(`
        INSERT INTO edna_profiles (user_id, core_type, subtype, confidence, completion_percentage, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          core_type = $2,
          subtype = $3,
          confidence = $4,
          completion_percentage = $5,
          updated_at = NOW()
      `, [
        userId,
        normalizedCoreType,
        layer2Subtype || null,
        confidence.toFixed(2),
        100
      ]);
      console.log(`✅ [Quiz] Created/updated edna_profile for user ${userId}: ${normalizedCoreType} (${(confidence * 100).toFixed(0)}% confidence)`);
    } catch (profileError) {
      console.error('⚠️ [Quiz] Failed to update edna_profiles:', profileError.message);
    }

    // ============================================
    // STEP 5: Return comprehensive response
    // ============================================
    res.status(201).json({
      success: true,
      message: 'Complete quiz results saved successfully',
      resultId: result.rows[0].id,
      retakeAvailableAt: result.rows[0].retake_available_at,
      layers: {
        layer1: { 
          coreType: normalizedCoreType, 
          strength: layer1Strength,
          architectScore: layer1ArchitectScore,
          alchemistScore: layer1AlchemistScore
        },
        layer2: { 
          subtype: layer2Subtype,
          strength: layer2Strength,
          blindSpot: layer2BlindSpot
        },
        layer3: { 
          integration: layer3Integration,
          integrationPercent: layer3IntegrationPercent
        },
        layer4: { 
          modality: layer4ModalityPreference,
          approach: layer4Approach,
          pace: layer4Pace
        },
        layer5: { 
          status: layer5Status 
        },
        layer6: { 
          mindset: layer6Mindset,
          personality: layer6Personality,
          communication: layer6Communication
        },
        layer7: { 
          faith: layer7FaithOrientation,
          control: layer7ControlOrientation,
          fairness: layer7Fairness,
          integrity: layer7Integrity,
          growth: layer7Growth,
          impact: layer7Impact
        }
      }
    });

  } catch (error) {
    console.error('❌ [Quiz] Error saving quiz results:', error);
    console.error('   Error details:', error.message);
    console.error('   Stack trace:', error.stack);
    next(error);
  }
};

/**
 * Get user's quiz results
 * GET /api/v1/quiz/results/:userId
 * Returns complete results for all 7 layers
 */
exports.getResults = async (req, res, next) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { userId } = req.params;

    console.log(`📊 [API] Getting complete results for user: ${userId}`);

    const queryText = `
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
        layer3_result,
        
        -- Layer 4: Learning Style
        layer4_modality_preference, layer4_approach,
        layer4_concept_processing, layer4_working_environment, layer4_pace,
        layer4_result,
        
        -- Layer 5: Neurodiversity
        layer5_status, layer5_description, layer5_traits,
        layer5_result,
        
        -- Layer 6: Mindset & Personality
        layer6_mindset, layer6_personality, layer6_communication,
        layer6_result,
        
        -- Layer 7: Meta-Beliefs
        layer7_faith_orientation, layer7_control_orientation,
        layer7_fairness, layer7_integrity, layer7_growth, layer7_impact,
        layer7_result,
        
        -- Metadata
        completed_at, retake_available_at
      FROM user_quiz_results
      WHERE LOWER(user_id::text) = LOWER($1)
      ORDER BY completed_at DESC
      LIMIT 1
    `;

    const result = await query(queryText, [userId]);

    if (result.rows.length === 0) {
      console.log(`⚠️ [API] No results found for user: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'No results found for this user'
      });
    }

    const data = result.rows[0];

    // Log what layers have data
    console.log(`✅ [API] Returning complete results for user: ${userId}`);
    console.log(`   Layer 1: ${data.layer1_core_type || 'N/A'} (${data.layer1_strength || 'N/A'})`);
    console.log(`   Layer 2: ${data.layer2_subtype || 'N/A'}`);
    console.log(`   Layer 3: ${data.layer3_integration || 'N/A'} (${data.layer3_integration_percent || 0}%)`);
    console.log(`   Layer 4: ${data.layer4_modality_preference || 'N/A'}`);
    console.log(`   Layer 5: ${data.layer5_status || 'N/A'}`);
    console.log(`   Layer 6: Mindset=${data.layer6_mindset ? 'Present' : 'N/A'}`);
    console.log(`   Layer 7: Faith=${data.layer7_faith_orientation || 'N/A'}`);

    // SURGICAL FIX: Parse layer3_result from JSON string to object if needed
    if (result.rows[0] && typeof result.rows[0].layer3_result === 'string') {
      try {
        result.rows[0].layer3_result = JSON.parse(result.rows[0].layer3_result);
      } catch (e) {
        // If parsing fails, leave it as-is. Do not crash.
      }
    }

    // Format response with all 7 layers in camelCase for iOS
    res.json({
      success: true,
      userId,
      results: {
        id: data.id,
        sessionId: data.session_id,
        
        // Layer 1: Core Identity
        layer1CoreType: data.layer1_core_type,
        layer1Strength: data.layer1_strength,
        layer1ArchitectScore: data.layer1_architect_score,
        layer1AlchemistScore: data.layer1_alchemist_score,
        layer1DecisionLoop: data.layer1_decision_loop,
        layer1DecisionProcess: data.layer1_decision_process,
        
        // Layer 2: Subtype
        layer2Subtype: data.layer2_subtype,
        layer2Description: data.layer2_description,
        layer2Strength: data.layer2_strength,
        layer2BlindSpot: data.layer2_blind_spot,
        
        // Layer 3: Mirror Awareness
        layer3Integration: data.layer3_integration,
        layer3IntegrationPercent: data.layer3_integration_percent,
        layer3Description: data.layer3_description,
        layer3Result: data.layer3_result,
        
        // Layer 4: Learning Style
        layer4ModalityPreference: data.layer4_modality_preference,
        layer4Approach: data.layer4_approach,
        layer4ConceptProcessing: data.layer4_concept_processing,
        layer4WorkingEnvironment: data.layer4_working_environment,
        layer4Pace: data.layer4_pace,
        layer4Result: data.layer4_result,
        
        // Layer 5: Neurodiversity
        layer5Status: data.layer5_status,
        layer5Description: data.layer5_description,
        layer5Traits: data.layer5_traits,
        layer5Result: data.layer5_result,
        
        // Layer 6: Mindset & Personality
        layer6Mindset: data.layer6_mindset,
        layer6Personality: data.layer6_personality,
        layer6Communication: data.layer6_communication,
        layer6Result: data.layer6_result,
        
        // Layer 7: Meta-Beliefs
        layer7FaithOrientation: data.layer7_faith_orientation,
        layer7ControlOrientation: data.layer7_control_orientation,
        layer7Fairness: data.layer7_fairness,
        layer7Integrity: data.layer7_integrity,
        layer7Growth: data.layer7_growth,
        layer7Impact: data.layer7_impact,
        layer7Result: data.layer7_result,
        
        // Metadata
        completedAt: data.completed_at,
        retakeAvailableAt: data.retake_available_at
      }
    });

  } catch (error) {
    console.error('❌ [API] Error getting quiz results:', error);
    next(error);
  }
};

/**
 * Check if user can retake the quiz (7-day restriction)
 * GET /api/v1/quiz/retake-check/:userId
 */
exports.checkRetake = async (req, res, next) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { userId } = req.params;

    const queryText = `
      SELECT completed_at, retake_available_at
      FROM user_quiz_results
      WHERE user_id = $1
      ORDER BY completed_at DESC
      LIMIT 1
    `;

    const result = await query(queryText, [userId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        allowed: true,
        message: 'You can take the quiz now'
      });
    }

    const { completed_at, retake_available_at } = result.rows[0];
    const now = new Date();
    const retakeDate = new Date(retake_available_at);

    if (now >= retakeDate) {
      res.json({
        success: true,
        allowed: true,
        lastCompletionDate: completed_at,
        message: 'You can retake the quiz now'
      });
    } else {
      const timeRemaining = retakeDate - now;
      const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
      const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));

      res.json({
        success: true,
        allowed: false,
        lastCompletionDate: completed_at,
        retakeAvailableAt: retake_available_at,
        daysRemaining,
        hoursRemaining,
        message: `You can retake the quiz in ${daysRemaining} days`
      });
    }

  } catch (error) {
    next(error);
  }
};

/**
 * Get quiz status and in-progress session for a user
 * GET /api/v1/quiz/status/:userId
 * 
 * Returns:
 * - hasCompletedQuiz: true if user has finished the quiz
 * - hasInProgressQuiz: true if user has an incomplete session with answers
 * - inProgressSession: session details if in-progress quiz exists
 */
exports.getQuizStatus = async (req, res, next) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { userId } = req.params;
    
    console.log(`🔍 [Quiz Status] Checking status for user: ${userId}`);
    
    // Step 1: Check if user has completed the quiz
    const completedQuery = `
      SELECT completed_at, retake_available_at
      FROM user_quiz_results
      WHERE LOWER(user_id::text) = LOWER($1)
      ORDER BY completed_at DESC
      LIMIT 1
    `;
    
    const completedResult = await query(completedQuery, [userId]);
    
    if (completedResult.rows.length > 0) {
      console.log(`✅ [Quiz Status] User has completed quiz`);
      return res.json({
        success: true,
        hasCompletedQuiz: true,
        hasInProgressQuiz: false,
        completedAt: completedResult.rows[0].completed_at,
        retakeAvailableAt: completedResult.rows[0].retake_available_at
      });
    }
    
    // Step 2: Check for in-progress quiz
    // Query user_quiz_progress directly (doesn't rely on quiz_sessions)
    const progressQuery = `
      SELECT 
        COUNT(DISTINCT question_id) as questions_answered,
        MAX(layer_number) as current_layer,
        MAX(answered_at) as last_answered_at,
        MIN(answered_at) as started_at,
        session_id
      FROM user_quiz_progress
      WHERE LOWER(user_id::text) = LOWER($1)
      GROUP BY session_id
      ORDER BY MAX(answered_at) DESC
      LIMIT 1
    `;
    
    const progressResult = await query(progressQuery, [userId]);
    
    if (progressResult.rows.length > 0) {
      const progress = progressResult.rows[0];
      const questionsAnswered = parseInt(progress.questions_answered);
      
      console.log(`📊 [Quiz Status] Found quiz progress:`);
      console.log(`   Questions answered: ${questionsAnswered}`);
      console.log(`   Current layer: ${progress.current_layer}`);
      console.log(`   Session ID: ${progress.session_id || 'NULL'}`);
      
      if (questionsAnswered > 0) {
        return res.json({
          success: true,
          hasCompletedQuiz: false,
          hasInProgressQuiz: true,
          inProgressSession: {
            sessionId: progress.session_id || null,
            startedAt: progress.started_at,
            questionsAnswered: questionsAnswered,
            currentLayer: parseInt(progress.current_layer) || 1,
            lastAnsweredAt: progress.last_answered_at
          }
        });
      }
    }
    
    // Step 3: No completed quiz and no progress
    console.log(`ℹ️ [Quiz Status] User has not started quiz yet`);
    return res.json({
      success: true,
      hasCompletedQuiz: false,
      hasInProgressQuiz: false
    });
    
  } catch (error) {
    console.error('❌ [Quiz Status] Error:', error);
    console.error('❌ [Quiz Status] Stack:', error.stack);
    next(error);
  }
};

/**
 * Get layer introduction content
 * GET /api/v1/quiz/layer-intro/:layer
 */
exports.getLayerIntro = async (req, res, next) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { layer } = req.params;

    const queryText = `
      SELECT layer_number, title, description, content
      FROM layer_intro_content
      WHERE layer_number = $1
    `;

    const result = await query(queryText, [layer]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Layer intro content not found'
      });
    }

    res.json({
      success: true,
      intro: {
        layerNumber: result.rows[0].layer_number,
        title: result.rows[0].title,
        description: result.rows[0].description,
        content: result.rows[0].content
      }
    });

  } catch (error) {
    next(error);
  }
};







// /**
//  * Quiz Controller - ENHANCED VERSION
//  * Added: getUserAnswerHistory endpoint for dashboard
//  * 
//  * INSTRUCTIONS:
//  * 1. Copy this file to: brandscaling-nodejs-backend/src/controllers/quizController.js
//  * 2. Or add just the new endpoint (getUserAnswerHistory) to your existing file
//  */

// const { validationResult } = require('express-validator');
// const { query } = require('../config/database');

// // ============================================
// // Helper Functions
// // ============================================

// const handleValidationErrors = (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     res.status(400).json({
//       success: false,
//       errors: errors.array()
//     });
//     return true;
//   }
//   return false;
// };

// // ============================================
// // NEW ENDPOINT: Get User Answer History
// // ============================================

// /**
//  * Get user's complete answer history with question details
//  * GET /api/v1/quiz/user-answers/:userId
//  * 
//  * Returns all answers with:
//  * - Question text
//  * - Selected option text
//  * - Layer information
//  * - Timestamps
//  */
// exports.getUserAnswerHistory = async (req, res, next) => {
//   try {
//     if (handleValidationErrors(req, res)) return;

//     const { userId } = req.params;
//     const { sessionId } = req.query; // Optional: filter by specific session

//     let queryText = `
//       SELECT 
//         p.id,
//         p.session_id,
//         p.layer_number,
//         p.answered_at,
//         q.id as question_id,
//         q.question_number,
//         q.question_text,
//         q.question_type,
//         o.id as selected_option_id,
//         o.option_key as selected_option_key,
//         o.option_text as selected_option_text,
//         o.option_description as selected_option_description,
//         o.score_type as selected_score_type
//       FROM user_quiz_progress p
//       JOIN quiz_questions q ON p.question_id = q.id
//       JOIN quiz_options o ON p.selected_option_id = o.id
//       WHERE p.user_id = $1
//     `;

//     const params = [userId];

//     if (sessionId) {
//       params.push(sessionId);
//       queryText += ` AND p.session_id = $${params.length}`;
//     }

//     queryText += ' ORDER BY p.layer_number, q.question_number';

//     const result = await query(queryText, params);

//     if (result.rows.length === 0) {
//       return res.json({
//         success: true,
//         userId,
//         hasAnswers: false,
//         answers: [],
//         message: 'No quiz answers found for this user'
//       });
//     }

//     // Group answers by layer
//     const answersByLayer = {};
    
//     result.rows.forEach(row => {
//       const layerNum = row.layer_number;
      
//       if (!answersByLayer[layerNum]) {
//         answersByLayer[layerNum] = {
//           layerNumber: layerNum,
//           answers: []
//         };
//       }

//       answersByLayer[layerNum].answers.push({
//         id: row.id,
//         sessionId: row.session_id,
//         questionId: row.question_id,
//         questionNumber: row.question_number,
//         questionText: row.question_text,
//         questionType: row.question_type,
//         selectedOption: {
//           id: row.selected_option_id,
//           key: row.selected_option_key,
//           text: row.selected_option_text,
//           description: row.selected_option_description,
//           scoreType: row.selected_score_type
//         },
//         answeredAt: row.answered_at
//       });
//     });

//     // Convert to array and sort by layer
//     const layers = Object.values(answersByLayer).sort((a, b) => a.layerNumber - b.layerNumber);

//     res.json({
//       success: true,
//       userId,
//       hasAnswers: true,
//       totalAnswers: result.rows.length,
//       layers,
//       // Flat list for simple iteration
//       allAnswers: result.rows.map(row => ({
//         id: row.id,
//         sessionId: row.session_id,
//         layerNumber: row.layer_number,
//         questionId: row.question_id,
//         questionNumber: row.question_number,
//         questionText: row.question_text,
//         questionType: row.question_type,
//         selectedOption: {
//           id: row.selected_option_id,
//           key: row.selected_option_key,
//           text: row.selected_option_text,
//           description: row.selected_option_description,
//           scoreType: row.selected_score_type
//         },
//         answeredAt: row.answered_at
//       }))
//     });

//   } catch (error) {
//     next(error);
//   }
// };

// // ============================================
// // EXISTING ENDPOINTS (Keep all of these)
// // ============================================

// /**
//  * Get quiz questions
//  * GET /api/v1/quiz/questions?layer=1&type=architect
//  */
// exports.getQuestions = async (req, res, next) => {
//   try {
//     if (handleValidationErrors(req, res)) return;

//     const { layer, type } = req.query;

//     let queryText = `
//       SELECT 
//         q.id, q.layer_number, q.question_number, q.question_text, 
//         q.question_type, q.weight,
//         o.id as option_id, o.option_key, o.option_text, 
//         o.option_description, o.score_type
//       FROM quiz_questions q
//       LEFT JOIN quiz_options o ON q.id = o.question_id
//       WHERE 1=1
//     `;

//     const params = [];

//     if (layer) {
//       params.push(layer);
//       queryText += ` AND q.layer_number = $${params.length}`;
//     }

//     if (type) {
//       params.push(type);
//       queryText += ` AND q.question_type = $${params.length}`;
//     }

//     queryText += ' ORDER BY q.id, o.id';

//     const result = await query(queryText, params);

//     // Format response - group options by question
//     const questions = {};
//     result.rows.forEach(row => {
//       const qId = row.id;
//       if (!questions[qId]) {
//         questions[qId] = {
//           id: row.id,
//           layerNumber: row.layer_number,
//           questionNumber: row.question_number,
//           questionText: row.question_text,
//           questionType: row.question_type,
//           weight: row.weight,
//           options: []
//         };
//       }

//       if (row.option_id) {
//         questions[qId].options.push({
//           id: row.option_id,
//           optionKey: row.option_key,
//           optionText: row.option_text,
//           optionDescription: row.option_description,
//           scoreType: row.score_type
//         });
//       }
//     });

//     const questionList = Object.values(questions);

//     res.json({
//       success: true,
//       layer: layer ? parseInt(layer) : null,
//       count: questionList.length,
//       questions: questionList
//     });

//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Create a new quiz session
//  * POST /api/v1/quiz/session
//  */
// exports.createSession = async (req, res, next) => {
//   try {
//     if (handleValidationErrors(req, res)) return;

//     const { userId, startedAt } = req.body;

//     const queryText = `
//       INSERT INTO quiz_sessions (user_id, started_at)
//       VALUES ($1, $2)
//       RETURNING id, user_id, started_at, is_completed
//     `;

//     const result = await query(queryText, [
//       userId,
//       startedAt || new Date().toISOString()
//     ]);

//     res.status(201).json({
//       success: true,
//       session: {
//         id: result.rows[0].id,
//         userId: result.rows[0].user_id,
//         startedAt: result.rows[0].started_at,
//         isCompleted: result.rows[0].is_completed
//       }
//     });

//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Save quiz progress (single answer)
//  * POST /api/v1/quiz/progress
//  */
// exports.saveProgress = async (req, res, next) => {
//   try {
//     if (handleValidationErrors(req, res)) return;

//     const { userId, sessionId, questionId, selectedOptionId, layerNumber, answeredAt } = req.body;

//     const queryText = `
//       INSERT INTO user_quiz_progress 
//       (user_id, session_id, question_id, selected_option_id, layer_number, answered_at)
//       VALUES ($1, $2, $3, $4, $5, $6)
//       ON CONFLICT (session_id, question_id) 
//       DO UPDATE SET 
//         selected_option_id = EXCLUDED.selected_option_id,
//         answered_at = EXCLUDED.answered_at
//       RETURNING id
//     `;

//     const result = await query(queryText, [
//       userId,
//       sessionId,
//       questionId,
//       selectedOptionId,
//       layerNumber,
//       answeredAt || new Date().toISOString()
//     ]);

//     res.json({
//       success: true,
//       message: 'Progress saved',
//       progressId: result.rows[0].id
//     });

//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Get user's quiz progress
//  * GET /api/v1/quiz/progress/:userId
//  */
// exports.getProgress = async (req, res, next) => {
//   try {
//     if (handleValidationErrors(req, res)) return;

//     const { userId } = req.params;

//     // Get latest session
//     const sessionQuery = `
//       SELECT id, started_at, is_completed, completed_at
//       FROM quiz_sessions
//       WHERE user_id = $1
//       ORDER BY started_at DESC
//       LIMIT 1
//     `;

//     const sessionResult = await query(sessionQuery, [userId]);

//     if (sessionResult.rows.length === 0) {
//       return res.json({
//         success: true,
//         userId,
//         hasSession: false,
//         progress: []
//       });
//     }

//     const session = sessionResult.rows[0];

//     // Get progress for this session
//     const progressQuery = `
//       SELECT question_id, selected_option_id, layer_number, answered_at
//       FROM user_quiz_progress
//       WHERE session_id = $1
//       ORDER BY answered_at
//     `;

//     const progressResult = await query(progressQuery, [session.id]);

//     res.json({
//       success: true,
//       userId,
//       hasSession: true,
//       session: {
//         id: session.id,
//         startedAt: session.started_at,
//         isCompleted: session.is_completed,
//         completedAt: session.completed_at
//       },
//       progress: progressResult.rows.map(row => ({
//         questionId: row.question_id,
//         selectedOptionId: row.selected_option_id,
//         layerNumber: row.layer_number,
//         answeredAt: row.answered_at
//       })),
//       totalAnswered: progressResult.rows.length
//     });

//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Sync multiple offline answers
//  * POST /api/v1/quiz/sync
//  */
// exports.syncAnswers = async (req, res, next) => {
//   try {
//     if (handleValidationErrors(req, res)) return;

//     const { userId, sessionId, answers } = req.body;

//     let synced = 0;
//     let failed = 0;

//     for (const answer of answers) {
//       try {
//         const queryText = `
//           INSERT INTO user_quiz_progress 
//           (user_id, session_id, question_id, selected_option_id, layer_number, answered_at)
//           VALUES ($1, $2, $3, $4, $5, $6)
//           ON CONFLICT (session_id, question_id) 
//           DO UPDATE SET 
//             selected_option_id = EXCLUDED.selected_option_id,
//             answered_at = EXCLUDED.answered_at
//         `;

//         await query(queryText, [
//           userId,
//           sessionId,
//           answer.questionId,
//           answer.selectedOptionId,
//           answer.layerNumber,
//           answer.answeredAt || new Date().toISOString()
//         ]);

//         synced++;
//       } catch (error) {
//         console.error('Failed to sync answer:', error);
//         failed++;
//       }
//     }

//     res.json({
//       success: true,
//       synced,
//       failed,
//       message: `Synced ${synced} answers successfully`
//     });

//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Save quiz results
//  * POST /api/v1/quiz/results
//  */
// exports.saveResults = async (req, res, next) => {
//   try {
//     if (handleValidationErrors(req, res)) return;

//     const {
//       userId,
//       sessionId,
//       layer1CoreType,
//       layer1Strength,
//       layer1ArchitectScore,
//       layer1AlchemistScore,
//       layer2Subtype,
//       layer2Description,
//       layer3Result,
//       layer4Result,
//       layer5Result,
//       layer6Result,
//       layer7Result,
//       completedAt
//     } = req.body;

//     // Calculate retake date (7 days from now)
//     const retakeDate = new Date();
//     retakeDate.setDate(retakeDate.getDate() + 7);

//     const queryText = `
//       INSERT INTO user_quiz_results (
//         user_id, session_id,
//         layer1_core_type, layer1_strength, 
//         layer1_architect_score, layer1_alchemist_score,
//         layer2_subtype, layer2_description,
//         layer3_result, layer4_result, layer5_result, 
//         layer6_result, layer7_result,
//         completed_at, retake_available_at
//       ) VALUES (
//         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
//       )
//       RETURNING id, retake_available_at
//     `;

//     const result = await query(queryText, [
//       userId,
//       sessionId,
//       layer1CoreType,
//       layer1Strength,
//       layer1ArchitectScore,
//       layer1AlchemistScore,
//       layer2Subtype || null,
//       layer2Description || null,
//       layer3Result ? JSON.stringify(layer3Result) : null,
//       layer4Result ? JSON.stringify(layer4Result) : null,
//       layer5Result ? JSON.stringify(layer5Result) : null,
//       layer6Result ? JSON.stringify(layer6Result) : null,
//       layer7Result ? JSON.stringify(layer7Result) : null,
//       completedAt || new Date().toISOString(),
//       retakeDate.toISOString()
//     ]);

//     // Mark session as completed
//     await query(
//       'UPDATE quiz_sessions SET is_completed = TRUE, completed_at = $1 WHERE id = $2',
//       [completedAt || new Date().toISOString(), sessionId]
//     );

//     res.status(201).json({
//       success: true,
//       resultId: result.rows[0].id,
//       retakeAvailableAt: result.rows[0].retake_available_at,
//       message: 'Quiz results saved successfully'
//     });

//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Get user's quiz results
//  * GET /api/v1/quiz/results/:userId
//  */
// exports.getResults = async (req, res, next) => {
//   try {
//     if (handleValidationErrors(req, res)) return;

//     const { userId } = req.params;

//     const queryText = `
//       SELECT 
//         id, session_id,
//         layer1_core_type, layer1_strength,
//         layer1_architect_score, layer1_alchemist_score,
//         layer2_subtype, layer2_description,
//         layer3_result, layer4_result, layer5_result,
//         layer6_result, layer7_result,
//         completed_at, retake_available_at
//       FROM user_quiz_results
//       WHERE user_id = $1
//       ORDER BY completed_at DESC
//       LIMIT 1
//     `;

//     const result = await query(queryText, [userId]);

//     if (result.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         error: 'No results found for this user'
//       });
//     }

//     const row = result.rows[0];

//     res.json({
//       success: true,
//       userId,
//       results: {
//         id: row.id,
//         sessionId: row.session_id,
//         layer1CoreType: row.layer1_core_type,
//         layer1Strength: row.layer1_strength,
//         layer1ArchitectScore: row.layer1_architect_score,
//         layer1AlchemistScore: row.layer1_alchemist_score,
//         layer2Subtype: row.layer2_subtype,
//         layer2Description: row.layer2_description,
//         layer3Result: row.layer3_result,
//         layer4Result: row.layer4_result,
//         layer5Result: row.layer5_result,
//         layer6Result: row.layer6_result,
//         layer7Result: row.layer7_result,
//         completedAt: row.completed_at,
//         retakeAvailableAt: row.retake_available_at
//       }
//     });

//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Check if user can retake the quiz (7-day restriction)
//  * GET /api/v1/quiz/retake-check/:userId
//  */
// exports.checkRetake = async (req, res, next) => {
//   try {
//     if (handleValidationErrors(req, res)) return;

//     const { userId } = req.params;

//     const queryText = `
//       SELECT completed_at, retake_available_at
//       FROM user_quiz_results
//       WHERE user_id = $1
//       ORDER BY completed_at DESC
//       LIMIT 1
//     `;

//     const result = await query(queryText, [userId]);

//     if (result.rows.length === 0) {
//       return res.json({
//         success: true,
//         allowed: true,
//         message: 'You can take the quiz now'
//       });
//     }

//     const { completed_at, retake_available_at } = result.rows[0];
//     const now = new Date();
//     const retakeDate = new Date(retake_available_at);

//     if (now >= retakeDate) {
//       res.json({
//         success: true,
//         allowed: true,
//         lastCompletionDate: completed_at,
//         message: 'You can retake the quiz now'
//       });
//     } else {
//       const timeRemaining = retakeDate - now;
//       const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
//       const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));

//       res.json({
//         success: true,
//         allowed: false,
//         lastCompletionDate: completed_at,
//         retakeAvailableAt: retake_available_at,
//         daysRemaining,
//         hoursRemaining,
//         message: `You can retake the quiz in ${daysRemaining} days`
//       });
//     }

//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Get layer introduction content
//  * GET /api/v1/quiz/layer-intro/:layer
//  */
// exports.getLayerIntro = async (req, res, next) => {
//   try {
//     if (handleValidationErrors(req, res)) return;

//     const { layer } = req.params;

//     const queryText = `
//       SELECT layer_number, title, description, content
//       FROM layer_intro_content
//       WHERE layer_number = $1
//     `;

//     const result = await query(queryText, [layer]);

//     if (result.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         error: 'Layer intro content not found'
//       });
//     }

//     res.json({
//       success: true,
//       intro: {
//         layerNumber: result.rows[0].layer_number,
//         title: result.rows[0].title,
//         description: result.rows[0].description,
//         content: result.rows[0].content
//       }
//     });

//   } catch (error) {
//     next(error);
//   }
// };
