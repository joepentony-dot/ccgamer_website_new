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

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  const page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?stage2-landing-menu=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body?.dataset?.releaseReady==="true"&&document.body?.dataset?.gameReady==="true",null,{timeout:90000});
  await page.waitForFunction(()=>document.querySelectorAll("#menu .ccg-mode-tier-label").length>=3,null,{timeout:10000});
  await page.waitForFunction(()=>document.querySelector("#menu .game-mode-buttons")?.dataset?.r55TextLayout==="true",null,{timeout:10000});

  const state=await page.evaluate(()=>{
    const ids=["continue-save-btn","solo-btn","split-btn","tutorial-zone-btn","daily-btn"];
    const controls=Object.fromEntries(ids.map(id=>{
      const element=document.getElementById(id);
      const style=element?getComputedStyle(element):null;
      const rect=element?.getBoundingClientRect?.();
      return [id,element?{
        exists:true,
        display:style.display,
        order:Number(style.order||0),
        gridColumn:style.gridColumn,
        top:Math.round(rect.top),
        left:Math.round(rect.left),
        width:Math.round(rect.width),
        height:Math.round(rect.height),
        inlineMinHeight:element.style.getPropertyValue("min-height"),
        inlinePadding:element.style.getPropertyValue("padding")
      }:{exists:false}];
    }));
    const tiers=[...document.querySelectorAll("#menu .ccg-mode-tier-label")].map(element=>({
      tier:String(element.dataset.tier||""),
      text:String(element.textContent||"").trim(),
      display:getComputedStyle(element).display
    }));
    const grid=document.querySelector("#menu .game-mode-buttons");
    const domOrder=[...grid.children].filter(node=>ids.includes(String(node.id||""))).map(node=>node.id);
    const retired=["create-btn","join-btn","horde-solo-btn","horde-mode-btn","saboteurs-mode-btn"].filter(id=>document.getElementById(id));
    return {
      runActive:document.body?.dataset?.runActive,
      menuHidden:document.getElementById("menu")?.classList.contains("hidden")||false,
      controls,
      domOrder,
      tiers,
      retired
    };
  });

  assert.equal(state.runActive,"false","Stage 2 contract must inspect the landing state before a run starts");
  assert.equal(state.menuHidden,false,"canonical landing menu must be visible before play");
  assert.deepEqual(state.retired,[],"retired online/Horde/Saboteur controls must not return to the canonical menu");
  for(const [id,control] of Object.entries(state.controls))assert.equal(control.exists,true,`${id} must remain available in the supported landing DOM`);

  assert.deepEqual(state.domOrder,["continue-save-btn","solo-btn","split-btn","tutorial-zone-btn","daily-btn"],"supported DOM/focus order must match the Stage 2 visual hierarchy");
  assert.equal(state.controls["continue-save-btn"].order,10,"Resume Saved Run must own the first priority slot when it becomes visible");
  assert.equal(state.controls["solo-btn"].order,11,"Solo must be the first always-visible adventure choice");
  assert.equal(state.controls["split-btn"].order,12,"local Split Screen must sit beside Solo in the adventure row");
  assert.equal(state.controls["tutorial-zone-btn"].order,21,"Tutorial must remain a secondary supported choice");
  assert.equal(state.controls["daily-btn"].order,22,"Weekly Vault must remain a secondary supported choice");

  assert.equal(state.controls["solo-btn"].top,state.controls["split-btn"].top,"Solo and Split Screen must occupy the same primary adventure row");
  assert.ok(state.controls["tutorial-zone-btn"].top>state.controls["solo-btn"].top,"Tutorial must sit below the primary adventure row");
  assert.equal(state.controls["tutorial-zone-btn"].top,state.controls["daily-btn"].top,"Tutorial and Weekly Vault must share the secondary row");

  const settledHeights={"continue-save-btn":"78px","solo-btn":"82px","split-btn":"74px","tutorial-zone-btn":"70px","daily-btn":"70px"};
  for(const [id,height] of Object.entries(settledHeights)){
    assert.equal(state.controls[id].inlineMinHeight,height,`${id} late R55 min-height must agree with Stage 2 blocking geometry`);
    assert.equal(state.controls[id].inlinePadding,"28px 12px 24px",`${id} late R55 padding must agree with Stage 2 blocking geometry`);
  }
  assert.ok(state.controls["solo-btn"].height>=82,"Solo must retain its settled primary-card height");
  assert.ok(state.controls["split-btn"].height>=74,"Split Screen must retain its settled supported-card height");

  assert.ok(state.tiers.length>=3,"historical compatibility layer should still be allowed to create its tier nodes");
  assert.ok(state.tiers.every(tier=>tier.display==="none"),`runtime-injected historical tier labels must remain visually retired: ${JSON.stringify(state.tiers)}`);
  assert.deepEqual(errors,[],`Stage 2 landing menu must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("DUNGEON_STAGE2_LANDING",JSON.stringify(state));
  console.log("Dungeon Carnage Stage 2 landing menu browser contract passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
