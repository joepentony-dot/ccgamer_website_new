import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"};

const harness=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body data-run-active="false"><main class="ccg-game"><div id="pause" class="hidden"></div></main><script>
var mode="menu";var input=new Set();var UI={pause:document.getElementById("pause")};
const params=new URLSearchParams(location.search);window.__TEST_SIGNED_IN__=params.get("signedIn")==="1";window.__TEST_ENTITLED__=params.get("entitled")==="1";window.__TEST_DOWNLOAD_READY__=params.get("download")==="1";
window.ccgSupabase={
  waitForAuth:async()=>window.__TEST_SIGNED_IN__?{user:{id:"test-user",email:"test@example.invalid"}}:null,
  getClient:async()=>({functions:{invoke:async(endpoint,{body})=>{
    if(endpoint!=="ccg-commerce")return{data:{ok:false,error:"wrong endpoint"},error:null};
    if(body.action==="status")return{data:{ok:true,signedIn:window.__TEST_SIGNED_IN__,entitled:window.__TEST_ENTITLED__,entitlement:window.__TEST_ENTITLED__?{status:"active",purchased_at:"2026-09-13T00:00:00Z"}:null,product:{slug:"c64-dungeon-carnage",name:"C64 Dungeon Carnage",displayPrice:"£1.99",currency:"gbp"},checkoutConfigured:true,downloadReady:window.__TEST_DOWNLOAD_READY__},error:null};
    if(body.action==="create_checkout")return{data:{ok:true,checkoutUrl:"https://checkout.stripe.test/session",sessionId:"cs_test"},error:null};
    if(body.action==="download")return{data:{ok:true,url:"/private-test-download.zip",expiresIn:120},error:null};
    return{data:{ok:false,error:"unknown action"},error:null};
  }}})
};
</script><script src="/arcade/lost-sizzler/js/v10-42-stripe-commerce.js"></script><script src="/arcade/lost-sizzler/js/v10-42-demo-paywall.js"></script></body></html>`;

const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local");
    if(url.pathname==="/paywall-harness.html"){res.setHeader("content-type","text/html; charset=utf-8");res.setHeader("cache-control","no-store");res.end(harness);return;}
    if(url.pathname==="/private-test-download.zip"){res.setHeader("content-type","application/zip");res.end("test");return;}
    const file=path.resolve(repo,`.${url.pathname}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end("not found");return;}res.setHeader("content-type",mime[path.extname(file)]||"application/octet-stream");res.setHeader("cache-control","no-store");res.end(data);});
  }catch(error){res.writeHead(500).end(String(error));}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket));});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage"]});

try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(`${origin}/paywall-harness.html`,{waitUntil:"load"});
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142DemoPaywall&&window.CCGLostSizzlerCommerce));

  await page.evaluate(()=>localStorage.setItem("ccg-dungeon-carnage-trial-deadline-v2",String(Date.now()-1000)));
  await page.evaluate(()=>window.CCGLostSizzlerV142DemoPaywall.startTrial());
  await page.waitForFunction(()=>document.getElementById("v142-demo-paywall")?.classList.contains("hidden")===false);
  const expired=await page.evaluate(()=>({
    expired:document.body.dataset.v142TrialExpired,
    time:document.querySelector("[data-trial-time]")?.textContent,
    mode:globalThis.eval("mode"),
    text:document.getElementById("v142-demo-paywall")?.textContent||"",
    canDismiss:window.CCGLostSizzlerV142DemoPaywall.closePaywall(),
    later:Boolean(document.querySelector("[data-later]")),
    styleLoaded:Boolean(document.querySelector('link[data-ccg-trial-paywall="true"]'))
  }));
  assert.equal(expired.expired,"true","expired trial must set the canonical body lock");
  assert.equal(expired.time,"00:00","expired timer must visibly stop at 00:00");
  assert.equal(expired.mode,"trial-paywall","expired trial must leave gameplay mode");
  assert.match(expired.text,/2-MINUTE TRIAL COMPLETE/i,"expired trial must render the intended paywall");
  assert.match(expired.text,/SIGN IN OR CREATE A CCG ACCOUNT/i,"anonymous expired users must be routed to account ownership");
  assert.equal(expired.canDismiss,false,"expired paywall must not dismiss without entitlement");
  assert.equal(expired.later,false,"expired paywall must not expose a Not Now bypass");
  assert.equal(expired.styleLoaded,true,"external paywall stylesheet must be loaded");

  await page.reload({waitUntil:"load"});
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142DemoPaywall));
  await page.evaluate(()=>window.CCGLostSizzlerV142DemoPaywall.startTrial());
  await page.waitForFunction(()=>document.body.dataset.v142TrialExpired==="true");
  assert.equal(await page.locator("[data-trial-time]").textContent(),"00:00","reload must not grant another two-minute trial");

  await page.goto(`${origin}/paywall-harness.html?purchase=1&signedIn=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>document.getElementById("v142-demo-paywall")?.classList.contains("hidden")===false);
  const signedInReturn=await page.evaluate(()=>({
    expired:document.body.dataset.v142TrialExpired,
    buy:Boolean(document.querySelector("[data-checkout]")),
    text:document.getElementById("v142-demo-paywall")?.textContent||"",
    purchaseParam:new URL(location.href).searchParams.get("purchase")
  }));
  assert.equal(signedInReturn.expired,"true","expired trial must be restored immediately after account sign-in");
  assert.equal(signedInReturn.buy,true,"signed-in expired user must immediately receive the Stripe buy action");
  assert.match(signedInReturn.text,/CCG ACCOUNT DETECTED/i,"signed-in return must identify the account before checkout");
  assert.equal(signedInReturn.purchaseParam,null,"account return marker must be cleaned after the gate is restored");
  await context.close();

  const ownedContext=await browser.newContext({viewport:{width:390,height:844}});
  const owned=await ownedContext.newPage();
  await owned.goto(`${origin}/paywall-harness.html?purchase=success&signedIn=1&entitled=1&download=1`,{waitUntil:"load"});
  await owned.waitForFunction(()=>document.body.dataset.fullGameEntitled==="true");
  await owned.waitForFunction(()=>document.getElementById("v142-demo-paywall")?.classList.contains("hidden")===false);
  const ownership=await owned.evaluate(()=>({
    entitled:document.body.dataset.fullGameEntitled,
    expired:document.body.dataset.v142TrialExpired,
    text:document.getElementById("v142-demo-paywall")?.textContent||"",
    download:Boolean(document.querySelector("[data-download]")),
    startsTrial:window.CCGLostSizzlerV142DemoPaywall.startTrial(),
    purchaseParam:new URL(location.href).searchParams.get("purchase")
  }));
  assert.equal(ownership.entitled,"true","server-confirmed ownership must bypass the trial lock");
  assert.notEqual(ownership.expired,"true","owned account must not remain trial-locked");
  assert.match(ownership.text,/FULL GAME OWNED/i,"successful Checkout return must render owned state");
  assert.equal(ownership.download,true,"owned account with a published build must receive the download action");
  assert.equal(ownership.startsTrial,false,"owned account must never start a new trial countdown");
  assert.equal(ownership.purchaseParam,null,"successful purchase query markers must be cleaned after verification");
  await ownedContext.close();

  console.log("C64 Dungeon Carnage live two-minute paywall contract passed");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
