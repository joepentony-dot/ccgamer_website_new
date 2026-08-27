import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(30000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerHordeModeSafety?.state?.installed));

  const result=await page.evaluate(()=>{
    const special=window.CCGLostSizzlerSpecialModes,safety=window.CCGLostSizzlerHordeModeSafety,descriptor=Object.getOwnPropertyDescriptor(special,"active");
    const previous={world,host,p1,p2,specialMode:document.body.dataset.specialMode,hordeSolo:document.body.dataset.hordeSolo};
    const makeFixture=solo=>{
      const room={id:0,x:5,y:5,w:58,h:38,theme:"IRON_KEEP",hordeArena:true,compactHordeArena:true},width=70,height=50,map=Array.from({length:height},()=>Array(width).fill(1));
      for(let y=room.y;y<=room.y+room.h;y++)for(let x=room.x;x<=room.x+room.w;x++)map[y][x]=0;
      const centre={x:Math.round(room.x+room.w/2),y:Math.round(room.y+room.h/2)},enemyStart={x:room.x+Math.round(room.w*.18),y:room.y+Math.round(room.h*.22)};
      world={map,rooms:[room],_v141CompactHordeArena:true};host={enemies:[{id:`fixture-${solo?"solo":"online"}`,alive:true,hordeEnemy:true,x:enemyStart.x,y:enemyStart.y}],revision:0};p1={id:"fixture-player",x:centre.x,y:centre.y,rx:centre.x,ry:centre.y,health:100};p2=null;
      document.body.dataset.specialMode="horde-survivor";document.body.dataset.hordeSolo=solo?"true":"false";
      Object.defineProperty(special,"active",{configurable:true,value:{type:"horde-survivor",authoritative:!solo,state:{wave:3,state:"wave",players:[]}}});
      const installed=safety.shapeHordeArena(),snapshot=JSON.stringify(world.map),second=safety.shapeHordeArena(),idempotent=snapshot===JSON.stringify(world.map);
      let wallCells=0,perimeterOpen=true;
      for(let y=room.y;y<=room.y+room.h;y++)for(let x=room.x;x<=room.x+room.w;x++){
        if(world.map[y][x]===1)wallCells++;
        if(x<room.x+4||x>room.x+room.w-4||y<room.y+4||y>room.y+room.h-4)perimeterOpen=perimeterOpen&&world.map[y][x]===0;
      }
      let horizontalOpen=true,verticalOpen=true;
      for(let x=room.x+2;x<=room.x+room.w-2;x++)horizontalOpen=horizontalOpen&&world.map[centre.y][x]===0;
      for(let y=room.y+2;y<=room.y+room.h-2;y++)verticalOpen=verticalOpen&&world.map[y][centre.x]===0;
      const enemy=host.enemies[0];
      return{installed,second,idempotent,marked:Boolean(world._v141TraversalHordeArena),blocks:Number(room.hordeTraversalBlocks||0),wallCells,perimeterOpen,horizontalOpen,verticalOpen,connected:safety.arenaConnected(world.map,room),enemyRelocated:Boolean(enemy?._v141TraversalRelocated),enemyOnFloor:world.map?.[enemy?.y]?.[enemy?.x]===0};
    };
    try{
      const solo=makeFixture(true),online=makeFixture(false);
      const room={id:0,x:5,y:5,w:58,h:38},map=Array.from({length:50},()=>Array(70).fill(1));for(let y=room.y;y<=room.y+room.h;y++)for(let x=room.x;x<=room.x+room.w;x++)map[y][x]=0;
      world={map,rooms:[room],_v141CompactHordeArena:true};host={enemies:[],revision:0};p1={id:"dungeon-fixture",x:34,y:24,health:100};p2=null;delete document.body.dataset.specialMode;delete document.body.dataset.hordeSolo;Object.defineProperty(special,"active",{configurable:true,value:null});
      const dungeonResult=safety.shapeHordeArena(),dungeonWalls=world.map.slice(room.y,room.y+room.h+1).reduce((sum,row)=>sum+row.slice(room.x,room.x+room.w+1).filter(cell=>cell===1).length,0);
      return{solo,online,dungeonResult,dungeonWalls};
    }finally{
      world=previous.world;host=previous.host;p1=previous.p1;p2=previous.p2;
      if(previous.specialMode===undefined)delete document.body.dataset.specialMode;else document.body.dataset.specialMode=previous.specialMode;
      if(previous.hordeSolo===undefined)delete document.body.dataset.hordeSolo;else document.body.dataset.hordeSolo=previous.hordeSolo;
      if(descriptor)Object.defineProperty(special,"active",descriptor);else delete special.active;
    }
  });

  for(const [name,arena] of [["Horde Survivor Solo",result.solo],["Horde Multiplayer",result.online]]){
    assert.equal(arena.installed,true,`${name} must install traversal geometry`);
    assert.equal(arena.second,true,`${name} arena shaping must remain safely idempotent`);
    assert.equal(arena.idempotent,true,`${name} must not mutate the arena after its layout is sealed`);
    assert.equal(arena.marked,true,`${name} must mark its world as traversal-shaped`);
    assert.ok(arena.blocks>=4,`${name} must retain several internal wall groups`);
    assert.ok(arena.wallCells>=40,`${name} must contain meaningful internal wall geometry, got ${arena.wallCells} wall cells`);
    assert.equal(arena.perimeterOpen,true,`${name} must retain an open perimeter circuit for kiting and Horde spawns`);
    assert.equal(arena.horizontalOpen,true,`${name} must retain the central horizontal traversal lane`);
    assert.equal(arena.verticalOpen,true,`${name} must retain the central vertical traversal lane`);
    assert.equal(arena.connected,true,`${name} walkable floor must remain one connected arena`);
    assert.equal(arena.enemyRelocated,true,`${name} must relocate a Horde enemy that would otherwise be embedded in a new wall`);
    assert.equal(arena.enemyOnFloor,true,`${name} relocated Horde enemies must finish on walkable floor`);
  }
  assert.equal(result.dungeonResult,false,"Dungeon modes must reject Horde arena shaping");
  assert.equal(result.dungeonWalls,0,"Dungeon fixture geometry must remain untouched by the Horde arena builder");
  assert.deepEqual(errors,[],`Horde traversal arena regression must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler Horde Solo/Multiplayer traversal arena geometry, connectivity and mode-isolation regression passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
