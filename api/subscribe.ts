import { Pool } from 'pg';
import { insertEmailSub, ValidationError } from './lib/db.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const subscription = await insertEmailSub(pool, body.email);

    return new Response(JSON.stringify(subscription), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('Error subscribing email:', err);
    return new Response(JSON.stringify({ error: 'Failed to subscribe' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
