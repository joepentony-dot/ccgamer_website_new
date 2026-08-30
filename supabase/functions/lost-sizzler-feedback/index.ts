import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const ALLOWED_ORIGINS = new Set([
  "https://www.cheekycommodoregamer.co.uk",
  "https://cheekycommodoregamer.co.uk"
]);
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DESTINATION = "info@cheekycommodoregamer.co.uk";
const TELEMETRY_EVENTS = new Set([
  "start_click",
  "run_started",
  "run_started_detail",
  "floor_reached",
  "floor_cleared",
  "run_ended",
  "mobile_pc_notice_accept",
  "rating_submitted",
  "rating_dismissed",
  "client_error"
]);
const DEVICE_TYPES = new Set(["desktop", "mobile", "tablet", "unknown"]);
const TELEMETRY_LIMIT = 120;
const TELEMETRY_WINDOW_SECONDS = 300;
const CLIENT_ERROR_LIMIT = 12;
const CLIENT_ERROR_WINDOW_SECONDS = 3600;
const RATING_STATUS_LIMIT = 60;
const RATING_STATUS_WINDOW_SECONDS = 300;
const FEEDBACK_LIMIT = 8;
const FEEDBACK_WINDOW_SECONDS = 3600;

type SupabaseService = ReturnType<typeof createClient>;

function originFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  return ALLOWED_ORIGINS.has(origin) ? origin : "https://www.cheekycommodoregamer.co.uk";
}
function cors(req: Request) {
  return {
    "Access-Control-Allow-Origin": originFor(req),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}
function json(req: Request, body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), ...extraHeaders, "Content-Type": "application/json" } });
}
function text(value: unknown) { return String(value ?? "").trim(); }
function validEmail(value: string) { return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}
function boundedInteger(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}
function boundedText(value: unknown, max: number) { return text(value).replace(/\s+/g, " ").slice(0, max); }
function telemetryMetadata(value: unknown, eventType: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const metadata: Record<string, unknown> = {};
  const floor = boundedInteger(source.floor, 1, 100);
  const nextFloor = boundedInteger(source.next_floor, 1, 100);
  const score = boundedInteger(source.score, 0, 2_000_000_000);
  const kills = boundedInteger(source.kills, 0, 10_000_000);
  const level = boundedInteger(source.level, 1, 10_000);
  const durationMs = boundedInteger(source.duration_ms, 0, 604_800_000);
  const outcome = boundedText(source.outcome, 24).toLowerCase();
  if (floor !== null) metadata.floor = floor;
  if (nextFloor !== null) metadata.next_floor = nextFloor;
  if (score !== null) metadata.score = score;
  if (kills !== null) metadata.kills = kills;
  if (level !== null) metadata.level = level;
  if (durationMs !== null) metadata.duration_ms = durationMs;
  if (outcome) metadata.outcome = outcome;

  if (eventType === "client_error") {
    const errorKind = boundedText(source.error_kind, 24).toLowerCase();
    const errorMessage = boundedText(source.error_message, 180);
    const errorFingerprint = boundedText(source.error_fingerprint, 64).replace(/[^a-zA-Z0-9_-]/g, "");
    const errorSource = boundedText(source.source, 120);
    const line = boundedInteger(source.line, 0, 10_000_000);
    const column = boundedInteger(source.column, 0, 10_000_000);
    if (errorKind) metadata.error_kind = errorKind;
    if (errorMessage) metadata.error_message = errorMessage;
    if (errorFingerprint) metadata.error_fingerprint = errorFingerprint;
    if (errorSource) metadata.source = errorSource;
    if (line !== null) metadata.line = line;
    if (column !== null) metadata.column = column;
  }
  return Object.keys(metadata).length ? metadata : null;
}

async function authenticatedUserId(req: Request, service: SupabaseService) {
  const authHeader = text(req.headers.get("authorization"));
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!bearer) return null;
  try {
    const { data } = await service.auth.getUser(bearer);
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

async function sha256Short(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest.slice(0, 12), byte => byte.toString(16).padStart(2, "0")).join("");
}
async function requestFingerprint(req: Request) {
  const forwarded = text(req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip")).split(",")[0].trim();
  const agent = text(req.headers.get("user-agent")).slice(0, 180);
  return sha256Short(`${forwarded || "unknown"}|${agent || "unknown"}`);
}
async function consumeBudget(service: SupabaseService, bucketKey: string, limit: number, windowSeconds: number) {
  const { data, error } = await service.rpc("consume_lost_sizzler_request_budget", {
    p_bucket_key: bucketKey.slice(0, 160),
    p_limit: limit,
    p_window_seconds: windowSeconds
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: row?.allowed === true,
    retryAfter: Math.max(1, Math.min(windowSeconds, Number(row?.retry_after_seconds) || 1))
  };
}
async function budgetOrResponse(req: Request, service: SupabaseService, bucket: string, limit: number, windowSeconds: number) {
  try {
    const result = await consumeBudget(service, bucket, limit, windowSeconds);
    if (result.allowed) return null;
    return json(req, { success: false, error: "Too many requests. Please try again shortly." }, 429, { "Retry-After": String(result.retryAfter) });
  } catch (error) {
    console.error("[Lost Sizzler feedback] request budget unavailable", error);
    return json(req, { success: false, error: "Service temporarily unavailable" }, 503);
  }
}
async function maybePruneTelemetry(service: SupabaseService) {
  if (Math.random() >= 0.02) return;
  try {
    const budget = await consumeBudget(service, "maintenance:telemetry-prune", 1, 86400);
    if (!budget.allowed) return;
    await service.rpc("prune_lost_sizzler_telemetry", { p_days: 90 });
  } catch (error) {
    console.warn("[Lost Sizzler feedback] telemetry retention maintenance skipped", error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { success: false, error: "Method not allowed" }, 405);

  const requestOrigin = text(req.headers.get("origin"));
  if (requestOrigin && !ALLOWED_ORIGINS.has(requestOrigin)) return json(req, { success: false, error: "Origin not allowed" }, 403);

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { return json(req, { success: false, error: "Invalid JSON" }, 400); }

  const supabaseUrl = text(Deno.env.get("SUPABASE_URL"));
  const serviceKey = text(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  if (!supabaseUrl || !serviceKey) return json(req, { success: false, error: "Feedback service is not configured" }, 500);

  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const action = text(payload.action).toLowerCase();
  const fingerprint = await requestFingerprint(req);

  if (action === "rating_status") {
    const limited = await budgetOrResponse(req, service, `rating-status:${fingerprint}`, RATING_STATUS_LIMIT, RATING_STATUS_WINDOW_SECONDS);
    if (limited) return limited;
    const authUserId = await authenticatedUserId(req, service);
    if (!authUserId) return json(req, { success: true, authenticated: false, rated: false });
    const { data: existing, error: ratingError } = await service
      .from("game_play_events")
      .select("id")
      .eq("game_slug", "the-lost-sizzler")
      .eq("event_type", "rating_submitted")
      .eq("auth_user_id", authUserId)
      .limit(1)
      .maybeSingle();
    if (ratingError) return json(req, { success: false, error: "Rating status could not be checked" }, 500);
    return json(req, { success: true, authenticated: true, rated: Boolean(existing?.id) });
  }

  if (action === "telemetry") {
    const eventType = text(payload.event_type).toLowerCase();
    if (!TELEMETRY_EVENTS.has(eventType)) return json(req, { success: false, error: "Unknown telemetry event" }, 400);
    const limit = eventType === "client_error" ? CLIENT_ERROR_LIMIT : TELEMETRY_LIMIT;
    const windowSeconds = eventType === "client_error" ? CLIENT_ERROR_WINDOW_SECONDS : TELEMETRY_WINDOW_SECONDS;
    const limited = await budgetOrResponse(req, service, `telemetry:${eventType === "client_error" ? "error" : "game"}:${fingerprint}`, limit, windowSeconds);
    if (limited) return limited;

    const rawDevice = text(payload.device_type).toLowerCase();
    const deviceType = DEVICE_TYPES.has(rawDevice) ? rawDevice : "unknown";
    const playerName = text(payload.player_name).slice(0, 40);
    const playMode = text(payload.play_mode).slice(0, 40);
    const sessionToken = text(payload.session_token).slice(0, 100);
    const build = text(payload.build).slice(0, 40);
    const pageUrl = text(payload.page_url).slice(0, 500);
    const ratingValue = Number(payload.rating);
    const rating = Number.isInteger(ratingValue) && ratingValue >= 1 && ratingValue <= 5 ? ratingValue : null;
    const metadata = telemetryMetadata(payload.metadata, eventType);

    if (eventType === "rating_submitted" && rating === null) return json(req, { success: false, error: "Rating must be between 1 and 5" }, 400);
    if (eventType === "client_error" && !metadata?.error_fingerprint) return json(req, { success: false, error: "Client error fingerprint required" }, 400);

    const authUserId = await authenticatedUserId(req, service);

    const { data: row, error: insertError } = await service.from("game_play_events").insert({
      game_slug: "the-lost-sizzler",
      event_type: eventType,
      player_name: playerName || null,
      play_mode: playMode || null,
      device_type: deviceType,
      rating: eventType === "rating_submitted" ? rating : null,
      session_token: sessionToken || null,
      auth_user_id: authUserId,
      build: build || null,
      page_url: pageUrl || null,
      user_agent: text(req.headers.get("user-agent")).slice(0, 500),
      metadata
    }).select("id").single();

    if (insertError || !row?.id) return json(req, { success: false, error: "Play event could not be saved" }, 500);
    await maybePruneTelemetry(service);
    return json(req, { success: true, id: row.id });
  }

  const feedbackType = text(payload.type).toLowerCase() === "suggestion" ? "suggestion" : "bug";
  const message = text(payload.message);
  const contactEmail = text(payload.email);
  const honeypot = text(payload.website);
  const build = text(payload.build).slice(0, 40);
  const pageUrl = text(payload.page_url).slice(0, 500);

  if (honeypot) return json(req, { success: true });
  const limited = await budgetOrResponse(req, service, `feedback:${fingerprint}`, FEEDBACK_LIMIT, FEEDBACK_WINDOW_SECONDS);
  if (limited) return limited;
  if (message.length < 10 || message.length > 3000) return json(req, { success: false, error: "Feedback must be between 10 and 3000 characters" }, 400);
  if (contactEmail.length > 180 || !validEmail(contactEmail)) return json(req, { success: false, error: "Please enter a valid email address" }, 400);

  const resendKey = text(Deno.env.get("RESEND_API_KEY"));
  const rawFrom = text(Deno.env.get("EMAIL_FROM"));
  const bracketed = rawFrom.match(/<([^<>]+)>/);
  const fromAddress = text(bracketed?.[1] || rawFrom);
  const from = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromAddress) ? `CCG <${fromAddress}>` : "";

  const { data: row, error: insertError } = await service.from("game_feedback").insert({
    game_slug: "the-lost-sizzler",
    feedback_type: feedbackType,
    message,
    contact_email: contactEmail || null,
    page_url: pageUrl || null,
    build: build || null,
    user_agent: text(req.headers.get("user-agent")).slice(0, 500),
    email_status: "pending"
  }).select("id").single();

  if (insertError || !row?.id) return json(req, { success: false, error: "Feedback could not be saved" }, 500);

  let emailStatus: "sent" | "failed" = "failed";
  let emailError: string | null = null;
  if (resendKey && from) {
    const subject = `[The Lost Sizzler] ${feedbackType === "bug" ? "Bug report" : "Game suggestion"}`;
    const replyTo = contactEmail || text(Deno.env.get("EMAIL_REPLY_TO"));
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
    const body: Record<string, unknown> = {
      from,
      to: [DESTINATION],
      subject,
      html: `<h2>${escapeHtml(subject)}</h2><p>${safeMessage}</p><hr><p><strong>Build:</strong> ${escapeHtml(build || "unknown")}</p><p><strong>Page:</strong> ${escapeHtml(pageUrl || "unknown")}</p><p><strong>Contact email:</strong> ${escapeHtml(contactEmail || "not supplied")}</p><p><strong>Feedback ID:</strong> ${row.id}</p>`,
      text: `${subject}\n\n${message}\n\nBuild: ${build || "unknown"}\nPage: ${pageUrl || "unknown"}\nContact email: ${contactEmail || "not supplied"}\nFeedback ID: ${row.id}`
    };
    if (replyTo && validEmail(replyTo)) body.reply_to = replyTo;
    try {
      const response = await fetch(RESEND_ENDPOINT, { method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 300)}`);
      emailStatus = "sent";
    } catch (error) {
      emailStatus = "failed";
      emailError = error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000);
    }
  } else {
    emailStatus = "failed";
    emailError = "RESEND_API_KEY or EMAIL_FROM missing";
  }

  await service.from("game_feedback").update({ email_status: emailStatus, email_error: emailError }).eq("id", row.id);
  return json(req, { success: true, id: row.id, email_status: emailStatus });
});
