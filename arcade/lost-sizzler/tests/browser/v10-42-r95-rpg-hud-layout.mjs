import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".ogg":"audio/ogg",".mp3":"audio/mpeg",".wav":"audio/wav"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

const rect=node=>{
  const r=node?.getBoundingClientRect?.();
  return r?{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null;
};
const inside=(child,parent,tolerance=2)=>child&&parent&&child.left>=parent.left-tolerance&&child.right<=parent.right+tolerance&&child.top>=parent.top-tolerance&&child.bottom<=parent.bottom+tolerance;
const noOverlap=(a,b,tolerance=2)=>a&&b&&(a.right<=b.left+tolerance||b.right<=a.left+tolerance||a.bottom<=b.top+tolerance||b.bottom<=a.top+tolerance);

try{
  const desktop=await browser.newContext({viewport:{width:1440,height:900}});
  await desktop.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  const page=await desktop.newPage();
  page.setDefaultTimeout(90000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/?r95-rpg-hud=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body?.dataset?.releaseReady==="true"&&document.body?.dataset?.gameReady==="true",null,{timeout:90000});
  await page.evaluate(()=>{
    document.body.dataset.runActive="true";
    document.getElementById("menu")?.classList.add("hidden");
  });
  await page.waitForTimeout(120);

  const desktopState=await page.evaluate(()=>{
    const r=node=>{const q=node?.getBoundingClientRect?.();return q?{left:q.left,top:q.top,right:q.right,bottom:q.bottom,width:q.width,height:q.height}:null};
    const style=selector=>getComputedStyle(document.querySelector(selector));
    const health=document.querySelector(".health-stat");
    return{
      hub:r(document.querySelector(".player-hub")),
      core:r(document.querySelector(".core-stats")),
      inventory:r(document.querySelector(".hub-inventory")),
      progress:r(document.querySelector(".hub-progress")),
      tactical:r(document.querySelector(".tactical-zone")),
      radar:r(document.querySelector(".radar-card")),
      shortcuts:r(document.querySelector(".shortcut-dock")),
      telemetryDisplay:style(".hub-telemetry").display,
      healthFont:parseFloat(style("#hud-health").fontSize),
      healthFamily:style("#hud-health").fontFamily,
      xpFamily:style("#quick-level").fontFamily,
      radarFamily:style(".radar-card h3").fontFamily,
      healthMeterWidth:parseFloat(getComputedStyle(health,"::before").width),
      bodyWidth:document.documentElement.clientWidth
    };
  });

  assert.ok(desktopState.hub?.height>=108,`desktop RPG hub must retain the expanded readable height: ${JSON.stringify(desktopState.hub)}`);
  assert.ok(inside(desktopState.core,desktopState.hub),"core resources must remain inside the player hub");
  assert.ok(inside(desktopState.inventory,desktopState.hub),"quick item belt must remain inside the player hub");
  assert.ok(inside(desktopState.progress,desktopState.hub),"progression block must remain inside the player hub");
  assert.ok(noOverlap(desktopState.core,desktopState.inventory),"core resources and item belt must not overlap");
  assert.ok(noOverlap(desktopState.inventory,desktopState.progress),"item belt and progression block must not overlap");
  assert.equal(desktopState.telemetryDisplay,"none","secondary telemetry must remain demoted from the primary combat HUD");
  assert.ok(desktopState.healthFont>=15,`health value must remain combat-readable, got ${desktopState.healthFont}px`);
  assert.ok(desktopState.healthMeterWidth>8,"live health meter must have visible width");
  assert.match(desktopState.xpFamily,/Palatino|Book Antiqua|Georgia/i,"XP heading must use the RPG display stack");
  assert.match(desktopState.radarFamily,/Palatino|Book Antiqua|Georgia/i,"tactical headings must use the RPG display stack");
  assert.ok(inside(desktopState.radar,desktopState.tactical),"radar card must remain inside the tactical column");
  assert.ok(inside(desktopState.shortcuts,desktopState.tactical),"command dock must remain inside the tactical column");
  assert.deepEqual(errors,[],`R95 desktop HUD must boot without uncaught errors: ${errors.join("\n")}`);
  await desktop.close();

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await mobile.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  await mobile.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  const mobilePage=await mobile.newPage();
  const mobileErrors=[];
  mobilePage.on("pageerror",error=>mobileErrors.push(String(error?.stack||error)));
  await mobilePage.goto(`${origin}/arcade/lost-sizzler/?r95-rpg-hud-mobile=1`,{waitUntil:"domcontentloaded"});
  await mobilePage.waitForFunction(()=>document.body?.dataset?.releaseReady==="true"&&document.body?.dataset?.gameReady==="true"&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await mobilePage.click("#solo-btn");
  await mobilePage.waitForFunction(()=>document.body?.dataset?.runActive==="true"&&document.getElementById("menu")?.classList.contains("hidden")===true,null,{timeout:30000});
  const mobileNotice=mobilePage.locator("#ccg-mobile-pc-notice");
  if(await mobileNotice.isVisible().catch(()=>false)){
    const accept=mobilePage.locator("#ccg-mobile-pc-accept");
    if(await accept.isVisible().catch(()=>false))await accept.click({noWaitAfter:true});
    await mobilePage.waitForFunction(()=>document.getElementById("ccg-mobile-pc-notice")?.classList.contains("hidden")===true||getComputedStyle(document.getElementById("ccg-mobile-pc-notice")).display==="none",null,{timeout:10000});
  }
  await mobilePage.waitForFunction(()=>typeof mode!=="undefined"&&mode==="playing"&&typeof playMode!=="undefined"&&playMode==="solo",null,{timeout:30000});
  await mobilePage.waitForTimeout(120);

  const mobileState=await mobilePage.evaluate(()=>{
    const q=selector=>document.querySelector(selector),r=node=>{const a=node?.getBoundingClientRect?.();return a?{left:a.left,top:a.top,right:a.right,bottom:a.bottom,width:a.width,height:a.height}:null};
    return{
      hub:r(q(".player-hub")),
      core:r(q(".core-stats")),
      inventoryDisplay:getComputedStyle(q(".hub-inventory")).display,
      progressDisplay:getComputedStyle(q(".hub-progress")).display,
      healthFont:parseFloat(getComputedStyle(q("#hud-health")).fontSize),
      viewport:document.documentElement.clientWidth
    };
  });
  assert.ok(mobileState.hub?.height>=80&&mobileState.hub.height<=90,`mobile HUD must remain compact and readable: ${JSON.stringify(mobileState.hub)}`);
  assert.ok(mobileState.core&&mobileState.core.left>=-2&&mobileState.core.right<=mobileState.viewport+2,`mobile core stats must remain on-screen: ${JSON.stringify(mobileState)}`);
  assert.equal(mobileState.inventoryDisplay,"none","mobile combat view must hide the full item belt");
  assert.equal(mobileState.progressDisplay,"none","mobile combat view must hide secondary progression detail");
  assert.ok(mobileState.healthFont>=11,"mobile resource values must remain readable");
  assert.deepEqual(mobileErrors,[],`R95 mobile HUD must boot without uncaught errors: ${mobileErrors.join("\n")}`);
  await mobile.close();

  console.log("Dungeon Carnage R95 RPG HUD desktop/mobile layout passed in Chromium.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
