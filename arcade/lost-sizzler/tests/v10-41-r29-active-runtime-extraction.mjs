import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const sourcePath=path.resolve(here,"../js/v10-41-r29-runtime-repair.js");
const source=fs.readFileSync(sourcePath,"utf8");

const requiredActive=[
  "function originalChainHasMarker(",
  "function payDownCombatGap(",
  "function stableLoop(",
  "function installStableLoop(",
  "function silenceGameplayAudio(",
  "function installQuitAudioGuard(",
  "function contactBlock(",
  "function installContactCombatGuard(",
  "function normaliseItemTitle(",
  "function normaliseItemNames(",
  "function drawEnhancedPickup(",
  "function installPickupGraphics(",
  "function sealRoomDoorBypasses(",
  "function repairDungeonStructure(",
  "function handleEnterProgress(",
  "function installEnterProgress(",
  "window.CCGLostSizzlerV141R29={"
];
for(const token of requiredActive)assert.ok(source.includes(token),`r29 active runtime must retain ${token}`);

const retiredOwnership=[
  "SPY_HINT_COOLDOWN_MS",
  "installHordeFriendlyFireGuard",
  "installHordeNetworkDamageGuard",
  "installSpyToastThrottle",
  "installSpyMovementOwner",
  "desiredHordeQuota",
  "hordeRemaining",
  "ensureRemainingHud",
  "updateRemainingHud",
  "spyMove(",
  "spyStep(",
  "primeSpyDoor(",
  "CCGLostSizzlerHordeAudio",
  "CCGLostSizzlerSaboteursAudio",
  "CCGLostSizzlerSpecialModes",
  "__ccgV141R29HordeFriendly",
  "__ccgV141R29HordePacket",
  "__ccgV141R29SpyToast",
  "__ccgV141R29SpyOwner",
  "damageInstalled",
  "packetInstalled",
  "spyMoveInstalled",
  "hordeFriendlyFireBlocked",
  "hordeEnemyHitsRerouted",
  "spyHintsSuppressed"
];
for(const token of retiredOwnership)assert.equal(source.includes(token),false,`retired Horde/Spy ownership must not remain in active r29 source: ${token}`);

assert.ok(source.includes("state.loopInstalled&&state.quitInstalled&&state.contactInstalled&&state.pickupInstalled&&state.enterInstalled"),"r29 health gate must depend only on retained active owners");
assert.ok(source.includes("S.stopMusic()"),"ordinary gameplay music shutdown must remain");
assert.ok(source.includes('CCGLostSizzlerVoice?.stop?.("menu")'),"ordinary voice shutdown must remain");
assert.equal(/function repairDungeonStructure\(\)\{\s*if\(modeType\(\)\)/.test(source),false,"active dungeon structure repair must not depend on a retired special-mode selector");

console.log("C64 Dungeon Carnage r29 active-runtime extraction source contract passed.");