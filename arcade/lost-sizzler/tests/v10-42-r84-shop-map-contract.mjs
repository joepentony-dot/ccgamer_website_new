import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const systems=read("js/systems.js");
const render=read("js/game-render.js");
const core=read("js/game-core.js");

assert.match(systems,/sanctuaryPool=featureRooms\.filter\(r=>r\.id!==world\.startRoomId&&r\.id!==world\.exitRoomId[\s\S]*!occupiedEnemyRooms\.has\(r\.id\)/,
  "Sanctuary selection must exclude floor entrances, exits and enemy-occupied rooms");
assert.match(render,/sanctuaryIds=new Set\(\(world\.sanctuaryRooms\|\|\[\]\)\.map\(Number\)\)/,
  "radar Sanctuary crosses must use the canonical Sanctuary-room list");
assert.match(render,/!room\?\.sanctuary\|\|!sanctuaryIds\.has\(Number\(room\.id\)\)/,
  "a stale sanctuary flag alone must never draw a green map cross");
assert.match(core,/id:"banishment"[\s\S]*Available at every dungeon shop|id:"banishment"[\s\S]*any dungeon shop/i,
  "shop stock must expose the Essence-for-Flask exchange on ordinary shops");
assert.doesNotMatch(core,/if\(id==="banishment"\)[\s\S]{0,240}ALCHEMIST REQUIRED/,
  "canonical purchase handling must not reject ordinary shops for Flask exchange");

console.log("Dungeon R84 shop and Sanctuary-map contracts passed.");
