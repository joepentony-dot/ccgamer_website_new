import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?pathname+"index.html":pathname,file=path.resolve(repo,"."+relative);
    if(!file.startsWith(repo+path.sep)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true")}catch(_){}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(origin+"/arcade/lost-sizzler/?r68-solid-furniture=1",{waitUntil:"load"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&document.body.dataset.v142BootstrapReady==="true");
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&String(mode)==="playing"&&Boolean(world&&host&&p1&&W));

  const result=await page.evaluate(()=>globalThis.eval(`(()=>{
    const allowedPassable=new Set(["cable","pipe","lightBar","candleSconce"]);
    const decor=(world.decor||[]).map(d=>{
      const blocker=(host.blockingDecor||[]).find(b=>b.id===d.id)||null;
      return{
        id:String(d.id||""),type:String(d.type||""),blocking:Boolean(d.blocking),structural:Boolean(d.structural),
        hasBlocker:Boolean(blocker),walkable:Boolean(W.walkable(world.map,d.x,d.y,host)),x:Number(d.x),y:Number(d.y)
      };
    });
    return{
      total:decor.length,
      blocking:decor.filter(d=>d.blocking),
      invalidPassable:decor.filter(d=>!d.blocking&&!allowedPassable.has(d.type)),
      invalidSolid:decor.filter(d=>d.blocking&&(!d.hasBlocker||d.walkable))
    };
  })()`));

  assert.ok(result.total>0,"generated Solo floor must contain furniture for the R68 collision contract");
  assert.ok(result.blocking.length>0,"generated Solo floor must contain at least one solid furniture object");
  assert.deepEqual(result.invalidPassable,[],"only lightweight detail props may be passable: "+JSON.stringify(result.invalidPassable));
  assert.deepEqual(result.invalidSolid,[],"every visible solid furniture item must own a blocking cell: "+JSON.stringify(result.invalidSolid));
  assert.deepEqual(errors,[],"R68 solid-furniture browser contract must not raise page errors: "+errors.join("\n"));
  console.log("C64 Dungeon Carnage R68 solid furniture collision contract passed:",JSON.stringify({total:result.total,blocking:result.blocking.length}));
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
