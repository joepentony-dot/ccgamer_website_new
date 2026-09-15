import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../../..");
const migration=fs.readFileSync(path.join(root,"supabase/migrations/20260913_ccg_dungeon_carnage_commerce.sql"),"utf8");
const paypalMigration=fs.readFileSync(path.join(root,"supabase/migrations/20260914_ccg_dungeon_carnage_paypal.sql"),"utf8");
const indexes=fs.readFileSync(path.join(root,"supabase/migrations/20260913_ccg_dungeon_carnage_commerce_indexes.sql"),"utf8");
const commerce=fs.readFileSync(path.join(root,"supabase/functions/ccg-commerce/index.ts"),"utf8");
const webhook=fs.readFileSync(path.join(root,"supabase/functions/ccg-paypal-webhook/index.ts"),"utf8");
const adapter=fs.readFileSync(path.join(root,"arcade/lost-sizzler/js/v10-42-paypal-commerce.js"),"utf8");
const config=fs.readFileSync(path.join(root,"supabase/config.toml"),"utf8");
const readme=fs.readFileSync(path.join(root,"supabase/functions/README-c64-dungeon-carnage-commerce.md"),"utf8");

for(const table of ["ccg_products","ccg_product_entitlements","ccg_checkout_sessions","ccg_stripe_webhook_events","ccg_download_audit"]){
  assert.match(migration,new RegExp(`alter table public\\.${table} enable row level security;`),`${table} must have RLS enabled`);
  assert.match(migration,new RegExp(`revoke all on table public\\.${table} from anon, authenticated;`),`${table} must not expose direct client privileges`);
}
assert.match(paypalMigration,/create table if not exists public\.ccg_paypal_webhook_events/,"PayPal webhook idempotency events must be versioned");
assert.match(paypalMigration,/alter table public\.ccg_paypal_webhook_events enable row level security;/,"PayPal webhook event table must have RLS enabled");
assert.match(paypalMigration,/revoke all on table public\.ccg_paypal_webhook_events from anon, authenticated;/,"PayPal webhook event table must not expose direct client privileges");
assert.match(paypalMigration,/add column if not exists paypal_order_id text/,"PayPal order identity must be persisted");
assert.match(paypalMigration,/add column if not exists paypal_capture_id text/,"PayPal capture identity must be persisted");
assert.match(migration,/values \('c64-dungeon-carnage','C64 Dungeon Carnage','gbp',199,/,"canonical product must stay £1.99 GBP");
assert.match(migration,/values \('ccg-paid-downloads','ccg-paid-downloads',false,/,"paid-download bucket must remain private");
assert.match(migration,/'c64-dungeon-carnage\/c64-dungeon-carnage\.zip',false,true\)/,"download must fail closed until a verified package is published");
for(const index of ["ccg_product_entitlements_product_slug_idx","ccg_checkout_sessions_product_slug_idx","ccg_download_audit_user_id_idx","ccg_download_audit_product_slug_idx"]){assert.match(indexes,new RegExp(index),`${index} must remain versioned`)}

assert.match(commerce,/service\.auth\.getUser\(token\)/,"commerce endpoint must authenticate bearer tokens server-side");
assert.match(commerce,/PAYPAL_CLIENT_ID/,"PayPal client ID must be loaded only by the server function");
assert.match(commerce,/PAYPAL_CLIENT_SECRET/,"PayPal client secret must be loaded only by the server function");
assert.match(commerce,/PAYPAL_ENVIRONMENT/,"PayPal environment must be explicit");
assert.match(commerce,/\/v1\/oauth2\/token/,"commerce must obtain PayPal OAuth tokens server-side");
assert.match(commerce,/\/v2\/checkout\/orders/,"commerce must create PayPal Orders v2 orders server-side");
assert.match(commerce,/intent: "CAPTURE"/,"PayPal checkout must remain a one-off capture payment");
assert.match(commerce,/custom_id: user\.id/,"PayPal order must bind the signed-in CCG user server-side");
assert.match(commerce,/amount: \{ currency_code: currency, value \}/,"PayPal price must come from the server product record");
assert.ok(commerce.includes('/capture`'),"approved PayPal orders must be captured server-side");
assert.match(commerce,/moneyToPence\(amount\?\.value\) !== Number\(product\.amount_pence\)/,"capture must verify the exact paid amount");
assert.match(commerce,/createSignedUrl\(String\(product\.download_path\), 120,/,"paid download must use a short-lived signed URL");
assert.match(commerce,/Permanent ownership is required for this download/,"download must require active ownership");
assert.match(commerce,/checkout_not_configured/,"checkout must fail closed until PayPal credentials are configured");
assert.doesNotMatch(commerce,/STRIPE_SECRET_KEY|npm:stripe/,"server checkout must no longer depend on Stripe");

assert.match(webhook,/\/v1\/notifications\/verify-webhook-signature/,"webhook must verify PayPal signatures through PayPal");
assert.match(webhook,/PAYPAL_WEBHOOK_ID/,"webhook verification must bind the registered PayPal webhook ID");
assert.match(webhook,/verification_status.*SUCCESS/s,"webhook must require successful PayPal verification");
assert.match(webhook,/eventType === "PAYMENT\.CAPTURE\.COMPLETED"/,"completed captures must be handled");
assert.match(webhook,/moneyToPence\(resource\?\.amount\?\.value\) !== Number\(expected\.amount_pence\)/,"completed capture webhook must verify the paid amount");
assert.match(webhook,/status: "active"/,"completed PayPal capture must create active entitlement");
assert.match(webhook,/eventType === "PAYMENT\.CAPTURE\.REFUNDED"/,"refunds must be handled");
assert.match(webhook,/\/v2\/payments\/captures\/\$\{encodeURIComponent\(captureId\)\}/,"refund handling must re-read the original capture from PayPal");
assert.match(webhook,/toUpperCase\(\) === "REFUNDED"/,"only a fully refunded PayPal capture may revoke permanent ownership");
assert.match(webhook,/Partial refund recorded/,"partial refunds must not revoke permanent ownership");
assert.match(webhook,/eventType === "PAYMENT\.CAPTURE\.REVERSED"/,"capture reversals must be handled");
assert.match(webhook,/eventType === "CHECKOUT\.PAYMENT-APPROVAL\.REVERSED"/,"approval reversals must be handled");
assert.match(webhook,/eventType === "CUSTOMER\.DISPUTE\.CREATED"/,"payment disputes must be handled");
assert.match(webhook,/\/v1\/customer\/disputes\/\$\{encodeURIComponent\(disputeId\)\}/,"dispute processing must be able to retrieve authoritative dispute details when the webhook omits transaction details");
assert.match(webhook,/"disputed"/,"disputes must stop active entitlement");

assert.match(adapter,/provider:"paypal-supabase"/,"browser commerce adapter must identify PayPal");
assert.match(adapter,/invoke\("create_checkout"\)/,"browser checkout must delegate order creation to the server");
assert.match(adapter,/invoke\("capture_checkout",\{orderId:value\}\)/,"browser return must delegate capture to the server");
assert.doesNotMatch(adapter,/PAYPAL_CLIENT_SECRET|STRIPE_SECRET_KEY/,"browser JavaScript must contain no privileged payment credentials");

assert.match(config,/\[functions\.ccg-commerce\][\s\S]*?verify_jwt = false/,"commerce function uses custom bearer authentication");
assert.match(config,/\[functions\.ccg-paypal-webhook\][\s\S]*?verify_jwt = false/,"PayPal webhook must accept external signed webhook requests");
assert.match(readme,/The PayPal schema migration has been applied to Supabase project `lcslgxpgmttaexsorxik`\./,"release notes must reflect the applied PayPal migration");
assert.match(readme,/`ccg-commerce` — PayPal Orders v2 create\/capture flow/,"release notes must reflect the deployed PayPal commerce function");
assert.match(readme,/`ccg-paypal-webhook` — PayPal webhook verification and entitlement handling/,"release notes must reflect the deployed PayPal webhook function");

console.log("C64 Dungeon Carnage PayPal commerce schema and webhook contract passed");
