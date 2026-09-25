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
const r19=read("js/v10-42-r19-mobile-trap-layout-stability.js");
const rare=read("js/v10-15-rare-events-balance.js");
const render=read("js/game-render.js");

assert.match(systems,/kind:i%3===0\?"fire":i%3===1\?"spike":"shock"/,"generated floor traps must still cover fire, spike and shock");
assert.match(systems,/const ordinaryTrapKinds=\["fire","spike","shock"\]/,"dedicated hazard conversion must protect all three ordinary trap families");
assert.match(systems,/hazardReserveCount=.*>=3\?2:1[\s\S]*dedicatedHazardReserved=true/,"floor generation must reserve dedicated-hazard capacity before other room owners are assigned");
assert.match(systems,/hazardReserveLarge=[\s\S]*room\.w>=6&&room\.h>=5[\s\S]*hazardReserveCompact=[\s\S]*room\.w>=3&&room\.h>=3[\s\S]*hazardReserveOptional=[\s\S]*room\?\.optional[\s\S]*room\.w>=3&&room\.h>=3[\s\S]*hazardReserveTiny=[\s\S]*room\.w>=2&&room\.h>=2[\s\S]*hazardReserveOptionalTiny=[\s\S]*room\?\.optional[\s\S]*room\.w>=2&&room\.h>=2[\s\S]*hazardReserveRooms=\[[\s\S]*hazardReservePriority\(hazardReserveLarge\)[\s\S]*hazardReservePriority\(hazardReserveCompact\)[\s\S]*hazardReservePriority\(hazardReserveOptional\)[\s\S]*hazardReservePriority\(hazardReserveTiny\)[\s\S]*hazardReservePriority\(hazardReserveOptionalTiny\)/,"narrow floors must exhaust large, compact, optional and final 2x2 reservation tiers before allowing a mandatory dedicated hazard to disappear");
assert.match(systems,/hazardReserveAnyTiny=hazardReserveSort\\(\\(world\\.rooms\\|\\|\\[\\]\\)\\.filter[\\s\\S]*room\\.w>=2&&room\\.h>=2[\\s\\S]*hazardReservePriority\\(hazardReserveAnyTiny\\)/,"mandatory dedicated hazards must fall back to any remaining 2x2 non-start/non-exit room, including shallow non-optional rooms outside deepRooms");
assert.match(systems,/reservedHazardRooms=\(world\.rooms\|\|\[\]\)\.filter\(room=>Boolean\(room\?\.dedicatedHazardReserved[\s\S]*room\.w>=2&&room\.h>=2\)\)/,"dedicated hazard installation must honour emergency reservations from the complete room set down to the final narrow-room floor");
assert.match(systems,/fallbackHazardRooms=reservedHazardRooms\.length\+primaryHazardRooms\.length>=count\?\[\]:/,"optional/fallback rooms must only supplement dedicated hazards when reserved plus primary mandatory rooms are insufficient");
assert.match(systems,/relaxedHazardRooms=reservedHazardRooms\.length\+primaryHazardRooms\.length\+fallbackHazardRooms\.length>=count\?\[\]:/,"relaxed hazard rooms must only be considered when reserved, primary and fallback candidates are still insufficient");
assert.match(systems,/strictHazardRoomIds=new Set\(\[\.\.\.reservedHazardRooms,\.\.\.primaryHazardRooms,\.\.\.fallbackHazardRooms\]\.map\(room=>room\.id\)\)/,"reserved and strict hazard candidates must be tracked before relaxed selection");
assert.match(systems,/hazardEligible\(room,6,5\)&&!strictHazardRoomIds\.has\(room\.id\)/,"relaxed hazard candidates must exclude every strict candidate so one room cannot receive duplicate dedicated hazards");
assert.match(systems,/choices\.findIndex\(choice=>preservesOrdinaryTrapKinds\(choice\.room\)\)/,"hazard-room selection must skip rooms whose conversion would erase a trap family");
assert.match(systems,/function trapActive\(t,now\)\{const phase=\(now\+t\.phase\)%t\.period;return phase<t\.period\*\.46\}/,"all floor-trap kinds must share the canonical active-cycle clock");
assert.match(render,/const s=ws\(t\.x,t\.y\),active=SYS\.trapActive\(t,now\)/,"visible ACTIVE/SAFE trap presentation must use the canonical trap clock");

assert.match(stage6,/const fallbackEligibleRooms=baseEligibleRooms\.filter\(room=>!room\.sanctuary\)/,"Stage 6 family repair must have a compact-floor fallback beyond strict ordinary rooms");
assert.match(stage6,/for\(const pool of \[strictEligibleRooms,fallbackEligibleRooms,emergencyEligibleRooms\]\)/,"Stage 6 family repair must exhaust layered room fallbacks before allowing a trap family to disappear");

assert.match(r19,/function updateTrapContacts\(source="simulation"\)/,"R19 must expose one global floor-trap contact-cycle owner");
assert.match(r19,/rearmInactiveTrapContacts\(\);[\s\S]*const handled=damageOccupiedActiveTraps\(\)/,"the global cycle must rearm an inactive contact before checking active occupancy");
assert.match(r19,/owner\.call\(window,player,1,false,/,"validated floor-trap damage must remain exactly one health");
assert.match(r19,/player\.armor=0;[\s\S]*player\.armor=beforeArmor/,"floor-trap health damage must preserve armour");
assert.match(r19,/const canonicalHit=afterHealth<beforeHealth/,"R19 must count a trap hit only when HEALTH actually falls");
assert.doesNotMatch(r19,/canonicalHit=[^\n]*(?:afterHurtAt|lastHurtAt|lastDamageAt)/,"damage timestamps must not substitute for the required HEALTH loss");
assert.match(r19,/trapContacts\.add\(contactKey\)[\s\S]*trapRuntime\?\.contact\?\.add/,"a verified R19 hit must synchronise the canonical trap latch only after HEALTH loss");
assert.match(rare,/beforeHealth=Number\(player\.health\|\|0\)[\s\S]*hurtPlayer\(player,1,false,[\s\S]*Number\(player\.health\|\|0\)>=beforeHealth\)continue;[\s\S]*trapRuntime\.contact\.add\(key\)/,"the legacy reliable-trap owner must not latch a contact before proving HEALTH loss");
assert.match(play,/healthLost=Number\(p\.health\|\|0\)<beforeHealth[\s\S]*!routed&&healthLost&&damageAt>beforeDamageAt/,"base movement diagnostics must emit trap damage only after real HEALTH loss");
assert.match(r19,/trapContacts\.add\(contactKey\)/,"an active contact must latch after one hit");
assert.match(r19,/if\(occupied&&trapActive\(trap,now\)\)continue;/,"the latch must remain armed for the complete active phase");
assert.match(r19,/trapContacts\.delete\(contactKey\)/,"the contact must rearm after leaving the tile or entering a safe cycle");

assert.match(play,/CCGLostSizzlerV142R19MobileTrapLayoutStability\?\.updateTrapContacts\?\.\("simulation"\)/,"every live gameplay simulation frame must check occupied floor traps");
assert.doesNotMatch(play,/t\.kind==="shock"[\s\S]{0,120}(?:hurtPlayer|damageValidatedTrapContact)/,"shock traps must not use a separate damage rule");
assert.doesNotMatch(play,/t\.kind==="spike"[\s\S]{0,120}(?:hurtPlayer|damageValidatedTrapContact)/,"spike traps must not use a separate damage rule");
assert.doesNotMatch(play,/t\.kind==="fire"[\s\S]{0,120}(?:hurtPlayer|damageValidatedTrapContact)/,"fire traps must not use a separate damage rule");

console.log("C64 Dungeon Carnage global floor-trap activation contract passed.");
