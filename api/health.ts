import { handleHealthCheck } from '../src/server/iotHandler.ts';

export default async function handler(req: any, res?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    if (!res || typeof res.writeHead !== 'function') {
      return new Response(null, { status: 200, headers });
    }
    res.writeHead(200, headers);
    res.end();
    return;
  }

  const result = await handleHealthCheck();

  if (!res || typeof res.writeHead !== 'function') {
    return new Response(JSON.stringify(result.body), {
      status: result.statusCode,
      headers: result.headers,
    });
  }

  res.writeHead(result.statusCode, result.headers);
  res.end(JSON.stringify(result.body));
}
