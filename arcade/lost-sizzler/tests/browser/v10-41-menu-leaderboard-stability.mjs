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
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".webp":"image/webp",
  ".png":"image/png",
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
      if(error){res.writeHead(404).end("not found");return}
      res.setHeader("content-type",mime[path.extname(file).toLowerCase()]||"application/octet-stream");
      res.setHeader("cache-control","no-store");
      res.setHeader("connection","close");
      res.end(data)
    })
  }catch(error){res.writeHead(500).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});

await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  page.setDefaultTimeout(20000);
  const errors=[];
  let crashed=false;
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("crash",()=>{crashed=true});

  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
  await page.waitForSelector("#horde-leaderboard [data-horde-category]");

  const weekly=await page.evaluate(()=>{
    const section=document.getElementById("weekly-vault");
    const style=section?getComputedStyle(section):null;
    return{
      tag:section?.tagName||"",
      maxHeight:style?.maxHeight||"",
      overflowY:style?.overflowY||"",
      contain:style?.contain||""
    }
  });
  assert.equal(weekly.tag,"SECTION","Weekly leaderboard must not remain a native expandable DETAILS element");
  assert.notEqual(weekly.maxHeight,"none","Weekly leaderboard must remain height bounded");
  assert.ok(["auto","scroll"].includes(weekly.overflowY),`Weekly leaderboard should scroll internally, got ${weekly.overflowY}`);
  assert.match(weekly.contain,/layout/,"Weekly leaderboard should contain its layout changes");

  const categories=["SOLO","DUO","TRIO","SQUAD"];
  for(let cycle=0;cycle<25;cycle++){
    for(const category of categories){
      await page.locator(`[data-horde-category="${category}"]`).click();
      const active=await page.locator(`[data-horde-category="${category}"]`).getAttribute("aria-pressed");
      assert.equal(active,"true",`${category} Horde leaderboard tab must become active`);
    }
  }

  await page.waitForTimeout(250);
  const responsive=await page.evaluate(()=>({
    title:document.title,
    categories:[...document.querySelectorAll("[data-horde-category]")].map(button=>({category:button.dataset.hordeCategory,pressed:button.getAttribute("aria-pressed")})),
    bodyReady:document.body.dataset.releaseReady
  }));

  assert.equal(crashed,false,"Repeated Horde leaderboard tab switching must not crash the browser page");
  assert.equal(responsive.bodyReady,"true","page must remain responsive after repeated leaderboard interactions");
  assert.equal(responsive.categories.find(row=>row.category==="SQUAD")?.pressed,"true","final Horde category must remain selectable after repeated switching");
  assert.deepEqual(errors,[],`Leaderboard menu interactions must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("Lost Sizzler V10.41 menu leaderboard stability passed in Chromium.");
  await context.close()
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()))
}
