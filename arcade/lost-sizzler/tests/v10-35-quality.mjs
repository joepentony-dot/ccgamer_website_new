import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const quality=read("js/v10-35-quality.js"),special=read("js/v10-33-special-modes.js"),melee=read("js/v10-25-melee-ammo-balance.js"),rare=read("js/v10-15-rare-events.js"),voice=read("js/v10-16-voice-director.js"),index=read("index.html"),css=read("css/game.css"),loader=read("js/asset-overrides.js"),log=read("js/v10-12-developer-changelog.js");

for(const asset of ["enemy-atlas-standard-a-v10-35.png","enemy-atlas-standard-b-v10-35.png","enemy-atlas-horde-v10-35.png","environment-atlas-v10-35.png"]){const data=fs.readFileSync(path.join(root,"assets/pixel",asset));assert.equal(data.subarray(1,4).toString(),"PNG",`${asset} must be a real PNG`);assert.ok(data.length>20_000,`${asset} must contain production sprite data`);assert.ok(quality.includes(asset),`${asset} must be wired into rendering`)}
assert.match(quality,/function validateDoorAccess\(\)/);assert.match(quality,/world\.map\[y\]\[x\]=0/);assert.match(quality,/function expelSanctuaryEnemies\(\)/);assert.match(quality,/periodMs:3000/);assert.match(quality,/SANCTUARY \+1 HP/);
assert.match(melee,/adjacentEnemy\|\|adjacentFurniture/);assert.match(melee,/return meleeAttack\(p,dir\)/);
assert.match(rare,/spoken=Boolean\(voice\.say\("bountyStart"/);assert.match(rare,/if\(!voiceRequired\|\|expired\|\|spoken\)/);
assert.match(voice,/room\?\.sanctuary/);assert.match(special,/startWorld\(PGR\.floorSeed\(run\)/);assert.match(special,/const result=baseUpdate\.apply/);assert.match(special,/const result=baseRender\.apply/);assert.doesNotMatch(special,/fitArena\(/,"special modes must not restore the abstract arena renderer");
assert.match(special,/v133_special_hit/);assert.match(special,/SAB\.useWeapon\(active\.state/);assert.match(special,/nearFurniture/);
assert.match(index,/This Game Is Currently In BETA Stages - This Will Not Reflect On Final Game Once Completed/);assert.match(index,/© 2026 CHEEKY COMMODORE GAMER/);assert.match(quality,/© 2026 CHEEKY COMMODORE GAMER/);assert.match(css,/TACTICAL RADAR DISABLED/);assert.match(loader,/v10-35-quality\.js/);for(const id of ["LS-0824-12","LS-0824-19"])assert.ok(log.includes(id),`${id} must be in the LIVE DEVELOPMENT LOG`);

for(const file of ["horde-survival-wave-10.ogg","horde-survival-waves-1-4.ogg","horde-survival-waves-5-9.ogg","sizzler-saboteurs-theme.ogg"])assert.ok(fs.statSync(path.join(root,"assets/audio/music",file)).size>2_000_000,`${file} must not be a truncated connector placeholder`);

const map=Array.from({length:8},()=>Array(8).fill(0));map[2][3]=1;map[4][3]=1;
const context={console,Date,performance:{now:()=>1000},Image:class{constructor(){this.complete=false;this.naturalWidth=0}},window:{},document:{body:{dataset:{}}},world:{map,rooms:[{id:0,x:1,y:1,w:5,h:5,sanctuary:false}],decor:[],doorFrameCells:[{x:3,y:2},{x:3,y:4}]},host:{doors:[{id:"door",x:3,y:3,type:"room",orientation:"horizontal"}],blockingDecor:[{x:3,y:2},{x:3,y:4}],enemies:[],enteredRoomIds:[],revision:0},W:{walkable:(m,x,y,h)=>m[y]?.[x]===0&&!h.blockingDecor.some(q=>q.x===x&&q.y===y),roomAt:()=>0},allPlayers:()=>[],localPlayers:()=>[],P:{green:"#0f0"}};context.window.window=context.window;Object.assign(context.window,{CCGWorld:context.W});vm.createContext(context);vm.runInContext(quality,context,{filename:"v10-35-quality.js"});const result=context.window.CCGLostSizzlerQualityV135.validateDoorAccess();assert.equal(result.invalid,0);assert.equal(map[2][3],0);assert.equal(map[4][3],0);assert.equal(context.host.blockingDecor.length,0);

console.log("Lost Sizzler V10.35 dungeon-backed modes, atlas, sanctuary, door, audio, bounty, melee and ownership checks passed.");
