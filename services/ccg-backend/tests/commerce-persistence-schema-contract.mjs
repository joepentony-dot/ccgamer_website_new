import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../migrations/006_game_commerce.sql', import.meta.url), 'utf8');

assert.match(sql, /create table if not exists game_products/i);
assert.match(sql, /create table if not exists game_purchase_orders/i);
assert.match(sql, /create table if not exists game_entitlements/i);
assert.match(sql, /create table if not exists paypal_webhook_events/i);

assert.match(sql, /'the-lost-sizzler-full-game'/);
assert.match(sql, /'C64 Dungeon Carnage — Full Game'/);
assert.match(sql, /'GBP'/);
assert.match(sql, /\b199\b/);
assert.match(sql, /entitlement_kind text not null default 'permanent'/i);
assert.match(sql, /includes_all_updates boolean not null default true/i);
assert.match(sql, /primary key \(user_id, product_slug\)/i);
assert.match(sql, /references ccg_users\(user_id\) on delete restrict/i);
assert.match(sql, /provider_order_id text unique/i);
assert.match(sql, /provider_capture_id text unique/i);
assert.match(sql, /status in \('creating','created','completed','failed','cancelled','refunded','reversed'\)/i);
assert.match(sql, /status in \('active','revoked'\)/i);
assert.match(sql, /source_provider in \('paypal','admin','migration'\)/i);
assert.match(sql, /payload_sha256 text not null check \(payload_sha256 ~ '\^\[0-9a-f\]\{64\}\$'\)/i);

assert.doesNotMatch(sql, /service[_-]?role/i, 'Commerce schema must never embed service-role material.');
assert.doesNotMatch(sql, /client_secret/i, 'Commerce schema must never embed PayPal client secrets.');
assert.doesNotMatch(sql, /payer_email/i, 'Commerce schema must not persist payer email by default.');

console.log('C64 Dungeon Carnage commerce persistence schema contract passed.');
