import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleHealthCheck, handleTelemetryIngestion } from './src/server/iotHandler.ts';
import { handleCreateTeamMember, ADMIN_CORS_HEADERS } from './src/server/adminHandler.ts';

// `import.meta.env` (populated from .env.local for the browser bundle) is
// separate from this config/plugin file's own `process.env` — Vite does not
// load .env files into process.env for you. Server-only vars like
// SUPABASE_SECRET_KEY (used by adminHandler.ts) need this to be readable
// during `npm run dev`. Never overwrites an already-set OS env var.
const loadEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) process.env[key] = rest.join('=').replace(/^['"]|['"]$/g, '');
  }
};

loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env'));

function iotApiPlugin(): Plugin {
  return {
    name: 'klinghana-iot-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];

        if (url === '/api/health' && (req.method === 'GET' || req.method === 'OPTIONS')) {
          if (req.method === 'OPTIONS') {
            res.writeHead(200, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
            });
            res.end();
            return;
          }
          const result = await handleHealthCheck();
          res.writeHead(result.statusCode, result.headers);
          res.end(JSON.stringify(result.body));
          return;
        }

        if (url === '/api/iot/telemetry') {
          if (req.method === 'OPTIONS') {
            res.writeHead(200, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'x-device-id, x-device-key, content-type, apikey',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
            });
            res.end();
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', async () => {
              const result = await handleTelemetryIngestion(req.headers as Record<string, string>, body);
              res.writeHead(result.statusCode, result.headers);
              res.end(JSON.stringify(result.body));
            });
            return;
          }
        }

        if (url === '/api/admin/create-team-member') {
          if (req.method === 'OPTIONS') {
            res.writeHead(200, ADMIN_CORS_HEADERS);
            res.end();
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', async () => {
              const result = await handleCreateTeamMember(req.headers as Record<string, string>, body);
              res.writeHead(result.statusCode, result.headers);
              res.end(JSON.stringify(result.body));
            });
            return;
          }
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), iotApiPlugin()],
  server: {
    port: 3000,
    open: false,
  },
  test: {
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
