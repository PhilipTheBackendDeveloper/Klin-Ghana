import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// This handler is the ONLY place in the codebase (besides scripts/create-admin.mjs,
// which runs locally on a developer's machine) that touches SUPABASE_SECRET_KEY. It
// must only ever run server-side (Vite dev middleware, or a Vercel serverless
// function) â€” never import this from src/ code that ships to the browser.
const getServiceClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

const NewTeamMemberSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is too short.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  role: z.enum(['ADMIN', 'USER']),
});

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'OPERATIONS']);

export interface AdminActionResult {
  statusCode: number;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

export const ADMIN_CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function handleCreateTeamMember(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string | Record<string, unknown>
): Promise<AdminActionResult> {
  const getHeader = (name: string): string => {
    const val = headers[name.toLowerCase()] || headers[name];
    if (Array.isArray(val)) return val[0] || '';
    return typeof val === 'string' ? val : '';
  };

  const supabase = getServiceClient();
  if (!supabase) {
    return { statusCode: 500, headers: ADMIN_CORS_HEADERS, body: { ok: false, error: 'NOT_CONFIGURED', message: 'Server is missing SUPABASE_SECRET_KEY.' } };
  }

  const token = getHeader('authorization').replace(/^Bearer\s+/i, '');
  if (!token) {
    return { statusCode: 401, headers: ADMIN_CORS_HEADERS, body: { ok: false, error: 'UNAUTHORIZED', message: 'Missing bearer token.' } };
  }

  const { data: callerData, error: callerError } = await supabase.auth.getUser(token);
  if (callerError || !callerData.user) {
    return { statusCode: 401, headers: ADMIN_CORS_HEADERS, body: { ok: false, error: 'UNAUTHORIZED', message: 'Invalid or expired session.' } };
  }

  const { data: callerProfile, error: profileError } = await supabase.from('profiles').select('role').eq('id', callerData.user.id).maybeSingle();
  if (profileError || !callerProfile || !ADMIN_ROLES.has(String(callerProfile.role))) {
    return { statusCode: 403, headers: ADMIN_CORS_HEADERS, body: { ok: false, error: 'FORBIDDEN', message: 'Only existing admins can add team members.' } };
  }

  let payload: Record<string, unknown>;
  try {
    payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  } catch {
    return { statusCode: 400, headers: ADMIN_CORS_HEADERS, body: { ok: false, error: 'INVALID_PAYLOAD', message: 'Malformed JSON payload.' } };
  }

  const parsed = NewTeamMemberSchema.safeParse(payload);
  if (!parsed.success) {
    return { statusCode: 400, headers: ADMIN_CORS_HEADERS, body: { ok: false, error: 'INVALID_PAYLOAD', message: parsed.error.issues[0]?.message || 'Invalid input.' } };
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
    return {
      statusCode: alreadyExists ? 409 : 400,
      headers: ADMIN_CORS_HEADERS,
      body: { ok: false, error: alreadyExists ? 'EMAIL_TAKEN' : 'CREATE_FAILED', message: createError?.message || 'Could not create user.' },
    };
  }

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert({ id: created.user.id, email, full_name: fullName, role }, { onConflict: 'id' });

  if (upsertError) {
    return { statusCode: 500, headers: ADMIN_CORS_HEADERS, body: { ok: false, error: 'PROFILE_UPSERT_FAILED', message: upsertError.message } };
  }

  return {
    statusCode: 200,
    headers: ADMIN_CORS_HEADERS,
    body: { ok: true, profile: { id: created.user.id, email, full_name: fullName, role } },
  };
}

