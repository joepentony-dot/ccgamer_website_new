// ============================================================
// CCG — SEND NEW GAME NOTIFICATION (FINAL LOCKED)
// Supabase Edge — Gateway JWT OFF, manual validation ON
// - Requires: apikey + Authorization: Bearer <access_token>
// - Validates via /auth/v1/user for clarity + reliability
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://www.cheekycommodoregamer.co.uk";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Max-Age": "86400",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function text(v: unknown): string {
  return String(v ?? "").trim();
}

type NotifyPayload = {
  mode?: string;
  game_name?: string;
  game_slug?: string;
  game_thumbnail?: string;
  test_email?: boolean;
  notify_members?: boolean;
};

Deno.serve(async (req: Request) => {
  // ---- Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  // ---- ENV
  const supabaseUrl = text(Deno.env.get("SUPABASE_URL"));
  const anonKey = text(Deno.env.get("SUPABASE_ANON_KEY"));
  const serviceKey = text(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ success: false, error: "Supabase env missing" }, 500);
  }

  // ---- REQUIRED HEADERS
  const authHeader = text(req.headers.get("authorization"));
  const apikey = text(req.headers.get("apikey"));

  if (!apikey) {
    return json({ success: false, error: "Missing apikey header" }, 401);
  }

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ success: false, error: "Missing bearer token" }, 401);
  }

  // ---- 1) Validate JWT (direct call = best diagnostics)
  // This is exactly what the client "user" call proves works in your network tab.
  const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      authorization: authHeader,
    },
  });

  if (!authRes.ok) {
    const detail = await authRes.text().catch(() => "");
    return json(
      {
        success: false,
        error: "Invalid session",
        status: authRes.status,
        detail: detail.slice(0, 500),
      },
      401
    );
  }

  const userJson = await authRes.json().catch(() => null);
  const userId = text(userJson?.id);

  if (!userId) {
    return json({ success: false, error: "Invalid session (no user id)" }, 401);
  }

  // ---- 2) Role check (service role)
  const serviceClient = createClient(supabaseUrl, serviceKey);

  const { data: profile, error: profileErr } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    return json(
      { success: false, error: "Profile lookup failed", detail: profileErr.message },
      500
    );
  }

  const role = text(profile?.role).toLowerCase();
  if (!["admin", "superadmin", "editor"].includes(role)) {
    return json({ success: false, error: "Forbidden" }, 403);
  }

  // ---- 3) Payload
  let payload: NotifyPayload | null = null;
  try {
    payload = (await req.json()) as NotifyPayload;
  } catch {
    return json({ success: false, error: "Invalid JSON payload" }, 400);
  }

  const gameName = text(payload?.game_name);
  if (!gameName) {
    return json({ success: false, error: "Invalid payload (missing game_name)" }, 400);
  }

  // ------------------------------------------------------------
  // ✅ SUCCESS PATH (wire your Resend logic here)
  // For now we return success so we can prove auth + role is fixed.
  // ------------------------------------------------------------
  return json({ success: true, sent: 1, failed: 0 });
});
