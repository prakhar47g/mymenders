-- Atlas migration: private canonical locations and persisted public zones.
-- Existing rows remain exact so this migration does not change their public behavior.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location_visibility TEXT NOT NULL DEFAULT 'exact';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS public_address TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS public_latitude DOUBLE PRECISION;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS public_longitude DOUBLE PRECISION;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS public_radius_km DOUBLE PRECISION NOT NULL DEFAULT 2;

ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_location_visibility_check;
ALTER TABLE vendors ADD CONSTRAINT vendors_location_visibility_check
  CHECK (location_visibility IN ('exact', 'approx'));

CREATE INDEX IF NOT EXISTS vendors_location_visibility_idx
  ON vendors (location_visibility, status);
