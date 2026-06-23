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

                const result = await pool.query(
                  `INSERT INTO vendors (name, address, latitude, longitude, category, phone, website, hours, photo_url, photos)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                   RETURNING *`,
                  [
                    name,
                    address || null,
                    latitude,
                    longitude,
                    category || 'Other',
                    phone || null,
                    website || null,
                    hours || null,
                    photo_url || null,
                    photos ? JSON.stringify(photos) : null,
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
