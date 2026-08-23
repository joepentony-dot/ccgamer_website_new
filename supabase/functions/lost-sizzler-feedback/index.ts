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
  "mobile_pc_notice_accept",
  "rating_submitted",
  "rating_dismissed"
]);
const DEVICE_TYPES = new Set(["desktop", "mobile", "tablet", "unknown"]);

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
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}
function text(value: unknown) { return String(value ?? "").trim(); }
function validEmail(value: string) { return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
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

  if (action === "telemetry") {
    const eventType = text(payload.event_type).toLowerCase();
    const rawDevice = text(payload.device_type).toLowerCase();
    const deviceType = DEVICE_TYPES.has(rawDevice) ? rawDevice : "unknown";
    const playerName = text(payload.player_name).slice(0, 40);
    const playMode = text(payload.play_mode).slice(0, 40);
    const sessionToken = text(payload.session_token).slice(0, 100);
    const build = text(payload.build).slice(0, 40);
    const pageUrl = text(payload.page_url).slice(0, 500);
    const ratingValue = Number(payload.rating);
    const rating = Number.isInteger(ratingValue) && ratingValue >= 1 && ratingValue <= 5 ? ratingValue : null;

    if (!TELEMETRY_EVENTS.has(eventType)) return json(req, { success: false, error: "Unknown telemetry event" }, 400);
    if (eventType === "rating_submitted" && rating === null) return json(req, { success: false, error: "Rating must be between 1 and 5" }, 400);

    let authUserId: string | null = null;
    const authHeader = text(req.headers.get("authorization"));
    const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1] || "";
    if (bearer) {
      try {
        const { data } = await service.auth.getUser(bearer);
        authUserId = data?.user?.id || null;
      } catch {
        authUserId = null;
      }
    }

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
      user_agent: text(req.headers.get("user-agent")).slice(0, 500)
    }).select("id").single();

    if (insertError || !row?.id) return json(req, { success: false, error: "Play event could not be saved" }, 500);
    return json(req, { success: true, id: row.id });
  }

  const feedbackType = text(payload.type).toLowerCase() === "suggestion" ? "suggestion" : "bug";
  const message = text(payload.message);
  const contactEmail = text(payload.email);
  const honeypot = text(payload.website);
  const build = text(payload.build).slice(0, 40);
  const pageUrl = text(payload.page_url).slice(0, 500);

  if (honeypot) return json(req, { success: true });
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
