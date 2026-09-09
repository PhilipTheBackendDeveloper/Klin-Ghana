// vite.config.ts
import fs from "fs";
import path from "path";
import { defineConfig } from "file:///C:/projects/KlinGhana/node_modules/vite/dist/node/index.js";
import react from "file:///C:/projects/KlinGhana/node_modules/@vitejs/plugin-react/dist/index.js";

// src/server/iotHandler.ts
import { createClient } from "file:///C:/projects/KlinGhana/node_modules/@supabase/supabase-js/dist/index.mjs";

// src/shared/telemetryContract.ts
import { z } from "file:///C:/projects/KlinGhana/node_modules/zod/index.js";
var HardwareFillStatusSchema = z.enum([
  "NORMAL",
  "FILLING",
  "NEAR_FULL",
  "FULL",
  "OVERFLOW",
  "OFFLINE",
  "FAULT",
  "UNKNOWN"
]);
var TelemetryPayloadSchema = z.object({
  schemaVersion: z.number().int().min(1).default(1),
  messageId: z.string().min(1).max(128).optional(),
  sequence: z.number().int().min(0).optional(),
  deviceId: z.string().min(3).max(64),
  timestamp: z.union([z.string(), z.number()]),
  fillPercentage: z.number().min(0).max(120),
  distanceCm: z.number().min(0).max(500),
  rawDistanceCm: z.number().min(0).max(500).optional(),
  fillStatus: HardwareFillStatusSchema.optional(),
  binStatus: HardwareFillStatusSchema.optional(),
  lidState: z.enum(["OPEN", "CLOSED"]).default("CLOSED"),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  gpsFix: z.boolean().default(false),
  gpsAccuracyM: z.number().min(0).max(1e4).nullable().optional().default(null),
  gpsUpdatedAt: z.string().nullable().optional().default(null),
  satellites: z.number().int().min(0).max(64).nullable().optional().default(null),
  wifiRssi: z.number().int().min(-120).max(0).nullable().optional().default(null),
  batteryPercentage: z.number().int().min(0).max(100).nullable().optional().default(null),
  temperatureC: z.number().min(-20).max(85).nullable().optional().default(null),
  firmwareVersion: z.string().min(1).max(64).default("v1.0.0-esp32-core")
}).superRefine((payload, ctx) => {
  if (payload.gpsFix && (typeof payload.latitude !== "number" || typeof payload.longitude !== "number")) {
    ctx.addIssue({
      code: "custom",
      path: ["gpsFix"],
      message: "gpsFix=true requires numeric latitude and longitude."
    });
  }
});
var normalizeDeviceId = (deviceId) => deviceId.trim().toUpperCase();
var calculateHardwareFillStatus = (fillPercentage) => {
  if (fillPercentage >= 100) return "OVERFLOW";
  if (fillPercentage >= 95) return "FULL";
  if (fillPercentage >= 85) return "NEAR_FULL";
  if (fillPercentage >= 70) return "FILLING";
  return "NORMAL";
};
var isDuplicateTelemetry = (cache, deviceId, messageId) => {
  if (!messageId) return false;
  const key = `${normalizeDeviceId(deviceId)}:${messageId}`;
  if (cache.has(key)) return true;
  cache.add(key);
  return false;
};
var isStaleSequence = (lastSequenceByDevice2, deviceId, sequence) => {
  if (sequence === void 0) return false;
  const normalized = normalizeDeviceId(deviceId);
  const lastSequence = lastSequenceByDevice2.get(normalized);
  if (lastSequence !== void 0 && sequence <= lastSequence) {
    if (sequence === 1 || lastSequence - sequence > 10) {
      lastSequenceByDevice2.set(normalized, sequence);
      return false;
    }
    return true;
  }
  lastSequenceByDevice2.set(normalized, sequence);
  return false;
};

// src/server/deviceCredentials.ts
var DEVICE_CREDENTIALS_ENV = "DEVICE_CREDENTIALS_JSON";
var DEFAULT_CREDENTIALS = {
  "SB-024": "klinghana_dev_device_key_sb024"
};
var parseDeviceCredentials = (raw) => {
  if (!raw) return { ...DEFAULT_CREDENTIALS };
  try {
    const parsed = JSON.parse(raw);
    const custom = Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === "string" && value.length > 0).map(([deviceId, key]) => [deviceId.toUpperCase(), key])
    );
    return { ...DEFAULT_CREDENTIALS, ...custom };
  } catch {
    return { ...DEFAULT_CREDENTIALS };
  }
};
var getDeviceCredential = (deviceId) => {
  const credentials = parseDeviceCredentials(process.env[DEVICE_CREDENTIALS_ENV]);
  return credentials[deviceId.toUpperCase()];
};
var verifyDeviceCredential = (deviceId, suppliedKey) => {
  const expectedKey = getDeviceCredential(deviceId);
  return Boolean(expectedKey) && expectedKey === suppliedKey;
};

// src/server/iotHandler.ts
var seenMessageIds = /* @__PURE__ */ new Set();
var lastSequenceByDevice = /* @__PURE__ */ new Map();
var getSupabaseServerClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false }
  });
};
var makeCorsHeaders = () => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-device-id, x-device-key, content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
});
async function handleTelemetryIngestion(headers, rawBody, deps = {}) {
  const corsHeaders = makeCorsHeaders();
  const getHeader = (name) => {
    const val = headers[name.toLowerCase()] || headers[name];
    if (Array.isArray(val)) return val[0] || "";
    return typeof val === "string" ? val : "";
  };
  const deviceId = normalizeDeviceId(getHeader("x-device-id"));
  const deviceKey = getHeader("x-device-key");
  if (!deviceId || !deviceKey) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: { ok: false, error: "INVALID_DEVICE_CREDENTIAL", message: "Missing X-Device-Id or X-Device-Key headers." }
    };
  }
  if (!verifyDeviceCredential(deviceId, deviceKey)) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: { ok: false, error: "INVALID_DEVICE_CREDENTIAL", message: "Device authentication failed." }
    };
  }
  let payload;
  try {
    payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: { ok: false, error: "INVALID_PAYLOAD", message: "Malformed JSON payload." }
    };
  }
  if (payload.deviceId && normalizeDeviceId(String(payload.deviceId)) !== deviceId) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: { ok: false, error: "DEVICE_MISMATCH", message: "Header deviceId does not match body deviceId." }
    };
  }
  const parseResult = TelemetryPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: { ok: false, error: "INVALID_PAYLOAD", message: "Validation failed.", details: parseResult.error.issues }
    };
  }
  const validData = parseResult.data;
  const sequenceNum = validData.sequence ?? 1;
  const messageId = validData.messageId || `${deviceId}-${sequenceNum}-${Date.now()}`;
  if (isDuplicateTelemetry(seenMessageIds, deviceId, messageId)) {
    return {
      statusCode: 409,
      headers: corsHeaders,
      body: { ok: false, error: "DUPLICATE_MESSAGE", message: "Telemetry messageId was already accepted." }
    };
  }
  if (isStaleSequence(lastSequenceByDevice, deviceId, sequenceNum)) {
    return {
      statusCode: 409,
      headers: corsHeaders,
      body: { ok: false, error: "STALE_SEQUENCE", message: "Telemetry sequence is not newer than the last accepted packet." }
    };
  }
  const evaluatedStatus = calculateHardwareFillStatus(validData.fillPercentage);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const rawDist = validData.rawDistanceCm ?? validData.distanceCm;
  const hasGpsFix = Boolean(
    validData.gpsFix && typeof validData.latitude === "number" && typeof validData.longitude === "number" && Number.isFinite(validData.latitude) && Number.isFinite(validData.longitude) && validData.latitude !== 0 && validData.longitude !== 0
  );
  const supabase = deps.supabase !== void 0 ? deps.supabase : getSupabaseServerClient();
  if (supabase) {
    try {
      const binLookup = await supabase.from("bins").select("id, name, latitude, longitude").eq("code", deviceId).maybeSingle();
      if (binLookup?.data) {
        const binRecord = binLookup.data;
        const finalLat = hasGpsFix ? validData.latitude : binRecord.latitude ?? null;
        const finalLng = hasGpsFix ? validData.longitude : binRecord.longitude ?? null;
        const commonRow = {
          bin_id: binRecord.id,
          device_id: deviceId,
          fill_percentage: validData.fillPercentage,
          distance_cm: validData.distanceCm,
          raw_distance_cm: rawDist,
          fill_status: evaluatedStatus,
          lid_state: validData.lidState || "CLOSED",
          battery_percentage: validData.batteryPercentage ?? 95,
          temperature_c: validData.temperatureC ?? 28,
          wifi_rssi: validData.wifiRssi ?? null,
          latitude: finalLat,
          longitude: finalLng,
          gps_accuracy_m: hasGpsFix ? validData.gpsAccuracyM : null,
          gps_fix: hasGpsFix,
          satellites: validData.satellites ?? 0,
          location_source: hasGpsFix ? "GPS" : binRecord.latitude != null ? "BENCH_REGISTERED" : "UNKNOWN",
          firmware_version: validData.firmwareVersion || "1.0.0-prod",
          message_id: messageId,
          message_sequence: sequenceNum
        };
        const { error: telemetryError } = await supabase.from("telemetry").insert({
          ...commonRow,
          recorded_at: nowIso
        });
        if (telemetryError) {
          console.error("[TELEMETRY] telemetry insert error:", telemetryError);
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: {
              ok: false,
              success: false,
              accepted: false,
              error: "DATABASE_ERROR",
              message: `Failed to insert telemetry: ${telemetryError.message}`
            }
          };
        }
        const { error: stateError } = await supabase.from("bin_current_state").upsert({
          ...commonRow,
          bin_status: evaluatedStatus,
          connection_status: "ONLINE",
          last_seen_at: nowIso,
          telemetry_received_at: nowIso,
          updated_at: nowIso,
          last_message_sequence: sequenceNum,
          gps_updated_at: hasGpsFix ? validData.gpsUpdatedAt || nowIso : null
        }, { onConflict: "bin_id" });
        if (stateError) {
          console.error("[TELEMETRY] bin_current_state upsert error:", stateError);
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: {
              ok: false,
              success: false,
              accepted: false,
              error: "DATABASE_ERROR",
              message: `Failed to persist bin current state: ${stateError.message}`
            }
          };
        }
        if (hasGpsFix) {
          const { error: binUpdateError } = await supabase.from("bins").update({
            latitude: finalLat,
            longitude: finalLng,
            updated_at: nowIso
          }).eq("id", binRecord.id);
          if (binUpdateError) {
            console.warn("[TELEMETRY] bins coordinate update warning:", binUpdateError);
          }
        }
        const { error: deviceError } = await supabase.from("devices").upsert({
          device_id: deviceId,
          bin_id: binRecord.id,
          firmware_version: validData.firmwareVersion || "1.0.0-prod",
          is_active: true,
          last_heartbeat: nowIso
        }, { onConflict: "device_id" });
        if (deviceError) {
          console.error("[TELEMETRY] device heartbeat upsert error:", deviceError);
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: {
              ok: false,
              success: false,
              accepted: false,
              error: "DATABASE_ERROR",
              message: `Failed to update device heartbeat: ${deviceError.message}`
            }
          };
        }
        const fillAlertTypes = ["NEAR_FULL", "FULL", "OVERFLOW"];
        if (fillAlertTypes.includes(evaluatedStatus)) {
          await supabase.from("alerts").update({ status: "RESOLVED", resolved_at: nowIso, updated_at: nowIso }).eq("bin_id", binRecord.id).neq("alert_type", evaluatedStatus).eq("status", "OPEN");
          const existingAlert = await supabase.from("alerts").select("id").eq("bin_id", binRecord.id).eq("alert_type", evaluatedStatus).eq("status", "OPEN").maybeSingle();
          if (!existingAlert?.data) {
            await supabase.from("alerts").insert({
              bin_id: binRecord.id,
              alert_type: evaluatedStatus,
              severity: evaluatedStatus === "NEAR_FULL" ? "WARNING" : "CRITICAL",
              status: "OPEN",
              message: `${evaluatedStatus.replace("_", " ")} fill state at ${validData.fillPercentage.toFixed(1)}% (${binRecord.name})`,
              created_at: nowIso,
              updated_at: nowIso
            });
          }
        } else {
          await supabase.from("alerts").update({ status: "RESOLVED", resolved_at: nowIso, updated_at: nowIso }).eq("bin_id", binRecord.id).eq("status", "OPEN");
        }
      }
    } catch (err) {
      console.warn("[IOT_HANDLER] Supabase persistence error (non-fatal):", err);
    }
  }
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: {
      ok: true,
      success: true,
      accepted: true,
      deviceId,
      serverTimestamp: nowIso,
      sequence: sequenceNum,
      fillPercentage: validData.fillPercentage,
      distanceCm: validData.distanceCm,
      rawDistanceCm: rawDist,
      gpsFix: hasGpsFix,
      evaluatedStatus
    }
  };
}
async function handleHealthCheck() {
  const corsHeaders = makeCorsHeaders();
  const supabase = getSupabaseServerClient();
  let dbStatus = "disconnected";
  if (supabase) {
    try {
      const { error } = await supabase.from("bins").select("id").limit(1);
      dbStatus = !error ? "connected" : "disconnected";
    } catch {
      dbStatus = "disconnected";
    }
  }
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: {
      status: "ok",
      database: dbStatus,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}

// src/server/adminHandler.ts
import { createClient as createClient2 } from "file:///C:/projects/KlinGhana/node_modules/@supabase/supabase-js/dist/index.mjs";
import { z as z2 } from "file:///C:/projects/KlinGhana/node_modules/zod/index.js";
var getServiceClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient2(url, key, { auth: { persistSession: false } });
};
var NewTeamMemberSchema = z2.object({
  fullName: z2.string().trim().min(2, "Full name is too short."),
  email: z2.string().trim().email("Enter a valid email address."),
  password: z2.string().min(8, "Password must be at least 8 characters."),
  role: z2.enum(["ADMIN", "USER"])
});
var ADMIN_ROLES = /* @__PURE__ */ new Set(["ADMIN", "SUPER_ADMIN", "OPERATIONS"]);
var ADMIN_CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
async function handleCreateTeamMember(headers, rawBody) {
  const getHeader = (name) => {
    const val = headers[name.toLowerCase()] || headers[name];
    if (Array.isArray(val)) return val[0] || "";
    return typeof val === "string" ? val : "";
  };
  const supabase = getServiceClient();
  if (!supabase) {
    return { statusCode: 500, headers: ADMIN_CORS_HEADERS, body: { ok: false, error: "NOT_CONFIGURED", message: "Server is missing SUPABASE_SECRET_KEY." } };
  }
  const token = getHeader("authorization").replace(/^Bearer\s+/i, "");
  if (!token) {
    return { statusCode: 401, headers: ADMIN_CORS_HEADERS, body: { ok: false, error: "UNAUTHORIZED", message: "Missing bearer token." } };
  }
  const { data: callerData, error: callerError } = await supabase.auth.getUser(token);
  if (callerError || !callerData.user) {
    return { statusCode: 401, headers: ADMIN_CORS_HEADERS, body: { ok: false, error: "UNAUTHORIZED", message: "Invalid or expired session." } };
  }
  const { data: callerProfile, error: profileError } = await supabase.from("profiles").select("role").eq("id", callerData.user.id).maybeSingle();
  if (profileError || !callerProfile || !ADMIN_ROLES.has(String(callerProfile.role))) {
    return { statusCode: 403, headers: ADMIN_CORS_HEADERS, body: { ok: false, error: "FORBIDDEN", message: "Only existing admins can add team members." } };
  }
  let payload;
  try {
    payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
  } catch {
    return { statusCode: 400, headers: ADMIN_CORS_HEADERS, body: { ok: false, error: "INVALID_PAYLOAD", message: "Malformed JSON payload." } };
  }
  const parsed = NewTeamMemberSchema.safeParse(payload);
  if (!parsed.success) {
    return { statusCode: 400, headers: ADMIN_CORS_HEADERS, body: { ok: false, error: "INVALID_PAYLOAD", message: parsed.error.issues[0]?.message || "Invalid input." } };
  }
  const { fullName, email, password, role } = parsed.data;
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });
  if (createError || !created.user) {
    const alreadyExists = /already.*registered|already exists/i.test(createError?.message || "");
    return {
      statusCode: alreadyExists ? 409 : 400,
      headers: ADMIN_CORS_HEADERS,
      body: { ok: false, error: alreadyExists ? "EMAIL_TAKEN" : "CREATE_FAILED", message: createError?.message || "Could not create user." }
    };
  }
  const { error: upsertError } = await supabase.from("profiles").upsert({ id: created.user.id, email, full_name: fullName, role }, { onConflict: "id" });
  if (upsertError) {
    return { statusCode: 500, headers: ADMIN_CORS_HEADERS, body: { ok: false, error: "PROFILE_UPSERT_FAILED", message: upsertError.message } };
  }
  return {
    statusCode: 200,
    headers: ADMIN_CORS_HEADERS,
    body: { ok: true, profile: { id: created.user.id, email, full_name: fullName, role } }
  };
}

// src/server/aiAssistantHandler.ts
import Anthropic from "file:///C:/projects/KlinGhana/node_modules/@anthropic-ai/sdk/index.mjs";
import { createClient as createClient3 } from "file:///C:/projects/KlinGhana/node_modules/@supabase/supabase-js/dist/index.mjs";
import { z as z3 } from "file:///C:/projects/KlinGhana/node_modules/zod/index.js";
var getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
};
var getServiceClient2 = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient3(url, key, { auth: { persistSession: false } });
};
var ChatMessageSchema = z3.object({
  role: z3.enum(["user", "assistant"]),
  text: z3.string().min(1).max(4e3)
});
var FleetBinSummarySchema = z3.object({
  code: z3.string(),
  name: z3.string(),
  status: z3.string(),
  fillPercentage: z3.number(),
  batteryPercentage: z3.number().nullable().optional(),
  wifiSignal: z3.number().nullable().optional(),
  lastUpdated: z3.string().nullable().optional(),
  zone: z3.string().nullable().optional()
});
var FleetAlertSummarySchema = z3.object({
  binCode: z3.string(),
  type: z3.string(),
  message: z3.string(),
  read: z3.boolean()
});
var FleetRouteStopSummarySchema = z3.object({
  binCode: z3.string().optional(),
  name: z3.string(),
  status: z3.string()
});
var ChatRequestSchema = z3.object({
  message: z3.string().trim().min(1, "Message cannot be empty.").max(2e3, "Message is too long."),
  history: z3.array(ChatMessageSchema).max(20).default([]),
  fleet: z3.object({
    fleetHealthPercent: z3.number(),
    bins: z3.array(FleetBinSummarySchema).max(200).default([]),
    alerts: z3.array(FleetAlertSummarySchema).max(100).default([]),
    routeStops: z3.array(FleetRouteStopSummarySchema).max(200).default([])
  })
});
var AI_ASSISTANT_CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
var buildSystemPrompt = (fleet) => {
  const binLines = fleet.bins.length === 0 ? "No SmartBins are currently loaded." : fleet.bins.map((b) => [
    b.code,
    b.name,
    `${b.fillPercentage}% full`,
    `status ${b.status}`,
    b.zone ? `zone ${b.zone}` : null,
    `battery ${b.batteryPercentage == null ? "N/A" : `${b.batteryPercentage}%`}`,
    `signal ${b.wifiSignal == null ? "N/A" : `${b.wifiSignal} dBm`}`,
    b.lastUpdated ? `last seen ${b.lastUpdated}` : null
  ].filter(Boolean).join(" \u2014 ")).join("\n");
  const alertLines = fleet.alerts.length === 0 ? "No active alerts." : fleet.alerts.map((a) => `[${a.read ? "read" : "UNREAD"}] ${a.binCode}: ${a.type} \u2014 ${a.message}`).join("\n");
  const routeLines = fleet.routeStops.length === 0 ? "No route stops are currently loaded." : fleet.routeStops.map((r) => `${r.binCode || "\u2014"} ${r.name}: ${r.status}`).join("\n");
  return [
    "You are the KlinGhana AI Assistant, embedded in the admin dashboard of a Kumasi-based smart-waste-management platform.",
    "You help operations staff understand fleet status, prioritize pickups, and answer questions about bins, alerts, and collection routes.",
    "",
    `Fleet health: ${fleet.fleetHealthPercent}%`,
    "",
    "SmartBins:",
    binLines,
    "",
    "Alerts:",
    alertLines,
    "",
    "Route stops:",
    routeLines,
    "",
    "Answer only from the data above \u2014 do not invent bins, alerts, or figures that are not listed. If asked something the data cannot answer, say so plainly.",
    "Keep answers short and operational (a few sentences, or a brief list) \u2014 this is a dashboard chat panel, not a report."
  ].join("\n");
};
async function handleAiAssistantChat(headers, rawBody) {
  const getHeader = (name) => {
    const val = headers[name.toLowerCase()] || headers[name];
    if (Array.isArray(val)) return val[0] || "";
    return typeof val === "string" ? val : "";
  };
  const supabase = getServiceClient2();
  if (!supabase) {
    return { statusCode: 500, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: "NOT_CONFIGURED", message: "Server is missing SUPABASE_SECRET_KEY." } };
  }
  const token = getHeader("authorization").replace(/^Bearer\s+/i, "");
  if (!token) {
    return { statusCode: 401, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: "UNAUTHORIZED", message: "Missing bearer token." } };
  }
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return { statusCode: 401, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: "UNAUTHORIZED", message: "Invalid or expired session." } };
  }
  const client = getAnthropicClient();
  if (!client) {
    return { statusCode: 500, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: "NOT_CONFIGURED", message: "Server is missing ANTHROPIC_API_KEY." } };
  }
  let payload;
  try {
    payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
  } catch {
    return { statusCode: 400, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: "INVALID_PAYLOAD", message: "Malformed JSON payload." } };
  }
  const parsed = ChatRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return { statusCode: 400, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: "INVALID_PAYLOAD", message: parsed.error.issues[0]?.message || "Invalid input." } };
  }
  const { message, history, fleet } = parsed.data;
  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "medium" },
      system: buildSystemPrompt(fleet),
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.text })),
        { role: "user", content: message }
      ]
    });
    const textBlock = response.content.find((block) => block.type === "text");
    const text = textBlock?.text?.trim();
    if (!text) {
      return { statusCode: 502, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: "EMPTY_RESPONSE", message: "The assistant returned no text." } };
    }
    return { statusCode: 200, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: true, text } };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return { statusCode: 429, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: "RATE_LIMITED", message: "The assistant is busy \u2014 try again shortly." } };
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return { statusCode: 500, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: "AUTH_FAILED", message: "Server has an invalid ANTHROPIC_API_KEY." } };
    }
    if (err instanceof Anthropic.APIError) {
      return { statusCode: 502, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: "UPSTREAM_ERROR", message: err.message } };
    }
    return { statusCode: 500, headers: AI_ASSISTANT_CORS_HEADERS, body: { ok: false, error: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "Unknown error." } };
  }
}

// vite.config.ts
var loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) process.env[key] = rest.join("=").replace(/^['"]|['"]$/g, "");
  }
};
loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));
function iotApiPlugin() {
  return {
    name: "klinghana-iot-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url === "/api/health" && (req.method === "GET" || req.method === "OPTIONS")) {
          if (req.method === "OPTIONS") {
            res.writeHead(200, {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS"
            });
            res.end();
            return;
          }
          const result = await handleHealthCheck();
          res.writeHead(result.statusCode, result.headers);
          res.end(JSON.stringify(result.body));
          return;
        }
        if (url === "/api/iot/telemetry") {
          if (req.method === "OPTIONS") {
            res.writeHead(200, {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "x-device-id, x-device-key, content-type, apikey",
              "Access-Control-Allow-Methods": "POST, OPTIONS"
            });
            res.end();
            return;
          }
          if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => {
              body += chunk;
            });
            req.on("end", async () => {
              const result = await handleTelemetryIngestion(req.headers, body);
              res.writeHead(result.statusCode, result.headers);
              res.end(JSON.stringify(result.body));
            });
            return;
          }
        }
        if (url === "/api/admin/create-team-member") {
          if (req.method === "OPTIONS") {
            res.writeHead(200, ADMIN_CORS_HEADERS);
            res.end();
            return;
          }
          if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => {
              body += chunk;
            });
            req.on("end", async () => {
              const result = await handleCreateTeamMember(req.headers, body);
              res.writeHead(result.statusCode, result.headers);
              res.end(JSON.stringify(result.body));
            });
            return;
          }
        }
        if (url === "/api/ai/assistant") {
          if (req.method === "OPTIONS") {
            res.writeHead(200, AI_ASSISTANT_CORS_HEADERS);
            res.end();
            return;
          }
          if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => {
              body += chunk;
            });
            req.on("end", async () => {
              const result = await handleAiAssistantChat(req.headers, body);
              res.writeHead(result.statusCode, result.headers);
              res.end(JSON.stringify(result.body));
            });
            return;
          }
        }
        next();
      });
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [react(), iotApiPlugin()],
  server: {
    port: 3e3,
    open: false
  },
  test: {
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic3JjL3NlcnZlci9pb3RIYW5kbGVyLnRzIiwgInNyYy9zaGFyZWQvdGVsZW1ldHJ5Q29udHJhY3QudHMiLCAic3JjL3NlcnZlci9kZXZpY2VDcmVkZW50aWFscy50cyIsICJzcmMvc2VydmVyL2FkbWluSGFuZGxlci50cyIsICJzcmMvc2VydmVyL2FpQXNzaXN0YW50SGFuZGxlci50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXHByb2plY3RzXFxcXEtsaW5HaGFuYVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxccHJvamVjdHNcXFxcS2xpbkdoYW5hXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9wcm9qZWN0cy9LbGluR2hhbmEvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBQbHVnaW4gfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuaW1wb3J0IHsgaGFuZGxlSGVhbHRoQ2hlY2ssIGhhbmRsZVRlbGVtZXRyeUluZ2VzdGlvbiB9IGZyb20gJy4vc3JjL3NlcnZlci9pb3RIYW5kbGVyLnRzJztcclxuaW1wb3J0IHsgaGFuZGxlQ3JlYXRlVGVhbU1lbWJlciwgQURNSU5fQ09SU19IRUFERVJTIH0gZnJvbSAnLi9zcmMvc2VydmVyL2FkbWluSGFuZGxlci50cyc7XHJcbmltcG9ydCB7IGhhbmRsZUFpQXNzaXN0YW50Q2hhdCwgQUlfQVNTSVNUQU5UX0NPUlNfSEVBREVSUyB9IGZyb20gJy4vc3JjL3NlcnZlci9haUFzc2lzdGFudEhhbmRsZXIudHMnO1xyXG5cclxuLy8gYGltcG9ydC5tZXRhLmVudmAgKHBvcHVsYXRlZCBmcm9tIC5lbnYubG9jYWwgZm9yIHRoZSBicm93c2VyIGJ1bmRsZSkgaXNcclxuLy8gc2VwYXJhdGUgZnJvbSB0aGlzIGNvbmZpZy9wbHVnaW4gZmlsZSdzIG93biBgcHJvY2Vzcy5lbnZgIFx1MjAxNCBWaXRlIGRvZXMgbm90XHJcbi8vIGxvYWQgLmVudiBmaWxlcyBpbnRvIHByb2Nlc3MuZW52IGZvciB5b3UuIFNlcnZlci1vbmx5IHZhcnMgbGlrZVxyXG4vLyBTVVBBQkFTRV9TRUNSRVRfS0VZICh1c2VkIGJ5IGFkbWluSGFuZGxlci50cykgbmVlZCB0aGlzIHRvIGJlIHJlYWRhYmxlXHJcbi8vIGR1cmluZyBgbnBtIHJ1biBkZXZgLiBOZXZlciBvdmVyd3JpdGVzIGFuIGFscmVhZHktc2V0IE9TIGVudiB2YXIuXHJcbmNvbnN0IGxvYWRFbnZGaWxlID0gKGZpbGVQYXRoOiBzdHJpbmcpID0+IHtcclxuICBpZiAoIWZzLmV4aXN0c1N5bmMoZmlsZVBhdGgpKSByZXR1cm47XHJcbiAgY29uc3QgbGluZXMgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jykuc3BsaXQoL1xccj9cXG4vKTtcclxuICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgIGNvbnN0IHRyaW1tZWQgPSBsaW5lLnRyaW0oKTtcclxuICAgIGlmICghdHJpbW1lZCB8fCB0cmltbWVkLnN0YXJ0c1dpdGgoJyMnKSB8fCAhdHJpbW1lZC5pbmNsdWRlcygnPScpKSBjb250aW51ZTtcclxuICAgIGNvbnN0IFtrZXksIC4uLnJlc3RdID0gdHJpbW1lZC5zcGxpdCgnPScpO1xyXG4gICAgaWYgKCFwcm9jZXNzLmVudltrZXldKSBwcm9jZXNzLmVudltrZXldID0gcmVzdC5qb2luKCc9JykucmVwbGFjZSgvXlsnXCJdfFsnXCJdJC9nLCAnJyk7XHJcbiAgfVxyXG59O1xyXG5cclxubG9hZEVudkZpbGUocGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICcuZW52LmxvY2FsJykpO1xyXG5sb2FkRW52RmlsZShwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJy5lbnYnKSk7XHJcblxyXG5mdW5jdGlvbiBpb3RBcGlQbHVnaW4oKTogUGx1Z2luIHtcclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogJ2tsaW5naGFuYS1pb3QtYXBpJyxcclxuICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcclxuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICBjb25zdCB1cmwgPSByZXEudXJsPy5zcGxpdCgnPycpWzBdO1xyXG5cclxuICAgICAgICBpZiAodXJsID09PSAnL2FwaS9oZWFsdGgnICYmIChyZXEubWV0aG9kID09PSAnR0VUJyB8fCByZXEubWV0aG9kID09PSAnT1BUSU9OUycpKSB7XHJcbiAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XHJcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7XHJcbiAgICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdHRVQsIE9QVElPTlMnLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmVzLmVuZCgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVIZWFsdGhDaGVjaygpO1xyXG4gICAgICAgICAgcmVzLndyaXRlSGVhZChyZXN1bHQuc3RhdHVzQ29kZSwgcmVzdWx0LmhlYWRlcnMpO1xyXG4gICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeShyZXN1bHQuYm9keSkpO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHVybCA9PT0gJy9hcGkvaW90L3RlbGVtZXRyeScpIHtcclxuICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcclxuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDAsIHtcclxuICAgICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ3gtZGV2aWNlLWlkLCB4LWRldmljZS1rZXksIGNvbnRlbnQtdHlwZSwgYXBpa2V5JyxcclxuICAgICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdQT1NULCBPUFRJT05TJyxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcpIHtcclxuICAgICAgICAgICAgbGV0IGJvZHkgPSAnJztcclxuICAgICAgICAgICAgcmVxLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7IGJvZHkgKz0gY2h1bms7IH0pO1xyXG4gICAgICAgICAgICByZXEub24oJ2VuZCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVUZWxlbWV0cnlJbmdlc3Rpb24ocmVxLmhlYWRlcnMgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPiwgYm9keSk7XHJcbiAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZChyZXN1bHQuc3RhdHVzQ29kZSwgcmVzdWx0LmhlYWRlcnMpO1xyXG4gICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkocmVzdWx0LmJvZHkpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh1cmwgPT09ICcvYXBpL2FkbWluL2NyZWF0ZS10ZWFtLW1lbWJlcicpIHtcclxuICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcclxuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDAsIEFETUlOX0NPUlNfSEVBREVSUyk7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcpIHtcclxuICAgICAgICAgICAgbGV0IGJvZHkgPSAnJztcclxuICAgICAgICAgICAgcmVxLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7IGJvZHkgKz0gY2h1bms7IH0pO1xyXG4gICAgICAgICAgICByZXEub24oJ2VuZCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVDcmVhdGVUZWFtTWVtYmVyKHJlcS5oZWFkZXJzIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4sIGJvZHkpO1xyXG4gICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQocmVzdWx0LnN0YXR1c0NvZGUsIHJlc3VsdC5oZWFkZXJzKTtcclxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHJlc3VsdC5ib2R5KSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodXJsID09PSAnL2FwaS9haS9hc3Npc3RhbnQnKSB7XHJcbiAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XHJcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCBBSV9BU1NJU1RBTlRfQ09SU19IRUFERVJTKTtcclxuICAgICAgICAgICAgcmVzLmVuZCgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xyXG4gICAgICAgICAgICBsZXQgYm9keSA9ICcnO1xyXG4gICAgICAgICAgICByZXEub24oJ2RhdGEnLCAoY2h1bmspID0+IHsgYm9keSArPSBjaHVuazsgfSk7XHJcbiAgICAgICAgICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZUFpQXNzaXN0YW50Q2hhdChyZXEuaGVhZGVycyBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LCBib2R5KTtcclxuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKHJlc3VsdC5zdGF0dXNDb2RlLCByZXN1bHQuaGVhZGVycyk7XHJcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeShyZXN1bHQuYm9keSkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbmV4dCgpO1xyXG4gICAgICB9KTtcclxuICAgIH0sXHJcbiAgfTtcclxufVxyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbcmVhY3QoKSwgaW90QXBpUGx1Z2luKCldLFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogMzAwMCxcclxuICAgIG9wZW46IGZhbHNlLFxyXG4gIH0sXHJcbiAgdGVzdDoge1xyXG4gICAgaW5jbHVkZTogWyd0ZXN0cy8qKi8qLnt0ZXN0LHNwZWN9Lnt0cyx0c3h9J10sXHJcbiAgICBleGNsdWRlOiBbJ2UyZS8qKicsICdub2RlX21vZHVsZXMvKionXSxcclxuICB9LFxyXG59KTtcclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxwcm9qZWN0c1xcXFxLbGluR2hhbmFcXFxcc3JjXFxcXHNlcnZlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxccHJvamVjdHNcXFxcS2xpbkdoYW5hXFxcXHNyY1xcXFxzZXJ2ZXJcXFxcaW90SGFuZGxlci50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovcHJvamVjdHMvS2xpbkdoYW5hL3NyYy9zZXJ2ZXIvaW90SGFuZGxlci50c1wiO2ltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyc7XHJcbmltcG9ydCB7XHJcbiAgY2FsY3VsYXRlSGFyZHdhcmVGaWxsU3RhdHVzLFxyXG4gIGlzRHVwbGljYXRlVGVsZW1ldHJ5LFxyXG4gIGlzU3RhbGVTZXF1ZW5jZSxcclxuICBub3JtYWxpemVEZXZpY2VJZCxcclxuICBUZWxlbWV0cnlQYXlsb2FkU2NoZW1hLFxyXG59IGZyb20gJy4uL3NoYXJlZC90ZWxlbWV0cnlDb250cmFjdCc7XHJcbmltcG9ydCB7IHZlcmlmeURldmljZUNyZWRlbnRpYWwgfSBmcm9tICcuL2RldmljZUNyZWRlbnRpYWxzJztcclxuXHJcbnR5cGUgU3VwYWJhc2VFcnJvciA9IHsgY29kZT86IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nIH07XHJcbnR5cGUgU3VwYWJhc2VSZXN1bHQ8VCA9IHVua25vd24+ID0geyBkYXRhOiBUIHwgbnVsbDsgZXJyb3I6IFN1cGFiYXNlRXJyb3IgfCBudWxsIH07XHJcblxyXG50eXBlIFN1cGFiYXNlUXVlcnk8VCA9IHVua25vd24+ID0gUHJvbWlzZUxpa2U8U3VwYWJhc2VSZXN1bHQ8VD4+ICYge1xyXG4gIHNlbGVjdDogKGNvbHVtbnM/OiBzdHJpbmcpID0+IFN1cGFiYXNlUXVlcnk8VD47XHJcbiAgaW5zZXJ0OiAodmFsdWVzOiB1bmtub3duKSA9PiBTdXBhYmFzZVF1ZXJ5PFQ+O1xyXG4gIHVwZGF0ZTogKHZhbHVlczogdW5rbm93bikgPT4gU3VwYWJhc2VRdWVyeTxUPjtcclxuICB1cHNlcnQ6ICh2YWx1ZXM6IHVua25vd24sIG9wdGlvbnM/OiB1bmtub3duKSA9PiBTdXBhYmFzZVF1ZXJ5PFQ+O1xyXG4gIGVxOiAoY29sdW1uOiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKSA9PiBTdXBhYmFzZVF1ZXJ5PFQ+O1xyXG4gIG5lcTogKGNvbHVtbjogc3RyaW5nLCB2YWx1ZTogdW5rbm93bikgPT4gU3VwYWJhc2VRdWVyeTxUPjtcclxuICBtYXliZVNpbmdsZTogKCkgPT4gUHJvbWlzZTxTdXBhYmFzZVJlc3VsdDxUPj47XHJcbiAgbGltaXQ6IChjb3VudDogbnVtYmVyKSA9PiBTdXBhYmFzZVF1ZXJ5PFQ+O1xyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgU3VwYWJhc2VMaWtlID0ge1xyXG4gIGZyb206ICh0YWJsZTogc3RyaW5nKSA9PiBhbnk7XHJcbn07XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElvdEhhbmRsZXJEZXBzIHtcclxuICBzdXBhYmFzZT86IFN1cGFiYXNlTGlrZSB8IG51bGw7XHJcbn1cclxuXHJcbmNvbnN0IHNlZW5NZXNzYWdlSWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcbmNvbnN0IGxhc3RTZXF1ZW5jZUJ5RGV2aWNlID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcclxuXHJcbmNvbnN0IGdldFN1cGFiYXNlU2VydmVyQ2xpZW50ID0gKCkgPT4ge1xyXG4gIGNvbnN0IHVybCA9IHByb2Nlc3MuZW52LlNVUEFCQVNFX1VSTCB8fCBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX1VSTDtcclxuICBjb25zdCBrZXkgPSBwcm9jZXNzLmVudi5TVVBBQkFTRV9TRUNSRVRfS0VZIHx8IHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfUFVCTElTSEFCTEVfS0VZIHx8IHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfQU5PTl9LRVk7XHJcbiAgaWYgKCF1cmwgfHwgIWtleSkgcmV0dXJuIG51bGw7XHJcbiAgcmV0dXJuIGNyZWF0ZUNsaWVudCh1cmwsIGtleSwge1xyXG4gICAgYXV0aDogeyBwZXJzaXN0U2Vzc2lvbjogZmFsc2UgfSxcclxuICB9KTtcclxufTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSW5nZXN0aW9uUmVzdWx0IHtcclxuICBzdGF0dXNDb2RlOiBudW1iZXI7XHJcbiAgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcclxuICBib2R5OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcclxufVxyXG5cclxuY29uc3QgbWFrZUNvcnNIZWFkZXJzID0gKCk6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPT4gKHtcclxuICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAneC1kZXZpY2UtaWQsIHgtZGV2aWNlLWtleSwgY29udGVudC10eXBlLCBhcGlrZXksIGF1dGhvcml6YXRpb24nLFxyXG4gICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ0dFVCwgUE9TVCwgT1BUSU9OUycsXHJcbn0pO1xyXG5cclxuY29uc3QgaXNOb1Jvd3MgPSAoZXJyb3I6IFN1cGFiYXNlRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkKTogYm9vbGVhbiA9PiBlcnJvcj8uY29kZSA9PT0gJ1BHUlNUMTE2JztcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVUZWxlbWV0cnlJbmdlc3Rpb24oXHJcbiAgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgc3RyaW5nW10gfCB1bmRlZmluZWQ+LFxyXG4gIHJhd0JvZHk6IHN0cmluZyB8IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxyXG4gIGRlcHM6IElvdEhhbmRsZXJEZXBzID0ge31cclxuKTogUHJvbWlzZTxJbmdlc3Rpb25SZXN1bHQ+IHtcclxuICBjb25zdCBjb3JzSGVhZGVycyA9IG1ha2VDb3JzSGVhZGVycygpO1xyXG5cclxuICBjb25zdCBnZXRIZWFkZXIgPSAobmFtZTogc3RyaW5nKTogc3RyaW5nID0+IHtcclxuICAgIGNvbnN0IHZhbCA9IGhlYWRlcnNbbmFtZS50b0xvd2VyQ2FzZSgpXSB8fCBoZWFkZXJzW25hbWVdO1xyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkgcmV0dXJuIHZhbFswXSB8fCAnJztcclxuICAgIHJldHVybiB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyA/IHZhbCA6ICcnO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IGRldmljZUlkID0gbm9ybWFsaXplRGV2aWNlSWQoZ2V0SGVhZGVyKCd4LWRldmljZS1pZCcpKTtcclxuICBjb25zdCBkZXZpY2VLZXkgPSBnZXRIZWFkZXIoJ3gtZGV2aWNlLWtleScpO1xyXG5cclxuICBpZiAoIWRldmljZUlkIHx8ICFkZXZpY2VLZXkpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgIGJvZHk6IHsgb2s6IGZhbHNlLCBlcnJvcjogJ0lOVkFMSURfREVWSUNFX0NSRURFTlRJQUwnLCBtZXNzYWdlOiAnTWlzc2luZyBYLURldmljZS1JZCBvciBYLURldmljZS1LZXkgaGVhZGVycy4nIH0sXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgaWYgKCF2ZXJpZnlEZXZpY2VDcmVkZW50aWFsKGRldmljZUlkLCBkZXZpY2VLZXkpKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA0MDEsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdJTlZBTElEX0RFVklDRV9DUkVERU5USUFMJywgbWVzc2FnZTogJ0RldmljZSBhdXRoZW50aWNhdGlvbiBmYWlsZWQuJyB9LFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGxldCBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcclxuICB0cnkge1xyXG4gICAgcGF5bG9hZCA9IHR5cGVvZiByYXdCb2R5ID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2UocmF3Qm9keSkgOiByYXdCb2R5O1xyXG4gIH0gY2F0Y2gge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgYm9keTogeyBvazogZmFsc2UsIGVycm9yOiAnSU5WQUxJRF9QQVlMT0FEJywgbWVzc2FnZTogJ01hbGZvcm1lZCBKU09OIHBheWxvYWQuJyB9LFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGlmIChwYXlsb2FkLmRldmljZUlkICYmIG5vcm1hbGl6ZURldmljZUlkKFN0cmluZyhwYXlsb2FkLmRldmljZUlkKSkgIT09IGRldmljZUlkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA0MDMsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdERVZJQ0VfTUlTTUFUQ0gnLCBtZXNzYWdlOiAnSGVhZGVyIGRldmljZUlkIGRvZXMgbm90IG1hdGNoIGJvZHkgZGV2aWNlSWQuJyB9LFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHBhcnNlUmVzdWx0ID0gVGVsZW1ldHJ5UGF5bG9hZFNjaGVtYS5zYWZlUGFyc2UocGF5bG9hZCk7XHJcbiAgaWYgKCFwYXJzZVJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdJTlZBTElEX1BBWUxPQUQnLCBtZXNzYWdlOiAnVmFsaWRhdGlvbiBmYWlsZWQuJywgZGV0YWlsczogcGFyc2VSZXN1bHQuZXJyb3IuaXNzdWVzIH0sXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgY29uc3QgdmFsaWREYXRhID0gcGFyc2VSZXN1bHQuZGF0YTtcclxuICBjb25zdCBzZXF1ZW5jZU51bSA9IHZhbGlkRGF0YS5zZXF1ZW5jZSA/PyAxO1xyXG4gIGNvbnN0IG1lc3NhZ2VJZCA9IHZhbGlkRGF0YS5tZXNzYWdlSWQgfHwgYCR7ZGV2aWNlSWR9LSR7c2VxdWVuY2VOdW19LSR7RGF0ZS5ub3coKX1gO1xyXG5cclxuICAvLyBEZWR1cGxpY2F0aW9uIGNoZWNrXHJcbiAgaWYgKGlzRHVwbGljYXRlVGVsZW1ldHJ5KHNlZW5NZXNzYWdlSWRzLCBkZXZpY2VJZCwgbWVzc2FnZUlkKSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNDA5LFxyXG4gICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgYm9keTogeyBvazogZmFsc2UsIGVycm9yOiAnRFVQTElDQVRFX01FU1NBR0UnLCBtZXNzYWdlOiAnVGVsZW1ldHJ5IG1lc3NhZ2VJZCB3YXMgYWxyZWFkeSBhY2NlcHRlZC4nIH0sXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLy8gU2VxdWVuY2UgY2hlY2tcclxuICBpZiAoaXNTdGFsZVNlcXVlbmNlKGxhc3RTZXF1ZW5jZUJ5RGV2aWNlLCBkZXZpY2VJZCwgc2VxdWVuY2VOdW0pKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA0MDksXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdTVEFMRV9TRVFVRU5DRScsIG1lc3NhZ2U6ICdUZWxlbWV0cnkgc2VxdWVuY2UgaXMgbm90IG5ld2VyIHRoYW4gdGhlIGxhc3QgYWNjZXB0ZWQgcGFja2V0LicgfSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBjb25zdCBldmFsdWF0ZWRTdGF0dXMgPSBjYWxjdWxhdGVIYXJkd2FyZUZpbGxTdGF0dXModmFsaWREYXRhLmZpbGxQZXJjZW50YWdlKTtcclxuICBjb25zdCBub3dJc28gPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgY29uc3QgcmF3RGlzdCA9IHZhbGlkRGF0YS5yYXdEaXN0YW5jZUNtID8/IHZhbGlkRGF0YS5kaXN0YW5jZUNtO1xyXG4gIGNvbnN0IGhhc0dwc0ZpeCA9IEJvb2xlYW4oXHJcbiAgICB2YWxpZERhdGEuZ3BzRml4ICYmXHJcbiAgICB0eXBlb2YgdmFsaWREYXRhLmxhdGl0dWRlID09PSAnbnVtYmVyJyAmJlxyXG4gICAgdHlwZW9mIHZhbGlkRGF0YS5sb25naXR1ZGUgPT09ICdudW1iZXInICYmXHJcbiAgICBOdW1iZXIuaXNGaW5pdGUodmFsaWREYXRhLmxhdGl0dWRlKSAmJlxyXG4gICAgTnVtYmVyLmlzRmluaXRlKHZhbGlkRGF0YS5sb25naXR1ZGUpICYmXHJcbiAgICB2YWxpZERhdGEubGF0aXR1ZGUgIT09IDAgJiZcclxuICAgIHZhbGlkRGF0YS5sb25naXR1ZGUgIT09IDBcclxuICApO1xyXG5cclxuICBjb25zdCBzdXBhYmFzZSA9IGRlcHMuc3VwYWJhc2UgIT09IHVuZGVmaW5lZCA/IGRlcHMuc3VwYWJhc2UgOiBnZXRTdXBhYmFzZVNlcnZlckNsaWVudCgpO1xyXG5cclxuICBpZiAoc3VwYWJhc2UpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGJpbkxvb2t1cCA9IChhd2FpdCBzdXBhYmFzZVxyXG4gICAgICAgIC5mcm9tKCdiaW5zJylcclxuICAgICAgICAuc2VsZWN0KCdpZCwgbmFtZSwgbGF0aXR1ZGUsIGxvbmdpdHVkZScpXHJcbiAgICAgICAgLmVxKCdjb2RlJywgZGV2aWNlSWQpXHJcbiAgICAgICAgLm1heWJlU2luZ2xlKCkpIGFzIFN1cGFiYXNlUmVzdWx0PHsgaWQ6IHN0cmluZzsgbmFtZTogc3RyaW5nOyBsYXRpdHVkZT86IG51bWJlciB8IG51bGw7IGxvbmdpdHVkZT86IG51bWJlciB8IG51bGwgfT47XHJcblxyXG4gICAgICBpZiAoYmluTG9va3VwPy5kYXRhKSB7XHJcbiAgICAgICAgY29uc3QgYmluUmVjb3JkID0gYmluTG9va3VwLmRhdGE7XHJcbiAgICAgICAgY29uc3QgZmluYWxMYXQgPSBoYXNHcHNGaXggPyB2YWxpZERhdGEubGF0aXR1ZGUgOiAoYmluUmVjb3JkLmxhdGl0dWRlID8/IG51bGwpO1xyXG4gICAgICAgIGNvbnN0IGZpbmFsTG5nID0gaGFzR3BzRml4ID8gdmFsaWREYXRhLmxvbmdpdHVkZSA6IChiaW5SZWNvcmQubG9uZ2l0dWRlID8/IG51bGwpO1xyXG5cclxuICAgICAgICBjb25zdCBjb21tb25Sb3cgPSB7XHJcbiAgICAgICAgICBiaW5faWQ6IGJpblJlY29yZC5pZCxcclxuICAgICAgICAgIGRldmljZV9pZDogZGV2aWNlSWQsXHJcbiAgICAgICAgICBmaWxsX3BlcmNlbnRhZ2U6IHZhbGlkRGF0YS5maWxsUGVyY2VudGFnZSxcclxuICAgICAgICAgIGRpc3RhbmNlX2NtOiB2YWxpZERhdGEuZGlzdGFuY2VDbSxcclxuICAgICAgICAgIHJhd19kaXN0YW5jZV9jbTogcmF3RGlzdCxcclxuICAgICAgICAgIGZpbGxfc3RhdHVzOiBldmFsdWF0ZWRTdGF0dXMsXHJcbiAgICAgICAgICBsaWRfc3RhdGU6IHZhbGlkRGF0YS5saWRTdGF0ZSB8fCAnQ0xPU0VEJyxcclxuICAgICAgICAgIGJhdHRlcnlfcGVyY2VudGFnZTogdmFsaWREYXRhLmJhdHRlcnlQZXJjZW50YWdlID8/IDk1LFxyXG4gICAgICAgICAgdGVtcGVyYXR1cmVfYzogdmFsaWREYXRhLnRlbXBlcmF0dXJlQyA/PyAyOCxcclxuICAgICAgICAgIHdpZmlfcnNzaTogdmFsaWREYXRhLndpZmlSc3NpID8/IG51bGwsXHJcbiAgICAgICAgICBsYXRpdHVkZTogZmluYWxMYXQsXHJcbiAgICAgICAgICBsb25naXR1ZGU6IGZpbmFsTG5nLFxyXG4gICAgICAgICAgZ3BzX2FjY3VyYWN5X206IGhhc0dwc0ZpeCA/IHZhbGlkRGF0YS5ncHNBY2N1cmFjeU0gOiBudWxsLFxyXG4gICAgICAgICAgZ3BzX2ZpeDogaGFzR3BzRml4LFxyXG4gICAgICAgICAgc2F0ZWxsaXRlczogdmFsaWREYXRhLnNhdGVsbGl0ZXMgPz8gMCxcclxuICAgICAgICAgIGxvY2F0aW9uX3NvdXJjZTogaGFzR3BzRml4ID8gJ0dQUycgOiAoYmluUmVjb3JkLmxhdGl0dWRlICE9IG51bGwgPyAnQkVOQ0hfUkVHSVNURVJFRCcgOiAnVU5LTk9XTicpLFxyXG4gICAgICAgICAgZmlybXdhcmVfdmVyc2lvbjogdmFsaWREYXRhLmZpcm13YXJlVmVyc2lvbiB8fCAnMS4wLjAtcHJvZCcsXHJcbiAgICAgICAgICBtZXNzYWdlX2lkOiBtZXNzYWdlSWQsXHJcbiAgICAgICAgICBtZXNzYWdlX3NlcXVlbmNlOiBzZXF1ZW5jZU51bSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zdCB7IGVycm9yOiB0ZWxlbWV0cnlFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuZnJvbSgndGVsZW1ldHJ5JykuaW5zZXJ0KHtcclxuICAgICAgICAgIC4uLmNvbW1vblJvdyxcclxuICAgICAgICAgIHJlY29yZGVkX2F0OiBub3dJc28sXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgaWYgKHRlbGVtZXRyeUVycm9yKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVEVMRU1FVFJZXSB0ZWxlbWV0cnkgaW5zZXJ0IGVycm9yOicsIHRlbGVtZXRyeUVycm9yKTtcclxuICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgICAgICAgIGJvZHk6IHtcclxuICAgICAgICAgICAgICBvazogZmFsc2UsXHJcbiAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgYWNjZXB0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgIGVycm9yOiAnREFUQUJBU0VfRVJST1InLFxyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IGBGYWlsZWQgdG8gaW5zZXJ0IHRlbGVtZXRyeTogJHt0ZWxlbWV0cnlFcnJvci5tZXNzYWdlfWAsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgeyBlcnJvcjogc3RhdGVFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuZnJvbSgnYmluX2N1cnJlbnRfc3RhdGUnKS51cHNlcnQoe1xyXG4gICAgICAgICAgLi4uY29tbW9uUm93LFxyXG4gICAgICAgICAgYmluX3N0YXR1czogZXZhbHVhdGVkU3RhdHVzLFxyXG4gICAgICAgICAgY29ubmVjdGlvbl9zdGF0dXM6ICdPTkxJTkUnLFxyXG4gICAgICAgICAgbGFzdF9zZWVuX2F0OiBub3dJc28sXHJcbiAgICAgICAgICB0ZWxlbWV0cnlfcmVjZWl2ZWRfYXQ6IG5vd0lzbyxcclxuICAgICAgICAgIHVwZGF0ZWRfYXQ6IG5vd0lzbyxcclxuICAgICAgICAgIGxhc3RfbWVzc2FnZV9zZXF1ZW5jZTogc2VxdWVuY2VOdW0sXHJcbiAgICAgICAgICBncHNfdXBkYXRlZF9hdDogaGFzR3BzRml4ID8gKHZhbGlkRGF0YS5ncHNVcGRhdGVkQXQgfHwgbm93SXNvKSA6IG51bGwsXHJcbiAgICAgICAgfSwgeyBvbkNvbmZsaWN0OiAnYmluX2lkJyB9KTtcclxuICAgICAgICBpZiAoc3RhdGVFcnJvcikge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcignW1RFTEVNRVRSWV0gYmluX2N1cnJlbnRfc3RhdGUgdXBzZXJ0IGVycm9yOicsIHN0YXRlRXJyb3IpO1xyXG4gICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICAgICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgICAgICAgYm9keToge1xyXG4gICAgICAgICAgICAgIG9rOiBmYWxzZSxcclxuICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICBhY2NlcHRlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgZXJyb3I6ICdEQVRBQkFTRV9FUlJPUicsXHJcbiAgICAgICAgICAgICAgbWVzc2FnZTogYEZhaWxlZCB0byBwZXJzaXN0IGJpbiBjdXJyZW50IHN0YXRlOiAke3N0YXRlRXJyb3IubWVzc2FnZX1gLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChoYXNHcHNGaXgpIHtcclxuICAgICAgICAgIGNvbnN0IHsgZXJyb3I6IGJpblVwZGF0ZUVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZS5mcm9tKCdiaW5zJykudXBkYXRlKHtcclxuICAgICAgICAgICAgbGF0aXR1ZGU6IGZpbmFsTGF0LFxyXG4gICAgICAgICAgICBsb25naXR1ZGU6IGZpbmFsTG5nLFxyXG4gICAgICAgICAgICB1cGRhdGVkX2F0OiBub3dJc28sXHJcbiAgICAgICAgICB9KS5lcSgnaWQnLCBiaW5SZWNvcmQuaWQpO1xyXG4gICAgICAgICAgaWYgKGJpblVwZGF0ZUVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignW1RFTEVNRVRSWV0gYmlucyBjb29yZGluYXRlIHVwZGF0ZSB3YXJuaW5nOicsIGJpblVwZGF0ZUVycm9yKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHsgZXJyb3I6IGRldmljZUVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZS5mcm9tKCdkZXZpY2VzJykudXBzZXJ0KHtcclxuICAgICAgICAgIGRldmljZV9pZDogZGV2aWNlSWQsXHJcbiAgICAgICAgICBiaW5faWQ6IGJpblJlY29yZC5pZCxcclxuICAgICAgICAgIGZpcm13YXJlX3ZlcnNpb246IHZhbGlkRGF0YS5maXJtd2FyZVZlcnNpb24gfHwgJzEuMC4wLXByb2QnLFxyXG4gICAgICAgICAgaXNfYWN0aXZlOiB0cnVlLFxyXG4gICAgICAgICAgbGFzdF9oZWFydGJlYXQ6IG5vd0lzbyxcclxuICAgICAgICB9LCB7IG9uQ29uZmxpY3Q6ICdkZXZpY2VfaWQnIH0pO1xyXG4gICAgICAgIGlmIChkZXZpY2VFcnJvcikge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcignW1RFTEVNRVRSWV0gZGV2aWNlIGhlYXJ0YmVhdCB1cHNlcnQgZXJyb3I6JywgZGV2aWNlRXJyb3IpO1xyXG4gICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICAgICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgICAgICAgYm9keToge1xyXG4gICAgICAgICAgICAgIG9rOiBmYWxzZSxcclxuICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICBhY2NlcHRlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgZXJyb3I6ICdEQVRBQkFTRV9FUlJPUicsXHJcbiAgICAgICAgICAgICAgbWVzc2FnZTogYEZhaWxlZCB0byB1cGRhdGUgZGV2aWNlIGhlYXJ0YmVhdDogJHtkZXZpY2VFcnJvci5tZXNzYWdlfWAsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQWxlcnQgRXZhbHVhdGlvblxyXG4gICAgICAgIGNvbnN0IGZpbGxBbGVydFR5cGVzID0gWydORUFSX0ZVTEwnLCAnRlVMTCcsICdPVkVSRkxPVyddO1xyXG4gICAgICAgIGlmIChmaWxsQWxlcnRUeXBlcy5pbmNsdWRlcyhldmFsdWF0ZWRTdGF0dXMpKSB7XHJcbiAgICAgICAgICBhd2FpdCBzdXBhYmFzZVxyXG4gICAgICAgICAgICAuZnJvbSgnYWxlcnRzJylcclxuICAgICAgICAgICAgLnVwZGF0ZSh7IHN0YXR1czogJ1JFU09MVkVEJywgcmVzb2x2ZWRfYXQ6IG5vd0lzbywgdXBkYXRlZF9hdDogbm93SXNvIH0pXHJcbiAgICAgICAgICAgIC5lcSgnYmluX2lkJywgYmluUmVjb3JkLmlkKVxyXG4gICAgICAgICAgICAubmVxKCdhbGVydF90eXBlJywgZXZhbHVhdGVkU3RhdHVzKVxyXG4gICAgICAgICAgICAuZXEoJ3N0YXR1cycsICdPUEVOJyk7XHJcblxyXG4gICAgICAgICAgY29uc3QgZXhpc3RpbmdBbGVydCA9IChhd2FpdCBzdXBhYmFzZVxyXG4gICAgICAgICAgICAuZnJvbSgnYWxlcnRzJylcclxuICAgICAgICAgICAgLnNlbGVjdCgnaWQnKVxyXG4gICAgICAgICAgICAuZXEoJ2Jpbl9pZCcsIGJpblJlY29yZC5pZClcclxuICAgICAgICAgICAgLmVxKCdhbGVydF90eXBlJywgZXZhbHVhdGVkU3RhdHVzKVxyXG4gICAgICAgICAgICAuZXEoJ3N0YXR1cycsICdPUEVOJylcclxuICAgICAgICAgICAgLm1heWJlU2luZ2xlKCkpIGFzIFN1cGFiYXNlUmVzdWx0PHsgaWQ6IHN0cmluZyB9PjtcclxuXHJcbiAgICAgICAgICBpZiAoIWV4aXN0aW5nQWxlcnQ/LmRhdGEpIHtcclxuICAgICAgICAgICAgYXdhaXQgc3VwYWJhc2UuZnJvbSgnYWxlcnRzJykuaW5zZXJ0KHtcclxuICAgICAgICAgICAgICBiaW5faWQ6IGJpblJlY29yZC5pZCxcclxuICAgICAgICAgICAgICBhbGVydF90eXBlOiBldmFsdWF0ZWRTdGF0dXMsXHJcbiAgICAgICAgICAgICAgc2V2ZXJpdHk6IGV2YWx1YXRlZFN0YXR1cyA9PT0gJ05FQVJfRlVMTCcgPyAnV0FSTklORycgOiAnQ1JJVElDQUwnLFxyXG4gICAgICAgICAgICAgIHN0YXR1czogJ09QRU4nLFxyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IGAke2V2YWx1YXRlZFN0YXR1cy5yZXBsYWNlKCdfJywgJyAnKX0gZmlsbCBzdGF0ZSBhdCAke3ZhbGlkRGF0YS5maWxsUGVyY2VudGFnZS50b0ZpeGVkKDEpfSUgKCR7YmluUmVjb3JkLm5hbWV9KWAsXHJcbiAgICAgICAgICAgICAgY3JlYXRlZF9hdDogbm93SXNvLFxyXG4gICAgICAgICAgICAgIHVwZGF0ZWRfYXQ6IG5vd0lzbyxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGF3YWl0IHN1cGFiYXNlXHJcbiAgICAgICAgICAgIC5mcm9tKCdhbGVydHMnKVxyXG4gICAgICAgICAgICAudXBkYXRlKHsgc3RhdHVzOiAnUkVTT0xWRUQnLCByZXNvbHZlZF9hdDogbm93SXNvLCB1cGRhdGVkX2F0OiBub3dJc28gfSlcclxuICAgICAgICAgICAgLmVxKCdiaW5faWQnLCBiaW5SZWNvcmQuaWQpXHJcbiAgICAgICAgICAgIC5lcSgnc3RhdHVzJywgJ09QRU4nKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ1tJT1RfSEFORExFUl0gU3VwYWJhc2UgcGVyc2lzdGVuY2UgZXJyb3IgKG5vbi1mYXRhbCk6JywgZXJyKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgIGJvZHk6IHtcclxuICAgICAgb2s6IHRydWUsXHJcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgIGFjY2VwdGVkOiB0cnVlLFxyXG4gICAgICBkZXZpY2VJZCxcclxuICAgICAgc2VydmVyVGltZXN0YW1wOiBub3dJc28sXHJcbiAgICAgIHNlcXVlbmNlOiBzZXF1ZW5jZU51bSxcclxuICAgICAgZmlsbFBlcmNlbnRhZ2U6IHZhbGlkRGF0YS5maWxsUGVyY2VudGFnZSxcclxuICAgICAgZGlzdGFuY2VDbTogdmFsaWREYXRhLmRpc3RhbmNlQ20sXHJcbiAgICAgIHJhd0Rpc3RhbmNlQ206IHJhd0Rpc3QsXHJcbiAgICAgIGdwc0ZpeDogaGFzR3BzRml4LFxyXG4gICAgICBldmFsdWF0ZWRTdGF0dXMsXHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVIZWFsdGhDaGVjaygpOiBQcm9taXNlPEluZ2VzdGlvblJlc3VsdD4ge1xyXG4gIGNvbnN0IGNvcnNIZWFkZXJzID0gbWFrZUNvcnNIZWFkZXJzKCk7XHJcbiAgY29uc3Qgc3VwYWJhc2UgPSBnZXRTdXBhYmFzZVNlcnZlckNsaWVudCgpO1xyXG4gIGxldCBkYlN0YXR1cyA9ICdkaXNjb25uZWN0ZWQnO1xyXG5cclxuICBpZiAoc3VwYWJhc2UpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmZyb20oJ2JpbnMnKS5zZWxlY3QoJ2lkJykubGltaXQoMSk7XHJcbiAgICAgIGRiU3RhdHVzID0gIWVycm9yID8gJ2Nvbm5lY3RlZCcgOiAnZGlzY29ubmVjdGVkJztcclxuICAgIH0gY2F0Y2gge1xyXG4gICAgICBkYlN0YXR1cyA9ICdkaXNjb25uZWN0ZWQnO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgYm9keToge1xyXG4gICAgICBzdGF0dXM6ICdvaycsXHJcbiAgICAgIGRhdGFiYXNlOiBkYlN0YXR1cyxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxwcm9qZWN0c1xcXFxLbGluR2hhbmFcXFxcc3JjXFxcXHNoYXJlZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxccHJvamVjdHNcXFxcS2xpbkdoYW5hXFxcXHNyY1xcXFxzaGFyZWRcXFxcdGVsZW1ldHJ5Q29udHJhY3QudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L3Byb2plY3RzL0tsaW5HaGFuYS9zcmMvc2hhcmVkL3RlbGVtZXRyeUNvbnRyYWN0LnRzXCI7aW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XHJcblxyXG5leHBvcnQgY29uc3QgSGFyZHdhcmVGaWxsU3RhdHVzU2NoZW1hID0gei5lbnVtKFtcclxuICAnTk9STUFMJyxcclxuICAnRklMTElORycsXHJcbiAgJ05FQVJfRlVMTCcsXHJcbiAgJ0ZVTEwnLFxyXG4gICdPVkVSRkxPVycsXHJcbiAgJ09GRkxJTkUnLFxyXG4gICdGQVVMVCcsXHJcbiAgJ1VOS05PV04nLFxyXG5dKTtcclxuXHJcbmV4cG9ydCB0eXBlIEhhcmR3YXJlRmlsbFN0YXR1cyA9IHouaW5mZXI8dHlwZW9mIEhhcmR3YXJlRmlsbFN0YXR1c1NjaGVtYT47XHJcblxyXG5leHBvcnQgY29uc3QgVGVsZW1ldHJ5UGF5bG9hZFNjaGVtYSA9IHoub2JqZWN0KHtcclxuICBzY2hlbWFWZXJzaW9uOiB6Lm51bWJlcigpLmludCgpLm1pbigxKS5kZWZhdWx0KDEpLFxyXG4gIG1lc3NhZ2VJZDogei5zdHJpbmcoKS5taW4oMSkubWF4KDEyOCkub3B0aW9uYWwoKSxcclxuICBzZXF1ZW5jZTogei5udW1iZXIoKS5pbnQoKS5taW4oMCkub3B0aW9uYWwoKSxcclxuICBkZXZpY2VJZDogei5zdHJpbmcoKS5taW4oMykubWF4KDY0KSxcclxuICB0aW1lc3RhbXA6IHoudW5pb24oW3ouc3RyaW5nKCksIHoubnVtYmVyKCldKSxcclxuICBmaWxsUGVyY2VudGFnZTogei5udW1iZXIoKS5taW4oMCkubWF4KDEyMCksXHJcbiAgZGlzdGFuY2VDbTogei5udW1iZXIoKS5taW4oMCkubWF4KDUwMCksXHJcbiAgcmF3RGlzdGFuY2VDbTogei5udW1iZXIoKS5taW4oMCkubWF4KDUwMCkub3B0aW9uYWwoKSxcclxuICBmaWxsU3RhdHVzOiBIYXJkd2FyZUZpbGxTdGF0dXNTY2hlbWEub3B0aW9uYWwoKSxcclxuICBiaW5TdGF0dXM6IEhhcmR3YXJlRmlsbFN0YXR1c1NjaGVtYS5vcHRpb25hbCgpLFxyXG4gIGxpZFN0YXRlOiB6LmVudW0oWydPUEVOJywgJ0NMT1NFRCddKS5kZWZhdWx0KCdDTE9TRUQnKSxcclxuICBsYXRpdHVkZTogei5udW1iZXIoKS5taW4oLTkwKS5tYXgoOTApLm51bGxhYmxlKCkub3B0aW9uYWwoKSxcclxuICBsb25naXR1ZGU6IHoubnVtYmVyKCkubWluKC0xODApLm1heCgxODApLm51bGxhYmxlKCkub3B0aW9uYWwoKSxcclxuICBncHNGaXg6IHouYm9vbGVhbigpLmRlZmF1bHQoZmFsc2UpLFxyXG4gIGdwc0FjY3VyYWN5TTogei5udW1iZXIoKS5taW4oMCkubWF4KDEwMDAwKS5udWxsYWJsZSgpLm9wdGlvbmFsKCkuZGVmYXVsdChudWxsKSxcclxuICBncHNVcGRhdGVkQXQ6IHouc3RyaW5nKCkubnVsbGFibGUoKS5vcHRpb25hbCgpLmRlZmF1bHQobnVsbCksXHJcbiAgc2F0ZWxsaXRlczogei5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDY0KS5udWxsYWJsZSgpLm9wdGlvbmFsKCkuZGVmYXVsdChudWxsKSxcclxuICB3aWZpUnNzaTogei5udW1iZXIoKS5pbnQoKS5taW4oLTEyMCkubWF4KDApLm51bGxhYmxlKCkub3B0aW9uYWwoKS5kZWZhdWx0KG51bGwpLFxyXG4gIGJhdHRlcnlQZXJjZW50YWdlOiB6Lm51bWJlcigpLmludCgpLm1pbigwKS5tYXgoMTAwKS5udWxsYWJsZSgpLm9wdGlvbmFsKCkuZGVmYXVsdChudWxsKSxcclxuICB0ZW1wZXJhdHVyZUM6IHoubnVtYmVyKCkubWluKC0yMCkubWF4KDg1KS5udWxsYWJsZSgpLm9wdGlvbmFsKCkuZGVmYXVsdChudWxsKSxcclxuICBmaXJtd2FyZVZlcnNpb246IHouc3RyaW5nKCkubWluKDEpLm1heCg2NCkuZGVmYXVsdCgndjEuMC4wLWVzcDMyLWNvcmUnKSxcclxufSkuc3VwZXJSZWZpbmUoKHBheWxvYWQsIGN0eCkgPT4ge1xyXG4gIGlmIChwYXlsb2FkLmdwc0ZpeCAmJiAodHlwZW9mIHBheWxvYWQubGF0aXR1ZGUgIT09ICdudW1iZXInIHx8IHR5cGVvZiBwYXlsb2FkLmxvbmdpdHVkZSAhPT0gJ251bWJlcicpKSB7XHJcbiAgICBjdHguYWRkSXNzdWUoe1xyXG4gICAgICBjb2RlOiAnY3VzdG9tJyxcclxuICAgICAgcGF0aDogWydncHNGaXgnXSxcclxuICAgICAgbWVzc2FnZTogJ2dwc0ZpeD10cnVlIHJlcXVpcmVzIG51bWVyaWMgbGF0aXR1ZGUgYW5kIGxvbmdpdHVkZS4nLFxyXG4gICAgfSk7XHJcbiAgfVxyXG59KTtcclxuXHJcbmV4cG9ydCB0eXBlIFRlbGVtZXRyeVBheWxvYWQgPSB6LmluZmVyPHR5cGVvZiBUZWxlbWV0cnlQYXlsb2FkU2NoZW1hPjtcclxuXHJcbmV4cG9ydCBjb25zdCBub3JtYWxpemVEZXZpY2VJZCA9IChkZXZpY2VJZDogc3RyaW5nKTogc3RyaW5nID0+IGRldmljZUlkLnRyaW0oKS50b1VwcGVyQ2FzZSgpO1xyXG5cclxuZXhwb3J0IGNvbnN0IGNhbGN1bGF0ZUhhcmR3YXJlRmlsbFN0YXR1cyA9IChmaWxsUGVyY2VudGFnZTogbnVtYmVyKTogSGFyZHdhcmVGaWxsU3RhdHVzID0+IHtcclxuICBpZiAoZmlsbFBlcmNlbnRhZ2UgPj0gMTAwKSByZXR1cm4gJ09WRVJGTE9XJztcclxuICBpZiAoZmlsbFBlcmNlbnRhZ2UgPj0gOTUpIHJldHVybiAnRlVMTCc7XHJcbiAgaWYgKGZpbGxQZXJjZW50YWdlID49IDg1KSByZXR1cm4gJ05FQVJfRlVMTCc7XHJcbiAgaWYgKGZpbGxQZXJjZW50YWdlID49IDcwKSByZXR1cm4gJ0ZJTExJTkcnO1xyXG4gIHJldHVybiAnTk9STUFMJztcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBjYWxjdWxhdGVVaVN0YXR1cyA9IChmaWxsUGVyY2VudGFnZTogbnVtYmVyKTogJ25vcm1hbCcgfCAnd2FybmluZycgfCAnY3JpdGljYWwnIHwgJ292ZXJmbG93JyB8ICdvZmZsaW5lJyA9PiB7XHJcbiAgaWYgKGZpbGxQZXJjZW50YWdlID49IDEwMCkgcmV0dXJuICdvdmVyZmxvdyc7XHJcbiAgaWYgKGZpbGxQZXJjZW50YWdlID49IDk1KSByZXR1cm4gJ2NyaXRpY2FsJztcclxuICBpZiAoZmlsbFBlcmNlbnRhZ2UgPj0gODUpIHJldHVybiAnd2FybmluZyc7XHJcbiAgcmV0dXJuICdub3JtYWwnO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHRlbGVtZXRyeVRpbWVzdGFtcFRvSXNvID0gKHRpbWVzdGFtcDogc3RyaW5nIHwgbnVtYmVyKTogc3RyaW5nID0+IHtcclxuICBpZiAodHlwZW9mIHRpbWVzdGFtcCA9PT0gJ251bWJlcicpIHJldHVybiBuZXcgRGF0ZSh0aW1lc3RhbXApLnRvSVNPU3RyaW5nKCk7XHJcbiAgY29uc3QgcGFyc2VkID0gbmV3IERhdGUodGltZXN0YW1wKTtcclxuICByZXR1cm4gTnVtYmVyLmlzTmFOKHBhcnNlZC5nZXRUaW1lKCkpID8gbmV3IERhdGUoKS50b0lTT1N0cmluZygpIDogcGFyc2VkLnRvSVNPU3RyaW5nKCk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgaXNEdXBsaWNhdGVUZWxlbWV0cnkgPSAoXHJcbiAgY2FjaGU6IFNldDxzdHJpbmc+LFxyXG4gIGRldmljZUlkOiBzdHJpbmcsXHJcbiAgbWVzc2FnZUlkPzogc3RyaW5nLFxyXG4pOiBib29sZWFuID0+IHtcclxuICBpZiAoIW1lc3NhZ2VJZCkgcmV0dXJuIGZhbHNlO1xyXG4gIGNvbnN0IGtleSA9IGAke25vcm1hbGl6ZURldmljZUlkKGRldmljZUlkKX06JHttZXNzYWdlSWR9YDtcclxuICBpZiAoY2FjaGUuaGFzKGtleSkpIHJldHVybiB0cnVlO1xyXG4gIGNhY2hlLmFkZChrZXkpO1xyXG4gIHJldHVybiBmYWxzZTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBpc1N0YWxlU2VxdWVuY2UgPSAoXHJcbiAgbGFzdFNlcXVlbmNlQnlEZXZpY2U6IE1hcDxzdHJpbmcsIG51bWJlcj4sXHJcbiAgZGV2aWNlSWQ6IHN0cmluZyxcclxuICBzZXF1ZW5jZT86IG51bWJlcixcclxuKTogYm9vbGVhbiA9PiB7XHJcbiAgaWYgKHNlcXVlbmNlID09PSB1bmRlZmluZWQpIHJldHVybiBmYWxzZTtcclxuICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplRGV2aWNlSWQoZGV2aWNlSWQpO1xyXG4gIGNvbnN0IGxhc3RTZXF1ZW5jZSA9IGxhc3RTZXF1ZW5jZUJ5RGV2aWNlLmdldChub3JtYWxpemVkKTtcclxuICBpZiAobGFzdFNlcXVlbmNlICE9PSB1bmRlZmluZWQgJiYgc2VxdWVuY2UgPD0gbGFzdFNlcXVlbmNlKSB7XHJcbiAgICBpZiAoc2VxdWVuY2UgPT09IDEgfHwgbGFzdFNlcXVlbmNlIC0gc2VxdWVuY2UgPiAxMCkge1xyXG4gICAgICBsYXN0U2VxdWVuY2VCeURldmljZS5zZXQobm9ybWFsaXplZCwgc2VxdWVuY2UpO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbiAgbGFzdFNlcXVlbmNlQnlEZXZpY2Uuc2V0KG5vcm1hbGl6ZWQsIHNlcXVlbmNlKTtcclxuICByZXR1cm4gZmFsc2U7XHJcbn07XHJcblxyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXHByb2plY3RzXFxcXEtsaW5HaGFuYVxcXFxzcmNcXFxcc2VydmVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxwcm9qZWN0c1xcXFxLbGluR2hhbmFcXFxcc3JjXFxcXHNlcnZlclxcXFxkZXZpY2VDcmVkZW50aWFscy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovcHJvamVjdHMvS2xpbkdoYW5hL3NyYy9zZXJ2ZXIvZGV2aWNlQ3JlZGVudGlhbHMudHNcIjtleHBvcnQgY29uc3QgREVWSUNFX0NSRURFTlRJQUxTX0VOViA9ICdERVZJQ0VfQ1JFREVOVElBTFNfSlNPTic7XG5cbmNvbnN0IERFRkFVTFRfQ1JFREVOVElBTFM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICdTQi0wMjQnOiAna2xpbmdoYW5hX2Rldl9kZXZpY2Vfa2V5X3NiMDI0Jyxcbn07XG5cbmV4cG9ydCBjb25zdCBwYXJzZURldmljZUNyZWRlbnRpYWxzID0gKHJhdzogc3RyaW5nIHwgdW5kZWZpbmVkKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9PiB7XG4gIGlmICghcmF3KSByZXR1cm4geyAuLi5ERUZBVUxUX0NSRURFTlRJQUxTIH07XG4gIHRyeSB7XG4gICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyYXcpIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgIGNvbnN0IGN1c3RvbSA9IE9iamVjdC5mcm9tRW50cmllcyhcbiAgICAgIE9iamVjdC5lbnRyaWVzKHBhcnNlZClcbiAgICAgICAgLmZpbHRlcigoWywgdmFsdWVdKSA9PiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnICYmIHZhbHVlLmxlbmd0aCA+IDApXG4gICAgICAgIC5tYXAoKFtkZXZpY2VJZCwga2V5XSkgPT4gW2RldmljZUlkLnRvVXBwZXJDYXNlKCksIGtleSBhcyBzdHJpbmddKVxuICAgICk7XG4gICAgcmV0dXJuIHsgLi4uREVGQVVMVF9DUkVERU5USUFMUywgLi4uY3VzdG9tIH07XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB7IC4uLkRFRkFVTFRfQ1JFREVOVElBTFMgfTtcbiAgfVxufTtcblxuZXhwb3J0IGNvbnN0IGdldERldmljZUNyZWRlbnRpYWwgPSAoZGV2aWNlSWQ6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCA9PiB7XG4gIGNvbnN0IGNyZWRlbnRpYWxzID0gcGFyc2VEZXZpY2VDcmVkZW50aWFscyhwcm9jZXNzLmVudltERVZJQ0VfQ1JFREVOVElBTFNfRU5WXSk7XG4gIHJldHVybiBjcmVkZW50aWFsc1tkZXZpY2VJZC50b1VwcGVyQ2FzZSgpXTtcbn07XG5cbmV4cG9ydCBjb25zdCB2ZXJpZnlEZXZpY2VDcmVkZW50aWFsID0gKGRldmljZUlkOiBzdHJpbmcsIHN1cHBsaWVkS2V5OiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgY29uc3QgZXhwZWN0ZWRLZXkgPSBnZXREZXZpY2VDcmVkZW50aWFsKGRldmljZUlkKTtcbiAgcmV0dXJuIEJvb2xlYW4oZXhwZWN0ZWRLZXkpICYmIGV4cGVjdGVkS2V5ID09PSBzdXBwbGllZEtleTtcbn07XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxccHJvamVjdHNcXFxcS2xpbkdoYW5hXFxcXHNyY1xcXFxzZXJ2ZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXHByb2plY3RzXFxcXEtsaW5HaGFuYVxcXFxzcmNcXFxcc2VydmVyXFxcXGFkbWluSGFuZGxlci50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovcHJvamVjdHMvS2xpbkdoYW5hL3NyYy9zZXJ2ZXIvYWRtaW5IYW5kbGVyLnRzXCI7aW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJztcclxuaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XHJcblxyXG4vLyBUaGlzIGhhbmRsZXIgaXMgdGhlIE9OTFkgcGxhY2UgaW4gdGhlIGNvZGViYXNlIChiZXNpZGVzIHNjcmlwdHMvY3JlYXRlLWFkbWluLm1qcyxcclxuLy8gd2hpY2ggcnVucyBsb2NhbGx5IG9uIGEgZGV2ZWxvcGVyJ3MgbWFjaGluZSkgdGhhdCB0b3VjaGVzIFNVUEFCQVNFX1NFQ1JFVF9LRVkuIEl0XHJcbi8vIG11c3Qgb25seSBldmVyIHJ1biBzZXJ2ZXItc2lkZSAoVml0ZSBkZXYgbWlkZGxld2FyZSwgb3IgYSBWZXJjZWwgc2VydmVybGVzc1xyXG4vLyBmdW5jdGlvbikgXHUyMDE0IG5ldmVyIGltcG9ydCB0aGlzIGZyb20gc3JjLyBjb2RlIHRoYXQgc2hpcHMgdG8gdGhlIGJyb3dzZXIuXHJcbmNvbnN0IGdldFNlcnZpY2VDbGllbnQgPSAoKSA9PiB7XHJcbiAgY29uc3QgdXJsID0gcHJvY2Vzcy5lbnYuU1VQQUJBU0VfVVJMIHx8IHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfVVJMO1xyXG4gIGNvbnN0IGtleSA9IHByb2Nlc3MuZW52LlNVUEFCQVNFX1NFQ1JFVF9LRVk7XHJcbiAgaWYgKCF1cmwgfHwgIWtleSkgcmV0dXJuIG51bGw7XHJcbiAgcmV0dXJuIGNyZWF0ZUNsaWVudCh1cmwsIGtleSwgeyBhdXRoOiB7IHBlcnNpc3RTZXNzaW9uOiBmYWxzZSB9IH0pO1xyXG59O1xyXG5cclxuY29uc3QgTmV3VGVhbU1lbWJlclNjaGVtYSA9IHoub2JqZWN0KHtcclxuICBmdWxsTmFtZTogei5zdHJpbmcoKS50cmltKCkubWluKDIsICdGdWxsIG5hbWUgaXMgdG9vIHNob3J0LicpLFxyXG4gIGVtYWlsOiB6LnN0cmluZygpLnRyaW0oKS5lbWFpbCgnRW50ZXIgYSB2YWxpZCBlbWFpbCBhZGRyZXNzLicpLFxyXG4gIHBhc3N3b3JkOiB6LnN0cmluZygpLm1pbig4LCAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMuJyksXHJcbiAgcm9sZTogei5lbnVtKFsnQURNSU4nLCAnVVNFUiddKSxcclxufSk7XHJcblxyXG5jb25zdCBBRE1JTl9ST0xFUyA9IG5ldyBTZXQoWydBRE1JTicsICdTVVBFUl9BRE1JTicsICdPUEVSQVRJT05TJ10pO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBZG1pbkFjdGlvblJlc3VsdCB7XHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyO1xyXG4gIGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XHJcbiAgYm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBBRE1JTl9DT1JTX0hFQURFUlM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ2NvbnRlbnQtdHlwZSwgYXV0aG9yaXphdGlvbicsXHJcbiAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnUE9TVCwgT1BUSU9OUycsXHJcbn07XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlQ3JlYXRlVGVhbU1lbWJlcihcclxuICBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXSB8IHVuZGVmaW5lZD4sXHJcbiAgcmF3Qm9keTogc3RyaW5nIHwgUmVjb3JkPHN0cmluZywgdW5rbm93bj5cclxuKTogUHJvbWlzZTxBZG1pbkFjdGlvblJlc3VsdD4ge1xyXG4gIGNvbnN0IGdldEhlYWRlciA9IChuYW1lOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xyXG4gICAgY29uc3QgdmFsID0gaGVhZGVyc1tuYW1lLnRvTG93ZXJDYXNlKCldIHx8IGhlYWRlcnNbbmFtZV07XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSByZXR1cm4gdmFsWzBdIHx8ICcnO1xyXG4gICAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnID8gdmFsIDogJyc7XHJcbiAgfTtcclxuXHJcbiAgY29uc3Qgc3VwYWJhc2UgPSBnZXRTZXJ2aWNlQ2xpZW50KCk7XHJcbiAgaWYgKCFzdXBhYmFzZSkge1xyXG4gICAgcmV0dXJuIHsgc3RhdHVzQ29kZTogNTAwLCBoZWFkZXJzOiBBRE1JTl9DT1JTX0hFQURFUlMsIGJvZHk6IHsgb2s6IGZhbHNlLCBlcnJvcjogJ05PVF9DT05GSUdVUkVEJywgbWVzc2FnZTogJ1NlcnZlciBpcyBtaXNzaW5nIFNVUEFCQVNFX1NFQ1JFVF9LRVkuJyB9IH07XHJcbiAgfVxyXG5cclxuICBjb25zdCB0b2tlbiA9IGdldEhlYWRlcignYXV0aG9yaXphdGlvbicpLnJlcGxhY2UoL15CZWFyZXJcXHMrL2ksICcnKTtcclxuICBpZiAoIXRva2VuKSB7XHJcbiAgICByZXR1cm4geyBzdGF0dXNDb2RlOiA0MDEsIGhlYWRlcnM6IEFETUlOX0NPUlNfSEVBREVSUywgYm9keTogeyBvazogZmFsc2UsIGVycm9yOiAnVU5BVVRIT1JJWkVEJywgbWVzc2FnZTogJ01pc3NpbmcgYmVhcmVyIHRva2VuLicgfSB9O1xyXG4gIH1cclxuXHJcbiAgY29uc3QgeyBkYXRhOiBjYWxsZXJEYXRhLCBlcnJvcjogY2FsbGVyRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcih0b2tlbik7XHJcbiAgaWYgKGNhbGxlckVycm9yIHx8ICFjYWxsZXJEYXRhLnVzZXIpIHtcclxuICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwMSwgaGVhZGVyczogQURNSU5fQ09SU19IRUFERVJTLCBib2R5OiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdVTkFVVEhPUklaRUQnLCBtZXNzYWdlOiAnSW52YWxpZCBvciBleHBpcmVkIHNlc3Npb24uJyB9IH07XHJcbiAgfVxyXG5cclxuICBjb25zdCB7IGRhdGE6IGNhbGxlclByb2ZpbGUsIGVycm9yOiBwcm9maWxlRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmZyb20oJ3Byb2ZpbGVzJykuc2VsZWN0KCdyb2xlJykuZXEoJ2lkJywgY2FsbGVyRGF0YS51c2VyLmlkKS5tYXliZVNpbmdsZSgpO1xyXG4gIGlmIChwcm9maWxlRXJyb3IgfHwgIWNhbGxlclByb2ZpbGUgfHwgIUFETUlOX1JPTEVTLmhhcyhTdHJpbmcoY2FsbGVyUHJvZmlsZS5yb2xlKSkpIHtcclxuICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwMywgaGVhZGVyczogQURNSU5fQ09SU19IRUFERVJTLCBib2R5OiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdGT1JCSURERU4nLCBtZXNzYWdlOiAnT25seSBleGlzdGluZyBhZG1pbnMgY2FuIGFkZCB0ZWFtIG1lbWJlcnMuJyB9IH07XHJcbiAgfVxyXG5cclxuICBsZXQgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XHJcbiAgdHJ5IHtcclxuICAgIHBheWxvYWQgPSB0eXBlb2YgcmF3Qm9keSA9PT0gJ3N0cmluZycgPyBKU09OLnBhcnNlKHJhd0JvZHkpIDogcmF3Qm9keTtcclxuICB9IGNhdGNoIHtcclxuICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwMCwgaGVhZGVyczogQURNSU5fQ09SU19IRUFERVJTLCBib2R5OiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdJTlZBTElEX1BBWUxPQUQnLCBtZXNzYWdlOiAnTWFsZm9ybWVkIEpTT04gcGF5bG9hZC4nIH0gfTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHBhcnNlZCA9IE5ld1RlYW1NZW1iZXJTY2hlbWEuc2FmZVBhcnNlKHBheWxvYWQpO1xyXG4gIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHtcclxuICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwMCwgaGVhZGVyczogQURNSU5fQ09SU19IRUFERVJTLCBib2R5OiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdJTlZBTElEX1BBWUxPQUQnLCBtZXNzYWdlOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlIHx8ICdJbnZhbGlkIGlucHV0LicgfSB9O1xyXG4gIH1cclxuICBjb25zdCB7IGZ1bGxOYW1lLCBlbWFpbCwgcGFzc3dvcmQsIHJvbGUgfSA9IHBhcnNlZC5kYXRhO1xyXG5cclxuICBjb25zdCB7IGRhdGE6IGNyZWF0ZWQsIGVycm9yOiBjcmVhdGVFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5hZG1pbi5jcmVhdGVVc2VyKHtcclxuICAgIGVtYWlsLFxyXG4gICAgcGFzc3dvcmQsXHJcbiAgICBlbWFpbF9jb25maXJtOiB0cnVlLFxyXG4gICAgdXNlcl9tZXRhZGF0YTogeyBmdWxsX25hbWU6IGZ1bGxOYW1lIH0sXHJcbiAgfSk7XHJcblxyXG4gIGlmIChjcmVhdGVFcnJvciB8fCAhY3JlYXRlZC51c2VyKSB7XHJcbiAgICBjb25zdCBhbHJlYWR5RXhpc3RzID0gL2FscmVhZHkuKnJlZ2lzdGVyZWR8YWxyZWFkeSBleGlzdHMvaS50ZXN0KGNyZWF0ZUVycm9yPy5tZXNzYWdlIHx8ICcnKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IGFscmVhZHlFeGlzdHMgPyA0MDkgOiA0MDAsXHJcbiAgICAgIGhlYWRlcnM6IEFETUlOX0NPUlNfSEVBREVSUyxcclxuICAgICAgYm9keTogeyBvazogZmFsc2UsIGVycm9yOiBhbHJlYWR5RXhpc3RzID8gJ0VNQUlMX1RBS0VOJyA6ICdDUkVBVEVfRkFJTEVEJywgbWVzc2FnZTogY3JlYXRlRXJyb3I/Lm1lc3NhZ2UgfHwgJ0NvdWxkIG5vdCBjcmVhdGUgdXNlci4nIH0sXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgY29uc3QgeyBlcnJvcjogdXBzZXJ0RXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXHJcbiAgICAuZnJvbSgncHJvZmlsZXMnKVxyXG4gICAgLnVwc2VydCh7IGlkOiBjcmVhdGVkLnVzZXIuaWQsIGVtYWlsLCBmdWxsX25hbWU6IGZ1bGxOYW1lLCByb2xlIH0sIHsgb25Db25mbGljdDogJ2lkJyB9KTtcclxuXHJcbiAgaWYgKHVwc2VydEVycm9yKSB7XHJcbiAgICByZXR1cm4geyBzdGF0dXNDb2RlOiA1MDAsIGhlYWRlcnM6IEFETUlOX0NPUlNfSEVBREVSUywgYm9keTogeyBvazogZmFsc2UsIGVycm9yOiAnUFJPRklMRV9VUFNFUlRfRkFJTEVEJywgbWVzc2FnZTogdXBzZXJ0RXJyb3IubWVzc2FnZSB9IH07XHJcbiAgfVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgaGVhZGVyczogQURNSU5fQ09SU19IRUFERVJTLFxyXG4gICAgYm9keTogeyBvazogdHJ1ZSwgcHJvZmlsZTogeyBpZDogY3JlYXRlZC51c2VyLmlkLCBlbWFpbCwgZnVsbF9uYW1lOiBmdWxsTmFtZSwgcm9sZSB9IH0sXHJcbiAgfTtcclxufVxyXG5cclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxwcm9qZWN0c1xcXFxLbGluR2hhbmFcXFxcc3JjXFxcXHNlcnZlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxccHJvamVjdHNcXFxcS2xpbkdoYW5hXFxcXHNyY1xcXFxzZXJ2ZXJcXFxcYWlBc3Npc3RhbnRIYW5kbGVyLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9wcm9qZWN0cy9LbGluR2hhbmEvc3JjL3NlcnZlci9haUFzc2lzdGFudEhhbmRsZXIudHNcIjtpbXBvcnQgQW50aHJvcGljIGZyb20gJ0BhbnRocm9waWMtYWkvc2RrJztcclxuaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJztcclxuaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XHJcblxyXG4vLyBUaGlzIGhhbmRsZXIgaXMgdGhlIG9ubHkgcGxhY2UgaW4gdGhlIGNvZGViYXNlIHRoYXQgdG91Y2hlc1xyXG4vLyBBTlRIUk9QSUNfQVBJX0tFWS4gSXQgbXVzdCBvbmx5IGV2ZXIgcnVuIHNlcnZlci1zaWRlIChWaXRlIGRldlxyXG4vLyBtaWRkbGV3YXJlLCBvciBhIFZlcmNlbCBzZXJ2ZXJsZXNzIGZ1bmN0aW9uKSBcdTIwMTQgbmV2ZXIgaW1wb3J0IHRoaXMgZnJvbVxyXG4vLyBzcmMvIGNvZGUgdGhhdCBzaGlwcyB0byB0aGUgYnJvd3Nlci5cclxuY29uc3QgZ2V0QW50aHJvcGljQ2xpZW50ID0gKCk6IEFudGhyb3BpYyB8IG51bGwgPT4ge1xyXG4gIGNvbnN0IGFwaUtleSA9IHByb2Nlc3MuZW52LkFOVEhST1BJQ19BUElfS0VZO1xyXG4gIGlmICghYXBpS2V5KSByZXR1cm4gbnVsbDtcclxuICByZXR1cm4gbmV3IEFudGhyb3BpYyh7IGFwaUtleSB9KTtcclxufTtcclxuXHJcbmNvbnN0IGdldFNlcnZpY2VDbGllbnQgPSAoKSA9PiB7XHJcbiAgY29uc3QgdXJsID0gcHJvY2Vzcy5lbnYuU1VQQUJBU0VfVVJMIHx8IHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfVVJMO1xyXG4gIGNvbnN0IGtleSA9IHByb2Nlc3MuZW52LlNVUEFCQVNFX1NFQ1JFVF9LRVk7XHJcbiAgaWYgKCF1cmwgfHwgIWtleSkgcmV0dXJuIG51bGw7XHJcbiAgcmV0dXJuIGNyZWF0ZUNsaWVudCh1cmwsIGtleSwgeyBhdXRoOiB7IHBlcnNpc3RTZXNzaW9uOiBmYWxzZSB9IH0pO1xyXG59O1xyXG5cclxuY29uc3QgQ2hhdE1lc3NhZ2VTY2hlbWEgPSB6Lm9iamVjdCh7XHJcbiAgcm9sZTogei5lbnVtKFsndXNlcicsICdhc3Npc3RhbnQnXSksXHJcbiAgdGV4dDogei5zdHJpbmcoKS5taW4oMSkubWF4KDQwMDApLFxyXG59KTtcclxuXHJcbi8vIFRoZSBmbGVldCBzbmFwc2hvdCB0aGUgY2xpZW50IGFscmVhZHkgaGFzIGxvYWRlZCAoZnJvbSB1c2VTbWFydEJpbikgXHUyMDE0XHJcbi8vIHN1bW1hcml6ZWQgaGVyZSByYXRoZXIgdGhhbiByZS1xdWVyaWVkLCBzbyB0aGUgYXNzaXN0YW50IHJlYXNvbnMgb3ZlclxyXG4vLyBleGFjdGx5IHdoYXQgdGhlIGFkbWluIGlzIGxvb2tpbmcgYXQsIG5vdCBhIHNlY29uZCwgcG9zc2libHktZGlmZmVyZW50XHJcbi8vIGxpdmUgcXVlcnkuXHJcbmNvbnN0IEZsZWV0QmluU3VtbWFyeVNjaGVtYSA9IHoub2JqZWN0KHtcclxuICBjb2RlOiB6LnN0cmluZygpLFxyXG4gIG5hbWU6IHouc3RyaW5nKCksXHJcbiAgc3RhdHVzOiB6LnN0cmluZygpLFxyXG4gIGZpbGxQZXJjZW50YWdlOiB6Lm51bWJlcigpLFxyXG4gIGJhdHRlcnlQZXJjZW50YWdlOiB6Lm51bWJlcigpLm51bGxhYmxlKCkub3B0aW9uYWwoKSxcclxuICB3aWZpU2lnbmFsOiB6Lm51bWJlcigpLm51bGxhYmxlKCkub3B0aW9uYWwoKSxcclxuICBsYXN0VXBkYXRlZDogei5zdHJpbmcoKS5udWxsYWJsZSgpLm9wdGlvbmFsKCksXHJcbiAgem9uZTogei5zdHJpbmcoKS5udWxsYWJsZSgpLm9wdGlvbmFsKCksXHJcbn0pO1xyXG5cclxuY29uc3QgRmxlZXRBbGVydFN1bW1hcnlTY2hlbWEgPSB6Lm9iamVjdCh7XHJcbiAgYmluQ29kZTogei5zdHJpbmcoKSxcclxuICB0eXBlOiB6LnN0cmluZygpLFxyXG4gIG1lc3NhZ2U6IHouc3RyaW5nKCksXHJcbiAgcmVhZDogei5ib29sZWFuKCksXHJcbn0pO1xyXG5cclxuY29uc3QgRmxlZXRSb3V0ZVN0b3BTdW1tYXJ5U2NoZW1hID0gei5vYmplY3Qoe1xyXG4gIGJpbkNvZGU6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcclxuICBuYW1lOiB6LnN0cmluZygpLFxyXG4gIHN0YXR1czogei5zdHJpbmcoKSxcclxufSk7XHJcblxyXG5jb25zdCBDaGF0UmVxdWVzdFNjaGVtYSA9IHoub2JqZWN0KHtcclxuICBtZXNzYWdlOiB6LnN0cmluZygpLnRyaW0oKS5taW4oMSwgJ01lc3NhZ2UgY2Fubm90IGJlIGVtcHR5LicpLm1heCgyMDAwLCAnTWVzc2FnZSBpcyB0b28gbG9uZy4nKSxcclxuICBoaXN0b3J5OiB6LmFycmF5KENoYXRNZXNzYWdlU2NoZW1hKS5tYXgoMjApLmRlZmF1bHQoW10pLFxyXG4gIGZsZWV0OiB6Lm9iamVjdCh7XHJcbiAgICBmbGVldEhlYWx0aFBlcmNlbnQ6IHoubnVtYmVyKCksXHJcbiAgICBiaW5zOiB6LmFycmF5KEZsZWV0QmluU3VtbWFyeVNjaGVtYSkubWF4KDIwMCkuZGVmYXVsdChbXSksXHJcbiAgICBhbGVydHM6IHouYXJyYXkoRmxlZXRBbGVydFN1bW1hcnlTY2hlbWEpLm1heCgxMDApLmRlZmF1bHQoW10pLFxyXG4gICAgcm91dGVTdG9wczogei5hcnJheShGbGVldFJvdXRlU3RvcFN1bW1hcnlTY2hlbWEpLm1heCgyMDApLmRlZmF1bHQoW10pLFxyXG4gIH0pLFxyXG59KTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQWlBc3Npc3RhbnRSZXN1bHQge1xyXG4gIHN0YXR1c0NvZGU6IG51bWJlcjtcclxuICBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xyXG4gIGJvZHk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgQUlfQVNTSVNUQU5UX0NPUlNfSEVBREVSUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnY29udGVudC10eXBlLCBhdXRob3JpemF0aW9uJyxcclxuICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdQT1NULCBPUFRJT05TJyxcclxufTtcclxuXHJcbmNvbnN0IGJ1aWxkU3lzdGVtUHJvbXB0ID0gKGZsZWV0OiB6LmluZmVyPHR5cGVvZiBDaGF0UmVxdWVzdFNjaGVtYT5bJ2ZsZWV0J10pOiBzdHJpbmcgPT4ge1xyXG4gIGNvbnN0IGJpbkxpbmVzID0gZmxlZXQuYmlucy5sZW5ndGggPT09IDBcclxuICAgID8gJ05vIFNtYXJ0QmlucyBhcmUgY3VycmVudGx5IGxvYWRlZC4nXHJcbiAgICA6IGZsZWV0LmJpbnMubWFwKChiKSA9PiBbXHJcbiAgICAgICAgYi5jb2RlLFxyXG4gICAgICAgIGIubmFtZSxcclxuICAgICAgICBgJHtiLmZpbGxQZXJjZW50YWdlfSUgZnVsbGAsXHJcbiAgICAgICAgYHN0YXR1cyAke2Iuc3RhdHVzfWAsXHJcbiAgICAgICAgYi56b25lID8gYHpvbmUgJHtiLnpvbmV9YCA6IG51bGwsXHJcbiAgICAgICAgYGJhdHRlcnkgJHtiLmJhdHRlcnlQZXJjZW50YWdlID09IG51bGwgPyAnTi9BJyA6IGAke2IuYmF0dGVyeVBlcmNlbnRhZ2V9JWB9YCxcclxuICAgICAgICBgc2lnbmFsICR7Yi53aWZpU2lnbmFsID09IG51bGwgPyAnTi9BJyA6IGAke2Iud2lmaVNpZ25hbH0gZEJtYH1gLFxyXG4gICAgICAgIGIubGFzdFVwZGF0ZWQgPyBgbGFzdCBzZWVuICR7Yi5sYXN0VXBkYXRlZH1gIDogbnVsbCxcclxuICAgICAgXS5maWx0ZXIoQm9vbGVhbikuam9pbignIFx1MjAxNCAnKSkuam9pbignXFxuJyk7XHJcblxyXG4gIGNvbnN0IGFsZXJ0TGluZXMgPSBmbGVldC5hbGVydHMubGVuZ3RoID09PSAwXHJcbiAgICA/ICdObyBhY3RpdmUgYWxlcnRzLidcclxuICAgIDogZmxlZXQuYWxlcnRzLm1hcCgoYSkgPT4gYFske2EucmVhZCA/ICdyZWFkJyA6ICdVTlJFQUQnfV0gJHthLmJpbkNvZGV9OiAke2EudHlwZX0gXHUyMDE0ICR7YS5tZXNzYWdlfWApLmpvaW4oJ1xcbicpO1xyXG5cclxuICBjb25zdCByb3V0ZUxpbmVzID0gZmxlZXQucm91dGVTdG9wcy5sZW5ndGggPT09IDBcclxuICAgID8gJ05vIHJvdXRlIHN0b3BzIGFyZSBjdXJyZW50bHkgbG9hZGVkLidcclxuICAgIDogZmxlZXQucm91dGVTdG9wcy5tYXAoKHIpID0+IGAke3IuYmluQ29kZSB8fCAnXHUyMDE0J30gJHtyLm5hbWV9OiAke3Iuc3RhdHVzfWApLmpvaW4oJ1xcbicpO1xyXG5cclxuICByZXR1cm4gW1xyXG4gICAgJ1lvdSBhcmUgdGhlIEtsaW5HaGFuYSBBSSBBc3Npc3RhbnQsIGVtYmVkZGVkIGluIHRoZSBhZG1pbiBkYXNoYm9hcmQgb2YgYSBLdW1hc2ktYmFzZWQgc21hcnQtd2FzdGUtbWFuYWdlbWVudCBwbGF0Zm9ybS4nLFxyXG4gICAgJ1lvdSBoZWxwIG9wZXJhdGlvbnMgc3RhZmYgdW5kZXJzdGFuZCBmbGVldCBzdGF0dXMsIHByaW9yaXRpemUgcGlja3VwcywgYW5kIGFuc3dlciBxdWVzdGlvbnMgYWJvdXQgYmlucywgYWxlcnRzLCBhbmQgY29sbGVjdGlvbiByb3V0ZXMuJyxcclxuICAgICcnLFxyXG4gICAgYEZsZWV0IGhlYWx0aDogJHtmbGVldC5mbGVldEhlYWx0aFBlcmNlbnR9JWAsXHJcbiAgICAnJyxcclxuICAgICdTbWFydEJpbnM6JyxcclxuICAgIGJpbkxpbmVzLFxyXG4gICAgJycsXHJcbiAgICAnQWxlcnRzOicsXHJcbiAgICBhbGVydExpbmVzLFxyXG4gICAgJycsXHJcbiAgICAnUm91dGUgc3RvcHM6JyxcclxuICAgIHJvdXRlTGluZXMsXHJcbiAgICAnJyxcclxuICAgICdBbnN3ZXIgb25seSBmcm9tIHRoZSBkYXRhIGFib3ZlIFx1MjAxNCBkbyBub3QgaW52ZW50IGJpbnMsIGFsZXJ0cywgb3IgZmlndXJlcyB0aGF0IGFyZSBub3QgbGlzdGVkLiBJZiBhc2tlZCBzb21ldGhpbmcgdGhlIGRhdGEgY2Fubm90IGFuc3dlciwgc2F5IHNvIHBsYWlubHkuJyxcclxuICAgICdLZWVwIGFuc3dlcnMgc2hvcnQgYW5kIG9wZXJhdGlvbmFsIChhIGZldyBzZW50ZW5jZXMsIG9yIGEgYnJpZWYgbGlzdCkgXHUyMDE0IHRoaXMgaXMgYSBkYXNoYm9hcmQgY2hhdCBwYW5lbCwgbm90IGEgcmVwb3J0LicsXHJcbiAgXS5qb2luKCdcXG4nKTtcclxufTtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVBaUFzc2lzdGFudENoYXQoXHJcbiAgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgc3RyaW5nW10gfCB1bmRlZmluZWQ+LFxyXG4gIHJhd0JvZHk6IHN0cmluZyB8IFJlY29yZDxzdHJpbmcsIHVua25vd24+XHJcbik6IFByb21pc2U8QWlBc3Npc3RhbnRSZXN1bHQ+IHtcclxuICBjb25zdCBnZXRIZWFkZXIgPSAobmFtZTogc3RyaW5nKTogc3RyaW5nID0+IHtcclxuICAgIGNvbnN0IHZhbCA9IGhlYWRlcnNbbmFtZS50b0xvd2VyQ2FzZSgpXSB8fCBoZWFkZXJzW25hbWVdO1xyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkgcmV0dXJuIHZhbFswXSB8fCAnJztcclxuICAgIHJldHVybiB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyA/IHZhbCA6ICcnO1xyXG4gIH07XHJcblxyXG4gIC8vIFJlcXVpcmUgYSBzaWduZWQtaW4gc2Vzc2lvbiAoYW55IHJvbGUpIFx1MjAxNCB0aGlzIGVuZHBvaW50IHNwZW5kcyByZWFsXHJcbiAgLy8gbW9uZXkgcGVyIHJlcXVlc3QsIGFuZCBpdCdzIG90aGVyd2lzZSBhIHB1YmxpY2x5IHJlYWNoYWJsZSBVUkwuIEZhaWxcclxuICAvLyBjbG9zZWQgKGxpa2UgYWRtaW5IYW5kbGVyLnRzKSBpZiBpZGVudGl0eSBjYW4ndCBldmVuIGJlIGNoZWNrZWQsXHJcbiAgLy8gcmF0aGVyIHRoYW4gc2lsZW50bHkgbGV0dGluZyB1bmF1dGhlbnRpY2F0ZWQgcmVxdWVzdHMgdGhyb3VnaC5cclxuICBjb25zdCBzdXBhYmFzZSA9IGdldFNlcnZpY2VDbGllbnQoKTtcclxuICBpZiAoIXN1cGFiYXNlKSB7XHJcbiAgICByZXR1cm4geyBzdGF0dXNDb2RlOiA1MDAsIGhlYWRlcnM6IEFJX0FTU0lTVEFOVF9DT1JTX0hFQURFUlMsIGJvZHk6IHsgb2s6IGZhbHNlLCBlcnJvcjogJ05PVF9DT05GSUdVUkVEJywgbWVzc2FnZTogJ1NlcnZlciBpcyBtaXNzaW5nIFNVUEFCQVNFX1NFQ1JFVF9LRVkuJyB9IH07XHJcbiAgfVxyXG4gIGNvbnN0IHRva2VuID0gZ2V0SGVhZGVyKCdhdXRob3JpemF0aW9uJykucmVwbGFjZSgvXkJlYXJlclxccysvaSwgJycpO1xyXG4gIGlmICghdG9rZW4pIHtcclxuICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwMSwgaGVhZGVyczogQUlfQVNTSVNUQU5UX0NPUlNfSEVBREVSUywgYm9keTogeyBvazogZmFsc2UsIGVycm9yOiAnVU5BVVRIT1JJWkVEJywgbWVzc2FnZTogJ01pc3NpbmcgYmVhcmVyIHRva2VuLicgfSB9O1xyXG4gIH1cclxuICBjb25zdCB7IGRhdGE6IHVzZXJEYXRhLCBlcnJvcjogdXNlckVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZS5hdXRoLmdldFVzZXIodG9rZW4pO1xyXG4gIGlmICh1c2VyRXJyb3IgfHwgIXVzZXJEYXRhLnVzZXIpIHtcclxuICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwMSwgaGVhZGVyczogQUlfQVNTSVNUQU5UX0NPUlNfSEVBREVSUywgYm9keTogeyBvazogZmFsc2UsIGVycm9yOiAnVU5BVVRIT1JJWkVEJywgbWVzc2FnZTogJ0ludmFsaWQgb3IgZXhwaXJlZCBzZXNzaW9uLicgfSB9O1xyXG4gIH1cclxuXHJcbiAgY29uc3QgY2xpZW50ID0gZ2V0QW50aHJvcGljQ2xpZW50KCk7XHJcbiAgaWYgKCFjbGllbnQpIHtcclxuICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDUwMCwgaGVhZGVyczogQUlfQVNTSVNUQU5UX0NPUlNfSEVBREVSUywgYm9keTogeyBvazogZmFsc2UsIGVycm9yOiAnTk9UX0NPTkZJR1VSRUQnLCBtZXNzYWdlOiAnU2VydmVyIGlzIG1pc3NpbmcgQU5USFJPUElDX0FQSV9LRVkuJyB9IH07XHJcbiAgfVxyXG5cclxuICBsZXQgcGF5bG9hZDogdW5rbm93bjtcclxuICB0cnkge1xyXG4gICAgcGF5bG9hZCA9IHR5cGVvZiByYXdCb2R5ID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2UocmF3Qm9keSkgOiByYXdCb2R5O1xyXG4gIH0gY2F0Y2gge1xyXG4gICAgcmV0dXJuIHsgc3RhdHVzQ29kZTogNDAwLCBoZWFkZXJzOiBBSV9BU1NJU1RBTlRfQ09SU19IRUFERVJTLCBib2R5OiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdJTlZBTElEX1BBWUxPQUQnLCBtZXNzYWdlOiAnTWFsZm9ybWVkIEpTT04gcGF5bG9hZC4nIH0gfTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHBhcnNlZCA9IENoYXRSZXF1ZXN0U2NoZW1hLnNhZmVQYXJzZShwYXlsb2FkKTtcclxuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSB7XHJcbiAgICByZXR1cm4geyBzdGF0dXNDb2RlOiA0MDAsIGhlYWRlcnM6IEFJX0FTU0lTVEFOVF9DT1JTX0hFQURFUlMsIGJvZHk6IHsgb2s6IGZhbHNlLCBlcnJvcjogJ0lOVkFMSURfUEFZTE9BRCcsIG1lc3NhZ2U6IHBhcnNlZC5lcnJvci5pc3N1ZXNbMF0/Lm1lc3NhZ2UgfHwgJ0ludmFsaWQgaW5wdXQuJyB9IH07XHJcbiAgfVxyXG4gIGNvbnN0IHsgbWVzc2FnZSwgaGlzdG9yeSwgZmxlZXQgfSA9IHBhcnNlZC5kYXRhO1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjbGllbnQubWVzc2FnZXMuY3JlYXRlKHtcclxuICAgICAgbW9kZWw6ICdjbGF1ZGUtb3B1cy01JyxcclxuICAgICAgbWF4X3Rva2VuczogMTAyNCxcclxuICAgICAgb3V0cHV0X2NvbmZpZzogeyBlZmZvcnQ6ICdtZWRpdW0nIH0sXHJcbiAgICAgIHN5c3RlbTogYnVpbGRTeXN0ZW1Qcm9tcHQoZmxlZXQpLFxyXG4gICAgICBtZXNzYWdlczogW1xyXG4gICAgICAgIC4uLmhpc3RvcnkubWFwKChtKSA9PiAoeyByb2xlOiBtLnJvbGUsIGNvbnRlbnQ6IG0udGV4dCB9KSBhcyBBbnRocm9waWMuTWVzc2FnZVBhcmFtKSxcclxuICAgICAgICB7IHJvbGU6ICd1c2VyJywgY29udGVudDogbWVzc2FnZSB9LFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdGV4dEJsb2NrID0gcmVzcG9uc2UuY29udGVudC5maW5kKChibG9jayk6IGJsb2NrIGlzIEFudGhyb3BpYy5UZXh0QmxvY2sgPT4gYmxvY2sudHlwZSA9PT0gJ3RleHQnKTtcclxuICAgIGNvbnN0IHRleHQgPSB0ZXh0QmxvY2s/LnRleHQ/LnRyaW0oKTtcclxuICAgIGlmICghdGV4dCkge1xyXG4gICAgICByZXR1cm4geyBzdGF0dXNDb2RlOiA1MDIsIGhlYWRlcnM6IEFJX0FTU0lTVEFOVF9DT1JTX0hFQURFUlMsIGJvZHk6IHsgb2s6IGZhbHNlLCBlcnJvcjogJ0VNUFRZX1JFU1BPTlNFJywgbWVzc2FnZTogJ1RoZSBhc3Npc3RhbnQgcmV0dXJuZWQgbm8gdGV4dC4nIH0gfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geyBzdGF0dXNDb2RlOiAyMDAsIGhlYWRlcnM6IEFJX0FTU0lTVEFOVF9DT1JTX0hFQURFUlMsIGJvZHk6IHsgb2s6IHRydWUsIHRleHQgfSB9O1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIEFudGhyb3BpYy5SYXRlTGltaXRFcnJvcikge1xyXG4gICAgICByZXR1cm4geyBzdGF0dXNDb2RlOiA0MjksIGhlYWRlcnM6IEFJX0FTU0lTVEFOVF9DT1JTX0hFQURFUlMsIGJvZHk6IHsgb2s6IGZhbHNlLCBlcnJvcjogJ1JBVEVfTElNSVRFRCcsIG1lc3NhZ2U6ICdUaGUgYXNzaXN0YW50IGlzIGJ1c3kgXHUyMDE0IHRyeSBhZ2FpbiBzaG9ydGx5LicgfSB9O1xyXG4gICAgfVxyXG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIEFudGhyb3BpYy5BdXRoZW50aWNhdGlvbkVycm9yKSB7XHJcbiAgICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDUwMCwgaGVhZGVyczogQUlfQVNTSVNUQU5UX0NPUlNfSEVBREVSUywgYm9keTogeyBvazogZmFsc2UsIGVycm9yOiAnQVVUSF9GQUlMRUQnLCBtZXNzYWdlOiAnU2VydmVyIGhhcyBhbiBpbnZhbGlkIEFOVEhST1BJQ19BUElfS0VZLicgfSB9O1xyXG4gICAgfVxyXG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIEFudGhyb3BpYy5BUElFcnJvcikge1xyXG4gICAgICByZXR1cm4geyBzdGF0dXNDb2RlOiA1MDIsIGhlYWRlcnM6IEFJX0FTU0lTVEFOVF9DT1JTX0hFQURFUlMsIGJvZHk6IHsgb2s6IGZhbHNlLCBlcnJvcjogJ1VQU1RSRUFNX0VSUk9SJywgbWVzc2FnZTogZXJyLm1lc3NhZ2UgfSB9O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHsgc3RhdHVzQ29kZTogNTAwLCBoZWFkZXJzOiBBSV9BU1NJU1RBTlRfQ09SU19IRUFERVJTLCBib2R5OiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdJTlRFUk5BTF9FUlJPUicsIG1lc3NhZ2U6IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvci4nIH0gfTtcclxuICB9XHJcbn1cclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1UCxPQUFPLFFBQVE7QUFDdFEsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsb0JBQTRCO0FBQ3JDLE9BQU8sV0FBVzs7O0FDSHdRLFNBQVMsb0JBQW9COzs7QUNBZixTQUFTLFNBQVM7QUFFblQsSUFBTSwyQkFBMkIsRUFBRSxLQUFLO0FBQUEsRUFDN0M7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0YsQ0FBQztBQUlNLElBQU0seUJBQXlCLEVBQUUsT0FBTztBQUFBLEVBQzdDLGVBQWUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQztBQUFBLEVBQ2hELFdBQVcsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxHQUFHLEVBQUUsU0FBUztBQUFBLEVBQy9DLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElB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UUFBUSxpQ0FBaUM7QUFDM0MsY0FBSSxJQUFJLFdBQVcsV0FBVztBQUM1QixnQkFBSSxVQUFVLEtBQUssa0JBQWtCO0FBQ3JDLGdCQUFJLElBQUk7QUFDUjtBQUFBLFVBQ0Y7QUFFQSxjQUFJLElBQUksV0FBVyxRQUFRO0FBQ3pCLGdCQUFJLE9BQU87QUFDWCxnQkFBSSxHQUFHLFFBQVEsQ0FBQyxVQUFVO0FBQUUsc0JBQVE7QUFBQSxZQUFPLENBQUM7QUFDNUMsZ0JBQUksR0FBRyxPQUFPLFlBQVk7QUFDeEIsb0JBQU0sU0FBUyxNQUFNLHVCQUF1QixJQUFJLFNBQW1DLElBQUk7QUFDdkYsa0JBQUksVUFBVSxPQUFPLFlBQVksT0FBTyxPQUFPO0FBQy9DLGtCQUFJLElBQUksS0FBSyxVQUFVLE9BQU8sSUFBSSxDQUFDO0FBQUEsWUFDckMsQ0FBQztBQUNEO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFFQSxZQUFJLFFBQVEscUJBQXFCO0FBQy9CLGNBQUksSUFBSSxXQUFXLFdBQVc7QUFDNUIsZ0JBQUksVUFBVSxLQUFLLHlCQUF5QjtBQUM1QyxnQkFBSSxJQUFJO0FBQ1I7QUFBQSxVQUNGO0FBRUEsY0FBSSxJQUFJLFdBQVcsUUFBUTtBQUN6QixnQkFBSSxPQUFPO0FBQ1gsZ0JBQUksR0FBRyxRQUFRLENBQUMsVUFBVTtBQUFFLHNCQUFRO0FBQUEsWUFBTyxDQUFDO0FBQzVDLGdCQUFJLEdBQUcsT0FBTyxZQUFZO0FBQ3hCLG9CQUFNLFNBQVMsTUFBTSxzQkFBc0IsSUFBSSxTQUFtQyxJQUFJO0FBQ3RGLGtCQUFJLFVBQVUsT0FBTyxZQUFZLE9BQU8sT0FBTztBQUMvQyxrQkFBSSxJQUFJLEtBQUssVUFBVSxPQUFPLElBQUksQ0FBQztBQUFBLFlBQ3JDLENBQUM7QUFDRDtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBRUEsYUFBSztBQUFBLE1BQ1AsQ0FBQztBQUFBLElBQ0g7QUFBQSxFQUNGO0FBQ0Y7QUFHQSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxHQUFHLGFBQWEsQ0FBQztBQUFBLEVBQ2pDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxNQUFNO0FBQUEsSUFDSixTQUFTLENBQUMsaUNBQWlDO0FBQUEsSUFDM0MsU0FBUyxDQUFDLFVBQVUsaUJBQWlCO0FBQUEsRUFDdkM7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogWyJsYXN0U2VxdWVuY2VCeURldmljZSIsICJjcmVhdGVDbGllbnQiLCAieiIsICJjcmVhdGVDbGllbnQiLCAieiIsICJjcmVhdGVDbGllbnQiLCAieiIsICJnZXRTZXJ2aWNlQ2xpZW50IiwgImNyZWF0ZUNsaWVudCIsICJ6Il0KfQo=
