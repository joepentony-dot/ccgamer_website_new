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

assert.match(systems,/kind:i%3===0\?"fire":i%3===1\?"spike":"shock"/,"generated floor traps must still cover fire, spike and shock");
assert.match(systems,/const ordinaryTrapKinds=\["fire","spike","shock"\]/,"dedicated hazard conversion must protect all three ordinary trap families");
assert.match(systems,/hazardReserveCount=.*>=3\?2:1[\s\S]*dedicatedHazardReserved=true/,"floor generation must reserve dedicated-hazard capacity before other room owners are assigned");
assert.match(systems,/hazardReserveLarge=[\s\S]*room\.w>=6&&room\.h>=5[\s\S]*hazardReserveCompact=[\s\S]*room\.w>=3&&room\.h>=3[\s\S]*hazardReserveOptional=[\s\S]*room\?\.optional[\s\S]*room\.w>=3&&room\.h>=3[\s\S]*hazardReserveRooms=\[[\s\S]*hazardReservePriority\(hazardReserveLarge\)[\s\S]*hazardReservePriority\(hazardReserveCompact\)[\s\S]*hazardReservePriority\(hazardReserveOptional\)/,"compact floors must layer large, compact and optional reservation tiers before allowing a mandatory dedicated hazard to disappear");
assert.match(systems,/reservedHazardRooms=\(world\.rooms\|\|\[\]\)\.filter\(room=>Boolean\(room\?\.dedicatedHazardReserved[\s\S]*room\.w>=3&&room\.h>=3\)\)/,"dedicated hazard installation must honour emergency reservations from the complete room set down to the safe compact-room floor");
assert.match(systems,/fallbackHazardRooms=reservedHazardRooms\.length\+primaryHazardRooms\.length>=count\?\[\]:/,"optional/fallback rooms must only supplement dedicated hazards when reserved plus primary mandatory rooms are insufficient");
assert.match(systems,/relaxedHazardRooms=reservedHazardRooms\.length\+primaryHazardRooms\.length\+fallbackHazardRooms\.length>=count\?\[\]:/,"relaxed hazard rooms must only be considered when reserved, primary and fallback candidates are still insufficient");
assert.match(systems,/strictHazardRoomIds=new Set\(\[\.\.\.reservedHazardRooms,\.\.\.primaryHazardRooms,\.\.\.fallbackHazardRooms\]\.map\(room=>room\.id\)\)/,"reserved and strict hazard candidates must be tracked before relaxed selection");
assert.match(systems,/hazardEligible\(room,6,5\)&&!strictHazardRoomIds\.has\(room\.id\)/,"relaxed hazard candidates must exclude every strict candidate so one room cannot receive duplicate dedicated hazards");
assert.match(systems,/choices\.findIndex\(choice=>preservesOrdinaryTrapKinds\(choice\.room\)\)/,"hazard-room selection must skip rooms whose conversion would erase a trap family");
assert.match(systems,/function trapActive\(t,now\)\{const phase=\(now\+t\.phase\)%t\.period;return phase<t\.period\*\.46\}/,"all floor-trap kinds must share the canonical active-cycle clock");
assert.match(render,/const s=ws\(t\.x,t\.y\),active=SYS\.trapActive\(t,now\)/,"visible ACTIVE/SAFE trap presentation must use the canonical trap clock");

assert.match(stage6,/const fallbackEligibleRooms=baseEligibleRooms\.filter\(room=>!room\.sanctuary\)/,"Stage 6 family repair must have a compact-floor fallback beyond strict ordinary rooms");
assert.match(stage6,/for\(const pool of \[strictEligibleRooms,fallbackEligibleRooms,emergencyEligibleRooms\]\)/,"Stage 6 family repair must exhaust layered room fallbacks before allowing a trap family to disappear");

assert.match(play,/function updateActiveTrapContacts\(source="simulation"\)/,"r58 must expose one global floor-trap contact-cycle owner");
assert.match(play,/function updateActiveTrapContacts\(source="simulation"\)[\s\S]*rearmInactiveTrapContacts\(\)/,"the global cycle must rearm completed/inactive contacts before checking active occupancy");
assert.match(play,/hurtPlayer\(p,1,false,`\$\{String\(t\.kind\|\|"floor"\)\} trap`\)/,"validated floor-trap damage must remain exactly one canonical damage unit");
assert.match(play,/const trapDamage=\/trap\/i\.test[\s\S]*if\(!trapDamage&&p\.armor>0\)/,"floor-trap HEALTH damage must bypass armour without consuming it");
assert.match(play,/if\(!verified\)return false;[\s\S]*trapCycleHits\.set\(key,cycle\)/,"an active contact may latch only after verified trap-attributed damage");
assert.match(play,/if\(trapCycleHits\.get\(key\)===cycle\)return false/,"the same player/trap active cycle must not double-hit");
assert.match(play,/trapCycleId\(t,now\)!==cycle[\s\S]*trapCycleHits\.delete\(key\)/,"the next mathematical trap cycle must rearm even if no inactive frame was sampled");

assert.match(play,/updateActiveTrapContacts\(\);/,"every live gameplay simulation frame must check occupied floor traps through the r58 core");
assert.doesNotMatch(play,/t\.kind==="shock"[\s\S]{0,120}(?:hurtPlayer|damageValidatedTrapContact)/,"shock traps must not use a separate damage rule");
assert.doesNotMatch(play,/t\.kind==="spike"[\s\S]{0,120}(?:hurtPlayer|damageValidatedTrapContact)/,"spike traps must not use a separate damage rule");
assert.doesNotMatch(play,/t\.kind==="fire"[\s\S]{0,120}(?:hurtPlayer|damageValidatedTrapContact)/,"fire traps must not use a separate damage rule");

console.log("C64 Dungeon Carnage global floor-trap activation contract passed.");
