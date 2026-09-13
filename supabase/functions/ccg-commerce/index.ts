import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import Stripe from "npm:stripe@22.6.2";

const ALLOWED_ORIGINS = new Set([
  "https://www.cheekycommodoregamer.co.uk",
  "https://cheekycommodoregamer.co.uk"
]);
const PRODUCT_SLUG = "c64-dungeon-carnage";
const SITE_URL = "https://www.cheekycommodoregamer.co.uk";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || firstSecretKey(Deno.env.get("SUPABASE_SECRET_KEYS"));
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

function firstSecretKey(raw: string | undefined) {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.default) return String(parsed.default);
    const value = Object.values(parsed || {}).find(Boolean);
    return value ? String(value) : "";
  } catch { return ""; }
}
function originFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  return ALLOWED_ORIGINS.has(origin) ? origin : SITE_URL;
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
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function bearer(req: Request) {
  return String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
}
function sameSiteOrigin(req: Request) {
  const origin = String(req.headers.get("origin") || "").trim();
  return !origin || ALLOWED_ORIGINS.has(origin);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { ok: false, error: "Method not allowed" }, 405);
  if (!sameSiteOrigin(req)) return json(req, { ok: false, error: "Origin not allowed" }, 403);
  if (!SUPABASE_URL || !SERVICE_KEY) return json(req, { ok: false, error: "Commerce service is not configured" }, 503);

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { return json(req, { ok: false, error: "Invalid JSON" }, 400); }
  const action = String(payload.action || "status").toLowerCase();
  if (!["status", "create_checkout", "download"].includes(action)) return json(req, { ok: false, error: "Unknown action" }, 400);

  const service = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = bearer(req);
  let user: { id: string; email?: string | null } | null = null;
  if (token) {
    const result = await service.auth.getUser(token);
    user = result.data?.user ? { id: result.data.user.id, email: result.data.user.email } : null;
  }

  const { data: product, error: productError } = await service
    .from("ccg_products")
    .select("slug,name,currency,amount_pence,download_bucket,download_path,download_ready,active")
    .eq("slug", PRODUCT_SLUG)
    .maybeSingle();
  if (productError || !product || !product.active) return json(req, { ok: false, error: "C64 Dungeon Carnage commerce product is unavailable" }, 503);

  async function entitlement() {
    if (!user) return null;
    const { data, error } = await service
      .from("ccg_product_entitlements")
      .select("status,purchased_at,updated_at")
      .eq("user_id", user.id)
      .eq("product_slug", PRODUCT_SLUG)
      .maybeSingle();
    if (error) throw error;
    return data && data.status === "active" ? data : null;
  }

  if (action === "status") {
    let owned = null;
    try { owned = await entitlement(); } catch { return json(req, { ok: false, error: "Ownership check is temporarily unavailable" }, 503); }
    return json(req, {
      ok: true,
      signedIn: Boolean(user),
      entitled: Boolean(owned),
      entitlement: owned,
      product: { slug: product.slug, name: product.name, displayPrice: `£${(Number(product.amount_pence) / 100).toFixed(2)}`, currency: product.currency },
      checkoutConfigured: Boolean(STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET),
      downloadReady: Boolean(product.download_ready)
    });
  }

  if (!user) return json(req, { ok: false, error: "Sign in with your CCG website account first", code: "authentication_required" }, 401);

  let owned = null;
  try { owned = await entitlement(); } catch { return json(req, { ok: false, error: "Ownership check is temporarily unavailable" }, 503); }

  if (action === "create_checkout") {
    if (owned) return json(req, { ok: true, entitled: true, alreadyOwned: true });
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) return json(req, { ok: false, error: "Stripe Checkout is awaiting secure account configuration", code: "checkout_not_configured" }, 503);

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    try {
      const metadata = { user_id: user.id, product_slug: PRODUCT_SLUG };
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${SITE_URL}/arcade/lost-sizzler/?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE_URL}/arcade/lost-sizzler/?purchase=cancel`,
        client_reference_id: user.id,
        customer_email: user.email || undefined,
        line_items: [{
          price_data: {
            currency: String(product.currency || "gbp").toLowerCase(),
            unit_amount: Number(product.amount_pence),
            product_data: { name: String(product.name), metadata: { product_slug: PRODUCT_SLUG } }
          },
          quantity: 1
        }],
        metadata,
        payment_intent_data: { metadata }
      });
      if (!session.url) throw new Error("checkout_url_missing");
      const { error: insertError } = await service.from("ccg_checkout_sessions").upsert({
        session_id: session.id,
        user_id: user.id,
        product_slug: PRODUCT_SLUG,
        status: "created",
        amount_total: session.amount_total ?? Number(product.amount_pence),
        currency: session.currency || String(product.currency || "gbp").toLowerCase(),
        updated_at: new Date().toISOString()
      }, { onConflict: "session_id" });
      if (insertError) throw insertError;
      return json(req, { ok: true, checkoutUrl: session.url, sessionId: session.id });
    } catch (error) {
      console.error("[CCG commerce] checkout creation failed", error);
      return json(req, { ok: false, error: "Unable to open secure checkout right now", code: "checkout_failed" }, 503);
    }
  }

  if (action === "download") {
    if (!owned) return json(req, { ok: false, error: "Permanent ownership is required for this download", code: "entitlement_required" }, 403);
    if (!product.download_ready || !product.download_bucket || !product.download_path) return json(req, { ok: false, error: "The downloadable build is not published yet", code: "download_not_ready" }, 409);
    const { data, error } = await service.storage.from(String(product.download_bucket)).createSignedUrl(String(product.download_path), 120, { download: "C64-Dungeon-Carnage.zip" });
    if (error || !data?.signedUrl) {
      console.error("[CCG commerce] signed download failed", error);
      return json(req, { ok: false, error: "The secure download could not be prepared", code: "download_failed" }, 503);
    }
    await service.from("ccg_download_audit").insert({ user_id: user.id, product_slug: PRODUCT_SLUG });
    return json(req, { ok: true, url: data.signedUrl, expiresIn: 120 });
  }

  return json(req, { ok: false, error: "Unknown action" }, 400);
});
