export const normalizeStringArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') {
    if (!value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      // Fall through to delimiter-based parsing.
    }
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

export const normalizeRating = (value) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(5, Math.max(0, parsed));
};

export const normalizeRatingCount = (value) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
};

export const safeParseMetadata = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export async function insertVendor(pool, data) {
  const {
    name,
    address,
    latitude,
    longitude,
    category,
    phone,
    website,
    hours,
    photo_url,
    photos,
    entry_level,
    types,
    categories,
    regional_techniques,
    online_presence,
    review_text,
    rating,
    rating_count,
  } = data;

  if (!name || latitude === undefined || longitude === undefined) {
    throw new ValidationError('Name, latitude, and longitude are required');
  }

  const parsedPhotos = {
    ...safeParseMetadata(photos),
    entry_level: entry_level || category || 'Menders',
    types: normalizeStringArray(types),
    categories: normalizeStringArray(categories),
    regional_techniques: normalizeStringArray(regional_techniques),
    online_presence: online_presence || website || undefined,
    review_text: review_text || undefined,
    rating: normalizeRating(rating),
    rating_count: normalizeRatingCount(rating_count),
  };

  const result = await pool.query(
    `INSERT INTO vendors (name, address, latitude, longitude, category, phone, website, hours, photo_url, photos)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      name,
      address || null,
      latitude,
      longitude,
      entry_level || category || 'Menders',
      phone || null,
      online_presence || website || null,
      hours || null,
      photo_url || null,
      JSON.stringify(parsedPhotos),
    ],
  );

  return result.rows[0];
}

export async function updateVendorAddress(pool, data) {
  const { id, address } = data;

  const vendorId = Number(id);
  const normalizedAddress = typeof address === 'string' ? address.trim() : '';

  if (!Number.isInteger(vendorId) || vendorId <= 0) {
    throw new ValidationError('Valid vendor id is required');
  }

  if (!normalizedAddress) {
    throw new ValidationError('Address is required');
  }

  const result = await pool.query(
    `UPDATE vendors
     SET address = $2
     WHERE id = $1
     RETURNING *`,
    [vendorId, normalizedAddress],
  );

  if (!result.rows[0]) {
    throw new ValidationError('Vendor not found');
  }

  return result.rows[0];
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}
