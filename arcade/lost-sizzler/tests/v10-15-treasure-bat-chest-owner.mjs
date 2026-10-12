import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const load=name=>fs.readFileSync(path.join(root,"js",name),"utf8");
const rare=load("v10-15-rare-events.js"),play=load("game-play.js"),render=load("game-render.js");

function section(source,from,to){
  const start=source.indexOf(from);
  const stop=source.indexOf(to,start+from.length);
  assert.ok(start>=0&&stop>start,"Expected real-source function section: "+from);
  return source.slice(start,stop);
}
const batSource=[
  section(rare,"  function movePassive(enemy,target,away=false){","  function occupiedExcept("),
  section(rare,"  function occupiedExcept(","  function updateAdventurer("),
  section(rare,"  function updateBat(dt){","  function updateTaxman("),
  section(rare,"  function specialDeath(enemy){","  if(typeof startWorld"),
].join("\n");
const chestSource=section(play,"function tryChest(p,x,y){","function diagonalClear(");
const contactSource=section(play,"function collideWithEnemy(p,e,fromX,fromY){","function d1(){");
const chestRenderSource=section(render,"function drawChests(){","function label(");

function testRareBat(){
  const messages=[];
  const bat={id:"treasure-bat-test",x:5,y:5,alive:true,hp:5,treasureBat:true,passiveNpc:true,
    lifeMs:20000,rareMoveMs:420,treasureBatSpotted:false,kind:"ambusher"};
  const player={x:15,y:15,health:10};
  const chest={id:"locked-chest",x:6,y:5,locked:true,active:true,roomId:1};
  const host={enemies:[bat],chests:[chest],items:[],blockingDecor:[],shops:[],revision:0,trader:null,startShop:null};
  const map=Array.from({length:20},()=>Array(20).fill(1));
  for(const [x,y] of [[5,5],[4,5],[6,5],[5,4]])map[y][x]=0;
  const context={
    state:{plans:{bat},specialDeaths:new Set()},host,world:{map},score:100,run:{floor:1},
    playersSafe:()=>[player],dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
    visibleTo:(p,x,y)=>Math.hypot(p.x-x,p.y-y)<=6,
    W:{walkable:(grid,x,y)=>grid[y]?.[x]===0},
    performance:{now:()=>2300},Math,Date,
    unit:()=>0,roomAt:()=>1,C:{tile:32},P:{gold:"#fc0"},
    showToast:(title,body)=>messages.push({title,body}),
    safeNearby:(x,y)=>host.chests.some(c=>c.active&&c.x===x&&c.y===y)?{x:x-1,y}:{x,y}
  };
  vm.createContext(context);
  vm.runInContext(batSource+";\nthis.owners={updateBat,movePassive,occupiedExcept,specialDeath};",context,{filename:"v10-15-rare-events.js"});
  const {updateBat,occupiedExcept,specialDeath}=context.owners;

  updateBat(8000);
  assert.equal(bat.lifeMs,20000,"A bat across the dungeon must keep its full encounter time");
  assert.equal(bat.treasureBatSpotted,false);
  assert.deepEqual([bat.x,bat.y],[5,5],"An undiscovered bat must not flee before encounter");
  assert.equal(messages.length,0);

  player.x=4;player.y=5;
  assert.equal(occupiedExcept(chest.x,chest.y,bat),true,
    "Rare NPCs must never move over a visible/collidable locked chest");
  updateBat(900);
  assert.equal(bat.treasureBatSpotted,true);
  assert.equal(bat.lifeMs,19100);
  assert.deepEqual([bat.x,bat.y],[5,4],
    "The Bat must flee to a free tile, never hide a chest beneath its sprite");
  assert.ok(messages.some(row=>row.title==="TREASURE BAT SPOTTED"&&/slash or shoot/i.test(row.body)),
    "The encounter must tell a player how to catch the bat");
  assert.equal(host.revision,1);

  // A separate defeated Bat drops the reward exactly once, at a clear tile.
  const slain={id:"treasure-bat-dead",x:6,y:5,alive:false,treasureBat:true};
  specialDeath(slain);
  assert.equal(context.score,450);
  assert.equal(host.chests.length,2);
  assert.equal(host.chests[1].locked,false);
  assert.equal(host.chests[1].active,true);
  assert.notDeepEqual([host.chests[1].x,host.chests[1].y],[chest.x,chest.y],
    "A Bat reward must not spawn over an existing active chest");
  specialDeath(slain);
  assert.equal(context.score,450,"Duplicate death notification cannot award score twice");
  assert.equal(host.chests.length,2,"Duplicate death notification cannot create more chests");

  updateBat(20000);
  assert.equal(bat.alive,false);
  assert.equal(bat._rareResolved,true);
  assert.ok(messages.some(row=>row.title==="TREASURE BAT ESCAPED"));
}

function testChestCollision(){
  let attempts=0,damage=0;
  const targetChest={active:true,locked:true,x:2,y:1};
  const activeEnemy={alive:true,treasureBat:true,x:2,y:1};
  const messages=[];
  const ctx={
    host:{enemies:[activeEnemy]},W:{chestAt:()=>targetChest},
    openChest:()=>{attempts++;return false},
    hurtPlayer:()=>{damage++},
    performance:{now:()=>2000},showToast:(title,body)=>messages.push({title,body}),
    Math,S:{sfx(){}},world:{map:[]}
  };
  vm.createContext(ctx);
  vm.runInContext(chestSource+contactSource+";\nthis.owners={tryChest,collideWithEnemy};",ctx,{filename:"game-play.js"});

  assert.equal(ctx.owners.tryChest({},2,1),true,
    "An alive creature obscuring a chest must own the collision before any key warning");
  assert.equal(attempts,0);
  activeEnemy.alive=false;
  assert.equal(ctx.owners.tryChest({},2,1),false);
  assert.equal(attempts,1,"A genuine unoccluded chest must still ask for its key");
  activeEnemy.alive=true;

  const player={x:2,y:1,rx:2,ry:1};
  ctx.owners.collideWithEnemy(player,activeEnemy,1,1);
  assert.deepEqual([player.x,player.y,player.rx,player.ry],[1,1,1,1]);
  assert.equal(damage,0,"Touching a fleeing treasure opportunity must not injure the player");
  assert.equal(messages.at(-1)?.title,"TREASURE BAT");
  assert.match(messages.at(-1)?.body||"",/slash or shoot/i);
}

function testAdjacentChestRendering(){
  const calls=[],images=Array.from({length:3},()=>({complete:true,naturalWidth:32,naturalHeight:32}));
  const pixels=new Proxy({},{
    get(_,key){
      if(key==="drawImage")return()=>calls.push("chest-image");
      return()=>{};
    },
    set(){return true}
  });
  const chest={active:true,locked:true,x:7,y:8,loot:{rarity:"COMMON"}};
  const env={
    host:{chests:[chest]},
    focus:{x:6,y:8},
    lostSizzlerPixelAssets:{chestReplacement:null,chestFrames:images,chests:null},
    PGR:{colourForRarity:()=>"#fc0"},P:{gold:"#fc0"},
    C:{tile:32},ctx:pixels,Math,performance:{now:()=>1000},
    md:(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y),
    tileInRenderView:()=>true,
    visibleTo:()=>false,
    ws:(x,y)=>({x:x*32,y:y*32}),label:()=>{}
  };
  vm.createContext(env);
  vm.runInContext(chestRenderSource+";\nthis.drawChests=drawChests;",env,{filename:"game-render.js"});
  env.drawChests();
  assert.equal(calls.length,1,
    "An adjacent chest must be drawn even if LOS/fog has not updated at the movement boundary");
  calls.length=0;
  env.focus={x:1,y:8};
  env.drawChests();
  assert.equal(calls.length,0,"An undiscovered distant chest must remain hidden");
  env.visibleTo=()=>true;
  env.drawChests();
  assert.equal(calls.length,1,"Normal discovered chest rendering must be unchanged");
}

testRareBat();
testChestCollision();
testAdjacentChestRendering();
console.log("R133 Bat encounter, legitimate chest visibility/ownership, reward: PASS");