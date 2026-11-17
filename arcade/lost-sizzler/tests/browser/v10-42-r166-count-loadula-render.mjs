import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../..");
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".webp":"image/webp",".svg":"image/svg+xml",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
  const file=path.resolve(repo,`.${pathname.endsWith("/")?pathname+"index.html":pathname}`);
  if(!file.startsWith(repo+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(error,data)=>{
    res.writeHead(error?404:200,{"content-type":mime[path.extname(file)]||"application/octet-stream","cache-control":"no-store"});
    res.end(error?"not found":data);
  });
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CCG_CHROMIUM_EXECUTABLE_PATH||undefined,args:["--disable-background-networking","--disable-dev-shm-usage"]});
try{
  for(const [device,options] of [
    ["desktop",{viewport:{width:1440,height:900}}],
    ["mobile",{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}]
  ]){
    const context=await browser.newContext({...options,serviceWorkers:"block"});
    const external=[];
    await context.route("**/*",route=>{
      const url=route.request().url();
      if(url.startsWith(origin+"/"))return route.continue();
      external.push(url);
      return route.abort();
    });
    await context.addInitScript(()=>{
      localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");
      localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true");
    });
    const page=await context.newPage(),errors=[];
    page.on("pageerror",error=>errors.push(String(error)));
    await page.goto(origin+"/arcade/lost-sizzler/",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap?.ready===true,null,{timeout:90000});
    await page.click("#solo-btn");
    await page.waitForFunction(()=>mode==="playing"&&Boolean(p1));
    const encounter=await page.evaluate(()=>{
      if(!beginRun({seed:"r166-count-accessibility"}))throw new Error("Seeded Solo did not start");
      run.floor=5;run.deepest=5;run.modifier=PGR.chooseFloorModifier(run);
      startWorld(PGR.floorSeed(run),false,true,false);
      const count=host.stalker;
      if(!count||count.id!=="count-loadula")throw new Error("Generated Count missing");
      const nearby=[];
      for(let y=count.y-3;y<=count.y+3;y++)for(let x=count.x-3;x<=count.x+3;x++){
        if(Math.hypot(x-count.x,y-count.y)>=2&&W.playerWalkable(world.map,x,y,host)&&
          A.lineOfSight(world.map,{x,y},count,5,host)&&!SYS.inSanctuary(world,x,y)&&
          !(host.enemies||[]).some(e=>e.alive&&e.x===x&&e.y===y))nearby.push({x,y});
      }
      if(!nearby.length)throw new Error("No walkable visible encounter cell");
      Object.assign(p1,nearby[0]);p1.rx=p1.x;p1.ry=p1.y;p1.health=p1.maxHealth=5000;p1.invuln=60000;
      count.spawnTimer=0;count.moveCooldown=60000;updateStalker(16);count.stunMs=60000;
      if(!count.awake||!visibleTo(p1,count.x,count.y))throw new Error("Count encounter not visible");
      // Stage a paid charge; exercise the real keyboard and ward owner below.
      if(!PGR.inventoryAdd(p1,{kind:"banishment",qty:1}))throw new Error("Charge not staged");
      for(const e of host.enemies||[])e.dossierSeen=true;
      window.CCGLostSizzlerV142MajorNotifications?.resetForFloor?.();
      return{floor:run.floor,seed:run.seed,countId:count.id,awake:count.awake};
    });
    await page.keyboard.press("KeyB");
    await page.waitForFunction(()=>host.stalker?.v142WardBroken===true,null,{timeout:5000});
    // Let the real ward-break floater expire before assessing label legibility.
    await page.waitForFunction(()=>!floaters.some(f=>f.text==="WARD BROKEN!"),null,{timeout:6000});
    const damage=await page.evaluate(()=>{
      const s=host.stalker,before=s.hp;
      hitStalker({x:s.x,y:s.y,power:1,owner:p1.id});
      return{before,after:s.hp,max:s.maxHp,ward:s.v142WardBroken,charges:PGR.inventoryKindCount(p1,"banishment")};
    });
    await page.waitForFunction(()=>floaters.length===0,null,{timeout:4000});
    await page.evaluate(()=>{mode="paused"});
    assert.ok(damage.after<damage.before,"real projectile damage follows ward break");
    assert.equal(damage.charges,0,"real B consumes the staged charge");
    for(const [name,motion,quality] of [["normal","no-preference","rich"],["reduced","reduce","rich"],["severe","no-preference","severe"]]){
      await page.emulateMedia({reducedMotion:motion});
      const result=await page.evaluate(({quality})=>{
        const previous=performance.now,priorQuality=dungeonRenderPerformance.quality,original=window.drawStalker;
        const methods=["translate","rotate","arc","fill","stroke","fillRect","strokeRect","fillText"];
        const actor=JSON.stringify(host.stalker),calls=[],saved={};
        ctx.font='bold 14px Consolas, "Courier New"';
        if(!(ctx.measureText("COUNT LOADULA").width>0))throw new Error("Browser fonts unavailable; text legibility cannot be qualified");
        let recording=false;
        window.drawStalker=function(){recording=true;try{return original()}finally{recording=false}};
        for(const key of methods){saved[key]=ctx[key];ctx[key]=function(...args){
          if(recording)calls.push([key,...args,ctx.shadowBlur,ctx.fillStyle,ctx.strokeStyle]);
          return saved[key].apply(this,args);
        }}
        try{
          dungeonRenderPerformance.quality=quality;
          const frames=[];
          for(const time of [0,520]){
            Object.defineProperty(performance,"now",{configurable:true,value:()=>time});
            calls.length=0;resetFrameContext();renderShake={x:0,y:0};
            renderView(p1,{x:0,y:0,w:canvas.width,h:canvas.height});
            frames.push(calls.slice());
          }
          return{frames,png:canvas.toDataURL(),actorUnchanged:actor===JSON.stringify(host.stalker),
            reduced:dungeonReducedMotion(),visible:visibleTo(p1,host.stalker.x,host.stalker.y),
            hp:host.stalker.hp,maxHp:host.stalker.maxHp,camera:window.__ccgDungeonCamera};
        }finally{
          Object.defineProperty(performance,"now",{configurable:true,value:previous});
          window.drawStalker=original;for(const key of methods)ctx[key]=saved[key];
          dungeonRenderPerformance.quality=priorQuality;
        }
      },{quality});
      assert.equal(result.visible,true);assert.equal(result.actorUnchanged,true);
      assert.equal(result.reduced,motion==="reduce");
      const [first,next]=result.frames;
      assert.ok(first.length>0,"Count must be painted through full renderView");
      if(name==="normal")assert.notDeepEqual(first,next,"normal animation remains active");
      else assert.deepEqual(first,next,"accessibility drawing stays static across render time");
      const text=next.filter(([op])=>op==="fillText").map(([,value])=>value);
      assert.ok(text.includes("COUNT LOADULA — VULNERABLE"));
      assert.ok(text.includes(`${Math.ceil(result.hp)}/${Math.ceil(result.maxHp)} HP`));
      assert.ok(next.some(([op,x,y,w,h])=>op==="strokeRect"&&x===-17&&y===-17&&w===34&&h===34));
      if(name==="severe"){
        assert.ok(!next.some(([op])=>op==="arc"),"decorative orbit removed");
        assert.ok(next.filter(([op])=>op==="fill"||op==="stroke").every(row=>row[1]===0),"severe shape shadows removed");
      }
      if(process.env.CCG_R166_EVIDENCE_DIR){
        fs.mkdirSync(process.env.CCG_R166_EVIDENCE_DIR,{recursive:true});
        fs.writeFileSync(path.join(process.env.CCG_R166_EVIDENCE_DIR,`${device}-${name}.png`),Buffer.from(result.png.split(",")[1],"base64"));
      }
      console.log(JSON.stringify({device,name,encounter,damage,camera:result.camera,text}));
    }
    assert.deepEqual(errors,[],"full game has no page errors");
    assert.equal(external.filter(url=>/\.supabase\.co\//i.test(url)).length,0,"no production Supabase attempts");
    await context.close();
  }
}finally{
  await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
