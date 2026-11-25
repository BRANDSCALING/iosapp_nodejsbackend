/**
 * The DI scheduler — BS-AI-004 §2 / BS-AI-009 §7: the timed events. Review due (N6),
 * the one review reminder 7 days later (N7, then stop), the guest's day-5 and day-7
 * messages (N12), and delivery of the GHL outbox. Every send is idempotent on a dedup
 * key, so a restart or an overlapping tick never sends twice.
 *
 * Runs in-process every 15 minutes (one t4g box, one process: a separate worker would
 * be more than the job needs). ENV=test and DI_SCHEDULER=off keep it quiet.
 */
const { query } = require('../../config/database');
const { notify, queueGhl, deliverOutbox } = require('./notificationService');

async function reviewsDue() {
  const due = (await query(`
    SELECT l.id, l.user_id, l.decision_id, l.text, l.review_date
    FROM decision_log l
    WHERE l.outcome IS NULL AND l.decided_text IS NOT NULL
      AND l.review_date IS NOT NULL AND l.review_date <= CURRENT_DATE
  `)).rows;
  for (const r of due) {
    const fresh = await notify({
      userId: r.user_id, event: 'N6', title: r.text,
      body: 'Three questions with your mentor', objectType: 'decision_log', objectId: r.id,
      dedup: 'n6:' + r.id,
    });
    if (fresh) {
      await queueGhl({
        userId: r.user_id, event: 'N6', dedup: 'n6:' + r.id,
        extra: { decision: r.text, decided_on: r.review_date, deep_link: '/app/#review=' + r.id },
      });
    }
    /* N7: one reminder 7 days after the date, then stop (BS-AI-009 N7) */
    if (new Date(r.review_date) <= new Date(Date.now() - 7 * 86400000)) {
      const again = await notify({
        userId: r.user_id, event: 'N7', title: r.text,
        body: 'The review is still open', objectType: 'decision_log', objectId: r.id,
        dedup: 'n7:' + r.id,
      });
      if (again) {
        await queueGhl({
          userId: r.user_id, event: 'N7', dedup: 'n7:' + r.id,
          extra: { decision: r.text, decided_on: r.review_date, deep_link: '/app/#review=' + r.id },
        });
      }
    }
  }
}

async function guestDays() {
  const rows = (await query(`
    SELECT g.*, u.first_name AS inviter_first, u.name AS inviter_name
    FROM guest_access g LEFT JOIN users u ON UPPER(u.id::text) = UPPER(g.invited_by::text)
    WHERE g.converted_at IS NULL AND g.ends_at > now() - interval '2 days'
  `)).rows;
  for (const g of rows) {
    const msLeft = new Date(g.ends_at) - Date.now();
    const daysLeft = Math.ceil(msLeft / 86400000);
    if (daysLeft <= 2 && daysLeft > 0) {
      const fresh = await notify({
        userId: g.user_id, event: 'N12_5', title: 'Guest access · ' + daysLeft + (daysLeft === 1 ? ' day' : ' days') + ' left',
        body: 'Keep the Frame and your mentors with the Advanced Report or a membership',
        objectType: 'guest_access', objectId: g.id, dedup: 'n12d5:' + g.id,
      });
      if (fresh) {
        await queueGhl({
          userId: g.user_id, event: 'N12_5', dedup: 'n12d5:' + g.id,
          extra: { ends_at: g.ends_at, inviter_name: g.inviter_first || g.inviter_name || null },
        });
      }
    }
    if (msLeft <= 0) {
      const fresh = await notify({
        userId: g.user_id, event: 'N12_7', title: 'Your guest access has ended',
        body: 'Your E-DNA result and basic report stay yours',
        objectType: 'guest_access', objectId: g.id, dedup: 'n12d7:' + g.id,
      });
      if (fresh) {
        await queueGhl({
          userId: g.user_id, event: 'N12_7', dedup: 'n12d7:' + g.id,
          extra: { ends_at: g.ends_at, inviter_name: g.inviter_first || g.inviter_name || null },
        });
      }
    }
  }
}

async function tick() {
  try { await reviewsDue(); } catch (e) { console.warn('[DI] scheduler reviews:', e.message); }
  try { await guestDays(); } catch (e) { console.warn('[DI] scheduler guests:', e.message); }
  try { await require('./accountDeletion').runDue(); } catch (e) { console.warn('[DI] scheduler deletions:', e.message); }
  try { await deliverOutbox(); } catch (e) { console.warn('[DI] scheduler outbox:', e.message); }
}

let timer = null;
function start() {
  if (process.env.ENV === 'test' || process.env.DI_SCHEDULER === 'off' || timer) return;
  timer = setInterval(tick, 15 * 60 * 1000);
  timer.unref();
  setTimeout(tick, 20 * 1000).unref(); /* first pass shortly after boot */
  console.log('⏱️  [DI] scheduler on: reviews due, guest days, GHL outbox (every 15 min)');
}

module.exports = { start, tick };
