import assert from "node:assert/strict";
import {chromium} from "playwright";

const gameUrl=process.env.CCG_LOST_SIZZLER_URL||"https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/";
const supabaseUrl=(process.env.CCG_SUPABASE_URL||"https://lcslgxpgmttaexsorxik.supabase.co").replace(/\/$/,"");
const origin="https://www.cheekycommodoregamer.co.uk";
const expectedReleaseVersion="V10.42";
const expectedBuild="2026.09.10.1";
const expectedCacheToken="20260910r1";
const syntheticStaleBuild="2026.09.10.0-production-smoke";
const versionUrl=new URL("version.json",gameUrl).toString();
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

async function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(30000);
  const pageErrors=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));

  console.log("[production smoke] wait for live release browser runtime and release markers");
  let live=null,lastError="";
  for(let attempt=1;attempt<=18;attempt++){
    try{
      await page.goto(`${gameUrl}${gameUrl.includes("?")?"&":"?"}release-smoke=${Date.now()}`,{waitUntil:"domcontentloaded",timeout:30000});
      await page.waitForFunction(({build,cache})=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R47AllModeOptimisation)&&Boolean(window.CCGLostSizzlerVersion)&&document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content===build&&document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content===cache,{build:expectedBuild,cache:expectedCacheToken},{timeout:12000});
      await page.waitForFunction(build=>window.CCGLostSizzlerVersion?.state?.latest===build,expectedBuild,{timeout:12000});
      live=await page.evaluate(()=>({
        ready:document.body.dataset.releaseReady,
        tier:document.body.dataset.v141R47PerformanceTier,
        runtimeBuild:window.CCGLostSizzlerV141R47AllModeOptimisation?.BUILD,
        pageBuild:document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||null,
        pageCache:document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||null,
        releaseVersion:window.CCGLostSizzlerVersion?.releaseVersion||null,
        latest:window.CCGLostSizzlerVersion?.state?.latest||null,
        outdated:Boolean(window.CCGLostSizzlerVersion?.state?.outdated),
        versionButton:Boolean(document.getElementById("version-refresh-btn")),
        versionPanel:Boolean(document.getElementById("version-check-panel")),
        canvas:Boolean(document.getElementById("game"))
      }));
      break;
    }catch(error){lastError=String(error?.message||error);if(attempt<18)await sleep(10000)}
  }
  assert.ok(live,`live Lost Sizzler did not expose the expected release after deployment retries: ${lastError}`);
  assert.equal(live.ready,"true");
  assert.equal(live.runtimeBuild,"V10.41-r47");
  assert.equal(live.pageBuild,expectedBuild,"deployed page build marker must match the published release build");
  assert.equal(live.pageCache,expectedCacheToken,"deployed page cache token must match the published release cache token");
  assert.equal(live.releaseVersion,expectedReleaseVersion,"deployed update checker must identify the current release family");
  assert.equal(live.latest,expectedBuild,"deployed update checker must read the current live build marker");
  assert.equal(live.outdated,false,"current production page must not mark itself outdated");
  assert.equal(live.versionButton,true,"production page must expose the version refresh control");
  assert.equal(live.versionPanel,true,"production page must install the update panel");
  assert.equal(live.canvas,true);
  assert.ok(["normal","reduced","severe"].includes(live.tier));
  assert.deepEqual(pageErrors,[],`live page emitted uncaught errors: ${pageErrors.join("\n")}`);

  console.log("[production smoke] verify deployed version.json matches the page release markers");
  const versionResponse=await fetch(`${versionUrl}${versionUrl.includes("?")?"&":"?"}release-smoke=${Date.now()}`,{headers:{"Cache-Control":"no-cache"}});
  assert.equal(versionResponse.status,200,"public version.json must be reachable");
  const versionPayload=await versionResponse.json();
  assert.equal(String(versionPayload?.releaseVersion||""),expectedReleaseVersion);
  assert.equal(String(versionPayload?.build||""),expectedBuild);
  assert.equal(String(versionPayload?.cacheToken||""),expectedCacheToken);
  assert.equal(live.pageBuild,String(versionPayload.build),"page build and version.json build must stay in lockstep");
  assert.equal(live.pageCache,String(versionPayload.cacheToken),"page cache token and version.json cache token must stay in lockstep");

  console.log("[production smoke] verify a stale browser receives the live Update Available prompt");
  const stalePage=await context.newPage();
  stalePage.setDefaultTimeout(30000);
  let documentRewritten=false;
  await stalePage.route("**/arcade/lost-sizzler/**",async route=>{
    const request=route.request();
    const requestUrl=new URL(request.url());
    if(documentRewritten||request.resourceType()!=="document"||!requestUrl.pathname.endsWith("/arcade/lost-sizzler/")){await route.continue();return}
    const response=await route.fetch();
    const html=await response.text();
    const expectedMeta=`<meta name="ccg-lost-sizzler-build" content="${expectedBuild}">`;
    assert.ok(html.includes(expectedMeta),"live document must contain the expected build marker before stale-browser simulation");
    const staleHtml=html.replace(expectedMeta,`<meta name="ccg-lost-sizzler-build" content="${syntheticStaleBuild}">`);
    documentRewritten=true;
    await route.fulfill({response,body:staleHtml,headers:{...response.headers(),"cache-control":"no-store"}});
  });
  await stalePage.goto(`${gameUrl}${gameUrl.includes("?")?"&":"?"}stale-release-smoke=${Date.now()}`,{waitUntil:"domcontentloaded",timeout:30000});
  await stalePage.waitForFunction(({latest,current})=>window.CCGLostSizzlerVersion?.state?.outdated===true&&window.CCGLostSizzlerVersion?.state?.latest===latest&&window.CCGLostSizzlerVersion?.state?.current===current&&!document.getElementById("version-check-panel")?.classList.contains("hidden")&&document.getElementById("version-check-title")?.textContent==="Update Available",{latest:expectedBuild,current:syntheticStaleBuild},{timeout:15000});
  const stale=await stalePage.evaluate(()=>({
    current:window.CCGLostSizzlerVersion?.state?.current||null,
    latest:window.CCGLostSizzlerVersion?.state?.latest||null,
    outdated:Boolean(window.CCGLostSizzlerVersion?.state?.outdated),
    title:document.getElementById("version-check-title")?.textContent||null,
    updateText:document.getElementById("version-check-update")?.textContent||null,
    buttonText:document.getElementById("version-refresh-btn")?.textContent||null,
    badgeText:document.querySelector(".build-badge")?.textContent||null
  }));
  assert.equal(documentRewritten,true,"production smoke must exercise the stale-browser document path");
  assert.equal(stale.current,syntheticStaleBuild);
  assert.equal(stale.latest,expectedBuild);
  assert.equal(stale.outdated,true);
  assert.equal(stale.title,"Update Available");
  assert.equal(stale.updateText,"Refresh to Latest Version");
  assert.equal(stale.buttonText,"Update Available — Refresh");
  assert.equal(stale.badgeText,"UPDATE AVAILABLE");
  await stalePage.close();

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

  console.log(`Lost Sizzler production smoke passed: ${expectedReleaseVersion} release markers, stale-browser update prompt, live R47 browser runtime, feedback validation and Weekly Vault backend are responding.`);
  await context.close();
}finally{
  await browser.close();
}
