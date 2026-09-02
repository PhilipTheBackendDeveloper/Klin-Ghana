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

  let dbStatus = 'unconfigured';
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (supabaseUrl && supabaseKey) {
      const pingRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/bins?select=code&limit=1`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });
      dbStatus = pingRes.ok ? 'connected' : 'unreachable';
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
