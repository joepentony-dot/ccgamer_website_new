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


const artifacts=path.resolve(process.env.DUNGEON_VIEWPORT_ARTIFACTS||"node_modules/viewport-artifacts");
fs.mkdirSync(artifacts,{recursive:true});
async function captureViewport(page,file){
  const fontsReady=await page.evaluate(async()=>{
    if(!document.fonts||document.fonts.status==="loaded")return true;
    await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1500))]);
    return document.fonts.status==="loaded";
  });
  if(!fontsReady){
    console.warn("Viewport screenshot skipped because webfonts did not settle within the diagnostic window.");
    return;
  }
  try{
    await page.screenshot({path:file,timeout:15000});
  }catch(error){
    console.warn(`Viewport screenshot skipped after bounded capture failure: ${error?.message||error}`);
  }
}

const selectors=[".ccg-game",".player-hub",".core-stats",".hub-inventory",".hub-progress",".tactical-zone",".radar-card","#radar-canvas",".shortcut-dock","#item-shortcuts",".inventory-panel",".r71-inventory-layout","#inventory-close-top","#inventory-objective","#inventory-loadout","#inventory-list",".r71-equipment-board","#r80-wearable-strip",".r71-stat-strip",".r71-relic-strip","#inventory-close",".inventory-footer-actions",".ccg-evolving-firearm","#quick-keyring-icons","#quick-level-up","#hud-health","#hud-p2","#hud-mana","#hud-weapon","#hud-keys","#hud-score","#hud-room",...Array.from({length:6},(_,i)=>`#inventory-list .inventory-slot:nth-child(${i+1})`),...Array.from({length:8},(_,i)=>`#item-shortcuts .carried-item:nth-of-type(${i+1})`)];
try{
 for(const [width,height,windowed] of [[2560,1440],[1920,1080],[1440,900],[1366,768]].flatMap(([w,h])=>[[w,h,false],[w,h,true]]).concat([[390,844,true]])){
  const label=`${width}x${height}-${windowed?"windowed":"fullscreen"}`;
  const mobile=width<600;
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(()=>{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")});
  const page=await context.newPage();page.setDefaultTimeout(90000);
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
  await page.click("#solo-btn");
  if(mobile){const accept=page.locator("#ccg-mobile-pc-accept");if(await accept.isVisible().catch(()=>false))await accept.click();}
  await page.waitForFunction(()=>mode==="playing"&&Boolean(p1));
  if(windowed)await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen()});
  await page.waitForTimeout(200);
  await page.evaluate(()=>{
    p1.inventorySlots=6;p1.bronzeKeys=4;host.keysCollected=3;host.exitSigilCollected=true;
    p1.inventory=[{kind:"potion",qty:3},{kind:"torch",qty:1},{kind:"teleport",qty:2},{kind:"banishment",qty:2},{kind:"artefact",qty:3},CCGLostSizzlerV142R80WearableEquipment.makeWearable({id:"viewport-gear",depth:4},p1)];
    p1.wearables={head:{kind:"wearable",slot:"head",name:"Archive Sight Crown",sightBonus:1},hands:{kind:"wearable",slot:"hands",name:"Dungeon Scavenger Gloves",scavengerBonus:1},feet:{kind:"wearable",slot:"feet",name:"Threshold Fleet Boots",moveScale:.95}};
    p1.relics=CCGLostSizzlerV142ProceduralOverhaul?.relics?.map(r=>r.id)||[];
    p1.sigilReveal=p1.sigilWard=p1.sigilBind=p1.sigilBanish=true;
    p1.pendingLevels=1;sync();
  });
  const measure=()=>page.evaluate(selectors=>Object.fromEntries(selectors.map(s=>{const n=document.querySelector(s),r=n?.getBoundingClientRect();return[s,n?{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,sw:n.scrollWidth,cw:n.clientWidth,sh:n.scrollHeight,ch:n.clientHeight,iw:Number(n.width||0),ih:Number(n.height||0),display:getComputedStyle(n).display}:null]})),selectors);
  const hud=await measure();
  const radarDiag=await page.evaluate(()=>window.__CCG_RADAR_DIAGNOSTICS__?{...window.__CCG_RADAR_DIAGNOSTICS__}:null);
  const runStats=await page.evaluate(()=>[...document.querySelectorAll(".hub-progress .run-stat")].map(node=>{const r=node.getBoundingClientRect(),value=node.querySelector("b");return{label:String(node.querySelector("span")?.textContent||""),text:String(value?.textContent||""),x:r.x,right:r.right,w:r.width,sw:Number(value?.scrollWidth||0),cw:Number(value?.clientWidth||0)}}));

  await captureViewport(page,path.join(artifacts,`${label}-hud.png`));
  await page.keyboard.press("Tab");
  await page.waitForFunction(()=>mode==="inventory"&&!!document.querySelector("#r80-wearable-strip"));
  await page.waitForTimeout(250);
  const inventory=await measure();
  await captureViewport(page,path.join(artifacts,`${label}-inventory.png`));
  fs.writeFileSync(path.join(artifacts,`${label}.json`),JSON.stringify({hud,inventory,radarDiag},null,2));
  const bounds={x:0,y:0,right:width,bottom:height};
  const inside=(a,b)=>a&&a.w>0&&a.x>=b.x-2&&a.y>=b.y-2&&a.right<=b.right+2&&a.bottom<=b.bottom+2;
  const separate=(a,b)=>a.right<=b.x+2||b.right<=a.x+2||a.bottom<=b.y+2||b.bottom<=a.y+2;
  for(const key of [".player-hub",".core-stats","#hud-health","#hud-p2","#hud-mana","#hud-weapon"])assert.ok(inside(hud[key],bounds),`${width}: ${key} must be visible`);
  if(!mobile){
    for(const key of [".hub-inventory",".hub-progress",".tactical-zone",".radar-card",".shortcut-dock","#item-shortcuts"])assert.ok(inside(hud[key],bounds),`${width}: ${key} must fit viewport`);
    if(height<=900)assert.equal(hud["#quick-keyring-icons"]?.display,"none",`${width}x${height}: duplicate bottom keyring must collapse on short desktop viewports`);
    else assert.ok(inside(hud["#quick-keyring-icons"],bounds),`${width}: bottom keyring must fit when there is enough vertical space`);
    for(const key of [".hub-inventory",".hub-progress","#item-shortcuts"])assert.ok(hud[key].sw<=hud[key].cw+2&&hud[key].sh<=hud[key].ch+2,`${width}: ${key} clips content or needs unnecessary scrolling: ${JSON.stringify(hud[key])}`);
    const radar=hud["#radar-canvas"],cssRatio=radar.w/Math.max(1,radar.h),bitmapRatio=radar.iw/Math.max(1,radar.ih);
    assert.ok(Math.abs(cssRatio-bitmapRatio)<.035,`${width}x${height}: radar backing bitmap must match rendered aspect ratio: ${JSON.stringify(radar)}`);
    assert.ok(Math.abs(radar.iw-radar.w)<=2&&Math.abs(radar.ih-radar.h)<=2,`${width}x${height}: radar bitmap dimensions must track the visible canvas: ${JSON.stringify(radar)}`);
    assert.ok(radar.h>=140,`${width}x${height}: desktop radar canvas must receive meaningful vertical space: ${JSON.stringify(radar)}`);
    assert.ok(radarDiag&&radarDiag.scale>=16,`${width}x${height}: tactical minimap must remain strongly zoomed around the player: ${JSON.stringify(radarDiag)}`);
    assert.ok(radarDiag.cols<=10&&radarDiag.rows<=16,`${width}x${height}: tactical minimap must keep a compact local tile window without shrinking in tall sidebars: ${JSON.stringify(radarDiag)}`);
    assert.ok(radarDiag.mapWidth>=radarDiag.canvasWidth*.5||radarDiag.mapHeight>=radarDiag.canvasHeight*.65,`${width}x${height}: tactical minimap must occupy a useful share of its canvas: ${JSON.stringify(radarDiag)}`);
    assert.ok(separate(hud[".core-stats"],hud[".hub-inventory"])&&separate(hud[".hub-inventory"],hud[".hub-progress"]),"HUD regions must not overlap");
    for(const row of runStats){assert.ok(row.cw>0&&row.sw<=row.cw+1,`${width}x${height}: lower-right HUD value must fit without ellipsis/obscuring (${row.label} ${row.text}): ${JSON.stringify(row)}`)}
  }
  for(const key of [".inventory-panel","#inventory-close-top"])assert.ok(inside(inventory[key],bounds),`${width}: ${key} must fit viewport`);
  const sections=[".r71-equipment-board","#r80-wearable-strip",".r71-stat-strip",".r71-relic-strip",".ccg-evolving-firearm"];
  for(let i=0;i<sections.length-1;i++)assert.ok(separate(inventory[sections[i]],inventory[sections[i+1]]),`${width}: ${sections[i]} overlaps ${sections[i+1]}`);
  if(!mobile){
    for(const key of ["#inventory-objective","#inventory-loadout","#inventory-list","#inventory-close",".inventory-footer-actions",...sections,...Array.from({length:6},(_,i)=>`#inventory-list .inventory-slot:nth-child(${i+1})`)])assert.ok(inside(inventory[key],inventory[".inventory-panel"]),`${width}: ${key} must remain inside TAB panel`);
    for(const key of [".inventory-panel","#inventory-loadout","#inventory-list"])assert.ok(inventory[key].sw<=inventory[key].cw+2&&inventory[key].sh<=inventory[key].ch+2,`${width}: ${key} must not need desktop scrolling: ${JSON.stringify(inventory[key])}`);
    assert.ok(separate(inventory["#inventory-loadout"],inventory["#inventory-list"]),"primary inventory columns must not overlap");
  }else{
    for(const key of [".inventory-panel","#inventory-loadout","#inventory-list",...sections])assert.ok(inventory[key].sw<=inventory[key].cw+2,`${width}: ${key} must not scroll horizontally`);
    await page.locator("#inventory-close-top").click();
    await page.waitForFunction(()=>mode==="playing");
  }
  assert.deepEqual(errors,[],"runtime must have no uncaught browser errors");
  console.log(`PASS ${label} HUD and populated TAB inventory`);
  await context.close();
 }
}finally{await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}

