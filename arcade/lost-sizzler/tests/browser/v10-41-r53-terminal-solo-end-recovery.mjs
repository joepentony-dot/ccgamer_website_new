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
const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)})}catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);const pageErrors=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&Boolean(window.CCGLostSizzlerV141R53TerminalSoloEndRecovery));
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof run!=="undefined"&&Boolean(run)&&typeof p1!=="undefined"&&Boolean(p1));

  const thrownRecovery=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R53TerminalSoloEndRecovery,end=document.getElementById("end"),text=document.getElementById("end-text");
    run.xpGameOver=true;run.daily=false;playMode="solo";p2=null;document.body.dataset.specialMode="";end.classList.add("hidden");text.innerHTML="";
    const before=api.state.recoveredThrows;
    window.endRun=function syntheticLateTerminalFailure(){throw new Error("synthetic terminal presentation failure")};
    api.install();
    let escaped=false;try{window.endRun("Terminal <result> > test")}catch(_){escaped=true}
    return{escaped,visible:!end.classList.contains("hidden"),title:document.getElementById("end-title")?.textContent||"",body:text.innerHTML,bodyText:text.textContent||"",delta:api.state.recoveredThrows-before,lastError:api.state.lastError,runActive:document.body.dataset.runActive}
  });
  assert.equal(thrownRecovery.escaped,false,"terminal Solo presentation failure must be recovered");
  assert.equal(thrownRecovery.visible,true,"terminal Solo fallback must expose the result overlay");
  assert.equal(thrownRecovery.title,"GAME OVER — XP DEPLETED");
  assert.match(thrownRecovery.body,/&lt;result&gt; &gt; test/,"fallback reason must be HTML escaped");
  assert.match(thrownRecovery.bodyText,/FINAL SCORE/);
  assert.ok(thrownRecovery.delta>=1,"recovered throw must be recorded");
  assert.match(thrownRecovery.lastError,/synthetic terminal presentation failure/);
  assert.equal(thrownRecovery.runActive,"false");

  const hiddenRecovery=await page.evaluate(async()=>{
    const api=window.CCGLostSizzlerV141R53TerminalSoloEndRecovery,end=document.getElementById("end"),text=document.getElementById("end-text");
    run.xpGameOver=true;run.daily=false;playMode="solo";p2=null;document.body.dataset.specialMode="";end.classList.add("hidden");text.innerHTML="";
    const before=api.state.recoveredHidden;
    window.endRun=function syntheticSilentTerminalEnd(){return "silent"};api.install();const result=window.endRun("Silent terminal result");await Promise.resolve();
    return{result,visible:!end.classList.contains("hidden"),title:document.getElementById("end-title")?.textContent||"",delta:api.state.recoveredHidden-before}
  });
  assert.equal(hiddenRecovery.result,"silent","R53 must preserve a successful end chain return value");
  assert.equal(hiddenRecovery.visible,true,"silently hidden terminal result must be recovered");
  assert.equal(hiddenRecovery.title,"GAME OVER — XP DEPLETED");
  assert.ok(hiddenRecovery.delta>=1,"hidden-overlay recovery must be recorded");

  const nonTerminal=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R53TerminalSoloEndRecovery;
    run.xpGameOver=false;run.daily=false;playMode="solo";p2=null;document.body.dataset.specialMode="";
    window.endRun=function syntheticNonTerminalFailure(){throw new Error("non-terminal failure must escape")};api.install();
    try{window.endRun("ordinary extraction");return{threw:false,message:""}}catch(error){return{threw:true,message:String(error?.message||error)}}
  });
  assert.equal(nonTerminal.threw,true,"R53 must not swallow unrelated endRun failures");
  assert.match(nonTerminal.message,/non-terminal failure must escape/);
  assert.deepEqual(pageErrors,[],`r53 browser test must not raise uncaught page errors: ${pageErrors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r53 terminal Solo throw/hidden recovery and non-terminal isolation passed in Chromium.");
  await context.close();
}finally{
  await browser.close().catch(()=>{});for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
