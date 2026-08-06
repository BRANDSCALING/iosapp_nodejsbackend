/**
 * Zoom Recordings controller
 *
 * Recorded Deal Clinics + Mastermind Days, managed from the Admin Portal and
 * consumed read-only by the iOS app.
 *
 * Hierarchy: category ('deal_clinic' | 'mastermind') -> zoom_folders (monthly)
 *            -> zoom_recordings -> zoom_recording_items (video: pasted Vimeo URL).
 *
 * User endpoints   (/api/v1/zoom/*)    -> camelCase JSON, active content only.
 * Admin endpoints  (/api/admin/zoom/*) -> raw rows (snake_case) incl. inactive,
 *                                         single POST per entity dispatching on
 *                                         body.action = create | update | delete
 *                                         (same convention as the UCWS LMS admin).
 */

const { query } = require('../config/database');

const CATEGORIES = ['deal_clinic', 'mastermind'];
const CATEGORY_LABELS = {
  deal_clinic: 'Deal Clinic',
  mastermind: 'Mastermind Days',
};
const ITEM_TYPES = ['video', 'document'];

// ---------------------------------------------------------------------------
// Input coercion helpers — the admin form can send free text; never throw.
// ---------------------------------------------------------------------------

/** "2026-08", "2026-08-01", "08/2026", "August 2026" -> "2026-08-01"; else null. */
function toMonthDate(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);          // 2026-08[-01]
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-01`;
  m = s.match(/^(\d{1,2})\/(\d{4})$/);                           // 08/2026
  if (m) return `${m[2]}-${String(m[1]).padStart(2, '0')}-01`;
  const parsed = new Date(s);                                    // "August 2026"
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-01`;
  }
  return null;
}

function toDateOrNull(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (!s) return null;
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function toIntOrDefault(val, def = 0) {
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? def : n;
}

function toBool(val, def = true) {
  if (val === undefined || val === null) return def;
  if (typeof val === 'boolean') return val;
  return String(val).toLowerCase() === 'true';
}

function serverError(res, label, error) {
  console.error(`❌ [ZOOM] ${label}:`, error.message);
  return res.status(500).json({
    success: false,
    error: 'Server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
}

// ---------------------------------------------------------------------------
// USER ENDPOINTS (read-only, camelCase, active content only)
// ---------------------------------------------------------------------------

// GET /api/v1/zoom/categories
exports.getCategories = async (req, res) => {
  try {
    const result = await query(
      `SELECT f.category,
              COUNT(DISTINCT f.id) AS folder_count,
              COUNT(DISTINCT r.id) AS recording_count
         FROM zoom_folders f
         LEFT JOIN zoom_recordings r ON r.folder_id = f.id AND r.is_active = TRUE
        WHERE f.is_active = TRUE
        GROUP BY f.category`
    );
    const byCategory = Object.fromEntries(result.rows.map((r) => [r.category, r]));
    const categories = CATEGORIES.map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      folderCount: parseInt(byCategory[category]?.folder_count || 0, 10),
      recordingCount: parseInt(byCategory[category]?.recording_count || 0, 10),
    }));
    return res.json({ success: true, categories });
  } catch (error) {
    return serverError(res, 'getCategories', error);
  }
};

// GET /api/v1/zoom/folders?category=deal_clinic
exports.getFolders = async (req, res) => {
  const { category } = req.query;
  if (!category || !CATEGORIES.includes(category)) {
    return res.status(400).json({ success: false, error: 'A valid category is required.' });
  }
  try {
    const result = await query(
      `SELECT f.id, f.category, f.title, f.period_month::text AS period_month, f.description, f.display_order,
              COUNT(i.id) FILTER (WHERE i.item_type = 'video')    AS video_count,
              COUNT(i.id) FILTER (WHERE i.item_type = 'document') AS document_count
         FROM zoom_folders f
         LEFT JOIN zoom_recordings r ON r.folder_id = f.id AND r.is_active = TRUE
         LEFT JOIN zoom_recording_items i ON i.recording_id = r.id
        WHERE f.is_active = TRUE AND f.category = $1
        GROUP BY f.id
        ORDER BY f.display_order ASC, f.period_month DESC NULLS LAST, f.created_at DESC`,
      [category]
    );
    const folders = result.rows.map((f) => ({
      id: f.id,
      category: f.category,
      title: f.title,
      periodMonth: f.period_month,
      description: f.description,
      displayOrder: f.display_order,
      videoCount: parseInt(f.video_count || 0, 10),
      documentCount: parseInt(f.document_count || 0, 10),
    }));
    return res.json({ success: true, folders });
  } catch (error) {
    return serverError(res, 'getFolders', error);
  }
};

// GET /api/v1/zoom/folders/:id
exports.getFolderById = async (req, res) => {
  const { id } = req.params;
  try {
    const folderResult = await query(
      `SELECT id, category, title, period_month::text AS period_month, description, display_order
         FROM zoom_folders WHERE id = $1::uuid AND is_active = TRUE`,
      [id]
    );
    if (folderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Folder not found.' });
    }
    const f = folderResult.rows[0];

    const rowsResult = await query(
      `SELECT r.id AS recording_id, r.title, r.description, r.recorded_on::text AS recorded_on, r.display_order AS recording_order,
              i.id AS item_id, i.item_type, i.title AS item_title, i.vimeo_url, i.file_id,
              i.display_order AS item_order
         FROM zoom_recordings r
         LEFT JOIN zoom_recording_items i ON i.recording_id = r.id
        WHERE r.folder_id = $1::uuid AND r.is_active = TRUE
        ORDER BY r.display_order ASC, r.recorded_on DESC NULLS LAST, i.display_order ASC`,
      [id]
    );

    const recordingsMap = new Map();
    for (const row of rowsResult.rows) {
      if (!recordingsMap.has(row.recording_id)) {
        recordingsMap.set(row.recording_id, {
          id: row.recording_id,
          title: row.title,
          description: row.description,
          recordedOn: row.recorded_on,
          displayOrder: row.recording_order,
          items: [],
        });
      }
      if (row.item_id) {
        recordingsMap.get(row.recording_id).items.push({
          id: row.item_id,
          itemType: row.item_type,
          title: row.item_title,
          vimeoUrl: row.vimeo_url,
          fileId: row.file_id,
          displayOrder: row.item_order,
        });
      }
    }

    return res.json({
      success: true,
      folder: {
        id: f.id,
        category: f.category,
        title: f.title,
        periodMonth: f.period_month,
        description: f.description,
        displayOrder: f.display_order,
      },
      recordings: Array.from(recordingsMap.values()),
    });
  } catch (error) {
    return serverError(res, 'getFolderById', error);
  }
};

// GET /api/v1/zoom/recordings/:id   (items returned as a SIBLING of recording — iOS expects this)
exports.getRecordingById = async (req, res) => {
  const { id } = req.params;
  try {
    const recResult = await query(
      `SELECT r.id, r.folder_id, r.title, r.description, r.recorded_on::text AS recorded_on, r.display_order
         FROM zoom_recordings r
         JOIN zoom_folders f ON f.id = r.folder_id AND f.is_active = TRUE
        WHERE r.id = $1::uuid AND r.is_active = TRUE`,
      [id]
    );
    if (recResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Recording not found.' });
    }
    const r = recResult.rows[0];

    const itemsResult = await query(
      `SELECT id, item_type, title, vimeo_url, file_id, display_order
         FROM zoom_recording_items
        WHERE recording_id = $1::uuid
        ORDER BY display_order ASC, created_at ASC`,
      [id]
    );

    return res.json({
      success: true,
      recording: {
        id: r.id,
        folderId: r.folder_id,
        title: r.title,
        description: r.description,
        recordedOn: r.recorded_on,
        displayOrder: r.display_order,
      },
      items: itemsResult.rows.map((i) => ({
        id: i.id,
        itemType: i.item_type,
        title: i.title,
        vimeoUrl: i.vimeo_url,
        fileId: i.file_id,
        displayOrder: i.display_order,
      })),
    });
  } catch (error) {
    return serverError(res, 'getRecordingById', error);
  }
};

// ---------------------------------------------------------------------------
// ADMIN ENDPOINTS (raw rows incl. inactive; POSTs dispatch on body.action)
// ---------------------------------------------------------------------------

// GET /api/admin/zoom/folders?category=
exports.adminListFolders = async (req, res) => {
  const { category } = req.query;
  try {
    const params = [];
    let where = '';
    if (category) {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, error: 'Invalid category.' });
      }
      params.push(category);
      where = 'WHERE f.category = $1';
    }
    const result = await query(
      `SELECT f.*, f.period_month::text AS period_month, COUNT(r.id) AS recording_count
         FROM zoom_folders f
         LEFT JOIN zoom_recordings r ON r.folder_id = f.id
        ${where}
        GROUP BY f.id
        ORDER BY f.display_order ASC, f.period_month DESC NULLS LAST, f.created_at DESC`,
      params
    );
    return res.json({ success: true, folders: result.rows });
  } catch (error) {
    return serverError(res, 'adminListFolders', error);
  }
};

// POST /api/admin/zoom/folders  { action: create|update|delete, ... }
exports.adminSaveFolder = async (req, res) => {
  const { action } = req.body;
  try {
    if (action === 'create') {
      const { category, title } = req.body;
      if (!category || !CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, error: 'A valid category is required.' });
      }
      if (!title || !String(title).trim()) {
        return res.status(400).json({ success: false, error: 'Title is required.' });
      }
      const result = await query(
        `INSERT INTO zoom_folders (category, title, period_month, description, display_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          category,
          String(title).trim(),
          toMonthDate(req.body.period_month ?? req.body.periodMonth),
          req.body.description || null,
          toIntOrDefault(req.body.display_order ?? req.body.displayOrder, 0),
          toBool(req.body.is_active ?? req.body.isActive, true),
        ]
      );
      return res.status(201).json({ success: true, folder: result.rows[0] });
    }

    const id = req.body.id;
    if (!id) return res.status(400).json({ success: false, error: 'Folder id is required.' });

    if (action === 'update') {
      // Partial update: only fields present in the body are touched, so a
      // reorder (displayOrder only) can never wipe description/period_month.
      const sets = [];
      const params = [];
      const setField = (column, value) => {
        params.push(value);
        sets.push(`${column} = $${params.length}`);
      };
      const has = (k) => Object.prototype.hasOwnProperty.call(req.body, k);

      if (has('category') && CATEGORIES.includes(req.body.category)) setField('category', req.body.category);
      if (has('title') && String(req.body.title).trim()) setField('title', String(req.body.title).trim());
      if (has('period_month') || has('periodMonth')) {
        setField('period_month', toMonthDate(req.body.period_month ?? req.body.periodMonth));
      }
      if (has('description')) setField('description', req.body.description || null);
      if (has('display_order') || has('displayOrder')) {
        setField('display_order', toIntOrDefault(req.body.display_order ?? req.body.displayOrder, 0));
      }
      if (has('is_active') || has('isActive')) {
        setField('is_active', toBool(req.body.is_active ?? req.body.isActive, true));
      }
      if (sets.length === 0) return res.status(400).json({ success: false, error: 'No fields to update.' });

      params.push(id);
      const result = await query(
        `UPDATE zoom_folders SET ${sets.join(', ')}, updated_at = NOW()
          WHERE id = $${params.length}::uuid RETURNING *`,
        params
      );
      if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Folder not found.' });
      return res.json({ success: true, folder: result.rows[0] });
    }

    if (action === 'delete') {
      // zoom_recordings + zoom_recording_items cascade via FK ON DELETE CASCADE.
      const result = await query('DELETE FROM zoom_folders WHERE id = $1::uuid RETURNING id', [id]);
      if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Folder not found.' });
      return res.json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Invalid action. Use create, update, or delete.' });
  } catch (error) {
    return serverError(res, 'adminSaveFolder', error);
  }
};

// GET /api/admin/zoom/recordings?folderId=
exports.adminListRecordings = async (req, res) => {
  const folderId = req.query.folderId ?? req.query.folder_id;
  if (!folderId) return res.status(400).json({ success: false, error: 'folderId is required.' });
  try {
    const result = await query(
      `SELECT r.*, r.recorded_on::text AS recorded_on, COUNT(i.id) AS item_count
         FROM zoom_recordings r
         LEFT JOIN zoom_recording_items i ON i.recording_id = r.id
        WHERE r.folder_id = $1::uuid
        GROUP BY r.id
        ORDER BY r.display_order ASC, r.recorded_on DESC NULLS LAST, r.created_at DESC`,
      [folderId]
    );
    return res.json({ success: true, recordings: result.rows });
  } catch (error) {
    return serverError(res, 'adminListRecordings', error);
  }
};

// POST /api/admin/zoom/recordings  { action, ... }
exports.adminSaveRecording = async (req, res) => {
  const { action } = req.body;
  try {
    if (action === 'create') {
      const folderId = req.body.folder_id ?? req.body.folderId;
      const { title } = req.body;
      if (!folderId) return res.status(400).json({ success: false, error: 'folderId is required.' });
      if (!title || !String(title).trim()) {
        return res.status(400).json({ success: false, error: 'Title is required.' });
      }
      const result = await query(
        `INSERT INTO zoom_recordings (folder_id, title, description, recorded_on, display_order, is_active)
         VALUES ($1::uuid, $2, $3, $4, $5, $6) RETURNING *`,
        [
          folderId,
          String(title).trim(),
          req.body.description || null,
          toDateOrNull(req.body.recorded_on ?? req.body.recordedOn),
          toIntOrDefault(req.body.display_order ?? req.body.displayOrder, 0),
          toBool(req.body.is_active ?? req.body.isActive, true),
        ]
      );
      return res.status(201).json({ success: true, recording: result.rows[0] });
    }

    const id = req.body.id;
    if (!id) return res.status(400).json({ success: false, error: 'Recording id is required.' });

    if (action === 'update') {
      const sets = [];
      const params = [];
      const setField = (column, value) => {
        params.push(value);
        sets.push(`${column} = $${params.length}`);
      };
      const has = (k) => Object.prototype.hasOwnProperty.call(req.body, k);

      if (has('folder_id') || has('folderId')) {
        setField('folder_id', req.body.folder_id ?? req.body.folderId);
      }
      if (has('title') && String(req.body.title).trim()) setField('title', String(req.body.title).trim());
      if (has('description')) setField('description', req.body.description || null);
      if (has('recorded_on') || has('recordedOn')) {
        setField('recorded_on', toDateOrNull(req.body.recorded_on ?? req.body.recordedOn));
      }
      if (has('display_order') || has('displayOrder')) {
        setField('display_order', toIntOrDefault(req.body.display_order ?? req.body.displayOrder, 0));
      }
      if (has('is_active') || has('isActive')) {
        setField('is_active', toBool(req.body.is_active ?? req.body.isActive, true));
      }
      if (sets.length === 0) return res.status(400).json({ success: false, error: 'No fields to update.' });

      params.push(id);
      const result = await query(
        `UPDATE zoom_recordings SET ${sets.join(', ')}, updated_at = NOW()
          WHERE id = $${params.length}::uuid RETURNING *`,
        params
      );
      if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Recording not found.' });
      return res.json({ success: true, recording: result.rows[0] });
    }

    if (action === 'delete') {
      const result = await query('DELETE FROM zoom_recordings WHERE id = $1::uuid RETURNING id', [id]);
      if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Recording not found.' });
      return res.json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Invalid action. Use create, update, or delete.' });
  } catch (error) {
    return serverError(res, 'adminSaveRecording', error);
  }
};

// GET /api/admin/zoom/recordings/:id/items
exports.adminListItems = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT * FROM zoom_recording_items
        WHERE recording_id = $1::uuid
        ORDER BY display_order ASC, created_at ASC`,
      [id]
    );
    return res.json({ success: true, items: result.rows });
  } catch (error) {
    return serverError(res, 'adminListItems', error);
  }
};

// POST /api/admin/zoom/recording-items  { action, ... }
exports.adminSaveItem = async (req, res) => {
  const { action } = req.body;
  try {
    if (action === 'create') {
      const recordingId = req.body.recording_id ?? req.body.recordingId;
      const itemType = req.body.item_type ?? req.body.itemType ?? 'video';
      if (!recordingId) return res.status(400).json({ success: false, error: 'recordingId is required.' });
      if (!ITEM_TYPES.includes(itemType)) {
        return res.status(400).json({ success: false, error: 'Invalid item type.' });
      }
      const vimeoUrl = req.body.vimeo_url ?? req.body.vimeoUrl ?? null;
      if (itemType === 'video' && (!vimeoUrl || !String(vimeoUrl).trim())) {
        return res.status(400).json({ success: false, error: 'A Vimeo URL is required for video items.' });
      }
      const result = await query(
        `INSERT INTO zoom_recording_items (recording_id, item_type, title, vimeo_url, file_id, display_order)
         VALUES ($1::uuid, $2, $3, $4, $5, $6) RETURNING *`,
        [
          recordingId,
          itemType,
          req.body.title || null,
          vimeoUrl ? String(vimeoUrl).trim() : null,
          req.body.file_id ?? req.body.fileId ?? null,
          toIntOrDefault(req.body.display_order ?? req.body.displayOrder, 0),
        ]
      );
      return res.status(201).json({ success: true, item: result.rows[0] });
    }

    const id = req.body.id;
    if (!id) return res.status(400).json({ success: false, error: 'Item id is required.' });

    if (action === 'update') {
      const sets = [];
      const params = [];
      const setField = (column, value) => {
        params.push(value);
        sets.push(`${column} = $${params.length}`);
      };
      const has = (k) => Object.prototype.hasOwnProperty.call(req.body, k);

      if (has('title')) setField('title', req.body.title || null);
      if (has('vimeo_url') || has('vimeoUrl')) {
        const v = req.body.vimeo_url ?? req.body.vimeoUrl;
        setField('vimeo_url', v ? String(v).trim() : null);
      }
      if (has('file_id') || has('fileId')) setField('file_id', req.body.file_id ?? req.body.fileId ?? null);
      if (has('display_order') || has('displayOrder')) {
        setField('display_order', toIntOrDefault(req.body.display_order ?? req.body.displayOrder, 0));
      }
      if (sets.length === 0) return res.status(400).json({ success: false, error: 'No fields to update.' });

      params.push(id);
      const result = await query(
        `UPDATE zoom_recording_items SET ${sets.join(', ')}, updated_at = NOW()
          WHERE id = $${params.length}::uuid RETURNING *`,
        params
      );
      if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Item not found.' });
      return res.json({ success: true, item: result.rows[0] });
    }

    if (action === 'delete') {
      const result = await query('DELETE FROM zoom_recording_items WHERE id = $1::uuid RETURNING id', [id]);
      if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Item not found.' });
      return res.json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Invalid action. Use create, update, or delete.' });
  } catch (error) {
    return serverError(res, 'adminSaveItem', error);
  }
};
