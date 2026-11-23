/**
 * Sign-up sweep: the Welcome email leaves at SIGN-UP, whether or not the person ever
 * signs in (Munawar, 23 Nov 2026 — a tester signed up, confirmed the code, stopped,
 * and no GHL payload existed because account.created only fired from sync-profile on
 * the first sign-in).
 *
 * Every few minutes this lists the Cognito pool's CONFIRMED users, mirrors any new
 * account into the shared users table (the same upsert sync-profile does), and queues
 * account.created for rows this sweep created. queueGhl's dedup (one per account,
 * ever) makes the sweep and sync-profile safe to race: whichever runs first sends,
 * the other is a no-op.
 *
 * Accounts confirmed before SIGNUP_SWEEP_SINCE are left alone — the pool holds ~178
 * accounts from June onward, and a late "Welcome" to all of them would be spam.
 */
const {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const { query } = require('../config/database');
const { queueGhl } = require('./di/notificationService');

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_u8tyHoqJi';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
/* Only accounts confirmed after the sweep shipped get the sign-up email. */
const SINCE = new Date(process.env.SIGNUP_SWEEP_SINCE || '2026-11-23T00:00:00Z');

const cognito = new CognitoIdentityProviderClient({ region: AWS_REGION });

async function sweepSignups() {
  /* one instance at a time (same guard the vimeo sync uses) */
  const lock = await query("SELECT pg_try_advisory_lock(hashtext('signup_sweep')) AS locked");
  if (!lock.rows[0].locked) return { skipped: 'locked' };
  try {
    const fresh = [];
    let token;
    do {
      const page = await cognito.send(new ListUsersCommand({
        UserPoolId: USER_POOL_ID, PaginationToken: token, Limit: 60,
      }));
      for (const u of page.Users || []) {
        if (u.UserStatus !== 'CONFIRMED') continue;
        if (!u.UserCreateDate || new Date(u.UserCreateDate) < SINCE) continue;
        const attr = (n) => ((u.Attributes || []).find((a) => a.Name === n) || {}).Value;
        const email = (attr('email') || '').trim().toLowerCase();
        const sub = attr('sub');
        if (email && sub) fresh.push({ email, sub, name: attr('name') || '' });
      }
      token = page.PaginationToken;
    } while (token);

    /* The resume nudge (Munawar, 23 Nov 2026): a person who signed up and has no finished
       result RESUME_NUDGE_MINUTES later gets ONE "Continue with your E-DNA" email — the
       same edna.save_progress event the in-app button sends, which GHL's published branch D
       (no resume_url) already answers. Once per account ever, via the dedup. Completion is
       the only "finished" signal the server has, so this nudges non-starters and
       mid-assessment leavers alike. */
    const nudgeMinutes = Math.max(1, parseInt(process.env.RESUME_NUDGE_MINUTES || '10', 10) || 10);
    const nudgeRows = (await query(
      `SELECT u.id, u.email FROM users u
       WHERE u.created_at >= $1 AND u.created_at <= NOW() - ($2 || ' minutes')::interval
         AND NOT EXISTS (SELECT 1 FROM user_quiz_results q WHERE UPPER(q.user_id::text) = UPPER(u.id::text))
         AND NOT EXISTS (SELECT 1 FROM ghl_outbox o WHERE o.payload->>'dedup' = 'edna.save_progress:nudge:' || UPPER(u.id::text))`,
      [SINCE.toISOString(), String(nudgeMinutes)])).rows;
    for (const n of nudgeRows) {
      await queueGhl({
        userId: n.id,
        event: 'edna.save_progress',
        extra: { reason: 'resume_nudge' },
        dedup: `edna.save_progress:nudge:${String(n.id).toUpperCase()}`,
      });
      console.log(`⏰ [SIGNUP-SWEEP] Resume nudge queued for ${n.email} (${nudgeMinutes} min, no result)`);
    }

    let queued = 0;
    for (const f of fresh) {
      /* the sync-profile upsert, minus the name overwrite: an existing row (the person
         signed in before the sweep reached them) is left exactly as it is */
      const r = await query(
        `INSERT INTO users (id, email, name, user_type, created_at, updated_at)
         VALUES ($1::uuid, $2, $3, 'brandscaling', NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET updated_at = users.updated_at
         RETURNING id, tier, (xmax = 0) AS created_now`,
        [f.sub, f.email, f.name]);
      const user = r.rows[0];
      /* dedup also covers the race where sync-profile created the row this second */
      await queueGhl({
        userId: user.id,
        event: 'account.created',
        extra: { tier: user.tier || 'free' },
        dedup: `account.created:${String(user.id).toUpperCase()}`,
      });
      if (user.created_now) {
        queued += 1;
        console.log(`👋 [SIGNUP-SWEEP] New confirmed account ${f.email} — account.created queued`);
      }
    }
    return { checked: fresh.length, created: queued };
  } finally {
    await query("SELECT pg_advisory_unlock(hashtext('signup_sweep'))").catch(() => {});
  }
}

/**
 * The instant path: the website calls this (via POST /api/user/registered) the moment a
 * sign-up is confirmed, so the Welcome email leaves in seconds — the sweep is only the
 * safety net for a tab closed at exactly the wrong moment. Looks ONE email up in Cognito
 * and, only when it names a CONFIRMED account created after the cutoff, mirrors it and
 * queues account.created with the same one-per-account dedup.
 */
async function registerConfirmedAccount(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return false;
  const sanitized = clean.replace(/["\\]/g, '');
  const result = await cognito.send(new ListUsersCommand({
    UserPoolId: USER_POOL_ID, Filter: `email = "${sanitized}"`, Limit: 1,
  }));
  const u = (result.Users || [])[0];
  if (!u || u.UserStatus !== 'CONFIRMED') return false;
  if (!u.UserCreateDate || new Date(u.UserCreateDate) < SINCE) return false;
  const attr = (n) => ((u.Attributes || []).find((a) => a.Name === n) || {}).Value;
  const sub = attr('sub');
  if (!sub) return false;
  const r = await query(
    `INSERT INTO users (id, email, name, user_type, created_at, updated_at)
     VALUES ($1::uuid, $2, $3, 'brandscaling', NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET updated_at = users.updated_at
     RETURNING id, tier, (xmax = 0) AS created_now`,
    [sub, clean, attr('name') || '']);
  const user = r.rows[0];
  await queueGhl({
    userId: user.id,
    event: 'account.created',
    extra: { tier: user.tier || 'free' },
    dedup: `account.created:${String(user.id).toUpperCase()}`,
  });
  if (user.created_now) console.log(`👋 [SIGNUP-SWEEP] Instant registration for ${clean} — account.created queued`);
  return true;
}

function startSignupSweepScheduler() {
  const minutes = Math.max(1, parseInt(process.env.SIGNUP_SWEEP_INTERVAL_MINUTES || '3', 10) || 3);
  console.log(`👋 [SIGNUP-SWEEP] Enabled — checking Cognito for new sign-ups every ${minutes} min (since ${SINCE.toISOString()}).`);
  setTimeout(() => { sweepSignups().catch((e) => console.error('👋 [SIGNUP-SWEEP] run failed:', e.message)); }, 15 * 1000);
  setInterval(() => { sweepSignups().catch((e) => console.error('👋 [SIGNUP-SWEEP] run failed:', e.message)); }, minutes * 60 * 1000);
}

module.exports = { sweepSignups, startSignupSweepScheduler, registerConfirmedAccount };
