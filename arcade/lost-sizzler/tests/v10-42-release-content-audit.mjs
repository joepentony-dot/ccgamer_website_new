import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const read=relative=>fs.readFileSync(path.join(repo,relative),"utf8");

const sandbox={window:{}};
vm.runInNewContext(read("arcade/lost-sizzler/js/config.js"),sandbox,{filename:"config.js"});
vm.runInNewContext(read("arcade/lost-sizzler/js/world.js"),sandbox,{filename:"world.js"});
vm.runInNewContext(read("arcade/lost-sizzler/js/v10-42-r94-enemy-identity.js"),sandbox,{filename:"v10-42-r94-enemy-identity.js"});
vm.runInNewContext(read("arcade/lost-sizzler/js/audio-assets.js"),sandbox,{filename:"audio-assets.js"});

const C=sandbox.window.CCG_CONFIG;
const W=sandbox.window.CCGWorld;
const identity=sandbox.window.CCGDungeonEnemyIdentity;
const audio=sandbox.window.CCG_AUDIO_ASSETS;

assert.equal(C.maxFloors,15,"release audit requires the full fifteen-floor campaign");

function reachableCells(world){
  const key=(x,y)=>x+","+y;
  const seen=new Set([key(world.start.x,world.start.y)]);
  const queue=[world.start];
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const x=p.x+dx,y=p.y+dy,k=key(x,y);
      if(x<0||y<0||y>=world.map.length||x>=world.map[0].length||world.map[y][x]!==0||seen.has(k))continue;
      seen.add(k);queue.push({x,y});
    }
  }
  return seen;
}
const key=(x,y)=>x+","+y;
const profiles=new Set();
for(let floor=1;floor<=15;floor++){
  for(let sample=0;sample<3;sample++){
    const world=W.generate(`release-audit-${sample}-F${floor}`);
    assert.equal(world.topology.floor,floor,`Floor ${floor} must select its own topology profile`);
    profiles.add(world.topology.profile);
    const reachable=reachableCells(world);
    assert.ok(reachable.has(key(world.exit.x,world.exit.y)),`Floor ${floor} sample ${sample}: exit must be reachable from start`);
    for(const room of world.rooms){
      const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2);
      assert.ok(reachable.has(key(cx,cy)),`Floor ${floor} sample ${sample}: room ${room.id} centre must remain connected`);
    }
    for(const door of world.doorSpecs){
      assert.equal(world.map[door.y][door.x],0,`Floor ${floor}: door ${door.id} must occupy walkable map space`);
      if(door.axis==="horizontal"){
        assert.equal(world.map[door.y][door.x-1],0,`Floor ${floor}: horizontal door ${door.id} needs west approach`);
        assert.equal(world.map[door.y][door.x+1],0,`Floor ${floor}: horizontal door ${door.id} needs east approach`);
        assert.equal(world.map[door.y-1][door.x],1,`Floor ${floor}: horizontal door ${door.id} needs north masonry`);
        assert.equal(world.map[door.y+1][door.x],1,`Floor ${floor}: horizontal door ${door.id} needs south masonry`);
      }else{
        assert.equal(world.map[door.y-1][door.x],0,`Floor ${floor}: vertical door ${door.id} needs north approach`);
        assert.equal(world.map[door.y+1][door.x],0,`Floor ${floor}: vertical door ${door.id} needs south approach`);
        assert.equal(world.map[door.y][door.x-1],1,`Floor ${floor}: vertical door ${door.id} needs west masonry`);
        assert.equal(world.map[door.y][door.x+1],1,`Floor ${floor}: vertical door ${door.id} needs east masonry`);
      }
    }
  }
}
assert.equal(profiles.size,15,"all fifteen floors must expose distinct topology profiles");

const ordinaryKinds=["spider","skeleton","knight","scout","hunter","ambusher","guard","charger","ranger","root","cook","firebreather","ghost"];
for(const kind of ordinaryKinds){
  const labels=[1,8,15].map(floor=>identity.ordinaryLabel({kind},{floor}));
  for(const label of labels)assert.ok(label&&label.toLowerCase()!==kind,`${kind} must have an authored RPG identity`);
}
assert.ok(ordinaryKinds.filter(kind=>identity.ordinaryLabel({kind},{floor:1})!==identity.ordinaryLabel({kind},{floor:15})).length>=10,
  "late-game enemy naming must materially evolve from the opening floors");

const assetPaths=[
  ...Object.values(audio.sfx),
  ...Object.values(audio.music.playlists).flat()
];
for(const relative of assetPaths){
  assert.ok(fs.existsSync(path.join(repo,"arcade/lost-sizzler",relative)),`audio asset is missing: ${relative}`);
}

const jsDir=path.join(repo,"arcade/lost-sizzler/js");
const literalSfx=new Set();
for(const name of fs.readdirSync(jsDir).filter(name=>name.endsWith(".js"))){
  const source=fs.readFileSync(path.join(jsDir,name),"utf8");
  for(const match of source.matchAll(/\.sfx\(\s*["']([a-zA-Z0-9_-]+)["']/g))literalSfx.add(match[1]);
}
const audioSource=read("arcade/lost-sizzler/js/audio.js");
const synthBlock=audioSource.slice(audioSource.indexOf("function sfx(name)"),audioSource.indexOf("function windWhistle"));
const synthesisedSfx=new Set([...synthBlock.matchAll(/(?:^|[,\n]\s*)([A-Za-z][A-Za-z0-9_-]*):\(\)=>/g)].map(match=>match[1]));
for(const cue of literalSfx){
  assert.ok(Object.hasOwn(audio.sfx,cue)||synthesisedSfx.has(cue),
    `literal gameplay SFX cue "${cue}" has neither a registered audio asset nor a procedural sound implementation`);
}

const render=read("arcade/lost-sizzler/js/game-render.js");
const localRuntime=read("arcade/lost-sizzler/js/game-local-runtime.js");
assert.ok(render.includes("CCGDungeonEnemyIdentity?.label?.(e"),"live enemy labels must use the floor-aware RPG identity owner");
assert.ok(localRuntime.includes("CCGDungeonEnemyIdentity?.label?.(e"),"defeat/credits identity recording must use the floor-aware RPG identity owner");
for(const file of ["archer-green.png","soldier-red.png","orc-grunt.png","orc-peon-red.png","enemy-atlas-horde-v10-35.png","enemy-atlas-standard-a-v10-35.png","enemy-atlas-standard-b-v10-35.png"]){
  assert.ok(render.includes(file),`upgraded enemy renderer route is missing: ${file}`);
}

console.log("Dungeon Carnage release audit: 15-floor topology, audio/SFX assets and enemy identity routes passed.");
