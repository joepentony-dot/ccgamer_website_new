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

    const wardenApi=window.CCGLostSizzlerV142WardenHuntGuidance;
    const snapshotWarden=(by="")=>{
      const floor=Math.max(1,Math.floor(Number(run?.floor||host?.floor||1)||1));
      const row=run?.v142WardenFloors?.[String(floor)]||null;
      const domain=host?.v142WardenDomain||null;
      const issues=typeof wardenApi?.exitIssues==="function"?wardenApi.exitIssues(floor,run,host):[];
      const blocking=issues.filter(issue=>Boolean(issue?.blocking));
      const key=blocking.map(issue=>String(issue?.kind||"")).sort().join("|");
      const armed=host?.v142WardenExitConfirm||null;
      const now=Date.now();
      const physicalContact=typeof wardenApi?.playerExitContact==="function"?Boolean(wardenApi.playerExitContact(by,host)):null;
      const shouldSuppress=Boolean(physicalContact&&blocking.length&&(!armed||Number(armed.floor)!==floor||String(armed.key||"")!==key||now>Number(armed.until||0)));
      return{
        floor,
        mode:String(mode||""),
        runFloorComplete:Boolean(run?.floorComplete),
        exitOpen:Boolean(host?.exitOpen),
        objectiveComplete:Boolean(host?.objective?.complete),
        physicalContact,
        issues:issues.map(issue=>({kind:String(issue?.kind||""),blocking:Boolean(issue?.blocking),text:String(issue?.text||"")})),
        blockingKinds:blocking.map(issue=>String(issue?.kind||"")).sort(),
        issueKey:key,
        shouldSuppress,
        row:row?{
          available:row.available,
          noWarden:Boolean(row.noWarden),
          resolved:Boolean(row.resolved),
          cleansed:Boolean(row.cleansed),
          skipped:Boolean(row.skipped),
          cacheFragmentAwarded:Boolean(row.cacheFragmentAwarded),
          killFragmentAwarded:Boolean(row.killFragmentAwarded),
          fragmentAwarded:Boolean(row.fragmentAwarded)
        }:null,
        domain:domain?{
          active:Boolean(domain.active),
          cleansed:Boolean(domain.cleansed),
          sourceId:String(domain.sourceId||""),
          sourceKind:String(domain.sourceKind||""),
          profileId:String(domain.profileId||""),
          profileName:String(domain.profileName||""),
          roomId:Number.isFinite(Number(domain.roomId))?Number(domain.roomId):null
        }:null,
        confirm:armed?{floor:Number(armed.floor),key:String(armed.key||""),until:Number(armed.until||0),remainingMs:Number(armed.until||0)-now}:null,
        panelHidden:Boolean(document.getElementById("floor-complete")?.classList.contains("hidden")),
        summaryHtml:String(document.getElementById("floor-summary")?.innerHTML||"")
      };
    };

    const originalFloorComplete=window.floorComplete;
    const floorCompleteCalls=[];
    if(typeof originalFloorComplete==="function"){
      window.floorComplete=function floorCompleteDiagnostic(){
        const by=String(arguments[0]??"");
        floorCompleteCalls.push({phase:"entry",args:[...arguments].map(value=>String(value)),guard:snapshotWarden(by)});
        const result=originalFloorComplete.apply(this,arguments);
        floorCompleteCalls.push({phase:"exit",result,guard:snapshotWarden(by)});
        return result;
      };
    }

    p1.x=world.exit.x-dx;p1.y=world.exit.y-dy;p1.rx=p1.x;p1.ry=p1.y;
    mode="playing";run.floorComplete=false;
    const panel=document.getElementById("floor-complete");
    panel?.classList.add("hidden");panel?.setAttribute("aria-hidden","true");
    if(host?.v142WardenExitConfirm)delete host.v142WardenExitConfirm;
    const before={player:{x:p1.x,y:p1.y},exit:{...world.exit},mode:String(mode),floorComplete:Boolean(run.floorComplete),exitOpen:Boolean(host.exitOpen),objectiveComplete:Boolean(host.objective?.complete),opened:Boolean(opened),owner:window.movePlayer?.name||"",warden:snapshotWarden(p1.name)};
    window.movePlayer(p1,dx,dy);
    const after={player:{x:p1.x,y:p1.y},exit:{...world.exit},mode:String(mode),floorComplete:Boolean(run.floorComplete),exitOpen:Boolean(host.exitOpen),panelHidden:Boolean(panel?.classList.contains("hidden")),owner:window.movePlayer?.name||"",warden:snapshotWarden(p1.name)};
    window.floorComplete=originalFloorComplete;
    return{before,after,floorCompleteCalls,chain,floorCompleteOwner:describe(originalFloorComplete)};

    function assertStep(value){if(!value)throw new Error("No walkable tile adjacent to Floor 1 exit")}
  });

  console.log(`FLOOR_EXIT_OWNER_DIAGNOSTIC ${JSON.stringify(diagnostic)}`);
  assert.equal(diagnostic.before.objectiveComplete,true,"Diagnostic requires the genuine Floor 1 objective to be complete.");
  assert.equal(diagnostic.before.exitOpen,true,"Diagnostic requires the genuine Floor 1 exit to be open.");
  assert.deepEqual(diagnostic.after.player,diagnostic.after.exit,"Diagnostic move must physically reach the genuine exit tile.");
  assert.equal(diagnostic.floorCompleteCalls.length,2,"The real exit entry should invoke floorComplete exactly once.");
  const guardEntry=diagnostic.floorCompleteCalls[0]?.guard,guardExit=diagnostic.floorCompleteCalls[1]?.guard;
  assert.equal(guardEntry?.floor,1,"The diagnostic suppression must be observed on Floor 1.");
  assert.equal(guardEntry?.mode,"playing","The Warden guard must receive the valid exit while gameplay is active.");
  assert.equal(guardEntry?.runFloorComplete,false,"The Warden guard must receive an uncompleted run state.");
  assert.equal(guardEntry?.exitOpen,true,"The Warden guard must receive an open exit.");
  assert.equal(guardEntry?.objectiveComplete,true,"The Warden guard must receive the completed Floor 1 objective.");
  assert.equal(guardEntry?.physicalContact,true,"The Warden guard must see real physical contact with the Floor 1 exit.");
  assert.ok(guardEntry?.blockingKinds?.includes("warden-debt"),"The first valid Floor 1 exit must expose the unresolved optional Warden debt predicate.");
  assert.equal(guardEntry?.shouldSuppress,true,"The current Warden guard predicate must identify the first valid Floor 1 exit as suppressible.");
  assert.equal(diagnostic.floorCompleteCalls[1]?.result,false,"The current Warden guard must return false on the first valid Floor 1 exit.");
  assert.equal(guardExit?.mode,"playing","Suppression must leave gameplay mode unchanged.");
  assert.equal(guardExit?.runFloorComplete,false,"Suppression must leave run.floorComplete false.");
  assert.equal(guardExit?.panelHidden,true,"Suppression must leave the floor-complete panel hidden.");
  assert.equal(guardExit?.row?.skipped,false,"The inner Warden domain completion wrapper must not have been reached on the suppressed first exit.");
  assert.equal(guardExit?.confirm?.floor,1,"The suppression branch must arm a Floor 1 Warden exit confirmation.");
  assert.equal(guardExit?.confirm?.key,"warden-debt","The suppression branch must be caused specifically by unresolved Warden debt.");
  console.log("Floor 1 Warden exit suppression diagnostic completed.");
  await context.close();
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  for(const socket of sockets)socket.destroy();
}
