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
const round2Migration = fs.readFileSync(
  "supabase/migrations/20261002203000_dungeon_carnage_beta_round2_closed_cohort.sql",
  "utf8"
);
const migration = initialMigration + "\n" + hardeningMigration + "\n" + round2Migration;

assert(adminHtml.includes("Dungeon Round 2"), "Members admin must label the closed Round 2 beta column");
assert(adminHtml.includes("20261002-dungeon-round2"), "Members admin must cache-bust its Round 2 control JavaScript");
assert(adminJs.includes("dungeon_carnage_round2_cohort"), "Members admin must render frozen cohort membership");
assert(adminJs.includes("Cohort locked"), "Members outside the frozen cohort must not receive a Grant control");
assert(adminJs.includes("Round 2 member"), "Assigned current members must be labelled as Round 2 members");
assert(adminJs.includes("admin_set_dungeon_carnage_playtester"), "Members admin must retain the protected revoke/restore RPC");

assert(initialMigration.includes("create table if not exists public.ccg_product_entitlements"), "fresh migration history must retain the protected entitlement table");
assert(round2Migration.includes("create table if not exists public.ccg_dungeon_carnage_beta_rounds"), "Round 2 must have an authoritative server-side round record");
assert(round2Migration.includes("create table if not exists public.ccg_dungeon_carnage_beta_round_members"), "Round 2 must freeze its own member cohort");
assert(round2Migration.includes("now() + interval '7 days'"), "Round 2 passes must expire after exactly seven days");
assert(round2Migration.includes("u.email_confirmed_at is not null"), "Round 2 cohort must contain contactable current members only");
assert(round2Migration.includes("not in ('admin', 'superadmin')"), "owner/admin accounts must stay outside the member cohort snapshot");
assert(round2Migration.includes("on conflict (round_key, user_id) do nothing"), "re-running the migration must never expand the frozen cohort");
assert(round2Migration.includes("m.round_key = 'round-2-current-members-2026-10-02'"), "member access must be bound to the named frozen Round 2 cohort");
assert(round2Migration.includes("pg_catalog.now() < r.ends_at"), "member access must fail automatically after the Round 2 expiry");
assert(round2Migration.includes("raise exception 'round_two_cohort_locked'"), "admin RPC must reject later accounts that were not in the frozen cohort");
assert(round2Migration.includes("set search_path = ''"), "new security-definer Round 2 functions must use an immutable search path");
assert(round2Migration.includes("revoke all on public.ccg_dungeon_carnage_beta_round_members from anon, authenticated"), "frozen cohort rows must not be browser-readable");
assert(round2Migration.includes("select false;"), "the previous invited tester-code RPC must be disabled for Round 2");
assert(!round2Migration.includes("ccg_tester"), "repository migrations must never contain the live historical tester code");

assert(migration.includes("from public.user_roles actor_role"), "admin authority must remain based on canonical user_roles");
assert(migration.includes("ccg_is_user_soft_banned"), "member access and admin actions must continue to honour soft bans");
assert(!migration.includes("me.is_admin = true"), "Dungeon playtest administration must not authorize from profiles.is_admin");

console.log("Dungeon Carnage closed Round 2 member cohort guard passed.");
