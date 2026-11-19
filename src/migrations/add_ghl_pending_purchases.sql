-- GHL purchase webhook (19 Nov 2026): a purchase whose buyer has no stored result yet is
-- held here by email and applied when their assessment result is stored.
CREATE TABLE IF NOT EXISTS ghl_pending_purchases (
  email       text PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now()
);
