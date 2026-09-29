import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const map=read("js/v10-42-r69-recorded-voices.js");
const voice=read("js/v10-16-voice-director.js");
const stage8=read("js/v10-41-stage8-npc-dialogue.js");
const play=read("js/game-play.js");
const runtime=read("js/game-local-runtime.js");
const loader=read("js/asset-overrides.js");

assert.match(map,/ccg-recorded-voices-r69\.ogg/,"R69 must target the owner-recorded browser voice sprite");
assert.match(map,/"hello-big-boy":\{start:/,"sanctuary greeting must have an explicit sprite cue");
assert.match(map,/"npc\.sanctuary\.keeper":"hello-big-boy"/,"sanctuary keeper must resolve to the recorded greeting");
assert.match(map,/"bronzeKeyRequired":"bronze-key-required"/,"bronze lock feedback must resolve to the recorded cue");
assert.match(map,/"chestKeyRequired":"you-need-a-key-to-open-this-chest"/,"locked chest feedback must resolve to the recorded cue");
assert.match(loader,/v10-42-r69-recorded-voices\.js[\s\S]*v10-16-voice-director\.js/,"recorded voice metadata must load before the single voice director");
assert.match(voice,/recorded\?\.aliases\?\.\[key\]/,"voice playback must prefer the recorded sprite alias without adding a competing audio owner");
assert.match(voice,/LOCKED BRONZE DOOR[\s\S]*bronzeKeyRequired/,"bronze doors must classify into explicit recorded feedback");
assert.match(voice,/LOCKED CHEST[\s\S]*chestKeyRequired/,"locked chests must classify into explicit recorded feedback");
assert.match(voice,/ccg:item-collected/,"pickup recordings must be driven by the established collection event");
assert.match(stage8,/text:"Hello, big boy\."/,"sanctuary keeper subtitle must match the supplied recorded line");
assert.match(stage8,/voiceKey:"npc\.sanctuary\.keeper"/,"sanctuary greeting must stay on the Stage 8 dialogue voice owner");
assert.match(play,/bronzeLocked[\s\S]*CCGLostSizzlerVoice\?\.say\?\.\("chestUnlocked"/,"a paid locked chest must announce unlock only after the bronze-key path succeeds");
assert.match(play,/dedicatedHazard[\s\S]*CCGLostSizzlerVoice\?\.say\?\.\("trapsNearby"/,"dedicated hazards must issue the recorded proximity warning");
assert.match(runtime,/e\.exitWarden[\s\S]*sigilWardenDefeated[\s\S]*e\.guardian[\s\S]*guardianDefeated/,"guardian defeat recordings must be tied to actual enemy death ownership");

console.log("Dungeon R69 recorded voice integration regression checks passed.");
