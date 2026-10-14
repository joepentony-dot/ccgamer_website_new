#!/usr/bin/env node
"use strict";

// Rendered C64 screen checks in GitHub runner Chromium (no external dependencies).
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = "127.0.0.1", driverPort = 19751;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const mime = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript",
  ".json":"application/json", ".svg":"image/svg+xml", ".png":"image/png",
  ".webp":"image/webp", ".woff2":"font/woff2", ".ico":"image/x-icon" };

async function wd(method, url, data) {
  const res = await fetch("http://" + host + ":" + driverPort + url, {
    method, headers: data ? { "content-type":"application/json" } : {},
    body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(90000),
  });
  const raw = await res.text(), payload = raw ? JSON.parse(raw) : {};
  if (!res.ok || payload.value?.error) throw Error(raw.slice(0,1200));
  return payload.value;
}
async function evaluate(id, expression) {
  return wd("POST", "/session/"+id+"/execute/sync", { script:expression, args:[] });
}
async function emulate(id,width,height,touch) {
  await wd("POST", "/session/"+id+"/goog/cdp/execute", {
    cmd:"Emulation.setDeviceMetricsOverride",
    params: { width,height,deviceScaleFactor:1,mobile:touch,
      screenWidth:width,screenHeight:height,
      screenOrientation:{type:width>height?"landscapePrimary":"portraitPrimary",
        angle:width>height?90:0} },
  });
  await wd("POST", "/session/"+id+"/goog/cdp/execute", {
    cmd:"Emulation.setTouchEmulationEnabled", params:{enabled:touch,maxTouchPoints:5},
  });
  await sleep(250);
}

const measure = [
 'var e=s=>document.querySelector(s);',
 'var box=s=>{var r=e(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};',
 'var show=s=>{var v=e(s);return v && getComputedStyle(v).display!=="none" && v.getBoundingClientRect().height>1;};',
 'return { vw:document.documentElement.clientWidth, sw:document.documentElement.scrollWidth,',
 'touch:matchMedia("(pointer: coarse)").matches, stage:box(".ccg-c64-screen-stage"),',
 'bezel:box(".ccg-c64-screen-bezel"), console:box(".ccg-c64-console"),',
 'deck:box(".ccg-c64-control-stack"), vault:box(".ccg-c64-panel--vault"),', 
 'advanced:box(".ccg-c64-advanced"), joy:show(".ccg-c64-touch-controls"),',
 'keys:show(".ccg-c64-touch-fkeys"), libraryInConsole:e(".ccg-c64-panel--library").parentElement===e(".ccg-c64-console"),',
 'romTransfer:e("[data-rom-import]")!==null,',
 'font:parseFloat(getComputedStyle(e("#ccg-c64-library-search")).fontSize)};'
].join("\n");

const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url,"http://local").pathname);
  let f = path.resolve(root,pathname.replace(/^\/+/,""));
  if (!f.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f=path.join(f,"index.html");
  if (!fs.existsSync(f) || !fs.statSync(f).isFile()) {
    res.writeHead(404);res.end("not found");return;
  }
  res.writeHead(200,{"Content-Type":mime[path.extname(f)]||"application/octet-stream",
    "Cache-Control":"no-store"});
  res.end(fs.readFileSync(f));
});
let child, session;
try {
  const driver=spawnSync("bash",["-lc","command -v chromedriver"],{encoding:"utf8"}).stdout.trim();
  assert(driver,"ChromeDriver not found");
  await new Promise((resolve,reject)=>{
    server.once("error",reject);server.listen(0,host,resolve);
  });
  const port=server.address().port;
  child=spawn(driver,["--port="+driverPort,"--allowed-ips="+host],{stdio:"ignore"});
  for(let i=0;i<80;i++){
    try{if((await fetch("http://"+host+":"+driverPort+"/status")).ok)break;}catch{}
    await sleep(100);
  }
  const created=await wd("POST","/session",{capabilities:{alwaysMatch:{
    browserName:"chrome",pageLoadStrategy:"eager",
    "goog:chromeOptions":{args:["--headless=new","--no-sandbox","--disable-gpu",
      "--disable-extensions","--disable-renderer-backgrounding",
      "--disable-dev-shm-usage","--no-first-run","--disable-background-networking"]}
  }}});
  session=created.sessionId;
  console.log("Chromium session established for mobile/desktop layout test.");
  assert(session,"ChromeDriver did not provide a session");
  await emulate(session,390,844,true);
  await wd("POST","/session/"+session+"/url",{url:"http://"+host+":"+port+"/emulator/c64/"});
  await sleep(1900);

  for(const [width,height,touch] of [[320,680,true],[360,780,true],[390,844,true],
    [844,390,true],[1440,900,false],[1620,900,false]]){
    await emulate(session,width,height,touch);
    const r=await evaluate(session,measure);
    assert(r.vw>0 && r.sw-r.vw<5,
      "C64 document horizontal overflow at "+width+"x"+height+": "+(r.sw-r.vw));
    if(touch){
      assert(r.libraryInConsole, "Mobile game library must sit directly below the C64 display");
      assert(r.touch && r.joy && r.keys && r.romTransfer,
        "Missing mobile joystick / extra keys / fullscreen button at "+width+"x"+height);
      assert(r.font>=16,"Search font would zoom iOS page at "+width+"x"+height);
      assert(r.bezel.width <= r.stage.width+3 &&
        r.bezel.height <= r.stage.height+3,
        "C64 game screen is clipped at "+width+"x"+height);
      assert(r.deck.top>=r.console.bottom-2,
        "Control panels must stack below mobile console at "+width+"x"+height);
    }else{
      assert(!r.libraryInConsole, "Desktop library must remain in its original control deck");
      assert(!r.joy&&!r.keys&&!r.libraryInConsole,"Desktop layout unexpectedly gained mobile buttons");
      assert(r.deck.left>=r.console.right-2,"Desktop Omega columns changed");
      // The former CSS grid-column:auto bug squeezed Game Vault to ~1/6
      // of this deck and stretched the page into a huge blank column.
      assert(r.vault.width >= r.deck.width - 6,
        "Save / Resume collapsed into a narrow desktop grid column at " +
        width + "x" + height + " (vault=" + r.vault.width + " deck=" + r.deck.width + ")");
      assert(Math.abs(r.vault.left - r.deck.left) <= 5,
        "Save / Resume must align with the left edge of the desktop control deck");
      assert(r.vault.height < 420,
        "Save / Resume text is vertically stretched at " + width + "x" + height);
      assert(r.advanced.top >= r.vault.bottom - 4,
        "Advanced media tools must follow the Save / Resume panel rather than overlap it");
    }
    console.log("PASS C64 viewport "+width+"x"+height+(touch?" touch":" desktop"));
  }


  // Exercise the immersive layout rather than only the library. Geometry
  // is measured in real Chromium at small portrait and landscape viewports.
  for (const [width, height] of [[320, 680], [390, 844], [844, 390]]) {
    await emulate(session, width, height, true);
    const v = await evaluate(session, [
      'var e=s=>document.querySelector(s);',
      'var shell=e(".ccg-c64-console");shell.classList.add("is-mobile-playing");',
      'document.body.classList.add("is-mobile-playing");',
      'e("[data-mobile-playbar]").hidden=false;',
      'e("[data-mobile-game-actions]").hidden=false;',
      'e(".ccg-c64-touch-jump").hidden=false;',
      'var rect=s=>{var r=e(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};',
      'var control=rect("[data-mobile-game-actions]"), bar=rect("[data-mobile-playbar]"),',
      'screen=rect(".ccg-c64-screen-stage"), touch=rect(".ccg-c64-touch-controls"),',
      'opts=rect(".ccg-c64-touch-options"), body=rect(".ccg-c64-console");',
      'return {bar,control,screen,touch,opts,body,sw:document.documentElement.scrollWidth,',
      'vw:document.documentElement.clientWidth,',
      'pause:rect("[data-mobile-pause]"), save:rect("[data-mobile-save-state]"),',
      'load:rect("[data-mobile-load-state]"), jump:rect(".ccg-c64-touch-jump"),',
      'fire:rect(".ccg-c64-touch-fire"),crt:rect("[data-mobile-crt-mode]"),',
      'jumpToggle:document.querySelector("[data-jump-toggle]")!==null};',
    ].join("\\n"));
    assert(v.sw-v.vw<5, "Immersive C64 horizontal overflow at "+width+"x"+height);
    assert(v.control.width > width * .80 && v.control.height >= 30,
      "Mobile pause/save/load row is missing at "+width+"x"+height);
    assert(v.pause.width >= 70 && v.save.width >= 70 && v.load.width >= 70,
      "Mobile save controls are too narrow at "+width+"x"+height);
    assert(v.jump.width >= 60 && v.fire.width >= 60,
      "FIRE and JUMP must both remain touch-sized");
    assert(v.crt.width >= 55 && !v.jumpToggle, "CRT must replace JUMP toggle");
    assert(v.control.top >= v.bar.bottom-3 && v.screen.top >= v.control.bottom-3,
      "Controls must appear above the game screen");
    assert(v.touch.top >= v.screen.bottom-3 && v.opts.top >= v.touch.bottom-3,
      "Touch controls and bottom selector must appear after game screen");
    assert(v.opts.bottom <= height+4 && v.screen.height >= 35,
      "Immersive game screen or bottom buttons fall outside mobile viewport");
    console.log("PASS C64 immersive mobile controls "+width+"x"+height);
    await evaluate(session, [
      'document.querySelector(".ccg-c64-console").classList.remove("is-mobile-playing");',
      'document.body.classList.remove("is-mobile-playing");',
      'document.querySelector("[data-mobile-playbar]").hidden=true;',
      'document.querySelector("[data-mobile-game-actions]").hidden=true;',
      'return true;'
    ].join("\\n"));
  }
  await emulate(session,390,844,true);
  const drop=await evaluate(session,[
    'var l=document.querySelector(".ccg-c64-panel--library");l.hidden=false;',
    'var n=l.nextElementSibling,b=n.getBoundingClientRect().top;',
    'document.querySelector("[data-online-library-suggestions]").hidden=false;',
    'return {before:b,after:n.getBoundingClientRect().top,',
    'position:getComputedStyle(document.querySelector("[data-online-library-suggestions]")).position};',
  ].join("\n"));
  assert.equal(drop.position,"absolute");
  assert(Math.abs(drop.before-drop.after)<1,"Autocomplete pushed the mobile panels down");

  console.log("PASS C64 rendered mobile game library and desktop audit");
} finally {
  if(session)try{await wd("DELETE","/session/"+session);}catch{}
  if(child)child.kill("SIGTERM");
  if(server.listening)await new Promise(resolve=>server.close(resolve));
}
