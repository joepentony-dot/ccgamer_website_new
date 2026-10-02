import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(gameDir,relative),"utf8");

const loader=read("js/asset-overrides.js");
const current=read("css/v10-42-r95-rpg-hud.css");
const safety=read("css/v10-11-mobile-runtime-safety.css");

assert.doesNotMatch(loader,/v10-11-mobile-focus\.css/,"retired V10.11 mobile-focus layout must not be late-loaded after R95");
assert.match(loader,/v10-11-mobile-runtime-safety\.css\?v=\$\{CCG_MOBILE_SAFETY_REV\}/,"non-layout mobile safety stylesheet remains cache-busted and loaded");
assert.doesNotMatch(loader,/data-ccg-v111-mobile-focus/,"retired mobile-focus one-load guard must be removed");
assert.match(loader,/data-ccg-v111-mobile-safety/,"mobile safety stylesheet retains its one-load guard");

assert.match(current,/grid-template-rows:28px minmax\(0,1fr\) 84px!important/,"R95 owns the current portrait mission, dungeon and HUD rows");
assert.match(current,/\.v104-touch-controls\{[\s\S]*position:absolute!important/,"R95 touch dock overlays gameplay instead of reserving a legacy grid row");
assert.match(current,/\.v104-touch-pad\{[\s\S]*grid-template-columns:repeat\(3,44px\)!important/,"R95 movement pad owns 44px columns");
assert.match(current,/\.v104-touch-btn\{[\s\S]*min-height:44px!important/,"R95 touch controls retain a minimum 44px target");
assert.match(current,/\.player-hub \.hub-inventory,[\s\S]*\.player-hub \.hub-progress\{display:none!important/,"R95 hides non-essential primary HUD sections on mobile");
assert.match(safety,/#v104-touch-controls:not\(\.active\)/,"inactive touch controls remain forced out of the layout");
assert.match(safety,/:has\(\.game-area>\.overlay:not\(\.hidden\)\)[\s\S]*#v104-touch-controls/,"modal panels still suppress touch controls");

console.log("V10.11 legacy mobile layout retirement / R95 ownership checks passed");
