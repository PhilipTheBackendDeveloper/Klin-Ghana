import { handleTelemetryIngestion } from '../../src/server/iotHandler.ts';

export default async function handler(req: any, res?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'x-device-id, x-device-key, content-type, apikey, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  const sendResponse = (status: number, body: Record<string, unknown>, responseHeaders = headers) => {
    if (!res || typeof res.writeHead !== 'function') {
      return new Response(JSON.stringify(body), { status, headers: responseHeaders });
    }
    res.writeHead(status, responseHeaders);
    res.end(JSON.stringify(body));
  };

  try {
    if (req.method === 'OPTIONS') {
      if (!res || typeof res.writeHead !== 'function') {
        return new Response(null, { status: 200, headers });
      }
      res.writeHead(200, headers);
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      return sendResponse(405, { ok: false, error: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed' });
    }

    let rawBody: string | Record<string, unknown>;
    const requestHeaders: Record<string, string> = {};

    if (req.headers && typeof req.headers.get === 'function') {
      ['x-device-id', 'x-device-key', 'content-type', 'apikey', 'authorization'].forEach((name) => {
        requestHeaders[name] = req.headers.get(name) || '';
      });
      rawBody = await req.text();
    } else {
      Object.entries(req.headers || {}).forEach(([key, value]) => {
        requestHeaders[key.toLowerCase()] = Array.isArray(value) ? value[0] : String(value ?? '');
      });
      if (typeof req.body === 'object' && req.body !== null) {
        rawBody = req.body;
      } else if (typeof req.body === 'string') {
        rawBody = req.body;
      } else {
        rawBody = await new Promise((resolve) => {
          let str = '';
          req.on('data', (c: any) => { str += c; });
          req.on('end', () => resolve(str));
        });
      }
    }

    const result = await handleTelemetryIngestion(requestHeaders, rawBody);
    return sendResponse(result.statusCode, result.body, result.headers);
  } catch (err: any) {
    return sendResponse(500, { ok: false, error: 'INTERNAL_ERROR', message: err.message || 'Server error' });
  }
}
