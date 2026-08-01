import crypto from 'node:crypto';
import { Pool } from 'pg';
import { activateVendor, safeParseMetadata, updateVendor, ValidationError } from './db.js';
import { normalizeTaxonomyValues } from '../../shared/vendorTaxonomy.js';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const COOKIE = 'mymenders_admin';
const secret = () => process.env.ADMIN_JWT_SECRET || '';
const secureCookie = () => process.env.NODE_ENV === 'production';

const b64 = (value) => Buffer.from(value).toString('base64url');
const sign = (input) => crypto.createHmac('sha256', secret()).update(input).digest('base64url');
export const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) =>
  `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
const verifyPassword = (password, stored) => {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  return actual.length === Buffer.from(hash, 'hex').length && crypto.timingSafeEqual(actual, Buffer.from(hash, 'hex'));
};
const createToken = (admin) => {
  const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64(JSON.stringify({ sub: admin.id, username: admin.username, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 }));
  return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
};
const getCookie = (request) => (request.headers.get('cookie') || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
export const requireAdmin = async (request) => {
  if (!secret()) return null;
  const token = getCookie(request);
  if (!token) return null;
  const [header, payload, signature] = token.split('.');
  const expected = sign(`${header}.${payload}`);
  if (!header || !payload || !signature || Buffer.byteLength(signature) !== Buffer.byteLength(expected) || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (decoded.exp < Date.now() / 1000) return null;
    return decoded;
  } catch { return null; }
};
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const parseBody = async (request) => request.json().catch(() => ({}));
const adminVendor = (row) => {
  const metadata = safeParseMetadata(row.photos);
  return {
    ...row,
    ...metadata,
    entry_level: metadata.entry_level || row.entry_level || row.category,
    types: normalizeTaxonomyValues('types', metadata.types || []),
    categories: normalizeTaxonomyValues('categories', metadata.categories || []),
    regional_techniques: normalizeTaxonomyValues('regional_techniques', metadata.regional_techniques || []),
    online_presence: metadata.online_presence || row.website || '',
    review_text: metadata.review_text || '',
    rating: metadata.rating ?? 0,
    rating_count: metadata.rating_count ?? 0,
  };
};

export async function handleAdminRequest(request, path) {
  const method = request.method;
  if (path === 'auth/login' && method === 'POST') {
    const { username, password } = await parseBody(request);
    const result = await pool.query('SELECT id, username, password_hash FROM admins WHERE username=$1', [username]);
    if (!result.rows[0] || !verifyPassword(password, result.rows[0].password_hash)) return json({ error: 'Invalid credentials' }, 401);
    return json({ username: result.rows[0].username }, 200, { 'Set-Cookie': `${COOKIE}=${createToken(result.rows[0])}; HttpOnly;${secureCookie() ? ' Secure;' : ''} SameSite=Strict; Path=/; Max-Age=43200` });
  }
  if (path === 'auth/logout' && method === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; HttpOnly;${secureCookie() ? ' Secure;' : ''} SameSite=Strict; Path=/; Max-Age=0` });
  const admin = await requireAdmin(request);
  if (!admin) return json({ error: 'Unauthorized' }, 401);
  if (path === 'auth/me' && method === 'GET') return json({ username: admin.username });
  if (path === 'menders' && method === 'GET') return json((await pool.query('SELECT * FROM vendors ORDER BY CASE WHEN status=\'draft\' THEN 0 ELSE 1 END, id')).rows.map(adminVendor));
  const match = path.match(/^menders\/(\d+)(\/activate)?$/);
  if (match && method === 'GET') {
    const result = await pool.query('SELECT * FROM vendors WHERE id=$1', [Number(match[1])]);
    return result.rows[0] ? json(adminVendor(result.rows[0])) : json({ error: 'Mender not found' }, 404);
  }
  if (match && method === 'PATCH' && !match[2]) {
    try { return json(adminVendor(await updateVendor(pool, match[1], await parseBody(request)))); }
    catch (error) { return json({ error: error.message }, error instanceof ValidationError && error.message === 'Vendor not found' ? 404 : 400); }
  }
  if (match && method === 'POST' && match[2]) {
    try { return json(adminVendor(await activateVendor(pool, match[1]))); }
    catch (error) { return json({ error: error.message }, 404); }
  }
  return json({ error: 'Not found' }, 404);
}

export { COOKIE };
