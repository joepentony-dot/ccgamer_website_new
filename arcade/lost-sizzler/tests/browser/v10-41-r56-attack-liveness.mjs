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
const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)})}catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1560,height:800}});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  const page=await context.newPage();page.setDefaultTimeout(45000);
  const pageErrors=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R49GamepadInput)&&Boolean(window.CCGLostSizzlerV141R56PlaytestCompletion)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&Boolean(p1)&&Boolean(host),null,{timeout:20000});

  const preservation=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R56PlaytestCompletion;
    mode="playing";document.querySelectorAll("#pause,#inventory-panel,#item-info-panel,#named-dossier-panel,#shop-panel,#level-up,#artefact-choice-panel,#floor-complete,#save-panel").forEach(node=>node?.classList.add("hidden"));
    fire1=9999;fireBuffer1=500;p1.hitStunMs=9999;p1.__ccgLastHurtAt=0;
    const result=api.rearmCombat("retired ownership contract",0,true);
    const after={result,buffer:Number(fireBuffer1),fire:Number(fire1),stun:Number(p1.hitStunMs)};
    fire1=0;fireBuffer1=0;p1.hitStunMs=0;
    return after
  });
  assert.equal(preservation.result,false,`R56 rearmCombat must be retired under r58: ${JSON.stringify(preservation)}`);
  assert.equal(preservation.fire,9999,`R56 must not mutate the authoritative FIRE cooldown: ${JSON.stringify(preservation)}`);
  assert.equal(preservation.buffer,500,`R56 must not mutate the authoritative FIRE buffer: ${JSON.stringify(preservation)}`);
  assert.equal(preservation.stun,9999,`R56 must not repair attack hit-stun: ${JSON.stringify(preservation)}`);

  const gamepad=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R49GamepadInput,buttons=Array.from({length:16},()=>({pressed:false,value:0}));
    buttons[0]={pressed:true,value:1};const before=api.state.syntheticDown;api.processSnapshot(0,{connected:true,axes:[0,0],buttons},performance.now());const held=input.has("Space");
    buttons[0]={pressed:false,value:0};api.processSnapshot(0,{connected:true,axes:[0,0],buttons},performance.now()+20);return{held,released:!input.has("Space"),events:api.state.syntheticDown-before}
  });
  assert.equal(gamepad.held,true,`controller A must survive R56 recovery and reach canonical Space input: ${JSON.stringify(gamepad)}`);
  assert.equal(gamepad.released,true,`controller A release must release canonical Space input: ${JSON.stringify(gamepad)}`);
  assert.ok(gamepad.events>=1,`controller A must dispatch a canonical attack keydown: ${JSON.stringify(gamepad)}`);

  await page.evaluate(()=>{
    p1.health=p1.maxHealth=8;p1.armor=0;p1.firearmUnlocked=true;p1.weapon=PGR.generateWeapon(0,1,()=>0.1);p1.maxMana=240;p1.mana=240;p1.hitStunMs=0;
    host.enemies=[];host.blockingDecor=[];fire1=0;fireBuffer1=0;mode="playing";
  });
  for(let i=0;i<12;i++){
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused",null,{timeout:3000});
    await page.evaluate(()=>{fire1=9999;fireBuffer1=500;p1.hitStunMs=9999;p1.controlLocked=true;p1.controlsLocked=true});
    await page.click("#resume-btn");await page.waitForFunction(()=>mode==="playing",null,{timeout:3000});
    const before=await page.evaluate(()=>({mana:Number(p1.mana),bullets:Number(bullets?.length||0)}));
    await page.keyboard.press("Space");
    await page.waitForFunction(before=>Number(p1.mana)<before.mana||Number(bullets?.length||0)>before.bullets,before,{timeout:2500});
    const after=await page.evaluate(()=>({mana:Number(p1.mana),fire:Number(fire1),buffer:Number(fireBuffer1),stun:Number(p1.hitStunMs||0)}));
    assert.ok(after.mana<before.mana,`firearm cycle ${i+1}: plentiful-ammo gun must consume ammo and fire: ${JSON.stringify({before,after})}`);
    if(after.mana<80)await page.evaluate(()=>{p1.mana=240});
  }

  await page.evaluate(()=>{p1.firearmUnlocked=false;p1.weapon=null;p1.mana=0;fire1=0;fireBuffer1=0;p1.hitStunMs=0;p1.controlLocked=false;p1.controlsLocked=false});
  for(let i=0;i<12;i++){
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused",null,{timeout:3000});
    await page.evaluate(()=>{fire1=9999;fireBuffer1=500;p1.hitStunMs=9999;p1.controlLocked=true;p1.controlsLocked=true});
    await page.click("#resume-btn");await page.waitForFunction(()=>mode==="playing",null,{timeout:3000});
    const before=await page.evaluate(()=>Number(p1._meleeSwingAt||0));await page.keyboard.press("Space");
    await page.waitForFunction(before=>Number(p1._meleeSwingAt||0)>before,before,{timeout:2500});
    const after=await page.evaluate(()=>({mana:Number(p1.mana||0),stun:Number(p1.hitStunMs||0)}));
    assert.equal(after.mana,0,`sword cycle ${i+1}: zero ammo must still use melee`);
  }

  const state=await page.evaluate(()=>({
    r56:{...window.CCGLostSizzlerV141R56PlaytestCompletion.state},
    r58:Boolean(window.CCGLostSizzlerV142R58AuthoritativeFireCore)
  }));
  assert.equal(state.r58,true,"r58 authoritative FIRE core must own the completed stress run");
  assert.equal(Number(state.r56.cooldownRepairs||0),0,`R56 must not repair FIRE cooldown during the r58 stress: ${JSON.stringify(state)}`);
  assert.equal(Number(state.r56.attackIntentRepairs||0),0,`R56 must not manufacture attack intents during the r58 stress: ${JSON.stringify(state)}`);
  assert.deepEqual(pageErrors,[],`r58 attack liveness browser regression produced page errors: ${pageErrors.join("\n")}`);
  await context.close();console.log("R58 canonical keyboard/gamepad 24-cycle gun/sword liveness stress passed.");
}finally{
  await browser.close().catch(()=>{});for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
