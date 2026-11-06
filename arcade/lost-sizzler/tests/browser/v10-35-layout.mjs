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
      mission:box(".ccg-game>.mission"),
      tactical:box(".ccg-game>.tactical-zone"),
      gameArea:box(".ccg-game>.game-area"),
      canvasWrap:box(".ccg-game>.game-area>.canvas-wrap"),
      playerHub:box(".ccg-game>.player-hub"),
      gridTemplateColumns:shell?getComputedStyle(shell).gridTemplateColumns:""
    };
  });

  assert.deepEqual(errors,[],`layout launch must have no uncaught browser errors: ${errors.join("\n")}`);
  for(const key of ["shell","topbar","mission","tactical","gameArea","canvasWrap","playerHub"])assert.ok(layout[key],`${key} must exist`);

  const shellWidth=layout.shell.width;
  const near=(a,b,tolerance=3)=>Math.abs(a-b)<=tolerance;
  const columns=layout.gridTemplateColumns.trim().split(/\s+/).map(Number.parseFloat);

  assert.equal(columns.length,2,`desktop shell must resolve to a dungeon column plus tactical sidebar: ${layout.gridTemplateColumns}`);
  assert.ok(columns[1]>=215&&columns[1]<=300,`tactical sidebar must stay near its 220-280px design width: ${layout.gridTemplateColumns}`);
  assert.ok(layout.gameArea.width>=shellWidth*.75,`gameplay area must remain the dominant left column: ${JSON.stringify(layout)}`);
  assert.ok(layout.tactical.width>=215&&layout.tactical.width<=300,`radar/dossier must stay in the narrow right sidebar: ${JSON.stringify(layout)}`);
  assert.ok(layout.canvasWrap.width>=layout.gameArea.width*.90,`gameplay canvas must fill the main gameplay column: ${JSON.stringify(layout)}`);
  assert.ok(near(layout.gameArea.left,layout.shell.left),`gameplay area must begin at the shell's left edge: ${JSON.stringify(layout)}`);
  assert.ok(near(layout.gameArea.right,layout.tactical.left),`gameplay area and tactical sidebar must meet without swapping columns: ${JSON.stringify(layout)}`);
  assert.ok(near(layout.tactical.right,layout.shell.right),`tactical sidebar must finish at the shell's right edge: ${JSON.stringify(layout)}`);
  assert.ok(near(layout.gameArea.top,layout.tactical.top),`gameplay area and tactical sidebar must share the live-play row: ${JSON.stringify(layout)}`);
  assert.ok(near(layout.gameArea.bottom,layout.tactical.bottom),`gameplay area and tactical sidebar must share the live-play row height: ${JSON.stringify(layout)}`);
  assert.ok(layout.topbar.width>=shellWidth*.95,`top bar must span both desktop columns: ${JSON.stringify(layout)}`);
  assert.ok(layout.mission.width>=shellWidth*.95,`mission strip must span both desktop columns: ${JSON.stringify(layout)}`);
  assert.ok(layout.playerHub.width>=shellWidth*.95,`player hub must span both desktop columns: ${JSON.stringify(layout)}`);

  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(100);
  const portraitRadar=await page.evaluate(()=>{
    const selectors=[".ccg-game",".ccg-game>.tactical-zone",".v102-radar-card","#radar-canvas",".fullscreen-hint",".ccg-game>.game-area",".ccg-game>.player-hub"];
    const boxes=Object.fromEntries(selectors.map(selector=>{
      const element=document.querySelector(selector);
      if(!element)return[selector,null];
      const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
      return[selector,{x:rect.x,y:rect.y,width:rect.width,height:rect.height,display:style.display,visibility:style.visibility,gridRows:style.gridTemplateRows}];
    }));
    const canvas=document.querySelector("#radar-canvas"),rect=canvas?.getBoundingClientRect();
    return rect?{width:rect.width,height:rect.height,ratio:rect.width/rect.height,viewport:{width:innerWidth,height:innerHeight},fullscreen:document.fullscreenElement?.className||false,runActive:document.body.dataset.runActive,playMode:document.body.dataset.playMode,specialMode:document.body.dataset.specialMode,boxes}:null;
  });
  console.log("Mobile portrait radar layout diagnostics:",JSON.stringify(portraitRadar));
  assert.ok(portraitRadar, "mobile portrait must retain the live tactical radar canvas");
  assert.ok(portraitRadar.width>=300&&portraitRadar.height>=150,
    `mobile portrait radar must be readable at full width: ${JSON.stringify(portraitRadar)}`);
  assert.ok(Math.abs(portraitRadar.ratio-2)<=.08,
    `mobile portrait radar must preserve its 2:1 source geometry: ${JSON.stringify(portraitRadar)}`);

  await page.setViewportSize({width:390,height:400});
  await page.waitForTimeout(100);
  const shortRadar=await page.evaluate(()=>{
    const canvas=document.querySelector("#radar-canvas"),rect=canvas?.getBoundingClientRect();
    return rect?{width:rect.width,height:rect.height,ratio:rect.width/rect.height}:null;
  });
  assert.ok(shortRadar, "short mobile landscape must retain the tactical radar canvas");
  assert.ok(shortRadar.width>=200&&shortRadar.height>=100,
    `short mobile radar must remain legible within the available height: ${JSON.stringify(shortRadar)}`);
  assert.ok(Math.abs(shortRadar.ratio-2)<=.08,
    `short mobile radar must preserve its 2:1 source geometry: ${JSON.stringify(shortRadar)}`);

  console.log("Lost Sizzler desktop and responsive tactical-map layout geometry passed in Chromium.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
