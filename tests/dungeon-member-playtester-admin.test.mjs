import fs from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const adminJs = fs.readFileSync("admin/js/admin-members.js", "utf8");
const adminHtml = fs.readFileSync("admin/members.html", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261001003000_dungeon_carnage_member_playtest_access.sql", "utf8");

assert(adminHtml.includes("Dungeon beta"), "Members admin must expose the Dungeon beta column");
assert(adminHtml.includes("20261001-dungeon-playtest"), "Members admin must cache-bust its playtest-control JavaScript");
assert(adminJs.includes("toggle-dungeon-playtester"), "Members admin must expose a playtester grant/revoke control");
assert(adminJs.includes("admin_set_dungeon_carnage_playtester"), "Members admin must use the protected playtester RPC");
assert(adminJs.includes("dungeon_carnage_playtester"), "Members admin must render the authoritative playtester flag");
assert(migration.includes("ccg_has_dungeon_carnage_playtest_access"), "migration must provide the signed-in member access RPC");
assert(migration.includes("admin_set_dungeon_carnage_playtester"), "migration must provide the admin assignment RPC");
assert(migration.includes("ccg_product_entitlements"), "member playtest access must use the existing protected product-entitlement table");
assert(migration.includes("e.source = 'playtest'"), "playtest entitlements must remain distinguishable from paid ownership");
assert(migration.includes("revoke all on function public.ccg_has_dungeon_carnage_playtest_access() from public"), "member access RPC must not retain default PUBLIC execution");

console.log("Dungeon Carnage member playtester admin guard passed.");
