import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".png":"image/png",".webp":"image/webp",".svg":"image/svg+xml",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?pathname+"index.html":pathname;
    const file=path.resolve(repo,"."+relative);
    if(!file.startsWith(repo+path.sep)){res.writeHead(403).end("forbidden");return;}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{"cache-control":"no-store"}).end("not found");return;}
      res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream","cache-control":"no-store"}).end(data);
    });
  }catch(error){res.writeHead(500).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage"]});
try{
  for(const profile of [{name:"desktop",width:1280,height:900,isMobile:false},{name:"portrait",width:390,height:844,isMobile:true}]){
    const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:profile.isMobile,hasTouch:profile.isMobile,deviceScaleFactor:1});
    try{
      await context.addInitScript(()=>{
        localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");
        localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true");
      });
      const page=await context.newPage();
      page.setDefaultTimeout(45000);
      const errors=[];
      page.on("pageerror",error=>errors.push(String(error)));
      await page.goto(origin+"/arcade/lost-sizzler/?r135-chest-art=1",{waitUntil:"load"});
      await page.waitForFunction(()=>document.body.dataset.v142BootstrapReady==="true",null,{timeout:90000});
      await page.locator("#solo-btn").click({noWaitAfter:true});
      await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&Boolean(globalThis.eval("typeof host!=='undefined'&&typeof p1!=='undefined'")),null,{timeout:60000});
      await page.waitForFunction(()=>{
        try{return Boolean(globalThis.eval("(lostSizzlerPixelAssets.chestFrames||[]).length===3&&(lostSizzlerPixelAssets.chestFrames||[]).every(image=>image?.complete&&image?.naturalWidth===32)"))}
        catch{return false}
      },null,{timeout:45000});
      const result=await page.evaluate(()=>globalThis.eval("("+(()=>{
        const frames=lostSizzlerPixelAssets.chestFrames;
        const chest={x:Math.round(p1.x),y:Math.round(p1.y),active:true,openedAt:0,locked:false,loot:{rarity:"COMMON"}};
        const previous=host.chests;
        const saved=ctx.drawImage;
        const result={frames:frames.map(image=>({src:String(image.src),width:image.naturalWidth,height:image.naturalHeight})),states:[]};
        host.chests=[chest];
        const seen=[];
        ctx.drawImage=function(image,...args){seen.push(String(image?.src||""));return saved.call(this,image,...args)};
        try{
          focus=p1;
          for(const [label,offset] of [["closed",0],["opening",350],["open",1200]]){
            chest.openedAt=offset?performance.now()-offset:0;
            seen.length=0;
            drawChests();
            result.states.push({label,drawn:seen.filter(x=>x.includes("/user-r135/will-tice-chest-"))});
          }
        }finally{ctx.drawImage=saved;host.chests=previous}
        return result;
      }).toString()+")()"));
      assert.equal(result.frames.length,3,profile.name+" must decode three chest sprites");
      result.frames.forEach((row,i)=>{
        assert.ok(row.src.includes("/assets/pixel/user-r135/will-tice-chest-"+i+".png"),profile.name+" chest source "+i+" must match approved free pack");
        assert.equal(row.width,32);
        assert.equal(row.height,32);
      });
      result.states.forEach((row,i)=>{
        assert.equal(row.drawn.length,1,profile.name+" "+row.label+" must draw exactly one R135 chest sprite: "+JSON.stringify(result));
        assert.ok(row.drawn[0].includes("will-tice-chest-"+i+".png"),profile.name+" "+row.label+" should draw the correct frame: "+JSON.stringify(result));
      });
      assert.deepEqual(errors,[],profile.name+" must not produce a page exception");
      console.log("PASS R135 "+profile.name+" real Chromium closed/opening/open chest artwork");
    }finally{await context.close()}
  }
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
