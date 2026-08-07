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
 * Looks one level INSIDE each category folder too: the content team organises
 * uploads into monthly subfolders (e.g. "June 2026_Deal Clinic"), so videos in
 * a subfolder are published into an app folder derived from the SUBFOLDER name
 * ("June 2026", period 2026-06-01). Videos sitting loose in the category folder
 * fall back to a month folder from their upload date (Europe/London).
 *
 * The recording date comes from the video TITLE when it contains one (e.g.
 * "June 23rd 2026", "04th Aug 2026"), else the upload date. The video link is
 * attached as-is (unlisted privacy hash is part of Vimeo's `link`, so unlisted
 * videos play correctly).
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

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'];

/** "jun"/"June"/"sept" -> 6/6/9; 0 when the token is not a month. */
function monthTokenToNum(token) {
  const t = (token || '').toLowerCase();
  if (t.length < 3) return 0;
  return MONTH_NAMES.findIndex((m) => m.startsWith(t)) + 1;
}

/** "June 2026_Deal Clinic" -> { title: "June 2026", periodMonth: "2026-06-01" }; null if no month+year. */
function parseMonthFromName(name) {
  const re = /([a-zA-Z]{3,9})\.?\s+(20\d{2})/g;
  let m;
  while ((m = re.exec(name || '')) !== null) {
    const num = monthTokenToNum(m[1]);
    if (num) {
      const monthName = MONTH_NAMES[num - 1];
      return {
        title: `${monthName[0].toUpperCase()}${monthName.slice(1)} ${m[2]}`,
        periodMonth: `${m[2]}-${String(num).padStart(2, '0')}-01`,
      };
    }
  }
  return null;
}

/** "June 23rd 2026" / "04th Aug 2026" / "Aug 4, 2026" -> "2026-06-23" etc.; null if no date. */
function parseDateFromText(text) {
  const s = text || '';
  const patterns = [
    { re: /(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]{3,9})\.?,?\s+(20\d{2})/g, day: 1, month: 2 }, // 04th Aug 2026
    { re: /([a-zA-Z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})/g, day: 2, month: 1 }, // June 23rd 2026
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.re.exec(s)) !== null) {
      const num = monthTokenToNum(m[p.month]);
      const day = parseInt(m[p.day], 10);
      if (num && day >= 1 && day <= 31) {
        return `${m[3]}-${String(num).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  return null;
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

async function importVideo(category, video, folderInfo = null) {
  const vimeoId = (video.uri || '').split('/').filter(Boolean).pop();
  if (!vimeoId) return false;
  if (await videoAlreadySynced(vimeoId)) return false;

  const uploadInfo = monthInfo(video.created_time);
  const folderId = await ensureMonthFolder(category, folderInfo || uploadInfo);
  const recordedOn = parseDateFromText(video.name) || uploadInfo.dateOnly;
  const title = (video.name || `Recording ${recordedOn}`).slice(0, 200);
  const link = video.link || `https://vimeo.com/${vimeoId}`;

  const rec = await query(
    `INSERT INTO zoom_recordings (folder_id, title, recorded_on, display_order, is_active)
     VALUES ($1::uuid, $2, $3::date, (SELECT COALESCE(MAX(display_order), -1) + 1 FROM zoom_recordings WHERE folder_id = $1::uuid), TRUE)
     RETURNING id`,
    [folderId, title, recordedOn]
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

        // Loose videos AND monthly subfolders (one level deep).
        const items = await vimeoGetAll(`/me/projects/${projectId}/items?per_page=100&fields=type,folder.uri,folder.name,video.uri,video.name,video.link,video.created_time`);
        const queue = items
          .filter((i) => i.type === 'video' && i.video)
          .map((i) => ({ video: i.video, folderInfo: null }));
        for (const item of items.filter((i) => i.type === 'folder' && i.folder)) {
          const subId = (item.folder.uri || '').split('/').filter(Boolean).pop();
          if (!subId) continue;
          const folderInfo = parseMonthFromName(item.folder.name) || {
            title: (item.folder.name || 'Recordings').trim().slice(0, 200),
            periodMonth: null,
          };
          const subVideos = await vimeoGetAll(`/me/projects/${subId}/videos?per_page=100&fields=uri,name,link,created_time`);
          // Oldest session first, so display_order follows the calendar.
          subVideos.sort((a, b) =>
            (parseDateFromText(a.name) || a.created_time || '').localeCompare(parseDateFromText(b.name) || b.created_time || '')
          );
          for (const video of subVideos) queue.push({ video, folderInfo });
        }

        summary.folders[mapping.folderName] = queue.length;
        for (const { video, folderInfo } of queue) {
          summary.checked += 1;
          try {
            if (await importVideo(mapping.category, video, folderInfo)) summary.imported += 1;
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
