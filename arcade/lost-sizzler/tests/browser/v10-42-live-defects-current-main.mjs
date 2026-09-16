import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".ogg":"audio/ogg",".mp3":"audio/mpeg",".wav":"audio/wav"};
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

async function prepareFire(page){
  return page.evaluate(()=>{
    p1.firearmUnlocked=true;p1.weapon=baseWeapon();p1.maxMana=Math.max(120,Number(p1.maxMana)||0);p1.mana=120;p1.hitStunMs=0;
    fire1=0;fireBuffer1=0;projectileCD=0;bullets.length=0;input.clear();
    return Number(p1.mana);
  });
}

async function sustainedFire(page,key,holdMs=900){
  const before=await prepareFire(page);
  await page.keyboard.down(key);
  await page.waitForTimeout(holdMs);
  await page.keyboard.up(key);
  await page.waitForTimeout(100);
  const after=await page.evaluate(()=>({mana:Number(p1.mana),held:Boolean(input.has("Space")),mode:String(mode),active:document.body.dataset.runActive}));
  assert.ok(after.mana<=before-2,`${key} hold must continue firing through the frame cadence, not stop after one direct keydown shot`);
  assert.equal(after.held,false,`${key} release must clear the canonical held-fire input`);
  assert.equal(after.mode,"playing",`${key} firing must leave gameplay active`);
  assert.equal(after.active,"true",`${key} firing must not deactivate the run`);
}

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?live-defects-current-main=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerV142Bootstrap?.ready===true&&Boolean(window.CCGLostSizzlerV142AttackHoldLiveness)&&window.CCGDungeonProgressionFoundation?.ready===true&&window.CCGLostSizzlerV142ArtefactShopStability?.isInstalled?.()===true,null,{timeout:90000});
  await page.waitForTimeout(1900);
  assert.equal(await page.locator(".v102-brand p").textContent(),"C64 DUNGEON CARNAGE — V10.42","late bootstrap restamps must retain the C64 Dungeon Carnage identity");

  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1),null,{timeout:20000});

  await sustainedFire(page,"Space");
  await sustainedFire(page,"f");
  await sustainedFire(page,"Numpad0");

  await page.keyboard.press("KeyP");
  await page.waitForFunction(()=>mode==="paused");
  await page.keyboard.press("KeyP");
  await page.waitForFunction(()=>mode==="playing");
  await sustainedFire(page,"Space");

  const trade=await page.evaluate(()=>{
    const PGR=window.CCGProgression;
    p1.inventorySlots=3;
    p1.inventory=[
      {kind:"artefact",name:"CCG Artefact",short:"ARTEFACT",qty:3},
      {kind:"potion",name:"Restoration Potion",short:"POTION",qty:1},
      {kind:"torch",name:"Flaming Torch",short:"TORCH",qty:1}
    ];
    run.gold=10;score=10000;
    activeShop={id:"artefact-regression-shop",active:true,shopType:"hidden",goldPurchases:0,sold:{},title:"ARTEFACT REGRESSION SHOP"};
    const result=buyShopItem("banishment");
    return{
      result,
      artefacts:PGR.inventoryKindCount(p1,"artefact"),
      flasks:PGR.inventoryKindCount(p1,"banishment"),
      count:PGR.inventoryCount(p1),
      capacity:PGR.inventoryCapacity(p1),
      gold:Number(run.gold),
      score:Number(score),
      trades:Number(window.CCGLostSizzlerV142ArtefactShopStability?.diagnostics?.trades||0),
      installs:Number(window.CCGLostSizzlerV142ArtefactShopStability?.diagnostics?.installs||0)
    };
  });
  assert.ok(trade.installs>=1,"Artefact stability wrapper must own the live shop boundary before the exchange is tested");
  assert.equal(trade.result,true,"three Artefacts must be spendable for one Banishment Flask");
  assert.equal(trade.artefacts,0,"the three traded Artefacts must be consumed exactly once");
  assert.equal(trade.flasks,1,"the Artefact exchange must add exactly one Banishment Flask");
  assert.ok(trade.count<=trade.capacity,"the exchange must remain within inventory capacity");
  assert.equal(trade.gold,10,"Artefact exchange must not spend Gold");
  assert.equal(trade.score,10000,"Artefact exchange must not spend Score");
  assert.ok(trade.trades>=1,"Artefact stability layer must record the successful trade");

  assert.deepEqual(errors,[],`live-defect regression must not produce uncaught page errors: ${errors.join("\n")}`);
  console.log("Dungeon Carnage current-main firing hold, Artefact exchange and runtime identity regression passed.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
