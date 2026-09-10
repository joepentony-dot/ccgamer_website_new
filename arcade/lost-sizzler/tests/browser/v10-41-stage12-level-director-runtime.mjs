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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(document.getElementById("solo-btn"))&&Boolean(window.CCGLostSizzlerStage8NpcDialogue),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(run)&&Boolean(host)&&Boolean(p1)&&Boolean(world)&&window.CCGLostSizzlerStage8NpcDialogue?.soloDungeon?.()===true,null,{timeout:20000});

  const result=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue;
    const profiles=[1,2,3,5,6,8,9,14].map(floor=>({floor,id:api.levelProfile(floor).id,squad:api.levelProfile(floor).squad,maxEncounters:api.levelProfile(floor).maxEncounters}));
    const protectedRoomRejected=api.directedEncounterEligible({x:2,y:2,w:10,h:10,sanctuary:true},41)===false;
    const originalFloor=Number(run.floor||1),enemyArray=host.enemies,originalEnemies=enemyArray.slice(),revisionBefore=Number(host.revision||0);
    enemyArray.length=0;
    let selected=null;
    try{
      for(let roomId=1;roomId<(world.rooms||[]).length;roomId++){
        const room=world.rooms[roomId];
        if(!api.directedEncounterEligible(room,roomId))continue;
        const cells=api.directedSpawnCells(room,p1,2);
        if(cells.length<2)continue;
        selected={roomId,room};break;
      }
      if(!selected)return{profiles,protectedRoomRejected,candidate:false,solo:api.soloDungeon()};
      const floor=selected.roomId%2===0?10:9;
      run.floor=floor;
      const profile=api.levelProfile(floor),beforeEncounters=Number(api.state.levelDirectorEncounters||0),beforeEnemies=Number(api.state.levelDirectorEnemies||0),beforeSkips=Number(api.state.levelDirectorSkips||0);
      const first=api.applyDirectedEncounter(p1,selected.roomId,selected.room);
      const spawned=enemyArray.filter(enemy=>enemy?.levelDirectorEnemy&&enemy.levelDirectorProfile===profile.id&&String(enemy.id||"").startsWith(`stage12-${floor}-${selected.roomId}-`));
      const ids=spawned.map(enemy=>String(enemy.id));
      const kinds=spawned.map(enemy=>String(enemy.kind||""));
      const hp=spawned.map(enemy=>Number(enemy.hp||0));
      const revisionAfterFirst=Number(host.revision||0);
      const second=api.applyDirectedEncounter(p1,selected.roomId,selected.room);
      const afterSecondCount=enemyArray.filter(enemy=>ids.includes(String(enemy?.id||""))).length;
      return{
        profiles,protectedRoomRejected,candidate:true,solo:api.soloDungeon(),floor,roomId:selected.roomId,profile:profile.id,
        first,second,spawned:spawned.length,ids,kinds,hp,afterSecondCount,
        encounterDelta:Number(api.state.levelDirectorEncounters||0)-beforeEncounters,
        enemyDelta:Number(api.state.levelDirectorEnemies||0)-beforeEnemies,
        skipDelta:Number(api.state.levelDirectorSkips||0)-beforeSkips,
        revisionBefore,revisionAfterFirst,
        roomProfile:String(selected.room.stage12EncounterProfile||""),roomCount:Number(selected.room.stage12EncounterCount||0),
        mode:String(mode||""),controller:window.CCGLostSizzlerModeRuntime?.detect?.()||""
      };
    }finally{
      run.floor=originalFloor;
      enemyArray.length=0;
      enemyArray.push(...originalEnemies);
    }
  });

  assert.deepEqual(result.profiles.map(item=>item.id),["search-routes","search-routes","split-patrols","split-patrols","crossfire-routes","crossfire-routes","lockdown-depths","lockdown-depths"],"Stage 12 runtime must resolve the four floor bands deterministically");
  assert.deepEqual(result.profiles.map(item=>item.squad),[1,1,1,1,2,2,2,2],"Stage 12 runtime must increase directed squad size only on deeper floor bands");
  assert.equal(result.protectedRoomRejected,true,"Stage 12 must reject sanctuary rooms before encounter placement");
  assert.equal(result.candidate,true,"Stage 12 qualification requires at least one ordinary room with two valid deterministic spawn cells");
  assert.equal(result.solo,true,"Stage 12 director must run under the Solo Dungeon controller");
  assert.equal(result.profile,"lockdown-depths","deep-floor runtime qualification must use the Lockdown Depths profile");
  assert.equal(result.first,true,"first eligible deep-floor room visit must create a directed encounter");
  assert.equal(result.spawned,2,"Lockdown Depths must create its deterministic two-enemy squad when the room is empty");
  assert.equal(new Set(result.ids).size,2,"directed enemies must receive stable unique Stage 12 identities");
  assert.ok(result.hp.every(value=>value>=5),"deep-floor directed enemies must receive scaled health");
  assert.equal(result.encounterDelta,1,"one eligible room visit must advance the directed-encounter counter exactly once");
  assert.equal(result.enemyDelta,2,"one Lockdown Depths encounter must advance the directed-enemy counter by two");
  assert.equal(result.roomProfile,"lockdown-depths","the room must retain its applied Stage 12 encounter profile for diagnostics");
  assert.equal(result.roomCount,2,"the room must retain the applied Stage 12 squad count for diagnostics");
  assert.ok(result.revisionAfterFirst>result.revisionBefore,"directed encounter insertion must advance canonical host revision");
  assert.equal(result.second,false,"re-entering the same room on the same world must not duplicate a directed encounter");
  assert.equal(result.afterSecondCount,2,"same-room re-entry must keep the original directed squad singular");
  assert.ok(result.skipDelta>=0,"same-room suppression must not corrupt Stage 12 diagnostics");
  assert.equal(result.mode,"playing","Stage 12 qualification must leave normal Solo play active");
  assert.equal(result.controller,"dungeon-solo","Stage 12 qualification must retain the Solo Dungeon controller");
  assert.deepEqual(errors,[],`Stage 12 level-director runtime qualification must not raise page errors: ${errors.join("\n")}`);
  console.log(`Stage 12 level-director runtime qualification passed: ${JSON.stringify(result)}`);
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
