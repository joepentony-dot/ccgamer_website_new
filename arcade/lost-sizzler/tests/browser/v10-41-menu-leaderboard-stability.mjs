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
  await page.waitForSelector("#ccg-weekly-board-wrap");

  const initial=await page.evaluate(()=>{
    const weekly=document.getElementById("ccg-weekly-board-wrap");
    const section=document.getElementById("weekly-vault");
    return{
      weeklyTag:weekly?.tagName||"",
      weeklyOpen:Boolean(weekly?.open),
      sectionTag:section?.tagName||"",
      hordeBoard:Boolean(document.getElementById("horde-leaderboard")),
      hordeCategories:document.querySelectorAll("[data-horde-category]").length,
      hordeButton:Boolean(document.getElementById("horde-mode-btn"))
    }
  });
  assert.equal(initial.weeklyTag,"DETAILS","Weekly Vault must be collapsed behind an explicit viewer control");
  assert.equal(initial.weeklyOpen,false,"Weekly Vault must start closed to reduce menu clutter");
  assert.equal(initial.sectionTag,"SECTION","the existing Weekly Vault section must remain available inside the wrapper");
  assert.equal(initial.hordeBoard,false,"Horde Survivor local leaderboard must be retired from the menu");
  assert.equal(initial.hordeCategories,0,"retired Horde leaderboard category tabs must not be mounted");
  assert.equal(initial.hordeButton,true,"Horde Survivor mode itself must remain available");

  const weekly=page.locator("#ccg-weekly-board-wrap");
  for(let cycle=0;cycle<25;cycle++){
    await weekly.locator(":scope > summary").click();
    assert.equal(await weekly.getAttribute("open"),"","Weekly Vault must open on demand");
    await weekly.locator(":scope > summary").click();
    assert.equal(await weekly.getAttribute("open"),null,"Weekly Vault must close again without destabilising the menu");
  }

  await page.waitForTimeout(250);
  const responsive=await page.evaluate(()=>({
    title:document.title,
    bodyReady:document.body.dataset.releaseReady,
    hordeBoard:Boolean(document.getElementById("horde-leaderboard")),
    weeklyOpen:Boolean(document.getElementById("ccg-weekly-board-wrap")?.open),
    menuVisible:getComputedStyle(document.getElementById("menu")).display!=="none"
  }));

  assert.equal(crashed,false,"Repeated Weekly Vault disclosure switching must not crash the browser page");
  assert.equal(responsive.bodyReady,"true","page must remain responsive after repeated menu interactions");
  assert.equal(responsive.hordeBoard,false,"Horde leaderboard must remain absent after late scripts settle");
  assert.equal(responsive.weeklyOpen,false,"Weekly Vault must finish in its compact closed state");
  assert.equal(responsive.menuVisible,true,"current Dungeon Carnage menu must remain visible and responsive");
  assert.deepEqual(errors,[],`Unified menu interactions must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("C64 Dungeon Carnage unified menu and retired Horde leaderboard stability passed in Chromium.");
  await context.close()
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()))
}
