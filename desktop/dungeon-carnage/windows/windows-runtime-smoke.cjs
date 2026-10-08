"use strict";
/*
 * Launch the real unpacked Windows EXE (never Chrome), verify its HTTP/OGG
 * serving, then restart the same app and verify browser-origin save storage.
 * Remote debugging is enabled ONLY in this GitHub Actions test invocation.
 */
const fs=require("node:fs");
const path=require("node:path");
const {spawn}=require("node:child_process");
const assert=require("node:assert/strict");
const {chromium}=require("playwright-core");

const exe=path.join(__dirname,"dist","win-unpacked","C64 Dungeon Carnage.exe");
const base="http://127.0.0.1:47731/";
const debug="http://127.0.0.1:47732";
const probeKey="ccg-windows-ci-save-probe";
const probeValue="save-survives-relaunch-v1";
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
if(process.platform!=="win32")throw Error("Windows runner required");
assert.ok(fs.existsSync(exe),"Missing unpacked Electron EXE");

async function waitForServer(child){
  for(let attempt=0;attempt<50;attempt++){
    if(child.exitCode!==null)throw Error("Game EXE exited before its local server started: "+child.exitCode);
    try{
      const response=await fetch(base+"index.html",{signal:AbortSignal.timeout(1000)});
      if(response.ok){
        assert.match(await response.text(),/C64 Dungeon Carnage/i);
        return;
      }
    }catch(error){if(error.name==="AssertionError")throw error}
    await pause(400);
  }
  throw Error("Actual Windows game EXE did not serve its game page");
}
async function connectGamePage(child){
  let browser=null;
  for(let attempt=0;attempt<35;attempt++){
    if(child.exitCode!==null)throw Error("Windows EXE exited before Playwright could connect");
    try{
      browser=await chromium.connectOverCDP(debug,{timeout:1800});
      const contexts=browser.contexts();
      const pages=contexts.flatMap(context=>context.pages());
      const game=pages.find(page=>page.url().startsWith(base));
      if(game)return {browser,page:game};
      await browser.close().catch(()=>{});
      browser=null;
    }catch(_){}
    await pause(400);
  }
  throw Error("Cannot connect to real Windows game Chromium session");
}
async function start(){
  const child=spawn(exe,["--remote-debugging-port=47732","--remote-allow-origins=*"],{
    cwd:path.dirname(exe),stdio:"ignore",windowsHide:false
  });
  let launchError=null;
  child.on("error",error=>{launchError=error});
  try{
    await waitForServer(child);
    if(launchError)throw launchError;
    const {browser,page}=await connectGamePage(child);
    return {child,browser,page};
  }catch(error){
    if(child.exitCode===null)child.kill();
    throw error
  }
}
async function stop(active){
  if(!active)return;
  try{await active.page.close({runBeforeUnload:false})}catch(_){}
  try{await active.browser.close()}catch(_){}
  for(let attempt=0;attempt<20&&active.child.exitCode===null;attempt++)await pause(150);
  // Only the child Electron EXE started by this test is terminated on timeout.
  if(active.child.exitCode===null)active.child.kill();
  for(let attempt=0;attempt<20&&active.child.exitCode===null;attempt++)await pause(150);
}
async function verifyAudioAndIsolation(){
  const response=await fetch(base+"assets/audio/voice/ccg-recorded-voices-r69.ogg",{
    headers:{Range:"bytes=0-63"},signal:AbortSignal.timeout(5000)
  });
  assert.equal(response.status,206,"Recorded audio sprite needs HTTP byte ranges");
  assert.match(response.headers.get("content-type")||"",/audio\/ogg/i);
  assert.equal((await response.arrayBuffer()).byteLength,64);
  const dotfile=await fetch(base+".env",{signal:AbortSignal.timeout(5000)});
  assert.equal(dotfile.status,404,"Hidden server files must be inaccessible");
}
async function main(){
  let run=null;
  try{
    run=await start();
    await verifyAudioAndIsolation();
    await run.page.evaluate(([key,value])=>localStorage.setItem(key,value),[probeKey,probeValue]);
    assert.equal(await run.page.evaluate(key=>localStorage.getItem(key),probeKey),probeValue);
    await stop(run);run=null;

    run=await start();
    assert.equal(await run.page.evaluate(key=>localStorage.getItem(key),probeKey),probeValue,
      "The actual Windows application must preserve saved progress across launches");
    await run.page.evaluate(key=>localStorage.removeItem(key),probeKey);
    console.log("WINDOWS EXE SMOKE PASS: real packaged game, OGG byte-range, hidden-file protection, persisted storage after EXE restart");
  }finally{await stop(run)}
}
main().catch(error=>{console.error(error);process.exitCode=1});
