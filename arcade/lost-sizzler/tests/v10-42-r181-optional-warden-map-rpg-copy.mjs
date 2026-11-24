import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read=name=>fs.readFileSync(new URL("../"+name,import.meta.url),"utf8");
const script=read("js/config.js"),world=read("js/world.js"),
  full=read("js/v10-41-solo-full-map.js"),mapCss=read("css/v10-41-solo-full-map.css"),
  smallCss=read("css/v10-42-r72-map-death-feedback.css"),
  render=read("js/game-render.js"),navigation=read("js/v10-42-warden-navigation-cues.js"),
  domain=read("js/v10-42-warden-domain-progression.js"),
  effects=read("js/v10-42-warden-cleansing-effects.js"),
  guidance=read("js/v10-42-warden-hunt-guidance.js");
const sandbox={window:{}};vm.runInNewContext(script,sandbox,{filename:"config.js"});
const cfg=sandbox.window.CCG_CONFIG;
assert.equal(cfg.proceduralDungeon.campaignFloors.length,15,"All fifteen RPG floors must remain present");
assert.equal(cfg.floors.length,15,"The legacy floor readout must have the same number of floors");
assert.deepEqual(
  Array.from(cfg.floors,row=>row.name.toUpperCase()),
  Array.from(cfg.proceduralDungeon.campaignFloors,row=>row.name.toUpperCase()),
  "The active quest HUD and campaign floor headings must use the same fantasy floor names");
assert.equal(cfg.proceduralDungeon.campaignFloors[1].name,"IRONFORGE DEPTHS","Next-floor quest must never say 1541 Driveworks");
const names=cfg.proceduralDungeon.campaignFloors.map(row=>row.name);
assert.equal(new Set(names).size,15,"Every floor retains a distinct title");
for(const name of names)assert.doesNotMatch(name,/(?:1541|SID|CRT|MODEM|PIXEL|DEMO|BUDGET|CARTRIDGE|TAPE|HIGH SCORE)/i,"Campaign labels must not be branded as hardware models");
for(const key of ["C64_ARCHIVE","1541_WORKSHOP","SID_REACTOR","CRT_MAZE","BLOOD_CITADEL"])
  assert.ok(cfg.roomThemes.includes(key),"Stable internal theme IDs must not be renamed or invalidate saves");
vm.runInNewContext(world,sandbox,{filename:"world.js"});
assert.equal(sandbox.window.CCGWorld.themes["1541_WORKSHOP"].name,"Ironforge Workshop");
assert.equal(sandbox.window.CCGWorld.themes["CRT_MAZE"].name,"Mirror Maze");

assert.match(domain,/OPTIONAL WARDEN NOT CLEARED • Main floor objective complete/,"Floor-clear warning must distinguish the optional Warden from the main objective");
assert.match(domain,/data-v142-warden-status="true"/,"One authoritative Warden summary must be tagged");
assert.match(effects,/existing\.includes\('data-v142-warden-status="true"'\)/,"The secondary Warden summary must defer to the authoritative one");
assert.match(guidance,/OPTIONAL WARDEN NOT CLEARED — the main floor objective is complete/,"Exit guidance must distinguish optional Warden before descent");
assert.match(domain,/skipFloor\(\)/,"Warden debt accounting must remain attached to the descent owner");
assert.match(domain,/v142SkippedWardenFloors/,"Warden debt history must persist");

assert.match(render,/playerMarker:\{worldX:Number\(p\.x\),worldY:Number\(p\.y\),shape:"square",count:1/,"Compact map YOU marker must remain square");
assert.match(full,/drawMarker\(context,p1,"#6cecff","player","YOU"\)/,"Fullscreen map must use the same shape for YOU");
assert.doesNotMatch(full,/shape==="triangle"/,"No triangle shape remains in the fullscreen map renderer");
assert.match(full,/drawMarker\(context,item,"#ffd85a","circle"\)/,"Keys use the round glyph");
assert.match(full,/drawMarker\(context,shop,"#ffd85a","shop"\)/,"Shops use a separate shop glyph");
assert.match(mapCss,/ccg-map-player\{[^}]*clip-path:none/,"YOU legend is a square rather than a triangle");
assert.match(mapCss,/ccg-map-key\{[^}]*border-radius:50%/,"Key legend must agree with the map glyph");
assert.match(mapCss,/ccg-map-shop::before/,"Shop legend must show the special shop glyph");
assert.match(smallCss,/radar-player::after/,"Compact radar legend must match its dark-centred square");
assert.match(smallCss,/radar-sigil\.is-gate/,"After sigil pickup, the legend must match the purple gate marker");
assert.match(navigation,/__CCG_RADAR_DIAGNOSTICS__/,"Warden radar cues must use the exact active map viewport");
assert.doesNotMatch(navigation,/Math\.max\(46,Math\.floor\(rw\/6\)\)/,"Overlay must not render its markers in an unrelated older wide map");
assert.match(full,/ccg-lost-sizzler-cache/,"Map-specific CSS must follow the current release token");

console.log("PASS Dungeon R181: distinct optional-Warden summary, square map markers, accurate symbols, and RPG floor identities");
