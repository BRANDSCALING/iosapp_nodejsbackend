-- BS-DI-009 workbooks (17 Nov 2026): one part = one workbook, one file per version.
-- Each file carries workbook (1-3), part and subtype for the lookup; typeId gains the two
-- leaning values. Run BEFORE deploying the v2 workbook code and BEFORE uploading the 27 files.
-- Legacy workbooks keep workbook NULL and are served exactly as before.

ALTER TABLE workbooks ADD COLUMN IF NOT EXISTS workbook smallint;
ALTER TABLE workbooks ADD COLUMN IF NOT EXISTS part smallint;
ALTER TABLE workbooks ADD COLUMN IF NOT EXISTS subtype text;

-- Unique: the upload script upserts by name, and the admin endpoint has always rejected
-- duplicate names. If this fails, duplicate names exist and must be cleaned up first.
CREATE UNIQUE INDEX IF NOT EXISTS workbooks_name_idx ON workbooks (name);
