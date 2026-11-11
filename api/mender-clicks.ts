import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ALLOWED_ACTIONS = new Set([
  'mender_open',
  'phone_click',
  'email_click',
  'social_click',
  'website_click',
]);

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const vendorId = Number(body?.vendorId);
    const action = body?.action;

    if (!Number.isSafeInteger(vendorId) || vendorId <= 0 || !ALLOWED_ACTIONS.has(action)) {
      return new Response(JSON.stringify({ error: 'Invalid click' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await pool.query(
      `INSERT INTO mender_click_monthly_aggregates (month_start, vendor_id, action, click_count)
       SELECT (date_trunc('month', now() AT TIME ZONE 'UTC'))::date, id, $2, 1
       FROM vendors
       WHERE id = $1 AND status = 'active' AND is_deleted = false
       ON CONFLICT (month_start, vendor_id, action)
       DO UPDATE SET click_count = mender_click_monthly_aggregates.click_count + 1`,
      [vendorId, action],
    );

    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return new Response(JSON.stringify({ error: 'Invalid click' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('Error recording mender click:', err);
    return new Response(JSON.stringify({ error: 'Failed to record click' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
