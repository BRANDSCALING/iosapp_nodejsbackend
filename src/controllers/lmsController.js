/**
 * LMS Controller (UCWS)
 * Handles fetching and progress for the iOS app: programs, modules, lessons, content items.
 * Kept separate from admin logic.
 */

const { query } = require('../config/database');

/**
 * Resolve user id from request (JWT or x-user-id / query)
 */
function getUserId(req) {
  return req.userId || req.user?.id || req.user?.sub || req.headers['x-user-id'] || req.query.userId;
}

/**
 * Get all programs available to the authenticated user
 * GET /api/user/lms/programs
 */
exports.getPrograms = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Provide userId via x-user-id header or userId query param.',
      });
    }

    const { rows } = await query(
      `SELECT p.id, p.name, p.title, p.description, p.icon_url, p.tier, p.display_order, p.is_active, p.created_at, p.updated_at
       FROM programs p
       JOIN user_program_access upa ON p.id = upa.program_id
       WHERE upa.user_id = $1::uuid AND p.is_active = true
       ORDER BY p.display_order`,
      [userId]
    );

    const programs = rows.map((p) => ({
      id: p.id,
      name: p.name,
      title: p.title,
      description: p.description,
      iconUrl: p.icon_url,
      tier: p.tier,
      displayOrder: p.display_order,
      isActive: p.is_active,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    res.json({ success: true, programs });
  } catch (error) {
    console.error('❌ [LMS] getPrograms error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch programs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get full content for a single program (modules, lessons, content items) with completion flags
 * GET /api/user/lms/programs/:programId
 */
exports.getProgramContent = async (req, res) => {
  try {
    const { programId } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    // Ensure user has access to this program
    const accessCheck = await query(
      `SELECT 1 FROM user_program_access
       WHERE user_id = $1::uuid AND program_id = $2::uuid`,
      [userId, programId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this program.',
      });
    }

    const { rows } = await query(
      `SELECT
          p.id AS program_id, p.title AS program_title, p.name AS program_name, p.description AS program_description,
          p.icon_url AS program_icon_url, p.tier AS program_tier, p.display_order AS program_order,
          m.id AS module_id, m.title AS module_title, m.display_order AS module_order,
          l.id AS lesson_id, l.title AS lesson_title, l.display_order AS lesson_order,
          l.icon_url AS lesson_icon_url, l.video_url AS lesson_video_url,
          l.downloadable_files AS lesson_downloadable_files,
          ci.id AS item_id, ci.title AS item_title, ci.content_type AS item_content_type,
          ci.metadata AS item_metadata, ci.display_order AS item_order,
          (CASE WHEN ulc.user_id IS NOT NULL THEN true ELSE false END) AS is_completed
       FROM programs p
       LEFT JOIN modules m ON m.program_id = p.id AND m.is_active = true
       LEFT JOIN lessons l ON l.module_id = m.id AND l.is_active = true
       LEFT JOIN content_items ci ON ci.lesson_id = l.id AND ci.is_active = true
       LEFT JOIN user_lesson_completions ulc ON ulc.lesson_id = l.id AND ulc.user_id = $1::uuid
       WHERE p.id = $2::uuid AND p.is_active = true
       ORDER BY m.display_order NULLS LAST, l.display_order NULLS LAST, ci.display_order NULLS LAST`,
      [userId, programId]
    );

    if (rows.length === 0) {
      const programExists = await query(
        'SELECT id, title FROM programs WHERE id = $1::uuid',
        [programId]
      );
      if (programExists.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Program not found.',
        });
      }
      return res.json({
        success: true,
        programContent: {
          program: {
            id: programExists.rows[0].id,
            title: programExists.rows[0].title,
            modules: [],
          },
        },
      });
    }

    // Build nested structure from flat rows
    const first = rows[0];
    const program = {
      id: first.program_id,
      name: first.program_name,
      title: first.program_title,
      description: first.program_description,
      iconUrl: first.program_icon_url,
      tier: first.program_tier,
      displayOrder: first.program_order,
      modules: [],
    };

    const modulesById = new Map();
    const lessonsByModule = new Map();

    for (const r of rows) {
      if (r.module_id && !modulesById.has(r.module_id)) {
        modulesById.set(r.module_id, {
          id: r.module_id,
          title: r.module_title,
          displayOrder: r.module_order,
          lessons: [],
        });
      }
      if (r.lesson_id) {
        const key = `${r.module_id}-${r.lesson_id}`;
        if (!lessonsByModule.has(key)) {
          lessonsByModule.set(key, {
            id: r.lesson_id,
            title: r.lesson_title,
            displayOrder: r.lesson_order,
            iconUrl: r.lesson_icon_url ?? null,
            isCompleted: Boolean(r.is_completed),
            videoURL: r.lesson_video_url ?? null,
            downloadableFiles: (() => {
              const raw = r.lesson_downloadable_files;
              if (!raw) return [];
              if (Array.isArray(raw)) return raw;
              if (typeof raw === 'string') {
                try { return JSON.parse(raw); } catch (_) { return []; }
              }
              return [];
            })(),
            contentItems: [],
          });
        }
        if (r.item_id) {
          const lessonKey = key;
          const lesson = lessonsByModule.get(lessonKey);
          const meta = typeof r.item_metadata === 'object' ? r.item_metadata : (r.item_metadata ? (typeof r.item_metadata === 'string' ? (() => { try { return JSON.parse(r.item_metadata); } catch (_) { return {}; } })() : {}) : {});
          if (!lesson.iconUrl && meta?.icon_url) lesson.iconUrl = meta.icon_url;
          lesson.contentItems.push({
            id: r.item_id,
            title: r.item_title,
            contentType: r.item_content_type,
            metadata: meta,
            iconUrl: meta?.icon_url ?? null,
            displayOrder: r.item_order,
          });
        }
      }
    }

    // Attach lessons to modules in order
    const moduleOrder = [...new Set(rows.map((r) => r.module_id).filter(Boolean))];
    const lessonOrderByModule = {};
    rows.forEach((r) => {
      if (r.lesson_id && r.module_id) {
        if (!lessonOrderByModule[r.module_id]) lessonOrderByModule[r.module_id] = [];
        if (!lessonOrderByModule[r.module_id].includes(r.lesson_id)) {
          lessonOrderByModule[r.module_id].push(r.lesson_id);
        }
      }
    });

    moduleOrder.forEach((mid) => {
      const mod = modulesById.get(mid);
      if (!mod) return;
      const lessonIds = lessonOrderByModule[mid] || [];
      lessonIds.forEach((lid) => {
        const key = `${mid}-${lid}`;
        const lesson = lessonsByModule.get(key);
        if (lesson) {
          lesson.contentItems.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
          mod.lessons.push(lesson);
        }
      });
      mod.lessons.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      program.modules.push(mod);
    });
    program.modules.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    res.json({
      success: true,
      programContent: {
        program,
      },
    });
  } catch (error) {
    console.error('❌ [LMS] getProgramContent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch program content',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Mark a lesson as complete for the authenticated user
 * POST /api/v1/lms/lessons/:lessonId/complete
 * Auth: isAdminOrUcws (sets req.userId / req.user from token).
 */
exports.markLessonComplete = async (req, res) => {
  try {
    const lessonId = req.params.lessonId || req.params.id;
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    // UCWS users have open access; only non-ucws users need program enrollment check
    const userTypeResult = await query(
      'SELECT user_type FROM users WHERE id = $1::uuid',
      [userId]
    );
    const userType = userTypeResult.rows[0]?.user_type;

    // Verify lesson exists (and get program_id for access check when needed)
    const lessonCheck = await query(
      `SELECT l.id, l.module_id, m.program_id
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
       WHERE l.id = $1::uuid`,
      [lessonId]
    );

    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found.',
      });
    }

    const programId = lessonCheck.rows[0].program_id;

    if (userType != null && String(userType).toLowerCase() === 'ucws') {
      // UCWS users have open access; skip program enrollment check
    } else {
      const accessCheck = await query(
        `SELECT 1 FROM user_program_access
         WHERE user_id = $1::uuid AND program_id = $2::uuid`,
        [userId, programId]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this program.',
        });
      }
    }

    await query(
      `INSERT INTO lesson_progress (user_id, lesson_id, completed_at)
       VALUES ($1::uuid, $2::uuid, NOW())
       ON CONFLICT (user_id, lesson_id) DO UPDATE SET completed_at = NOW()`,
      [userId, lessonId]
    );

    const insertResult = await query(
      `INSERT INTO user_lesson_completions (user_id, lesson_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (user_id, lesson_id) DO NOTHING
       RETURNING user_id, lesson_id`,
      [userId, lessonId]
    );

    // rowCount 0 means already complete (ON CONFLICT DO NOTHING); still success
    return res.json({ success: true });
  } catch (error) {
    console.error('❌ [LMS] markLessonComplete error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark lesson complete',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
