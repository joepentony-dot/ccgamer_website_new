import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
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
  await page.goto(`${origin}/arcade/lost-sizzler/?r50-nightmare-cassette=1&bugreport=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerCollectibleEffects?.diagnostics&&window.CCGLostSizzlerEffectsV105?.trigger);
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1),null,{timeout:20000});

  const result=await page.evaluate(async()=>{
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const title="A Nightmare On Elm Street";
    const reporter=window.CCGLostSizzlerBugReporter;
    const startEventCount=reporter?.events?.length||0;
    p1.rapidMs=0;
    const beforeWraith=(host.enemies||[]).filter(enemy=>enemy?.alive&&enemy.horrorCreature).length;

    await window.CCGLostSizzlerCollectibleEffects.trigger(title,p1);
    await window.CCGLostSizzlerEffectsV105.trigger(title,p1);
    await wait(240);

    const first=window.CCGLostSizzlerCollectibleEffects.diagnostics();
    const rapidAfter=Number(p1.rapidMs||0);
    const afterWraith=(host.enemies||[]).filter(enemy=>enemy?.alive&&enemy.horrorCreature).length;
    const events=(reporter?.events||[]).slice(startEventCount);
    const effectTypes=events.filter(event=>event.type==="collectible-effect"&&event.detail?.title===title).map(event=>event.detail.effectType);
    const sfx=events.filter(event=>event.type==="sfx").map(event=>event.detail?.name);

    await wait(2300);
    const settled=window.CCGLostSizzlerCollectibleEffects.diagnostics();

    mode="paused";
    await wait(180);
    const paused=window.CCGLostSizzlerCollectibleEffects.diagnostics();
    mode="playing";

    return{beforeWraith,afterWraith,rapidAfter,first,settled,paused,effectTypes,sfx};
  });

  assert.equal(result.afterWraith,result.beforeWraith+1,"Nightmare cassette must still summon exactly one Archive Wraith");
  assert.ok(result.rapidAfter>0,"Nightmare cassette must retain its arcade-frenzy rapid-fire bonus");
  assert.ok(result.effectTypes.includes("spawn_horror_creature"),"diagnostics must record the horror half of the dual-genre cassette");
  assert.ok(result.effectTypes.includes("arcade_frenzy"),"diagnostics must record the arcade half of the dual-genre cassette");
  assert.ok(result.sfx.includes("creak"),"Archive Wraith arrival must have its own horror cue");
  assert.ok(!result.sfx.includes("stalker"),"Archive Wraith arrival must not impersonate the Death Stalker sting");
  assert.equal(result.first.horrorMusicActive,true,"Archive Wraith ambience must activate while the creature is alive");
  assert.ok(result.first.horrorNodeCount>0&&result.first.horrorNodeCount<=6,"horror ambience must use a bounded persistent node set");
  assert.equal(result.settled.horrorNodeCount,result.first.horrorNodeCount,"horror ambience must not allocate new oscillator nodes every beat");
  assert.equal(result.paused.horrorMusicActive,false,"horror ambience must stop outside active gameplay");
  assert.equal(result.paused.horrorNodeCount,0,"paused horror ambience must disconnect its node set");

  console.log("Dungeon Carnage r50 Nightmare cassette stability browser contract passed.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
