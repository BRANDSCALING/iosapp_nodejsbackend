-- Settings · Subscription (25 Nov 2026, Munawar): the approved design shows four states,
-- Active · Payment failed · Cancelled · No subscription (BS-AI-003 §9.10). GHL already sends
-- membership.paid, membership.payment_failed and membership.cancelled (BS-AI-013 §7), but the
-- backend only notified and kept nothing, so Settings could not show the state.
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_state      text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_state_at   timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_ends_at    timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_next_retry timestamptz;
