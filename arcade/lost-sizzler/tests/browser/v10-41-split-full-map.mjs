import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerFullMapV141));

  const initial=await page.evaluate(async()=>{
    const started=await startSplit();
    input.clear();
    move1=0;move2=0;
    return{started,playMode,mode,hasP1:Boolean(p1),hasP2:Boolean(p2),runActive:document.body.dataset.runActive,mapOpen:window.CCGLostSizzlerFullMapV141.state.open};
  });
  assert.equal(initial.started,true,"real split-screen startup must succeed before testing the map");
  assert.equal(initial.playMode,"split","browser contract must execute in split-screen mode");
  assert.equal(initial.mode,"playing","split run must begin in playing mode");
  assert.equal(initial.hasP1,true,"split run must initialize P1");
  assert.equal(initial.hasP2,true,"split run must initialize P2");
  assert.equal(initial.runActive,"true","real split-screen startup must activate the run presentation");
  assert.equal(initial.mapOpen,false,"full map must begin closed");

  await page.keyboard.press("m");
  const opened=await page.evaluate(()=>({open:window.CCGLostSizzlerFullMapV141.state.open,mode,panelHidden:document.getElementById("ccg-solo-full-map")?.classList.contains("hidden")}));
  assert.equal(opened.open,true,"M must open the explored full map in split-screen");
  assert.equal(opened.mode,"paused","opening the map must pause active split play");
  assert.equal(opened.panelHidden,false,"map panel must be visible after M opens it");

  const exploredOnly=await page.evaluate(()=>{
    const blocked=new Set();
    const reserve=q=>{if(q&&Number.isFinite(Number(q.x))&&Number.isFinite(Number(q.y)))blocked.add(`${Math.round(Number(q.x))},${Math.round(Number(q.y))}`)};
    reserve(p1);reserve(p2);reserve(world.exit);
    for(const group of [host?.items,host?.deathCaches,host?.shops,host?.progressionRecoveryMarkers])for(const q of group||[])reserve(q);
    const floor=[];
    for(let y=0;y<world.map.length;y++)for(let x=0;x<world.map[y].length;x++)if(!world.map[y][x]&&!blocked.has(`${x},${y}`))floor.push({x,y});
    if(floor.length<2)throw new Error("split full-map contract could not locate two neutral floor cells");
    const known=floor[0],unknown=floor.find(q=>q.x!==known.x||q.y!==known.y);
    explored.set(p1.id,new Set([`${known.x},${known.y}`]));
    window.CCGLostSizzlerFullMapV141.draw();
    const canvas=document.getElementById("ccg-solo-full-map-canvas"),ctx=canvas.getContext("2d"),cell=8;
    const pixel=q=>Array.from(ctx.getImageData(q.x*cell+Math.floor(cell/2),q.y*cell+Math.floor(cell/2),1,1).data);
    return{known:pixel(known),unknown:pixel(unknown)};
  });
  assert.notDeepEqual(exploredOnly.known.slice(0,3),[2,1,4],"an explored floor cell must be drawn on the enlarged map");
  assert.deepEqual(exploredOnly.unknown.slice(0,3),[2,1,4],"an unexplored floor cell must remain map-background dark");

  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyM",key:"m",repeat:true,bubbles:true,cancelable:true})));
  assert.equal(await page.evaluate(()=>window.CCGLostSizzlerFullMapV141.state.open),true,"a repeated/held M keydown must not close an open map");

  await page.keyboard.press("m");
  const closedByM=await page.evaluate(()=>({open:window.CCGLostSizzlerFullMapV141.state.open,mode}));
  assert.equal(closedByM.open,false,"M again must close the full map");
  assert.equal(closedByM.mode,"playing","closing by M must restore split play");

  await page.keyboard.press("m");
  assert.equal(await page.evaluate(()=>window.CCGLostSizzlerFullMapV141.state.open),true,"M must reopen the split full map");
  await page.keyboard.press("Escape");
  const closedByEscape=await page.evaluate(()=>({open:window.CCGLostSizzlerFullMapV141.state.open,mode}));
  assert.equal(closedByEscape.open,false,"Escape must close the full map");
  assert.equal(closedByEscape.mode,"playing","closing by Escape must restore split play");

  assert.deepEqual(errors,[],`split full-map browser scenario must not raise page errors: ${errors.join("\n")}`);
  await context.close();
  console.log("V10.41 split full-map browser contract passed");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
