import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-27-recorded-voice-pack.js"),"utf8");

const expected=[
  "welcome.mp3","welcome-rare.mp3","player-hurt.mp3","low-health.mp3","low-ammo.mp3",
  "secret-found.mp3","objective-nearby.mp3","floor-clear.mp3","game-over.mp3","player-death.mp3",
  "rare-loot.mp3","level-up.mp3","shop-found.mp3","sanctuary.mp3","trap-warning.mp3",
  "boulder-warning.mp3","respawn.mp3"
];
for(const name of expected){
  assert.match(source,new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")),`voice loader must reference ${name}`);
  const file=path.join(root,"assets/audio/voice",name);
  assert.ok(fs.existsSync(file),`${name} must exist in the recorded voice folder`);
  const stat=fs.statSync(file);
  assert.ok(stat.size>2500,`${name} must contain real audio`);
  assert.ok(stat.size<100000,`${name} should remain lightweight for browser playback`);
}
assert.doesNotMatch(source,/objectiveHint\s*:/,"Objective Hint must remain on the existing fallback voice");
assert.match(source,/Math\.random\(\)<0\.10/,"rare welcome should remain uncommon at 10 percent");
assert.match(source,/current===NORMAL_WELCOME\|\|current===RARE_WELCOME/,"admin-provided welcome overrides must not be replaced by bundled welcome selection");
assert.doesNotMatch(source,/Recording\.m4a/i,"mistaken Recording.m4a must not be referenced");

console.log("v10-27 recorded voice pack checks passed");
