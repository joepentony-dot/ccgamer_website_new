import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".wav":"audio/wav",".ogg":"audio/ogg"};
const sockets=new Set();

const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});

await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?r101-desktop-tutorial-mutation-stability=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerTutorialGuidanceV123));

  const audit=await page.evaluate(async()=>{
    document.body.dataset.tutorialActive="true";
    const api=window.CCGLostSizzlerTutorialGuidanceV123;
    const settle=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const fixture=document.createElement("div");
    fixture.className="command-grid";
    fixture.innerHTML="<span>WASD MOVE</span>";
    document.body.appendChild(fixture);

    api.highlightControls("move");
    await settle();
    let controlMutations=0;
    const controlObserver=new MutationObserver(records=>{controlMutations+=records.length});
    document.querySelectorAll(".ccg-tutorial-control-highlight").forEach(node=>controlObserver.observe(node,{attributes:true,attributeFilter:["class","style"]}));
    for(let i=0;i<12;i++){api.highlightControls("move");await new Promise(resolve=>setTimeout(resolve,20))}
    await settle();
    controlObserver.disconnect();

    api.highlightInformation(7);
    await settle();
    let infoMutations=0;
    const infoObserver=new MutationObserver(records=>{infoMutations+=records.length});
    document.querySelectorAll(".ccg-tutorial-info-highlight").forEach(node=>infoObserver.observe(node,{attributes:true,attributeFilter:["class","style","data-tutorial-callout"]}));
    for(let i=0;i<12;i++){api.highlightInformation(7);await new Promise(resolve=>setTimeout(resolve,20))}
    await settle();
    infoObserver.disconnect();

    return{
      controlMutations,
      infoMutations,
      controlCount:document.querySelectorAll(".ccg-tutorial-control-highlight").length,
      infoCount:document.querySelectorAll(".ccg-tutorial-info-highlight").length
    };
  });

  assert.ok(audit.controlCount>0,`desktop control highlight probe found no target: ${JSON.stringify(audit)}`);
  assert.ok(audit.infoCount>0,`desktop information highlight probe found no target: ${JSON.stringify(audit)}`);
  assert.equal(audit.controlMutations,0,`unchanged desktop control highlights must not be removed/re-added: ${JSON.stringify(audit)}`);
  assert.equal(audit.infoMutations,0,`unchanged desktop information highlights must not be rewritten: ${JSON.stringify(audit)}`);
  assert.deepEqual(errors,[],`R101 Tutorial mutation stability emitted page errors: ${errors.join("\n")}`);

  console.log("Dungeon Carnage R101 desktop Tutorial mutation-stability contract passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
