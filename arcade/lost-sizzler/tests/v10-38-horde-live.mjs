import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-38-horde-live.js"),"utf8");
const loader=fs.readFileSync(path.join(root,"js/version-check.js"),"utf8");

assert.match(loader,/v10-38-horde-live\.js/,"version-check must load the V10.38 live Horde layer");
assert.match(source,/SINGLE_PLAYER_QUOTAS=Object\.freeze\(\[36,44,52,60,70,80,90,100,112,44\]\)/,"Horde quotas must be materially larger for the expanded arena");
assert.match(source,/ACTIVE_CAP=Object\.freeze\(\{1:18,2:24,3:30,4:36\}\)/,"expanded Horde must support more simultaneous attackers");
assert.match(source,/PLAYER_QUOTA_SCALE=Object\.freeze\(\{1:1,2:1\.25,3:1\.5,4:1\.75\}\)/,"larger waves must scale with current players");

assert.match(source,/CENTRE_OFFSETS=Object\.freeze/,"Horde must define a centre spawn cluster");
assert.match(source,/p1\.x=cell\.x;p1\.y=cell\.y/,"each local Horde player must be repositioned into the arena centre cluster");
assert.match(source,/ROOM \$\{String\(net\?\.roomCode\|\|"-----"\)\} · JOIN ANY TIME/,"live Horde roster must expose the room code and late-join availability");
assert.match(source,/HORDE ROOMS STAY OPEN/,"main menu must tell players they can join an active Horde");
assert.match(source,/active Horde at any wave/,"late-join menu copy must explicitly allow joining in progress");
assert.match(source,/horde-live-list/,"Horde must show a live player roster");

assert.match(source,/function reconcilePlayers/,"host must reconcile newly connected Horde members into the live rules state");
assert.match(source,/runState\.players\.push\(modelTemplate/,"late joiners must become active Horde player models");
assert.match(source,/HORDE PLAYER JOINED/,"late joining must generate Horde-specific feedback");
assert.match(source,/PLAYER_GRACE_MS=3200/,"temporary presence drops must not immediately delete a player");
assert.match(source,/runState\.playerCount=nextCount/,"Horde scaling must follow the current connected player count");

assert.match(source,/function perimeterCell/,"Horde enemies must have a dedicated perimeter spawn selector");
assert.match(source,/spawnRoomId:"perimeter"/,"extra Horde enemies must originate at the outside perimeter");
assert.match(source,/_v135ArenaSpawned=true/,"reinforcement enemies must retain perimeter ownership rather than being respawned by legacy geometry");
assert.match(source,/function driveEnemies/,"expanded arena must have dedicated Horde approach steering");
assert.match(source,/enemy\.aiState="chase"/,"Horde enemies must remain in chase state");
assert.match(source,/enemy\.lastSeen=\{x:target\.x,y:target\.y\}/,"Horde enemies must continuously target live players");
assert.match(source,/approachStep\(enemy,target\)/,"Horde enemies must make direct inward approach steps");
assert.match(source,/moveCooldown=Math\.max\(Number\(enemy\.moveCooldown\|\|0\),90000\)/,"generic wandering movement must not override Horde encroachment steering");

assert.match(source,/v138-wave-\$\{wave\}-reserve/,"wave completion must be held while expanded reinforcements are still queued");
assert.match(source,/runState\.spawned>=baseQuota&&runState\.spawned<target/,"expanded reinforcements must begin after the original quota without breaking the rules engine");
assert.match(source,/DEFEATED \$\{Number\(runState\.defeated\|\|0\)\}\/\$\{quota\}/,"Horde HUD must show the expanded wave target");
assert.match(source,/They enter from the outer perimeter and converge on the centre/,"wave announcement must explain the new encroachment behaviour");

console.log("Lost Sizzler V10.38 live join, centre spawn and perimeter Horde pressure regression checks passed.");
