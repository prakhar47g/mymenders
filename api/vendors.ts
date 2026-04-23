import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
    const { name, address, latitude, longitude, category, phone, website, hours, photo_url, photos } = body;
    
    if (!name || latitude === undefined || longitude === undefined) {
      return new Response(JSON.stringify({ error: 'Name, latitude, and longitude are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await pool.query(
      `INSERT INTO vendors (name, address, latitude, longitude, category, phone, website, hours, photo_url, photos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, address || null, latitude, longitude, category || 'Other', phone || null, website || null, hours || null, photo_url || null, photos ? JSON.stringify(photos) : null]
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