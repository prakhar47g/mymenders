import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const normalizeStringArray = (value: unknown): string[] => {
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

const normalizeRating = (value: unknown): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(5, Math.max(0, parsed));
};

const normalizeRatingCount = (value: unknown): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
};

const safeParseMetadata = (value: unknown) => {
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

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM vendors ORDER BY id');
    return new Response(JSON.stringify(result.rows), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error fetching vendors:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch vendors' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
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
    } = body;
    
    if (!name || latitude === undefined || longitude === undefined) {
      return new Response(JSON.stringify({ error: 'Name, latitude, and longitude are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsedPhotos = {
      ...(safeParseMetadata(photos) || {}),
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
        photos ? JSON.stringify(parsedPhotos) : JSON.stringify(parsedPhotos),
      ]
    );
    
    return new Response(JSON.stringify(result.rows[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error creating vendor:', err);
    return new Response(JSON.stringify({ error: 'Failed to create vendor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
