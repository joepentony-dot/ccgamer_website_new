import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const core=read("js/game-core.js");
const play=read("js/game-play.js");
const onboarding=read("js/v10-20-onboarding-safety.js");
const guidance=read("js/v10-23-tutorial-guidance.js");
const changelog=read("js/v10-12-developer-changelog.js");
const render=read("js/game-render.js");
const css=read("css/game.css");
const index=read("index.html");

assert.match(core,/playMode=online\?"online":split\?"split":"solo";startWorld\(PGR\.floorSeed\(run\),split,false\)/,"run mode must be established before split-screen world generation");
assert.match(core,/if\(!p1\|\|!p2\|\|playMode!=="split"\)throw new Error\("Both local players could not be initialised\."\)/,"split-screen startup must verify both players before reporting success");
assert.match(core,/split-screen startup failed safely[\s\S]*?UI\.menu\.classList\.remove\("hidden"\)/,"failed split-screen startup must recover to the menu");
assert.match(onboarding,/!state\.choiceAccepted&&!daily&&!online&&!split/,"the fallback tutorial chooser must be solo-only");

assert.match(play,/chest\._lockedFeedbackAt\|\|now-chest\._lockedFeedbackAt>=1200/,"locked chest reports must be input-throttled");
assert.doesNotMatch(play,/LOCKED CHEST[\s\S]{0,180}shake\s*=/,"a rejected locked chest interaction must not shake the camera");

assert.match(onboarding,/state\.swingCount=Math\.min\(3,state\.swingCount\+1\)[^\n]*renderStep\(\)/,"sword progress must repaint on every count");
assert.match(onboarding,/state\.dashCount=Math\.min\(3,state\.dashCount\+1\)[^\n]*renderStep\(\)/,"dash progress must repaint on every count");
assert.match(guidance,/const INFO_SHOWCASES=new Map/,"the information lessons must provide visual examples");
assert.equal((guidance.match(/\[\d,\{title:/g)||[]).length,5,"all five information lessons must have a visual tour");
assert.match(guidance,/showInformationTour\(step\);[\s\S]*?return;/,"the first information-stage Continue must open its tour without advancing the lesson");
assert.match(guidance,/function completeInformationTour\(step\)[\s\S]*?\[data-next\]/,"only the visual tour Continue may advance an information lesson");
assert.match(onboarding,/You Are Ready To Take On The Adventure!/,"the requested final tutorial message must ship");
assert.match(guidance,/\$\{step===9\?"":'<button type="button" data-stage-exit>EXIT TUTORIAL<\/button>'\}/,"Exit Tutorial must be absent from the final card");

assert.match(changelog,/date:"24 AUGUST 2026"/,"the LIVE DEVELOPMENT LOG must include this release date");
for(const id of ["LS-0824-01","LS-0824-07","LS-0824-08","LS-0824-09","LS-0824-10","LS-0824-11"])assert.ok(changelog.includes(id),`LIVE DEVELOPMENT LOG is missing ${id}`);

for(const asset of ["assets/pixel/title-dungeon-v10-34.webp","assets/pixel/explorer-sheet-v10-34.png","assets/pixel/chest-sheet-v10-34.png"])assert.ok(fs.existsSync(path.join(root,asset)),`pixel-art asset is missing: ${asset}`);
assert.match(index,/class="pixel-title-lockup"/,"the menu must use a responsive HTML pixel-title lockup");
assert.match(css,/title-dungeon-v10-34\.webp/,"the menu must load the new dungeon title background");
assert.match(render,/explorer-sheet-v10-34\.png/,'the renderer must load the directional explorer sheet');
assert.match(render,/chest-sheet-v10-34\.png/,'the renderer must load the animated chest sheet');
assert.match(render,/column=hurt\?5:swingActive\?\(swingAge\/swingMs<\.42\?3:4\):moving\?\(Math\.floor\(now\/145\)%2\?1:2\):0/,"explorer animation must select hurt, sword and walk frames");
assert.match(render,/column=c\.openedAt\?Math\.min\(4,2\+Math\.floor\(anim\*3\)\)/,"chest animation must progress through opening frames");

console.log("Lost Sizzler V10.34 split-screen, locked-chest, incremental tutorial and visual-tour checks passed.");
