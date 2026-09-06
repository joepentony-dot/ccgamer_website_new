import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const repo=path.resolve(gameDir,"../..");
const readGame=relative=>fs.readFileSync(path.join(gameDir,relative),"utf8");
const readRepo=relative=>fs.readFileSync(path.join(repo,relative),"utf8");
const achievements=readGame("js/v10-29-achievements.js");
const rows=JSON.parse(achievements.match(/const rows=(\[[\s\S]*?\]);\r?\n  const catalog/)[1]);
const migration=readRepo("supabase/migrations/20260824120000_lost_sizzler_achievements.sql");
const grants=readRepo("supabase/migrations/20260824123000_lost_sizzler_badge_grants.sql");
const invoker=readRepo("supabase/migrations/20260824124500_lost_sizzler_catalog_invoker.sql");
const member=readRepo("resources/js/auth/member-achievement-badges.js");
const publicMember=readRepo("resources/js/auth/public-member.js");
const loader=readGame("js/asset-overrides.js");

assert.equal(rows.length,89,"Lost Sizzler must ship an extensive 89-achievement catalogue");
assert.equal(new Set(rows.map(row=>row[0])).size,rows.length,"every Lost Sizzler achievement key must be unique");
assert.ok(rows.every(row=>/^LS_[A-Z0-9_]+$/.test(row[0])&&row[1]&&row[2]),"every achievement needs a stable profile key, name and description");
for(const category of ["journey","platinum","combat","objectives","exploration","collection","rare_events","mastery"]){
  assert.ok(rows.some(row=>row[3]===category),`achievement category must be represented: ${category}`);
}
const platinum=rows.find(row=>row[0]==="LS_CITADEL_PLATINUM");
assert.deepEqual(platinum,["LS_CITADEL_PLATINUM","Lost Sizzler Platinum","Complete the full five-floor game and recover the Lost Sizzler.","platinum","platinum"],"the five-floor completion badge must be the Platinum-style profile achievement");
assert.match(achievements,/Number\(run\.floor\|\|0\)<Number\(C\?\.maxFloors\|\|5\)/,"Platinum must not unlock before the final floor");
assert.match(achievements,/award\("LS_CITADEL_PLATINUM"\)/,"a successful full-game completion must award Platinum");
assert.match(achievements,/ccg-lost-sizzler-achievements-v1/,"guest achievements must persist locally");
assert.match(achievements,/rpc\("award_lost_sizzler_achievement",\{target_badge_key:key\}\)/,"signed-in achievements must sync through the restricted profile RPC");
assert.match(achievements,/state\.run=\{[^}]+\};const result=original\.apply/,"run achievement baselines must exist before startWorld records floor checkpoint totals");
assert.match(loader,/v10-29-achievements\.js\?v=\$\{CCG_ACHIEVEMENTS_REV\}/,"the achievement module must load through a dedicated cache revision");

assert.equal((migration.match(/^  \('ls-/gm)||[]).length,rows.length,"the database migration must seed every client achievement");
assert.match(migration,/auth\.uid\(\)/,"profile awards must always resolve the signed-in member on the server");
assert.match(migration,/from public\.get_lost_sizzler_badge_catalog\(\) catalog[\s\S]*?catalog\.badge_key = normalized_key/,"the award RPC must reject keys outside the fixed Lost Sizzler catalogue");
assert.match(migration,/revoke all[\s\S]*?award_lost_sizzler_achievement\(text\)[\s\S]*?from public/,"anonymous/public execution must be revoked from the award RPC");
assert.match(migration,/grant execute[\s\S]*?award_lost_sizzler_achievement\(text\)[\s\S]*?to authenticated/,"only authenticated members may invoke the award RPC");
assert.doesNotMatch(migration,/award_lost_sizzler_achievement\([^)]*uuid/i,"the client-facing award RPC must not accept a user id that could target another profile");
assert.match(grants,/award_lost_sizzler_achievement\(text\)[\s\S]*?from public, anon/,"the project-specific explicit anon grant must be removed from the Lost Sizzler award RPC");
assert.match(grants,/ccg_award_badge_code\(uuid, text\)[\s\S]*?from public, anon, authenticated/,"the low-level arbitrary-user badge writer must not be directly executable by API clients");
assert.match(invoker,/get_lost_sizzler_badge_catalog\(\) security invoker/,"the Lost Sizzler catalogue reader must not retain unnecessary elevated rights");
assert.match(invoker,/get_member_badge_catalog\(\) security invoker/,"the combined Member Hub catalogue reader must not retain unnecessary elevated rights");

assert.match(member,/orderedLostSizzlerEntries/,"the private Member Hub must render the Lost Sizzler catalogue");
assert.match(member,/LS_CITADEL_PLATINUM/,"the Member Hub must give the Lost Sizzler Platinum badge its completion styling");
assert.match(publicMember,/key === 'LS_CITADEL_PLATINUM'/,"public profiles must display Lost Sizzler Platinum as a completion badge");

console.log("Lost Sizzler V10.29 achievement and profile regression checks passed.");
