import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const game=path.resolve(here,"..");
const repo=path.resolve(here,"../../..");
const readGame=relative=>fs.readFileSync(path.join(game,relative),"utf8");
const readRepo=relative=>fs.readFileSync(path.join(repo,relative),"utf8");

const loader=readGame("js/v10-41-lake-item-safety.js");
const r47=readGame("js/v10-41-r47-all-mode-optimisation.js");
const weekly=readGame("js/weekly-challenge.js");
const feedback=readRepo("supabase/functions/lost-sizzler-feedback/index.ts");
const weeklyBackend=readRepo("supabase/functions/ccq-weekly-challenge/index.ts");
const migration=readRepo("supabase/migrations/20260830215000_lost_sizzler_r47_reliability.sql");
const smokeWorkflow=readRepo(".github/workflows/lost-sizzler-production-smoke.yml");

console.log("[r47 static] late runtime load order");
const r46At=loader.indexOf('v10-41-r46-release-candidate-polish.js');
const r47At=loader.indexOf('v10-41-r47-all-mode-optimisation.js');
assert.ok(r46At>=0&&r47At>r46At,"r47 must load after the release-candidate layer");

console.log("[r47 static] governor covers every published mode without gameplay ownership");
for(const mode of ["solo","online","split","daily","tutorial","dungeon","horde-survivor","sizzler-saboteurs"])assert.match(r47,new RegExp(`(?:\\"|')${mode}(?:\\"|')`));
for(const array of ["particles","rings","floaters"])assert.match(r47,new RegExp(`trimArray\\(${array},`));
for(const forbidden of ["trimArray(bullets","trimArray(enemyBullets","trimArray(hazards","trimArray(host.enemies","score=","saveFloorCheckpoint=","broadcastWorld=","net.send="])assert.ok(!r47.includes(forbidden),`r47 must not take gameplay/network authority: ${forbidden}`);
assert.match(r47,/unhandledrejection/);
assert.match(r47,/client_error/);
assert.match(r47,/MAX_ERRORS_PER_SESSION=6/);
assert.match(r47,/ERROR_COOLDOWN_MS=60000/);

console.log("[r47 static] Weekly Vault countdown no longer rebuilds leaderboard once per second");
assert.match(weekly,/countdownTimer=setInterval\(renderCountdown,1000\)/);
assert.match(weekly,/leaderboardSignature/);
assert.match(weekly,/if\(!force&&signature===lastLeaderboardSignature\)return false/);
assert.ok(!weekly.includes("countdownTimer=setInterval(()=>{"),"legacy one-second full render interval must be removed");

console.log("[r47 static] public functions have atomic request budgets and bounded fault metadata");
for(const source of [feedback,weeklyBackend]){
  assert.match(source,/consume_lost_sizzler_request_budget/);
  assert.match(source,/Retry-After/);
  assert.match(source,/429/);
  assert.match(source,/Origin not allowed/);
}
assert.match(feedback,/client_error/);
assert.match(feedback,/prune_lost_sizzler_telemetry/);
assert.match(feedback,/error_fingerprint/);
assert.match(weeklyBackend,/completed&&deepest!==5/);
assert.match(weeklyBackend,/duration>serverElapsed\+RESULT_CLOCK_GRACE_MS/);
assert.match(weeklyBackend,/point=>point\.f>deepest/);
assert.match(weeklyBackend,/path\[path\.length-1\]\.t>duration\+GHOST_CLOCK_GRACE_MS/);

console.log("[r47 static] database limiter is service-role only and retention is bounded");
assert.match(migration,/enable row level security/i);
assert.match(migration,/security invoker/i);
assert.match(migration,/revoke all on table public\.lost_sizzler_request_buckets from public, anon, authenticated/i);
assert.match(migration,/grant execute on function public\.consume_lost_sizzler_request_budget[\s\S]*to service_role/i);
assert.match(migration,/greatest\(30, least\(coalesce\(p_days, 90\), 365\)\)/i);
assert.match(migration,/game_play_events_lost_sizzler_retention_idx/);

console.log("[r47 static] post-deployment smoke workflow is present");
assert.match(smokeWorkflow,/Lost Sizzler Production Smoke/);
assert.match(smokeWorkflow,/v10-41-r47-production-smoke\.mjs/);

console.log("Lost Sizzler V10.41 r47 static reliability, security and ownership contracts passed.");
