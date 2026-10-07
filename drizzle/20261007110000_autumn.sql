CREATE TABLE IF NOT EXISTS prayer_app.autumn_campaign (
  id text PRIMARY KEY CHECK (id = '2026'),
  enabled boolean NOT NULL DEFAULT false,
  entries_ciphertext text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS prayer_app.autumn_prayers (
  campaign_id text NOT NULL REFERENCES prayer_app.autumn_campaign(id),
  user_id uuid NOT NULL REFERENCES prayer_app.users(id) ON DELETE CASCADE,
  prayer_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id, prayer_date)
);
