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
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1560,height:800}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const pageErrors=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R55FinalPlaytestCleanup)&&Boolean(document.getElementById("horde-solo-btn")),null,{timeout:90000});

  const menuLayout=await page.evaluate(()=>{
    const continueButton=document.getElementById("continue-save-btn");
    continueButton?.classList.remove("hidden");
    if(continueButton)continueButton.textContent="Continue Solo — Floor 1";
    const ids=["solo-btn","create-btn","continue-save-btn","horde-solo-btn","horde-mode-btn","saboteurs-mode-btn","split-btn","tutorial-zone-btn","daily-btn"];
    return ids.map(id=>{
      const button=document.getElementById(id);if(!button)return{id,missing:true};
      const rect=button.getBoundingClientRect(),style=getComputedStyle(button),before=getComputedStyle(button,"::before"),after=getComputedStyle(button,"::after"),range=document.createRange();
      range.selectNodeContents(button);const text=range.getBoundingClientRect();
      return{id,missing:false,height:rect.height,paddingTop:parseFloat(style.paddingTop)||0,paddingBottom:parseFloat(style.paddingBottom)||0,titleTop:text.top-rect.top,titleBottom:rect.bottom-text.bottom,beforePosition:before.position,afterPosition:after.position,beforeContent:before.content,afterContent:after.content,beforeTop:parseFloat(before.top)||0,afterBottom:parseFloat(after.bottom)||0,beforeLine:parseFloat(before.lineHeight)||parseFloat(before.fontSize)||0,afterLine:parseFloat(after.lineHeight)||parseFloat(after.fontSize)||0};
    })
  });

  for(const row of menuLayout){
    assert.equal(row.missing,false,`menu mode card ${row.id} must exist`);
    assert.ok(row.height>=68,`${row.id} is too short for its title/kicker/description rows: ${JSON.stringify(row)}`);
    assert.ok(row.paddingTop>=27,`${row.id} must reserve a top kicker band: ${JSON.stringify(row)}`);
    assert.ok(row.paddingBottom>=23,`${row.id} must reserve a bottom description band: ${JSON.stringify(row)}`);
    assert.ok(row.titleTop>=20,`${row.id} title is colliding with the kicker row: ${JSON.stringify(row)}`);
    assert.ok(row.titleBottom>=17,`${row.id} title is colliding with the description row: ${JSON.stringify(row)}`);
    if(row.beforeContent&&row.beforeContent!=="none"&&row.beforeContent!=='""'){
      assert.equal(row.beforePosition,"absolute",`${row.id} kicker must not consume the title line`);
      assert.ok(row.titleTop>=row.beforeTop+row.beforeLine+3,`${row.id} kicker overlaps its title: ${JSON.stringify(row)}`);
    }
    if(row.afterContent&&row.afterContent!=="none"&&row.afterContent!=='""'){
      assert.equal(row.afterPosition,"absolute",`${row.id} description must own a separate bottom row`);
      assert.ok(row.titleBottom>=row.afterBottom+row.afterLine+3,`${row.id} description overlaps its title: ${JSON.stringify(row)}`);
    }
  }

  await page.click("#horde-solo-btn");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="horde-survivor"&&document.body.dataset.hordeSolo==="true"&&Boolean(window.CCGLostSizzlerSpecialModes?.active?.state),null,{timeout:15000});
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R38ColyseusHorde)&&Boolean(window.CCGLostSizzlerV141R39HordeResponsive),null,{timeout:15000});
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R55FinalPlaytestCleanup?.expectedAuthority?.()===true&&window.CCGLostSizzlerSpecialModes?.active?.authoritative===true,null,{timeout:5000});

  await page.waitForFunction(()=>{
    const state=window.CCGLostSizzlerSpecialModes?.active?.state;
    return state?.state==="wave"&&Number(state.wave)===1;
  },null,{timeout:8000});
  await page.waitForFunction(()=>Array.isArray(host?.enemies)&&host.enemies.some(enemy=>enemy?.alive&&enemy?.hordeEnemy),null,{timeout:5000});
  await page.waitForFunction(()=>document.getElementById("horde-transition-banner")?.dataset?.visible==="false",null,{timeout:3000});

  const horde=await page.evaluate(()=>({
    phase:String(window.CCGLostSizzlerSpecialModes?.active?.state?.state||""),
    wave:Number(window.CCGLostSizzlerSpecialModes?.active?.state?.wave||0),
    authoritative:Boolean(window.CCGLostSizzlerSpecialModes?.active?.authoritative),
    expected:window.CCGLostSizzlerV141R55FinalPlaytestCleanup?.expectedAuthority?.(),
    dedicatedLive:Boolean(window.CCGLostSizzlerV141R38ColyseusHorde?.state?.authorityLive),
    bannerVisible:document.getElementById("horde-transition-banner")?.dataset?.visible,
    physicalEnemies:(host?.enemies||[]).filter(enemy=>enemy?.alive&&enemy?.hordeEnemy).length,
    r55:{...window.CCGLostSizzlerV141R55FinalPlaytestCleanup?.state}
  }));
  assert.equal(horde.phase,"wave",`Solo Horde must leave briefing and enter Wave 1: ${JSON.stringify(horde)}`);
  assert.equal(horde.wave,1,`Solo Horde must commence Wave 1: ${JSON.stringify(horde)}`);
  assert.equal(horde.authoritative,true,`Solo Horde must keep browser authority: ${JSON.stringify(horde)}`);
  assert.equal(horde.expected,true,`R55 authority policy must select local authority for Solo Horde: ${JSON.stringify(horde)}`);
  assert.equal(horde.dedicatedLive,false,"Solo Horde must not treat the dormant dedicated transport as live authority");
  assert.equal(horde.bannerVisible,"false",`HORDE SURVIVOR centre banner must disappear once Wave 1 begins: ${JSON.stringify(horde)}`);
  assert.ok(horde.physicalEnemies>=1,`Wave 1 must materialise live Horde enemies: ${JSON.stringify(horde)}`);
  assert.deepEqual(pageErrors,[],`R55 browser regression produced page errors: ${pageErrors.join("\n")}`);

  await context.close();
  console.log("R55 rendered menu and Horde progression browser regression passed.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
