import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const mime={
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".webp":"image/webp",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".mp3":"audio/mpeg",
  ".wav":"audio/wav",
  ".ogg":"audio/ogg",
  ".m4a":"audio/mp4"
};

const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return;}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end("not found");return;}
      res.setHeader("content-type",mime[path.extname(file).toLowerCase()]||"application/octet-stream");
      res.setHeader("cache-control","no-store");
      res.end(data);
    });
  }catch(error){res.writeHead(500).end(String(error));}
});

await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const canonical=`${origin}/arcade/lost-sizzler/`;
const legacy=`${origin}/games/ccg-games/cheeky-commodore-quest/`;

const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage"]});
const contexts=[];

async function newGamePage(viewport={width:1600,height:900}){
  const context=await browser.newContext({viewport});
  contexts.push(context);
  const page=await context.newPage();
  const pageErrors=[];
  let crashed=false;
  page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  page.on("crash",()=>{crashed=true;});
  return{context,page,pageErrors,crashed:()=>crashed};
}

async function assertHealthy(state,label){
  assert.equal(state.crashed(),false,`${label}: Chromium page did not crash`);
  assert.deepEqual(state.pageErrors,[],`${label}: no uncaught browser errors: ${state.pageErrors.join("\n")}`);
  assert.equal(await state.page.evaluate(()=>document.body.dataset.gameReady),"true",`${label}: game reaches ready state`);
  assert.equal(await state.page.evaluate(()=>Boolean(window.__CCG_LOST_SIZZLER_EARLY_RESIZE_GUARD__)),true,`${label}: early canvas guard is active`);
}

try{
  {
    const state=await newGamePage();
    await state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:30000});
    await state.page.waitForFunction(()=>document.body.dataset.gameReady==="true",null,{timeout:20000});
    await state.page.waitForTimeout(3500);
    await assertHealthy(state,"canonical desktop launch");

    const canonicalHref=await state.page.locator('link[rel="canonical"]').getAttribute("href");
    assert.equal(canonicalHref,"https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/","canonical metadata uses the arcade URL");

    const scriptSources=await state.page.evaluate(()=>[...document.scripts].map(script=>script.src).filter(Boolean));
    const duplicateSources=scriptSources.filter((src,index)=>scriptSources.indexOf(src)!==index);
    assert.deepEqual(duplicateSources,[],`startup does not load the same script twice: ${duplicateSources.join(", ")}`);

    const menuSamples=[];
    for(let i=0;i<24;i++){
      menuSamples.push(await state.page.evaluate(()=>({w:game.width,h:game.height,pixels:game.width*game.height})));
      await state.page.waitForTimeout(100);
    }
    const uniqueMenuSizes=new Set(menuSamples.map(sample=>`${sample.w}x${sample.h}`));
    assert.ok(uniqueMenuSizes.size<=3,`menu canvas backing store stabilises instead of reallocating continuously: ${[...uniqueMenuSizes].join(", ")}`);
    assert.ok(menuSamples.every(sample=>sample.pixels<=5000000),"desktop canvas stays within the stability pixel budget");

    await state.page.locator("#solo-btn").click();
    await state.page.waitForFunction(()=>document.body.dataset.runActive==="true",null,{timeout:20000});
    await state.page.keyboard.down("d");
    await state.page.waitForTimeout(1200);
    await state.page.keyboard.up("d");
    await state.page.waitForTimeout(3000);
    await assertHealthy(state,"active solo run");

    const sizes=[
      {width:1920,height:1080},
      {width:1366,height:768},
      {width:1600,height:900},
      {width:1280,height:720},
      {width:1600,height:900}
    ];
    for(const size of sizes){
      await state.page.setViewportSize(size);
      await state.page.waitForTimeout(450);
      const canvas=await state.page.evaluate(()=>({w:game.width,h:game.height,pixels:game.width*game.height}));
      assert.ok(canvas.pixels<=5000000,`resize ${size.width}x${size.height} remains inside canvas budget: ${canvas.w}x${canvas.h}`);
      await assertHealthy(state,`resize ${size.width}x${size.height}`);
    }

    const transient=await state.page.evaluate(()=>({
      particles:typeof particles!=="undefined"?particles.length:0,
      rings:typeof rings!=="undefined"?rings.length:0,
      floaters:typeof floaters!=="undefined"?floaters.length:0,
      bullets:typeof bullets!=="undefined"?bullets.length:0,
      enemyBullets:typeof enemyBullets!=="undefined"?enemyBullets.length:0
    }));
    assert.ok(transient.particles<=2600&&transient.rings<=700&&transient.floaters<=700&&transient.bullets<=900&&transient.enemyBullets<=1600,`transient render state remains bounded: ${JSON.stringify(transient)}`);
  }

  {
    const state=await newGamePage({width:844,height:390});
    await state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:30000});
    await state.page.waitForFunction(()=>document.body.dataset.gameReady==="true",null,{timeout:20000});
    await state.page.waitForTimeout(2500);
    await assertHealthy(state,"mobile landscape launch");
    const canvas=await state.page.evaluate(()=>({w:game.width,h:game.height,pixels:game.width*game.height}));
    assert.ok(canvas.pixels<=1900000,`mobile canvas remains inside coarse-device budget ceiling: ${canvas.w}x${canvas.h}`);
  }

  {
    const state=await newGamePage();
    await state.page.goto(legacy,{waitUntil:"domcontentloaded",timeout:30000});
    await state.page.waitForURL(url=>url.pathname==="/arcade/lost-sizzler/",{timeout:10000});
    await state.page.waitForFunction(()=>document.body.dataset.gameReady==="true",null,{timeout:20000});
    await assertHealthy(state,"legacy redirect launch");
    assert.equal(new URL(state.page.url()).pathname,"/arcade/lost-sizzler/","legacy URL redirects once to canonical arcade runtime");
  }

  console.log("Lost Sizzler real-browser startup, resize, redirect and crash checks passed");
}finally{
  for(const context of contexts)await context.close().catch(()=>{});
  await browser.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
}
