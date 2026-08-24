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
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end("not found");return}
      res.setHeader("content-type",mime[path.extname(file).toLowerCase()]||"application/octet-stream");
      res.setHeader("cache-control","no-store");
      res.setHeader("connection","close");
      res.end(data)
    })
  }catch(error){res.writeHead(500).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});

await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  page.setDefaultTimeout(20000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV137?.state?.installed));

  const community=await page.evaluate(()=>({
    href:document.getElementById("lost-sizzler-discord-link")?.href||"",
    text:document.getElementById("lost-sizzler-discord-link")?.textContent||"",
    target:document.getElementById("lost-sizzler-discord-link")?.target||""
  }));
  assert.equal(community.href,"https://discord.gg/83Xw9ktAn4","main Lost Sizzler menu must use the CCG Discord invite");
  assert.match(community.text,/JOIN THE LOST SIZZLER DISCORD/i,"Discord CTA must be visible on the main menu");
  assert.match(community.text,/Discuss the game/i,"Discord CTA must encourage game discussion");
  assert.equal(community.target,"_blank","Discord discussion link should not replace the running game page");

  const popupLayout=await page.evaluate(()=>{
    document.body.dataset.runActive="true";
    const toast=document.getElementById("pickup-toast");
    const critical=document.querySelector(".ccg-game>.critical-strip");
    const toastStyle=getComputedStyle(toast),criticalStyle=getComputedStyle(critical);
    return{
      toastPosition:toastStyle.position,
      criticalPosition:criticalStyle.position,
      criticalHeight:criticalStyle.height
    }
  });
  assert.equal(popupLayout.toastPosition,"absolute","normal gameplay toasts must overlay the canvas rather than resize it");
  assert.equal(popupLayout.criticalPosition,"fixed","critical warnings must be removed from the gameplay grid");
  assert.equal(popupLayout.criticalHeight,"0px","critical warning host must reserve no layout height");

  const hordeUi=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerSpecialModes;
    Object.defineProperty(api,"active",{configurable:true,value:{
      type:"horde-survivor",
      authoritative:false,
      seed:"V137-BROWSER",
      state:{seed:"V137-BROWSER",players:[],health:{active:[],nextSpawnAt:Date.now()+20000}}
    }});
    document.body.dataset.specialMode="horde-survivor";
    document.body.dataset.runActive="true";

    window.showToast("HORDE SURVIVOR LIVE","baseline","gold",5000);
    const allowedTitle=document.getElementById("pickup-title")?.textContent||"";
    window.showToast("LOW HEALTH","legacy dungeon warning","red",5000);
    const afterBlockedTitle=document.getElementById("pickup-title")?.textContent||"";

    const inventory=document.getElementById("inventory-panel");
    inventory?.classList.remove("hidden");
    const toggleResult=typeof window.toggleInventory==="function"?window.toggleInventory():null;

    const display=node=>node?getComputedStyle(node).display:"missing";
    return{
      allowedTitle,
      afterBlockedTitle,
      toggleResult,
      inventoryHidden:inventory?.classList.contains("hidden")||false,
      mission:display(document.querySelector(".ccg-game>.mission")),
      shortcut:display(document.querySelector(".shortcut-dock")),
      quickInventory:display(document.querySelector(".hub-inventory")),
      progress:display(document.querySelector(".hub-progress")),
      armour:display(document.querySelector(".armour-stat")),
      ammo:display(document.querySelector(".ammo-stat")),
      health:display(document.querySelector(".health-stat")),
      weapon:display(document.querySelector(".weapon-stat")),
      radar:display(document.querySelector(".radar-card"))
    }
  });

  assert.equal(hordeUi.allowedTitle,"HORDE SURVIVOR LIVE","Horde-specific notifications must remain available");
  assert.equal(hordeUi.afterBlockedTitle,"HORDE SURVIVOR LIVE","legacy dungeon notifications must not replace Horde messages");
  assert.equal(hordeUi.toggleResult,false,"TAB inventory must be disabled in Horde mode");
  assert.equal(hordeUi.inventoryHidden,true,"Horde must force the ordinary inventory closed");
  for(const [name,value] of [["mission",hordeUi.mission],["shortcut",hordeUi.shortcut],["quick inventory",hordeUi.quickInventory],["progress",hordeUi.progress],["armour",hordeUi.armour],["ammo",hordeUi.ammo]]){
    assert.equal(value,"none",`legacy ${name} UI must be hidden in Horde mode`)
  }
  assert.notEqual(hordeUi.health,"none","Horde health status must remain visible");
  assert.notEqual(hordeUi.weapon,"none","Horde weapon status must remain visible");
  assert.notEqual(hordeUi.radar,"none","Horde radar must remain visible");

  assert.deepEqual(errors,[],`V10.37 Horde focus launch must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.37 no-reflow notifications, Horde-only UI and Discord CTA passed in Chromium.");
  await context.close()
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()))
}
