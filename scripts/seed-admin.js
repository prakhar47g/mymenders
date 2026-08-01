import { Pool } from 'pg';
import { hashPassword } from '../api/lib/admin.js';

if (!process.env.DATABASE_URL || !process.env.ADMIN_INITIAL_PASSWORD) throw new Error('DATABASE_URL and ADMIN_INITIAL_PASSWORD are required');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const username = process.env.ADMIN_INITIAL_USERNAME || 'admin';
await pool.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET password_hash=EXCLUDED.password_hash', [username, hashPassword(process.env.ADMIN_INITIAL_PASSWORD)]);
await pool.end();
console.log(`Seeded admin: ${username}`);
