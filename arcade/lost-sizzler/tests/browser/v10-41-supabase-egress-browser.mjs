import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../../../..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.wav':'audio/wav','.ogg':'audio/ogg','.mp3':'audio/mpeg'};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
    const relative=pathname.endsWith('/')?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end('forbidden');return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:'close'}).end('not found');return}res.writeHead(200,{'content-type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','cache-control':'no-store',connection:'close'});res.end(data)});
  }catch(error){res.writeHead(500,{connection:'close'}).end(String(error))}
});
server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--disable-background-networking','--autoplay-policy=no-user-gesture-required']});

try{
  const context=await browser.newContext({viewport:{width:1366,height:768}});
  const page=await context.newPage();
  page.setDefaultTimeout(45000);
  const remoteMusicRequests=[];
  page.on('request',request=>{
    const url=request.url();
    if(/\.supabase\.co\/storage\/v1\/object\//i.test(url)&&/\/music\//i.test(url))remoteMusicRequests.push(url);
  });

  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==='true'&&window.CCG_ADMIN_AUDIO_READY===true&&Boolean(window.CCGLostSizzlerPlaylistAudio));

  const policy=await page.evaluate(()=>({
    skipped:Boolean(window.CCG_ADMIN_AUDIO?.remoteMediaSkipped),
    reason:String(window.CCG_ADMIN_AUDIO?.skipReason||''),
    webdriver:Boolean(navigator.webdriver),
    remoteAllowed:Boolean(window.CCGLostSizzlerRemoteMediaPolicy?.remoteMediaAllowed?.())
  }));
  assert.equal(policy.webdriver,true,'Playwright must expose webdriver mode for the remote-media guard.');
  assert.equal(policy.skipped,true,`Headless canonical load must skip Supabase audio: ${JSON.stringify(policy)}`);
  assert.equal(policy.remoteAllowed,false,'Remote-media policy must remain closed in the canonical headless browser.');

  await page.evaluate(()=>document.getElementById('solo-btn')?.click());
  await page.waitForFunction(()=>document.body.dataset.runActive==='true'&&typeof p1!=='undefined'&&Boolean(p1));
  await page.waitForTimeout(1600);

  const audioState=await page.evaluate(()=>window.CCGLostSizzlerPlaylistAudio?.getState?.());
  assert.ok(audioState,'Playlist diagnostics must remain available in the canonical run.');
  assert.ok(!String(audioState.url||'').includes('supabase.co/storage/'),`Headless run must use bundled/local audio, got ${audioState.url}`);
  assert.deepEqual(remoteMusicRequests,[],`Canonical Chromium validation must make zero Supabase Storage music requests: ${remoteMusicRequests.join('\n')}`);

  console.log('Lost Sizzler canonical Chromium run made zero Supabase Storage music requests.');
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
