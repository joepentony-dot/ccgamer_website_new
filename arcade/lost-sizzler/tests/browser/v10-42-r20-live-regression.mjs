import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={
  ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".mjs":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml", ".webp":"image/webp",
  ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".ogg":"audio/ogg", ".mp3":"audio/mpeg", ".wav":"audio/wav"
};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

async function dispatchKey(page,code,key=code){
  await page.evaluate(({code,key})=>document.dispatchEvent(new KeyboardEvent("keydown",{code,key,bubbles:true,cancelable:true})),{code,key});
  await page.waitForTimeout(70);
  await page.evaluate(({code,key})=>document.dispatchEvent(new KeyboardEvent("keyup",{code,key,bubbles:true,cancelable:true})),{code,key});
}

async function prepareAttack(page){
  return page.evaluate(()=>{
    p1.firearmUnlocked=true;p1.weapon=baseWeapon();
    p1.maxMana=Math.max(100,Number(p1.maxMana)||0);p1.mana=100;p1.hitStunMs=0;fire1=0;fireBuffer1=0;projectileCD=0;bullets.length=0;input.clear();
    return Number(p1.mana);
  });
}

async function failedAttackDiagnostics(page,expected){
  return page.evaluate(expected=>{
    const snapshot=()=>({
      expected,
      mana:Number(p1?.mana),
      fire1:Number(fire1),
      fireBuffer1:Number(fireBuffer1),
      projectileCD:Number(projectileCD),
      bullets:Number(bullets?.length||0),
      hitStunMs:Number(p1?.hitStunMs||0),
      mode:String(mode),
      active:document.body?.dataset?.runActive||"",
      releaseReady:document.body?.dataset?.releaseReady||"",
      input:[...(input||[])],
      runElapsed:Number(run?.elapsed||0),
      attackDiagnostics:{...(window.CCGLostSizzlerV142R20LiveRegressionStability?.diagnostics||{})},
      r18Diagnostics:{...(window.CCGLostSizzlerV142R18SoloPlaytestStability?.diagnostics||{})},
      modeRuntime:window.CCGLostSizzlerModeRuntime?.snapshot?.()||null,
      loopR20:Boolean(loop?.__ccgV142R20),
      updateModeBoundary:Boolean(update?.__ccgV141ModeFrameBoundary),
      queueR18:Boolean(queueAttack?.__ccgV142R18),
      fireR1:Boolean(firePlayer?.__ccgV142R1)
    });
    const beforeManualUpdate=snapshot();
    let manualUpdateError="";
    try{update(16)}catch(error){manualUpdateError=String(error?.stack||error)}
    const afterManualUpdate=snapshot();
    return{beforeManualUpdate,manualUpdateError,afterManualUpdate};
  },expected);
}

async function assertSingleShot(page,code,key){
  const before=await prepareAttack(page);
  await dispatchKey(page,code,key);
  try{
    await page.waitForFunction(expected=>Number(p1.mana)===expected-1,before,{timeout:3000});
  }catch(error){
    const diagnostics=await failedAttackDiagnostics(page,before-1);
    throw new Error(`${code} attack did not complete through the live frame owner: ${JSON.stringify(diagnostics)}`,{cause:error});
  }
  await page.waitForTimeout(800);
  const after=await page.evaluate(()=>({mana:Number(p1.mana),mode,buffer:Number(fireBuffer1),active:document.body.dataset.runActive}));
  assert.equal(after.mana,before-1,`${code} must produce exactly one shot from one press, not a duplicated buffered shot`);
  assert.equal(after.mode,"playing",`${code} must leave the run playing`);
  assert.equal(after.active,"true",`${code} must not deactivate the run`);
}

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?r20-browser-contract=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerV142Bootstrap?.ready===true&&Boolean(window.CCGLostSizzlerV142R20LiveRegressionStability),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1),null,{timeout:20000});

  await assertSingleShot(page,"Space"," ");
  await assertSingleShot(page,"KeyF","f");
  await assertSingleShot(page,"Numpad0","0");

  await page.evaluate(()=>showNamedDossier("",true));
  await page.waitForFunction(()=>mode==="dossier"&&!document.getElementById("named-dossier-panel")?.classList.contains("hidden"));
  await dispatchKey(page,"Space"," ");
  await page.waitForFunction(()=>mode==="playing"&&document.getElementById("named-dossier-panel")?.classList.contains("hidden")&&document.activeElement?.id==="game");

  const shop=await page.evaluate(()=>{
    score=10000;run.gold=10;
    const fixture={id:"r20-shop",active:true,shopType:"entrance",goldPurchases:0,sold:{},title:"R20 TEST SHOP"};
    openShop(fixture,p1);buyShopItem("ammo");buyShopItem("ammo");
    return{score:Number(score),gold:Number(run.gold),purchases:Number(fixture.goldPurchases||0),next:Number(shopScorePrice(fixture))};
  });
  assert.equal(shop.score,10000,"Gold shop purchases must not spend gameplay score");
  assert.equal(shop.gold,5,"two normal shop buys must deduct the 2 then 3 Gold price steps");
  assert.equal(shop.purchases,2,"two successful Gold purchases must advance the shop purchase counter twice");
  assert.equal(shop.next,4,"the next normal shop purchase must cost 4 Gold after two buys");
  await page.evaluate(()=>closeShop());
  await page.waitForFunction(()=>mode==="playing");

  const stallResult=await page.evaluate(async()=>{
    const door=(host.doors||[]).find(candidate=>candidate&&!candidate.open&&!candidate.opening)||(host.doors||[])[0];
    if(!door)throw new Error("r20 browser contract requires at least one dungeon door");
    door.open=false;door.opening=false;door.locked=false;door.openAt=0;door.openingStart=0;
    const elapsedBefore=Number(run.elapsed||0);beginDoorOpening(door,300);
    const blockedAt=performance.now();while(performance.now()-blockedAt<450){}
    const blockedMs=performance.now()-blockedAt;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const observedAt=performance.now(),current=(host.doors||[]).find(candidate=>candidate.id===door.id);
    return{
      id:door.id,elapsedBefore,blockedMs,postStallObservationMs:Math.max(0,observedAt-blockedAt-blockedMs),
      opening:Boolean(current?.opening),open:Boolean(current?.open),remaining:Number(current?.openAt||0)-observedAt,
      elapsed:Number(run.elapsed||0),frameStalls:Number(window.CCGLostSizzlerV142R20LiveRegressionStability?.diagnostics?.frameStalls||0),
      doorLagFreezes:Number(window.CCGLostSizzlerV142R20LiveRegressionStability?.diagnostics?.doorLagFreezes||0)
    };
  });
  assert.ok(stallResult.blockedMs>=430,"browser stall fixture must actually block the main thread");
  assert.equal(stallResult.open,false,"a stalled browser must not skip directly to the fully-open door state");
  assert.equal(stallResult.opening,true,"the door opening animation must remain active after a long browser stall");
  assert.ok(stallResult.remaining>80,"the door animation window must be shifted forward after the stall");
  assert.ok(stallResult.elapsed-stallResult.elapsedBefore<300,`simulation must not repay the ${Math.round(stallResult.blockedMs)}ms browser stall as a speed burst; advanced ${Math.round(stallResult.elapsed-stallResult.elapsedBefore)}ms across ${Math.round(stallResult.postStallObservationMs)}ms of browser-frame observation`);
  assert.ok(stallResult.frameStalls>=1,"r20 must record the long frame stall");
  assert.ok(stallResult.doorLagFreezes>=1,"r20 must record preserving an opening door across the stall");
  await page.waitForTimeout(420);
  await page.waitForFunction(id=>(host.doors||[]).find(candidate=>candidate.id===id)?.open===true,stallResult.id,{timeout:2500});

  const pointer=await page.evaluate(()=>({fine:matchMedia("(pointer: fine)").matches}));
  if(pointer.fine){
    await page.mouse.move(80,80);await page.waitForTimeout(1800);
    assert.equal(await page.evaluate(()=>document.body.classList.contains("ccg-game-cursor-idle")),true,"desktop pointer must auto-hide after idle gameplay");
    await page.mouse.move(120,120);await page.waitForTimeout(60);
    assert.equal(await page.evaluate(()=>document.body.classList.contains("ccg-game-cursor-idle")),false,"desktop pointer must reappear on mouse movement");
  }

  assert.deepEqual(errors,[],`r20 browser regression contract must not produce uncaught page errors: ${errors.join("\n")}`);
  console.log("V10.42 r20 live firing, dossier, Gold shop, stall pacing, door animation and desktop cursor browser contract passed.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}