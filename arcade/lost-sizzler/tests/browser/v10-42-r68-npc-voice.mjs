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
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true")}catch(_){}});
  const page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(origin+"/arcade/lost-sizzler/?r68-npc-voice=1",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerStage8NpcDialogue)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  const startup=await page.evaluate(()=>({
    releaseReady:document.body.dataset.releaseReady||"",
    bootstrapReady:document.body.dataset.v142BootstrapReady||"",
    stage8:Boolean(window.CCGLostSizzlerStage8NpcDialogue),
    voice:Boolean(window.CCGLostSizzlerVoice),
    sayDialogue:typeof window.CCGLostSizzlerVoice?.sayDialogue,
    releaseFailed:Boolean(window.CCGLostSizzlerReleaseGate?.state?.failed),
    releaseErrors:[...(window.CCGLostSizzlerReleaseGate?.state?.errors||[])],
    bootstrapError:String(window.CCGLostSizzlerV142Bootstrap?.error||"")
  }));
  assert.equal(startup.releaseReady,"true",`R68 release startup failed before NPC voice qualification: ${JSON.stringify(startup)}`);
  assert.equal(startup.stage8,true,`Stage 8 NPC dialogue API missing after release startup: ${JSON.stringify(startup)}`);
  assert.equal(startup.voice,true,`voice director missing after release startup: ${JSON.stringify(startup)}`);
  assert.equal(startup.sayDialogue,"function",`NPC dialogue speech API missing after release startup: ${JSON.stringify(startup)}`);
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
    const toast=String(document.getElementById("pickup-text")?.textContent||"");
    const queued=(Array.isArray(toastQueue)?toastQueue:[]).map(entry=>({title:String(entry?.title||""),text:String(entry?.text||"")}));
    const priorityPending=window.CCGLostSizzlerV141LandingNotificationPolish?.state?.pendingImportant;
    const priorityQueued=Array.isArray(priorityPending)?{title:String(priorityPending[0]||""),text:String(priorityPending[1]||"")}:null;
    return{first,repeated,calls,presentedFirst:afterFirst-before,presentedRepeat:afterRepeat-afterFirst,last:{...api.state.last},toast,queued,priorityQueued};
  });

  assert.equal(scout.first,true,"focused Scout contact must present its dialogue line");
  assert.equal(scout.presentedFirst,1,"Scout contact must create exactly one dialogue presentation");
  assert.equal(scout.calls.length,1,"one Scout presentation must create exactly one voice request");
  assert.equal(scout.calls[0].key,"npc.scout.found","Scout voice request must use its stable local/recorded-override key");
  assert.match(scout.calls[0].text,/Thank God you found me/,"Scout voice request must carry the supplied recorded character dialogue");
  assert.equal(scout.calls[0].opts.interrupt,false,"ordinary NPC dialogue must not interrupt a higher-priority active voice");
  assert.equal(scout.repeated,false,"immediate repeated Scout contact must be suppressed by the existing dialogue memory window");
  assert.equal(scout.presentedRepeat,0,"suppressed Scout dialogue must not produce another presentation");
  assert.equal(scout.calls.length,1,"suppressed Scout dialogue must not create another voice request");
  assert.ok(/Scout: Thank God you found me/.test(scout.toast)||scout.queued.some(entry=>/Scout: Thank God you found me/.test(entry.text))||/Scout: Thank God you found me/.test(scout.priorityQueued?.text||""),`spoken Scout dialogue must remain visible or deferred by a supported notification owner: ${JSON.stringify({toast:scout.toast,queued:scout.queued,priorityQueued:scout.priorityQueued})}`);

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
  assert.match(merchant.calls[0].text,/You found me\. That usually means you’ve been nosing around/,"Trader voice request must carry the supplied recorded first-contact line");
  assert.equal(merchant.mode,"playing","direct character speech must not introduce a dialogue gameplay mode");

  assert.deepEqual(errors,[],"R68 NPC voice browser contract must not raise page errors: "+errors.join("\n"));
  console.log("C64 Dungeon Carnage R69 recorded NPC dialogue voice browser contract passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
