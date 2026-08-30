import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const arcadeRoot=path.resolve(here,"..");
const repoRoot=path.resolve(arcadeRoot,"../..");
const source=fs.readFileSync(path.join(arcadeRoot,"js/v10-41-r44-solo-cloud-save.js"),"utf8");
const loader=fs.readFileSync(path.join(arcadeRoot,"js/v10-41-lake-item-safety.js"),"utf8");
const migration=fs.readFileSync(path.join(repoRoot,"supabase/migrations/20260830152000_lost_sizzler_solo_cloud_saves.sql"),"utf8");

const r43Index=loader.indexOf('v10-41-r43-solo-save-continue.js');
const r44Index=loader.indexOf('v10-41-r44-solo-cloud-save.js');
assert.ok(r43Index>=0&&r44Index>r43Index,"r44 cloud mirror must load after r43 local save ownership");
assert.match(loader,/data-ccg-v141-r44-solo-cloud-save/,"late loader must publish an explicit r44 marker");

assert.match(source,/const TABLE="lost_sizzler_solo_saves"/,"r44 must use the dedicated private cloud-save table");
assert.match(source,/ccg-lost-sizzler-solo-cloud-sync-v1/,"r44 must keep versioned local cloud-sync metadata");
assert.match(source,/window\.ccgSupabase/,"r44 must reuse the website Supabase/auth bridge");
assert.match(source,/bridge\.getClient/,"r44 must obtain the shared authenticated Supabase client");
assert.match(source,/waitForSessionReady| getCurrentUserContext/,"r44 must resolve website account identity before cloud access");
assert.match(source,/client\.from\(TABLE\)\.select/,"cloud reads must use the authenticated table API");
assert.match(source,/client\.from\(TABLE\)\.upsert/,"cloud writes must use owner-scoped upserts");
assert.match(source,/r43\?\.validateEnvelope\?\./,"every cloud save accepted by r44 must pass r43 envelope validation");
assert.doesNotMatch(source,/PGR\.makeCheckpoint/,"r44 must never create or serialize checkpoints itself");
assert.doesNotMatch(source,/service[_-]?role/i,"browser cloud sync must never contain a service-role credential/path");
assert.doesNotMatch(source,/window\.(?:run|p1|world|host)\s*=/,"r44 must never acquire live dungeon state ownership");
assert.match(source,/const progression=window\.CCGProgression/,"cloud tombstone wrapping must bind to the real shared progression API");
assert.doesNotMatch(source,/window\.PGR/,"r44 must not depend on a nonexistent window.PGR alias");
assert.match(source,/progression\.clearCheckpoint=function clearCheckpointV141R44CloudTombstone/,"canonical progression clear must be wrapped for cloud tombstone propagation");

assert.match(source,/tombstonePayload/,"cloud sync must support deletion tombstones");
assert.match(source,/deleted_at:new Date\(rev\)\.toISOString\(\)/,"tombstones must carry their own revision timestamp");
assert.match(source,/before&&!after&&!state\.suppressObservation\)noteLocalTombstone/,"canonical Solo save clearing must produce a local tombstone");
assert.match(source,/Equal revision: a deletion wins to prevent resurrection/,"browser conflict resolution must prefer deletion on equal revisions");
assert.match(source,/current&&meta\.ownerUserId&&meta\.ownerUserId!==userId/,"cloud restore must refuse to overwrite a browser save owned by another account");
assert.match(source,/envelope&&meta\.ownerUserId&&meta\.ownerUserId!==userId/,"cloud upload must refuse foreign-account local saves");
assert.match(source,/if\(activeRun\(\)\)\{renderStatus\("deferred"\)/,"newer cloud state must wait while a run is active");
assert.match(source,/Cloud save unavailable — the browser save remains safe on this device/,"network failure must explicitly preserve the browser save fallback");
assert.match(source,/ccg:auth-ready/,"r44 must react to website auth readiness");
assert.match(source,/ccg:auth-changed/,"r44 must react to sign-in/sign-out changes");

assert.match(migration,/create table if not exists public\.lost_sizzler_solo_saves/,"migration must create the cloud-save table");
assert.match(migration,/user_id uuid primary key references auth\.users\(id\) on delete cascade/,"cloud saves must be one row per authenticated account");
assert.match(migration,/alter table public\.lost_sizzler_solo_saves enable row level security/,"cloud-save table must enable RLS");
assert.match(migration,/revoke all on table public\.lost_sizzler_solo_saves from anon/,"anonymous users must receive no table privileges");
assert.match(migration,/grant select, insert, update, delete on table public\.lost_sizzler_solo_saves to authenticated/,"authenticated users need only CRUD privileges protected by RLS");
for(const operation of ["select","insert","update","delete"]){
  const re=new RegExp(`for ${operation}[\\s\\S]*?\\(\\(select auth\\.uid\\(\\)\\) = user_id\\)`,"i");
  assert.match(migration,re,`${operation} policy must bind rows to auth.uid()`);
}
assert.match(migration,/save_envelope jsonb/,"validated r43 envelope must be stored as JSONB");
assert.match(migration,/octet_length\(save_envelope::text\) <= 262144/,"cloud envelope must have a defensive size ceiling");
assert.match(migration,/deleted_at is not null and save_envelope is null/,"tombstone rows must not retain stale save payloads");
assert.match(migration,/save_envelope ->> 'checksum' = save_checksum/,"database row must duplicate/check the envelope checksum field");
assert.match(migration,/function public\.guard_lost_sizzler_solo_save_revision\(\)/,"database must own a revision guard for concurrent device writes");
assert.match(migration,/new\.client_revision_ms < old\.client_revision_ms[\s\S]*?return null/,"database must reject an older device revision before it can overwrite a newer cloud save");
assert.match(migration,/new\.client_revision_ms = old\.client_revision_ms[\s\S]*?old\.deleted_at is null and new\.deleted_at is not null[\s\S]*?return new[\s\S]*?return null/,"equal cloud revisions must allow deletion to win while rejecting save resurrection or save-to-save flapping");
assert.match(migration,/create trigger lost_sizzler_solo_saves_guard_revision[\s\S]*?before update on public\.lost_sizzler_solo_saves/,"revision guard must execute on every conflicting upsert update");
for(const fn of ["guard_lost_sizzler_solo_save_revision","touch_lost_sizzler_solo_save_updated_at"]){
  for(const role of ["public","anon","authenticated"]){
    const re=new RegExp(`revoke all on function public\\.${fn}\\(\\) from ${role}`,'i');
    assert.match(migration,re,`${fn} must not be directly executable by ${role}`);
  }
}

console.log("V10.41 r44 Solo cloud-save static/RLS/revision-guard contract passed.");
