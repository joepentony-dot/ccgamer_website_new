import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  await page.goto(`${origin}/arcade/lost-sizzler/?v142-floor-exit-owner-diagnostic=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.evaluate(()=>{try{localStorage.removeItem("ccg-quest-collection");window.CCGProgression?.clearCheckpoint?.()}catch(_){}});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(run)&&Boolean(host)&&Boolean(p1)&&Boolean(world),null,{timeout:20000});

  const diagnostic=await page.evaluate(()=>{
    const exploredCells=explored.get(p1.id)||new Set();
    for(const room of world.rooms.filter(room=>!room.optional)){
      const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2);
      exploredCells.add(`${cx},${cy}`);
    }
    explored.set(p1.id,exploredCells);
    if(host.guardian)host.guardian.alive=false;
    const opened=window.CCGSystems.updateObjective(host,run,100);

    const candidates=[[1,0],[-1,0],[0,1],[0,-1]];
    const step=candidates.find(([dx,dy])=>window.CCGWorld.walkable(world.map,world.exit.x-dx,world.exit.y-dy,host));
    assertStep(step);
    const [dx,dy]=step;

    const describe=fn=>{
      if(typeof fn!=="function")return null;
      const links={};
      for(const key of Object.getOwnPropertyNames(fn)){
        let value;
        try{value=fn[key]}catch(_){continue}
        if(typeof value==="function"&&value!==fn)links[key]=value.name||"anonymous";
      }
      return{name:fn.name||"anonymous",links,source:String(fn).slice(0,5000)};
    };
    const chain=[];
    const seen=new Set();
    let cursor=window.movePlayer;
    while(typeof cursor==="function"&&!seen.has(cursor)&&chain.length<12){
      seen.add(cursor);
      chain.push(describe(cursor));
      const candidates=[cursor.__ccgBaseMove,cursor.__ccgPreviousMovePlayer,cursor.__ccgV141TutorialOriginal,cursor.__ccgOriginal].filter(value=>typeof value==="function"&&!seen.has(value));
      cursor=candidates[0]||null;
    }

    const originalFloorComplete=window.floorComplete;
    const floorCompleteCalls=[];
    if(typeof originalFloorComplete==="function"){
      window.floorComplete=function floorCompleteDiagnostic(){
        floorCompleteCalls.push({phase:"entry",args:[...arguments].map(value=>String(value)),mode:String(mode||""),floorComplete:Boolean(run?.floorComplete)});
        const result=originalFloorComplete.apply(this,arguments);
        floorCompleteCalls.push({phase:"exit",mode:String(mode||""),floorComplete:Boolean(run?.floorComplete),panelHidden:Boolean(document.getElementById("floor-complete")?.classList.contains("hidden"))});
        return result;
      };
    }

    p1.x=world.exit.x-dx;p1.y=world.exit.y-dy;p1.rx=p1.x;p1.ry=p1.y;
    mode="playing";run.floorComplete=false;
    const panel=document.getElementById("floor-complete");
    panel?.classList.add("hidden");panel?.setAttribute("aria-hidden","true");
    const before={player:{x:p1.x,y:p1.y},exit:{...world.exit},mode:String(mode),floorComplete:Boolean(run.floorComplete),exitOpen:Boolean(host.exitOpen),objectiveComplete:Boolean(host.objective?.complete),opened:Boolean(opened),owner:window.movePlayer?.name||""};
    window.movePlayer(p1,dx,dy);
    const after={player:{x:p1.x,y:p1.y},exit:{...world.exit},mode:String(mode),floorComplete:Boolean(run.floorComplete),exitOpen:Boolean(host.exitOpen),panelHidden:Boolean(panel?.classList.contains("hidden")),owner:window.movePlayer?.name||""};
    window.floorComplete=originalFloorComplete;
    return{before,after,floorCompleteCalls,chain};

    function assertStep(value){if(!value)throw new Error("No walkable tile adjacent to Floor 1 exit")}
  });

  console.log(`FLOOR_EXIT_OWNER_DIAGNOSTIC ${JSON.stringify(diagnostic)}`);
  assert.equal(diagnostic.before.objectiveComplete,true,"Diagnostic requires the genuine Floor 1 objective to be complete.");
  assert.equal(diagnostic.before.exitOpen,true,"Diagnostic requires the genuine Floor 1 exit to be open.");
  assert.deepEqual(diagnostic.after.player,diagnostic.after.exit,"Diagnostic move must physically reach the genuine exit tile.");
  console.log("Floor 1 exit owner diagnostic completed.");
  await context.close();
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  for(const socket of sockets)socket.destroy();
}
