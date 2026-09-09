import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Self-contained (no imports from src/server/*) — Vercel's function bundler
// has failed to trace those cross-directory imports on this project (same
// issue api/iot/telemetry.ts hit and fixed the same way), so everything
// this function needs lives in this one file. src/server/aiAssistantHandler.ts
// still exists with the same logic for the Vite dev-server path — keep
// both in sync if you change one.
//
// Uses Cloudflare Workers AI (https://developers.cloudflare.com/workers-ai/)
// instead of a paid model — its free tier (10,000 "neurons"/day as of this
// writing) needs only a free Cloudflare account, no credit card. Swap
// WORKERS_AI_MODEL below to any other text-generation model in Cloudflare's
// catalog if you want a different quality/speed/limit tradeoff.
const WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().min(1).max(4000),
});

const FleetBinSummarySchema = z.object({
  code: z.string(),
  name: z.string(),
  status: z.string(),
  fillPercentage: z.number(),
  batteryPercentage: z.number().nullable().optional(),
  wifiSignal: z.number().nullable().optional(),
  lastUpdated: z.string().nullable().optional(),
  zone: z.string().nullable().optional(),
});

const FleetAlertSummarySchema = z.object({
  binCode: z.string(),
  type: z.string(),
  message: z.string(),
  read: z.boolean(),
});

const FleetRouteStopSummarySchema = z.object({
  binCode: z.string().optional(),
  name: z.string(),
  status: z.string(),
});

const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty.').max(2000, 'Message is too long.'),
  history: z.array(ChatMessageSchema).max(20).default([]),
  fleet: z.object({
    fleetHealthPercent: z.number(),
    bins: z.array(FleetBinSummarySchema).max(200).default([]),
    alerts: z.array(FleetAlertSummarySchema).max(100).default([]),
    routeStops: z.array(FleetRouteStopSummarySchema).max(200).default([]),
  }),
});

const buildSystemPrompt = (fleet: z.infer<typeof ChatRequestSchema>['fleet']): string => {
  const binLines = fleet.bins.length === 0
    ? 'No SmartBins are currently loaded.'
    : fleet.bins.map((b) => [
        b.code,
        b.name,
        `${b.fillPercentage}% full`,
        `status ${b.status}`,
        b.zone ? `zone ${b.zone}` : null,
        `battery ${b.batteryPercentage == null ? 'N/A' : `${b.batteryPercentage}%`}`,
        `signal ${b.wifiSignal == null ? 'N/A' : `${b.wifiSignal} dBm`}`,
        b.lastUpdated ? `last seen ${b.lastUpdated}` : null,
      ].filter(Boolean).join(' — ')).join('\n');

  const alertLines = fleet.alerts.length === 0
    ? 'No active alerts.'
    : fleet.alerts.map((a) => `[${a.read ? 'read' : 'UNREAD'}] ${a.binCode}: ${a.type} — ${a.message}`).join('\n');

  const routeLines = fleet.routeStops.length === 0
    ? 'No route stops are currently loaded.'
    : fleet.routeStops.map((r) => `${r.binCode || '—'} ${r.name}: ${r.status}`).join('\n');

  return [
    'You are the KlinGhana AI Assistant, embedded in the admin dashboard of a Kumasi-based smart-waste-management platform.',
    'You help operations staff understand fleet status, prioritize pickups, and answer questions about bins, alerts, and collection routes.',
    '',
    `Fleet health: ${fleet.fleetHealthPercent}%`,
    '',
    'SmartBins:',
    binLines,
    '',
    'Alerts:',
    alertLines,
    '',
    'Route stops:',
    routeLines,
    '',
    'Answer only from the data above — do not invent bins, alerts, or figures that are not listed. If asked something the data cannot answer, say so plainly.',
    'Keep answers short and operational (a few sentences, or a brief list) — this is a dashboard chat panel, not a report.',
  ].join('\n');
};

interface WorkersAiResponse {
  success: boolean;
  errors?: { code: number; message: string }[];
  result?: { response?: string };
}

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

    // Require a signed-in session (any role) — this endpoint calls out to a
    // rate-limited free tier, and it's otherwise a publicly reachable URL.
    // Fail closed if identity can't even be checked, rather than silently
    // letting unauthenticated requests through.
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
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return sendResponse(401, { ok: false, error: 'UNAUTHORIZED', message: 'Invalid or expired session.' });
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiToken) {
      return sendResponse(500, { ok: false, error: 'NOT_CONFIGURED', message: 'Server is missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN.' });
    }

    let payload: unknown;
    try {
      payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    } catch {
      return sendResponse(400, { ok: false, error: 'INVALID_PAYLOAD', message: 'Malformed JSON payload.' });
    }

    const parsed = ChatRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return sendResponse(400, { ok: false, error: 'INVALID_PAYLOAD', message: parsed.error.issues[0]?.message || 'Invalid input.' });
    }
    const { message, history, fleet } = parsed.data;

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${WORKERS_AI_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: buildSystemPrompt(fleet) },
            ...history.map((m) => ({ role: m.role, content: m.text })),
            { role: 'user', content: message },
          ],
        }),
      }
    );

    if (cfRes.status === 401 || cfRes.status === 403) {
      return sendResponse(500, { ok: false, error: 'AUTH_FAILED', message: 'Server has an invalid CLOUDFLARE_API_TOKEN.' });
    }
    if (cfRes.status === 429) {
      return sendResponse(429, { ok: false, error: 'RATE_LIMITED', message: 'Free daily AI quota reached — try again tomorrow, or upgrade the Cloudflare account.' });
    }

    const data = (await cfRes.json().catch(() => null)) as WorkersAiResponse | null;
    if (!cfRes.ok || !data?.success) {
      const errorMessage = data?.errors?.[0]?.message || `Workers AI request failed (HTTP ${cfRes.status}).`;
      return sendResponse(502, { ok: false, error: 'UPSTREAM_ERROR', message: errorMessage });
    }

    const text = data.result?.response?.trim();
    if (!text) {
      return sendResponse(502, { ok: false, error: 'EMPTY_RESPONSE', message: 'The assistant returned no text.' });
    }

    return sendResponse(200, { ok: true, text });
  } catch (err) {
    return sendResponse(500, { ok: false, error: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'Unknown error.' });
  }
}
