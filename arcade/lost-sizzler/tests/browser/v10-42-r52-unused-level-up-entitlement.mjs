import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg",".wav":"audio/wav"};
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
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  const page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?unused-level-up=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGProgression)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(run)&&Boolean(p1),null,{timeout:20000});

  const opened=await page.evaluate(()=>{
    p1.level=Math.max(2,Number(p1.level)||1);
    p1.pendingLevels=1;
    const skillsBefore=(p1.skills||[]).length;
    const queued=queueLevelChoice(p1);
    sync();
    return{queued,mode,pending:p1.pendingLevels,skillsBefore,copy:UI.levelCopy?.textContent||""};
  });
  assert.equal(opened.queued,true,"a stored entitlement must enter the choice queue");
  assert.equal(opened.mode,"levelup","a newly surfaced entitlement must open the level-up panel");
  assert.equal(opened.pending,1,"opening the panel must not consume the entitlement");
  assert.match(opened.copy,/unused level-up/i,"the panel must describe the stored entitlement");

  await page.locator("#level-up").click({position:{x:4,y:4}});
  await page.waitForFunction(()=>mode==="playing"&&document.getElementById("level-up").classList.contains("hidden"));
  const deferred=await page.evaluate(()=>({
    pending:p1.pendingLevels,
    skills:(p1.skills||[]).length,
    buttonHidden:document.getElementById("quick-level-up")?.classList.contains("hidden"),
    buttonText:document.getElementById("quick-level-up")?.textContent||""
  }));
  assert.equal(deferred.pending,1,"clicking away from the level-up panel must retain the unused entitlement");
  assert.equal(deferred.skills,opened.skillsBefore,"deferring must not silently apply or remove a skill");
  assert.equal(deferred.buttonHidden,false,"the XP panel must expose the stored level-up");
  assert.equal(deferred.buttonText,"LEVEL-UP AVAILABLE","one stored entitlement must have a singular HUD label");

  await page.click("#quick-level-up");
  await page.waitForFunction(()=>mode==="levelup"&&!document.getElementById("level-up").classList.contains("hidden"));
  await page.locator("#level-up-choices button").first().click();
  await page.waitForFunction(()=>mode==="playing"&&p1.pendingLevels===0);
  const spent=await page.evaluate(()=>({
    pending:p1.pendingLevels,
    skills:(p1.skills||[]).length,
    buttonHidden:document.getElementById("quick-level-up")?.classList.contains("hidden")
  }));
  assert.equal(spent.pending,0,"choosing an upgrade must consume exactly one stored entitlement");
  assert.equal(spent.skills,opened.skillsBefore+1,"choosing the stored entitlement must add exactly one skill");
  assert.equal(spent.buttonHidden,true,"the HUD reminder must disappear when no entitlement remains");

  await page.evaluate(()=>{p1.pendingLevels=2;queueLevelChoice(p1);sync()});
  await page.waitForFunction(()=>mode==="levelup"&&p1.pendingLevels===2);
  await page.locator("#level-up-choices button").first().click();
  await page.waitForFunction(()=>mode==="levelup"&&p1.pendingLevels===1,null,{timeout:5000});
  const multi=await page.evaluate(()=>({pending:p1.pendingLevels,copy:UI.levelCopy?.textContent||""}));
  assert.equal(multi.pending,1,"spending one of two earned levels must leave one entitlement");
  assert.match(multi.copy,/unused level-up/i,"the remaining entitlement must immediately remain selectable");
  await page.click("#level-up-later");
  await page.waitForFunction(()=>mode==="playing"&&p1.pendingLevels===1);
  const multiDeferred=await page.evaluate(()=>({
    pending:p1.pendingLevels,
    buttonText:document.getElementById("quick-level-up")?.textContent||"",
    hidden:document.getElementById("quick-level-up")?.classList.contains("hidden")
  }));
  assert.equal(multiDeferred.hidden,false,"Choose Later must expose the remaining entitlement in the HUD");
  assert.equal(multiDeferred.buttonText,"LEVEL-UP AVAILABLE");

  const death=await page.evaluate(()=>{
    const skillsBefore=(p1.skills||[]).length;
    p1.level=Math.max(3,Number(p1.level)||3);
    p1.xp=0;p1.totalXp=10000;p1.pendingLevels=1;
    const result=window.CCGProgression.applyDeathPenalty(p1,1000,run);
    sync();
    return{result,pending:p1.pendingLevels,skillsBefore,skillsAfter:(p1.skills||[]).length};
  });
  assert.equal(death.result.levelLost,true,"death edge-case setup must lose one level");
  assert.equal(death.result.lostSkill,"Unused level-up","an unspent entitlement must absorb the lost level before an older skill");
  assert.equal(death.pending,0,"the lost unspent level must no longer remain claimable");
  assert.equal(death.skillsAfter,death.skillsBefore,"losing an unspent level must preserve already selected upgrades");

  const checkpoint=await page.evaluate(()=>{
    p1.pendingLevels=2;
    const data=window.CCGProgression.makeCheckpoint(run,p1,null,score,"solo");
    p1.pendingLevels=0;sync();
    return{pending:data?.player?.pendingLevels,version:data?.version};
  });
  assert.equal(checkpoint.pending,2,"checkpoint cloning must retain unused level-up entitlements");

  assert.deepEqual(errors,[],`unused level-up qualification must not raise page errors: ${errors.join("\n")}`);
  console.log("V10.42 R52 unused level-up browser qualification passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
