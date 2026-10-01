import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const renderer=readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
const manifest=JSON.parse(readFileSync(new URL("../assets/asset-manifest.json",import.meta.url),"utf8"));
const workstream=readFileSync(new URL("../../../docs/ai-work/dungeon-carnage-visual-overhaul.md",import.meta.url),"utf8");

assert.match(renderer,/explorer:make\("assets\/pixel\/explorer-sheet-v10-34\.png"\)/,"CCG explorer sheet must remain loaded");
assert.match(renderer,/playerReplacement:make\(selected\("playerSheet"\)\)/,"player override must be opt-in only");
assert.doesNotMatch(renderer,/playerReplacement:make\(selected\("playerSheet","assets\/pixel\/visual-overhaul\/shade-puny\/warrior-blue\.png"\)\)/,"generic warrior must not be the default hero");
assert.equal(manifest.images.visualOverhaul.playerSheet,"assets/pixel/explorer-sheet-v10-34.png");
assert.equal(manifest.images.visualOverhaul.playerAnimationReference,"assets/pixel/visual-overhaul/shade-puny/warrior-blue.png");

const family=renderer.match(/const PUNY_ENEMY_FAMILY=Object\.freeze\(\{([\s\S]*?)\}\);/)?.[1]||"";
for(const kind of ["skeleton","spider","ghost","ambusher","root","cook","firebreather"]){
  assert.doesNotMatch(family,new RegExp(`\\b${kind}\\s*:`),`${kind} must retain bespoke/procedural art until a matching sprite is sourced`);
}
for(const kind of ["knight","scout","hunter","guard","charger","ranger"]){
  assert.doesNotMatch(family,new RegExp(`\\b${kind}\\s*:`),`${kind} must not be remapped to a generic humanoid family`);
  assert.match(renderer,new RegExp(`else if\\(k===["']${kind}["']\\)\\{`),`${kind} must retain its bespoke procedural silhouette`);
}

assert.match(workstream,/playable hero must remain recognisably the \*\*Cheeky Commodore Gamer\*\*/);
assert.match(workstream,/Every enemy name and sprite must agree semantically/);
assert.match(workstream,/Do \*\*not\*\* force a humanoid knight\/elf\/mage sheet onto a creature/);

console.log("Dungeon CCG player and enemy identity policy contract passed.");
