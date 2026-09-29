import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(gameDir,relative),"utf8");

const systems=read("js/systems.js");
const stage6=read("js/v10-42-stage6-zone-gameplay.js");
const play=read("js/game-play.js");
const render=read("js/game-render.js");

assert.match(systems,/host\.traps=\[\];/,"R67 base floor generation must leave ordinary procedural traps empty");
assert.doesNotMatch(systems,/kind:i%3===0\?"fire":i%3===1\?"spike":"shock"/,"R67 must not procedurally scatter ordinary FIRE/SPIKE/SHOCK traps");
assert.match(systems,/types=\["blade","embers","arrows"\];host\.hazardRooms=\[\];/,"dedicated blade, ember and arrow rooms must remain the generated hazard families");
assert.match(systems,/const hazard=\{id:\`hazard-\$\{floor\}-\$\{i\}\`[\s\S]*host\.hazardRooms\.push\(hazard\)[\s\S]*room\.dedicatedHazard=true/,"dedicated hazards must be owned by marked hazard rooms");
assert.match(systems,/while\(\(host\.hazardRooms\|\|\[\]\)\.length<count\)/,"compact floors must still receive the required dedicated hazard-room count");
assert.match(systems,/R67 intentionally does not restore ordinary FIRE\/SPIKE\/SHOCK traps/,"the base decorator must document the retired ordinary-trap boundary");
assert.match(stage6,/hostState\.traps=\[\];[\s\S]*ensureDedicatedHazard\(worldState,hostState,runState,profile,seed\)/,"Stage 6 must clear ordinary traps and then preserve/restore only a dedicated hazard room");
assert.doesNotMatch(stage6,/reconcileTrapFamilies\(hostState,seed,worldState,\{\.\.\.profile,floor\}\);/,"Stage 6 must not invoke the legacy ordinary trap-family restoration path");
assert.match(stage6,/function ensureDedicatedHazard\([\s\S]*hostState\.hazardRooms\.push\(hazard\)/,"Stage 6 must be able to restore a real dedicated hazard room when needed");
assert.match(systems,/function hazardCellState\(hazard,x,y,elapsed=0\)/,"dedicated hazards must use the canonical warning/active phase resolver");
assert.match(render,/function drawDedicatedHazards\(\)[\s\S]*SYS\.hazardCellState\(hazard,cell\.x,cell\.y,elapsed\)/,"dedicated hazard presentation must use the same canonical warning/active phase resolver");

assert.match(play,/function updateActiveTrapContacts\(source="simulation"\)/,"r58 must expose one global floor-trap contact-cycle owner");
assert.match(play,/function updateActiveTrapContacts\(source="simulation"\)[\s\S]*rearmInactiveTrapContacts\(\)/,"the global cycle must rearm completed/inactive contacts before checking active occupancy");
assert.match(play,/authoritativeDamagePlayer\(p,1,false,`\$\{String\(t\.kind\|\|"floor"\)\} trap`\)/,"validated floor-trap damage must remain exactly one canonical damage unit");
assert.match(play,/const damageSource=String\(source\|\|"enemy"\),trapDamage=\/trap\/i\.test\(damageSource\),environmentDamage=[\s\S]*if\(!trapDamage&&p\.armor>0\)/,"floor-trap HEALTH damage must bypass armour without consuming it while ordinary damage retains armour");
assert.match(play,/const healthLost=afterHealth<beforeHealth,deathRecorded=afterDeaths>beforeDeaths,verified=\(healthLost\|\|deathRecorded\)&&\/trap\/i\.test\(damageSource\)/,"trap verification must require real HEALTH loss or a canonical death transition");
assert.match(play,/if\(!verified\)\{p\.invuln=beforeInvuln;authoritativeTrapState\.damageRetries\+\+;return false\}[\s\S]*trapCycleHits\.set\(key,cycle\)/,"an active contact may latch only after verified HEALTH/death while failed contacts restore prior invulnerability and remain retryable");
assert.match(play,/if\(trapCycleHits\.get\(key\)===cycle\)\{authoritativeTrapState\.trapContactBlocks\+\+;return false\}/,"the same player/trap active cycle must not double-hit and must remain observable in canonical diagnostics");
assert.match(play,/trapCycleId\(t,now\)!==cycle[\s\S]*trapCycleHits\.delete\(key\)/,"the next mathematical trap cycle must rearm even if no inactive frame was sampled");

assert.match(play,/updateActiveTrapContacts\("simulation-post"\);/,"every live gameplay simulation frame must check occupied floor traps through the authoritative post-encounter r58 core");
assert.doesNotMatch(play,/t\.kind==="shock"[\s\S]{0,120}(?:hurtPlayer|damageValidatedTrapContact)/,"shock traps must not use a separate damage rule");
assert.doesNotMatch(play,/t\.kind==="spike"[\s\S]{0,120}(?:hurtPlayer|damageValidatedTrapContact)/,"spike traps must not use a separate damage rule");
assert.doesNotMatch(play,/t\.kind==="fire"[\s\S]{0,120}(?:hurtPlayer|damageValidatedTrapContact)/,"fire traps must not use a separate damage rule");

console.log("C64 Dungeon Carnage R67 dedicated-hazard-only activation contract passed.");
