import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const watchdog=read("js/v10-41-load-watchdog.js");
const r57=read("js/v10-41-r57-desktop-prep-stability.js");

assert.doesNotThrow(()=>new Function(watchdog),"R57 load-watchdog changes must parse");
assert.doesNotThrow(()=>new Function(r57),"R57 desktop-prep owner must parse");

assert.match(watchdog,/cheekycommodoregamer\.co\.uk/,"public beta lockdown must be hostname-scoped");
assert.match(watchdog,/BETA HAS ENDED/,"public page must state that the beta has ended");
assert.match(watchdog,/COMING SOON/,"public page must carry the Coming Soon sash");
for(const id of ["solo-btn","tutorial-zone-btn","create-btn","horde-solo-btn","horde-mode-btn","saboteurs-mode-btn","continue-save-btn","daily-btn","split-btn","join-btn","lobby-start-btn"]){
  assert.ok(watchdog.includes(`\"${id}\"`),`public lockdown must cover ${id}`);
}
assert.match(watchdog,/button\.disabled=true/,"public playable buttons must be genuinely disabled");
assert.match(watchdog,/const OWNER_USERNAME="cheeky commodore gamer"/,"owner preview must identify the unique Cheeky Commodore Gamer profile username");
assert.match(watchdog,/const OWNER_ROLE="admin"/,"owner preview must additionally require the admin role");
assert.match(watchdog,/ownerProfileMatches=profile=>normalizeAccountName\(profile\?\.username\)===OWNER_USERNAME&&normalizeAccountName\(profile\?\.role\)===OWNER_ROLE/,"owner access must use authenticated profile username and role rather than display text");
assert.match(watchdog,/from\("profiles"\)\.select\("username,role"\)\.eq\("id",user\.id\)/,"owner access must resolve the profile belonging to the authenticated user id");
assert.ok(!/select\("[^"]*display_name/.test(watchdog),"owner preview authorization must not trust a spoofable display name");
assert.match(watchdog,/publicPlayLocked=\(\)=>publicBetaClosed\(\)&&!ownerAccessGranted/,"live beta controls must stay locked unless private owner authorization succeeds");
assert.match(watchdog,/document\.body\?\.setAttribute\?\.\("data-public-beta","owner-preview"\)/,"verified owner access must switch the live page into owner-preview state");
assert.match(watchdog,/document\.getElementById\("ccg-beta-ended-sash"\)\?\.remove\(\)/,"verified owner access must remove the public Coming Soon sash");
assert.match(watchdog,/window\.addEventListener\("ccg:auth-ready",onOwnerAuthSignal\)/,"owner preview must react when the website auth session becomes ready");
assert.match(watchdog,/window\.addEventListener\("ccg:auth-changed",onOwnerAuthSignal\)/,"owner preview must relock or unlock when authentication changes");
assert.match(watchdog,/ownerAccessGranted=false;state\.ownerAccess=false;state\.ownerAuthChecked=true;lockPlayableControls\(\)/,"owner-auth failures must fail closed and leave public controls locked");
assert.match(watchdog,/Math\.min\(90,10\+Math\.floor\(Math\.max\(0,state\.modulesReady\)\/5\)\*10\)/,"loading progress must advance by real ten-percent module stages instead of sticking at 92%");
assert.match(watchdog,/state\.loadingStages\.push\(stage\)/,"loader must retain observable stage evidence");
assert.match(watchdog,/scheduleSoloLivenessCheck/,"Solo launch must gain a bounded post-menu liveness check");
assert.match(watchdog,/resetModeTransient\?\.\("Solo launch liveness recovery"\)/,"a failed post-mode Solo start must reset stale mode transients before its one retry");
assert.ok(!watchdog.includes("startSolo("),"watchdog must keep replaying canonical menu/tutorial ownership rather than directly owning startSolo");
assert.match(watchdog,/v10-41-r57-desktop-prep-stability\.js/,"early watchdog must chain R57 only after R56 exists");

assert.match(r57,/clearInterval\(api\.state\.timer\);api\.state\.timer=0/,"R57 must retire the flickering R56 periodic DOM icon pass");
assert.match(r57,/#quick-slots \.quick-slot>\.item-svg-wrap/,"canonical Quick Inventory SVG must become the only visible icon layer");
assert.match(r57,/\.r56-quick-slot-icon\{opacity:0!important;visibility:hidden!important\}/,"the redundant R56 icon must remain testable but invisible");
assert.match(r57,/function contactTick\(\)/,"R57 must own stall-safe shrine/trap contact recovery");
assert.match(r57,/triggerShrine\?\.\(player\)/,"standing on an active shrine must call the canonical shrine owner");
assert.match(r57,/triggerTrap\?\.\(player\)/,"new active trap cycles must call the canonical trap owner");
assert.match(r57,/window\.hurtPlayer\?\.\(player,1,false/,"a trap cycle with no canonical durability loss must receive exactly one fallback damage attempt");
assert.match(r57,/MAX_TIMED_DT=50/,"Timed Chamber simulation catch-up must be capped after a stall");
assert.match(r57,/INTERWAVE_MS=360/,"Timed Chamber waves must have a bounded inter-wave breathing interval");
assert.match(r57,/TIMED_ACTIVE_CAP=3/,"Timed Chamber must never retain more than three active wave enemies");
assert.match(r57,/host\.enemies\.splice\(i,1\)/,"dead Timed Chamber actors must be removed rather than accumulating for the whole room");
assert.match(r57,/recoverAfterStall/,"main-thread stalls must trigger movement/runtime recovery");
assert.match(r57,/function clampMovementCooldown\(index,cadence\)/,"post-stall recovery must own movement cooldown normalization");
assert.match(r57,/Math\.min\(current,cadence\)/,"post-stall recovery must clamp an existing cooldown instead of repeatedly rearming a full movement delay");
assert.match(r57,/current<0\?0/,"negative catch-up movement cooldowns must be zeroed after a stall");
assert.match(r57,/particles,420/,"visual-only particle backlog must be bounded after a stall");

assert.match(r57,/addEventListener\("keyup",onSpyTabKeyUp,true\)/,"Spy Field Kit must have a TAB keyup fallback when legacy capture owners swallow keydown");
assert.match(r57,/api\.setInventory\?\.\(true\);state\.spyTabFallbacks\+\+/,"failed Spy TAB opening must explicitly open the Field Kit");
assert.match(r57,/repairSpyLiveness/,"active Spy agents must have a stale-control recovery pass");
assert.match(r57,/api\.state\.lastMoveAt=0/,"impossible Spy movement timestamps must be reset");
assert.match(r57,/SPY_SWORD_TILES=10/,"Spy swords must be range-gated at ten tiles");
assert.match(r57,/!hasGun&&!spySwordAllowedFor\(player\)/,"sword drawing must be suppressed when the opponent is outside ten tiles");
assert.match(r57,/SPY_HP_MS=1500/,"Spy overhead HP must be transient after a hit");
assert.match(r57,/health<previous/,"Spy HP display window must be opened by actual health loss");
assert.match(r57,/remote\?\.set\?\.\(id,live\)/,"active Player 2 must receive a short-lived physical presence proxy through network gaps");
assert.match(r57,/live\.lastSeen=now/,"Spy split-screen presence must stay render-live while the rules model still says the player is active");
assert.match(r57,/function chainHas\(fn,marker,maxDepth=12\)/,"R57 must inspect renderer ownership through the existing wrapper chain");
assert.match(r57,/chainHas\(currentPlayer,"__ccgV141R57SpyHp"\)/,"R57 must reuse an existing Spy HP guard underneath a later visual wrapper instead of wrapping again");
assert.match(r57,/chainHas\(currentWeapon,"__ccgV141R57SpySwordRange"\)/,"R57 must reuse an existing Spy sword guard underneath later render wrappers");
assert.match(r57,/chainHas\(currentPlayer,"__ccgV141R51VisualPolish"\)\)wrapped\.__ccgV141R51VisualPolish=true/,"R57 must preserve the R51 visual-owner marker when R51 already exists in its player-render chain");
assert.match(r57,/chainHas\(currentPlayer,"__ccgV141R48CharacterAnimation"\)\)wrapped\.__ccgV141R48CharacterAnimation=true/,"R57 must preserve the R48 character-animation compatibility marker through its player guard");

console.log("R57 desktop-prep stability static contracts passed.");