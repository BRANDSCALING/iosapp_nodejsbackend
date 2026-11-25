/**
 * Delete my account — BS-AI-003 §9.2, BS-AI-004 §3.4, BS-AI-009 A11 (25 Nov 2026, Munawar).
 *
 *  1. request(): the person confirmed with their password (checked by Cognito in the app) and
 *     the word DELETE. Nothing is removed yet: the account is marked for deletion in 14 days
 *     and GHL is asked to send the first A11 email (account.delete_requested).
 *  2. cancelOnSignIn(): signing in during the 14 days cancels it — a token issued after the
 *     request is the proof of a new sign-in (an old token still in an open app is not).
 *  3. runDue(): the scheduler deletes accounts whose 14 days are over. Entries the person
 *     added to other people's rooms stay, with their name (BS-AI-003 §9.2; BS-AI-008 §5);
 *     rooms they owned are closed; receipts stay as the law requires (GHL keeps the orders).
 */
const { query, getClient } = require('../../config/database');
const { queueGhl } = require('./notificationService');

const WAIT_DAYS = 14;

async function request(userId) {
  const r = await query(`
    UPDATE users SET delete_requested_at = now(), delete_after = now() + interval '${WAIT_DAYS} days'
    WHERE UPPER(id::text) = UPPER($1) RETURNING delete_after
  `, [userId]);
  if (!r.rows.length) return null;
  const after = r.rows[0].delete_after;
  await queueGhl({
    userId, event: 'account.delete_requested',
    dedup: 'a11:req:' + String(userId).toUpperCase() + ':' + new Date(after).toISOString().slice(0, 10),
    extra: { deletion_date: new Date(after).toISOString() },
  });
  return after;
}

async function cancel(userId) {
  const r = await query(`
    UPDATE users SET delete_requested_at = NULL, delete_after = NULL
    WHERE UPPER(id::text) = UPPER($1) AND delete_after IS NOT NULL RETURNING id
  `, [userId]);
  return r.rows.length > 0;
}

/** Cancels a pending deletion when the token was issued after the request (a new sign-in). */
async function cancelOnSignIn(userId, tokenPayload) {
  const row = (await query(
    'SELECT delete_requested_at, delete_after FROM users WHERE UPPER(id::text) = UPPER($1)', [userId])).rows[0];
  if (!row || !row.delete_after) return { pending: null, cancelled: false };
  const signedInAt = tokenPayload && (tokenPayload.auth_time || tokenPayload.iat);
  if (signedInAt && signedInAt * 1000 > new Date(row.delete_requested_at).getTime() + 5000) {
    await cancel(userId);
    return { pending: null, cancelled: true };
  }
  return { pending: row.delete_after, cancelled: false };
}

/* the Cognito sign-in itself; needs cognito-idp:AdminDeleteUser on the App Runner role */
async function deleteSignIn(userId) {
  try {
    const { CognitoIdentityProviderClient, AdminDeleteUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
    const pool = process.env.COGNITO_USER_POOL_ID || 'us-east-1_u8tyHoqJi';
    const c = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
    await c.send(new AdminDeleteUserCommand({ UserPoolId: pool, Username: String(userId) }));
    return true;
  } catch (e) {
    if (/UserNotFound/.test(e.name || '')) return true;
    console.error(`❌ [DI] deletion: sign-in for ${userId} NOT removed (${e.name}: ${e.message}); remove it by hand`);
    return false;
  }
}

/* every table that holds the person's own data; a missing table is skipped */
const OWN_ROWS = [
  'DELETE FROM attachment WHERE UPPER(user_id::text) = UPPER($1)',
  'DELETE FROM decision_entry WHERE UPPER(author_user_id::text) = UPPER($1)',
  'DELETE FROM mentor_turn WHERE UPPER(user_id::text) = UPPER($1)',
  'DELETE FROM decision WHERE UPPER(user_id::text) = UPPER($1)',
  'DELETE FROM decision_log WHERE UPPER(user_id::text) = UPPER($1)',
  'DELETE FROM credit_ledger WHERE UPPER(user_id::text) = UPPER($1)',
  'DELETE FROM credit_grant WHERE UPPER(user_id::text) = UPPER($1)',
  'DELETE FROM guest_access WHERE UPPER(user_id::text) = UPPER($1)',
  'DELETE FROM notification WHERE UPPER(user_id::text) = UPPER($1)',
  'DELETE FROM notification_pref WHERE UPPER(user_id::text) = UPPER($1)',
  'DELETE FROM device_token WHERE UPPER(user_id::text) = UPPER($1)',
  'DELETE FROM auth_device WHERE UPPER(user_id::text) = UPPER($1)',
  'DELETE FROM terms_acceptance WHERE UPPER(user_id::text) = UPPER($1)',
  'DELETE FROM edna_progress WHERE UPPER(user_id::text) = UPPER($1)',
  'DELETE FROM user_quiz_progress WHERE session_id IN (SELECT id FROM quiz_sessions WHERE LOWER(user_id::text) = LOWER($1))',
  'DELETE FROM user_quiz_results WHERE LOWER(user_id::text) = LOWER($1)',
  'DELETE FROM quiz_sessions WHERE LOWER(user_id::text) = LOWER($1)',
  'DELETE FROM edna_profiles WHERE LOWER(user_id::text) = LOWER($1)',
];

async function deleteNow(userId) {
  const u = (await query('SELECT id, email, first_name, name FROM users WHERE UPPER(id::text) = UPPER($1)', [userId])).rows[0];
  if (!u) return false;
  const shown = u.first_name || (u.name ? String(u.name).split(/\s+/)[0] : null) || 'A former member';
  /* the second A11 email needs the address, so it is queued before the row goes */
  await queueGhl({ userId, event: 'account.deleted', dedup: 'a11:done:' + String(userId).toUpperCase(), extra: {} });
  const signInGone = await deleteSignIn(u.id);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    /* rooms: their entries stay with their name; rooms they owned are closed */
    await client.query('UPDATE room_member SET left_name = $2, left_at = COALESCE(left_at, now()) WHERE UPPER(user_id::text) = UPPER($1)', [u.id, shown]);
    await client.query("UPDATE decision_room SET status = 'closed' WHERE UPPER(owner_user_id::text) = UPPER($1) AND status NOT IN ('decided','reviewed','closed')", [u.id]);
    if (u.email) await client.query('DELETE FROM room_invite WHERE LOWER(email) = LOWER($1) AND accepted_at IS NULL', [u.email]);
    for (const sql of OWN_ROWS) {
      await client.query('SAVEPOINT s');
      try { await client.query(sql, [u.id]); await client.query('RELEASE SAVEPOINT s'); } catch (e) {
        await client.query('ROLLBACK TO SAVEPOINT s'); /* 42P01: table not on this database */
        if (e.code !== '42P01' && e.code !== '42703') throw e;
      }
    }
    await client.query('DELETE FROM users WHERE UPPER(id::text) = UPPER($1)', [u.id]);
    await client.query('COMMIT');
    console.log(`🗑️ [DI] account ${u.id} deleted after the ${WAIT_DAYS}-day wait (sign-in removed: ${signInGone})`);
    return true;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`❌ [DI] deletion of ${u.id} failed:`, e.message);
    return false;
  } finally {
    client.release();
  }
}

/** Scheduler: accounts whose 14 days are over. */
async function runDue() {
  let due = [];
  try {
    due = (await query('SELECT id FROM users WHERE delete_after IS NOT NULL AND delete_after <= now() LIMIT 20')).rows;
  } catch (e) { return 0; } /* 0008 not applied yet */
  let n = 0;
  for (const r of due) { if (await deleteNow(r.id)) n += 1; }
  return n;
}

module.exports = { request, cancel, cancelOnSignIn, runDue, deleteNow, WAIT_DAYS };
