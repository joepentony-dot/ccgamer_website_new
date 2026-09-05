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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&Boolean(window.CCGLostSizzlerV141R49GamepadInput));

  const menu=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R49GamepadInput,button=document.getElementById("solo-btn");button.focus();
    const buttons=Array.from({length:16},()=>({pressed:false,value:0}));buttons[0]={pressed:true,value:1};api.processSnapshot(0,{connected:true,axes:[0,0],buttons},performance.now());
    buttons[0]={pressed:false,value:0};api.processSnapshot(0,{connected:true,axes:[0,0],buttons},performance.now()+20);
    return{clicks:api.state.menuClicks,marker:document.body.dataset.v141R49Gamepad}
  });
  assert.equal(menu.marker,"true","r49 must publish its runtime marker");
  assert.ok(menu.clicks>=1,"controller A must activate a focused menu action");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof p1!=="undefined"&&Boolean(p1));

  const solo=await page.evaluate(async()=>{
    const api=window.CCGLostSizzlerV141R49GamepadInput,blank=()=>Array.from({length:16},()=>({pressed:false,value:0}));
    const startX=Number(p1.x),buttons=blank();api.processSnapshot(0,{connected:true,axes:[1,0],buttons},performance.now());const heldRight=input.has("KeyD");
    await new Promise(resolve=>setTimeout(resolve,260));api.processSnapshot(0,{connected:true,axes:[0,0],buttons},performance.now()+300);const released=!input.has("KeyD"),endX=Number(p1.x);
    const before=api.state.syntheticDown;buttons[0]={pressed:true,value:1};api.processSnapshot(0,{connected:true,axes:[0,0],buttons},performance.now()+330);const attackHeld=input.has("Space");buttons[0]={pressed:false,value:0};api.processSnapshot(0,{connected:true,axes:[0,0],buttons},performance.now()+350);const attackReleased=!input.has("Space");
    const p2Before=api.state.syntheticDown;const second=api.processSnapshot(1,{connected:true,axes:[1,0],buttons:blank()},performance.now()+370);
    return{startX,endX,heldRight,released,attackHeld,attackReleased,attackEvents:api.state.syntheticDown-before,second,p2Events:api.state.syntheticDown-p2Before}
  });
  assert.equal(solo.heldRight,true,"P1 stick-right must enter canonical KeyD input");
  assert.equal(solo.released,true,"neutral stick must release canonical KeyD input");
  assert.notEqual(solo.endX,solo.startX,"P1 must move through the real gameplay loop from controller input");
  assert.equal(solo.attackHeld,true,"P1 A must enter canonical Space attack input");
  assert.equal(solo.attackReleased,true,"releasing A must release Space");
  assert.ok(solo.attackEvents>=1,"P1 A must dispatch a real canonical attack keydown");
  assert.equal(solo.second,false,"Pad 2 must be ignored during single-player gameplay");
  assert.equal(solo.p2Events,0,"ignored Pad 2 must not synthesize gameplay input");

  await page.evaluate(async()=>{await quitToMenu()});
  await page.waitForFunction(()=>String(mode)==="menu");
  const splitStart=await page.evaluate(async()=>{
    const button=document.getElementById("split-btn");button.focus();const focused=document.activeElement===button;
    const started=await startSplit();
    return{started:Boolean(started),focused,runActive:String(document.body.dataset.runActive||""),mode:String(mode||""),playMode:String(playMode||""),hasP1:Boolean(p1),hasP2:Boolean(p2)}
  });
  assert.equal(splitStart.focused,true,"Split Screen must accept menu focus before deterministic startup");
  assert.equal(splitStart.started,true,`Split Screen startup must resolve successfully: ${JSON.stringify(splitStart)}`);
  assert.equal(splitStart.runActive,"true",`Split Screen startup must publish an active run: ${JSON.stringify(splitStart)}`);
  assert.equal(splitStart.mode,"playing",`Split Screen startup must enter playing mode: ${JSON.stringify(splitStart)}`);
  assert.equal(splitStart.playMode,"split",`Split Screen startup must select split play mode: ${JSON.stringify(splitStart)}`);
  assert.equal(splitStart.hasP1&&splitStart.hasP2,true,`Split Screen startup must initialise both local players: ${JSON.stringify(splitStart)}`);

  const splitResult=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R49GamepadInput,b=Array.from({length:16},()=>({pressed:false,value:0}));api.processSnapshot(1,{connected:true,axes:[1,0],buttons:b},performance.now()+1200);const held=input.has("ArrowRight");api.processSnapshot(1,{connected:true,axes:[0,0],buttons:b},performance.now()+1220);return{held,released:!input.has("ArrowRight")}
  });
  assert.equal(splitResult.held,true,"Pad 2 stick-right must use canonical ArrowRight split input");
  assert.equal(splitResult.released,true,"Pad 2 neutral stick must release ArrowRight");
  assert.deepEqual(errors,[],`r49 browser test must not raise page errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r49 menu, Solo and two-controller Split Screen input passed in Chromium.");
  await context.close();
}finally{
  await browser.close().catch(()=>{});for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
