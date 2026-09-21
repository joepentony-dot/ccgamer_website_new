import assert from "node:assert/strict";
import {chromium} from "playwright";

const gameUrl=process.env.CCG_LOST_SIZZLER_URL||"https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/";
const supabaseUrl=(process.env.CCG_SUPABASE_URL||"https://lcslgxpgmttaexsorxik.supabase.co").replace(/\/$/,"");
const origin="https://www.cheekycommodoregamer.co.uk";
const expectedReleaseVersion="V10.42";
const expectedBuild="V10.42 r37";
const expectedCacheToken="20260921r37";
const syntheticStaleBuild="2026.09.10.0-production-smoke";
const versionUrl=new URL("version.json",gameUrl).toString();
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

async function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

async function browserReleaseSnapshot(page){
  try{
    return await page.evaluate(()=>({
      ready:document.body?.dataset?.releaseReady||null,
      v142BootstrapReady:document.body?.dataset?.v142BootstrapReady||null,
      v142Build:document.body?.dataset?.v142Build||null,
      runtimeBuild:window.CCGLostSizzlerV141R47AllModeOptimisation?.BUILD||null,
      bootstrapBuild:window.CCGLostSizzlerV142Bootstrap?.build||null,
      bootstrapCache:window.CCGLostSizzlerV142Bootstrap?.cache||null,
      bootstrapReady:Boolean(window.CCGLostSizzlerV142Bootstrap?.ready),
      bootstrapFailed:Boolean(window.CCGLostSizzlerV142Bootstrap?.failed),
      bootstrapError:window.CCGLostSizzlerV142Bootstrap?.error||null,
      domBuild:document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||null,
      domCache:document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||null,
      releaseVersion:window.CCGLostSizzlerVersion?.releaseVersion||null,
      current:window.CCGLostSizzlerVersion?.state?.current||null,
      latest:window.CCGLostSizzlerVersion?.state?.latest||null,
      outdated:Boolean(window.CCGLostSizzlerVersion?.state?.outdated)
    }));
  }catch(error){
    return {snapshotError:String(error?.message||error)};
  }
}

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(30000);
  const pageErrors=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  await page.addInitScript(()=>{
    const audit={samples:0,preReadySamples:0,settledSamples:0,violations:[],postReadyReappear:[],firstReveal:null};
    Object.defineProperty(window,"__CCGDungeonProductionStartupAudit",{value:audit,configurable:false,writable:false});
    const buttons=()=>Object.fromEntries(["solo-btn","split-btn","tutorial-zone-btn","daily-btn"].map(id=>{
      const element=document.getElementById(id),style=element?getComputedStyle(element):null;
      return [id,style?{
        color:style.color,
        backgroundColor:style.backgroundColor,
        borderTopColor:style.borderTopColor,
        minHeight:style.minHeight,
        padding:style.padding,
        fontSize:style.fontSize,
        fontFamily:style.fontFamily
      }:null];
    }));
    const sample=()=>{
      const loader=document.getElementById("ccg-release-loading");
      const body=document.body;
      if(loader&&body){
        audit.samples++;
        const style=getComputedStyle(loader),rect=loader.getBoundingClientRect();
        const visible=!loader.hidden&&style.display!=="none"&&style.visibility!=="hidden"&&Number.parseFloat(style.opacity||"1")>0;
        const coversViewport=style.position==="fixed"&&Number(style.zIndex||0)>1000000&&rect.left<=0&&rect.top<=0&&rect.right>=innerWidth&&rect.bottom>=innerHeight;
        const releaseReady=body.dataset.releaseReady==="true";
        const v142Ready=window.CCGLostSizzlerV142Bootstrap?.ready===true;
        const finalLayout=document.querySelector("#menu .game-mode-buttons")?.dataset?.r55TextLayout==="true";
        const authoritative=releaseReady&&v142Ready&&finalLayout;
        const state={at:Math.round(performance.now()),visible,coversViewport,hidden:Boolean(loader.hidden),display:style.display,visibility:style.visibility,releaseReady,v142Ready,finalLayout};
        if(!authoritative){
          audit.preReadySamples++;
          if(!visible||!coversViewport){
            if(audit.violations.length<12)audit.violations.push(state);
          }
        }else if(!visible){
          audit.settledSamples++;
          if(!audit.firstReveal)audit.firstReveal={...state,buttons:buttons()};
        }
        if(audit.firstReveal&&visible&&audit.postReadyReappear.length<12)audit.postReadyReappear.push(state);
      }
      requestAnimationFrame(sample);
    };
    addEventListener("DOMContentLoaded",()=>requestAnimationFrame(sample),{once:true});
  });

  console.log("[production smoke] wait for live release browser runtime and release markers");
  let live=null,lastError="",lastSnapshot=null;
  for(let attempt=1;attempt<=18;attempt++){
    try{
      await page.goto(`${gameUrl}${gameUrl.includes("?")?"&":"?"}release-smoke=${Date.now()}`,{waitUntil:"domcontentloaded",timeout:30000});
      await page.waitForFunction(build=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R47AllModeOptimisation)&&Boolean(window.CCGLostSizzlerVersion)&&window.CCGLostSizzlerVersion?.state?.current===build,expectedBuild,{timeout:12000});
      await page.waitForFunction(build=>window.CCGLostSizzlerVersion?.state?.latest===build,expectedBuild,{timeout:12000});
      live=await page.evaluate(()=>({
        ready:document.body.dataset.releaseReady,
        tier:document.body.dataset.v141R47PerformanceTier,
        runtimeBuild:window.CCGLostSizzlerV141R47AllModeOptimisation?.BUILD,
        bootstrapBuild:window.CCGLostSizzlerV142Bootstrap?.build||null,
        bootstrapCache:window.CCGLostSizzlerV142Bootstrap?.cache||null,
        bootstrapReady:Boolean(window.CCGLostSizzlerV142Bootstrap?.ready),
        domBuild:document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||null,
        domCache:document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||null,
        releaseVersion:window.CCGLostSizzlerVersion?.releaseVersion||null,
        current:window.CCGLostSizzlerVersion?.state?.current||null,
        latest:window.CCGLostSizzlerVersion?.state?.latest||null,
        outdated:Boolean(window.CCGLostSizzlerVersion?.state?.outdated),
        versionButton:Boolean(document.getElementById("version-refresh-btn")),
        versionPanel:Boolean(document.getElementById("version-check-panel")),
        canvas:Boolean(document.getElementById("game"))
      }));
      break;
    }catch(error){
      lastError=String(error?.message||error);
      lastSnapshot=await browserReleaseSnapshot(page);
      console.log(`[production smoke] release attempt ${attempt}/18 not ready: ${lastError}`);
      console.log(`[production smoke] release snapshot ${JSON.stringify(lastSnapshot)}`);
      if(attempt<18)await sleep(10000);
    }
  }
  assert.ok(live,`live Lost Sizzler did not expose the expected release after deployment retries: ${lastError}; snapshot=${JSON.stringify(lastSnapshot)}`);
  assert.equal(live.ready,"true");
  assert.equal(live.runtimeBuild,"V10.41-r47");
  assert.equal(live.bootstrapReady,true,"V10.42 ordered bootstrap must finish before production is treated as ready");
  assert.equal(live.current,expectedBuild,"deployed update checker must retain the public release build loaded from the document");
  assert.equal(live.releaseVersion,expectedReleaseVersion,"deployed update checker must identify the current release family");
  assert.equal(live.latest,expectedBuild,"deployed update checker must read the current live build marker");
  assert.equal(live.outdated,false,"current production page must not mark itself outdated");
  assert.equal(live.versionButton,true,"production page must expose the version refresh control");
  assert.equal(live.versionPanel,true,"production page must install the update panel");
  assert.equal(live.canvas,true);
  assert.ok(["normal","reduced","severe"].includes(live.tier));
  assert.deepEqual(pageErrors,[],`live page emitted uncaught errors: ${pageErrors.join("\n")}`);

  console.log("[production smoke] verify live startup never exposes an intermediate menu frame");
  await page.waitForFunction(()=>document.querySelector("#menu .game-mode-buttons")?.dataset?.r55TextLayout==="true"&&document.getElementById("ccg-release-loading")?.hidden===true,null,{timeout:15000});
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,750)));
  const startupAudit=await page.evaluate(()=>{
    const audit=window.__CCGDungeonProductionStartupAudit;
    const buttons=Object.fromEntries(["solo-btn","split-btn","tutorial-zone-btn","daily-btn"].map(id=>{
      const element=document.getElementById(id),style=element?getComputedStyle(element):null;
      return [id,style?{
        color:style.color,
        backgroundColor:style.backgroundColor,
        borderTopColor:style.borderTopColor,
        minHeight:style.minHeight,
        padding:style.padding,
        fontSize:style.fontSize,
        fontFamily:style.fontFamily
      }:null];
    }));
    return {audit,buttons};
  });
  assert.ok(startupAudit.audit?.samples>0,"production startup audit must observe rendered frames");
  assert.ok(startupAudit.audit?.preReadySamples>0,"production startup audit must observe at least one pre-ready rendered frame");
  assert.deepEqual(startupAudit.audit?.violations||[],[],`loader must cover every rendered frame until final V10.42 menu readiness: ${JSON.stringify(startupAudit.audit?.violations||[])}`);
  assert.ok(startupAudit.audit?.firstReveal,"production startup audit must observe the first authoritative menu reveal");
  assert.deepEqual(startupAudit.audit?.postReadyReappear||[],[],`loader must not reappear after authoritative menu reveal: ${JSON.stringify(startupAudit.audit?.postReadyReappear||[])}`);
  assert.deepEqual(startupAudit.buttons,startupAudit.audit.firstReveal.buttons,"main mode-button presentation must not change after the first authoritative menu reveal");

  console.log(`[production smoke] live runtime identity ${live.bootstrapBuild||"unknown"} / ${live.bootstrapCache||"unknown"}; public release identity ${live.current}`);
  console.log("[production smoke] verify deployed version.json matches the public release identity");
  const versionResponse=await fetch(`${versionUrl}${versionUrl.includes("?")?"&":"?"}release-smoke=${Date.now()}`,{headers:{"Cache-Control":"no-cache"}});
  assert.equal(versionResponse.status,200,"public version.json must be reachable");
  const versionPayload=await versionResponse.json();
  assert.equal(String(versionPayload?.releaseVersion||""),expectedReleaseVersion);
  assert.equal(String(versionPayload?.build||""),expectedBuild);
  assert.equal(String(versionPayload?.cacheToken||""),expectedCacheToken);
  assert.equal(live.current,String(versionPayload.build),"update-checker current build and version.json build must stay in lockstep");

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
    const expectedBuildMeta=`<meta name="ccg-lost-sizzler-build" content="${expectedBuild}">`;
    const expectedCacheMeta=`<meta name="ccg-lost-sizzler-cache" content="${expectedCacheToken}">`;
    assert.ok(html.includes(expectedBuildMeta),"live document source must contain the expected public build marker before stale-browser simulation");
    assert.ok(html.includes(expectedCacheMeta),"live document source must contain the expected public cache marker before stale-browser simulation");
    const staleHtml=html.replace(expectedBuildMeta,`<meta name="ccg-lost-sizzler-build" content="${syntheticStaleBuild}">`);
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

  console.log(`Lost Sizzler production smoke passed: ${expectedReleaseVersion} public release identity, stale-browser update prompt, live R47/V10.42 browser runtime, feedback validation and Weekly Vault backend are responding.`);
  await context.close();
}finally{
  await browser.close();
}
