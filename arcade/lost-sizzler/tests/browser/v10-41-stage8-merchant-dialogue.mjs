import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const dialoguePath=path.join(repo,"arcade/lost-sizzler/js/v10-41-stage8-npc-dialogue.js");
const dialogueSource=fs.readFileSync(dialoguePath,"utf8");
assert.doesNotMatch(dialogueSource,/\bsetInterval\s*\(/,"Stage 8 merchant dialogue must not install a polling interval");
assert.doesNotMatch(dialogueSource,/\bsetTimeout\s*\(/,"Stage 8 merchant dialogue must not add delayed or recurring work");
assert.doesNotMatch(dialogueSource,/\brequestAnimationFrame\s*\(/,"Stage 8 merchant dialogue must not add a frame owner");
assert.doesNotMatch(dialogueSource,/window\.(?:update|movePlayer|hurtPlayer|buyShopItem)\s*=/,"Stage 8 merchant dialogue must not replace protected gameplay or economy owners");
assert.doesNotMatch(dialogueSource,/mode\s*=\s*["']dialogue["']/,"Stage 8 merchant dialogue must not add a dialogue gameplay mode");

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
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerStage8NpcDialogue)&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&window.CCGLostSizzlerModeRuntime?.detect?.()==="dungeon-solo");
  await page.waitForFunction(()=>Boolean(host)&&Boolean(p1)&&typeof window.openShop==="function"&&Boolean(window.openShop.__ccgStage8MerchantDialogue),null,{timeout:15000});

  const hidden=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue;
    const shop={active:true,x:p1.x,y:p1.y,shopType:"hidden",title:"SECRET ARTEFACT TRADER",scorePurchases:0,sold:{}};
    const before={presentations:api.state.presentations,score,inventory:JSON.stringify(p1.inventory),revision:host.revision};
    const opened=window.openShop(shop,p1);
    const after={presentations:api.state.presentations,score,inventory:JSON.stringify(p1.inventory),revision:host.revision};
    return{opened,mode:String(mode),activeShopIsSame:activeShop===shop,merchantInstalled:Boolean(api.state.merchantInstalled),wrapperDepth:(()=>{let n=0,current=window.openShop,seen=new Set();while(typeof current==="function"&&!seen.has(current)){if(current.__ccgStage8MerchantDialogue)n++;seen.add(current);current=current.__ccgOriginal}return n})(),presented:after.presentations-before.presentations,last:{...api.state.last},toastTitle:document.getElementById("pickup-title")?.textContent||"",toastText:document.getElementById("pickup-text")?.textContent||"",scoreUnchanged:after.score===before.score,inventoryUnchanged:after.inventory===before.inventory,revisionUnchanged:after.revision===before.revision,scorePurchases:shop.scorePurchases};
  });
  assert.equal(hidden.opened,true,"canonical hidden shop must still open normally");
  assert.equal(hidden.mode,"shop","merchant dialogue must preserve the canonical shop mode");
  assert.equal(hidden.activeShopIsSame,true,"merchant dialogue must preserve the canonical active shop owner");
  assert.equal(hidden.merchantInstalled,true,"Stage 8 merchant dialogue owner must report installed");
  assert.equal(hidden.wrapperDepth,1,"Stage 8 must not self-nest its merchant dialogue wrapper ancestry");
  assert.equal(hidden.presented,1,"opening the hidden trader must present exactly one merchant line");
  assert.equal(hidden.last.key,"merchant.hidden","hidden trader must use the hidden merchant dialogue state");
  assert.equal(hidden.last.voiceKey,"npc.merchant.hidden","hidden trader text must carry a stable optional local-voice key");
  assert.match(hidden.toastTitle,/SECRET ARTEFACT TRADER/i,"hidden trader dialogue must use the existing notification surface");
  assert.match(hidden.toastText,/Banishment Flask/i,"hidden trader dialogue must describe the existing artefact trade");
  assert.equal(hidden.scoreUnchanged,true,"merchant dialogue must not alter player score");
  assert.equal(hidden.inventoryUnchanged,true,"merchant dialogue must not alter inventory");
  assert.equal(hidden.revisionUnchanged,true,"merchant dialogue must not alter canonical world revision");
  assert.equal(hidden.scorePurchases,0,"opening merchant dialogue must not purchase stock or advance the shop price ladder");

  const repeat=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue,shop=activeShop,before=api.state.presentations;
    closeShop();
    const closedMode=String(mode),reopened=window.openShop(shop,p1),presented=api.state.presentations-before;
    closeShop();
    return{closedMode,reopened,presented,finalMode:String(mode),shopHidden:document.getElementById("shop-panel")?.classList.contains("hidden")};
  });
  assert.equal(repeat.closedMode,"playing","closing the shop must restore normal play");
  assert.equal(repeat.reopened,true,"reopening the canonical shop must still work");
  assert.equal(repeat.presented,0,"rapid repeat merchant contact must respect the shared dialogue suppression window");
  assert.equal(repeat.finalMode,"playing","merchant dialogue must not interfere with returning from the shop to play");
  assert.equal(repeat.shopHidden,true,"canonical shop panel must close normally after merchant dialogue");

  const entrance=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue,shop={active:true,x:p1.x,y:p1.y,shopType:"entrance",title:"DUNGEON SUPPLY SHOP"},before=api.state.presentations;
    const shown=api.presentMerchant(shop,{force:true});
    return{shown,presented:api.state.presentations-before,last:{...api.state.last},mode:String(mode)};
  });
  assert.equal(entrance.shown,true,"entrance merchant must use the reusable dialogue surface");
  assert.equal(entrance.presented,1,"forced entrance merchant interaction must present one line");
  assert.equal(entrance.last.key,"merchant.entrance","entrance supply shop must use its own merchant dialogue state");
  assert.equal(entrance.last.voiceKey,"npc.merchant.entrance","entrance merchant must carry a stable optional local-voice key");
  assert.equal(entrance.mode,"playing","direct non-blocking merchant dialogue must leave normal play active");

  const isolated=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue,shop={active:true,x:p1.x,y:p1.y,shopType:"hidden"},before=api.state.presentations,previous=document.body.dataset.specialMode;
    document.body.dataset.specialMode="horde-survivor";
    const shown=api.presentMerchant(shop,{force:true});
    if(previous===undefined)delete document.body.dataset.specialMode;else document.body.dataset.specialMode=previous;
    return{shown,presented:api.state.presentations-before,mode:String(mode),controller:window.CCGLostSizzlerModeRuntime.detect()};
  });
  assert.equal(isolated.shown,false,"Solo merchant dialogue must no-op while a special-mode boundary is active");
  assert.equal(isolated.presented,0,"special-mode isolation must not emit a merchant line");
  assert.equal(isolated.mode,"playing","special-mode isolation probe must not mutate the canonical gameplay mode");
  assert.equal(isolated.controller,"dungeon-solo","special-mode isolation probe must not disturb the actual mode controller");

  assert.deepEqual(errors,[],`Stage 8 merchant dialogue browser regression must not raise page errors: ${errors.join("\n")}`);
  console.log("Stage 8 merchant dialogue regression passed");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}