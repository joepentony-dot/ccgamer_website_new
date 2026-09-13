import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import Stripe from "npm:stripe@22.6.2";

const PRODUCT_SLUG = "c64-dungeon-carnage";
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
function text(message: string, status = 200) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return text("Method not allowed", 405);
  if (!SUPABASE_URL || !SERVICE_KEY || !STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) return text("Webhook not configured", 503);

  const signature = req.headers.get("stripe-signature") || "";
  if (!signature) return text("Missing Stripe signature", 400);
  const body = await req.text();
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const cryptoProvider = Stripe.createSubtleCryptoProvider();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET, undefined, cryptoProvider);
  } catch (error) {
    console.error("[CCG Stripe webhook] signature verification failed", error);
    return text("Bad signature", 400);
  }

  const service = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: duplicate } = await service.from("ccg_stripe_webhook_events").select("event_id").eq("event_id", event.id).maybeSingle();
  if (duplicate) return text("Already processed", 200);

  async function product() {
    const { data, error } = await service.from("ccg_products").select("slug,currency,amount_pence,active").eq("slug", PRODUCT_SLUG).maybeSingle();
    if (error || !data || !data.active) throw new Error("product_unavailable");
    return data;
  }
  async function record(objectId = "") {
    const { error } = await service.from("ccg_stripe_webhook_events").insert({ event_id: event.id, event_type: event.type, object_id: objectId || null, livemode: Boolean(event.livemode) });
    if (error && error.code !== "23505") throw error;
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") return text("Payment not complete", 202);
      const expected = await product();
      const userId = String(session.metadata?.user_id || "");
      const productSlug = String(session.metadata?.product_slug || "");
      if (!userId || productSlug !== PRODUCT_SLUG || session.client_reference_id !== userId) throw new Error("checkout_metadata_mismatch");
      if (String(session.currency || "").toLowerCase() !== String(expected.currency || "gbp").toLowerCase()) throw new Error("checkout_currency_mismatch");
      if (Number(session.amount_total) !== Number(expected.amount_pence)) throw new Error("checkout_amount_mismatch");
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null;
      const now = new Date().toISOString();

      const { error: entitlementError } = await service.from("ccg_product_entitlements").upsert({
        user_id: userId,
        product_slug: PRODUCT_SLUG,
        status: "active",
        source: "stripe",
        stripe_customer_id: customerId,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        purchased_at: now,
        revoked_at: null,
        updated_at: now
      }, { onConflict: "user_id,product_slug" });
      if (entitlementError) throw entitlementError;

      const { error: sessionError } = await service.from("ccg_checkout_sessions").upsert({
        session_id: session.id,
        user_id: userId,
        product_slug: PRODUCT_SLUG,
        stripe_payment_intent_id: paymentIntentId,
        status: "complete",
        amount_total: session.amount_total,
        currency: session.currency,
        updated_at: now
      }, { onConflict: "session_id" });
      if (sessionError) throw sessionError;
      await record(session.id);
      return text("Entitlement granted", 200);
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      await service.from("ccg_checkout_sessions").update({ status: "expired", updated_at: new Date().toISOString() }).eq("session_id", session.id);
      await record(session.id);
      return text("Checkout expired", 200);
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id || "";
      if (paymentIntentId && Number(charge.amount_refunded || 0) >= Number(charge.amount || 0)) {
        const now = new Date().toISOString();
        await service.from("ccg_product_entitlements").update({ status: "refunded", revoked_at: now, updated_at: now }).eq("stripe_payment_intent_id", paymentIntentId);
        await service.from("ccg_checkout_sessions").update({ status: "refunded", updated_at: now }).eq("stripe_payment_intent_id", paymentIntentId);
      }
      await record(charge.id);
      return text("Refund handled", 200);
    }

    if (event.type === "charge.dispute.created") {
      const dispute = event.data.object as Stripe.Dispute;
      const paymentIntentId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id || "";
      if (paymentIntentId) {
        const now = new Date().toISOString();
        await service.from("ccg_product_entitlements").update({ status: "disputed", revoked_at: now, updated_at: now }).eq("stripe_payment_intent_id", paymentIntentId);
        await service.from("ccg_checkout_sessions").update({ status: "disputed", updated_at: now }).eq("stripe_payment_intent_id", paymentIntentId);
      }
      await record(dispute.id);
      return text("Dispute handled", 200);
    }

    await record(String((event.data.object as { id?: string })?.id || ""));
    return text("Ignored", 200);
  } catch (error) {
    console.error("[CCG Stripe webhook] processing failed", event.id, event.type, error);
    return text("Processing failed", 500);
  }
});
