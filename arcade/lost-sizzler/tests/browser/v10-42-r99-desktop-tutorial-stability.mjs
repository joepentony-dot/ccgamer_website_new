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
  ".ogg":"audio/ogg"
};

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

  await page.goto(`${origin}/arcade/lost-sizzler/?r99-desktop-tutorial-stability=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerTutorialGuidanceV123)&&Boolean(window.CCGLostSizzlerV142TutorialCampaign));

  await page.evaluate(()=>{
    document.body.dataset.tutorialActive="true";
    const api=window.CCGLostSizzlerTutorialGuidanceV123;
    api.highlightInformation(7);
    api.showInformationTour(7);
  });
  await page.waitForFunction(()=>Boolean(document.getElementById("ccg-tutorial-info-tour"))&&!document.getElementById("ccg-tutorial-info-tour").classList.contains("hidden"));

  const audit=await page.evaluate(async()=>{
    const tour=document.getElementById("ccg-tutorial-info-tour");
    const highlighted=document.querySelector(".ccg-tutorial-info-highlight");
    const samples=[];
    const rect=()=>{
      const r=tour.getBoundingClientRect();
      return{left:r.left,top:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
    };
    samples.push(rect());
    for(let i=0;i<24;i++){
      const mission=document.getElementById("mission-text");
      const toast=document.getElementById("pickup-toast");
      const score=document.getElementById("hud-score");
      if(mission)mission.textContent=`TUTORIAL STABILITY SAMPLE ${i} — ${"X".repeat(i%9)}`;
      if(toast){
        const label=toast.querySelector("span");
        if(label)label.textContent=`Context update ${i} ${"detail ".repeat(i%5)}`;
      }
      if(score)score.textContent=String(i*137);
      window.CCGLostSizzlerV142TutorialCampaign?.patchAll?.();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      samples.push(rect());
    }
    const baseline=samples[0];
    const deltas=samples.map(sample=>({
      left:Math.abs(sample.left-baseline.left),
      top:Math.abs(sample.top-baseline.top),
      width:Math.abs(sample.width-baseline.width),
      height:Math.abs(sample.height-baseline.height),
      right:Math.abs(sample.right-baseline.right),
      bottom:Math.abs(sample.bottom-baseline.bottom)
    }));
    const max=key=>Math.max(...deltas.map(row=>row[key]));
    const highlightedStyle=highlighted?getComputedStyle(highlighted):null;
    const tourStyle=getComputedStyle(tour);
    return{
      samples:samples.length,
      maxDelta:{left:max("left"),top:max("top"),width:max("width"),height:max("height"),right:max("right"),bottom:max("bottom")},
      highlightedAnimation:highlightedStyle?.animationName||"",
      highlightedFilter:highlightedStyle?.filter||"",
      tourPosition:tourStyle.position,
      tourTransform:tourStyle.transform
    };
  });

  assert.equal(audit.samples,25,"desktop Tutorial stability probe must sample the live panel repeatedly");
  for(const [axis,value] of Object.entries(audit.maxDelta))assert.ok(value<1,`desktop Tutorial panel moved on ${axis} by ${value}px: ${JSON.stringify(audit)}`);
  assert.equal(audit.highlightedAnimation,"none",`desktop Tutorial highlights must not pulse or recompose: ${JSON.stringify(audit)}`);
  assert.equal(audit.highlightedFilter,"none",`desktop Tutorial highlights must not use animated brightness filters: ${JSON.stringify(audit)}`);
  assert.equal(audit.tourPosition,"fixed","desktop Tutorial information tour must remain viewport-fixed");
  assert.deepEqual(errors,[],`desktop Tutorial stability contract emitted page errors: ${errors.join("\n")}`);

  console.log("Dungeon Carnage R99 desktop Tutorial no-shake geometry contract passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
