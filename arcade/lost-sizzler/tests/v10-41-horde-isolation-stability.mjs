import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const hordeSafety=read("js/v10-41-horde-mode-safety.js");
const major=read("js/v10-41-major-notification-hardening.js");
const audio=read("js/horde-survivor-audio.js");
const freeze=read("js/v10-41-startup-freeze-guard.js");
const lake=read("js/v10-41-lake-item-safety.js");
const noPause=read("js/v10-41-multiplayer-no-pause.js");
const cacheGuard=read("js/v10-41-cache-guard.js");
const index=read("index.html");
const manifest=JSON.parse(read("version.json"));

// Horde identification is intentionally mode-based, so the same isolation
// applies to Solo Horde and Horde Multiplayer.
assert.match(hordeSafety,/active\(\)\?\.type==="horde-survivor"\|\|document\.body\?\.dataset\?\.specialMode==="horde-survivor"/,"Horde safety must cover both Solo and Multiplayer Horde through the common special-mode type");
assert.match(hordeSafety,/if\(rare\.bounty\)\{rare\.bounty=null/,"Horde must delete ordinary Dungeon Bounty state before legacy dungeon updates run");
assert.match(hordeSafety,/if\(rare\.mutation\)\{rare\.mutation=null/,"Horde must delete ordinary floor mutations");
assert.match(hordeSafety,/for\(const name of \["items","chests","shrines","switches","shops","deathCaches","generators","traps","hazardRooms","timedRooms"\]\)empty\(name\)/,"Horde must strip legacy dungeon-only interactables and hazards");
assert.match(hordeSafety,/host\.enemies=host\.enemies\.filter\(enemy=>enemy\?\.hordeEnemy\|\|enemy\?\.hordeWarden\|\|enemy\?\._hordeModelId\|\|enemy\?\._v138Reserve\)/,"Horde must retain only Horde-owned enemy actors");
const before=hordeSafety.indexOf("if(isHorde())purgeDungeonRuntime();\n      const result=previous.apply");
assert.ok(before>=0,"Horde purge must execute before the inherited dungeon update chain");
assert.match(hordeSafety,/if\(isHorde\(\)\)purgeDungeonRuntime\(\);\n      const result=previous\.apply\(this,arguments\);\n      if\(isHorde\(\)\)purgeDungeonRuntime\(\)/,"Horde purge must run both before and after inherited updates");

assert.match(major,/if\(isHorde\(\)\)\{hideExistingDungeonAlert\(\);return false\}/,"Dungeon Bounty major alerts must be rejected outright in Horde");
assert.match(major,/DUNGEON BOUNTY\|BOUNTY START\|BOUNTY COMPLETE\|DUNGEON BONUS/,"Dungeon Bounty/Bonus titles must be classified as Horde-forbidden");
assert.match(major,/bountyStart\|bounty\|bountyComplete/,"Dungeon bounty voice events must be blocked while Horde owns announcements");
assert.match(audio,/if \(root\?\.CCGLostSizzlerSpecialModes\?\.active\?\.type === "horde-survivor"\) return true/,"Horde audio isolation must key off the common Horde special mode for Solo and Multiplayer");
assert.match(audio,/voice\.state\.queue\.length = 0/,"Horde audio isolation must clear pending legacy voice work");

// The repeated 92% freeze was traced to V10.36's synchronous canvas-to-data-URL
// sprite re-encoding in the release-gate finish callback. The r23 guard must
// bypass that path and must never perform its own data URL conversion.
assert.match(freeze,/source\.__ccgV136Guttered=true/,"startup guard must mark the legacy synchronous gutter conversion as already handled");
assert.doesNotMatch(freeze,/\.toDataURL\s*\(/,"startup guard must never synchronously encode a canvas as a data URL");
assert.match(freeze,/assets\.chests=canvas/,"deferred sprite preparation must use the canvas directly rather than allocating an encoded image string");
assert.match(freeze,/requestIdleCallback/,"safe atlas preparation must be deferred away from the release-gate critical path");
assert.match(cacheGuard,/v10-41-startup-freeze-guard\.js\?v=\$\{CACHE_TOKEN\}/,"freeze guard must start from the first cache-safety script before V10.36 enhancement bootstrap");
assert.match(cacheGuard,/data-ccg-v141-startup-freeze-guard/,"early freeze guard loader must publish a duplicate-prevention marker");

// Lake/sanctuary safety is irrelevant in Horde and must not poll the arena.
assert.match(lake,/if\(hordeActive\(\)\)return 0/,"sanctuary lake repair must exit immediately in Horde");
assert.match(lake,/load\("js\/v10-41-horde-mode-safety\.js","data-ccg-v141-horde-mode-safety"\)/,"r23 safety entry must request the fresh Horde isolation guard through the shared release token");
assert.match(lake,/load\("js\/v10-41-multiplayer-no-pause\.js","data-ccg-v141-multiplayer-no-pause"\)/,"r23 safety entry must request multiplayer no-pause hardening through the shared release token");
assert.match(lake,/script\.src=`\$\{path\}\?v=\$\{encodeURIComponent\(releaseRev\)\}`/,"late Horde safety modules must inherit the current published cache generation");

// Pause rules: all real multiplayer modes continue; Solo Horde remains a
// single-player run and therefore retains pause even though the shared special
// launcher internally labels it playMode="online".
assert.match(noPause,/if\(type==="sizzler-saboteurs"\)return true/,"Spy Vs Spy must never pause");
assert.match(noPause,/function soloHorde\(\)\{return document\.body\?\.dataset\?\.hordeSolo==="true"\}/,"Solo Horde must have an explicit single-player discriminator");
assert.match(noPause,/if\(soloHorde\(\)\)return false/,"Solo Horde must remain pauseable before the shared online playMode flag is considered");
assert.match(noPause,/if\(type==="horde-survivor"\)[\s\S]*return readPlayMode\(\)==="online"\|\|count>1/,"all non-Solo Horde runs must disable pause, including a multiplayer host currently alone in the room");
assert.match(noPause,/if\(readPlayMode\(\)==="online"\)return true/,"online Dungeon Multiplayer must never pause");
assert.match(noPause,/if\(hasSecondLocalPlayer\(\)\)return true/,"2P split screen must never pause");
assert.match(noPause,/event\.code!=="Escape"&&event\.code!=="KeyP"/,"Escape and P must be intercepted in multiplayer");
assert.match(noPause,/window\.pause=function pauseV141MultiplayerLock/,"direct pause calls must also be blocked in multiplayer");

assert.equal(manifest.build,"2026.08.25.23","Horde stability fixes must be published as build .23");
assert.equal(manifest.cacheToken,"20260825r23","Horde stability fixes must force the r23 cache shell");
assert.match(index,/ccg-lost-sizzler-build" content="2026\.08\.25\.22"/,"HTML build marker must match r23");
assert.match(index,/ccg-lost-sizzler-cache" content="20260825r23"/,"HTML cache marker must match r23");

console.log("Lost Sizzler V10.41 Horde Solo/Multiplayer isolation, startup freeze and no-pause regression checks passed.");
