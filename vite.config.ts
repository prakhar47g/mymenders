import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { Pool } from 'pg';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { insertVendor, ValidationError } from './api/lib/db';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const pool = env.DATABASE_URL
    ? new Pool({ connectionString: env.DATABASE_URL })
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
              res.end(JSON.stringify({ error: 'DATABASE_URL is not configured' }));
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
                  req.on('data', (chunk) => {
                    data += chunk;
                  });
                  req.on('end', () => resolve(data));
                  req.on('error', reject);
                });

                const vendor = await insertVendor(pool, JSON.parse(body || '{}'));

                res.statusCode = 201;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(vendor));
                return;
              }

              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
            } catch (error) {
              if (error instanceof ValidationError) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: error.message }));
                return;
              }
              console.error('Local /api/vendors error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to handle vendors request' }));
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
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
