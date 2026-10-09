import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)})}catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&Boolean(window.CCGLostSizzlerV141R51VisualUIOverhaul)&&Boolean(window.CCGLostSizzlerV141R51WorldLighting)&&Boolean(window.CCGLostSizzlerV141R51MenuFocus)&&Boolean(window.CCGLostSizzlerV141R51RenderOwnershipFinalizer));
  await page.waitForFunction(()=>document.body.dataset.v141R51Menu==="true"&&document.body.dataset.v141R51Visual==="true"&&document.body.dataset.v141R51Lighting==="true"&&document.body.dataset.v141R51MenuFocus==="true"&&document.body.dataset.v141R51RenderOwner==="true");

  const menu=await page.evaluate(()=>({
    styled:Boolean(document.querySelector('link[data-ccg-v141-r51-style="true"]')),
    panel:document.querySelector("#menu .panel")?.classList.contains("r51-menu-panel"),
    guide:Boolean(document.getElementById("ccg-r51-menu-guide")),
    guideText:document.getElementById("ccg-r51-menu-guide")?.textContent||"",
    soloDesc:document.getElementById("solo-btn")?.dataset.r51Desc,
    retiredCreate:Boolean(document.getElementById("create-btn")),
    retiredJoin:Boolean(document.getElementById("join-btn")),
    retiredRoom:Boolean(document.getElementById("room-code")),
    retiredLobby:Boolean(document.getElementById("online-lobby")),
    focusLabel:document.getElementById("tutorial-zone-btn")?.getAttribute("aria-label")
  }));
  assert.equal(menu.styled,true);
  assert.equal(menu.panel,true);
  assert.equal(menu.guide,true);
  assert.match(menu.soloDesc,/15 floors/i);
  assert.equal(menu.retiredCreate,false,"retired Dungeon Multiplayer entry must stay absent from the R51 menu");
  assert.equal(menu.retiredJoin,false,"retired Join Online Room action must stay absent from the R51 menu");
  assert.equal(menu.retiredRoom,false,"retired room-code input must stay absent from the R51 menu");
  assert.equal(menu.retiredLobby,false,"retired online lobby must stay absent from the R51 menu");
  assert.doesNotMatch(menu.guideText,/Dungeon Multiplayer|Join Online Room|ONLINE MULTIPLAYER|four players/i,"R51 menu guidance must not restore retired online multiplayer copy");
  assert.match(menu.focusLabel,/Controls, combat, items and objectives/i);

  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof p1!=="undefined"&&Boolean(p1));
  await page.waitForFunction(()=>Boolean(window.drawPlayer?.__ccgV141R51VisualPolish)&&Boolean(window.drawEnemy?.__ccgV141R51VisualPolish));

  const ownershipRecovery=await page.evaluate(()=>{
    const owner=window.CCGLostSizzlerV141R51RenderOwnershipFinalizer,api=window.CCGLostSizzlerV141R51VisualUIOverhaul;
    const before=owner.state.enemyRepairs;
    const lateRenderer=function r51SyntheticLateEnemyRenderer(){return "synthetic-late-renderer"};
    window.drawEnemy=lateRenderer;
    const detached=Boolean(typeof window.drawEnemy==="function"&&!window.drawEnemy.__ccgV141R51VisualPolish);
    owner.repair();
    return{detached,repaired:Boolean(window.drawEnemy?.__ccgV141R51VisualPolish),repairDelta:owner.state.enemyRepairs-before,preservedCurrent:api.state.enemySource===lateRenderer}
  });
  assert.equal(ownershipRecovery.detached,true,"fixture must reproduce a late renderer replacing R51");
  assert.equal(ownershipRecovery.repaired,true,"R51 ownership finalizer must reattach visual polish");
  assert.ok(ownershipRecovery.repairDelta>=1,"R51 ownership finalizer must record the enemy repair");
  assert.equal(ownershipRecovery.preservedCurrent,true,"R51 must wrap the active late renderer rather than discard it");

  await page.waitForTimeout(650);
  await page.waitForFunction(()=>Boolean(window.drawPlayer?.__ccgV141R51VisualPolish)&&Boolean(window.drawEnemy?.__ccgV141R51VisualPolish));
  const visual=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R51VisualUIOverhaul,before={x:p1.x,y:p1.y,health:p1.health,score:typeof score!=="undefined"?score:null},player=api.playerTransform(p1),enemy=(host?.enemies||[]).find(row=>row?.alive),enemyTransformValue=enemy?api.enemyTransform(enemy):null,layer=document.getElementById("ccg-r51-world-lighting"),canvas=document.getElementById("game");
    document.body.dataset.v141R47PerformanceTier="normal";
    window.CCGLostSizzlerV141R51WorldLighting?.install?.();
    api.updateLighting();
    const normalFilter=canvas?.style.filter||"";
    document.body.dataset.v141R47PerformanceTier="severe";
    window.CCGLostSizzlerV141R51WorldLighting?.install?.();
    const severeFilter=canvas?.style.filter||"";
    document.body.dataset.v141R47PerformanceTier="normal";
    window.CCGLostSizzlerV141R51WorldLighting?.install?.();
    const after={x:p1.x,y:p1.y,health:p1.health,score:typeof score!=="undefined"?score:null};
    return{before,after,player,enemyTransformValue,layer:Boolean(layer),ambient:layer?.style.getPropertyValue("--r51-ambient-rgb"),normalFilter,severeFilter,playerWrapped:Boolean(window.drawPlayer?.__ccgV141R51VisualPolish),enemyWrapped:Boolean(window.drawEnemy?.__ccgV141R51VisualPolish),diag:{playerFrames:api.state.playerFrames,enemyFrames:api.state.enemyFrames,lightingUpdates:api.state.lightingUpdates}}
  });
  assert.deepEqual(visual.after,visual.before,"visual polish must not mutate canonical gameplay state");
  assert.equal(visual.layer,true);
  assert.ok(visual.ambient.length>0);
  assert.match(visual.normalFilter,/saturate/,"normal R47 performance tier must receive the bounded R51 canvas polish");
  assert.equal(visual.severeFilter,"","severe R47 performance tier must shed the optional R51 canvas filter");
  assert.equal(visual.playerWrapped,true);
  assert.equal(visual.enemyWrapped,true);
  assert.ok(Number.isFinite(visual.player.sx)&&Number.isFinite(visual.player.sy));
  assert.ok(visual.diag.playerFrames>0,"real player renderer must pass through R51");
  assert.ok(visual.diag.enemyFrames>=0);
  assert.ok(visual.diag.lightingUpdates>0);

  // Optional evidence capture for the approved premium-dungeon visual programme.
  // Run locally with CCG_DUNGEON_VISUAL_BASELINE_DIR=/path/to/output.
  // CI continues checking normal visual behaviour without extra build minutes or
  // recording screenshots. These measurements are RAF intervals, not GPU timings.
  if(process.env.CCG_DUNGEON_VISUAL_BASELINE_DIR){
    const output=path.resolve(process.env.CCG_DUNGEON_VISUAL_BASELINE_DIR);
    fs.mkdirSync(output,{recursive:true});
    const samples=[];
    const capture=async(capturePage,label)=>{
      const fixedSeed="ccg-premium-visual-baseline-2026-10-09";
      const launch=await capturePage.evaluate(seed=>{
        const started=beginRun({seed}),modal=document.getElementById("ccg-tutorial-stage-modal");
        return{
          started,seed:run?.seed||null,mode:String(mode),
          tutorialActive:document.body.dataset.tutorialActive==="true",
          modalVisible:Boolean(modal&&getComputedStyle(modal).display!=="none"&&
            modal.getBoundingClientRect().width>0&&modal.getBoundingClientRect().height>0)
        };
      },fixedSeed);
      assert.equal(launch.started,true,label+" must start the real fixed-seed Solo run");
      assert.equal(launch.seed,fixedSeed,label+" must use the canonical run seed");
      assert.equal(launch.mode,"playing",label+" must be in playable mode");
      assert.equal(launch.tutorialActive,false,label+" must not be in Tutorial mode");
      assert.equal(launch.modalVisible,false,label+" must not capture the Tutorial overlay");
      for(const floor of [1,4,7,11,15]){
        const sample=await capturePage.evaluate(async selectedFloor=>{
          run.floor=selectedFloor;
          run.deepest=Math.max(Number(run.deepest||1),selectedFloor);
          run.floorComplete=false;
          run.modifier=PGR.chooseFloorModifier(run);
          const seed=PGR.floorSeed(run);
          startWorld(seed,false,true,false);
          mode="playing";
          setRunPresentation(true);
          p1.maxHealth=Math.max(5000,Number(p1.maxHealth||0));
          p1.health=p1.maxHealth;
          const frames=[];
          await new Promise(resolve=>{
            let previous=null;
            const frame=time=>{
              if(previous!==null)frames.push(time-previous);
              previous=time;
              if(frames.length<45)requestAnimationFrame(frame);
              else resolve();
            };
            requestAnimationFrame(frame);
          });
          const values=[...frames].sort((a,b)=>a-b);
          const percentile=ratio=>Number(values[Math.min(values.length-1,Math.floor((values.length-1)*ratio))].toFixed(2));
          return{
            floor:selectedFloor,seed:String(seed),
            viewport:{width:innerWidth,height:innerHeight},
            canvas:{width:canvas.width,height:canvas.height},
            quality:String(typeof dungeonRenderQuality==="function"?dungeonRenderQuality():"unavailable"),
            prefersReducedMotion:matchMedia("(prefers-reduced-motion: reduce)").matches,
            frameIntervalsMs:{count:values.length,p50:percentile(.5),p95:percentile(.95),max:percentile(1)},
            generated:{rooms:world.rooms?.length||0,wallLights:world.wallLights?.length||0,
              decor:world.decor?.length||0,wallTorches:world.decor?.filter(row=>row.type==="candleSconce").length||0}
          };
        },floor);
        assert.equal(sample.floor,floor,"visual baseline must capture the requested generated floor");
        assert.equal(sample.seed,`${fixedSeed}-F${floor}`,"desktop/mobile must have exactly matched seeded floor generation");
        assert.ok(sample.frameIntervalsMs.count>=40&&sample.canvas.width>0&&sample.canvas.height>0,
          "visual baseline must capture live rendered frames and a usable canvas");
        samples.push({device:label,...sample});
        await capturePage.locator("#game").screenshot({path:path.join(output,`${label}-floor-${floor}-canvas.png`)});
        await capturePage.screenshot({path:path.join(output,`${label}-floor-${floor}-hud.png`)});
      }
    };
    // The existing r51 contract's first-visit Desktop page is onboarding
    // state. Keep native visual evidence isolated so a Tutorial overlay cannot
    // silently block the second fixed-seed beginRun call.
    const desktopContext=await browser.newContext({
      viewport:{width:1600,height:900},reducedMotion:"no-preference"
    });
    try{
      await desktopContext.route("https://*.supabase.co/**",route=>route.fulfill({
        status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"
      }));
      await desktopContext.addInitScript(()=>{
        localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");
        localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true");
      });
      const desktopPage=await desktopContext.newPage();
      desktopPage.on("pageerror",error=>errors.push(String(error?.stack||error)));
      await desktopPage.goto(origin+"/arcade/lost-sizzler/?r125-visual-baseline=1",{waitUntil:"domcontentloaded"});
      await desktopPage.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&
        Boolean(window.CCGLostSizzlerV142Bootstrap?.ready),null,{timeout:90000});
      await desktopPage.locator("#solo-btn").click({noWaitAfter:true});
      await desktopPage.waitForFunction(()=>document.body.dataset.runActive==="true"&&
        mode==="playing"&&document.body.dataset.tutorialActive!=="true",null,{timeout:20000});
      await capture(desktopPage,"desktop");
    }finally{
      await desktopContext.close();
    }
    const mobileContext=await browser.newContext({
      viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:"reduce"
    });
    try{
      await mobileContext.route("https://*.supabase.co/**",route=>route.fulfill({
        status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"
      }));
      await mobileContext.addInitScript(()=>{
        localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");
        localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true");
      });
      const mobilePage=await mobileContext.newPage();
      await mobilePage.goto(`${origin}/arcade/lost-sizzler/?r123-visual-baseline=1`,{waitUntil:"domcontentloaded"});
      await mobilePage.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142Bootstrap?.ready),null,{timeout:90000});
      await mobilePage.locator("#solo-btn").click({noWaitAfter:true});
      await mobilePage.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing",null,{timeout:20000});
      await capture(mobilePage,"mobile-reduced-motion");
    }finally{
      await mobileContext.close();
    }
    fs.writeFileSync(path.join(output,"frame-baseline.json"),JSON.stringify({
      source:"Existing Canvas engine, controlled fixed run seed; RAF intervals only, not draw/GPU timing",
      sourceHead:process.env.GITHUB_SHA||"local-working-copy",
      cases:samples
    },null,2));
    console.log(`Visual baseline captured ${samples.length} floor/device samples in ${output}`);
  }

  const focus=await page.evaluate(async()=>{await quitToMenu();const api=window.CCGLostSizzlerV141R51MenuFocus,before=api.state.focusMoves,button=document.getElementById("tutorial-zone-btn");button.focus();await new Promise(resolve=>setTimeout(resolve,40));const style=getComputedStyle(button);return{active:document.activeElement?.id,outline:style.outlineStyle,outlineWidth:style.outlineWidth,moves:api.state.focusMoves-before,createPresent:Boolean(document.getElementById("create-btn"))}});
  assert.equal(focus.createPresent,false,"zero-server release must keep retired Create Online absent");
  assert.equal(focus.active,"tutorial-zone-btn","focus helper must work on a supported local gameplay action");
  assert.notEqual(focus.outline,"none","keyboard/controller focus must remain visually obvious");
  assert.ok(focus.moves>=1,"menu focus helper must keep keyboard/controller focus visible");
  assert.deepEqual(errors,[],`r51 browser test must not raise page errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r51 visual polish, adaptive lighting, renderer recovery and local-menu usability passed in Chromium.");
  await context.close();
}finally{
  await browser.close().catch(()=>{});for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
