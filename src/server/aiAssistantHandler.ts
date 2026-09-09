import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// This handler is the only place in the codebase that touches
// ANTHROPIC_API_KEY. It must only ever run server-side (Vite dev
// middleware, or a Vercel serverless function) — never import this from
// src/ code that ships to the browser.
const getAnthropicClient = (): Anthropic | null => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
};

const getServiceClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().min(1).max(4000),
});

// The fleet snapshot the client already has loaded (from useSmartBin) —
// summarized here rather than re-queried, so the assistant reasons over
// exactly what the admin is looking at, not a second, possibly-different
// live query.
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

export interface AiAssistantResult {
  statusCode: number;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

export const AI_ASSISTANT_CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

export async function handleAiAssistantChat(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string | Record<string, unknown>
): Promise<AiAssistantResult> {
  const getHeader = (name: string): string => {
    const val = headers[name.toLowerCase()] || headers[name];
    if (Array.isArray(val)) return val[0] || '';
    return typeof val === 'string' ? val : '';
  };

  // Require a signed-in session (any role) — this endpoint spends real
  // money per request, and it's otherwise a publicly reachable URL. Fail
  // closed (like adminHandler.ts) if identity can't even be checked,
  // rather than silently letting unauthenticated requests through.
  const supabase = getServiceClient();
  if (!supabase) {
    return { statusCode: 500, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: 'NOT_CONFIGURED', message: 'Server is missing SUPABASE_SECRET_KEY.' } };
  }
  const token = getHeader('authorization').replace(/^Bearer\s+/i, '');
  if (!token) {
    return { statusCode: 401, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: 'UNAUTHORIZED', message: 'Missing bearer token.' } };
  }
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return { statusCode: 401, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: 'UNAUTHORIZED', message: 'Invalid or expired session.' } };
  }

  const client = getAnthropicClient();
  if (!client) {
    return { statusCode: 500, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: 'NOT_CONFIGURED', message: 'Server is missing ANTHROPIC_API_KEY.' } };
  }

  let payload: unknown;
  try {
    payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  } catch {
    return { statusCode: 400, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: 'INVALID_PAYLOAD', message: 'Malformed JSON payload.' } };
  }

  const parsed = ChatRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return { statusCode: 400, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: 'INVALID_PAYLOAD', message: parsed.error.issues[0]?.message || 'Invalid input.' } };
  }
  const { message, history, fleet } = parsed.data;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      output_config: { effort: 'medium' },
      system: buildSystemPrompt(fleet),
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.text }) as Anthropic.MessageParam),
        { role: 'user', content: message },
      ],
    });

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text');
    const text = textBlock?.text?.trim();
    if (!text) {
      return { statusCode: 502, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: 'EMPTY_RESPONSE', message: 'The assistant returned no text.' } };
    }

    return { statusCode: 200, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: true, text } };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return { statusCode: 429, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: 'RATE_LIMITED', message: 'The assistant is busy — try again shortly.' } };
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return { statusCode: 500, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: 'AUTH_FAILED', message: 'Server has an invalid ANTHROPIC_API_KEY.' } };
    }
    if (err instanceof Anthropic.APIError) {
      return { statusCode: 502, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: 'UPSTREAM_ERROR', message: err.message } };
    }
    return { statusCode: 500, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'Unknown error.' } };
  }
}
