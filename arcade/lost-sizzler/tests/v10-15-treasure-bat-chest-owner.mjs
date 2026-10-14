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
const knockSource=section(play,"function tryKnockPosition(ent,dx,dy){","function collideWithEnemy(p,e,fromX,fromY){");
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
    chestRenderDiagnostics:{assetFrames:0,richFallbackFrames:0,lastMode:"",lastAt:0},
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

function testRecognisableBatSprite(){
  const draws=[],ctx=new Proxy({},{
    get(_,name){return(...args)=>draws.push({name,args})},
    set(){return true}
  });
  let defaultDraws=0;
  const env={
    drawEnemy:()=>{defaultDraws++},
    enemyScreen:()=>({x:20,y:30}),
    ws:()=>({x:20,y:30}),
    C:{tile:32},P:{gold:"#ffd85a",red:"#f44",cyan:"#0ff",white:"#fff"},
    ctx
  };
  vm.createContext(env);
  const realWrapper=section(rare,'  if(typeof drawEnemy==="function"){','  if(typeof render==="function"){');
  vm.runInContext(realWrapper,env,{filename:"v10-15-rare-events.js"});
  env.drawEnemy({treasureBat:true,x:1,y:1});
  assert.ok(draws.filter(d=>d.name==="lineTo").length>=14,
    "Treasure Bat must have a recognisable winged outline rather than a four-point diamond");
  assert.ok(draws.some(d=>d.name==="stroke"),"Bat wing outline must have a visible highlight");
  assert.equal(draws.filter(d=>d.name==="fillRect").length,3,
    "Treasure Bat must show both eyes and its gold treasure accent");
  assert.ok(draws.some(d=>d.name==="fillText"&&d.args[0]==="TREASURE BAT"));
  assert.equal(defaultDraws,0);
  draws.length=0;
  env.drawEnemy({kind:"scout",x:2,y:2});
  assert.equal(defaultDraws,1,"Unrelated enemies must retain their original art");
  draws.length=0;
  env.drawEnemy({lostAdventurer:true,x:2,y:2});
  assert.ok(draws.some(d=>d.name==="arc"),"Existing rare adventurer representation must survive");
}

function testBatCombatKnockbackDoesNotBuryChest(){
  const enemy={x:4,y:5,alive:true,treasureBat:true,passiveNpc:true};
  const chest={x:5,y:5,active:true,locked:true};
  const item={x:5,y:5,active:false};
  const shop={x:5,y:5,active:false};
  const trader={x:5,y:5,active:false};
  const host={enemies:[enemy],chests:[chest],items:[item],shops:[shop],trader,blockingDecor:[]};
  const map=Array.from({length:9},()=>Array(9).fill(0));
  const env={
    host,world:{map},W:{
      // The ACTUAL W.walkable in world.js permits active chest/item tiles.
      // The combat owner must supply this missing occupancy check.
      walkable(grid,x,y){return Number.isInteger(x)&&Number.isInteger(y)&&grid[y]?.[x]===0;}
    }
  };
  vm.createContext(env);
  vm.runInContext(knockSource+";\nthis.knockEnemyAway=knockEnemyAway;",env,{filename:"game-play.js"});
  const attacker={x:3,y:5};
  const push=()=>env.knockEnemyAway(enemy,attacker);
  push();
  assert.deepEqual([enemy.x,enemy.y],[4,5],
    "A hit must not knock Treasure Bat onto an active locked chest");
  chest.active=false;item.active=true;push();
  assert.deepEqual([enemy.x,enemy.y],[4,5],
    "A hit must not knock Treasure Bat onto an active collectible");
  item.active=false;shop.active=true;push();
  assert.deepEqual([enemy.x,enemy.y],[4,5],
    "A hit must not knock Treasure Bat onto an active shop");
  shop.active=false;trader.active=true;push();
  assert.deepEqual([enemy.x,enemy.y],[4,5],
    "A hit must not knock Treasure Bat onto the active main trader");
  trader.active=false;push();
  assert.deepEqual([enemy.x,enemy.y],[5,5],
    "The Bat must still be knocked back when the destination becomes clear");
  const ordinaryEnemy={x:4,y:5,alive:true};
  host.enemies=[ordinaryEnemy];
  chest.active=true;
  env.knockEnemyAway(ordinaryEnemy,attacker);
  assert.deepEqual([ordinaryEnemy.x,ordinaryEnemy.y],[5,5],
    "Existing normal enemy knockback mechanics must remain unchanged");
}

testRareBat();
testChestCollision();
testAdjacentChestRendering();
testRecognisableBatSprite();
testBatCombatKnockbackDoesNotBuryChest();
console.log("R133 Bat pursuit, winged sprite, combat knockback, chest visibility/ownership, reward: PASS");