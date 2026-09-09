import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Self-contained (no imports from src/server/*) — Vercel's function bundler
// has failed to trace those cross-directory imports on this project (same
// issue api/iot/telemetry.ts hit and fixed the same way), so everything
// this function needs lives in this one file. src/server/adminHandler.ts
// still exists with the same logic for the Vite dev-server path — keep
// both in sync if you change one.

const NewTeamMemberSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is too short.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  role: z.enum(['ADMIN', 'USER']),
});

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'OPERATIONS']);

const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default async function handler(req: any, res?: any) {
  const isWebStandard = !res || typeof res.writeHead !== 'function';

  const sendResponse = (status: number, body: Record<string, unknown>) => {
    if (isWebStandard) return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
    res.writeHead(status, CORS_HEADERS);
    res.end(JSON.stringify(body));
  };

  if (req.method === 'OPTIONS') {
    if (isWebStandard) return new Response(null, { status: 200, headers: CORS_HEADERS });
    res.writeHead(200, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendResponse(405, { ok: false, error: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed' });
  }

  try {
    let authHeader = '';
    if (typeof req.headers?.get === 'function') {
      authHeader = req.headers.get('authorization') || '';
    } else {
      authHeader = req.headers?.authorization || req.headers?.Authorization || '';
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

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return sendResponse(500, { ok: false, error: 'NOT_CONFIGURED', message: 'Server is missing SUPABASE_SECRET_KEY.' });
    }
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return sendResponse(401, { ok: false, error: 'UNAUTHORIZED', message: 'Missing bearer token.' });
    }

    const { data: callerData, error: callerError } = await supabase.auth.getUser(token);
    if (callerError || !callerData.user) {
      return sendResponse(401, { ok: false, error: 'UNAUTHORIZED', message: 'Invalid or expired session.' });
    }

    const { data: callerProfile, error: profileError } = await supabase.from('profiles').select('role').eq('id', callerData.user.id).maybeSingle();
    if (profileError || !callerProfile || !ADMIN_ROLES.has(String(callerProfile.role))) {
      return sendResponse(403, { ok: false, error: 'FORBIDDEN', message: 'Only existing admins can add team members.' });
    }

    let payload: Record<string, unknown>;
    try {
      payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    } catch {
      return sendResponse(400, { ok: false, error: 'INVALID_PAYLOAD', message: 'Malformed JSON payload.' });
    }

    const parsed = NewTeamMemberSchema.safeParse(payload);
    if (!parsed.success) {
      return sendResponse(400, { ok: false, error: 'INVALID_PAYLOAD', message: parsed.error.issues[0]?.message || 'Invalid input.' });
    }
    const { fullName, email, password, role } = parsed.data;

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !created.user) {
      const alreadyExists = /already.*registered|already exists/i.test(createError?.message || '');
      return sendResponse(alreadyExists ? 409 : 400, {
        ok: false,
        error: alreadyExists ? 'EMAIL_TAKEN' : 'CREATE_FAILED',
        message: createError?.message || 'Could not create user.',
      });
    }

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ id: created.user.id, email, full_name: fullName, role }, { onConflict: 'id' });

    if (upsertError) {
      return sendResponse(500, { ok: false, error: 'PROFILE_UPSERT_FAILED', message: upsertError.message });
    }

    return sendResponse(200, { ok: true, profile: { id: created.user.id, email, full_name: fullName, role } });
  } catch (err) {
    return sendResponse(500, { ok: false, error: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'Unknown error.' });
  }
}
