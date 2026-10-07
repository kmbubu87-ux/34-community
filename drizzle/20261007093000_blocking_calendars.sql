ALTER TABLE prayer_app.google_calendar_connections ADD COLUMN IF NOT EXISTS blocking_calendar_ids text NOT NULL DEFAULT '[]';
