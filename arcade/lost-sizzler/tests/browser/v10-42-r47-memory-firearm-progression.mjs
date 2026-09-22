import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
  page.setDefaultTimeout(60000);
  await page.goto(`${origin}/arcade/lost-sizzler/?r47-gameplay-contract=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerV142R47FirearmEvolution?.state?.installed===true);
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1),null,{timeout:20000});

  const generatedMemory=await page.evaluate(()=>{
    const rows=[];
    for(let i=0;i<5;i++){
      run.floor=3;run.seed=`R47-MEMORY-SEED-${i}`;startWorld(PGR.floorSeed(run),false,false);
      const z=host.memoryPuzzle;
      rows.push({
        seed:run.seed,exists:Boolean(z),count:z?.tiles?.length||0,layout:z?.layout||"",
        labels:(z?.tiles||[]).map(t=>t.label),sequence:[...(z?.sequence||[])],
        separated:(z?.tiles||[]).every((tile,index,all)=>all.every((other,j)=>j===index||Math.abs(tile.x-other.x)+Math.abs(tile.y-other.y)>=2)),
        activatorSafe:Boolean(z?.activator&&(z?.tiles||[]).every(tile=>Math.abs(tile.x-z.activator.x)+Math.abs(tile.y-z.activator.y)>=3))
      });
    }
    return rows;
  });
  for(const row of generatedMemory){
    assert.equal(row.exists,true,`${row.seed} did not generate the Floor-3 Memory Pad puzzle`);
    assert.equal(row.count,5,`${row.seed} did not generate exactly five Memory Pads`);
    assert.ok(["horizontal","vertical"].includes(row.layout),`${row.seed} produced an invalid Memory Pad layout`);
    assert.deepEqual(row.labels,["1","2","3","4","5"],`${row.seed} Memory Pad labels changed unexpectedly`);
    assert.equal(row.sequence.length,5,`${row.seed} Memory sequence length changed unexpectedly`);
    assert.ok(row.sequence.every(index=>Number.isInteger(index)&&index>=0&&index<5),`${row.seed} Memory sequence referenced a non-existent pad`);
    assert.equal(row.separated,true,`${row.seed} Memory Pads were not separated by safe floor`);
    assert.equal(row.activatorSafe,true,`${row.seed} replay console was too close to a Memory Pad`);
  }

  const memory=await page.evaluate(()=>{
    const roomId=W.roomAt(world,p1.x,p1.y),room=world.rooms[roomId];
    const cells=[];for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++)if(world.map[y]?.[x]===0)cells.push({x,y});
    const picks=cells.slice(0,6);if(picks.length<6)throw new Error("test room lacks enough memory cells");
    host.memoryPuzzle={id:"memory-contract",roomId,tiles:picks.slice(0,5).map((q,i)=>({...q,index:i,label:String(i+1)})),activator:{...picks[5]},sequence:[0,1,2,3,4],phase:"idle",flashElapsed:0,flashTile:-1,inputIndex:0,solved:false,failures:0,chestId:"missing-test-chest"};
    const idleBefore=host.memoryPuzzle.phase;
    triggerMemoryPuzzle(p1,false);
    const forcedIgnored=host.memoryPuzzle.phase===idleBefore;
    p1.x=host.memoryPuzzle.activator.x;p1.y=host.memoryPuzzle.activator.y;
    triggerMemoryPuzzle(p1,true);
    const started=host.memoryPuzzle.phase==="show";
    updateMemoryPuzzle(99999);
    const inputReady=host.memoryPuzzle.phase==="input";
    const before=host.enemies.filter(e=>e.alive).length;
    activateMemoryTile(p1,4);
    const after=host.enemies.filter(e=>e.alive).length;
    return{forcedIgnored,started,inputReady,spawned:after-before,phase:host.memoryPuzzle.phase,failures:host.memoryPuzzle.failures};
  });
  assert.equal(memory.forcedIgnored,true,"non-deliberate movement must not activate memory pads");
  assert.equal(memory.started,true,"replay console must start the sequence");
  assert.equal(memory.inputReady,true,"sequence replay must transition to player input");
  assert.equal(memory.spawned,1,"wrong Memory Pad input must spawn exactly one enemy");
  assert.equal(memory.phase,"idle","wrong Memory Pad input must wait for deliberate replay");

  const firearm=await page.evaluate(()=>{
    const dummy={id:"shock",name:"Legacy Random Gun",displayName:"ZZAP! 97% Random Gun",rarity:"ZZAP! 97%",power:9,delay:.3,shots:8,pierce:4,element:"shock",ttl:30,mods:["legacy"],rating:99,desc:"legacy random weapon"};
    const rows=[];
    const snap=label=>rows.push({label,floor:run.floor,tier:p1.weaponEvolutionTier,name:p1.weapon?.name,power:p1.weapon?.power,shots:p1.weapon?.shots,pierce:p1.weapon?.pierce,owned:(p1.ownedWeapons||[]).length,mana:p1.mana});
    p1.firearmUnlocked=false;p1.weapon=null;p1.weaponEvolutionTier=0;p1.ownedWeapons=[];p1.activeWeaponIndex=-1;p1.mana=0;
    run.floor=1;window.CCGLostSizzlerV142R47FirearmEvolution.collapseOwnership(p1);snap("sword-start");
    equipWeapon(p1,dummy);snap("f1-acquire");
    equipWeapon(p1,dummy);snap("f1-upgrade");
    const beforeSalvage=p1.mana;equipWeapon(p1,dummy);snap("f1-salvage");const salvageGain=p1.mana-beforeSalvage;
    run.floor=2;equipWeapon(p1,dummy);snap("f2");
    run.floor=3;equipWeapon(p1,dummy);snap("f3");
    run.floor=4;equipWeapon(p1,dummy);snap("f4");
    run.floor=5;equipWeapon(p1,dummy);snap("f5");
    return{rows,salvageGain};
  });
  const tiers=Object.fromEntries(firearm.rows.map(row=>[row.label,row]));
  assert.equal(tiers["sword-start"].tier,0);
  assert.equal(tiers["sword-start"].owned,0);
  assert.equal(tiers["sword-start"].name,undefined);
  assert.equal(tiers["f1-acquire"].tier,1);
  assert.equal(tiers["f1-acquire"].shots,1);
  assert.equal(tiers["f1-upgrade"].tier,2);
  assert.equal(tiers["f1-upgrade"].shots,1);
  assert.equal(tiers["f1-salvage"].tier,2);
  assert.ok(firearm.salvageGain>0,"floor-capped duplicate weapon must salvage into ammunition");
  assert.equal(tiers.f2.tier,3);
  assert.equal(tiers.f3.tier,4);
  assert.equal(tiers.f3.shots,3,"three-way fire must first unlock on Floor 3");
  assert.equal(tiers.f4.tier,5);
  assert.equal(tiers.f5.tier,6);
  assert.equal(tiers.f5.shots,3);
  assert.equal(tiers.f5.power,3);
  assert.equal(tiers.f5.pierce,1);
  for(const row of firearm.rows){
    if(row.label==="sword-start")assert.equal(row.owned,0,"sword-first start must own no firearm");
    else assert.equal(row.owned,1,`${row.label} retained more than one firearm`);
  }

  console.log("Dungeon Carnage r47 Memory Pad and firearm evolution browser contract passed.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
