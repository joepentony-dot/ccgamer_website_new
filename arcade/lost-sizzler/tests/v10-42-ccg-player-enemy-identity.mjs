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
for(const kind of ["skeleton","spider","ghost","ambusher","root","firebreather"]){
  assert.doesNotMatch(family,new RegExp(`\\b${kind}\\s*:`),`${kind} must use matching creature/role art rather than a generic humanoid`);
}
for(const [kind,art] of Object.entries({scout:"archer",guard:"soldier",charger:"orcGrunt",cook:"orcPeon"})){
  assert.ok(family.includes(`${kind}:"${art}"`),`${kind} must use its matching authored RPG sheet`);
}
assert.match(renderer,/const DUNGEON_ENEMY_ART=Object\.freeze/,"matching creature atlas ownership is required");
assert.match(renderer,/e\?\.follower\|\|e\?\.treasureGoblin\|\|e\?\.deathStalker\|\|e\?\.voidStalker/,"named identities must retain their dedicated renderers");

assert.match(workstream,/playable hero must remain recognisably the \*\*Cheeky Commodore Gamer\*\*/);
assert.match(workstream,/Every enemy name and sprite must agree semantically/);
assert.match(workstream,/Do \*\*not\*\* force a humanoid knight\/elf\/mage sheet onto a creature/);

console.log("Dungeon CCG player and enemy identity policy contract passed.");
