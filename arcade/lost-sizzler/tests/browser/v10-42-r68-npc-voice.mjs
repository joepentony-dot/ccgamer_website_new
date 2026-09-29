import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?pathname+"index.html":pathname,file=path.resolve(repo,"."+relative);
    if(!file.startsWith(repo+path.sep)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true")}catch(_){}});
  const page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(origin+"/arcade/lost-sizzler/?r68-npc-voice=1",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerStage8NpcDialogue)&&typeof window.CCGLostSizzlerVoice?.sayDialogue==="function",null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(host)&&Boolean(p1),null,{timeout:20000});

  const scout=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue,voice=window.CCGLostSizzlerVoice,calls=[];
    const original=voice.sayDialogue;
    voice.sayDialogue=(key,text,opts)=>{calls.push({key,text,opts:{priority:opts?.priority,cooldown:opts?.cooldown,interrupt:opts?.interrupt}});return true};
    const rescue={id:"r68-voice-scout",x:p1.x,y:p1.y,rescued:false,following:true,found:true};
    host.rescue=rescue;
    const before=api.state.presentations;
    const first=api.presentScout(p1,{force:true,stateKey:"trapped"});
    const afterFirst=api.state.presentations;
    const repeated=api.presentScout(p1,{stateKey:"trapped"});
    const afterRepeat=api.state.presentations;
    voice.sayDialogue=original;
    return{first,repeated,calls,presentedFirst:afterFirst-before,presentedRepeat:afterRepeat-afterFirst,last:{...api.state.last},toast:String(document.getElementById("pickup-text")?.textContent||"")};
  });

  assert.equal(scout.first,true,"focused Scout contact must present its dialogue line");
  assert.equal(scout.presentedFirst,1,"Scout contact must create exactly one dialogue presentation");
  assert.equal(scout.calls.length,1,"one Scout presentation must create exactly one voice request");
  assert.equal(scout.calls[0].key,"npc.scout.found","Scout voice request must use its stable local/recorded-override key");
  assert.match(scout.calls[0].text,/There you are/,"Scout voice request must carry the actual character dialogue");
  assert.equal(scout.calls[0].opts.interrupt,false,"ordinary NPC dialogue must not interrupt a higher-priority active voice");
  assert.equal(scout.repeated,false,"immediate repeated Scout contact must be suppressed by the existing dialogue memory window");
  assert.equal(scout.presentedRepeat,0,"suppressed Scout dialogue must not produce another presentation");
  assert.equal(scout.calls.length,1,"suppressed Scout dialogue must not create another voice request");
  assert.match(scout.toast,/Scout: There you are/,"spoken Scout dialogue must remain fully visible as text");

  const merchant=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue,voice=window.CCGLostSizzlerVoice,calls=[];
    const original=voice.sayDialogue;
    voice.sayDialogue=(key,text,opts)=>{calls.push({key,text,opts});return true};
    const shop={active:true,x:p1.x,y:p1.y,shopType:"hidden",title:"SECRET ARTEFACT TRADER"};
    const shown=api.presentMerchant(shop,{force:true});
    voice.sayDialogue=original;
    return{shown,calls,last:{...api.state.last},mode:String(mode)};
  });
  assert.equal(merchant.shown,true,"hidden Trader must remain available through the existing non-blocking dialogue surface");
  assert.equal(merchant.calls.length,1,"one Trader presentation must create exactly one voice request");
  assert.equal(merchant.calls[0].key,"npc.merchant.hidden","hidden Trader must use its stable recorded-override key");
  assert.match(merchant.calls[0].text,/Banishment Flask/,"Trader voice request must carry the actual trade guidance");
  assert.equal(merchant.mode,"playing","direct character speech must not introduce a dialogue gameplay mode");

  assert.deepEqual(errors,[],"R68 NPC voice browser contract must not raise page errors: "+errors.join("\n"));
  console.log("C64 Dungeon Carnage R68 NPC dialogue voice browser contract passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
