import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const runtimeModules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const runtimeRequire=createRequire(path.join(runtimeModules||path.dirname(fileURLToPath(import.meta.url)),'runtime-loader.cjs'));
let chromium;for(const name of ['playwright','playwright-core']){try{({chromium}=runtimeRequire(name));break}catch{}}
if(!chromium){console.log('V10.8 layout browser checks skipped: Playwright is not installed');process.exit(0)}
const candidates=[process.env.CHROMIUM_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);let executablePath=candidates.find(x=>fs.existsSync(x));if(!executablePath){try{const p=chromium.executablePath();if(p&&fs.existsSync(p))executablePath=p}catch{}}
if(!executablePath){console.log('V10.8 layout browser checks skipped: Chromium is unavailable');process.exit(0)}

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav'};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname),rel=pathname.endsWith('/')?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${rel}`);if(!file.startsWith(repo)){res.writeHead(403).end();return}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('not found');return}res.setHeader('content-type',mime[path.extname(file)]||'application/octet-stream');res.end(data)})});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/games/ccg-games/cheeky-commodore-quest/`;
const browser=await chromium.launch({headless:true,executablePath});

async function checkViewport(width,height,label){
  const context=await browser.newContext({viewport:{width,height}});
  await context.addInitScript(()=>{let fsEl=null;Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>fsEl});Element.prototype.requestFullscreen=function(){fsEl=this;document.dispatchEvent(new Event('fullscreenchange'));return Promise.resolve()};document.exitFullscreen=()=>{fsEl=null;document.dispatchEvent(new Event('fullscreenchange'));return Promise.resolve()};window.ccgSupabase={getClient:async()=>null}});
  const page=await context.newPage();
  try{
    await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.body.dataset.gameReady==='true');
    await page.locator('#solo-btn').click();await page.waitForFunction(()=>document.body.dataset.runActive==='true');await page.waitForTimeout(150);
    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));assert.ok(overflow.sw<=overflow.cw+4,`${label}: no accidental horizontal gameplay overflow ${JSON.stringify(overflow)}`);
    const tacticalVisible=await page.locator('.tactical-zone').isVisible();
    if(tacticalVisible){
      const radar=await page.locator('.radar-card').boundingBox(),dock=await page.locator('.shortcut-dock').boundingBox();assert.ok(radar&&dock,`${label}: radar and inventory dock render`);assert.ok(dock.y+2>=radar.y+radar.height,`${label}: inventory remains below radar without overlap`);assert.ok(radar.x>=-2&&radar.x+radar.width<=width+2,`${label}: radar stays inside viewport`);assert.ok(dock.x>=-2&&dock.x+dock.width<=width+2,`${label}: inventory dock stays inside viewport`);
    }
    await page.evaluate(()=>showToast('FULLSCREEN TEST','Bright gameplay notification test','green',9000));await page.waitForTimeout(50);const toast=page.locator('#pickup-toast');if(await toast.isVisible()){const style=await toast.evaluate(el=>{const s=getComputedStyle(el),title=getComputedStyle(el.querySelector('#pickup-title'));return{opacity:Number(s.opacity),border:s.borderTopColor,background:s.backgroundColor,titleWeight:Number(title.fontWeight)||0,titleColor:title.color}});assert.ok(style.opacity>=.8,`${label}: fullscreen notification remains bold/opaque`);assert.ok(style.titleWeight>=600,`${label}: notification title remains bold`);assert.notEqual(style.titleColor,'rgb(128, 128, 128)',`${label}: notification title is not washed grey`)}
    if(width<=500){await page.evaluate(()=>toggleInventory());await page.locator('#inventory-panel:not(.hidden)').waitFor();const close=await page.locator('#inventory-close-top').boundingBox();assert.ok(close&&close.y>=0&&close.y+close.height<=height+2,`${label}: mobile portrait Back to Game remains reachable`)}
  }finally{await page.close();await context.close()}
}

try{for(const [w,h,label] of [[1920,1080,'1920x1080'],[1600,900,'1600x900'],[1366,768,'1366x768'],[1024,768,'tablet landscape'],[844,390,'phone landscape'],[390,844,'phone portrait']])await checkViewport(w,h,label);console.log('Lost Sizzler V10.8 multi-viewport layout checks passed')}finally{await browser.close();await new Promise(r=>server.close(r))}
