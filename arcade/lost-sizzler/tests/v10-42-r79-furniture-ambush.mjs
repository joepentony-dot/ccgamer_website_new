import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const play=fs.readFileSync(path.join(root,"js/game-play.js"),"utf8");

assert.match(play,/function furnitureAmbushCell\(blocker,attacker\)/,
  "furniture ambushes must choose a separate adjacent spawn cell");
assert.match(play,/\[\[1,0\],\[-1,0\],\[0,1\],\[0,-1\]\]/,
  "furniture ambushes must search cardinal cells beside the destroyed prop");
assert.match(play,/W\.walkable\(world\.map,q\.x,q\.y,host\)/,
  "furniture ambush spawn cell must respect the canonical walkability owner");
assert.match(play,/!\(host\.enemies\|\|\[\]\)\.some\(e=>e\?\.alive&&e\.x===q\.x&&e\.y===q\.y\)/,
  "furniture ambush spawn cell must reject occupied enemy cells");
assert.match(play,/!localPlayers\(\)\.some\(p=>p&&p\.x===q\.x&&p\.y===q\.y\)/,
  "furniture ambush spawn cell must never overlap the player");
assert.match(play,/x:spawn\.x,y:spawn\.y/,
  "spawned furniture enemy must use the resolved adjacent floor cell");
assert.doesNotMatch(play,/x:blocker\.x,y:blocker\.y,kind,hp,maxHp:hp,alive:true,aiState:"chase"/,
  "furniture enemy must not materialise inside the destroyed prop tile");
assert.match(play,/FURNITURE AMBUSH — \$\{enemyName\}/,
  "ambush feedback must identify the released enemy");
assert.match(play,/was hiding behind the \$\{blocker\.type\}/,
  "ambush copy must describe the enemy emerging from behind furniture");

console.log("Dungeon R79 furniture ambush placement regression checks passed.");
