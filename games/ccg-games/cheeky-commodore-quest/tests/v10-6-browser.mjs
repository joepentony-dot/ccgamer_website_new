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

const browserCandidates=[process.env.CHROMIUM_PATH,"/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser"].filter(Boolean);
const executablePath=browserCandidates.find(candidate=>fs.existsSync(candidate));
if(!executablePath){
  try{const bundled=chromium.executablePath();if(bundled&&fs.existsSync(bundled))browserCandidates.push(bundled)}catch{}
}
const browserPath=browserCandidates.find(candidate=>fs.existsSync(candidate));
if(!browserPath){console.log("V10.6 browser checks skipped: no Chromium executable is available");process.exit(0)}

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../..");
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg",".wav":"audio/wav"};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);if(!file.startsWith(repo)){res.writeHead(403).end();return}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end("not found");return}res.setHeader("content-type",mime[path.extname(file)]||"application/octet-stream");res.end(data)})});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));const base=`http://127.0.0.1:${server.address().port}/games/ccg-games/cheeky-commodore-quest/`;

const browser=await chromium.launch({headless:true,executablePath:browserPath});const context=await browser.newContext({viewport:{width:1600,height:900}});
await context.addInitScript(()=>{
  let fsElement=null;Object.defineProperty(document,"fullscreenElement",{configurable:true,get:()=>fsElement});Element.prototype.requestFullscreen=function(){fsElement=this;window.__mockFullscreen=true;document.dispatchEvent(new Event("fullscreenchange"));return Promise.resolve()};document.exitFullscreen=()=>{fsElement=null;document.dispatchEvent(new Event("fullscreenchange"));return Promise.resolve()};
  Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async text=>{window.__copiedInvite=text}}});
  const handlers=new Set();window.addEventListener("storage",event=>{for(const fn of handlers)fn(event)});
  function client(){return{channel(topic,options={}){const key=options.config?.presence?.key||Math.random().toString(36),events=[],bc=new BroadcastChannel(`mock-${topic}`),prefix=`mock-presence:${topic}:`;let mine=null,sub=null;
    const firePresence=()=>{for(const row of events)if(row.type==="presence")row.callback()};handlers.add(event=>{if(event.key?.startsWith(prefix))firePresence()});bc.onmessage=event=>{const data=event.data;for(const row of events)if(row.type==="broadcast"&&row.filter?.event===data.event)row.callback({payload:data.payload})};
    const channel={on(type,filter,callback){events.push({type,filter,callback});return channel},subscribe(callback){sub=callback;queueMicrotask(()=>sub?.("SUBSCRIBED"));return channel},async track(payload){mine={...payload};localStorage.setItem(`${prefix}${key}`,JSON.stringify(mine));firePresence();return"ok"},presenceState(){const state={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k?.startsWith(prefix))continue;try{const value=JSON.parse(localStorage.getItem(k));state[k.slice(prefix.length)]=[value]}catch{}}return state},async send(message){bc.postMessage({event:message.event,payload:message.payload});return"ok"},async untrack(){localStorage.removeItem(`${prefix}${key}`);mine=null;firePresence();return"ok"},close(){bc.close()}};return channel},async removeChannel(channel){channel.close?.();return"ok"}}}
  window.ccgSupabase={getClient:async()=>client()};
});
const pages=[];const makePage=async(name,url=base)=>{const page=await context.newPage();pages.push(page);await page.goto(url,{waitUntil:"domcontentloaded"});await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&window.CCGLostSizzlerV106);await page.locator("#player-name").fill(name);return page};

try{
  const host=await makePage("Host");
  const box=await host.locator(".canvas-wrap").boundingBox();assert.ok(box.width>1150&&box.height>650,`desktop canvas is gameplay dominant: ${JSON.stringify(box)}`);
  await host.locator("#create-btn").click();await host.locator("#online-lobby:not(.hidden)").waitFor();assert.equal(await host.evaluate(()=>Boolean(window.__mockFullscreen)),false,"Create remains in a normal lobby until Start");
  const code=(await host.locator("#lobby-room-code").textContent()).trim();assert.match(code,/^[A-Z0-9]{5}$/);const invite=await host.locator("#lobby-invite-url").inputValue();assert.ok(invite.includes(`room=${code}`));await host.locator("#lobby-copy-btn").click();assert.equal(await host.evaluate(()=>window.__copiedInvite),invite);

  const guests=[];for(let i=1;i<=3;i++){const guest=await makePage(`Guest ${i}`,`${base}?room=${code}`);guests.push(guest);assert.equal(await guest.locator("#room-code").inputValue(),code);await guest.waitForTimeout(60);await guest.locator("#join-btn").click();await guest.locator("#online-lobby:not(.hidden)").waitFor();assert.equal(await guest.evaluate(()=>Boolean(window.__mockFullscreen)),true,"Joiners remain fullscreen while waiting")}
  await host.waitForFunction(()=>document.getElementById("lobby-status")?.textContent.startsWith("4/4"));assert.equal(await host.locator("#lobby-player-list li").count(),4);

  const fifth=await makePage("Fifth",`${base}?room=${code}`);await fifth.waitForTimeout(60);await fifth.locator("#join-btn").click();await fifth.waitForFunction(()=>/room is full/i.test(document.getElementById("menu-note")?.textContent||""),null,{timeout:12000});assert.ok(await fifth.locator("#online-lobby.hidden").count());

  await guests[2].locator("#lobby-cancel-btn").click();await host.waitForFunction(()=>document.getElementById("lobby-status")?.textContent.startsWith("3/4"));
  await host.locator("#lobby-start-btn").click();await host.waitForFunction(()=>document.getElementById("online-lobby")?.classList.contains("hidden")&&document.body.dataset.gameReady==="true");for(const guest of guests.slice(0,2))await guest.waitForFunction(()=>document.getElementById("online-lobby")?.classList.contains("hidden")&&document.getElementById("menu")?.classList.contains("hidden"),null,{timeout:10000});assert.equal(await host.evaluate(()=>Boolean(window.__mockFullscreen)),true,"Host enters fullscreen on Start");

  const wide=await context.newPage();pages.push(wide);await wide.setViewportSize({width:1920,height:1080});await wide.goto(base);await wide.waitForFunction(()=>document.body.dataset.gameReady==="true");const wideBox=await wide.locator(".canvas-wrap").boundingBox();assert.ok(wideBox.width>1500&&wideBox.height>850,`1920×1080 canvas remains large: ${JSON.stringify(wideBox)}`);
  const mobile=await context.newPage();pages.push(mobile);await mobile.setViewportSize({width:844,height:390});await mobile.goto(base);await mobile.waitForFunction(()=>document.body.dataset.gameReady==="true");const mobileBox=await mobile.locator(".canvas-wrap").boundingBox();assert.ok(mobileBox.width>800&&mobileBox.height>260,`mobile landscape remains playable: ${JSON.stringify(mobileBox)}`);assert.equal(await mobile.locator("#menu").isVisible(),true);
  console.log("V10.6 browser lobby and responsive checks passed");
}finally{for(const page of pages)await page.close().catch(()=>{});await context.close();await browser.close();await new Promise(resolve=>server.close(resolve))}
