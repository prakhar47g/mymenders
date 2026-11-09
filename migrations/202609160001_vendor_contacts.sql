-- Atlas migration: independent public contact fields for vendors.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS social TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS email TEXT;

-- Existing imports stored their one link in photos.online_presence. Preserve it
-- as Website only when the canonical Website column is empty.
UPDATE vendors
SET website = NULLIF(BTRIM(photos->>'online_presence'), '')
WHERE NULLIF(BTRIM(website), '') IS NULL
  AND photos IS NOT NULL
  AND NULLIF(BTRIM(photos->>'online_presence'), '') IS NOT NULL;
