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
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&Boolean(window.CCGLostSizzlerV141R46ReleaseCandidatePolish)&&Boolean(window.CCGLostSizzlerV141R52AudioAccessibility)&&Boolean(window.CCGSound?.setSfxLevel)&&Boolean(window.CCGLostSizzlerVoice?.state));

  const defaults=await page.evaluate(()=>({prefs:window.CCGLostSizzlerV141R52AudioAccessibility.prefs(),sfx:window.CCGLostSizzlerV141R52AudioAccessibility.getSfxLevel(),voice:window.CCGLostSizzlerV141R52AudioAccessibility.getVoiceLevel()}));
  assert.equal(defaults.prefs.sfxPercent,100);
  assert.equal(defaults.prefs.voicePercent,100);
  assert.equal(defaults.sfx,1);
  assert.equal(defaults.voice,1);

  await page.evaluate(()=>window.CCGLostSizzlerV141R46ReleaseCandidatePolish.openOptions());
  await page.waitForFunction(()=>Boolean(document.querySelector('[data-r52-audio="sfxPercent"] input'))&&Boolean(document.querySelector('[data-r52-audio="voicePercent"] input')));
  const labels=await page.evaluate(()=>({sfx:document.querySelector('[data-r52-audio="sfxPercent"]')?.textContent||"",voice:document.querySelector('[data-r52-audio="voicePercent"]')?.textContent||""}));
  assert.match(labels.sfx,/SFX LEVEL/);
  assert.match(labels.voice,/VOICE LEVEL/);

  await page.locator('[data-r52-audio="sfxPercent"] input').evaluate(el=>{el.value="35";el.dispatchEvent(new Event("input",{bubbles:true}))});
  await page.locator('[data-r52-audio="voicePercent"] input').evaluate(el=>{el.value="45";el.dispatchEvent(new Event("input",{bubbles:true}))});
  const applied=await page.evaluate(()=>({prefs:window.CCGLostSizzlerV141R52AudioAccessibility.prefs(),sfx:window.CCGLostSizzlerV141R52AudioAccessibility.getSfxLevel(),voice:window.CCGLostSizzlerV141R52AudioAccessibility.getVoiceLevel(),sfxText:document.getElementById("ccg-r52-sfx-value")?.textContent,voiceText:document.getElementById("ccg-r52-voice-value")?.textContent}));
  assert.equal(applied.prefs.sfxPercent,35);
  assert.equal(applied.prefs.voicePercent,45);
  assert.equal(applied.sfx,.35);
  assert.equal(applied.voice,.45);
  assert.equal(applied.sfxText,"35%");
  assert.equal(applied.voiceText,"45%");

  const voiceScaling=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R52AudioAccessibility,voice=window.CCGLostSizzlerVoice;
    const previous=voice.state.active;
    const fallbackAudio={volume:1};voice.state.active={key:"hurt",audio:fallbackAudio,dungeonFx:null};api.setVoiceLevel(.5);const fallback=fallbackAudio.volume;
    const fxAudio={volume:1};voice.state.active={key:"gameOver",audio:fxAudio,dungeonFx:{}};api.setVoiceLevel(.4);const fx=fxAudio.volume;
    const speech={volume:1};voice.state.active={key:"gameOver",speech};api.setVoiceLevel(.25);const spoken=speech.volume;
    voice.state.active=previous;api.setVoiceLevel(.45);
    return{fallback,fx,spoken};
  });
  assert.equal(voiceScaling.fallback,.28);
  assert.equal(voiceScaling.fx,.4);
  assert.equal(voiceScaling.spoken,.18);

  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem(window.CCGLostSizzlerV141R46ReleaseCandidatePolish.PREFS_KEY)||"{}"));
  assert.equal(persisted.sfxPercent,35);
  assert.equal(persisted.voicePercent,45);
  assert.deepEqual(errors,[],`r52 browser test must not raise page errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r52 SFX/voice sliders, persistence and active voice scaling passed in Chromium.");
  await context.close();
}finally{
  await browser.close().catch(()=>{});for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}