import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".webp":"image/webp",
  ".png":"image/png",
  ".ogg":"audio/ogg"
};

const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return;}
    const send=()=>fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end("not found");return;}
      res.setHeader("content-type",mime[path.extname(file).toLowerCase()]||"application/octet-stream");
      res.setHeader("cache-control","no-store");
      res.setHeader("connection","close");
      res.end(data);
    });
    if(pathname.endsWith("/js/v10-35-quality.js")){setTimeout(send,900);return;}
    send();
  }catch(error){res.writeHead(500).end(String(error));}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket));});

await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  page.setDefaultTimeout(20000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForSelector("#ccg-release-loading",{state:"visible"});
  const during=await page.evaluate(()=>({
    text:document.querySelector("#ccg-release-loading h2")?.textContent||"",
    value:Number(document.getElementById("ccg-release-loading-progress")?.value||0),
    max:Number(document.getElementById("ccg-release-loading-progress")?.max||0),
    ready:document.body.dataset.releaseReady
  }));
  assert.match(during.text,/LOADING.*PLEASE WAIT/i,"loading overlay must give an explicit wait message");
  assert.equal(during.max,100,"loading progress must use a 0-100 scale");
  assert.ok(during.value>0&&during.value<100,`loading progress must visibly advance before runtime readiness: ${JSON.stringify(during)}`);

  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
  await page.waitForFunction(()=>document.getElementById("ccg-release-loading")?.hidden===true);
  const finished=await page.evaluate(()=>({
    value:Number(document.getElementById("ccg-release-loading-progress")?.value||0),
    hidden:Boolean(document.getElementById("ccg-release-loading")?.hidden),
    runtime:Boolean(window.CCGLostSizzlerV136),
    audit:window.CCGLostSizzlerV136?.renderOwnershipAudit?.()||null
  }));
  assert.equal(finished.value,100,"loading progress must reach 100% when the release gate completes");
  assert.equal(finished.hidden,true,"loading overlay must leave the screen after successful preparation");
  assert.equal(finished.runtime,true,"V10.36 runtime must be installed before the game becomes ready");
  assert.equal(finished.audit?.noDoubleDrawPolicy,true,"render-ownership audit must be live in Chromium");

  const spyKit=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerSpecialModes;
    const actor=String(typeof net!=="undefined"&&net?.sessionId||"P1"),other="P2";
    Object.defineProperty(api,"active",{configurable:true,value:{type:"sizzler-saboteurs",state:{
      round:2,roundEndsAt:Date.now()+60000,modifier:{name:"TRAP HAPPY"},wins:{[actor]:1,[other]:0},trapLoadout:["spring","snare","custard"],
      players:[
        {id:actor,name:"Agent One",hp:5,maxHp:6,weapon:{id:"chicken",name:"Rubber Chicken",uses:3},counter:"scanner",trapCharges:2,hasCase:true,objectives:["joystick"],looseItem:null,effects:{}},
        {id:other,name:"Agent Two",hp:6,maxHp:6,weapon:null,counter:null,trapCharges:3,hasCase:false,objectives:[],looseItem:null,effects:{}}
      ]
    }}});
    window.renderInventoryPanel();
    const panel=document.querySelector("#inventory-panel>.inventory-panel"),guide=document.getElementById("inventory-guide"),controls=document.getElementById("inventory-list"),legacy=[...panel.querySelectorAll(":scope > p")].find(node=>node.id!=="inventory-mobile-notice"),dossier=document.getElementById("inventory-dossier-btn");
    return{
      title:panel.querySelector(".mobile-panel-head h2")?.textContent||"",
      spyClass:panel.classList.contains("spy-field-kit"),
      legacyHidden:legacy?.classList.contains("v136-spy-hidden")||false,
      dossierHidden:dossier?.classList.contains("v136-spy-hidden")||false,
      guideText:guide?.textContent||"",
      controlText:controls?.textContent||"",
      objectiveText:document.getElementById("inventory-objective")?.textContent||"",
      loadoutText:document.getElementById("inventory-loadout")?.textContent||""
    };
  });
  assert.equal(spyKit.title,"SPY VS SPY FIELD KIT","Spy mode must replace the normal TAB inventory title");
  assert.equal(spyKit.spyClass,true,"Spy field kit styling hook must be active");
  assert.equal(spyKit.legacyHidden,true,"normal dungeon slot explanation must be hidden in Spy mode");
  assert.equal(spyKit.dossierHidden,true,"normal named-enemy dossier shortcut must be hidden in Spy mode");
  for(const text of ["Rubber Chicken","C64 Time Bomb","Trap Scanner"])assert.ok(spyKit.guideText.includes(text),`Spy field guide must include ${text}`);
  for(const text of ["ARM TRAP","EXTRACT","FIELD KIT","LEAVE MATCH"])assert.ok(spyKit.controlText.includes(text),`Spy controls must include ${text}`);
  assert.match(spyKit.objectiveText,/ROUND 2\/5.*FIRST TO 3/s,"Spy objective card must explain match progress");
  assert.match(spyKit.loadoutText,/Rubber Chicken.*TRAP CHARGES 2.*Trap Scanner/s,"Spy loadout must show live equipment and counter state");
  assert.ok(!spyKit.guideText.includes("BANISHMENT FLASK"),"legacy dungeon item guide must not leak into Spy mode");

  assert.deepEqual(errors,[],`loading/Spy field-kit launch must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.36 loading progress, runtime installation and Spy field kit passed in Chromium.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
