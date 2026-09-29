-- Preserve existing comments while adding reply metadata.
-- Apply through Wrangler D1 migrations so this runs once per database.
ALTER TABLE comments ADD COLUMN reply_to_id TEXT;
ALTER TABLE comments ADD COLUMN reply_to_author TEXT;
