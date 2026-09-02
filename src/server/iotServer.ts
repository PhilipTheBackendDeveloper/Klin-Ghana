import http, { IncomingMessage, ServerResponse } from 'http';
import { handleHealthCheck, handleTelemetryIngestion } from './iotHandler';

export const createIotServer = (port: number = 3001): http.Server => {
  const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url?.split('?')[0];

    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'x-device-id, x-device-key, content-type, apikey, authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      });
      res.end('ok');
      return;
    }

    if (url === '/api/health' && req.method === 'GET') {
      const result = await handleHealthCheck();
      res.writeHead(result.statusCode, result.headers);
      res.end(JSON.stringify(result.body));
      return;
    }

    if (req.method === 'POST' && (url === '/api/iot/telemetry' || url?.includes('/iot-telemetry'))) {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', async () => {
        const result = await handleTelemetryIngestion(req.headers, body);
        res.writeHead(result.statusCode, result.headers);
        res.end(JSON.stringify(result.body));
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'NOT_FOUND', message: 'Endpoint not found.' }));
  });

  return server;
};
