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
    p1.maxMana=Math.max(100,Number(p1.maxMana)||0);p1.mana=100;p1.hitStunMs=0;fire1=0;fireBuffer1=0;projectileCD=0;bullets.length=0;input.clear();
    return Number(p1.mana);
  });
}

async function assertSingleShot(page,code,key){
  const before=await prepareAttack(page);
  await dispatchKey(page,code,key);
  await page.waitForFunction(expected=>Number(p1.mana)===expected-1,before,{timeout:3000});
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
    score=10000;
    const fixture={id:"r20-shop",active:true,shopType:"entrance",scorePurchases:0,sold:{},title:"R20 TEST SHOP"};
    openShop(fixture,p1);buyShopItem("ammo");buyShopItem("ammo");
    return{score:Number(score),deltas:[...document.querySelectorAll("#shop-score-delta-rail .shop-score-delta")].map(node=>node.textContent)};
  });
  assert.equal(shop.score,7000,"two normal shop buys must deduct the 1,000 then 2,000 price steps");
  assert.deepEqual(shop.deltas,["−1,000 SCORE","−2,000 SCORE"],"multiple purchases must retain separate visible score-deduction feedback");
  await page.evaluate(()=>closeShop());
  await page.waitForFunction(()=>mode==="playing");

  const lagFixture=await page.evaluate(()=>{
    const door=(host.doors||[]).find(candidate=>candidate&&!candidate.open&&!candidate.opening)||(host.doors||[])[0];
    if(!door)throw new Error("r20 browser contract requires at least one dungeon door");
    door.open=false;door.opening=false;door.locked=false;door.openAt=0;door.openingStart=0;
    const elapsedBefore=Number(run.elapsed||0);beginDoorOpening(door,300);
    const blockedAt=performance.now();while(performance.now()-blockedAt<450){}
    return{id:door.id,elapsedBefore,blockedMs:performance.now()-blockedAt};
  });
  assert.ok(lagFixture.blockedMs>=430,"browser stall fixture must actually block the main thread");
  await page.waitForTimeout(80);
  const afterStall=await page.evaluate(id=>{
    const door=(host.doors||[]).find(candidate=>candidate.id===id);return{opening:Boolean(door?.opening),open:Boolean(door?.open),remaining:Number(door?.openAt||0)-performance.now(),elapsed:Number(run.elapsed||0),frameStalls:Number(window.CCGLostSizzlerV142R20LiveRegressionStability?.diagnostics?.frameStalls||0),doorLagFreezes:Number(window.CCGLostSizzlerV142R20LiveRegressionStability?.diagnostics?.doorLagFreezes||0)};
  },lagFixture.id);
  assert.equal(afterStall.open,false,"a stalled browser must not skip directly to the fully-open door state");
  assert.equal(afterStall.opening,true,"the door opening animation must remain active after a long browser stall");
  assert.ok(afterStall.remaining>80,"the door animation window must be shifted forward after the stall");
  assert.ok(afterStall.elapsed-lagFixture.elapsedBefore<300,`simulation must not repay the ${Math.round(lagFixture.blockedMs)}ms browser stall as a speed burst; advanced ${Math.round(afterStall.elapsed-lagFixture.elapsedBefore)}ms`);
  assert.ok(afterStall.frameStalls>=1,"r20 must record the long frame stall");
  assert.ok(afterStall.doorLagFreezes>=1,"r20 must record preserving an opening door across the stall");
  await page.waitForTimeout(420);
  await page.waitForFunction(id=>(host.doors||[]).find(candidate=>candidate.id===id)?.open===true,lagFixture.id,{timeout:2500});

  const pointer=await page.evaluate(()=>({fine:matchMedia("(pointer: fine)").matches}));
  if(pointer.fine){
    await page.mouse.move(80,80);await page.waitForTimeout(1800);
    assert.equal(await page.evaluate(()=>document.body.classList.contains("ccg-game-cursor-idle")),true,"desktop pointer must auto-hide after idle gameplay");
    await page.mouse.move(120,120);await page.waitForTimeout(60);
    assert.equal(await page.evaluate(()=>document.body.classList.contains("ccg-game-cursor-idle")),false,"desktop pointer must reappear on mouse movement");
  }

  assert.deepEqual(errors,[],`r20 browser regression contract must not produce uncaught page errors: ${errors.join("\n")}`);
  console.log("V10.42 r20 live firing, dossier, shop feedback, stall pacing, door animation and desktop cursor browser contract passed.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
