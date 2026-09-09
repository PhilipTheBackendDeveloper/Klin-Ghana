import { handleAiAssistantChat, AI_ASSISTANT_CORS_HEADERS } from '../../src/server/aiAssistantHandler';

export default async function handler(req: any, res?: any) {
  const isWebStandard = !res || typeof res.writeHead !== 'function';

  if (req.method === 'OPTIONS') {
    if (isWebStandard) return new Response(null, { status: 200, headers: AI_ASSISTANT_CORS_HEADERS });
    res.writeHead(200, AI_ASSISTANT_CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    const body = { ok: false, error: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed' };
    if (isWebStandard) return new Response(JSON.stringify(body), { status: 405, headers: AI_ASSISTANT_CORS_HEADERS });
    res.writeHead(405, AI_ASSISTANT_CORS_HEADERS);
    res.end(JSON.stringify(body));
    return;
  }

  const headers: Record<string, string> = {};
  if (typeof req.headers?.get === 'function') {
    headers.authorization = req.headers.get('authorization') || '';
  } else {
    headers.authorization = req.headers?.authorization || req.headers?.Authorization || '';
  }

  let rawBody: string | Record<string, unknown>;
  if (isWebStandard) {
    rawBody = await req.text();
  } else if (typeof req.body === 'object' && req.body !== null) {
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

  const result = await handleAiAssistantChat(headers, rawBody);

  if (isWebStandard) {
    return new Response(JSON.stringify(result.body), { status: result.statusCode, headers: result.headers });
  }
  res.writeHead(result.statusCode, result.headers);
  res.end(JSON.stringify(result.body));
}
