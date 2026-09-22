#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const MIME={
  ".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",
  ".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",
  ".webp":"image/webp",".gif":"image/gif",".ogg":"audio/ogg",".mp3":"audio/mpeg",".wav":"audio/wav"
};
function fail(message){throw new Error(message)}
function parse(argv){
  const index=argv.indexOf("--root");
  if(index<0||!argv[index+1])fail("--root <itch-package-directory> is required");
  return path.resolve(argv[index+1]);
}
function serverFor(root){
  return http.createServer((req,res)=>{
    try{
      const url=new URL(req.url||"/","http://127.0.0.1");
      const raw=decodeURIComponent(url.pathname==="/"?"/index.html":url.pathname);
      const relative=raw.replace(/^\/+/,"");
      const file=path.resolve(root,...relative.split("/"));
      const rel=path.relative(root,file);
      if(!rel||rel.startsWith("..")||path.isAbsolute(rel)){res.writeHead(403);res.end("forbidden");return}
      if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()){res.writeHead(404);res.end("not found");return}
      res.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});
      fs.createReadStream(file).pipe(res);
    }catch(error){res.writeHead(500);res.end(String(error?.message||error))}
  });
}
async function openPackage(browser,url){
  const context=await browser.newContext({viewport:{width:1440,height:960}});
  const page=await context.newPage();
  const localFailures=[],pageErrors=[];
  page.on("response",response=>{
    try{
      const target=new URL(response.url());
      if(target.origin===new URL(url).origin&&response.status()>=400)localFailures.push(response.status()+" "+target.pathname);
    }catch(_){}
  });
  page.on("requestfailed",request=>{
    try{
      const target=new URL(request.url());
      if(target.origin===new URL(url).origin)localFailures.push("FAILED "+target.pathname+" "+(request.failure()?.errorText||""));
    }catch(_){}
  });
  page.on("pageerror",error=>pageErrors.push(String(error?.message||error)));
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap?.ready===true||window.CCGLostSizzlerV142Bootstrap?.failed===true,null,{timeout:90000});
  await page.waitForFunction(()=>{
    const gate=window.CCGLostSizzlerReleaseGate?.state;
    return !gate||gate.ready===true||gate.failed===true;
  },null,{timeout:20000}).catch(()=>{});
  const boot=await page.evaluate(()=>({
    ready:window.CCGLostSizzlerV142Bootstrap?.ready===true,
    failed:window.CCGLostSizzlerV142Bootstrap?.failed===true,
    error:window.CCGLostSizzlerV142Bootstrap?.error||"",
    build:window.CCGLostSizzlerV142Bootstrap?.build||"",
    itch:window.CCGDungeonCarnageItchRelease?.mode||"",
    retiredWeeklyCompatibility:Boolean(window.CCGWeeklyChallenge?.state?.itchPackage&&window.CCGWeeklyChallenge?.state?.retired),
    releaseGate:window.CCGLostSizzlerReleaseGate?.state?JSON.parse(JSON.stringify(window.CCGLostSizzlerReleaseGate.state)):null,
    cacheGuard:window.CCGLostSizzlerCacheGuard?.state?{
      errors:[...(window.CCGLostSizzlerCacheGuard.state.errors||[])],
      runtimeErrors:[...(window.CCGLostSizzlerCacheGuard.runtimeErrors||[])]
    }:null,
    overlay:{
      hidden:Boolean(document.getElementById("ccg-release-loading")?.hidden),
      error:Boolean(document.getElementById("ccg-release-loading")?.classList?.contains("is-error")),
      status:document.getElementById("ccg-release-loading-status")?.textContent||""
    }
  }));
  if(boot.failed||!boot.ready)fail("Packaged bootstrap failed: "+JSON.stringify(boot));
  if(boot.releaseGate?.failed||boot.overlay.error||boot.localFailures?.length)fail("Packaged legacy release gate failed: "+JSON.stringify({boot,localFailures,pageErrors}));
  if(localFailures.length||pageErrors.length)fail("Packaged startup resource/runtime failure: "+JSON.stringify({localFailures,pageErrors,boot}));
  if(boot.itch!=="itch-html5"||!boot.retiredWeeklyCompatibility)fail("Packaged itch release identity/retired compatibility missing: "+JSON.stringify(boot));
  return{context,page,localFailures,pageErrors,boot};
}
async function assertHealthy(result,label){
  await result.page.waitForTimeout(300);
  if(result.localFailures.length)fail(label+" local asset failures: "+result.localFailures.join(" | "));
  if(result.pageErrors.length)fail(label+" page errors: "+result.pageErrors.join(" | "));
}
async function main(){
  const root=parse(process.argv.slice(2));
  if(!fs.existsSync(path.join(root,"index.html")))fail("itch package root has no index.html: "+root);
  const server=serverFor(root);
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
  const address=server.address();
  const url="http://127.0.0.1:"+address.port+"/";
  const browser=await chromium.launch({headless:true});
  try{
    {
      const result=await openPackage(browser,url);
      await result.page.click("#solo-btn");
      await result.page.waitForFunction(()=>document.body?.dataset?.runActive==="true",null,{timeout:30000});
      await assertHealthy(result,"Solo");
      await result.context.close();
    }
    {
      const result=await openPackage(browser,url);
      await result.page.click("#tutorial-zone-btn");
      await result.page.waitForFunction(()=>document.body?.dataset?.runActive==="true"&&document.body?.dataset?.tutorialActive==="true",null,{timeout:30000});
      await assertHealthy(result,"Tutorial");
      await result.context.close();
    }
    {
      const result=await openPackage(browser,url);
      const retired=await result.page.evaluate(()=> {
        const visible=(id)=>{
          const node=document.getElementById(id);
          if(!node)return false;
          const style=getComputedStyle(node);
          return !node.hidden&&node.getAttribute("aria-hidden")!=="true"&&style.display!=="none"&&style.visibility!=="hidden";
        };
        return {
          splitVisible:visible("split-btn"),
          dailyVisible:visible("daily-btn"),
          weeklyExists:Boolean(document.getElementById("weekly-vault")),
          publicText:document.body?.innerText||""
        };
      });
      if(retired.splitVisible||retired.dailyVisible||retired.weeklyExists)fail("Retired mode UI is publicly visible: "+JSON.stringify(retired));
      if(/Weekly High-Score Vault|Weekly Dungeon|2P Split Screen|P2:/i.test(retired.publicText))fail("Retired mode copy is visible in packaged release");
      await assertHealthy(result,"Retired-mode absence");
      await result.context.close();
    }
    console.log("PASS C64 Dungeon Carnage R51 Solo/Tutorial itch package browser smoke");
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(()=>resolve()));
  }
}
main().catch(error=>{console.error(error?.stack||error);process.exitCode=1});
