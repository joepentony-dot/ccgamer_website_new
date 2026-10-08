"use strict";
/* Test only: launch the unpacked Windows desktop app and verify its
 * real read-only game server serves the packaged game and OGG byte ranges. */
const fs=require("node:fs");
const path=require("node:path");
const {spawn}=require("node:child_process");
const assert=require("node:assert/strict");
const exe=path.join(__dirname,"dist","win-unpacked","C64 Dungeon Carnage.exe");
const base="http://127.0.0.1:47731/";
if(process.platform!=="win32")throw Error("Windows runner required");
assert.ok(fs.existsSync(exe),"No unpacked Electron EXE");
const child=spawn(exe,[],{cwd:path.dirname(exe),stdio:"ignore",windowsHide:false});
let childError=null;
child.on("error",error=>{childError=error});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function awaitStartup(){
  for(let attempt=0;attempt<45;attempt++){
    if(childError)throw childError;
    if(child.exitCode!==null)throw Error("Windows application exited before server came up: "+child.exitCode);
    try{
      const response=await fetch(base+"index.html",{signal:AbortSignal.timeout(1000)});
      if(response.ok){
        const html=await response.text();
        assert.match(html,/C64 Dungeon Carnage/i);
        return;
      }
    }catch(error){if(error.name==="AssertionError")throw error}
    await pause(500);
  }
  throw Error("Game Windows app failed to serve its entry page on stable 47731 origin");
}
async function run(){
  try{
    await awaitStartup();
    const voice=await fetch(base+"assets/audio/voice/ccg-recorded-voices-r69.ogg",{
      headers:{Range:"bytes=0-63"},signal:AbortSignal.timeout(5000)
    });
    assert.equal(voice.status,206,"Recorded voice sprite seek should support byte ranges");
    assert.match(voice.headers.get("content-type")||"",/audio\/ogg/i);
    assert.equal((await voice.arrayBuffer()).byteLength,64);
    const bad=await fetch(base+".env",{signal:AbortSignal.timeout(5000)});
    assert.equal(bad.status,404,"Sensitive dotfiles must not be served");
    console.log("WINDOWS DESKTOP RUNTIME SMOKE PASSED: actual EXE start, game HTML, OGG range, dotfile block");
  }finally{
    if(child.exitCode===null)child.kill();
  }
}
run().catch(err=>{console.error(err);process.exitCode=1});
