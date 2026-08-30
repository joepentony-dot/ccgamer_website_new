import assert from "node:assert/strict";
import {chromium} from "playwright";

const gameUrl=process.env.CCG_LOST_SIZZLER_URL||"https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/";
const supabaseUrl=(process.env.CCG_SUPABASE_URL||"https://lcslgxpgmttaexsorxik.supabase.co").replace(/\/$/,"");
const origin="https://www.cheekycommodoregamer.co.uk";
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

async function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(30000);
  const pageErrors=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));

  console.log("[production smoke] wait for live R47 browser runtime");
  let live=null,lastError="";
  for(let attempt=1;attempt<=18;attempt++){
    try{
      await page.goto(`${gameUrl}${gameUrl.includes("?")?"&":"?"}r47-smoke=${Date.now()}`,{waitUntil:"domcontentloaded",timeout:30000});
      await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R47AllModeOptimisation),null,{timeout:12000});
      live=await page.evaluate(()=>({ready:document.body.dataset.releaseReady,tier:document.body.dataset.v141R47PerformanceTier,build:window.CCGLostSizzlerV141R47AllModeOptimisation?.BUILD,canvas:Boolean(document.getElementById("game"))}));
      break;
    }catch(error){lastError=String(error?.message||error);if(attempt<18)await sleep(10000)}
  }
  assert.ok(live,`live Lost Sizzler did not expose R47 after deployment retries: ${lastError}`);
  assert.equal(live.ready,"true");assert.equal(live.build,"V10.41-r47");assert.equal(live.canvas,true);assert.ok(["normal","reduced","severe"].includes(live.tier));
  assert.deepEqual(pageErrors,[],`live page emitted uncaught errors: ${pageErrors.join("\n")}`);

  console.log("[production smoke] verify public feedback endpoint CORS and validation without creating telemetry");
  const options=await fetch(`${supabaseUrl}/functions/v1/lost-sizzler-feedback`,{method:"OPTIONS",headers:{Origin:origin,"Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"content-type"}});
  assert.equal(options.status,204);
  assert.equal(options.headers.get("access-control-allow-origin"),origin);
  const invalid=await fetch(`${supabaseUrl}/functions/v1/lost-sizzler-feedback`,{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({action:"telemetry",event_type:"__r47_smoke_invalid__"})});
  assert.equal(invalid.status,400,"invalid telemetry must be rejected without writing a gameplay event");
  const invalidBody=await invalid.json();assert.equal(invalidBody.success,false);assert.match(String(invalidBody.error),/Unknown telemetry event/i);

  console.log("[production smoke] verify Weekly Vault read path and database projection");
  const weekly=await fetch(`${supabaseUrl}/functions/v1/ccq-weekly-challenge`,{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({action:"status"})});
  assert.equal(weekly.status,200);
  const weeklyBody=await weekly.json();assert.equal(weeklyBody.ok,true);assert.equal(weeklyBody.ready,true);assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(String(weeklyBody.weekStart||"")));assert.ok(Array.isArray(weeklyBody.leaderboard));

  console.log("Lost Sizzler production smoke passed: live R47 browser runtime, feedback validation and Weekly Vault backend are responding.");
  await context.close();
}finally{
  await browser.close();
}
