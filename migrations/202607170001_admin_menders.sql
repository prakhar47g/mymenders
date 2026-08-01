-- Atlas migration: draft review workflow and initial admin account storage.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_status_check;
ALTER TABLE vendors ADD CONSTRAINT vendors_status_check CHECK (status IN ('draft', 'active'));
UPDATE vendors SET status = 'active' WHERE status IS NULL;
CREATE INDEX IF NOT EXISTS vendors_status_id_idx ON vendors (status, id);
CREATE TABLE IF NOT EXISTS admins (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
