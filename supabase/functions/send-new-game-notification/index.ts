// ============================================================
// CCG — SEND NEW GAME NOTIFICATION (LOCKED + DIAGNOSTICS)
// Supabase Edge — Manual JWT validation (anon validate + service ops)
// IMPORTANT: Client MUST send `apikey` + `Authorization: Bearer <access_token>`
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const config = { auth: false };

// -------------------- CORS --------------------

const ALLOWED_ORIGIN = "https://www.cheekycommodoregamer.co.uk";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function text(v: unknown): string {
  return String(v ?? "").trim();
}

// -------------------- Server ------------------

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed", request_id: requestId }, 405);
  }

  // ---- ENV
  const supabaseUrl = text(Deno.env.get("SUPABASE_URL"));
  const anonKey = text(Deno.env.get("SUPABASE_ANON_KEY"));
  const serviceKey = text(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json(
      {
        success: false,
        error: "Supabase env missing",
        request_id: requestId,
        debug: {
          has_url: !!supabaseUrl,
          has_anon: !!anonKey,
          has_service: !!serviceKey,
        },
      },
      500,
    );
  }

  // ---- HEADERS (what actually arrived?)
  const authHeaderRaw = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const apikeyRaw = req.headers.get("apikey") || req.headers.get("Apikey") || req.headers.get("APIKEY") || "";
  const xClientInfo = req.headers.get("x-client-info") || req.headers.get("X-Client-Info") || "";

  const authHeader = text(authHeaderRaw);
  const apikeyHeader = text(apikeyRaw);

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(
      {
        success: false,
        error: "Missing bearer token",
        request_id: requestId,
        debug: {
          received_authorization: authHeader ? "present_but_not_bearer" : "missing",
          received_apikey: apikeyHeader ? "present" : "missing",
          received_x_client_info: xClientInfo ? "present" : "missing",
        },
      },
      401,
    );
  }

  // ---- AUTH VALIDATE (ANON)
  // NOTE: We validate the incoming USER access token.
  // We do NOT rely on Edge function gateway auth.
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error: authErr } = await authClient.auth.getUser();

  if (authErr || !data?.user) {
    return json(
      {
        success: false,
        error: "Invalid session",
        request_id: requestId,
        debug: {
          auth_error_message: authErr?.message || null,
          auth_error_status: (authErr as any)?.status || null,
          // helpful: confirms your bearer actually arrived
          authorization_prefix: authHeader.slice(0, 20),
          apikey_present: !!apikeyHeader,
        },
      },
      401,
    );
  }

  const user = data.user;

  // ---- ROLE CHECK (SERVICE ROLE)
  const serviceClient = createClient(supabaseUrl, serviceKey);

  const { data: profile, error: profileErr } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    return json(
      {
        success: false,
        error: "Profile lookup failed",
        request_id: requestId,
        debug: { profile_error_message: profileErr.message || null },
      },
      500,
    );
  }

  const role = text(profile?.role).toLowerCase();
  if (!["admin", "superadmin", "editor"].includes(role)) {
    return json(
      {
        success: false,
        error: "Forbidden",
        request_id: requestId,
        debug: { role },
      },
      403,
    );
  }

  // ---- PAYLOAD
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON payload", request_id: requestId }, 400);
  }

  const gameName = text(payload?.game_name);
  if (!gameName) {
    return json({ success: false, error: "Invalid payload", request_id: requestId }, 400);
  }

  // ✅ Auth + role OK
  // (Your real Resend email send would run here.)
  return json({
    success: true,
    sent: 1,
    failed: 0,
    request_id: requestId,
    debug: {
      role,
      user_id: user.id,
      x_client_info: xClientInfo || null,
      apikey_present: !!apikeyHeader,
    },
  });
});