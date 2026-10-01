import fs from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const adminJs = fs.readFileSync("admin/js/admin-members.js", "utf8");
const adminHtml = fs.readFileSync("admin/members.html", "utf8");
const initialMigration = fs.readFileSync(
  "supabase/migrations/20260930232510_dungeon_carnage_member_playtest_access.sql",
  "utf8"
);
const hardeningMigration = fs.readFileSync(
  "supabase/migrations/20261001001720_dungeon_carnage_member_playtest_access_hardening.sql",
  "utf8"
);
const migration = initialMigration + "\n" + hardeningMigration;

assert(adminHtml.includes("Dungeon beta"), "Members admin must expose the Dungeon beta column");
assert(adminHtml.includes("20261001-dungeon-playtest"), "Members admin must cache-bust its playtest-control JavaScript");
assert(adminJs.includes("toggle-dungeon-playtester"), "Members admin must expose a playtester grant/revoke control");
assert(adminJs.includes("admin_set_dungeon_carnage_playtester"), "Members admin must use the protected playtester RPC");
assert(adminJs.includes("dungeon_carnage_playtester"), "Members admin must render the authoritative playtester flag");

assert(initialMigration.includes("create table if not exists public.ccg_product_entitlements"), "fresh migration history must define the protected entitlement table");
assert(initialMigration.includes("create table if not exists public.ccg_products"), "fresh migration history must define the product table dependency");
assert(initialMigration.includes("on conflict (slug) do nothing"), "migration must never overwrite an existing live Dungeon product row");
assert(migration.includes("ccg_has_dungeon_carnage_playtest_access"), "migration must provide the signed-in member access RPC");
assert(migration.includes("admin_set_dungeon_carnage_playtester"), "migration must provide the admin assignment RPC");
assert(migration.includes("from public.user_roles actor_role"), "admin authority must come from the canonical user_roles table");
assert(migration.includes("from auth.users u"), "member directory and target validation must use auth.users");
assert(migration.includes("left join public.profiles p on p.id = u.id"), "member directory must preserve the canonical profile join");
assert(migration.includes("ccg_is_user_soft_banned"), "member access and admin actions must honour soft bans");
assert(!migration.includes("me.is_admin = true"), "Dungeon playtest administration must not authorize from profiles.is_admin");
assert(migration.includes("e.source = 'playtest'"), "playtest entitlements must remain distinguishable from paid ownership");
assert(migration.includes("revoke all on public.ccg_product_entitlements from anon, authenticated"), "entitlement rows must not be directly readable/writable from the browser");
assert(migration.includes("revoke all on function public.ccg_has_dungeon_carnage_playtest_access() from anon"), "member access RPC must not be callable anonymously");
assert(migration.includes("grant execute on function public.ccg_has_dungeon_carnage_playtest_access() to authenticated"), "signed-in members must be able to ask for their own playtest entitlement");
assert(migration.includes("revoke all on function public.admin_set_dungeon_carnage_playtester(uuid, boolean) from anon"), "admin assignment RPC must not be callable anonymously");
assert(migration.includes("grant execute on function public.admin_set_dungeon_carnage_playtester(uuid, boolean) to authenticated"), "authenticated admins must be able to grant/revoke beta access");

console.log("Dungeon Carnage member playtester admin guard passed.");
