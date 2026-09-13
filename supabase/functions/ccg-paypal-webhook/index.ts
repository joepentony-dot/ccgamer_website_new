import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const PRODUCT_SLUG = "c64-dungeon-carnage";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || firstSecretKey(Deno.env.get("SUPABASE_SECRET_KEYS"));
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
const PAYPAL_WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID") || "";
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
function text(message: string, status = 200) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
function paypalBaseUrl() {
  if (PAYPAL_ENVIRONMENT === "live") return "https://api-m.paypal.com";
  if (PAYPAL_ENVIRONMENT === "sandbox") return "https://api-m.sandbox.paypal.com";
  return "";
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
async function verifyWebhook(req: Request, event: Record<string, unknown>) {
  const token = await paypalAccessToken();
  const body = {
    auth_algo: req.headers.get("paypal-auth-algo") || "",
    cert_url: req.headers.get("paypal-cert-url") || "",
    transmission_id: req.headers.get("paypal-transmission-id") || "",
    transmission_sig: req.headers.get("paypal-transmission-sig") || "",
    transmission_time: req.headers.get("paypal-transmission-time") || "",
    webhook_id: PAYPAL_WEBHOOK_ID,
    webhook_event: event
  };
  if (!body.auth_algo || !body.cert_url || !body.transmission_id || !body.transmission_sig || !body.transmission_time) return false;
  const response = await fetch(`${paypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  return response.ok && String(data?.verification_status || "").toUpperCase() === "SUCCESS";
}
function relatedIds(resource: any) {
  return resource?.supplementary_data?.related_ids || {};
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return text("Method not allowed", 405);
  if (!SUPABASE_URL || !SERVICE_KEY || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_WEBHOOK_ID || !paypalBaseUrl()) return text("Webhook not configured", 503);

  let event: Record<string, any>;
  try { event = await req.json(); } catch { return text("Invalid JSON", 400); }
  try {
    if (!(await verifyWebhook(req, event))) return text("Bad signature", 400);
  } catch (error) {
    console.error("[CCG PayPal webhook] signature verification failed", error);
    return text("Bad signature", 400);
  }

  const eventId = String(event?.id || "");
  const eventType = String(event?.event_type || "");
  if (!eventId || !eventType) return text("Invalid event", 400);

  const service = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: duplicate } = await service.from("ccg_paypal_webhook_events").select("event_id").eq("event_id", eventId).maybeSingle();
  if (duplicate) return text("Already processed", 200);

  async function product() {
    const { data, error } = await service.from("ccg_products").select("slug,currency,amount_pence,active").eq("slug", PRODUCT_SLUG).maybeSingle();
    if (error || !data || !data.active) throw new Error("product_unavailable");
    return data;
  }
  async function record(resourceId = "") {
    const { error } = await service.from("ccg_paypal_webhook_events").insert({ event_id: eventId, event_type: eventType, resource_id: resourceId || null });
    if (error && error.code !== "23505") throw error;
  }
  async function sessionForOrder(orderId: string) {
    if (!orderId) return null;
    const { data, error } = await service.from("ccg_checkout_sessions")
      .select("session_id,user_id,product_slug,status,amount_total,currency,paypal_order_id,paypal_capture_id")
      .eq("paypal_order_id", orderId)
      .eq("product_slug", PRODUCT_SLUG)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  async function grantFromCapture(resource: any) {
    const expected = await product();
    const orderId = String(relatedIds(resource).order_id || "");
    const captureId = String(resource?.id || "");
    const session = await sessionForOrder(orderId);
    if (!session || !captureId) throw new Error("paypal_capture_session_missing");
    if (String(resource?.status || "").toUpperCase() !== "COMPLETED") throw new Error("paypal_capture_not_completed");
    if (String(resource?.amount?.currency_code || "").toLowerCase() !== String(expected.currency || "gbp").toLowerCase()) throw new Error("paypal_currency_mismatch");
    if (moneyToPence(resource?.amount?.value) !== Number(expected.amount_pence)) throw new Error("paypal_amount_mismatch");
    if (Number(session.amount_total) !== Number(expected.amount_pence)) throw new Error("checkout_amount_mismatch");
    if (String(session.currency || "").toLowerCase() !== String(expected.currency || "gbp").toLowerCase()) throw new Error("checkout_currency_mismatch");

    const now = new Date().toISOString();
    const purchasedAt = String(resource?.create_time || now);
    const { error: entitlementError } = await service.from("ccg_product_entitlements").upsert({
      user_id: session.user_id,
      product_slug: PRODUCT_SLUG,
      status: "active",
      source: "paypal",
      paypal_order_id: orderId,
      paypal_capture_id: captureId,
      purchased_at: purchasedAt,
      revoked_at: null,
      updated_at: now
    }, { onConflict: "user_id,product_slug" });
    if (entitlementError) throw entitlementError;

    const { error: sessionError } = await service.from("ccg_checkout_sessions").update({
      provider: "paypal",
      status: "complete",
      paypal_capture_id: captureId,
      updated_at: now
    }).eq("paypal_order_id", orderId);
    if (sessionError) throw sessionError;
  }
  async function revokeByCapture(captureId: string, status: "refunded" | "disputed" | "revoked") {
    if (!captureId) return;
    const now = new Date().toISOString();
    await service.from("ccg_product_entitlements").update({ status, revoked_at: now, updated_at: now }).eq("paypal_capture_id", captureId);
    await service.from("ccg_checkout_sessions").update({ status: status === "revoked" ? "failed" : status, updated_at: now }).eq("paypal_capture_id", captureId);
  }

  try {
    const resource = event?.resource || {};

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      await grantFromCapture(resource);
      await record(String(resource?.id || ""));
      return text("Entitlement granted", 200);
    }

    if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
      const captureId = String(relatedIds(resource).capture_id || "");
      await revokeByCapture(captureId, "refunded");
      await record(String(resource?.id || captureId));
      return text("Refund handled", 200);
    }

    if (eventType === "PAYMENT.CAPTURE.REVERSED") {
      const captureId = String(resource?.id || relatedIds(resource).capture_id || "");
      await revokeByCapture(captureId, "revoked");
      await record(captureId);
      return text("Reversal handled", 200);
    }

    if (eventType === "CUSTOMER.DISPUTE.CREATED") {
      const transaction = Array.isArray(resource?.disputed_transactions) ? resource.disputed_transactions[0] : null;
      const captureId = String(transaction?.seller_transaction_id || transaction?.buyer_transaction_id || "");
      await revokeByCapture(captureId, "disputed");
      await record(String(resource?.dispute_id || resource?.id || captureId));
      return text("Dispute handled", 200);
    }

    if (eventType === "PAYMENT.CAPTURE.DENIED") {
      const orderId = String(relatedIds(resource).order_id || "");
      if (orderId) await service.from("ccg_checkout_sessions").update({ status: "failed", updated_at: new Date().toISOString() }).eq("paypal_order_id", orderId);
      await record(String(resource?.id || orderId));
      return text("Denied capture handled", 200);
    }

    await record(String(resource?.id || ""));
    return text("Ignored", 200);
  } catch (error) {
    console.error("[CCG PayPal webhook] processing failed", eventId, eventType, error);
    return text("Processing failed", 500);
  }
});
