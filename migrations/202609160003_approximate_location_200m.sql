-- Atlas migration: tighten approximate location zones from 2 km to 200 m.
ALTER TABLE vendors ALTER COLUMN public_radius_km SET DEFAULT 0.2;

-- Keep existing approximate points generalized, but bring their persisted
-- offset inside the new smaller zone so the displayed zone remains accurate.
WITH offsets AS (
  SELECT
    id,
    (0.075 + random() * 0.075) AS distance_km,
    random() * 2 * pi() AS bearing
  FROM vendors
  WHERE location_visibility = 'approx'
)
UPDATE vendors AS vendor
SET
  public_latitude = GREATEST(-89.9, LEAST(89.9,
    vendor.latitude + (location_offset.distance_km * cos(location_offset.bearing)) / 6371 * (180 / pi()))),
  public_longitude = GREATEST(-180, LEAST(180,
    vendor.longitude + (location_offset.distance_km * sin(location_offset.bearing))
      / (6371 * GREATEST(0.15, cos(radians(vendor.latitude)))) * (180 / pi()))),
  public_radius_km = 0.2
FROM offsets AS location_offset
WHERE vendor.id = location_offset.id;

UPDATE vendors
SET public_radius_km = 0.2
WHERE location_visibility = 'approx';
