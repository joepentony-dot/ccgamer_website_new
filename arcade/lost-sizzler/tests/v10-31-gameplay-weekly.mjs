import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const game=path.resolve(here,"..");
const repo=path.resolve(game,"../..");
const readGame=file=>fs.readFileSync(path.join(game,file),"utf8");
const play=readGame("js/game-play.js"),render=readGame("js/game-render.js"),systems=readGame("js/systems.js"),audio=readGame("js/audio.js"),weekly=readGame("js/weekly-challenge.js"),core=readGame("js/game-core.js"),main=readGame("js/game-main.js"),network=readGame("js/network.js"),gameNetwork=readGame("js/game-network.js"),runtime=readGame("js/v10-6-runtime.js"),multiplayerSync=readGame("js/v10-31-multiplayer-sync.js"),assets=readGame("js/asset-overrides.js"),index=readGame("index.html");
const supabaseClient=fs.readFileSync(path.join(repo,"js/ccg-supabase-client.js"),"utf8");
const edge=fs.readFileSync(path.join(repo,"supabase/functions/ccq-weekly-challenge/index.ts"),"utf8");
const migration=fs.readFileSync(path.join(repo,"supabase/migrations/20260821190000_ccq_weekly_high_score_vault.sql"),"utf8");

assert.match(play,/const FURNITURE_ITEM_CHANCE=\.12/,"smashable furniture must have a restrained item chance");
const enemyChance=Number(play.match(/const FURNITURE_ENEMY_CHANCE=([\d.]+)/)?.[1]);
assert.ok(enemyChance>0&&enemyChance<.05,"barrel/bookcase enemy releases must remain below five percent");
assert.match(play,/\["barrel","bookcase"\]\.includes\(blocker\?\.type\)/,"rare furniture enemies must be limited to barrels and bookcases");
assert.match(play,/host\.v131FurnitureEnemyReleased/,"a floor must cap furniture ambushes");
assert.match(play,/bounty\.target\+\+/,"a released enemy must be added to a sub-50 all-enemies bounty");
assert.match(systems,/BUDGET_BIN:\["bin","barrel"/,"barrels must be part of generated furniture");
assert.match(render,/d\.type==="barrel"/,"barrels must have dedicated rendering");

assert.match(play,/const meleeOnly=!\(p\.firearmUnlocked&&p\.weapon&&Number\(p\.mana\|\|0\)>0\)/,"collision must identify sword-only combat");
assert.match(play,/if\(meleeOnly\)[\s\S]*?p\.x=fromX;p\.y=fromY[\s\S]*?return;/,"sword users must stay adjacent without contact damage or extra knockback");
assert.match(play,/CCGLostSizzlerOnboardingV120\?\.state\?\.active\)\{resetCamp\(p,true\);return\}/,"anti-idle explosions must be disabled during tutorial mode");
assert.match(audio,/function stopAll\(\)/,"tutorial exit must be able to stop all music and effects");

assert.match(migration,/unique \(week_start, user_id\)/,"the database must enforce one weekly attempt per account");
assert.match(edge,/service\.auth\.getUser\(auth\)/,"the edge function must verify the caller before starting or finishing an attempt");
assert.match(edge,/if\(!user\)return json\(req,\{ok:false,error:"Sign in with a registered CCG website account first"\}/,"unsigned weekly attempts must be rejected server-side");
assert.match(edge,/error\.code==="23505"\?"This week's attempt has already been used"/,"concurrent second-attempt reservations must be rejected");
assert.match(weekly,/Sign in before entering the Weekly Dungeon/,"the menu must not advertise unranked anonymous weekly play");
assert.match(weekly,/PENDING_RESULT/,"a failed weekly submission must remain available for retry");
assert.match(edge,/Finished score is awaiting leaderboard repair/,"a finished attempt must repair a missing leaderboard projection idempotently");
assert.match(edge,/if\(leaderboardError\)return json/,"leaderboard write failures must not be reported as successful submissions");
assert.match(core,/function submitWeeklyResultOnce\(\)/,"all weekly result exits must share one submission guard");
assert.match(main,/if\(run\?\.daily\)await submitWeeklyResultOnce\(\)/,"quitting a weekly run must submit its current final score before clearing the run");

assert.match(supabaseClient,/@supabase\/supabase-js@2\.95\.0/,"the shared browser client must pin the verified Supabase SDK version");
assert.match(index,/ccg-supabase-client\.js\?v=20260825r28/,"the multiplayer client must ship with the current r28 release cache token");
assert.match(network,/private:false/,"internet rooms must explicitly use public browser-accessible Realtime channels");
assert.match(network,/broadcast:\{self:false,ack:true\}/,"room broadcasts must wait for relay acknowledgement");
assert.match(network,/async sendRequired\(event,payload\)/,"start and join control messages must have a reliable failure path");
assert.match(network,/await this\.sendRequired\("hello"/,"a joining browser must confirm its first room message reached Realtime");
assert.match(runtime,/setTimeout\(announce,280\);setTimeout\(announce,850\)/,"the host start command must be repeated to cover international latency and reconnect timing");
assert.match(runtime,/event==="hello"&&net\.isHost&&playMode==="online"&&mode==="playing"&&lastStartMeta/,"a late joining browser must receive the active run start state");
assert.match(assets,/v10-31-multiplayer-sync\.js\?v=\$\{CCG_MULTIPLAYER_SYNC_REV\}/,"the host-authoritative interaction layer must ship in the enhancement queue");
assert.match(multiplayerSync,/request\("door",\{x,y,bronzeKeys:/,"a joined player must ask the host to open a door");
assert.match(multiplayerSync,/payload\.action==="chest"/,"chests must be opened by the host for joined players");
assert.match(multiplayerSync,/payload\.action==="furniture"/,"furniture destruction must be processed by the host");
assert.match(multiplayerSync,/net\.send\("hit"/,"joined-player melee and projectile damage must be sent to the host");
assert.match(gameNetwork,/lastAuthoritativeWorldRevision/,"guest-local animation revisions must not block later host snapshots");
assert.match(gameNetwork,/processRemoteMovement\(next\)/,"the host must process shared dungeon triggers reached by joined players");
assert.match(gameNetwork,/inventory:\(p\.inventory\|\|\[\]\)\.map/,"joined-player inventory and key state must be included in player synchronisation");
assert.match(gameNetwork,/openingRemainingMs:remaining/,"door snapshots must transfer remaining duration instead of a host-local browser deadline");
assert.match(gameNetwork,/openAt:receivedAt\+remaining/,"joined browsers must reconstruct door deadlines from their own monotonic clock");
assert.match(gameNetwork,/syncSequence:\+\+worldSyncSequence/,"world snapshots must carry an ordered host sequence");
assert.match(multiplayerSync,/actorState:playerStateForNetwork\(p1\)/,"interaction requests must carry a latency-tolerant player position snapshot");
assert.match(multiplayerSync,/v132_interaction_result/,"the host must explicitly accept or reject joined-player interactions");

console.log("Lost Sizzler V10.33 furniture, melee, tutorial safety and multiplayer clock-sync checks passed under r28.");
