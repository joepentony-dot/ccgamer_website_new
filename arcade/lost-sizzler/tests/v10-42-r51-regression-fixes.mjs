import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const core=read("js/game-core.js");
const guidance=read("js/v10-23-tutorial-guidance.js");
const touch=read("js/v10-4-patch.js");
const play=read("js/game-play.js");
const r20=read("js/v10-42-r20-live-regression-stability.js");
const css=read("css/v10-41-r29.css");
const latePresentation=read("js/v10-37-horde-focus.js");
const railFinalizer=read("js/v10-41-r29-loop-finalizer.js");

assert.match(core,/let pendingPlayFullscreenRequest=null/,"fullscreen requests must share one in-flight browser request");
assert.match(core,/if\(pendingPlayFullscreenRequest\)return pendingPlayFullscreenRequest/,"a launch must not duplicate a browser fullscreen request");
assert.match(guidance,/function launchSolo\(tutorial\)[\s\S]*result=startSolo\(\)/,"Tutorial must delegate its trusted launch click directly to the canonical startSolo owner");
assert.match(core,/async function startSolo\(\)\{const audio=S\.start\(\),fs=requestPlayFullscreen\(\);await Promise\.all\(\[audio,fs\]\);beginRun\(\)\}/,"canonical startSolo must start authored audio and request fullscreen inside the same trusted launch task before beginning the run");
assert.match(css,/R51 regression guard: ordinary reports belong in a compact rail below the[\s\S]*grid-template-rows:minmax\(0,1fr\) 74px!important/,"desktop reports must reserve a lower rail beneath the dungeon");
assert.match(css,/\.game-message-rail #pickup-toast\{[\s\S]*position:static!important/,"routine notices must be static within the message rail");
assert.doesNotMatch(css,/R51 regression guard[\s\S]*\.pickup-toast\{[\s\S]*position:absolute!important/,"the regression guard must not restore an in-canvas overlay");
assert.match(latePresentation,/R51 ordinary Dungeon reports use the reserved lower rail[\s\S]*#pickup-toast\{[\s\S]*position:static!important/,"late presentation ownership must preserve the lower message rail");
assert.match(railFinalizer,/ratingVisible=Boolean\(rail\.querySelector\("\.ccg-rating-rail:not\(\.hidden\)"\)\)[\s\S]*routineToastVisible=Boolean\(rail\.querySelector\("#pickup-toast\.show"\)\)/,"the runtime rail owner must distinguish the rating prompt from routine gameplay reports");
assert.match(railFinalizer,/ratingVisible&&!routineToastVisible\)[\s\S]*setProperty\("display","contents","important"\)[\s\S]*else\{[\s\S]*setProperty\("display","block","important"\)[\s\S]*enforceOrdinaryRailGeometry\(rail\)/,"Solo and Tutorial must keep routine reports in the lower rail while allowing the retained rating prompt to overlay independently");
assert.match(touch,/const tutorialActive=document\.body\?\.dataset\?\.tutorialActive==="true"/,"touch FIRE must detect the Tutorial path");
assert.match(touch,/if\(tutorialActive\)\{[\s\S]*CCGLostSizzlerV142R58AuthoritativeFireCore\?\.attackNow\?\.\(\);[\s\S]*\}else if\(typeof queueAttack === "function"\) queueAttack\(p1\)/,"Tutorial FIRE must use one unbuffered R58 attempt while normal touch FIRE uses the shared queue");
assert.match(touch,/if\(!tutorialActive&&typeof input !== "undefined"\)\{[\s\S]*input\.add\("Space"\);[\s\S]*setAttackHeldInput\(p1,true\)/,"Tutorial FIRE must not become a held repeat; only normal touch play may claim held-FIRE ownership");
assert.match(play,/function attackNowUnbuffered\(p,requestedDirection=null\)[\s\S]*fireBuffer2=0;else fireBuffer1=0[\s\S]*if\(cooldown>0\)return false[\s\S]*return executeAuthoritativeFire\(p,requestedDirection,"direct"\)/,"Tutorial immediate FIRE must clear pending buffer, refuse cooldown-blocked work and use the captured authoritative executor");
assert.match(play,/if\(\(p1HeldAttack\|\|p1BufferedAtFrameStart\|\|fireBuffer1>0\)&&fire1<=0\)\{const fired=executeAuthoritativeFire\(p1,d1\(\),"buffered"\)/,"the normal buffered simulation path must preserve a fresh long-frame tap and use the captured authoritative FIRE executor");
assert.doesNotMatch(play,/if\(\(p1HeldAttack\|\|p1BufferedAtFrameStart\|\|fireBuffer1>0\)&&fire1<=0\)\{const fired=firePlayer\(/,"buffered FIRE must never call the mutable global firePlayer owner");
assert.match(r20,/fireOwnership:false/,"R20 must explicitly remain non-owning for FIRE");
assert.doesNotMatch(r20,/tutorialActive|mobileFirePointers|attackNow\(/,"R20 must not retain a hidden Tutorial or touch FIRE path");

console.log("PASS V10.42 R51 fullscreen, message rail and Tutorial FIRE regression contract");
