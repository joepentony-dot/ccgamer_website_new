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
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
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

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R30?.state?.goldenLocked));

  const ancestry=await page.evaluate(()=>{
    const r30=window.CCGLostSizzlerV141R30;
    const healthy=function healthyParent(){return true};
    const poisoned=function poisonedSecondaryParent(){return false};poisoned.__ccgV141SpyIsolated=true;
    const wrapper=function multiParentWrapper(){return true};
    wrapper.__ccgOriginal=healthy;
    wrapper.__ccgV141TutorialOriginal=poisoned;
    return{links:r30.originalLinks(wrapper).length,first:r30.originalLink(wrapper)===healthy,contaminated:r30.spyContaminated(wrapper)};
  });
  assert.deepEqual(ancestry,{links:2,first:true,contaminated:true},`r30 must inspect every wrapper ancestry branch, including a poisoned non-primary branch: ${JSON.stringify(ancestry)}`);

  await page.evaluate(()=>{
    run=PGR.makeRun({difficulty:"ARCADE",seed:"R30-SELECTIVE-OWNER"});playMode="solo";startWorld(PGR.floorSeed(run),false,false);mode="playing";
    document.body.dataset.runActive="true";document.body.dataset.specialMode="";UI.menu?.classList.add("hidden");
    host.enemies=[];host.generators=[];move1=0;input.clear();
  });
  await page.waitForFunction(()=>Boolean(
    window.CCGLostSizzlerV141R56PlaytestCompletion&&
    window.CCGLostSizzlerV141R60LivePlayIntegrity&&
    window.CCGLostSizzlerV141R30?.modernDamageOwnershipPresent?.(window.hurtPlayer)
  ));

  const selective=await page.evaluate(()=>{
    const r30=window.CCGLostSizzlerV141R30,updateBefore=window.update,hurtBefore=window.hurtPlayer;
    const hurtModernBefore=r30.modernDamageOwnershipPresent(hurtBefore);
    const poisoned=function poisonedMoveOnly(){return false};poisoned.__ccgV141SpyIsolated=true;window.movePlayer=poisoned;
    const repaired=r30.assertNormalRuntimeOwnership("browser selective move-only repair");
    return{
      repaired,
      contaminated:r30.spyContaminated(window.movePlayer),
      moveGolden:window.movePlayer===r30.state.goldenMove,
      updatePreserved:window.update===updateBefore,
      hurtPreserved:window.hurtPlayer===hurtBefore,
      hurtModernBefore,
      hurtModernAfter:r30.modernDamageOwnershipPresent(window.hurtPlayer)
    };
  });
  assert.deepEqual(selective,{repaired:true,contaminated:false,moveGolden:true,updatePreserved:true,hurtPreserved:true,hurtModernBefore:true,hurtModernAfter:true},`move-only ownership repair must preserve an already healthy modern damage owner: ${JSON.stringify(selective)}`);

  const direction=await page.evaluate(()=>{
    const dirs=[{dx:1,dy:0,code:"ArrowRight"},{dx:-1,dy:0,code:"ArrowLeft"},{dx:0,dy:1,code:"ArrowDown"},{dx:0,dy:-1,code:"ArrowUp"}];
    const q=dirs.find(row=>window.CCGWorld?.walkable?.(world.map,p1.x+row.dx,p1.y+row.dy,host)&&!(host.enemies||[]).some(e=>e.alive&&e.x===p1.x+row.dx&&e.y===p1.y+row.dy));
    return q?{...q,x:p1.x,y:p1.y}:null;
  });
  assert.ok(direction,"selective recovery regression requires a walkable adjacent tile");
  await page.evaluate(()=>{move1=0;input.clear();if(p1)p1.hitStunMs=0});
  await page.keyboard.down(direction.code);await page.waitForTimeout(420);await page.keyboard.up(direction.code);await page.waitForTimeout(100);
  const after=await page.evaluate(()=>({x:p1.x,y:p1.y}));
  assert.notDeepEqual(after,{x:direction.x,y:direction.y},`normal held keyboard movement must remain functional after selective ownership repair: ${JSON.stringify({direction,after})}`);

  assert.deepEqual(errors,[],`selective owner recovery must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r30 full-ancestry and selective owner recovery passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
