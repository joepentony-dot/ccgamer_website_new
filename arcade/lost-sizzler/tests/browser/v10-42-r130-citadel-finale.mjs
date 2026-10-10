import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".jpg":"image/jpeg",".mp3":"audio/mpeg",".wav":"audio/wav",".ogg":"audio/ogg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    const relative=pathname.endsWith("/")?pathname+"index.html":pathname;
    const file=path.resolve(repo,"."+relative);
    if(!file.startsWith(repo+path.sep)||!fs.existsSync(file)){res.writeHead(404).end("not found");return}
    fs.readFile(file,(err,data)=>{
      if(err){res.writeHead(404).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream","cache-control":"no-store","connection":"close"});res.end(data);
    });
  }catch(error){res.writeHead(500).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  for(const testCase of [
    {name:"desktop",viewport:{width:1440,height:900},reducedMotion:"no-preference"},
    {name:"mobile",viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:"reduce"}
  ]){
    const {name:deviceName,...contextOptions}=testCase;
    const context=await browser.newContext(contextOptions);
    await context.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
    await context.addInitScript(()=>{
      localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");
      localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true");
    });
    const page=await context.newPage();
    page.setDefaultTimeout(30000);
    const errors=[];
    page.on("pageerror",err=>errors.push(String(err.stack||err)));
    await page.goto(origin+"/arcade/lost-sizzler/?r130-victory-browser=1",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142Bootstrap?.ready),null,{timeout:90000});
    await page.locator("#solo-btn").click({noWaitAfter:true});
    await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(run&&p1),null,{timeout:30000});
    const completion=await page.evaluate(()=>{
      // Test only: drive the *real* canonical endRun UI after a controlled
      // last-floor winning fixture. No production save/reward logic is replaced.
      window.__r130MusicCalls=0;
      window.CCGEndCreditsMusic={play(){window.__r130MusicCalls++}};
      run.floor=15;run.deepest=15;run.dailyFailed=false;run.xpGameOver=false;
      run.elapsed=123000;run.stats.kills=27;run.stats.secrets=4;
      run.enemyDefeats=[{name:"Dustweb Spider",kind:"spider",count:2,floors:[{floor:15,count:2}],killers:[]}];
      run.v104CollectedGameHistory=["Bruce Lee"];
      p1.level=9;score=1234;
      endRun("Citadel cleared");
      return{
        mode:String(mode),runComplete:Boolean(run.runComplete),musicCalls:window.__r130MusicCalls,
        title:document.querySelector("#v130-victory-heading")?.textContent?.trim(),
        ceremony:document.querySelectorAll("#v108-completion-credits").length,
        scoreboard:document.querySelector("#v130-victory-scoreboard")?.textContent?.replace(/\s+/g," ").trim(),
        bestiary:document.querySelector("#v106-enemy-credits")?.textContent?.includes("Dustweb Spider"),
        games:document.querySelector("#v104-retro-credits")?.textContent?.includes("Bruce Lee"),
        sprites:document.querySelectorAll("#v106-enemy-credits canvas[data-enemy-avatar-index]").length,
        reduced:matchMedia("(prefers-reduced-motion: reduce)").matches,
        animation:getComputedStyle(document.querySelector(".v130-final-chapter")).animationName,
        panelScrollable:Boolean(document.querySelector("#end>.panel")?.scrollHeight>=document.querySelector("#end>.panel")?.clientHeight)
      };
    });
    assert.equal(completion.mode,"ended",testCase.name+" must use canonical ended mode");
    assert.equal(completion.runComplete,true);
    assert.equal(completion.ceremony,1,"one winning ceremony must be mounted");
    assert.match(completion.title,/BLOOD CITADEL CLEARED/);
    assert.match(completion.scoreboard,/1,234/);
    assert.match(completion.scoreboard,/2:03/);
    assert.equal(completion.bestiary,true,"actual defeated enemy entries must remain visible");
    assert.equal(completion.games,true,"collected C64 games must remain visible");
    assert.equal(completion.sprites,1,"existing in-game enemy-sprite canvas must survive");
    assert.equal(completion.musicCalls,1,"owner hook must fire once");
    assert.equal(completion.panelScrollable,true,"the credits panel must permit full viewing");
    assert.equal(completion.reduced,testCase.reducedMotion==="reduce");
    if(completion.reduced)assert.equal(completion.animation,"none","reduced motion must suppress chapter animations");
    await page.locator("#v130-jump-bestiary").click();
    assert.equal(await page.evaluate(()=>document.activeElement?.id),"v106-enemy-credits","bestiary skip must move keyboard focus");
    await page.locator("#v130-jump-pickups").click();
    assert.equal(await page.evaluate(()=>document.activeElement?.id),"v104-retro-credits","C64 pickup jump must move keyboard focus");
    const post=await page.evaluate(()=>({musicCalls:window.__r130MusicCalls,ceremonies:document.querySelectorAll("#v108-completion-credits").length}));
    assert.equal(post.musicCalls,1,"async catalogue enrichment must not replay music");
    assert.equal(post.ceremonies,1,"async catalogue enrichment must not duplicate finale");
    assert.deepEqual(errors,[],testCase.name+" must have no uncaught browser errors");
    console.log("R130 actual "+testCase.name+" browser finale validated: "+JSON.stringify(completion));
    await context.close();
  }
}finally{
  await browser.close().catch(()=>{});
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
