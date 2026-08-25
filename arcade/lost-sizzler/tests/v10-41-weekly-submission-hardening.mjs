import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const edge=fs.readFileSync(path.join(repo,"supabase/functions/ccq-weekly-challenge/index.ts"),"utf8");
const finish=edge.slice(edge.indexOf('if(action==="finish")'));

assert.match(edge,/const currentWeek=weekStart\(\),seed=seedFor\(currentWeek\)/,"weekly status/start must use the current UTC week");
assert.match(finish,/select\("id,status,started_at,player_name,week_start,score,deepest_floor,duration_ms,level,completed,stats"\)\.eq\("id",attemptId\)\.eq\("user_id",user\.id\)\.maybeSingle\(\)/,"finish must look up the reserved attempt by id and owner rather than today's week");
assert.doesNotMatch(finish,/\.eq\("week_start",currentWeek\)/,"finish must not reject a reserved attempt merely because Monday rolled over");
assert.match(finish,/const resultWeek=String\(attempt\.week_start\|\|currentWeek\)/,"finished results must remain attached to the attempt's stored week");
assert.match(finish,/week_start:resultWeek/ ,"leaderboard projection must use the stored attempt week");
assert.match(finish,/\.eq\("status","started"\)\.select\("id"\)\.maybeSingle\(\)/,"result finalisation must be conditional so only one concurrent retry wins");
assert.match(finish,/if\(!updated\)[\s\S]*select\("status,score,deepest_floor,duration_ms,level,completed"\)/,"a concurrent retry that loses the update race must reload the persisted winning result");
assert.match(finish,/persisted=\{score:int\(finished\.score/,"losing retries must project the stored result rather than their own request body");
assert.match(finish,/\.upsert\(\{attempt_id:attempt\.id,week_start:resultWeek,player_name:attempt\.player_name,\.\.\.persisted\}/,"leaderboard repair must project only the persisted final result");
assert.match(finish,/leadersFor\(resultWeek\)/,"finish responses must return the leaderboard for the attempt's stored week");
assert.match(edge,/path=ghostPath\(result\.ghostPath\)/,"weekly submission hardening must sanitise the replay once for persistent storage");
assert.match(edge,/stats=\{kills:[\s\S]*ghostPath:path\}/,"weekly attempt stats must retain the same sanitised ghost replay");
assert.match(edge,/ghost_path:path/,"weekly submission must preserve the deployed ghost_path representation");
assert.match(edge,/Finished score is awaiting leaderboard repair/,"existing idempotent projection repair behaviour must remain available");
assert.match(edge,/Score saved; leaderboard projection will retry/,"existing deferred leaderboard repair behaviour must remain available");

console.log("Lost Sizzler V10.41 Weekly rollover and concurrent submission hardening checks passed.");
