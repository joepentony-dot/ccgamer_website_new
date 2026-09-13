import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const ALLOWED_ORIGINS = new Set([
  "https://www.cheekycommodoregamer.co.uk",
  "https://cheekycommodoregamer.co.uk"
]);
const PRODUCT_SLUG = "c64-dungeon-carnage";
const SITE_URL = "https://www.cheekycommodoregamer.co.uk";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || firstSecretKey(Deno.env.get("SUPABASE_SECRET_KEYS"));
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
const PAYPAL_ENVIRONMENT = String(Deno.env.get("PAYPAL_ENVIRONMENT") || "").toLowerCase();

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
function paypalBaseUrl() {
  if (PAYPAL_ENVIRONMENT === "live") return "https://api-m.paypal.com";
  if (PAYPAL_ENVIRONMENT === "sandbox") return "https://api-m.sandbox.paypal.com";
  return "";
}
function paypalConfigured() {
  return Boolean(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET && paypalBaseUrl());
}
function priceValue(amountPence: number) {
  return (Number(amountPence) / 100).toFixed(2);
}
function moneyToPence(value: unknown) {
  const text = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return NaN;
  const [whole, decimals = ""] = text.split(".");
  return Number(whole) * 100 + Number((decimals + "00").slice(0, 2));
}
async function paypalAccessToken() {
  const base = paypalBaseUrl();
  if (!base || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) throw new Error("paypal_not_configured");
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: "grant_type=client_credentials"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.access_token) throw new Error(`paypal_oauth_${response.status}`);
  return String(data.access_token);
}
async function paypalFetch(path: string, init: RequestInit = {}) {
  const token = await paypalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(init.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(String(data?.message || data?.name || `paypal_http_${response.status}`));
    (error as Error & { status?: number; data?: unknown }).status = response.status;
    (error as Error & { status?: number; data?: unknown }).data = data;
    throw error;
  }
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { ok: false, error: "Method not allowed" }, 405);
  if (!sameSiteOrigin(req)) return json(req, { ok: false, error: "Origin not allowed" }, 403);
  if (!SUPABASE_URL || !SERVICE_KEY) return json(req, { ok: false, error: "Commerce service is not configured" }, 503);

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { return json(req, { ok: false, error: "Invalid JSON" }, 400); }
  const action = String(payload.action || "status").toLowerCase();
  if (!["status", "create_checkout", "capture_checkout", "download"].includes(action)) return json(req, { ok: false, error: "Unknown action" }, 400);

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
      product: { slug: product.slug, name: product.name, displayPrice: `£${priceValue(Number(product.amount_pence))}`, currency: product.currency },
      checkoutConfigured: paypalConfigured(),
      paymentProvider: "paypal",
      paymentEnvironment: PAYPAL_ENVIRONMENT || "unconfigured",
      downloadReady: Boolean(product.download_ready)
    });
  }

  if (!user) return json(req, { ok: false, error: "Sign in with your CCG website account first", code: "authentication_required" }, 401);

  let owned = null;
  try { owned = await entitlement(); } catch { return json(req, { ok: false, error: "Ownership check is temporarily unavailable" }, 503); }

  if (action === "create_checkout") {
    if (owned) return json(req, { ok: true, entitled: true, alreadyOwned: true });
    if (!paypalConfigured()) return json(req, { ok: false, error: "PayPal Checkout is awaiting secure account configuration", code: "checkout_not_configured" }, 503);

    try {
      const currency = String(product.currency || "gbp").toUpperCase();
      const value = priceValue(Number(product.amount_pence));
      const order = await paypalFetch("/v2/checkout/orders", {
        method: "POST",
        headers: {
          "Prefer": "return=representation",
          "PayPal-Request-Id": crypto.randomUUID()
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            reference_id: PRODUCT_SLUG,
            custom_id: user.id,
            description: "C64 Dungeon Carnage permanent unlock",
            amount: { currency_code: currency, value }
          }],
          payment_source: {
            paypal: {
              experience_context: {
                brand_name: "Cheeky Commodore Gamer",
                locale: "en-GB",
                landing_page: "LOGIN",
                shipping_preference: "NO_SHIPPING",
                user_action: "PAY_NOW",
                return_url: `${SITE_URL}/arcade/lost-sizzler/?purchase=success`,
                cancel_url: `${SITE_URL}/arcade/lost-sizzler/?purchase=cancel`
              }
            }
          }
        })
      });
      const orderId = String(order?.id || "");
      const checkoutUrl = String((order?.links || []).find((link: { rel?: string; href?: string }) => link?.rel === "payer-action" || link?.rel === "approve")?.href || "");
      if (!orderId || !checkoutUrl) throw new Error("paypal_checkout_url_missing");

      const { error: insertError } = await service.from("ccg_checkout_sessions").upsert({
        session_id: orderId,
        user_id: user.id,
        product_slug: PRODUCT_SLUG,
        provider: "paypal",
        paypal_order_id: orderId,
        status: "created",
        amount_total: Number(product.amount_pence),
        currency: currency.toLowerCase(),
        updated_at: new Date().toISOString()
      }, { onConflict: "session_id" });
      if (insertError) throw insertError;
      return json(req, { ok: true, checkoutUrl, orderId });
    } catch (error) {
      console.error("[CCG commerce] PayPal order creation failed", error);
      return json(req, { ok: false, error: "Unable to open secure PayPal checkout right now", code: "checkout_failed" }, 503);
    }
  }

  if (action === "capture_checkout") {
    if (owned) return json(req, { ok: true, entitled: true, alreadyOwned: true });
    if (!paypalConfigured()) return json(req, { ok: false, error: "PayPal Checkout is awaiting secure account configuration", code: "checkout_not_configured" }, 503);
    const orderId = String(payload.orderId || "").trim();
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(orderId)) return json(req, { ok: false, error: "Invalid PayPal order reference", code: "invalid_order" }, 400);

    const { data: sessionRow, error: sessionError } = await service
      .from("ccg_checkout_sessions")
      .select("session_id,user_id,product_slug,status,amount_total,currency,paypal_order_id,paypal_capture_id")
      .eq("paypal_order_id", orderId)
      .eq("user_id", user.id)
      .eq("product_slug", PRODUCT_SLUG)
      .maybeSingle();
    if (sessionError || !sessionRow) return json(req, { ok: false, error: "This PayPal order is not attached to the signed-in CCG account", code: "order_not_found" }, 404);
    if (sessionRow.status === "complete") {
      const active = await entitlement().catch(() => null);
      return json(req, { ok: true, entitled: Boolean(active), alreadyCaptured: true, orderId, captureId: sessionRow.paypal_capture_id || null });
    }

    try {
      const captured = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
        method: "POST",
        headers: {
          "Prefer": "return=representation",
          "PayPal-Request-Id": `capture-${orderId}`.slice(0, 38)
        },
        body: "{}"
      });
      const unit = captured?.purchase_units?.[0];
      const capture = unit?.payments?.captures?.[0];
      const amount = capture?.amount || unit?.amount || {};
      const expectedCurrency = String(product.currency || "gbp").toUpperCase();
      if (String(captured?.id || "") !== orderId || String(captured?.status || "").toUpperCase() !== "COMPLETED") throw new Error("paypal_order_not_completed");
      if (!capture?.id || String(capture?.status || "").toUpperCase() !== "COMPLETED") throw new Error("paypal_capture_not_completed");
      if (String(amount?.currency_code || "").toUpperCase() !== expectedCurrency) throw new Error("paypal_currency_mismatch");
      if (moneyToPence(amount?.value) !== Number(product.amount_pence)) throw new Error("paypal_amount_mismatch");

      const now = new Date().toISOString();
      const purchasedAt = String(capture?.create_time || now);
      const { error: entitlementError } = await service.from("ccg_product_entitlements").upsert({
        user_id: user.id,
        product_slug: PRODUCT_SLUG,
        status: "active",
        source: "paypal",
        paypal_order_id: orderId,
        paypal_capture_id: String(capture.id),
        purchased_at: purchasedAt,
        revoked_at: null,
        updated_at: now
      }, { onConflict: "user_id,product_slug" });
      if (entitlementError) throw entitlementError;

      const { error: updateError } = await service.from("ccg_checkout_sessions").update({
        status: "complete",
        paypal_capture_id: String(capture.id),
        amount_total: Number(product.amount_pence),
        currency: expectedCurrency.toLowerCase(),
        updated_at: now
      }).eq("paypal_order_id", orderId).eq("user_id", user.id);
      if (updateError) throw updateError;

      return json(req, { ok: true, entitled: true, orderId, captureId: String(capture.id) });
    } catch (error) {
      console.error("[CCG commerce] PayPal capture failed", orderId, error);
      const { data: current } = await service.from("ccg_checkout_sessions").select("status,paypal_capture_id").eq("paypal_order_id", orderId).eq("user_id", user.id).maybeSingle();
      const active = await entitlement().catch(() => null);
      if (current?.status === "complete" && active) return json(req, { ok: true, entitled: true, alreadyCaptured: true, orderId, captureId: current.paypal_capture_id || null });
      return json(req, { ok: false, error: "PayPal approved the return, but the payment could not be confirmed yet", code: "capture_failed" }, 503);
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
