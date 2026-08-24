import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".webp":"image/webp",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".mp3":"audio/mpeg",
  ".wav":"audio/wav",
  ".ogg":"audio/ogg",
  ".m4a":"audio/mp4"
};

const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return;}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end("not found");return;}
      res.setHeader("content-type",mime[path.extname(file).toLowerCase()]||"application/octet-stream");
      res.setHeader("cache-control","no-store");
      res.setHeader("connection","close");
      res.end(data);
    });
  }catch(error){res.writeHead(500).end(String(error));}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket));});

await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();
  page.setDefaultTimeout(15000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true");
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true");
  await page.waitForTimeout(500);

  const layout=await page.evaluate(()=>{
    const box=selector=>{
      const r=document.querySelector(selector)?.getBoundingClientRect();
      return r?{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null;
    };
    const shell=document.querySelector(".ccg-game");
    return{
      shell:box(".ccg-game"),
      topbar:box(".ccg-game>.topbar"),
      tactical:box(".ccg-game>.tactical-zone"),
      gameArea:box(".ccg-game>.game-area"),
      canvasWrap:box(".ccg-game>.game-area>.canvas-wrap"),
      playerHub:box(".ccg-game>.player-hub"),
      gridTemplateColumns:shell?getComputedStyle(shell).gridTemplateColumns:""
    };
  });

  assert.deepEqual(errors,[],`layout launch must have no uncaught browser errors: ${errors.join("\n")}`);
  for(const key of ["shell","topbar","tactical","gameArea","canvasWrap","playerHub"])assert.ok(layout[key],`${key} must exist`);

  const shellWidth=layout.shell.width;
  const near=(a,b,tolerance=3)=>Math.abs(a-b)<=tolerance;
  assert.ok(layout.gameArea.width>=shellWidth*.95,`gameplay area must retain the main width, not a sidebar: ${JSON.stringify(layout)}`);
  assert.ok(layout.canvasWrap.width>=shellWidth*.90,`gameplay canvas must retain the main width, not a sidebar: ${JSON.stringify(layout)}`);
  assert.ok(layout.tactical.width>=shellWidth*.95,`tactical intelligence must remain a full-width row: ${JSON.stringify(layout)}`);
  assert.ok(layout.playerHub.width>=shellWidth*.95,`player hub must remain a full-width row: ${JSON.stringify(layout)}`);
  assert.ok(near(layout.gameArea.left,layout.shell.left),`gameplay area must begin at the shell's left edge: ${JSON.stringify(layout)}`);
  assert.ok(near(layout.tactical.left,layout.shell.left),`tactical zone must begin at the shell's left edge: ${JSON.stringify(layout)}`);
  assert.ok(layout.tactical.bottom<=layout.gameArea.top+3,`tactical zone must sit above the gameplay area instead of beside it: ${JSON.stringify(layout)}`);
  assert.equal(layout.gridTemplateColumns.trim().split(/\s+/).length,1,`outer game shell must resolve to one desktop column: ${layout.gridTemplateColumns}`);

  console.log("Lost Sizzler V10.35 desktop layout geometry passed in Chromium.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
