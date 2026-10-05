import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";

const runtimeModules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const runtimeRequire=createRequire(path.join(runtimeModules||path.dirname(fileURLToPath(import.meta.url)),"runtime-loader.cjs"));
let chromium;
for(const moduleName of ["playwright","playwright-core"]){
  try{({chromium}=runtimeRequire(moduleName));break}catch{}
}
if(!chromium){console.log("V10.6 browser checks skipped: Playwright is not installed");process.exit(0)}

const browserCandidates=[process.env.CHROMIUM_PATH].filter(Boolean);
try{const bundled=chromium.executablePath();if(bundled&&fs.existsSync(bundled))browserCandidates.push(bundled)}catch{}
browserCandidates.push("/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser");
const browserPath=browserCandidates.find(candidate=>fs.existsSync(candidate));
if(!browserPath){console.log("V10.6 browser checks skipped: no Chromium executable is available");process.exit(0)}

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg",".wav":"audio/wav"};
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
  if(!file.startsWith(repo)){res.writeHead(403).end();return}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end("not found");return}res.setHeader("content-type",mime[path.extname(file)]||"application/octet-stream");res.setHeader("cache-control","no-store");res.end(data)})
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base=`http://127.0.0.1:${server.address().port}/arcade/lost-sizzler/`;

const browser=await chromium.launch({headless:true,executablePath:browserPath});
const context=await browser.newContext({viewport:{width:1600,height:900}});
await context.addInitScript(()=>{
  let fsElement=null;
  Object.defineProperty(document,"fullscreenElement",{configurable:true,get:()=>fsElement});
  Element.prototype.requestFullscreen=function(){fsElement=this;window.__mockFullscreen=true;document.dispatchEvent(new Event("fullscreenchange"));return Promise.resolve()};
  document.exitFullscreen=()=>{fsElement=null;document.dispatchEvent(new Event("fullscreenchange"));return Promise.resolve()};
  try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}
});

const pages=[];
const makePage=async(name,url=base)=>{
  const page=await context.newPage();pages.push(page);
  await page.goto(url,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerV142ZeroServerRelease?.releaseModel==="local-browser",{timeout:90000});
  const fatal=await page.evaluate(()=>({fatal:document.getElementById("ccg-release-loading")?.classList.contains("is-error")===true,errors:[...(window.CCGLostSizzlerReleaseGate?.state?.errors||[])]}));
  assert.equal(fatal.fatal,false,`local release must not enter fatal loading state: ${JSON.stringify(fatal.errors)}`);
  await page.locator("#player-name").fill(name);
  return page;
};
const assertTacticalContained=async(page,label)=>{
  const tactical=await page.locator(".tactical-zone").boundingBox(),radar=await page.locator(".radar-card").boundingBox(),radarCanvas=await page.locator("#radar-canvas").boundingBox(),shortcuts=await page.locator(".shortcut-dock").boundingBox();
  assert.ok(tactical&&radar&&radarCanvas&&shortcuts,`${label}: tactical radar and shortcut panels are visible`);
  const tolerance=2,right=box=>box.x+box.width,bottom=box=>box.y+box.height;
  for(const [name,box] of [["radar card",radar],["radar canvas",radarCanvas],["shortcut dock",shortcuts]])assert.ok(box.x>=tactical.x-tolerance&&right(box)<=right(tactical)+tolerance,`${label}: ${name} stays inside the tactical sidebar horizontally`);
  assert.ok(shortcuts.y>=bottom(radar)-tolerance,`${label}: shortcut dock remains below the radar`);
};

try{
  const game=await makePage("Local Tester");
  assert.equal(await game.locator("body").getAttribute("data-run-active"),"false");
  assert.equal(await game.locator("#solo-btn").textContent(),"Start Game","the shipped primary action must remain Start Game at runtime");
  assert.equal(await game.locator(".canvas-wrap").isVisible(),false,"the dungeon canvas is hidden on the start page");
  assert.equal(await game.locator(".tactical-zone").isVisible(),false,"the radar is hidden on the start page");
  assert.equal(await game.locator(".player-hub").isVisible(),false,"the HUD is hidden on the start page");
  assert.equal(await game.evaluate(()=>typeof window.net),"undefined","retired network transport must not be recreated at runtime");

  const viewport=game.viewportSize(),menuBox=await game.locator("#menu").boundingBox(),startBox=await game.locator("#solo-btn").boundingBox();
  assert.ok(menuBox.width>=viewport.width-2&&menuBox.height>=viewport.height-2,"start menu fills the viewport");
  assert.ok(await game.locator("#solo-btn").isVisible()&&startBox.y>=0&&startBox.y+startBox.height<=viewport.height,"Start Game is visible without scrolling");

  await game.locator("#solo-btn").click();
  await game.waitForFunction(()=>document.body.dataset.runActive==="true");
  assert.equal(await game.evaluate(()=>Boolean(window.__mockFullscreen)),true,"starting the game requests fullscreen");
  const box=await game.locator(".canvas-wrap").boundingBox();
  assert.ok(box.width>1150&&box.height>650,`desktop canvas becomes gameplay dominant after Start: ${JSON.stringify(box)}`);
  await assertTacticalContained(game,"1600x900 game");

  await game.locator("#quit-btn").click();await game.locator("#pause:not(.hidden)").waitFor();
  assert.equal(await game.locator(".player-hub").isVisible(),false,"the pause screen hides the HUD");
  assert.equal(await game.locator(".tactical-zone").isVisible(),false,"the pause screen hides the radar");
  await game.locator("#resume-btn").click();
  assert.equal(await game.locator(".player-hub").isVisible(),true,"continuing restores the HUD");
  assert.equal(await game.locator(".tactical-zone").isVisible(),true,"continuing restores the radar");
  await game.evaluate(()=>showNamedDossier());await game.locator("#named-dossier-panel:not(.hidden)").waitFor();
  await game.locator("#named-dossier-close").click();
  await game.locator("#quit-btn").click();await game.locator("#pause-quit-btn").click();
  await game.waitForFunction(()=>document.body.dataset.runActive==="false"&&!document.getElementById("menu")?.classList.contains("hidden"));

  const wide=await context.newPage();pages.push(wide);await wide.setViewportSize({width:1920,height:1080});await wide.goto(base);
  await wide.waitForFunction(()=>document.body.dataset.gameReady==="true"&&document.body.dataset.releaseReady==="true",{timeout:90000});
  await wide.locator("#solo-btn").click();await wide.waitForFunction(()=>document.body.dataset.runActive==="true");
  const wideBox=await wide.locator(".canvas-wrap").boundingBox();
  assert.ok(wideBox.width>1500&&wideBox.height>850,`1920×1080 canvas remains large after play begins: ${JSON.stringify(wideBox)}`);
  await assertTacticalContained(wide,"1920x1080 game");

  const mobile=await context.newPage();pages.push(mobile);await mobile.setViewportSize({width:844,height:390});await mobile.goto(base);
  await mobile.waitForFunction(()=>document.body.dataset.gameReady==="true"&&document.body.dataset.releaseReady==="true",{timeout:90000});
  const mobileMenu=await mobile.locator("#menu").boundingBox();
  assert.equal(await mobile.locator(".canvas-wrap").isVisible(),false);assert.ok(mobileMenu.width>=842&&mobileMenu.height>=388,"mobile menu fills its viewport");
  await mobile.locator("#solo-btn").click();await mobile.waitForFunction(()=>document.body.dataset.runActive==="true");
  const mobileBox=await mobile.locator(".canvas-wrap").boundingBox(),mobileRail=await mobile.locator(".game-message-rail").boundingBox();
  assert.ok(mobileBox.width>800&&mobileBox.height>230,`mobile landscape remains playable: ${JSON.stringify(mobileBox)}`);
  assert.ok(mobileRail&&mobileRail.height<=22,`short-landscape message rail stays compact: ${JSON.stringify(mobileRail)}`);
  await mobile.evaluate(()=>toggleInventory());await mobile.locator("#inventory-panel:not(.hidden)").waitFor();
  assert.ok(await mobile.locator("#inventory-close-top").isVisible(),"mobile inventory has a persistent Back to Game button");

  console.log("V10.6 local browser start, pause, responsive layout and retired-transport checks passed");
}finally{
  for(const page of pages)await page.close().catch(()=>{});
  await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));
}
