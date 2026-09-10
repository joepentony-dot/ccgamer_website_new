import assert from "node:assert/strict";
import {chromium} from "playwright";

const gameUrl=process.env.CCG_LOST_SIZZLER_URL||"https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/";
const supabaseUrl=(process.env.CCG_SUPABASE_URL||"https://lcslgxpgmttaexsorxik.supabase.co").replace(/\/$/,"");
const origin="https://www.cheekycommodoregamer.co.uk";
const expectedReleaseVersion="V10.42";
const expectedBuild="2026.09.10.1";
const expectedCacheToken="20260910r1";
const expectedRuntimeBuild="V10.41-r47";
const syntheticStaleBuild="2026.09.10.0-production-smoke";
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

async function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

async function readLiveSnapshot(page){
  return page.evaluate(async()=>{
    const readMeta=name=>document.querySelector(`meta[name="${name}"]`)?.content||null;
    let manifest={status:null,releaseVersion:null,build:null,cacheToken:null,error:null};
    try{
      const url=new URL("version.json",window.location.href);
      url.searchParams.set("release-smoke-probe",String(Date.now()));
      const response=await fetch(url.toString(),{cache:"no-store",headers:{"Cache-Control":"no-cache"}});
      manifest.status=response.status;
      if(response.ok){
        const payload=await response.json();
        manifest.releaseVersion=String(payload?.releaseVersion||"")||null;
        manifest.build=String(payload?.build||"")||null;
        manifest.cacheToken=String(payload?.cacheToken||"")||null;
      }else manifest.error=`HTTP ${response.status}`;
    }catch(error){manifest.error=String(error?.message||error)}
    const versionState=window.CCGLostSizzlerVersion?.state||null;
    return {
      href:window.location.href,
      ready:document.body?.dataset?.releaseReady||null,
      gameReady:document.body?.dataset?.gameReady||null,
      runActive:document.body?.dataset?.runActive||null,
      tier:document.body?.dataset?.v141R47PerformanceTier||null,
      legacyRuntimePresent:Boolean(window.CCGLostSizzlerV141R47AllModeOptimisation),
      runtimeBuild:window.CCGLostSizzlerV141R47AllModeOptimisation?.BUILD||null,
      updaterPresent:Boolean(window.CCGLostSizzlerVersion),
      updaterReleaseVersion:window.CCGLostSizzlerVersion?.releaseVersion||null,
      current:versionState?.current||null,
      latest:versionState?.latest||null,
      checking:Boolean(versionState?.checking),
      outdated:Boolean(versionState?.outdated),
      lastCheck:Number(versionState?.lastCheck||0),
      pageBuild:readMeta("ccg-lost-sizzler-build"),
      pageCache:readMeta("ccg-lost-sizzler-cache"),
      pageVersion:readMeta("ccg-lost-sizzler-version"),
      versionScriptSrc:document.querySelector('script[src*="version-check.js"]')?.src||null,
      versionButton:Boolean(document.getElementById("version-refresh-btn")),
      versionPanel:Boolean(document.getElementById("version-check-panel")),
      canvas:Boolean(document.getElementById("game")),
      manifest
    };
  });
}

function releaseSnapshotMatches(snapshot){
  return Boolean(snapshot&&
    snapshot.pageBuild===expectedBuild&&
    snapshot.pageCache===expectedCacheToken&&
    snapshot.updaterPresent&&
    snapshot.updaterReleaseVersion===expectedReleaseVersion&&
    snapshot.current===expectedBuild&&
    snapshot.latest===expectedBuild&&
    snapshot.outdated===false&&
    snapshot.manifest?.status===200&&
    snapshot.manifest?.releaseVersion===expectedReleaseVersion&&
    snapshot.manifest?.build===expectedBuild&&
    snapshot.manifest?.cacheToken===expectedCacheToken&&
    String(snapshot.versionScriptSrc||"").includes(`version-check.js?v=${expectedCacheToken}`));
}

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(30000);
  const pageErrors=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));

  console.log("[production smoke] verify live V10.42 release markers and update checker independently of gameplay readiness");
  let live=null,lastSnapshot=null,lastError="",livePageErrors=[];
  for(let attempt=1;attempt<=18;attempt++){
    pageErrors.length=0;
    try{
      await page.goto(`${gameUrl}${gameUrl.includes("?")?"&":"?"}release-smoke=${Date.now()}`,{waitUntil:"domcontentloaded",timeout:30000});
      try{await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerVersion),{timeout:8000})}catch(_){}
      try{await page.waitForFunction(build=>window.CCGLostSizzlerVersion?.state?.latest===build,expectedBuild,{timeout:8000})}catch(_){}
      lastSnapshot=await readLiveSnapshot(page);
      console.log(`[production smoke] release attempt ${attempt}/18: ${JSON.stringify(lastSnapshot)}`);
      if(releaseSnapshotMatches(lastSnapshot)){
        live=lastSnapshot;
        livePageErrors=[...pageErrors];
        break;
      }
      lastError="live release/update values did not yet match the published V10.42 contract";
    }catch(error){
      lastError=String(error?.stack||error?.message||error);
      try{lastSnapshot=await readLiveSnapshot(page)}catch(_){}
      console.log(`[production smoke] release attempt ${attempt}/18 error: ${lastError}`);
      if(lastSnapshot)console.log(`[production smoke] release attempt ${attempt}/18 snapshot after error: ${JSON.stringify(lastSnapshot)}`);
    }
    if(attempt<18)await sleep(10000);
  }
  assert.ok(live,`live Lost Sizzler did not expose the expected V10.42 update contract after deployment retries. Last error: ${lastError}. Last snapshot: ${JSON.stringify(lastSnapshot)}`);
  assert.equal(live.pageBuild,expectedBuild,"deployed page build marker must match the published release build");
  assert.equal(live.pageCache,expectedCacheToken,"deployed page cache token must match the published release cache token");
  assert.equal(live.updaterReleaseVersion,expectedReleaseVersion,"deployed update checker must identify the current release family");
  assert.equal(live.current,expectedBuild,"deployed update checker must identify the build loaded by this browser");
  assert.equal(live.latest,expectedBuild,"deployed update checker must read the current live build marker");
  assert.equal(live.outdated,false,"current production page must not mark itself outdated");
  assert.equal(live.manifest.status,200,"public version.json must be reachable from the deployed page");
  assert.equal(live.manifest.releaseVersion,expectedReleaseVersion);
  assert.equal(live.manifest.build,expectedBuild);
  assert.equal(live.manifest.cacheToken,expectedCacheToken);
  assert.equal(live.versionButton,true,"production page must expose the version refresh control");
  assert.equal(live.versionPanel,true,"production page must install the update panel");
  assert.deepEqual(livePageErrors,[],`live V10.42 release/update page emitted uncaught errors: ${livePageErrors.join("\n")}`);

  console.log("[production smoke] verify a stale browser receives the live Update Available prompt");
  const stalePage=await context.newPage();
  stalePage.setDefaultTimeout(30000);
  const stalePageErrors=[];stalePage.on("pageerror",error=>stalePageErrors.push(String(error?.stack||error)));
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
  console.log(`[production smoke] stale-browser snapshot: ${JSON.stringify(stale)}`);
  assert.equal(documentRewritten,true,"production smoke must exercise the stale-browser document path");
  assert.equal(stale.current,syntheticStaleBuild);
  assert.equal(stale.latest,expectedBuild);
  assert.equal(stale.outdated,true);
  assert.equal(stale.title,"Update Available");
  assert.equal(stale.updateText,"Refresh to Latest Version");
  assert.equal(stale.buttonText,"Update Available — Refresh");
  assert.equal(stale.badgeText,"UPDATE AVAILABLE");
  assert.deepEqual(stalePageErrors,[],`stale-browser update path emitted uncaught errors: ${stalePageErrors.join("\n")}`);
  await stalePage.close();

  console.log("[production smoke] verify legacy R47 gameplay runtime readiness separately from V10.42 update detection");
  let runtimeSnapshot=null,runtimeError="";
  try{
    await page.waitForFunction(()=>document.body?.dataset?.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R47AllModeOptimisation),{timeout:30000});
    runtimeSnapshot=await readLiveSnapshot(page);
  }catch(error){
    runtimeError=String(error?.stack||error?.message||error);
    try{runtimeSnapshot=await readLiveSnapshot(page)}catch(_){}
  }
  console.log(`[production smoke] runtime snapshot: ${JSON.stringify(runtimeSnapshot)}`);
  assert.ok(runtimeSnapshot?.ready==="true"&&runtimeSnapshot?.legacyRuntimePresent,`legacy R47 gameplay runtime did not become release-ready. Error: ${runtimeError}. Snapshot: ${JSON.stringify(runtimeSnapshot)}`);
  assert.equal(runtimeSnapshot.runtimeBuild,expectedRuntimeBuild);
  assert.equal(runtimeSnapshot.canvas,true);
  assert.ok(["normal","reduced","severe"].includes(runtimeSnapshot.tier));
  assert.deepEqual(pageErrors,[],`live gameplay runtime emitted uncaught errors: ${pageErrors.join("\n")}`);

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
