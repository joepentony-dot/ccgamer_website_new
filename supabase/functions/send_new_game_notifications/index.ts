import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// -----------------------------------------------------------------------------
// CORS (MUST be first and unconditional)
// -----------------------------------------------------------------------------
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://www.cheekycommodoregamer.co.uk",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "86400"
};

// -----------------------------------------------------------------------------
// Environment
// -----------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = (Deno.env.get("SITE_URL") || "https://www.cheekycommodoregamer.co.uk").replace(/\/$/, "");
const TEST_EMAIL = Deno.env.get("TEST_EMAIL") || "joepentony@hotmail.com";

// -----------------------------------------------------------------------------
// Server
// -----------------------------------------------------------------------------
Deno.serve(async (req) => {
  // 1️⃣ PRE-FLIGHT — this is what was breaking
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // 2️⃣ Always return JSON + CORS
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed" }),
        { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      mode,
      game_name,
      game_slug,
      test_email
    } = body || {};

    if (!mode || !game_name) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing required payload" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // 3️⃣ Admin auth (manual, JWT verify OFF by design)
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing bearer token" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4️⃣ TEST EMAIL MODE (admin-only)
    if (test_email === true) {
      console.log("[TEST EMAIL] Sending Coming Soon test to", TEST_EMAIL);

      return new Response(
        JSON.stringify({
          ok: true,
          mode: "test",
          sent_to: TEST_EMAIL,
          game_name,
          preview_url: `${SITE_URL}/games/${game_slug || ""}`
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // 5️⃣ COMING SOON (real notification placeholder)
    console.log("[COMING SOON]", game_name);

    return new Response(
      JSON.stringify({
        ok: true,
        mode: "coming_soon",
        game_name,
        url: `${SITE_URL}/games/${game_slug || ""}`
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[EDGE ERROR]", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});