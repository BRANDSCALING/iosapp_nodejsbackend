-- Fariza's 22 Nov 2026 ruling: everyone who completes the assessment gets 3 free
-- decisions. Those arrive as a credit_grant with source 'assessment', which the
-- original CHECK (tier/purchase_99/pack/admin) predates — allow it.
ALTER TABLE credit_grant DROP CONSTRAINT IF EXISTS credit_grant_source_check;
ALTER TABLE credit_grant ADD CONSTRAINT credit_grant_source_check
  CHECK (source IN ('tier', 'purchase_99', 'pack', 'admin', 'assessment'));
