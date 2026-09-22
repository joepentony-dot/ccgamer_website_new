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
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  const page=await context.newPage();
  page.setDefaultTimeout(90000);
  const errors=[],failedScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?owned-firearm-clarity=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerV142Bootstrap?.ready===true&&window.CCGLostSizzlerV142R47FirearmEvolution?.state?.installed===true&&Boolean(document.getElementById("solo-btn")));
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1),null,{timeout:20000});

  const state=await page.evaluate(()=>{
    run.floor=3;
    p1.firearmUnlocked=true;
    p1.weaponEvolutionTier=4;
    p1.weapon=window.CCGLostSizzlerV142R47FirearmEvolution.stageWeapon(4);
    p1.ownedWeapons=[
      {...p1.weapon},
      {id:"legacy-extra",name:"Legacy Extra Gun",displayName:"Legacy Extra Gun",power:9,shots:8,rating:99}
    ];
    p1.activeWeaponIndex=1;
    window.CCGLostSizzlerV142R47FirearmEvolution.collapseOwnership(p1);
    renderInventoryPanel();
    return{
      owned:p1.ownedWeapons.length,
      active:p1.activeWeaponIndex,
      tier:p1.weaponEvolutionTier,
      shots:p1.weapon?.shots,
      legacyRows:document.querySelectorAll(".ccg-owned-weapons").length,
      switchButtons:document.querySelectorAll("[data-ccg-equip-weapon]").length,
      evolutionPanels:document.querySelectorAll(".ccg-evolving-firearm").length,
      evolutionText:document.querySelector(".ccg-evolving-firearm")?.textContent||""
    };
  });

  assert.equal(state.owned,1,"r47 must collapse legacy multi-gun ownership to one evolving firearm");
  assert.equal(state.active,0,"the single evolving firearm must remain the only active firearm");
  assert.equal(state.tier,4);
  assert.equal(state.shots,3,"Tier 4 must expose the Floor-3 three-way firearm");
  assert.equal(state.legacyRows,0,"legacy Owned Firearms switcher must no longer be rendered");
  assert.equal(state.switchButtons,0,"r47 must not expose redundant firearm switching controls");
  assert.equal(state.evolutionPanels,1,"inventory must expose exactly one evolving-firearm status panel");
  assert.match(state.evolutionText,/EVOLVING FIREARM/i);
  assert.match(state.evolutionText,/TIER 4\/6/i);
  assert.match(state.evolutionText,/SHOTS 3/i);

  assert.deepEqual(errors,[],`evolving-firearm inventory regression must not produce page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`evolving-firearm inventory regression must not lose same-origin scripts: ${failedScripts.join("\n")}`);
  console.log("Dungeon Carnage r47 single evolving firearm inventory regression passed.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
