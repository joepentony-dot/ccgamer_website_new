import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
  page.setDefaultTimeout(60000);
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  await page.goto(`${origin}/arcade/lost-sizzler/?r48-shop-contract=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerV142R48ShopFirearmUpgrade?.state?.installed===true);
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1),null,{timeout:20000});

  const result=await page.evaluate(()=>globalThis.eval(`(()=>{
    const evo=window.CCGLostSizzlerV142R47FirearmEvolution,shopApi=window.CCGLostSizzlerV142R48ShopFirearmUpgrade;
    p1.firearmUnlocked=false;p1.weapon=null;p1.weaponEvolutionTier=0;p1.weaponLevel=0;p1.ownedWeapons=[];p1.activeWeaponIndex=-1;
    run.floor=1;score=10000;
    activeShop=host.trader||host.shops?.[0]||{id:"r48-test-shop",active:true,shopType:"hidden",title:"TEST SHOP",sold:{},scorePurchases:0};
    activeShop.scorePurchases=0;activeShop.weaponUpgradePurchases=0;
    const sounds=[],originalSfx=S.sfx;S.sfx=name=>{sounds.push(String(name));return originalSfx.call(S,name)};
    const card=()=>{renderShop();const b=document.querySelector('[data-shop-buy="weapon"]'),a=b?.closest('.shop-item');return{title:a?.querySelector('h3')?.textContent||"",price:a?.querySelector('.price')?.textContent||"",desc:a?.querySelector('p')?.textContent||"",button:b?.textContent||"",disabled:Boolean(b?.disabled)}};
    const initial=card(),normalPriceBefore=shopScorePrice(activeShop);
    const buy1=buyShopItem("weapon"),after1={tier:evo.deriveTier(p1),score,normalPrice:shopScorePrice(activeShop),card:card(),sounds:[...sounds]};
    sounds.length=0;
    const buy2=buyShopItem("weapon"),after2={tier:evo.deriveTier(p1),score,normalPrice:shopScorePrice(activeShop),card:card(),sounds:[...sounds]};
    sounds.length=0;
    const beforeBlocked=score,buy3=buyShopItem("weapon"),blocked={tier:evo.deriveTier(p1),score,beforeBlocked,normalPrice:shopScorePrice(activeShop),card:card(),sounds:[...sounds]};
    run.floor=2;score=10000;sounds.length=0;
    const floor2Offer=shopApi.offerFor(p1),buyFloor2=buyShopItem("weapon"),floor2={tier:evo.deriveTier(p1),score,offer:floor2Offer,normalPrice:shopScorePrice(activeShop),sounds:[...sounds],card:card()};
    S.sfx=originalSfx;
    return{initial,normalPriceBefore,buy1,after1,buy2,after2,buy3,blocked,buyFloor2,floor2,purchases:shopApi.state.purchases,shopPurchases:activeShop.weaponUpgradePurchases};
  })()`));

  assert.match(result.initial.title,/FIREARM ACQUISITION/);
  assert.match(result.initial.price,/2,500 SCORE/);
  assert.match(result.initial.price,/20 GOLD COINS/);
  assert.equal(result.initial.disabled,false);
  assert.equal(result.normalPriceBefore,2,"the ordinary shop ladder now starts at 2 Gold");

  assert.equal(result.buy1,true);
  assert.equal(result.after1.tier,1);
  assert.equal(result.after1.score,7500,"Tier 1 shop acquisition should deduct exactly 2,500 score");
  assert.equal(result.after1.normalPrice,2,"firearm purchase must not advance the ordinary Gold shop ladder");
  assert.deepEqual(result.after1.sounds.filter(name=>name==="pickup"),[],"shop firearm purchase must not layer generic pickup SFX");
  assert.ok(result.after1.sounds.includes("weapon"),"shop firearm acquisition should retain the dedicated weapon SFX");
  assert.match(result.after1.card.price,/3,750 SCORE/);

  assert.equal(result.buy2,true);
  assert.equal(result.after2.tier,2);
  assert.equal(result.after2.score,3750,"Tier 2 shop upgrade should deduct exactly 3,750 score");
  assert.equal(result.after2.normalPrice,2,"second firearm upgrade must not advance the ordinary Gold shop ladder");
  assert.deepEqual(result.after2.sounds.filter(name=>name==="pickup"),[]);
  assert.equal(result.after2.card.disabled,true,"Floor 1 should stop further firearm upgrades at Tier 2");
  assert.match(result.after2.card.button,/DESCEND TO UPGRADE/);

  assert.equal(result.buy3,false);
  assert.equal(result.blocked.tier,2);
  assert.equal(result.blocked.score,result.blocked.beforeBlocked,"floor-capped upgrade attempt must not charge score");
  assert.equal(result.blocked.normalPrice,2,"blocked firearm upgrade must not advance the ordinary Gold shop ladder");

  assert.equal(result.floor2.offer.price,5000,"Tier 2 to Tier 3 should cost 5,000 score");
  assert.equal(result.buyFloor2,true);
  assert.equal(result.floor2.tier,3);
  assert.equal(result.floor2.score,5000);
  assert.equal(result.floor2.normalPrice,2,"floor-two firearm upgrade must not advance the ordinary Gold shop ladder");
  assert.deepEqual(result.floor2.sounds.filter(name=>name==="pickup"),[]);
  assert.equal(result.purchases,3);
  assert.equal(result.shopPurchases,3);

  console.log("Dungeon Carnage R54 retained shop firearm upgrade browser contract passed.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}