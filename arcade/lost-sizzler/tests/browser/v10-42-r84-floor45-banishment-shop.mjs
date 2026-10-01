import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg",".wav":"audio/wav"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(root,`.${relative}`);
    if(!file.startsWith(`${root}${path.sep}`)&&file!==root){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(world)&&Boolean(host)&&Boolean(p1),null,{timeout:30000});

  const result=await page.evaluate(()=>{
    const rows=[];
    for(const floor of [4,5]){
      run.floor=floor;
      run.modifier=null;
      startWorld(PGR.floorSeed(run),false,true);
      const shop=host.startShop;
      if(!shop){rows.push({floor,missingShop:true});continue}
      p1.inventory=[];
      p1.inventorySlots=Math.max(3,Number(p1.inventorySlots)||3);
      const need=Math.max(1,Math.floor(Number(window.CCGLostSizzlerV142ProceduralOverhaul?.essenceCost?.(p1))||Number(C.stalker.flaskArtefacts)||3));
      p1.banishmentEssence=need;
      const beforeFlasks=PGR.inventoryKindCount(p1,"banishment"),beforeScore=Number(score||0);
      openShop(shop,p1);
      const card=Boolean(document.querySelector('#shop-items [data-shop-buy="banishment"]'));
      const bought=buyShopItem("banishment");
      const afterFlasks=PGR.inventoryKindCount(p1,"banishment"),afterEssence=Number(p1.banishmentEssence||0),afterScore=Number(score||0);
      closeShop();
      rows.push({floor,shopType:shop.shopType,title:shop.title,need,card,bought,beforeFlasks,afterFlasks,afterEssence,beforeScore,afterScore});
    }
    return rows
  });

  for(const row of result){
    assert.notEqual(row.missingShop,true,`Floor ${row.floor} must retain its entrance shop`);
    assert.equal(row.card,false,`Floor ${row.floor} ordinary entrance shop must not expose the Alchemist-only Banishment Flask distillation`);
    assert.equal(row.bought,false,`Floor ${row.floor} ordinary entrance shop must reject direct Banishment Flask distillation`);
    assert.equal(row.afterFlasks,row.beforeFlasks,`Floor ${row.floor} ordinary shop must not add a Flask`);
    assert.equal(row.afterEssence,row.need,`Floor ${row.floor} rejected ordinary-shop attempt must preserve Banishment Essence`);
    assert.equal(row.afterScore,row.beforeScore,`Floor ${row.floor} rejected ordinary-shop attempt must not spend Score`);
  }
  assert.deepEqual(errors,[],`Floor 4/5 Banishment exchange regression raised page errors: ${errors.join("\n")}`);
  console.log(`R86 Floor 4/5 Alchemist-only Banishment qualification passed: ${JSON.stringify(result)}`);
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
