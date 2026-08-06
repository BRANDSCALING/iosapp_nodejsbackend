-- 035_create_zoom_recordings_tables.sql
-- Zoom Recordings module: recorded Deal Clinics + Mastermind Days published to the iOS app.
-- Hierarchy: category ('deal_clinic' | 'mastermind') -> monthly folder -> recording -> items (video).
-- Content is managed from the Admin Portal; the iOS app reads via /api/v1/zoom/*.
-- item_type keeps a 'document' value + file_id column for future attachments, but only
-- 'video' (a pasted Vimeo URL) is used today — there is no file-storage service yet.

BEGIN;

CREATE TABLE IF NOT EXISTS zoom_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(20) NOT NULL CHECK (category IN ('deal_clinic', 'mastermind')),
    title VARCHAR(120) NOT NULL,
    period_month DATE,                    -- first-of-month; chronological sort key (e.g. 2026-08-01)
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zoom_folders_category ON zoom_folders(category);
CREATE INDEX IF NOT EXISTS idx_zoom_folders_active ON zoom_folders(is_active);
CREATE INDEX IF NOT EXISTS idx_zoom_folders_order ON zoom_folders(category, display_order);

CREATE TABLE IF NOT EXISTS zoom_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES zoom_folders(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    recorded_on DATE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zoom_recordings_folder ON zoom_recordings(folder_id);
CREATE INDEX IF NOT EXISTS idx_zoom_recordings_active ON zoom_recordings(is_active);

CREATE TABLE IF NOT EXISTS zoom_recording_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES zoom_recordings(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL DEFAULT 'video' CHECK (item_type IN ('video', 'document')),
    title VARCHAR(200),
    vimeo_url TEXT,                       -- pasted Vimeo link; unlisted links with hash are supported
    file_id UUID,                         -- reserved for future document attachments (no FK: no files table yet)
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zoom_items_recording ON zoom_recording_items(recording_id);

COMMIT;
