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
const r58=read("js/v10-42-r58-combat-trap-core.js");
const rare=read("js/v10-15-rare-events-balance.js");
const render=read("js/game-render.js");

assert.match(systems,/kind:i%3===0\?"fire":i%3===1\?"spike":"shock"/,"generated floor traps must still cover fire, spike and shock");
assert.match(systems,/const ordinaryTrapKinds=\["fire","spike","shock"\]/,"dedicated hazard conversion must protect all three ordinary trap families");
assert.match(systems,/hazardReserveCount=.*>=3\?2:1[\s\S]*dedicatedHazardReserved=true/,"floor generation must reserve dedicated-hazard capacity before other room owners are assigned");
assert.match(systems,/hazardReserveLarge=[\s\S]*room\.w>=6&&room\.h>=5[\s\S]*hazardReserveCompact=[\s\S]*room\.w>=3&&room\.h>=3[\s\S]*hazardReserveOptional=[\s\S]*room\?\.optional[\s\S]*room\.w>=3&&room\.h>=3[\s\S]*hazardReserveTiny=[\s\S]*room\.w>=2&&room\.h>=2[\s\S]*hazardReserveOptionalTiny=[\s\S]*room\?\.optional[\s\S]*room\.w>=2&&room\.h>=2[\s\S]*hazardReserveRooms=\[[\s\S]*hazardReservePriority\(hazardReserveLarge\)[\s\S]*hazardReservePriority\(hazardReserveCompact\)[\s\S]*hazardReservePriority\(hazardReserveOptional\)[\s\S]*hazardReservePriority\(hazardReserveTiny\)[\s\S]*hazardReservePriority\(hazardReserveOptionalTiny\)/,"narrow floors must exhaust large, compact, optional and final 2x2 reservation tiers before allowing a mandatory dedicated hazard to disappear");
assert.match(systems,/hazardReserveAnyTiny=hazardReserveSort\(\(world\.rooms\|\|\[\]\)\.filter[\s\S]*room\.w>=2&&room\.h>=2[\s\S]*hazardReservePriority\(hazardReserveAnyTiny\)/,"mandatory dedicated hazards must fall back to any remaining 2x2 non-start/non-exit room, including shallow non-optional rooms outside deepRooms");
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

assert.match(r58,/function updateTrapContacts\(\)/,"R58 must expose the single global floor-trap contact-cycle owner");
assert.match(r58,/rearmTrapContacts\(\);const now=performance\.now\(\);let handled=false/,"the R58 global cycle must rearm stale contacts before checking active occupancy");
assert.match(r58,/canonicalHurtPlayer\.call\(window,p,1,false,/,"validated floor-trap damage must remain exactly one health through the canonical damage/death primitive");
assert.match(r58,/p\.armor=0;p\.invuln=0;[\s\S]*p\.armor=beforeArmor/,"floor-trap health damage must preserve armour");
assert.match(r58,/const healthLost=Number\(p\.health\|\|0\)<beforeHealth,deathRecorded=/,"R58 must count a trap hit only after verified HEALTH loss or a lethal death transition");
assert.doesNotMatch(r58,/healthLost=[^\n]*(?:lastHurtAt|lastDamageAt)/,"damage timestamps must not substitute for required HEALTH loss");
assert.match(r58,/if\(!healthLost&&!deathRecorded\)\{p\.invuln=beforeInvuln;state\.trapRetries\+\+;return false\}[\s\S]*trapContacts\.set\(key,\{cycle,at:now\}\)/,"failed active trap contacts must remain retryable and only a verified hit may consume the current cycle");
assert.match(r58,/if\(record\?\.cycle===cycle\)return true/,"a verified hit must latch the current active cycle against duplicate damage");
assert.match(r58,/for\(const key of \[\.\.\.trapContacts\.keys\(\)\]\)if\(!live\.has\(key\)\)\{trapContacts\.delete\(key\);state\.trapRearms\+\+\}/,"the R58 contact ledger must rearm after leaving the tile or entering a safe cycle");
assert.match(r19,/const core=window\.CCGLostSizzlerV142R58CombatTrapCore;[\s\S]*if\(core\)\{syncPortraitCanvasAspect\(\);return\}/,"R19 must become layout-only once R58 exists");
assert.match(play,/CCGLostSizzlerV142R58CombatTrapCore\?\.updateTrapContacts\?\.\("simulation"\)/,"every live gameplay simulation frame must check occupied floor traps through R58");
assert.doesNotMatch(play,/CCGLostSizzlerV142R19MobileTrapLayoutStability\?\.updateTrapContacts\?\.\("simulation"\)/,"the canonical simulation must not restore the retired R19 trap owner");
assert.doesNotMatch(play,/t\.kind==="shock"[\s\S]{0,120}(?:hurtPlayer|damageValidatedTrapContact)/,"shock traps must not use a separate damage rule");
assert.doesNotMatch(play,/t\.kind==="spike"[\s\S]{0,120}(?:hurtPlayer|damageValidatedTrapContact)/,"spike traps must not use a separate damage rule");
assert.doesNotMatch(play,/t\.kind==="fire"[\s\S]{0,120}(?:hurtPlayer|damageValidatedTrapContact)/,"fire traps must not use a separate damage rule");

console.log("C64 Dungeon Carnage global floor-trap activation contract passed.");
