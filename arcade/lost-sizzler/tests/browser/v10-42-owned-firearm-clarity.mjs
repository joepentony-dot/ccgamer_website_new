import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[],failedScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?owned-firearm-clarity=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerV142Bootstrap?.ready===true&&window.CCGLostSizzlerV142OwnedFirearmClarity?.isInstalled?.()===true&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1),null,{timeout:20000});

  const before=await page.evaluate(()=>{
    const pulse={id:"pulse-test",name:"Pulse Blaster",displayName:"COMMON Pulse Blaster",rarity:"COMMON",rating:1,power:1,delay:1,shots:1,ammo:1,pierce:0,element:"energy",mods:[]};
    const scatter={id:"scatter-test",name:"Scatter Blaster",displayName:"SIZZLER Scatter Blaster",rarity:"SIZZLER",rating:7,power:3,delay:1.35,shots:4,ammo:2,pierce:1,element:"fire",mods:["Turbo","Wide"]};
    p1.firearmUnlocked=true;p1.ownedWeapons=[pulse,scatter];p1.activeWeaponIndex=0;p1.weapon={...pulse,mods:[...pulse.mods]};
    renderInventoryPanel();
    const buttons=[...document.querySelectorAll(".ccg-owned-weapons [data-ccg-equip-weapon]")];
    return{texts:buttons.map(button=>button.textContent||""),titles:buttons.map(button=>button.title||""),summaries:[window.CCGLostSizzlerV142OwnedFirearmClarity.weaponSummary(pulse),window.CCGLostSizzlerV142OwnedFirearmClarity.weaponSummary(scatter)]};
  });

  assert.equal(before.texts.length,2,"Owned Firearms must render both retained firearms");
  assert.match(before.texts[0],/EQUIPPED · COMMON Pulse Blaster/i,"active firearm must remain visibly identified");
  assert.match(before.texts[0],/RATING 1/i);
  assert.match(before.texts[0],/PWR 1/i);
  assert.match(before.texts[0],/SHOTS 1/i);
  assert.match(before.texts[0],/ENERGY/i);
  assert.match(before.texts[1],/EQUIP · SIZZLER Scatter Blaster/i,"alternate firearm must remain selectable");
  assert.match(before.texts[1],/RATING 7/i);
  assert.match(before.texts[1],/PWR 3/i);
  assert.match(before.texts[1],/DELAY 1\.35/i);
  assert.match(before.texts[1],/SHOTS 4/i);
  assert.match(before.texts[1],/AMMO 2/i);
  assert.match(before.texts[1],/PIERCE 1/i);
  assert.match(before.texts[1],/FIRE/i);
  assert.match(before.texts[1],/MODS Turbo \+ Wide/i);
  assert.notEqual(before.summaries[0],before.summaries[1],"genuinely different firearm characteristics must produce distinct comparison summaries");
  assert.match(before.titles[1],/PWR 3/i,"the same comparison must be available as a native hover/title description");

  // Exercise the real player-owned inventory route before interacting with its
  // controls. renderInventoryPanel() can populate the DOM while the overlay is
  // still hidden; TAB is the supported live-game command that exposes it.
  await page.keyboard.press("Tab");
  await page.waitForFunction(()=>{
    const panel=document.getElementById("inventory-panel");
    const equip=document.querySelector('.ccg-owned-weapons [data-ccg-equip-weapon="1"]');
    return Boolean(panel&&!panel.classList.contains("hidden")&&equip&&equip.getClientRects().length);
  });

  await page.click('.ccg-owned-weapons [data-ccg-equip-weapon="1"]');
  await page.waitForFunction(()=>p1?.activeWeaponIndex===1&&p1?.weapon?.id==="scatter-test");
  const after=await page.evaluate(()=>({weapon:p1.weapon?.id,index:p1.activeWeaponIndex,text:document.querySelector('.ccg-owned-weapons [data-ccg-equip-weapon="1"]')?.textContent||""}));
  assert.equal(after.weapon,"scatter-test","the real Owned Firearms control must still equip the selected firearm");
  assert.equal(after.index,1);
  assert.match(after.text,/EQUIPPED · SIZZLER Scatter Blaster/i,"the comparison row must update after a real firearm switch");

  assert.deepEqual(errors,[],`owned-firearm clarity regression must not produce page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`owned-firearm clarity regression must not lose same-origin scripts: ${failedScripts.join("\n")}`);
  console.log("Dungeon Carnage owned firearm comparison clarity regression passed.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
