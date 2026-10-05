import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const map=read("js/v10-42-r69-recorded-voices.js");
const voiceSandbox={window:{}};
(new Function("window",map+";return window.CCG_RECORDED_VOICE_SPRITE;"))(voiceSandbox.window);
const recordedPack=voiceSandbox.window.CCG_RECORDED_VOICE_SPRITE;
assert.ok(recordedPack&&recordedPack.aliases&&recordedPack.cues,"recorded voice metadata must execute into a complete sprite map");
for(const [alias,cue] of Object.entries(recordedPack.aliases))assert.ok(recordedPack.cues[cue],`recorded alias ${alias} points to missing cue ${cue}`);
assert.equal(recordedPack.aliases.welcome,"welcome","primary run greeting must resolve to the owner-recorded welcome cue");
assert.equal(recordedPack.aliases.welcomeAlt,"stay-alert","the second normal run greeting must use the supplied owner-recorded Stay Alert cue");
assert.equal(recordedPack.aliases.welcomeRare,undefined,"the rare Watchers greeting must remain isolated from the owner sprite rather than aliasing to the normal welcome");
for(const currentEssenceKey of ["essenceCollected","notEnoughEssence","essenceLore"]){
  assert.equal(recordedPack.aliases[currentEssenceKey],undefined,`${currentEssenceKey} must not reuse an obsolete artefact-worded owner recording`);
}
const unreferencedRecordedCues=Object.keys(recordedPack.cues).filter(cue=>!Object.values(recordedPack.aliases).includes(cue));
assert.deepEqual(unreferencedRecordedCues,["bronze-key-required"],"every owner-recorded cue except the retained duplicate legacy bronze-key phrase must remain addressable");
const runtimeDir=path.join(root,"js");
const runtimeSources=fs.readdirSync(runtimeDir)
  .filter(name=>name.endsWith(".js")&&name!=="v10-42-r69-recorded-voices.js")
  .map(name=>{
    let source=fs.readFileSync(path.join(runtimeDir,name),"utf8");
    if(name==="v10-16-voice-director.js")source=source.replace(/const lines=\{[\s\S]*?\n  \};/,"");
    return source
  }).join("\n");
const ownerAliasesWithoutRuntimeRoute=Object.keys(recordedPack.aliases).filter(alias=>!runtimeSources.includes(alias)).sort();
const intentionallyRetiredAliases=[
  "artefactCollected",
  "needThreeArtefacts",
  "notEnoughScore",
  "npc.merchant.hidden.empty",
  "npc.merchant.hidden.partial",
  "npc.merchant.hidden.ready",
  "purchaseComplete"
].sort();
assert.deepEqual(ownerAliasesWithoutRuntimeRoute,intentionallyRetiredAliases,"only explicitly retired duplicate/obsolete owner-recorded aliases may lack a live runtime route");
for(const currentKey of ["watchStep","enemiesNearby","escortScout","guardianEncountered","useBanishmentFlask"]){
  assert.ok(!ownerAliasesWithoutRuntimeRoute.includes(currentKey),`${currentKey} must have a live current-game trigger`);
}
const voiceAsset=path.join(root,"assets/audio/voice/ccg-recorded-voices-r69.ogg");
assert.ok(fs.existsSync(voiceAsset),"the owner-recorded R69 OGG sprite must be present in the public runtime");
assert.ok(fs.statSync(voiceAsset).size>1_900_000,"the recorded voice sprite must contain the assembled 84-cue payload");
const voice=read("js/v10-16-voice-director.js");
const stage8=read("js/v10-41-stage8-npc-dialogue.js");
const play=read("js/game-play.js");
const runtime=read("js/game-local-runtime.js");
const loader=read("js/asset-overrides.js");
const sanctuary=read("js/v10-41-sanctuary-azalea.js");
const sanctuaryHardening=read("js/v10-41-sanctuary-hardening.js");
const core=read("js/game-core.js");
const sanctuaryScene=read("js/v10-41-sanctuary-azalea.js");
const sanctuaryEscort=read("js/v10-41-sanctuary-hardening.js");

assert.match(map,/ccg-recorded-voices-r69\.ogg/,"R69 must target the owner-recorded browser voice sprite");
assert.match(map,/"hello-big-boy":\{"start":/,"sanctuary greeting must have an explicit sprite cue");
assert.match(map,/"npc\.sanctuary\.keeper":"hello-big-boy"/,"sanctuary keeper must resolve to the recorded greeting");
assert.match(map,/"bronzeKeyRequired":"you-need-a-bronze-key"/,"bronze lock feedback must resolve to the supplied full recorded cue");
assert.match(map,/"chestKeyRequired":"you-need-a-key-to-open-this-chest"/,"locked chest feedback must resolve to the recorded cue");
assert.match(loader,/v10-42-r69-recorded-voices\.js[\s\S]*v10-16-voice-director\.js/,"recorded voice metadata must load before the single voice director");
assert.match(voice,/recorded\?\.aliases\?\.\[key\]/,"voice playback must prefer the recorded sprite alias without adding a competing audio owner");
assert.match(voice,/recordedAvailable=Boolean\(recordedCue\)/,"recorded voice playback must know when the owner's cue exists");
assert.match(voice,/function primeRecordedVoices\(\)/,"mobile user gestures must prime the recorded voice media before delayed gameplay speech");
assert.match(voice,/document\.addEventListener\("pointerdown",unlock,\{capture:true\}\)/,"voice media unlock must remain available on every pointer gesture, not disappear after the first tap");
assert.match(voice,/document\.addEventListener\("touchstart",unlock,\{capture:true,passive:true\}\)/,"touch-first mobile browsers must have an explicit recorded-voice unlock path");
assert.doesNotMatch(voice,/pointerdown",unlock,\{once:true/,"mobile voice unlock must not be a one-shot listener");
assert.match(voice,/\(recordedAvailable\|\|approvedLegacy\)&&retryOnGesture[\s\S]*state\.pendingGesture=\{key,priority,runRef\}/,"a rejected approved recording must be retained for the next real user gesture");
assert.match(voice,/p\?\.then[\s\S]*fallback\(true\)/,"recorded sprite play-promise rejection must enter the gesture retry path");
assert.match(voice,/beginRun=function beginRunV116Voice[\s\S]*state\.unlocked=true;primeRecordedVoices\(\)/,"loader-replayed Solo starts must still attempt the recorded welcome and retain it for gesture retry");
assert.match(voice,/if\(state\.pendingGesture\)retryPendingGesture\(\)/,"a retained recorded cue must retry synchronously inside the next real mobile user gesture");
assert.doesNotMatch(voice,/pendingGesture\)queueMicrotask\(retryPendingGesture\)/,"mobile retry must not be deferred outside the user-activation handler");
assert.match(voice,/audio\.onerror=\(\)=>fallback\(false\)/,"media/network errors must not be misclassified as autoplay rejections");
assert.match(voice,/function approvedLegacyGreeting\(key\)\{return key==="welcomeRare"\?BUNDLED_SPRITE\.cues\.welcomeRare:null\}/,"only the dedicated rare Watchers greeting may use the historical bundled sprite");
assert.doesNotMatch(voice,/function speakText\(|SpeechSynthesisUtterance|speechSynthesis\.speak/,"browser TTS fallback must be absent from the production voice owner");
assert.match(voice,/greetingRoll=Math\.random\(\),welcomeKey=greetingRoll<\.1\?"welcomeRare":greetingRoll<\.55\?"welcome":"welcomeAlt"/,"run start must retain two normal greetings plus a ten-percent rare Watchers greeting");
assert.match(loader,/const criticalFiles=\["admin-audio-overrides\.js","lost-sizzler-playlist-audio\.js","v10-42-r69-recorded-voices\.js","v10-16-voice-director\.js"/,"recorded voice metadata and director must be release-critical");
assert.match(voice,/LOCKED BRONZE DOOR[\s\S]*bronzeKeyRequired/,"bronze doors must classify into explicit recorded feedback");
assert.match(voice,/LOCKED CHEST[\s\S]*chestKeyRequired/,"locked chests must classify into explicit recorded feedback");
assert.match(voice,/ccg:item-collected/,"pickup recordings must be driven by the established collection event");
assert.match(stage8,/text:"Hello, big boy\."/,"sanctuary keeper subtitle must match the supplied recorded line");
assert.match(stage8,/voiceKey:"npc\.sanctuary\.keeper"/,"sanctuary greeting must stay on the Stage 8 dialogue voice owner");
assert.match(play,/const paidBronzeKey=Boolean\(chest\.locked&&!roomKeyPaid\);if\(chest\.locked&&!roomKeyPaid\)p\.bronzeKeys--;if\(paidBronzeKey\)[\s\S]*CCGLostSizzlerVoice\?\.say\?\.\("chestUnlocked"/,"a standalone locked chest must announce unlock only after the canonical bronze-key debit succeeds");
assert.match(play,/dedicatedHazard[\s\S]*CCGLostSizzlerVoice\?\.say\?\.\("trapsNearby"/,"dedicated hazards must issue the recorded proximity warning");
assert.match(runtime,/e\.exitWarden[\s\S]*sigilWardenDefeated[\s\S]*e\.guardian[\s\S]*guardianDefeated/,"guardian defeat recordings must be tied to actual enemy death ownership");
assert.match(runtime,/target!==host\.stalker[\s\S]*deathStalkerBanished[\s\S]*cooldown:0/,"permanent Death Stalker banishment must use the supplied banishment confirmation without mislabelling Count Loadula");
assert.match(sanctuary,/sayDialogue\?\.\("npc\.sanctuary\.keeper","Hello, big boy\."/,"walking onto a sanctuary dancer must play the supplied greeting directly");
assert.match(sanctuary,/ccgDialogueVoiceHandled:true/,"sanctuary dancer greeting must suppress duplicate generic speech when the recording starts");
assert.match(sanctuaryHardening,/say\?\.\("adventurerHelp"/,"lost adventurer recruitment must use the supplied rescue plea");
assert.match(sanctuaryHardening,/say\?\.\("adventurerSafe"/,"lost adventurer rescue must use the supplied safe-arrival recording");
assert.match(core,/function descendFloor\(\)[\s\S]*CCGLostSizzlerVoice\?\.say\?\.\("descending"/,"descending to the next floor must use the supplied descent recording");
assert.match(voice,/ccg:hazard-damage/,"voice director must subscribe to authoritative hazard damage");
assert.match(voice,/sayKey\("hazardPain"/,"actual hazard damage must be able to trigger the supplied post-hit voice");
assert.match(voice,/ccg:shop-firearm-upgrade/,"voice director must subscribe to successful shop firearm upgrades");
assert.match(voice,/sayKey\("weaponUpgraded"/,"successful firearm upgrades must trigger the supplied upgrade recording");
assert.match(voice,/FURNITURE AMBUSH[\s\S]*return"ambush"/,"furniture ambushes must use the supplied ambush recording");
assert.doesNotMatch(voice,/queue\.push|function pump\(/,"recorded follow-ups must preserve the no-backlog voice-channel contract");
assert.match(voice,/arenaLockdown[\s\S]*setTimeout[\s\S]*surviveAmbush[\s\S]*2400/,"arena lockdown must retain the supplied survive-the-ambush follow-up without a playback queue");
assert.match(voice,/memorySequenceStarted[\s\S]*setTimeout[\s\S]*watchSequence[\s\S]*3100/,"memory sequence introduction must retain the supplied watch-the-sequence follow-up without a playback queue");
assert.match(voice,/MEMORY VAULT LOCKDOWN[\s\S]*roomLockdown/,"memory-vault sealing must use the supplied room-lockdown recording");
assert.match(voice,/UPGRADE AVAILABLE[\s\S]*upgradeAvailable/,"upgrade-available feedback must use its dedicated supplied recording rather than the generic level-up line");
assert.match(voice,/NAMED ENEMY\\s\*\[—-\][\s\S]*namedEnemy/,"named-enemy introduction must use the supplied named-enemy warning");
assert.match(stage8,/merchantVoiceVisits/,"merchant dialogue must track contextual voice visits");
assert.match(stage8,/hiddenPartial[\s\S]*hiddenReady/,"hidden merchant speech must distinguish partial and trade-ready artefact states");
assert.match(stage8,/entranceRepeat/,"quartermaster repeat interactions must use a supplied repeat recording");
assert.match(sanctuaryScene,/npc\.sanctuary\.keeper","Hello, big boy\."/,"the actual sanctuary dancer collision must own the supplied greeting");
assert.match(sanctuaryEscort,/adventurerHelp/,"lost-adventurer recruitment must use the supplied recording");
assert.match(sanctuaryEscort,/adventurerSafe/,"lost-adventurer rescue must use the supplied safe-arrival recording");
assert.match(play,/scoutLagging[\s\S]*scoutSanctuaryNear/,"the escort scout must use the supplied separation and sanctuary-approach lines");
assert.match(play,/_ccgHazardWarningKey[\s\S]*hazardWarning/,"hazard warning speech must be cycle-latched and driven by the authoritative hazard state");
assert.match(play,/movementNearby/,"hidden movement ambience must route through the recorded voice owner");
assert.match(play,/stayAlert/,"high dungeon alert must trigger the supplied alert recording");
assert.match(core,/enteredFloor>=3[\s\S]*buriedWarning[\s\S]*deepeningDungeon/,"deeper floor transitions must use the supplied escalation recordings");

console.log("Dungeon R69 recorded voice integration regression checks passed.");
