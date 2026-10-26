import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(root,'js',name),'utf8');
const context=vm.createContext({window:{},console});
for(const name of ['config.js','world.js','progression.js','systems.js'])
  vm.runInContext(read(name),context,{filename:name,timeout:15000});
const C=context.window.CCG_CONFIG,W=context.window.CCGWorld;
const P=context.window.CCGProgression,SYS=context.window.CCGSystems;
assert.ok(C&&W&&P&&SYS,'authoritative generation modules must load');

let generated=0;
for(let floor=1;floor<=15;floor++)for(let n=0;n<2;n++){
  const run=P.makeRun({seed:'SOLO-NO-ARENA-F'+floor+'-'+n});
  run.floor=floor;
  const world=W.generate(P.floorSeed(run));world.floor=floor;
  const host=W.createHostState(world);SYS.decorate(world,host,run);
  assert.equal(host.arenas.length,0,'Floor '+floor+' must not create cancelled arena');
  assert.ok(host.timedRooms?.length,'Floor '+floor+' must retain timed chamber');
  assert.equal(host.objective.type,P.objectiveFor(run),'Floor '+floor+' main objective changed');
  if([2,5,9,12].includes(floor))
    assert.equal(host.generators.length,3,'Floor '+floor+' three mandatory generators');
  generated++;
}

const directions=[[1,0],[-1,0],[0,1],[0,-1]];
const width=C.worldWidth,height=C.worldHeight,idx=(x,y)=>y*width+x;
let accessible=0;
for(const floor of [2,5,9,12])for(let n=0;n<8;n++){
  const run=P.makeRun({seed:'SOLO-GENERATOR-PATH-F'+floor+'-'+n});
  run.floor=floor;
  const world=W.generate(P.floorSeed(run));world.floor=floor;
  const host=W.createHostState(world);SYS.decorate(world,host,run);
  assert.equal(host.generators.length,3);
  const opened={...host,doors:(host.doors||[]).map(d=>
    d.type==='room'&&!d.locked?{...d,open:true}:d)};
  const visited=new Uint8Array(width*height),queue=[world.start];
  assert.ok(W.playerWalkable(world.map,world.start.x,world.start.y,opened));
  visited[idx(world.start.x,world.start.y)]=1;
  for(let i=0;i<queue.length;i++){
    const {x,y}=queue[i];
    for(const [dx,dy] of directions){
      const nx=x+dx,ny=y+dy;
      if(nx<0||ny<0||nx>=width||ny>=height||visited[idx(nx,ny)])continue;
      if(!W.playerWalkable(world.map,nx,ny,opened))continue;
      visited[idx(nx,ny)]=1;queue.push({x:nx,y:ny});
    }
  }
  for(const generator of host.generators){
    assert.ok(directions.some(([dx,dy])=>{
      const nx=generator.x+dx,ny=generator.y+dy;
      return nx>=0&&ny>=0&&nx<width&&ny<height&&Boolean(visited[idx(nx,ny)]);
    }),'Floor '+floor+' generator needs reachable adjacent attack position');
    accessible++;
  }
}

const core=read('game-core.js');
const start=core.indexOf('function floorChallengeComplete(');
const end=core.indexOf('\nfunction floorChallengeReward(',start);
assert.ok(start>=0&&end>start,'real challenge evaluator present');
const body=core.slice(start,end);
const getComplete=host=>vm.runInNewContext(body+'\n;floorChallengeComplete',{host},{timeout:15000});
const floors=C.proceduralDungeon.campaignFloors;
const six=floors.find(f=>f.floor===6),thirteen=floors.find(f=>f.floor===13),fourteen=floors.find(f=>f.floor===14);
assert.equal(six.challenge,'survey');
assert.equal(thirteen.challenge,'rescueTimed');
assert.equal(fourteen.challenge,'surveyTimed');
const host={arenas:[],rescue:{rescued:false},timedRooms:[{cleared:false}]};
let evaluate=getComplete(host);
assert.equal(evaluate(six,49),false);
assert.equal(evaluate(six,50),true);
assert.equal(evaluate(thirteen,100),false);
host.rescue.rescued=true;
assert.equal(evaluate(thirteen,100),false,'rescue alone is insufficient');
host.timedRooms[0].cleared=true;
assert.equal(evaluate(thirteen,100),true);
host.timedRooms[0].cleared=false;
assert.equal(evaluate(fourteen,100),false);
host.timedRooms[0].cleared=true;
assert.equal(evaluate(fourteen,49),false);
assert.equal(evaluate(fourteen,50),true);
assert.match(core,/if\(challengeDone\)floorChallengeReward\(spec\)/,'once-only reward path preserved');
console.log('PASS solo arena retired on '+generated+' generated floors; '+accessible+' mandatory generator attack positions and combined solo challenges');
