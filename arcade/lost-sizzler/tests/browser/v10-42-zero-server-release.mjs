import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../../../..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://local'),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith('/')?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end('forbidden');return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:'close'}).end('not found');return}res.writeHead(200,{'content-type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','cache-control':'no-store',connection:'close'});res.end(data)});
  }catch(error){res.writeHead(500,{connection:'close'}).end(String(error))}
});
server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--disable-background-networking','--autoplay-policy=no-user-gesture-required']});

try{
  const context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?local-release=1`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.v142BootstrapReady==='true'&&Boolean(window.CCGLostSizzlerV142ZeroServerRelease),null,{timeout:90000});

  const state=await page.evaluate(()=>({
    releaseModel:document.body.dataset.releaseModel,
    api:window.CCGLostSizzlerV142ZeroServerRelease,
    bootstrap:[...(window.CCGLostSizzlerV142Bootstrap?.loaded||[])],
    gameVisible:(()=>{const node=document.getElementById('solo-btn');return Boolean(node&&!node.hidden&&getComputedStyle(node).display!=='none'&&node.textContent.trim()==='Start Game')})(),
    tutorialVisible:(()=>{const node=document.getElementById('tutorial-zone-btn');return Boolean(node&&!node.hidden&&getComputedStyle(node).display!=='none')})(),
    retiredIds:['split-btn','daily-btn','create-btn','horde-mode-btn','saboteurs-mode-btn','join-btn','online-lobby'].filter(id=>Boolean(document.getElementById(id))),
    releaseNote:document.getElementById('release-note')?.textContent||''
  }));

  assert.equal(state.releaseModel,'local-browser');
  assert.equal(state.api?.releaseModel,'local-browser');
  assert.deepEqual([...state.api.localModes],['game','tutorial']);
  assert.equal(state.api?.supabaseAccountFeatures,true);
  assert.equal(state.gameVisible,true,'The main Start Game action must remain available.');
  assert.equal(state.tutorialVisible,true,'Tutorial must remain available.');
  assert.deepEqual(state.retiredIds,[],'Retired alternate-mode controls must be absent from the production DOM.');
  assert.match(state.releaseNote,/Start the main game or use the Tutorial/i);
  assert.ok(state.bootstrap.includes('v10-42-zero-server-release.js'),'Local release policy must load in production V10.42.');
  assert.ok(!state.bootstrap.some(file=>/(multiplayer|network|split|online)/i.test(file)),'Production bootstrap must not load retired alternate-mode transports.');

  const schedulerAdvanced=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true)))));
  assert.equal(schedulerAdvanced,true,'Local release menu enforcement must not starve animation/layout scheduling.');
  const menuBox=await page.locator('#menu').boundingBox({timeout:5000});
  assert.ok(menuBox&&menuBox.width>1500&&menuBox.height>900,`Local start menu must complete viewport layout: ${JSON.stringify(menuBox)}`);

  await page.click('#solo-btn');
  await page.waitForFunction(()=>document.body.dataset.runActive==='true'&&mode==='playing'&&Boolean(p1),null,{timeout:20000});

  assert.deepEqual(errors,[],`Local release regression must not raise page errors: ${errors.join('\n')}`);
  console.log('C64 Dungeon Carnage V10.42 local release browser regression passed.');
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
