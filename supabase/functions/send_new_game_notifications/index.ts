import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = (Deno.env.get("SITE_URL") || "https://cheekycommodoregamer.co.uk").replace(/\/$/, "");
const TEST_EMAIL = Deno.env.get("TEST_EMAIL") || "joepentony@hotmail.com";

Deno.serve(async (req) => {
  const CORS = corsHeaders(req);

  // ✅ PRE-FLIGHT
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed" }),
        { status: 405, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json();
    const { mode, game_name, game_slug, test_email } = payload || {};

    if (!mode || !game_name) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing payload fields" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing bearer token" }),
        { status: 401, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); // reserved for later

    // 🧪 TEST EMAIL MODE
    if (test_email === true) {
      console.log("[TEST EMAIL]", TEST_EMAIL, game_name);

      return new Response(
        JSON.stringify({
          ok: true,
          mode: "test",
          sent_to: TEST_EMAIL,
          game_name,
          preview_url: `${SITE_URL}/games/${game_slug || ""}`
        }),
        { headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // 📣 COMING SOON MODE
    console.log("[COMING SOON]", game_name);

    return new Response(
      JSON.stringify({
        ok: true,
        mode: "coming_soon",
        game_name,
        url: `${SITE_URL}/games/${game_slug || ""}`
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[EDGE ERROR]", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});