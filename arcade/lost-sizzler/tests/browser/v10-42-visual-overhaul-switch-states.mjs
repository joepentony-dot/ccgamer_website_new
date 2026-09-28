import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".png":"image/png",".webp":"image/webp",".svg":"image/svg+xml",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store"});
      res.end(data);
    });
  }catch(error){res.writeHead(500).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(()=>{
    localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");
    localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true");
  });
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/?visual-switch-contract=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>document.body.dataset.v142BootstrapReady==="true");
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&Boolean(p1&&host));
  await page.waitForFunction(()=>Boolean(
    lostSizzlerPixelAssets?.switchButtonUp?.complete&&lostSizzlerPixelAssets.switchButtonUp.naturalWidth>=16&&
    lostSizzlerPixelAssets?.switchButtonDown?.complete&&lostSizzlerPixelAssets.switchButtonDown.naturalWidth>=16&&
    lostSizzlerPixelAssets?.switches?.complete&&lostSizzlerPixelAssets.switches.naturalWidth>=16&&
    lostSizzlerPixelAssets?.secretSwitches?.complete&&lostSizzlerPixelAssets.secretSwitches.naturalWidth>=16
  ));

  const result=await page.evaluate(async()=>globalThis.eval(`(async()=>{
    const diagnostics=window.__CCG_SWITCH_RENDER_DIAGNOSTICS__;
    const s=ws(Number(p1.x),Number(p1.y));
    const before=Number(diagnostics?.assetFrames||0);

    const armed={id:"switch-test",x:Number(p1.x),y:Number(p1.y),active:true,revealSecret:false};
    const armedRendered=drawSwitchVisual(armed,s,performance.now());
    const armedState={rendered:Boolean(armedRendered),mode:String(diagnostics.lastMode||""),state:String(diagnostics.lastState||""),secret:Boolean(diagnostics.lastSecret),assetFrames:Number(diagnostics.assetFrames||0)};

    const activated={...armed,active:false};
    const activatedRendered=drawSwitchVisual(activated,s,performance.now());
    const activatedState={rendered:Boolean(activatedRendered),mode:String(diagnostics.lastMode||""),state:String(diagnostics.lastState||""),secret:Boolean(diagnostics.lastSecret),assetFrames:Number(diagnostics.assetFrames||0)};

    const secret={...armed,id:"secret-switch-test",revealSecret:true};
    const secretRendered=drawSwitchVisual(secret,s,performance.now());
    const secretState={rendered:Boolean(secretRendered),mode:String(diagnostics.lastMode||""),state:String(diagnostics.lastState||""),secret:Boolean(diagnostics.lastSecret),assetFrames:Number(diagnostics.assetFrames||0)};

    const pixel="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    lostSizzlerPixelAssets.switchButtonUp.src=pixel;
    await new Promise(resolve=>setTimeout(resolve,80));
    const fallbackBefore=Number(diagnostics.fallbackFrames||0);
    const fallbackRendered=drawSwitchVisual(armed,s,performance.now());
    const fallback={rendered:Boolean(fallbackRendered),mode:String(diagnostics.lastMode||""),state:String(diagnostics.lastState||""),before:fallbackBefore,after:Number(diagnostics.fallbackFrames||0),buttonWidth:Number(lostSizzlerPixelAssets.switchButtonUp?.naturalWidth||0)};

    return{before,armedState,activatedState,secretState,fallback};
  })()`));

  assert.equal(result.armedState.rendered,true,JSON.stringify(result));
  assert.equal(result.armedState.mode,"cc0-switch",JSON.stringify(result));
  assert.equal(result.armedState.state,"armed",JSON.stringify(result));
  assert.equal(result.armedState.secret,false,JSON.stringify(result));
  assert.ok(result.armedState.assetFrames>result.before,JSON.stringify(result));

  assert.equal(result.activatedState.rendered,true,JSON.stringify(result));
  assert.equal(result.activatedState.state,"activated",JSON.stringify(result));
  assert.ok(result.activatedState.assetFrames>result.armedState.assetFrames,JSON.stringify(result));

  assert.equal(result.secretState.rendered,true,JSON.stringify(result));
  assert.equal(result.secretState.secret,true,JSON.stringify(result));
  assert.ok(result.secretState.assetFrames>result.activatedState.assetFrames,JSON.stringify(result));

  assert.ok(result.fallback.buttonWidth<16,JSON.stringify(result));
  assert.equal(result.fallback.rendered,false,JSON.stringify(result));
  assert.equal(result.fallback.mode,"procedural-fallback",JSON.stringify(result));
  assert.ok(result.fallback.after>result.fallback.before,JSON.stringify(result));
  assert.deepEqual(errors,[],"switch state renderer must not produce page errors");
  await context.close();
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  for(const socket of sockets)socket.destroy();
}
console.log("PASS Dungeon CC0 switch armed/activated/secret states and fallback");
