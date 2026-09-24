import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local");
    const pathname=decodeURIComponent(url.pathname);
    const relative=pathname.endsWith("/")?pathname+"index.html":pathname;
    const file=path.resolve(repo,"."+relative);
    if(!file.startsWith(repo+path.sep)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(()=>{
    try{
      localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");
      localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true");
      localStorage.setItem("ccg-dungeon-bug-reporter","1");
    }catch(_){}
  });
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(origin+"/arcade/lost-sizzler/?live-trap-crossing-r57=1&bugreport=1",{waitUntil:"load"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&document.body.dataset.v142BootstrapReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state&&window.CCGLostSizzlerBugReporter?.state?.installed));
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&String(mode)==="playing"&&Boolean(p1&&host&&run));

  const generatedKinds=await page.evaluate(()=>[...new Set((host?.traps||[]).filter(t=>t?.active).map(t=>String(t.kind||"").toLowerCase()))]);
  for(const kind of ["fire","spike","shock"])assert.ok(generatedKinds.includes(kind),"generated floor must contain an active "+kind.toUpperCase()+" trap");

  for(const kind of ["fire","spike","shock"]){
    const result=await page.evaluate(kind=>{
      const api=window.CCGLostSizzlerV142R19MobileTrapLayoutStability;
      const reporter=window.CCGLostSizzlerBugReporter;
      const trap=(host?.traps||[]).find(t=>t?.active&&String(t.kind||"").toLowerCase()===kind);
      if(!trap)return{available:false,reason:"trap missing"};
      const candidates=[
        {x:Number(trap.x)-1,y:Number(trap.y),dx:1,dy:0},
        {x:Number(trap.x)+1,y:Number(trap.y),dx:-1,dy:0},
        {x:Number(trap.x),y:Number(trap.y)-1,dx:0,dy:1},
        {x:Number(trap.x),y:Number(trap.y)+1,dx:0,dy:-1}
      ];
      const entry=candidates.find(q=>W.walkable(world.map,q.x,q.y,host)&&!(host.enemies||[]).some(e=>e?.alive&&e.x===q.x&&e.y===q.y));
      if(!entry)return{available:false,reason:"no walkable adjacent entry"};
      for(const enemy of host?.enemies||[])enemy.alive=false;
      if(host?.stalker)host.stalker.awake=false;
      const original={period:Number(trap.period),phase:Number(trap.phase)};
      p1.x=entry.x;p1.y=entry.y;p1.rx=p1.x;p1.ry=p1.y;
      p1.maxHealth=Math.max(20,Number(p1.maxHealth||8));p1.health=20;p1.armor=3;p1.invuln=0;p1.hitStunMs=0;p1.controlLocked=false;p1.controlsLocked=false;
      move1=0;input.clear();
      const period=100000,now=performance.now();
      trap.period=period;trap.phase=((period*.10)-(now%period)+period)%period;
      api.rearmInactiveTrapContacts();
      const active=Boolean(SYS.trapActive(trap,performance.now()));
      const before={health:Number(p1.health),armor:Number(p1.armor),events:reporter.events.length,verified:Number(reporter.state.environmentVerifiedHits||0)};
      movePlayer(p1,entry.dx,entry.dy,false);
      const immediate={x:Number(p1.x),y:Number(p1.y),health:Number(p1.health),armor:Number(p1.armor)};
      return{available:true,id:String(trap.id),kind:String(trap.kind),active,entry,target:{x:Number(trap.x),y:Number(trap.y)},original,before,immediate};
    },kind);

    assert.equal(result.available,true,kind+" fixture unavailable: "+JSON.stringify(result));
    assert.equal(result.active,true,kind+" trap must be ACTIVE when the real movement path crosses it");
    assert.deepEqual({x:result.immediate.x,y:result.immediate.y},result.target,kind+" movement must land on the trap tile");
    assert.equal(result.immediate.health,result.before.health-1,kind+" ACTIVE crossing must remove exactly one HP through the real movement path");
    assert.equal(result.immediate.armor,result.before.armor,kind+" ACTIVE crossing must preserve armour");

    await page.waitForTimeout(320);
    const evidence=await page.evaluate(args=>{
      const reporter=window.CCGLostSizzlerBugReporter;
      const events=reporter.events.slice(args.beforeEvents);
      return{
        confirmed:events.some(event=>event.type==="environment-trap-crossing-damage-confirmed"&&event.detail?.contact?.x===args.target.x&&event.detail?.contact?.y===args.target.y&&(event.detail?.traps||[]).some(trap=>String(trap?.id||"")===String(args.id)&&String(trap?.kind||"").toLowerCase()===args.kind)),
        missed:events.some(event=>event.type==="ANOMALY_ACTIVE_TRAP_CROSSING_NO_DAMAGE"&&event.detail?.contact?.x===args.target.x&&event.detail?.contact?.y===args.target.y),
        verified:Number(reporter.state.environmentVerifiedHits||0)
      };
    },{beforeEvents:result.before.events,kind,id:result.id,target:result.target});
    assert.equal(evidence.confirmed,true,kind+" crossing must be confirmed by exact-contact diagnostics: "+JSON.stringify(evidence));
    assert.equal(evidence.missed,false,kind+" successful crossing must not be reported as a missed active trap hit");
    assert.ok(evidence.verified>result.before.verified,kind+" crossing must increment verified environmental hits");

    await page.evaluate(args=>{
      const trap=(host?.traps||[]).find(t=>String(t.id)===String(args.id));
      if(trap){trap.period=args.original.period;trap.phase=args.original.phase}
      p1.x=world.start.x;p1.y=world.start.y;p1.rx=p1.x;p1.ry=p1.y;p1.health=Math.max(8,Number(p1.maxHealth||8));p1.armor=0;p1.invuln=0;p1.hitStunMs=0;
      window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.rearmInactiveTrapContacts?.();
    },{id:result.id,original:result.original});
    await page.waitForTimeout(90);
  }

  const dash=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV142R19MobileTrapLayoutStability;
    const reporter=window.CCGLostSizzlerBugReporter;
    const directions=[[1,0],[-1,0],[0,1],[0,-1]];
    let trap=null,dir=null;
    for(const candidate of host?.traps||[]){
      if(!candidate?.active)continue;
      const found=directions.map(([dx,dy])=>({dx,dy,sx:Number(candidate.x)-dx,sy:Number(candidate.y)-dy,ex:Number(candidate.x)+dx,ey:Number(candidate.y)+dy}))
        .find(q=>W.walkable(world.map,q.sx,q.sy,host)&&W.walkable(world.map,q.ex,q.ey,host));
      if(found){trap=candidate;dir=found;break}
    }
    if(!trap||!dir)return{available:false,reason:"no dashable trap"};
    for(const enemy of host?.enemies||[])enemy.alive=false;
    if(host?.stalker)host.stalker.awake=false;
    const original={period:Number(trap.period),phase:Number(trap.phase)};
    p1.x=dir.sx;p1.y=dir.sy;p1.rx=p1.x;p1.ry=p1.y;
    p1.maxHealth=Math.max(20,Number(p1.maxHealth||8));p1.health=20;p1.armor=4;p1.invuln=0;p1.hitStunMs=0;p1.controlLocked=false;p1.controlsLocked=false;
    move1=0;input.clear();
    const period=100000,now=performance.now();
    trap.period=period;trap.phase=((period*.10)-(now%period)+period)%period;
    api.rearmInactiveTrapContacts();
    const before={health:Number(p1.health),armor:Number(p1.armor),events:reporter.events.length};
    movePlayer(p1,dir.dx,dir.dy,true);
    return{available:true,id:String(trap.id),kind:String(trap.kind||""),original,dir,target:{x:Number(trap.x),y:Number(trap.y)},before,after:{x:Number(p1.x),y:Number(p1.y),health:Number(p1.health),armor:Number(p1.armor)}};
  });

  assert.equal(dash.available,true,"dash crossing fixture unavailable: "+JSON.stringify(dash));
  assert.deepEqual({x:dash.after.x,y:dash.after.y},{x:dash.dir.ex,y:dash.dir.ey},"two-tile dash must move beyond the trap tile");
  assert.equal(dash.after.health,dash.before.health-1,"fast dash across an ACTIVE trap must still remove exactly one HP");
  assert.equal(dash.after.armor,dash.before.armor,"fast dash trap damage must preserve armour");
  await page.waitForTimeout(320);
  const dashEvidence=await page.evaluate(args=>{
    const events=window.CCGLostSizzlerBugReporter.events.slice(args.beforeEvents);
    return{
      confirmed:events.some(event=>event.type==="environment-trap-crossing-damage-confirmed"&&event.detail?.contact?.x===args.target.x&&event.detail?.contact?.y===args.target.y&&(event.detail?.traps||[]).some(trap=>String(trap?.id||"")===String(args.id))),
      missed:events.some(event=>event.type==="ANOMALY_ACTIVE_TRAP_CROSSING_NO_DAMAGE"&&event.detail?.contact?.x===args.target.x&&event.detail?.contact?.y===args.target.y)
    };
  },{beforeEvents:dash.before.events,target:dash.target,id:dash.id});
  assert.equal(dashEvidence.confirmed,true,"fast dash crossing must retain exact confirmed contact evidence: "+JSON.stringify(dashEvidence));
  assert.equal(dashEvidence.missed,false,"fast dash crossing must not be misreported as a no-damage contact");

  assert.deepEqual(errors,[],"live FIRE/SPIKE/SHOCK crossing regression must not produce page errors: "+errors.join("\n"));
  console.log("C64 Dungeon Carnage live FIRE/SPIKE/SHOCK movement and dash trap crossings passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
