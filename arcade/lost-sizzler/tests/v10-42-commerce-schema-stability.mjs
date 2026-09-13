import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../../..");
const migration=fs.readFileSync(path.join(root,"supabase/migrations/20260913_ccg_dungeon_carnage_commerce.sql"),"utf8");
const indexes=fs.readFileSync(path.join(root,"supabase/migrations/20260913_ccg_dungeon_carnage_commerce_indexes.sql"),"utf8");
const commerce=fs.readFileSync(path.join(root,"supabase/functions/ccg-commerce/index.ts"),"utf8");
const webhook=fs.readFileSync(path.join(root,"supabase/functions/ccg-stripe-webhook/index.ts"),"utf8");
const config=fs.readFileSync(path.join(root,"supabase/config.toml"),"utf8");

for(const table of ["ccg_products","ccg_product_entitlements","ccg_checkout_sessions","ccg_stripe_webhook_events","ccg_download_audit"]){
  assert.match(migration,new RegExp(`alter table public\\.${table} enable row level security;`),`${table} must have RLS enabled`);
  assert.match(migration,new RegExp(`revoke all on table public\\.${table} from anon, authenticated;`),`${table} must not expose direct client privileges`);
}
assert.match(migration,/values \('c64-dungeon-carnage','C64 Dungeon Carnage','gbp',199,/,"canonical product must stay £1.99 GBP");
assert.match(migration,/values \('ccg-paid-downloads','ccg-paid-downloads',false,/,"paid-download bucket must remain private");
assert.match(migration,/download_ready,active\)\nvalues \([^\n]+false,true\)/,"download must fail closed until a verified package is published");
for(const index of ["ccg_product_entitlements_product_slug_idx","ccg_checkout_sessions_product_slug_idx","ccg_download_audit_user_id_idx","ccg_download_audit_product_slug_idx"]){assert.match(indexes,new RegExp(index),`${index} must remain versioned`)}

assert.match(commerce,/service\.auth\.getUser\(token\)/,"commerce endpoint must authenticate bearer tokens server-side");
assert.match(commerce,/mode: "payment"/,"Checkout must remain a one-off payment");
assert.match(commerce,/unit_amount: Number\(product\.amount_pence\)/,"Checkout price must come from the server product record");
assert.match(commerce,/client_reference_id: user\.id/,"Checkout must bind the CCG account as client_reference_id");
assert.match(commerce,/createSignedUrl\([^,]+, 120,/,"paid download must use a short-lived signed URL");
assert.match(commerce,/if \(!owned\).*entitlement_required/s,"download must require active ownership");
assert.match(commerce,/if \(!STRIPE_SECRET_KEY \|\| !STRIPE_WEBHOOK_SECRET\).*checkout_not_configured/s,"checkout must fail closed until Stripe secrets are configured");

assert.match(webhook,/constructEventAsync\(body, signature, STRIPE_WEBHOOK_SECRET/,"webhook must cryptographically verify Stripe signatures");
assert.match(webhook,/session\.payment_status !== "paid"/,"webhook must not grant access for unpaid sessions");
assert.match(webhook,/session\.client_reference_id !== userId/,"webhook must cross-check account identity");
assert.match(webhook,/Number\(session\.amount_total\) !== Number\(expected\.amount_pence\)/,"webhook must verify the paid amount");
assert.match(webhook,/status: "active"/,"paid Checkout must create active entitlement");
assert.match(webhook,/event\.type === "charge\.refunded"/,"refunds must be handled");
assert.match(webhook,/status: "refunded"/,"full refunds must revoke active ownership");
assert.match(webhook,/event\.type === "charge\.dispute\.created"/,"payment disputes must be handled");
assert.match(webhook,/status: "disputed"/,"disputes must stop active entitlement");

assert.match(config,/\[functions\.ccg-commerce\][\s\S]*verify_jwt = false/,"commerce function uses custom bearer authentication");
assert.match(config,/\[functions\.ccg-stripe-webhook\][\s\S]*verify_jwt = false/,"Stripe webhook must accept external signed webhook requests");

console.log("C64 Dungeon Carnage commerce schema and webhook contract passed");
