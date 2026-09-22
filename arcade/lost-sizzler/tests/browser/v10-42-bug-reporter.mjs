import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
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
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  const page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[],failedScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?bugreport=1&bug-reporter-contract=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerV142Bootstrap?.ready===true&&window.CCGLostSizzlerBugReporter?.state?.installed===true);
  await page.waitForFunction(()=>{const b=document.getElementById("ccg-bug-report-btn");return Boolean(b&&!b.hidden&&b.getClientRects().length)});

  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1),null,{timeout:20000});
  await page.evaluate(()=>{p1.firearmUnlocked=true;p1.mana=Math.max(20,p1.mana||0);fire1=0;fireBuffer1=0;input.delete("Space")});

  await page.keyboard.press("Tab");
  await page.waitForFunction(()=>mode==="inventory"&&!document.getElementById("inventory-panel")?.classList.contains("hidden"));
  await page.keyboard.press("Tab");
  await page.waitForFunction(()=>mode==="playing"&&document.getElementById("inventory-panel")?.classList.contains("hidden"));

  const manaBefore=await page.evaluate(()=>Number(p1.mana));
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>Number(p1.mana)<before||Number(fire1)>0||Number(fireBuffer1)>0,manaBefore,{timeout:3000});
  await page.waitForTimeout(750);

  const report=await page.evaluate(()=>window.CCGLostSizzlerBugReporter.createReport("browser-contract"));
  assert.equal(report.schema,"CCG-DUNGEON-BUG-REPORT-v1");
  assert.equal(report.summary.game.mode,"playing");
  assert.equal(report.summary.panels.inventory.hidden,true,"report must show that inventory returned to gameplay");
  assert.ok(report.recentEvents.some(event=>event.type==="keydown"&&event.detail?.code==="Tab"),"report must retain inventory key activity");
  assert.ok(report.recentEvents.some(event=>event.type==="keydown"&&event.detail?.code==="Space"),"report must retain attack key activity");
  assert.ok(report.recentEvents.some(event=>event.type==="fire-probe"),"report must retain post-attack liveness evidence");

  await page.click("#ccg-bug-report-btn");
  await page.waitForFunction(()=>document.getElementById("ccg-bug-report-modal")?.open===true);
  const text=await page.locator("#ccg-bug-report-text").inputValue();
  assert.match(text,/CCG DUNGEON CARNAGE BUG REPORT/);
  assert.match(text,/Fire state:/);
  assert.match(text,/Inventory hidden: true/);
  await page.click('[data-bug-close]');

  assert.deepEqual(errors,[],`incident reporter browser contract must not produce page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`incident reporter must not lose same-origin scripts: ${failedScripts.join("\n")}`);
  console.log("Dungeon Carnage incident reporter Solo/inventory/fire browser contract passed.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
