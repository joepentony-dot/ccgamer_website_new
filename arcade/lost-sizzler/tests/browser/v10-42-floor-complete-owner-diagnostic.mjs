import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking"]});
try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  await page.goto(`${origin}/arcade/lost-sizzler/?v142-floor-complete-owner-diagnostic=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(run)&&Boolean(window.floorComplete),null,{timeout:20000});
  const diagnostic=await page.evaluate(()=>{
    const describe=fn=>{
      const links={};
      for(const key of Object.getOwnPropertyNames(fn||{})){
        let value;try{value=fn[key]}catch(_){continue}
        if(typeof value==="function"&&value!==fn)links[key]=value.name||"anonymous";
      }
      return{name:fn?.name||"",links,source:typeof fn==="function"?String(fn):""};
    };
    const chain=[],seen=new Set();let cursor=window.floorComplete;
    while(typeof cursor==="function"&&!seen.has(cursor)&&chain.length<20){
      seen.add(cursor);chain.push(describe(cursor));
      let next=null;
      for(const key of Object.getOwnPropertyNames(cursor)){
        let value;try{value=cursor[key]}catch(_){continue}
        if(typeof value==="function"&&value!==cursor&&!seen.has(value)){next=value;break}
      }
      cursor=next;
    }
    return{mode:String(mode),floorComplete:Boolean(run.floorComplete),chain};
  });
  console.log(`FLOOR_COMPLETE_OWNER_DIAGNOSTIC ${JSON.stringify(diagnostic)}`);
  assert.equal(diagnostic.mode,"playing");
  assert.equal(diagnostic.floorComplete,false);
  assert.ok(diagnostic.chain.length>=1);
  await context.close();
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  for(const socket of sockets)socket.destroy();
}
