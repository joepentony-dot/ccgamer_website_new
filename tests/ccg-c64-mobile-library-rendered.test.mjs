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
    body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(40000),
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
 'deck:box(".ccg-c64-control-stack"), joy:show(".ccg-c64-touch-controls"),',
 'keys:show(".ccg-c64-touch-fkeys"), libraryInConsole:e(".ccg-c64-panel--library").parentElement===e(".ccg-c64-console"),',
 'romTransfer:e("[data-rom-import]")!==null,',
 'libraryInConsole:e(".ccg-c64-panel--library").parentElement===e(".ccg-c64-console"),',
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
      "--disable-dev-shm-usage","--no-first-run","--disable-background-networking"]}
  }}});
  session=created.sessionId;
  assert(session,"ChromeDriver did not provide a session");
  await emulate(session,390,844,true);
  await wd("POST","/session/"+session+"/url",{url:"http://"+host+":"+port+"/emulator/c64/"});
  await sleep(1900);

  for(const [width,height,touch] of [[320,680,true],[360,780,true],[390,844,true],
    [844,390,true],[1440,900,false]]){
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
    }
    console.log("PASS C64 viewport "+width+"x"+height+(touch?" touch":" desktop"));
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
