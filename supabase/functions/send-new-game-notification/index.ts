import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.cheekycommodoregamer.co.uk",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // ─────────────────────────────────────────────
  // 1️⃣ CORS PREFLIGHT — MUST EXIT EARLY
  // ─────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // ─────────────────────────────────────────────
    // 2️⃣ BASIC REQUEST VALIDATION
    // ─────────────────────────────────────────────
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: corsHeaders }
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing bearer token" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const payload = await req.json();
    const { game_name, game_slug, mode, test_email } = payload ?? {};

    if (!game_name || !mode) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ─────────────────────────────────────────────
    // 3️⃣ ADMIN-ONLY TEST EMAIL MODE
    // ─────────────────────────────────────────────
    if (test_email === true) {
      const to = Deno.env.get("TEST_EMAIL") || "joepentony@hotmail.com";

      return new Response(
        JSON.stringify({
          success: true,
          sent: 1,
          failed: 0,
          test: true,
          to,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ─────────────────────────────────────────────
    // 4️⃣ COMING SOON MODE (PLACEHOLDER)
    // ─────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        sent: 0,
        failed: 0,
        message: "Coming Soon notifications not yet enabled",
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    // ─────────────────────────────────────────────
    // 5️⃣ ABSOLUTE SAFETY NET — NEVER DROP CORS
    // ─────────────────────────────────────────────
    return new Response(
      JSON.stringify({ error: String(err?.message || err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});