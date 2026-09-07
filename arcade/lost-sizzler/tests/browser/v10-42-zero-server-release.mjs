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

  await page.goto(`${origin}/arcade/lost-sizzler/?zero-server-release=1`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.v142BootstrapReady==='true'&&Boolean(window.CCGLostSizzlerV142ZeroServerRelease),null,{timeout:90000});

  const state=await page.evaluate(()=>({
    releaseModel:document.body.dataset.releaseModel,
    onlineFlag:document.body.dataset.onlineMultiplayer,
    api:window.CCGLostSizzlerV142ZeroServerRelease,
    bootstrap:[...(window.CCGLostSizzlerV142Bootstrap?.loaded||[])],
    visible:Object.fromEntries(['solo-btn','tutorial-zone-btn','split-btn','daily-btn','create-btn','horde-mode-btn','saboteurs-mode-btn','join-btn'].map(id=>{
      const node=document.getElementById(id);return[id,Boolean(node&&!node.hidden&&getComputedStyle(node).display!=='none')]
    })),
    onlineHowtoVisible:(()=>{const node=document.querySelector('.online-howto');return Boolean(node&&!node.hidden&&getComputedStyle(node).display!=='none')})(),
    joinRowVisible:(()=>{const node=document.querySelector('.join-row');return Boolean(node&&!node.hidden&&getComputedStyle(node).display!=='none')})(),
    weeklyPresent:Boolean(document.getElementById('weekly-vault')),
    networkConnected:Boolean(net?.connected),
    networkTransport:String(net?.transport||'')
  }));

  assert.equal(state.releaseModel,'zero-server-cost');
  assert.equal(state.onlineFlag,'disabled');
  assert.equal(state.api?.onlineMultiplayer,false);
  assert.deepEqual([...state.api.localModes],['solo','tutorial','split-screen']);
  assert.equal(state.api?.supabaseAccountFeatures,true);
  assert.equal(state.visible['solo-btn'],true,'Solo must remain available.');
  assert.equal(state.visible['tutorial-zone-btn'],true,'Tutorial must remain available.');
  assert.equal(state.visible['split-btn'],true,'2P Split Screen must remain available.');
  assert.equal(state.visible['daily-btn'],true,'Supabase-backed Weekly Vault may remain available.');
  for(const id of ['create-btn','horde-mode-btn','saboteurs-mode-btn','join-btn'])assert.equal(state.visible[id],false,`${id} must not be a production entry point.`);
  assert.equal(state.onlineHowtoVisible,false,'Online multiplayer instructions must be removed from the release menu.');
  assert.equal(state.joinRowVisible,false,'Room-code entry must be removed from the release menu.');
  assert.equal(state.weeklyPresent,true,'Weekly Vault account feature must remain present.');
  assert.equal(state.networkConnected,false,'Zero-server release must not start connected to a multiplayer room.');
  assert.equal(state.networkTransport,'solo','Zero-server release network object must remain in inert Solo state.');
  assert.ok(!state.bootstrap.includes('v10-42-multiplayer-state.js'),'Online multiplayer state adapter must not load in production V10.42.');
  assert.ok(!state.bootstrap.includes('v10-42-multiplayer-collect-authority.js'),'Online collection authority bridge must not load in production V10.42.');
  assert.ok(state.bootstrap.includes('v10-42-zero-server-release.js'),'Zero-server release policy must load in production V10.42.');

  const blocked=await page.evaluate(async()=>{
    try{await net.createOnlineRoom('ABCDE','TEST',{mode:'dungeon'});return{blocked:false}}catch(error){return{blocked:true,code:error?.code||'',message:String(error?.message||error)}}
  });
  assert.equal(blocked.blocked,true,'Direct legacy room creation must be blocked even when called programmatically.');
  assert.equal(blocked.code,'online_multiplayer_disabled');

  await page.click('#solo-btn');
  await page.waitForFunction(()=>document.body.dataset.runActive==='true'&&mode==='playing'&&Boolean(p1),null,{timeout:20000});
  assert.equal(await page.evaluate(()=>Boolean(net?.connected)),false,'Starting Solo must not create a multiplayer connection.');

  assert.deepEqual(errors,[],`Zero-server release regression must not raise page errors: ${errors.join('\n')}`);
  console.log('Lost Sizzler V10.42 zero-server release browser regression passed.');
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
