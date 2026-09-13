import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".wav":"audio/wav",".ogg":"audio/ogg",".m4a":"audio/mp4"};
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
      res.end(data);
    });
  }catch(error){res.writeHead(500).end(String(error));}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket));});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking"]});
try{
  const context=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const page=await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142R19MobileTrapLayoutStability));
  await page.waitForLoadState("load");
  await page.waitForFunction(()=>document.body.classList.contains("v104-touch-device")&&Boolean(document.getElementById("v104-touch-controls")));
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true");
  await page.waitForFunction(()=>document.getElementById("menu")?.classList.contains("hidden")===true);
  await page.waitForTimeout(350);
  const diagnostic=await page.evaluate(()=>{
    const snap=element=>{
      if(!element)return null;
      const r=element.getBoundingClientRect(),s=getComputedStyle(element);
      return{tag:element.tagName,id:element.id||"",className:String(element.className||""),rect:{x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,right:r.right,bottom:r.bottom,left:r.left},display:s.display,visibility:s.visibility,opacity:s.opacity,position:s.position,height:s.height,minHeight:s.minHeight,maxHeight:s.maxHeight,width:s.width,minWidth:s.minWidth,maxWidth:s.maxWidth,gridRow:s.gridRow,gridColumn:s.gridColumn,gridTemplateRows:s.gridTemplateRows,gridTemplateColumns:s.gridTemplateColumns,overflow:s.overflow};
    };
    const shell=document.querySelector(".ccg-game"),area=document.querySelector(".ccg-game>.game-area"),wrap=document.querySelector(".canvas-wrap"),hub=document.querySelector(".ccg-game>.player-hub"),touch=document.getElementById("v104-touch-controls"),pad=touch?.querySelector(".v104-touch-pad");
    return{
      readyState:document.readyState,
      viewport:{width:innerWidth,height:innerHeight},
      maxTouchPoints:navigator.maxTouchPoints,
      coarse:matchMedia("(pointer: coarse)").matches,
      portrait:matchMedia("(orientation: portrait)").matches,
      touchClass:document.body.classList.contains("v104-touch-device"),
      runActive:document.body.dataset.runActive,
      menuHidden:document.getElementById("menu")?.classList.contains("hidden")===true,
      shell:snap(shell),area:snap(area),wrap:snap(wrap),hub:snap(hub),touch:snap(touch),pad:snap(pad),
      buttons:[...document.querySelectorAll("#v104-touch-controls .v104-touch-pad .v104-touch-btn")].map(snap),
      children:[...shell.children].map(snap),
      r19Style:Boolean(document.getElementById("ccg-v142-r19-mobile-trap-layout")),
      r19State:{...(window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state||{})}
    };
  });
  console.log(`MOBILE_GEOMETRY_DIAGNOSTIC ${JSON.stringify(diagnostic)}`);
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
