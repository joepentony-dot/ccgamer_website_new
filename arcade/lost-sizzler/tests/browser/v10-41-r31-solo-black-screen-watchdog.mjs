import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R31SoloDungeon)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&window.CCGLostSizzlerModeRuntime?.detect?.()==="dungeon-solo"&&typeof mode!=="undefined"&&mode==="playing"&&Boolean(p1));
  await page.waitForFunction(()=>Boolean(window.endRun?.__ccgV141R31SoloEndSafety));

  const firstDeath=await page.evaluate(()=>{
    run.everEarnedXp=true;run.xpZeroDeaths=0;run.xpZeroDeathsByPlayer={};p1.totalXp=10;p1.xp=10;p1.health=1;p1.invuln=0;
    hurtPlayer(p1,1,false,"browser zero-XP regression");
    const strikes=Number(run.xpZeroDeathsByPlayer?.[String(p1.id)]||run.xpZeroDeaths||0);
    return{mode:String(mode),health:Number(p1.health),maxHealth:Number(p1.maxHealth),xpGameOver:Boolean(run.xpGameOver),strikes,endHidden:document.getElementById("end")?.classList.contains("hidden")};
  });
  assert.equal(firstDeath.mode,"playing","the first zero-XP death must respawn instead of ending Solo Dungeon");
  assert.equal(firstDeath.health,firstDeath.maxHealth,"normal Solo death must restore health immediately");
  assert.equal(firstDeath.xpGameOver,false,"the first zero-XP death is only the final warning");
  assert.equal(firstDeath.strikes,1,"the first zero-XP death must record one strike");
  assert.equal(firstDeath.endHidden,true,"normal respawn must not open the GAME OVER panel");

  const before=await page.evaluate(()=>({errors:Number(window.CCGLostSizzlerV141R31SoloDungeon.state.endRunErrors||0),repairs:Number(window.CCGLostSizzlerV141R31SoloDungeon.state.terminalEndRepairs||0)}));
  const terminal=await page.evaluate(()=>{
    const originalPersistent=CCGProgression.persistentCollection;
    p1.totalXp=10;p1.xp=10;p1.health=1;p1.invuln=0;
    CCGProgression.persistentCollection=function forcedEndUiFailure(){throw new Error("forced result-panel dependency failure")};
    try{hurtPlayer(p1,1,false,"browser terminal zero-XP regression")}finally{CCGProgression.persistentCollection=originalPersistent}
    const end=document.getElementById("end"),title=document.getElementById("end-title"),text=document.getElementById("end-text"),style=end?getComputedStyle(end):null;
    return{
      mode:String(mode),health:Number(p1.health),xpGameOver:Boolean(run.xpGameOver),hidden:Boolean(end?.classList.contains("hidden")),display:String(style?.display||""),visibility:String(style?.visibility||""),opacity:String(style?.opacity||""),title:String(title?.textContent||""),text:String(text?.textContent||""),
      errors:Number(window.CCGLostSizzlerV141R31SoloDungeon.state.endRunErrors||0),repairs:Number(window.CCGLostSizzlerV141R31SoloDungeon.state.terminalEndRepairs||0)
    };
  });

  assert.equal(terminal.mode,"ended","the second zero-XP death must end the Solo run");
  assert.equal(terminal.health,0,"terminal XP game-over retains zero health");
  assert.equal(terminal.xpGameOver,true,"the second zero-XP death must set the terminal XP flag");
  assert.equal(terminal.hidden,false,"terminal Solo death must never leave the result overlay hidden");
  assert.equal(terminal.display,"grid","the recovered GAME OVER overlay must be visibly laid out");
  assert.notEqual(terminal.visibility,"hidden","the recovered GAME OVER overlay must remain visible");
  assert.notEqual(terminal.opacity,"0","the recovered GAME OVER overlay must not be transparent");
  assert.match(terminal.title,/GAME OVER.*XP DEPLETED/i,"terminal Solo death must explain why the run ended");
  assert.match(terminal.text,/FINAL SCORE|zero-XP|XP reserve/i,"fallback result copy must replace an unexplained black screen");
  assert.ok(terminal.errors>before.errors,"the regression fixture must prove the end-run dependency fault was intercepted");
  assert.ok(terminal.repairs>before.repairs,"the Solo owner must repair terminal presentation after the intercepted fault");
  assert.deepEqual(errors,[],`Solo terminal-death presentation regression must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("Lost Sizzler Solo first-death respawn and terminal zero-XP GAME OVER presentation recovery passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
