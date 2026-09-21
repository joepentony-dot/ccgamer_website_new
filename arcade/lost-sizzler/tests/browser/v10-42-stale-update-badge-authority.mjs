import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const expectedBuild="V10.42 r41";
const staleBuild="2026.09.10.0-stale-badge-contract";
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".ogg":"audio/ogg",".mp3":"audio/mpeg",".wav":"audio/wav"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local");
    const pathname=decodeURIComponent(url.pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      let body=data;
      if(pathname.endsWith("/arcade/lost-sizzler/")&&url.searchParams.get("stale-badge")==="1"){
        const html=data.toString("utf8");
        const marker=`<meta name="ccg-lost-sizzler-build" content="${expectedBuild}">`;
        assert.ok(html.includes(marker),"canonical page must expose the expected current build marker");
        body=Buffer.from(html.replace(marker,`<meta name="ccg-lost-sizzler-build" content="${staleBuild}">`),"utf8");
      }
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(body);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  const page=await context.newPage();
  page.setDefaultTimeout(90000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?stale-badge=1`,{waitUntil:"domcontentloaded",timeout:90000});
  await page.waitForFunction(({latest,current})=>
    window.CCGLostSizzlerVersion?.state?.outdated===true&&
    window.CCGLostSizzlerVersion?.state?.latest===latest&&
    window.CCGLostSizzlerVersion?.state?.current===current&&
    document.querySelector(".build-badge")?.textContent==="UPDATE AVAILABLE"
  ,{latest:expectedBuild,current:staleBuild},{timeout:90000});

  const restampsBefore=await page.evaluate(()=>window.CCGLostSizzlerV142Bootstrap?.identityRestamps||0);
  await page.waitForTimeout(2200);
  const state=await page.evaluate(()=>({
    current:window.CCGLostSizzlerVersion?.state?.current||null,
    latest:window.CCGLostSizzlerVersion?.state?.latest||null,
    outdated:Boolean(window.CCGLostSizzlerVersion?.state?.outdated),
    badge:document.querySelector(".build-badge")?.textContent||null,
    button:document.getElementById("version-refresh-btn")?.textContent||null,
    title:document.getElementById("version-check-title")?.textContent||null,
    restamps:window.CCGLostSizzlerV142Bootstrap?.identityRestamps||0,
    domBuild:document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||null
  }));

  assert.equal(state.current,staleBuild);
  assert.equal(state.latest,expectedBuild);
  assert.equal(state.outdated,true);
  assert.equal(state.badge,"UPDATE AVAILABLE","V10.42 bootstrap identity restamps must not overwrite stale-browser update ownership");
  assert.equal(state.button,"Update Available — Refresh");
  assert.equal(state.title,"Update Available");
  assert.equal(state.domBuild,expectedBuild,"bootstrap must continue stamping authoritative build metadata even while presentation belongs to the update checker");
  assert.ok(state.restamps>restampsBefore,"test must cross at least one scheduled V10.42 identity restamp after the stale state is established");
  assert.deepEqual(errors,[],`stale badge authority contract emitted uncaught errors: ${errors.join("\n")}`);

  console.log("Dungeon Carnage stale-browser update badge authority passed.",state);
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
