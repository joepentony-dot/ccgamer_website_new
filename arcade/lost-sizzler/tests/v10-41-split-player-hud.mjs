import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const index=read("index.html");
const hud=read("js/split-player-hud.js");

assert.match(index,/split-player-hud\.js\?v=/,"split-screen player HUD must be loaded by the game page");
assert.match(hud,/data-split-player="1"/,"split HUD must contain a dedicated Player 1 panel");
assert.match(hud,/data-split-player="2"/,"split HUD must contain a dedicated Player 2 panel");
assert.match(hud,/playMode==="split"&&Boolean\(p1&&p2&&run\)/,"split HUD must only replace the combat deck during an active local split-screen run");

for(const field of ["health","armour","ammo","weapon","level","xp-total","xp-meter","potions","torches","bronze","power"]){
  const matches=hud.match(new RegExp(`data-${field}`,"g"))||[];
  assert.ok(matches.length>=2,`both players must expose their own ${field} display`);
}

assert.match(hud,/renderPlayer\(refs\[0\],p1,1\)/,"Player 1 HUD must render from p1 state");
assert.match(hud,/renderPlayer\(refs\[1\],p2,2\)/,"Player 2 HUD must render from p2 state");
assert.match(hud,/ref\.ammo\.textContent=`\$\{player\.mana\}\/\$\{player\.maxMana\}`/,"ammo display must use the individual player's ammunition state");
assert.match(hud,/ref\.armour\.textContent=String\(player\.armor\|\|0\)/,"armour display must use the individual player's armour state");
assert.match(hud,/ref\.xpTotal\.textContent=`XP \$\{player\.totalXp\|\|0\}`/,"XP display must use the individual player's progression state");
assert.match(hud,/SHARED SCORE/,"run score should remain explicitly shared between the two local players");

console.log("Lost Sizzler split-screen individual player HUD checks passed.");
