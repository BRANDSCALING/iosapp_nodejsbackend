-- ============================================
-- Add icon_url to lessons for admin/iOS display
-- Persisted when lesson is updated via POST /api/admin/lms/lessons
-- ============================================

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS icon_url TEXT;
