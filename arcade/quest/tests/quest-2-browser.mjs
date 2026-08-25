import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../../..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
  const relative=pathname.endsWith('/')?`${pathname}index.html`:pathname;
  const file=path.resolve(repo,`.${relative}`);
  if(!file.startsWith(repo)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end('not found');return;}res.setHeader('content-type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/arcade/quest/`;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1600,height:900}});
const pageErrors=[];
page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)));
await page.route('https://lcslgxpgmttaexsorxik.supabase.co/**',route=>route.abort());

async function waitMode(mode){await page.waitForFunction(expected=>window.CCGQuestDebug?.getState?.().mode===expected,mode,{timeout:12000});}
async function practice(id,mode){await page.evaluate(level=>window.CCGQuestDebug.practice(level),id);await waitMode(mode);await page.waitForTimeout(220);assert.equal((await page.evaluate(()=>window.CCGQuestDebug.getState().mode)),mode,`${id} stays alive in ${mode}`);}

try{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.CCGQuestDebug&&document.getElementById('loading')?.classList.contains('is-hidden'),null,{timeout:20000});
  let state=await page.evaluate(()=>window.CCGQuestDebug.getState());
  assert.equal(state.mode,'title','Quest 2.0 reaches the title screen');
  assert.equal(await page.locator('#game').getAttribute('width'),'1600');
  assert.equal(await page.locator('#game').getAttribute('height'),'900');

  await page.evaluate(()=>window.CCGQuestDebug.startQuest());
  await waitMode('stage');
  state=await page.evaluate(()=>window.CCGQuestDebug.getState());
  const stand=state.player.box;
  assert.ok(stand.h>=100,`standing collision remains full height: ${JSON.stringify(stand)}`);
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(120);
  state=await page.evaluate(()=>window.CCGQuestDebug.getState());
  assert.equal(state.player.duck,true,'ArrowDown enters the crouch state');
  assert.ok(state.player.box.h>=82&&state.player.box.h<=96,`crouch collision stays useful without becoming an extreme squat: ${JSON.stringify(state.player.box)}`);
  assert.ok(state.player.box.h<stand.h*.9,'crouch still reduces collision height materially');
  await page.keyboard.up('ArrowDown');

  await page.keyboard.press('Space');
  await page.waitForTimeout(380);
  state=await page.evaluate(()=>window.CCGQuestDebug.getState());
  assert.ok(state.player.y<415,`jump rises high enough to intersect the high collectible lane: ${JSON.stringify(state.player)}`);

  for(const id of ['bedroom','budget','christmas','amiga','guru'])await practice(id,'stage');
  await practice('beads','beads');
  await practice('fighter','fighter');
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(100);
  state=await page.evaluate(()=>window.CCGQuestDebug.getState());
  assert.equal(state.player.duck,true,'fighter mode has a crouch state');
  assert.ok(state.player.box.h>=160&&state.player.box.h<=185,`fighter crouch is reduced without collapsing the sprite: ${JSON.stringify(state.player.box)}`);
  await page.keyboard.up('ArrowDown');
  await practice('invaders','invaders');
  await practice('maze','maze');

  const canvasSignal=await page.evaluate(()=>{
    const c=document.getElementById('game'),g=c.getContext('2d'),pts=[[800,450],[100,100],[1400,700],[800,100]];
    return pts.map(([x,y])=>Array.from(g.getImageData(x,y,1,1).data)).some(px=>px[3]>0&&(px[0]+px[1]+px[2])>10);
  });
  assert.equal(canvasSignal,true,'canvas contains rendered Quest 2.0 output');
  assert.deepEqual(pageErrors,[],`Quest 2.0 produced browser runtime errors: ${pageErrors.join('\n')}`);
  console.log('Commodore Quest 2.0 balanced-pass Chromium smoke test passed');
}finally{
  await page.close().catch(()=>{});
  await browser.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
}
