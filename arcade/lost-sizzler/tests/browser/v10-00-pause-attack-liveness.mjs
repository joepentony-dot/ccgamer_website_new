import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  const context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142R18SoloPlaytestStability),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(p1)&&Boolean(host),null,{timeout:30000});

  await page.evaluate(()=>{
    host.enemies=[];enemyBullets.length=0;hazards.length=0;bullets.length=0;
    p1.firearmUnlocked=true;p1.weapon=baseWeapon();p1.mana=220;p1.maxMana=Math.max(p1.maxMana,220);
    fire1=0;fireBuffer1=0;projectileCD=0;
  });

  for(let i=0;i<12;i++){
    await page.keyboard.press("KeyP");
    await page.waitForFunction(()=>mode==="paused");
    if(i===11){
      await page.evaluate(()=>{
        fire1=1200;fireBuffer1=900;projectileCD=600;
        window.__CCG_PAUSE_TRACE__=[];
        const snap=phase=>window.__CCG_PAUSE_TRACE__.push({
          phase,mode:String(mode),fire1,fireBuffer1,projectileCD,
          resets:Number(window.__CCG_PAUSE_ATTACK_RESETS__||0),
          lastReset:window.__CCG_PAUSE_ATTACK_LAST_RESET__||null,
          diag:{...window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics}
        });
        const trace=event=>{
          if(event.code!=="KeyP")return;
          snap("test-capture");
          queueMicrotask(()=>snap("microtask"));
          setTimeout(()=>snap("timeout-0"),0);
          requestAnimationFrame(()=>snap("raf"));
        };
        window.addEventListener("keydown",trace,true);
        window.__CCG_PAUSE_TRACE_HANDLER__=trace;
        snap("injected-paused");
      });
    }
    await page.keyboard.press("KeyP");
    await page.waitForFunction(()=>mode==="playing");
  }

  await page.waitForFunction(()=>{
    const trace=window.__CCG_PAUSE_TRACE__||[];
    return trace.some(entry=>entry.phase==="timeout-0"&&entry.mode==="playing"&&entry.fire1===0&&entry.fireBuffer1===0&&entry.projectileCD===0);
  },null,{timeout:4000});
  const keyboardProbe=await page.evaluate(()=>({
    mode:String(mode),fire1,fireBuffer1,projectileCD,
    resets:Number(window.__CCG_PAUSE_ATTACK_RESETS__||0),
    lastReset:window.__CCG_PAUSE_ATTACK_LAST_RESET__||null,
    diag:{...window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics},
    trace:[...(window.__CCG_PAUSE_TRACE__||[])]
  }));
  console.log("PAUSE_ATTACK_TRACE",JSON.stringify(keyboardProbe));
  const injectedProbe=keyboardProbe.trace.find(entry=>entry.phase==="injected-paused");
  const clearedProbe=keyboardProbe.trace.find(entry=>entry.phase==="timeout-0"&&entry.mode==="playing"&&entry.fire1===0&&entry.fireBuffer1===0&&entry.projectileCD===0);
  assert.ok(injectedProbe&&clearedProbe,`finite stuck attack timers must be observed clearing at the repeated P-key resume boundary: ${JSON.stringify(keyboardProbe)}`);
  assert.ok(
    keyboardProbe.diag.pauseResumeAttackRepairs>Number(injectedProbe?.diag?.pauseResumeAttackRepairs||0)||keyboardProbe.resets>Number(injectedProbe?.resets||0),
    `at least one guarded pause-resume repair must run after the injected stale state: ${JSON.stringify(keyboardProbe)}`
  );
  const keyboardBefore=await page.evaluate(()=>({mana:p1.mana,diag:{...window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics}}));
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>p1.mana<before,keyboardBefore.mana,{timeout:4000});

  await page.keyboard.press("KeyP");
  await page.waitForFunction(()=>mode==="paused");
  const buttonBefore=await page.evaluate(()=>({
    resets:Number(window.__CCG_PAUSE_ATTACK_RESETS__||0),
    repairs:Number(window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics.pauseResumeAttackRepairs||0)
  }));
  await page.evaluate(()=>{fire1=850;fireBuffer1=650;projectileCD=400});
  await page.click("#resume-btn");
  await page.waitForFunction(before=>{
    if(mode!=="playing")return false;
    const resets=Number(window.__CCG_PAUSE_ATTACK_RESETS__||0);
    const repairs=Number(window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics.pauseResumeAttackRepairs||0);
    return resets>before.resets||repairs>before.repairs;
  },buttonBefore,{timeout:4000});
  const buttonProbe=await page.evaluate(()=>({fire1,fireBuffer1,projectileCD,mana:p1.mana,resets:Number(window.__CCG_PAUSE_ATTACK_RESETS__||0),diag:{...window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics}}));
  assert.ok(buttonProbe.resets>buttonBefore.resets||buttonProbe.diag.pauseResumeAttackRepairs>buttonBefore.repairs,`Continue-button resume must trigger guarded attack-state repair: ${JSON.stringify({buttonBefore,buttonProbe})}`);
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>p1.mana<before,buttonProbe.mana,{timeout:4000});

  const finalState=await page.evaluate(()=>({mode,runActive:document.body.dataset.runActive,mana:p1.mana,diag:{...window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics}}));
  assert.equal(finalState.mode,"playing");
  assert.equal(finalState.runActive,"true");
  assert.ok(finalState.mana<keyboardBefore.mana,"attacks must remain live after keyboard and Continue-button pause/resume paths");
  assert.deepEqual(errors,[],`pause attack-liveness regression produced page errors: ${JSON.stringify(errors,null,2)}`);
  console.log("Repeated pause/resume attack liveness browser regression passed");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
