import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const gate = fs.readFileSync("js/ccg-play-maintenance-owner-gate.js", "utf8");
const register = fs.readFileSync("auth/register.html", "utf8");
const authCss = fs.readFileSync("resources/css/auth.css", "utf8");

test("Dungeon public overlay announces development instead of member login", () => {
  const start = gate.indexOf('  function showMemberGate(publicReason = "") {');
  const end = gate.indexOf("  async function checkAccess()", start);
  assert.ok(start >= 0 && end > start);
  const overlay = gate.slice(start, end);
  assert.match(overlay, /C64 Dungeon Carnage Is In Development/);
  assert.match(overlay, /Public gameplay is temporarily unavailable/);
  assert.match(overlay, /Stay tuned/);
  assert.doesNotMatch(overlay, /Current Members Only|SIGN IN AS AN ASSIGNED MEMBER|auth\/login\.html/);
  assert.match(overlay, /ccg-member-beta-access-gate/);
  assert.match(overlay, /aria-labelledby/);
  assert.match(overlay, /ccg-member-beta-exit/);
});

test("protected runtime and owner preview access are preserved", () => {
  assert.match(gate, /async function resolveAccountAccess\(/);
  assert.match(gate, /async function resolvePublicPlaytestAccess\(/);
  assert.match(gate, /ccg_validate_dungeon_carnage_public_playtest/);
  assert.match(gate, /isOwnerProfile\(access\?\.profile\)/);
  assert.match(gate, /dispatchAllowed\("owner"\)/);
  assert.match(gate, /dispatchAllowed\("public-24h-playtest"\)/);
  assert.match(gate, /if \(!runtimeAccessGranted\)/);
  assert.match(gate, /showMemberGate\(publicReason/);
});

test("registration offers a maintenance notice, no credential collection", () => {
  assert.match(register, /Registration Temporarily Unavailable/);
  assert.match(register, /database and account services/);
  assert.match(register, /Existing account holders can still sign in/);
  assert.match(register, /<meta name="robots" content="noindex,follow"/);
  assert.match(register, /href="\.\/login\.html"/);
  assert.doesNotMatch(register, /<form\b|type="password"|registerUser\(|ccg-supabase-client\.js/);
  assert.match(authCss, /\.auth-maintenance-note/);
  assert.match(authCss, /\.auth-maintenance-actions/);
});
