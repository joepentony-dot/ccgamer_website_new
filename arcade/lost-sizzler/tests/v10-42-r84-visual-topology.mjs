import fs from "node:fs";

const systems=fs.readFileSync(new URL("../js/systems.js",import.meta.url),"utf8");
const render=fs.readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
const legacy=fs.readFileSync(new URL("../js/v10-35-quality.js",import.meta.url),"utf8");

function assert(condition,message){
  if(!condition)throw new Error(message);
}

assert(
  systems.includes("return{...point,roomId:room.id,side,orientation};"),
  "Room doors must be placed on the first corridor cell outside the room."
);
assert(
  systems.includes("function doorwayTopologyValid(world,d)"),
  "Door topology validator is required."
);
assert(
  systems.includes('jambs.every(([dx,dy])=>world.map[d.y+dy]?.[d.x+dx]!==0)'),
  "Doorways must retain solid wall jambs."
);
assert(
  systems.includes('span:1'),
  "Procedural room thresholds must remain single doors."
);
assert(
  systems.includes("if(!doorwayTopologyValid(world,door)){for(const q of carve)world.map[q.y][q.x]=1;continue}"),
  "Invalid secret-passage carving must roll back to masonry."
);

const familyBlock=render.match(/const PUNY_ENEMY_FAMILY=Object\.freeze\(\{([\s\S]*?)\}\);/);
assert(familyBlock,"Enemy-family ownership block is missing.");
assert(
  !/(knight|scout|hunter|guard|charger|ranger)\s*:/.test(familyBlock[1]),
  "Campaign enemies must not be remapped to generic humanoid sheets."
);
assert(
  legacy.includes("if(!e.hordeWarden)return false;"),
  "The legacy atlas renderer must not intercept ordinary campaign enemies."
);
assert(
  render.includes('doorRenderDiagnostics.lastMode="r84-framed-door"'),
  "R84 framed doorway renderer is not active."
);
assert(
  render.includes("if(!d.hidden||d.discovered)"),
  "Hidden secret walls must remain visually identical to ordinary masonry."
);
assert(
  render.includes('weapon:"FIREARM UPGRADE CACHE"'),
  "Weapon-cache pickup copy must match the single evolving-firearm design."
);

console.log("R84 visual/topology contracts passed.");
