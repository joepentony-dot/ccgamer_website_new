import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg"};
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
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();
  await page.goto(`${origin}/arcade/lost-sizzler/?r95-loader-geometry=1`,{waitUntil:"load"});
  const result=await page.evaluate(()=>{
    const loader=document.getElementById("ccg-release-loading"),card=loader?.querySelector(".ccg-release-loading-card"),frame=document.querySelector(".ccg-release-loading-status-frame"),status=document.getElementById("ccg-release-loading-status");
    if(!loader||!card||!frame||!status)return null;
    const old={display:loader.style.display,visibility:loader.style.visibility};
    loader.style.display="grid";loader.style.visibility="hidden";
    const rect=node=>{const r=node.getBoundingClientRect();return{width:r.width,height:r.height}};
    const sample=text=>{status.textContent=text;void status.offsetHeight;return{card:rect(card),frame:rect(frame),status:rect(status)}};
    const short=sample("Loading combat systems…");
    const long=sample("Loading authored dungeon environment presentation and mobile gameplay control systems… 37 / 48 systems ready.");
    const structure={
      art:Boolean(loader.querySelector(".ccg-release-loading-art-frame .ccg-release-loading-art")),
      console:Boolean(loader.querySelector(".ccg-release-loading-console")),
      progress:Boolean(document.getElementById("ccg-release-loading-progress")),
      stages:loader.querySelectorAll(".ccg-release-loading-stages [data-loader-threshold]").length
    };
    loader.style.display=old.display;loader.style.visibility=old.visibility;
    return{short,long,structure};
  });
  assert.ok(result,"R95 loader structure must exist");
  assert.equal(result.structure.art,true,"upgraded loader must retain dungeon artwork");
  assert.equal(result.structure.console,true,"upgraded loader must retain the RPG loading console");
  assert.equal(result.structure.progress,true,"upgraded loader must expose progress");
  assert.equal(result.structure.stages,4,"upgraded loader must expose CACHE/CORE/DUNGEON/FINALISE stages");
  assert.ok(Math.abs(result.short.card.height-result.long.card.height)<=1,`loader card must not bounce between one and two status lines: ${JSON.stringify(result)}`);
  assert.ok(Math.abs(result.short.frame.height-result.long.frame.height)<=1,"loader status frame height must remain fixed");
  assert.ok(Math.abs(result.short.status.height-result.long.status.height)<=1,"loader status text box height must remain fixed");
  console.log("Dungeon Carnage R95 fixed-geometry upgraded loader passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
