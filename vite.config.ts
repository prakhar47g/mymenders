import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { Pool } from 'pg';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const pool = env.DATABASE_URL
    ? new Pool({connectionString: env.DATABASE_URL})
    : null;

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

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-vendors-api',
        configureServer(server) {
          server.middlewares.use('/api/vendors', async (req, res) => {
            if (!pool) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({error: 'DATABASE_URL is not configured'}));
              return;
            }

            try {
              if (req.method === 'GET') {
                const result = await pool.query('SELECT * FROM vendors ORDER BY id');
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result.rows));
                return;
              }

              if (req.method === 'POST') {
                const body = await new Promise<string>((resolve, reject) => {
                  let data = '';
                  req.on('data', chunk => {
                    data += chunk;
                  });
                  req.on('end', () => resolve(data));
                  req.on('error', reject);
                });
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
                } = JSON.parse(body || '{}');

                if (!name || latitude === undefined || longitude === undefined) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify({
                      error: 'Name, latitude, and longitude are required',
                    }),
                  );
                  return;
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
                  ],
                );

                res.statusCode = 201;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result.rows[0]));
                return;
              }

              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({error: 'Method not allowed'}));
            } catch (error) {
              console.error('Local /api/vendors error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({error: 'Failed to handle vendors request'}));
            }
          });
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.DATABASE_URL': JSON.stringify(env.DATABASE_URL),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
