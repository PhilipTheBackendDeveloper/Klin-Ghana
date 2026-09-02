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

  let dbStatus = 'connected';
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      dbStatus = 'unconfigured';
    }
  } catch {
    dbStatus = 'disconnected';
  }

  const responseBody = {
    status: 'ok',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  };

  // Web Standard Response (Vercel Edge / Node Web Standard)
  if (!res || typeof res.writeHead !== 'function') {
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers,
    });
  }

  // Node.js ServerResponse
  res.writeHead(200, headers);
  res.end(JSON.stringify(responseBody));
}
