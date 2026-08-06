/**
 * Vimeo → Zoom Recordings auto-sync.
 *
 * Polls the Vimeo account's folders (projects) and publishes any new videos
 * into the zoom_* tables automatically, so an upload by the content team
 * appears in the iOS app without touching the admin portal:
 *
 *   Vimeo folder "Brandscaling_Deal Clinics"  -> category deal_clinic
 *   Vimeo folder "Brandscaling_Mastermind"    -> category mastermind
 *
 * For each new video it: finds/creates the month folder (e.g. "August 2026",
 * from the video's upload date, Europe/London), creates a recording titled
 * like the video, and attaches the video link (unlisted privacy hash is part
 * of Vimeo's `link`, so unlisted videos play correctly).
 *
 * Enabled only when VIMEO_ACCESS_TOKEN is set (personal access token with
 * `private` scope from the Vimeo account that owns the folders).
 * Optional env: VIMEO_SYNC_INTERVAL_MINUTES (default 10),
 *               VIMEO_FOLDER_DEAL_CLINIC / VIMEO_FOLDER_MASTERMIND
 *               (override the folder names being watched).
 *
 * Safe under multiple App Runner instances: each run takes a Postgres
 * advisory lock, and inserts are guarded by a vimeo-id existence check.
 */

const { query } = require('../config/database');

const VIMEO_API = 'https://api.vimeo.com';

function folderMappings() {
  return [
    {
      category: 'deal_clinic',
      folderName: process.env.VIMEO_FOLDER_DEAL_CLINIC || 'Brandscaling_Deal Clinics',
    },
    {
      category: 'mastermind',
      folderName: process.env.VIMEO_FOLDER_MASTERMIND || 'Brandscaling_Mastermind',
    },
  ];
}

function vimeoEnabled() {
  return Boolean(process.env.VIMEO_ACCESS_TOKEN);
}

async function vimeoGet(path) {
  const res = await fetch(`${VIMEO_API}${path}`, {
    headers: {
      Authorization: `bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
      Accept: 'application/vnd.vimeo.*+json;version=3.4',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Vimeo API ${res.status} for ${path}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

/** Follow Vimeo pagination and return all data[] entries. */
async function vimeoGetAll(firstPath) {
  const all = [];
  let path = firstPath;
  let guard = 0;
  while (path && guard < 20) {
    const page = await vimeoGet(path);
    all.push(...(page.data || []));
    path = page.paging && page.paging.next ? page.paging.next : null;
    guard += 1;
  }
  return all;
}

/** Resolve a Vimeo project (folder) URI by its display name. */
async function findProjectByName(name) {
  const projects = await vimeoGetAll('/me/projects?per_page=100');
  const target = name.trim().toLowerCase();
  return projects.find((p) => (p.name || '').trim().toLowerCase() === target) || null;
}

/** "August 2026" + "2026-08-01" from an ISO timestamp, in Europe/London. */
function monthInfo(isoTime) {
  const date = isoTime ? new Date(isoTime) : new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: 'long', day: '2-digit',
  }).formatToParts(Number.isNaN(date.getTime()) ? new Date() : date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const monthName = get('month');
  const year = get('year');
  const monthNum = String(new Date(`${monthName} 1, ${year}`).getMonth() + 1).padStart(2, '0');
  return {
    title: `${monthName} ${year}`,
    periodMonth: `${year}-${monthNum}-01`,
    dateOnly: `${year}-${monthNum}-${get('day')}`,
  };
}

/** Find or create the month folder for a category. */
async function ensureMonthFolder(category, info) {
  const existing = await query(
    `SELECT id FROM zoom_folders WHERE category = $1 AND (period_month = $2::date OR LOWER(title) = LOWER($3)) LIMIT 1`,
    [category, info.periodMonth, info.title]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;
  const created = await query(
    `INSERT INTO zoom_folders (category, title, period_month, display_order, is_active)
     VALUES ($1, $2, $3::date, 0, TRUE) RETURNING id`,
    [category, info.title, info.periodMonth]
  );
  console.log(`🎬 [VIMEO-SYNC] Created folder "${info.title}" (${category})`);
  return created.rows[0].id;
}

/** True when a video id has already been imported. */
async function videoAlreadySynced(vimeoId) {
  const result = await query(
    `SELECT 1 FROM zoom_recording_items
      WHERE metadata->>'vimeo_id' = $1
         OR vimeo_url ~ ('(^|/)' || $1 || '($|[/?])')
      LIMIT 1`,
    [vimeoId]
  );
  return result.rows.length > 0;
}

async function importVideo(category, video) {
  const vimeoId = (video.uri || '').split('/').filter(Boolean).pop();
  if (!vimeoId) return false;
  if (await videoAlreadySynced(vimeoId)) return false;

  const info = monthInfo(video.created_time);
  const folderId = await ensureMonthFolder(category, info);
  const title = (video.name || `Recording ${info.dateOnly}`).slice(0, 200);
  const link = video.link || `https://vimeo.com/${vimeoId}`;

  const rec = await query(
    `INSERT INTO zoom_recordings (folder_id, title, recorded_on, display_order, is_active)
     VALUES ($1::uuid, $2, $3::date, (SELECT COALESCE(MAX(display_order), -1) + 1 FROM zoom_recordings WHERE folder_id = $1::uuid), TRUE)
     RETURNING id`,
    [folderId, title, info.dateOnly]
  );
  await query(
    `INSERT INTO zoom_recording_items (recording_id, item_type, vimeo_url, metadata, display_order)
     VALUES ($1::uuid, 'video', $2, $3::jsonb, 0)`,
    [rec.rows[0].id, link, JSON.stringify({ vimeo_id: vimeoId, synced_from_vimeo: true })]
  );
  console.log(`🎬 [VIMEO-SYNC] Imported "${title}" -> ${category} / ${info.title}`);
  return true;
}

/**
 * Run one sync pass. Returns a summary. Never throws — errors are reported
 * in the summary so the scheduler/endpoint stays healthy.
 */
async function syncVimeo() {
  const summary = { enabled: vimeoEnabled(), checked: 0, imported: 0, folders: {}, errors: [] };
  if (!summary.enabled) {
    summary.errors.push('VIMEO_ACCESS_TOKEN is not set — sync is disabled.');
    return summary;
  }

  // Cross-instance guard: only one sync runs at a time.
  const lock = await query(`SELECT pg_try_advisory_lock(hashtext('vimeo_zoom_sync')) AS locked`);
  if (!lock.rows[0].locked) {
    summary.errors.push('Another sync is already running.');
    return summary;
  }

  try {
    for (const mapping of folderMappings()) {
      try {
        const project = await findProjectByName(mapping.folderName);
        if (!project) {
          summary.errors.push(`Vimeo folder "${mapping.folderName}" not found.`);
          continue;
        }
        const projectId = (project.uri || '').split('/').filter(Boolean).pop();
        const videos = await vimeoGetAll(`/me/projects/${projectId}/videos?per_page=100&fields=uri,name,link,created_time`);
        summary.folders[mapping.folderName] = videos.length;
        for (const video of videos) {
          summary.checked += 1;
          try {
            if (await importVideo(mapping.category, video)) summary.imported += 1;
          } catch (err) {
            summary.errors.push(`Import failed for ${video.uri}: ${err.message}`);
          }
        }
      } catch (err) {
        summary.errors.push(`${mapping.folderName}: ${err.message}`);
      }
    }
  } finally {
    await query(`SELECT pg_advisory_unlock(hashtext('vimeo_zoom_sync'))`).catch(() => {});
  }

  if (summary.imported > 0 || summary.errors.length > 0) {
    console.log(`🎬 [VIMEO-SYNC] Done: checked ${summary.checked}, imported ${summary.imported}, errors: ${summary.errors.length}`);
  }
  return summary;
}

/** Start the background scheduler (no-op when the token isn't configured). */
function startVimeoSyncScheduler() {
  if (!vimeoEnabled()) {
    console.log('🎬 [VIMEO-SYNC] Disabled (no VIMEO_ACCESS_TOKEN). Set the env var to enable auto-sync.');
    return;
  }
  const minutes = Math.max(2, parseInt(process.env.VIMEO_SYNC_INTERVAL_MINUTES || '10', 10) || 10);
  console.log(`🎬 [VIMEO-SYNC] Enabled — polling Vimeo every ${minutes} min.`);
  setTimeout(() => { syncVimeo().catch((e) => console.error('🎬 [VIMEO-SYNC] run failed:', e.message)); }, 20 * 1000);
  setInterval(() => { syncVimeo().catch((e) => console.error('🎬 [VIMEO-SYNC] run failed:', e.message)); }, minutes * 60 * 1000);
}

module.exports = { syncVimeo, startVimeoSyncScheduler, vimeoEnabled };
