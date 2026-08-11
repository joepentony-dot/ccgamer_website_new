import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const SEARCH_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

type RequestBody = {
  action?: string;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const requestOrigin = text(req.headers.get("origin"));
  if (requestOrigin && requestOrigin !== ALLOWED_ORIGIN) {
    return json({ success: false, error: "Origin not allowed" }, 403);
  }

  const supabaseUrl = text(Deno.env.get("SUPABASE_URL"));
  const anonKey = text(Deno.env.get("SUPABASE_ANON_KEY"));
  const serviceKey = text(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const oauthClientId = text(Deno.env.get("GSC_OAUTH_CLIENT_ID"));
  const siteUrl = text(Deno.env.get("GSC_SITE_URL"));

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ success: false, error: "Supabase function environment is incomplete" }, 500);
  }

  const authHeader = text(req.headers.get("authorization"));
  const apikey = text(req.headers.get("apikey"));
  if (!apikey || !authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ success: false, error: "Administrator session is required" }, 401);
  }

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, authorization: authHeader },
  });
  if (!authResponse.ok) return json({ success: false, error: "Invalid administrator session" }, 401);

  const authUser = await authResponse.json().catch(() => null);
  const actorId = text(authUser?.id);
  if (!actorId) return json({ success: false, error: "Invalid administrator account" }, 401);

  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", actorId)
    .maybeSingle();
  if (profileError) return json({ success: false, error: "Administrator profile lookup failed" }, 500);

  const role = text(profile?.role).toLowerCase();
  if (!["admin", "superadmin"].includes(role)) return json({ success: false, error: "Forbidden" }, 403);

  let body: RequestBody = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action = text(body.action || "config").toLowerCase();
  if (action !== "config") {
    return json({
      success: false,
      error: "Google Search Console data is fetched directly by the administrator browser using a short-lived read-only OAuth token. This Edge Function exposes configuration only.",
    }, 400);
  }

  const missing = [
    !oauthClientId ? "GSC_OAUTH_CLIENT_ID" : "",
    !siteUrl ? "GSC_SITE_URL" : "",
  ].filter(Boolean);

  return json({
    success: true,
    configured: missing.length === 0,
    oauthClientId,
    siteUrl,
    scope: SEARCH_SCOPE,
    missing,
    authMode: "google-identity-services-token",
    tokenStorage: "browser-memory-only",
  });
});
