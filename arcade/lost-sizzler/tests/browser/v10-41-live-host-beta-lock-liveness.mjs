import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const watchdog=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-41-load-watchdog.js"),"utf8");
const html=`<!doctype html><html><body><main id="menu"><div class="game-mode-buttons"><button id="solo-btn">PLAY SOLO</button><button id="tutorial-zone-btn">TUTORIAL</button><button id="split-btn">2P SPLIT SCREEN</button></div></main><script>window.CCGLostSizzlerReleaseGate={state:{ready:false,failed:false}};</script><script src="/arcade/lost-sizzler/js/v10-41-load-watchdog.js"></script></body></html>`;

const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking"]});
try{
  const context=await browser.newContext(),page=await context.newPage();
  page.setDefaultTimeout(5000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.route("https://cheekycommodoregamer.co.uk/**",async route=>{
    const pathname=new URL(route.request().url()).pathname;
    if(pathname==="/live-host-release-test.html")return route.fulfill({status:200,contentType:"text/html; charset=utf-8",body:html});
    if(pathname==="/arcade/lost-sizzler/js/v10-41-load-watchdog.js")return route.fulfill({status:200,contentType:"text/javascript; charset=utf-8",body:watchdog});
    return route.fulfill({status:404,contentType:"text/plain",body:"not found"});
  });

  await page.goto("https://cheekycommodoregamer.co.uk/live-host-release-test.html",{waitUntil:"domcontentloaded"});
  await page.waitForTimeout(100);
  const live=await page.evaluate(()=>({
    closed:window.CCGLostSizzlerLoadWatchdog.publicBetaClosed(),
    locked:window.CCGLostSizzlerLoadWatchdog.publicPlayLocked(),
    lockClass:document.body.classList.contains("ccg-public-beta-closed"),
    sash:Boolean(document.getElementById("ccg-beta-ended-sash")),
    soloDisabled:Boolean(document.getElementById("solo-btn")?.disabled),
    tutorialDisabled:Boolean(document.getElementById("tutorial-zone-btn")?.disabled),
    splitDisabled:Boolean(document.getElementById("split-btn")?.disabled)
  }));
  assert.deepEqual(live,{closed:false,locked:false,lockClass:false,sash:false,soloDisabled:false,tutorialDisabled:false,splitDisabled:false},`public release host must remain playable without a beta-lock handoff: ${JSON.stringify(live)}`);
  assert.deepEqual(errors,[],`public release host regression produced page errors: ${errors.join("\n")}`);
  console.log("Dungeon Carnage public release host starts without a beta lock or menu flicker.");
  await context.close();
}finally{await browser.close().catch(()=>{})}
