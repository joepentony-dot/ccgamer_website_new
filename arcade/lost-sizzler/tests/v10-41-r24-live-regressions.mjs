import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repoRoot=path.resolve(root,"../..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const readRepo=relative=>fs.readFileSync(path.join(repoRoot,relative),"utf8");

const r24=read("js/v10-41-r24-live-regressions.js");
const lake=read("js/v10-41-lake-item-safety.js");
const weekly=read("js/weekly-challenge.js");
const ui=read("js/v10-6-ui-polish.js");
const weeklyFn=readRepo("supabase/functions/ccq-weekly-challenge/index.ts");
const weeklyResults=readRepo("supabase/functions/ccq-weekly-results/index.ts");

// Delivery: the repair layer must actually be requested by an existing loaded
// release module. A standalone file that is never loaded is not a fix.
assert.match(lake,/load\("js\/v10-41-r24-live-regressions\.js","data-ccg-v141-r24-live-regressions"\)/,"r24 live regression layer must be loaded by the late runtime chain");

// Spy Vs Spy: stale hit-stun is cleared at a new round and actual held movement
// receives a late-frame fallback if the inherited multiplayer chain rejects it.
assert.match(r24,/player\.hitStunMs=0/,"Spy round start must clear stale hit stun");
assert.match(r24,/local\.x===before\?\.x&&local\.y===before\?\.y/,"Spy fallback must only run when ordinary movement failed");
assert.match(r24,/trySpyFallbackStep\(local,dir\.x,dir\.y\)/,"Spy movement fallback must execute from held movement input");
assert.match(r24,/window\.CCGWorld\.walkable/,"Spy fallback must still respect dungeon collision");

// Ranged combat: first contact has a reaction beat, later shots sometimes
// hesitate, and the final projectile vector is eight-directional.
assert.match(r24,/fresh\)\{state\.delayedEnemyShots\+\+;return\{shot,suppress:true,reason:"reaction"\}/,"new LOS firing must receive a reaction delay");
assert.match(r24,/Number\(randomValue\)<\.2/,"ranged enemies must occasionally hesitate rather than firing every opportunity");
assert.match(r24,/const dx=Math\.sign\(Number\(target\.x\)-Number\(enemy\.x\)\),dy=Math\.sign\(Number\(target\.y\)-Number\(enemy\.y\)\)/,"enemy projectile handoff must support diagonal aim");

// Solo combat density. Ordinary rooms top out at three hostiles, with even
// lower pressure in trap/generator rooms and a single defender in dedicated
// hazard rooms. Special swarm rooms also have bounded populations. Population
// trimming happens at floor creation only: overflow is never teleported into a
// different ordinary room and cleared standard rooms are never replenished.
assert.match(r24,/SOLO_ORDINARY_ROOM_CAP=3/,"ordinary Solo rooms must cap at three live hostiles");
assert.match(r24,/SOLO_TRAP_ROOM_CAP=2/,"trap and generator rooms must cap at two live hostiles");
assert.match(r24,/SOLO_HAZARD_ROOM_CAP=1/,"dedicated hazard rooms must cap at one live hostile");
assert.match(r24,/SOLO_SPIDER_CAP=6/,"Spider Nest must have a bounded six-spider maximum");
assert.match(r24,/SOLO_SKELETON_CAP=5/,"Skeleton Horde must have a bounded five-skeleton maximum");
assert.match(r24,/Math\.max\(0,roomLimit\(room\.id\)-stalkerOccupancy\(room\.id\)\)/,"Count Loadula must count against effective room pressure");
assert.match(r24,/criticalEnemy\(b\)/,"progression and named enemies must be prioritised before ordinary overflow enemies");
assert.doesNotMatch(r24,/function rehomeEnemy\(|rehomeEnemy\(enemy,preferred\)/,"ordinary overflow enemies must never be teleported into another standard room");
assert.match(r24,/if\(criticalEnemy\(enemy\)\)continue;\s*enemy\.alive=false;trimmed\+\+;state\.roomTrims\+\+/,"floor-start overflow must be trimmed in place without repopulating another room");
assert.match(r24,/respawnPolicy:"no-standard-room-rehome"/,"Solo balance metadata must record the no-standard-room-rehome policy");
assert.match(r24,/normaliseEnemyAmmoDrops\(\);trimTransientLoad\(\);\s*\}/,"ongoing balance ticks must not rerun room population redistribution");

// Browser-load containment for ordinary Solo Dungeon sessions.
assert.match(r24,/MAX_SOLO_ENEMY_BULLETS=96/,"Solo enemy projectile population must be bounded");
assert.match(r24,/MAX_SOLO_PARTICLES=520/,"Solo particle population must be bounded");
assert.match(r24,/trimTransientLoad\(\)/,"Solo runtime sweeps must contain transient object growth");

// Enemy ammo drops now mean ten rounds, including the pickup wrapper needed to
// bypass the older V10.41 five-round compatibility layer.
assert.match(r24,/SOLO_ENEMY_AMMO_ROUNDS=10/,"enemy ammo drops must award ten rounds");
assert.match(r24,/ENEMY AMMO DROP · 10 ROUNDS/,"enemy ammo drop label must describe ten rounds");
assert.match(r24,/item\.v141SoloEnemyAmmo=false;item\.v130ReserveAmmo=true;item\.ammoRounds=SOLO_ENEMY_AMMO_ROUNDS/,"r24 pickup path must bypass the old five-round wrapper safely");

// Fire hazard rooms must no longer use the old full-room alternating checkerboard.
assert.match(r24,/FURNACE STEP CHAMBER/);
assert.match(r24,/CINDER ISLAND VAULT/);
assert.match(r24,/EMBER BREAK-LANE ROOM/);
assert.match(r24,/hazard\.groups=3;hazard\.period=2700;hazard\.warningMs=850;hazard\.activeMs=600/,"new ember patterns must retain readable warning windows");
assert.match(r24,/hazard\.r24Pattern==null&&redesignEmberHazard\(hazard,index\)/,"pattern zero must count as already redesigned instead of being processed again");
assert.doesNotMatch(r24,/type==="embers"\?\(x\+y\)%2/,"r24 ember redesign must not recreate the old checkerboard pattern");

// Dungeon topology: prefer a physically tree-like corridor layout rather than
// merged corridor components or duplicate room entrances.
assert.match(r24,/function corridorLayoutAudit\(candidate\)/,"r24 must audit generated corridor topology");
assert.match(r24,/if\(contacts\.size>2\)mergedComponents\+=contacts\.size-2/,"corridor components touching several rooms must be penalised");
assert.match(r24,/if\(clusters>1\)multiEntrances\+=clusters-1/,"multiple separated entrances from one corridor component must be penalised");
assert.match(r24,/R24-LAYOUT-/,"bad layouts must receive deterministic reroll candidates");

// Rating modal: desktop position is based on the viewport, not the message rail.
assert.match(r24,/#ccg-rating-panel:not\(\.hidden\)[\s\S]*position:fixed!important;left:50%!important;top:50%!important/,"desktop rating panel must be viewport-centred");
assert.match(r24,/transform:translate\(-50%,-50%\)!important/);

// Weekly Vault: no guest/unranked bypass, one reserved account attempt, top five
// display and top-five server responses. The finish path is rollover-safe and
// idempotent so a valid score is not lost around Monday reset or a retry.
assert.doesNotMatch(ui,/startGuestWeekly/,"guest Weekly Dungeon bypass must be removed");
assert.match(ui,/if\(options\.daily&&!options\.weekly\?\.attempt\?\.id\)/,"daily/weekly beginRun must reject a run without a reserved attempt");
assert.match(weekly,/\.slice\(0,5\)/,"client leaderboard must display only the top five");
assert.match(weeklyFn,/const LEADERBOARD_LIMIT = 5/,"challenge service leaderboard response must be top five");
assert.match(weeklyFn,/\.eq\("id",attemptId\)\.eq\("user_id",user\.id\)\.maybeSingle\(\)/,"finish lookup must use reserved attempt id and owner rather than the new current week");
assert.match(weeklyFn,/const resultWeek=String\(attempt\.week_start\|\|currentWeek\)/,"finish must persist against the attempt's reserved week across Monday rollover");
assert.match(weeklyFn,/\.eq\("status","started"\)\.select\("id"\)\.maybeSingle\(\)/,"finish update must be conditional and retry-safe");
assert.match(weeklyFn,/ghost_path:path/,"weekly finish must retain the deployed ghost replay representation");
assert.match(weeklyFn,/if\(action==="ghost"\)/,"ghost requests made by the client must have a real server action");
assert.match(weeklyResults,/const LEADERBOARD_LIMIT=5/,"weekly result summaries must also be limited to the top five");

console.log("Lost Sizzler V10.41 r24 live regression, Solo balance, no-standard-room-respawn, Weekly Vault and layout checks passed.");
