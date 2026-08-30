import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});
const USER_A="11111111-1111-4111-8111-111111111111";
const USER_B="22222222-2222-4222-8222-222222222222";

async function waitReady(page){
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R43SoloSave)&&Boolean(window.CCGLostSizzlerV141R44SoloCloudSave)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
}

async function installMock(page,{user=USER_A,rows={}}={}){
  await page.evaluate(({user,rows})=>{
    const copy=value=>value==null?value:JSON.parse(JSON.stringify(value));
    const store={rows:copy(rows)||{},writes:[],readError:null,writeError:null,currentUser:user};
    const client={from(){
      let filterUser="";
      return{
        select(){return this},
        eq(column,value){if(column==="user_id")filterUser=String(value||"");return this},
        async maybeSingle(){return{data:copy(store.rows[filterUser]||null),error:store.readError}},
        async upsert(payload){if(store.writeError)return{data:null,error:store.writeError};const row=copy(payload);store.rows[row.user_id]=row;store.writes.push(row);return{data:null,error:null}}
      }
    }};
    const context=()=>store.currentUser?{user:{id:store.currentUser},session:{user:{id:store.currentUser}},isAuthenticated:true}:{user:null,session:null,isAuthenticated:false};
    window.__r44Mock=store;
    window.ccgSupabase=window.ccgSupabase||{};
    window.ccgSupabase.getClient=async()=>client;
    window.ccgSupabase.waitForSessionReady=async()=>context();
    window.ccgSupabase.getCurrentUserContext=async()=>context();
  },{user,rows});
}

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  console.log("[r44 cloud] load canonical page and install authenticated Supabase mock");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await waitReady(page);
  await installMock(page,{user:USER_A});
  const clean=await page.evaluate(async()=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave;
    r43.clearSoloSave();localStorage.removeItem(r44.META_KEY);r44.observeLocal();await r44.refreshAuthAndSync();
    return{signedIn:r44.state.signedIn,userId:r44.state.userId,row:window.__r44Mock.rows[r44.state.userId]||null};
  });
  assert.equal(clean.signedIn,true,"cloud regression must begin with a resolved authenticated account");
  assert.equal(clean.userId,USER_A,"r44 must use the authenticated website account id");
  assert.equal(clean.row,null,"empty account must begin without a cloud row");

  console.log("[r44 cloud] real Floor 1 autosave mirrors local-first checkpoint");
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&window.CCGLostSizzlerV141R43SoloSave?.readEnvelope?.()?.summary?.floor===1,null,{timeout:20000});
  await page.waitForFunction(user=>Boolean(window.__r44Mock?.rows?.[user]?.save_envelope),USER_A,{timeout:10000});
  const upload=await page.evaluate(user=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,local=r43.readEnvelope(),row=window.__r44Mock.rows[user];
    return{localFingerprint:r44.fingerprint(local),cloudFingerprint:r44.fingerprint(row.save_envelope),owner:row.user_id,deletedAt:row.deleted_at,writes:window.__r44Mock.writes.length,meta:r44.readMeta(),row:JSON.parse(JSON.stringify(row)),envelope:JSON.parse(JSON.stringify(local))};
  },USER_A);
  assert.equal(upload.localFingerprint,upload.cloudFingerprint,"Floor 1 cloud mirror must match the validated local envelope");
  assert.equal(upload.owner,USER_A,"cloud row must be owned by the authenticated account");
  assert.equal(upload.deletedAt,null,"ordinary save mirror must not be a tombstone");
  assert.ok(upload.writes>=1,"Floor 1 autosave must reach the cloud mirror asynchronously");
  assert.equal(upload.meta.ownerUserId,USER_A,"local sync metadata must remember the owning account");

  console.log("[r44 cloud] simulate a genuinely fresh page/device and restore cloud save");
  await page.evaluate(({primary,backup,meta})=>{
    try{quitToMenu?.()}catch(_){}
    localStorage.removeItem(primary);localStorage.removeItem(backup);localStorage.removeItem(meta);
  },{primary:"ccg-lost-sizzler-solo-save-v2",backup:"ccg-lost-sizzler-solo-save-v2-backup",meta:"ccg-lost-sizzler-solo-cloud-sync-v1"});
  await page.reload({waitUntil:"domcontentloaded"});
  await waitReady(page);
  await installMock(page,{user:USER_A,rows:{[USER_A]:upload.row}});
  const restoredSync=await page.evaluate(()=>window.CCGLostSizzlerV141R44SoloCloudSave.refreshAuthAndSync());
  assert.equal(restoredSync.signedIn,true,"fresh page must resolve the authenticated account");
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R43SoloSave?.readEnvelope?.()?.summary?.floor===1,null,{timeout:10000});
  const restored=await page.evaluate(expected=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,e=r43.readEnvelope();
    return{fingerprint:r44.fingerprint(e),expected:r44.fingerprint(expected),downloads:r44.state.downloads,status:r44.state.status,button:document.getElementById("continue-save-btn")?.textContent||""};
  },upload.envelope);
  assert.equal(restored.fingerprint,restored.expected,"fresh-device reconciliation must restore the exact cloud envelope locally");
  assert.ok(restored.downloads>=1,"cloud restore diagnostic must advance");
  assert.equal(restored.status,"restored","successful cloud download must publish restored status");
  assert.match(restored.button,/Continue Solo — Floor 1/,"restored cloud save must feed the existing Continue UI");

  console.log("[r44 cloud] newer cloud save is deferred during active play and applied at menu");
  await page.click("#continue-save-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&run?.floor===1,null,{timeout:20000});
  const newer=await page.evaluate(async user=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,current=r43.readEnvelope(),cp=JSON.parse(JSON.stringify(current.checkpoint));
    cp.score=(Number(cp.score)||0)+4321;await new Promise(resolve=>setTimeout(resolve,8));
    const envelope=r43.makeEnvelope(cp,"cloud_test_newer"),row=r44.savePayload(user,envelope);window.__r44Mock.rows[user]=JSON.parse(JSON.stringify(row));window.__r44Mock.newerEnvelope=JSON.parse(JSON.stringify(envelope));
    const before=r44.fingerprint(r43.readEnvelope()),result=await r44.syncNow(),after=r44.fingerprint(r43.readEnvelope());
    return{before,after,action:result?.action||"",status:r44.state.status};
  },USER_A);
  assert.equal(newer.after,newer.before,"newer cloud state must not replace local storage during an active run");
  assert.match(newer.action,/deferred/,"active-run cloud conflict must be explicitly deferred");
  assert.equal(newer.status,"deferred","active-run conflict must expose deferred status");
  await page.evaluate(()=>quitToMenu());
  await page.waitForFunction(()=>mode==="menu"&&document.body.dataset.runActive!=="true"&&!run&&!p1,null,{timeout:10000});
  await page.evaluate(()=>window.CCGLostSizzlerV141R44SoloCloudSave.syncNow());
  const afterDeferred=await page.evaluate(()=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,e=r43.readEnvelope();
    return{fingerprint:r44.fingerprint(e),expected:r44.fingerprint(window.__r44Mock.newerEnvelope),status:r44.state.status};
  });
  assert.equal(afterDeferred.fingerprint,afterDeferred.expected,"deferred cloud save must install after returning to menu");
  assert.equal(afterDeferred.status,"restored","post-run reconciliation must report a restore");

  console.log("[r44 cloud] corrupt cloud state is rejected and local copy survives");
  const corruption=await page.evaluate(async user=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,local=r43.readEnvelope(),before=r44.fingerprint(local),bad=JSON.parse(JSON.stringify(local));
    bad.checkpoint.score=(Number(bad.checkpoint.score)||0)+99;
    const row=r44.savePayload(user,local);row.save_envelope=bad;window.__r44Mock.rows[user]=row;
    const invalidBefore=r44.state.cloudInvalid,result=await r44.syncNow(),after=r44.fingerprint(r43.readEnvelope()),cloud=r44.cloudState(window.__r44Mock.rows[user]);
    return{before,after,invalidDelta:r44.state.cloudInvalid-invalidBefore,resultOk:result?.ok,cloudKind:cloud.kind};
  },USER_A);
  assert.equal(corruption.after,corruption.before,"invalid cloud data must never replace the local Solo save");
  assert.ok(corruption.invalidDelta>=1,"invalid cloud envelope must be recorded by diagnostics");
  assert.equal(corruption.cloudKind,"save","valid local state should repair an invalid cloud mirror");

  console.log("[r44 cloud] transport failure leaves browser save untouched");
  const offline=await page.evaluate(async()=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,before=r44.fingerprint(r43.readEnvelope());
    window.__r44Mock.readError={message:"simulated offline"};const result=await r44.syncNow();const after=r44.fingerprint(r43.readEnvelope());window.__r44Mock.readError=null;
    return{before,after,ok:result?.ok,status:r44.state.status,error:r44.state.lastError};
  });
  assert.equal(offline.after,offline.before,"network failure must not mutate the browser save");
  assert.equal(offline.ok,false,"network failure must report a failed cloud attempt");
  assert.equal(offline.status,"unavailable","network failure must expose local-fallback status");
  assert.match(offline.error,/simulated offline/,"cloud diagnostic must retain the transport error without throwing");

  console.log("[r44 cloud] completed/cleared run writes a tombstone and cannot resurrect");
  await page.evaluate(()=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,saved=r43.readEnvelope();run=JSON.parse(JSON.stringify(saved.checkpoint.run));p1=JSON.parse(JSON.stringify(saved.checkpoint.player));p2=null;playMode="solo";document.body.dataset.runActive="true";mode="playing";
  });
  await page.evaluate(()=>PGR.clearCheckpoint());
  await page.waitForFunction(user=>Boolean(window.__r44Mock?.rows?.[user]?.deleted_at),USER_A,{timeout:10000});
  await page.evaluate(()=>quitToMenu());
  await page.waitForFunction(()=>mode==="menu"&&document.body.dataset.runActive!=="true"&&!run&&!p1,null,{timeout:10000});
  const tombstone=await page.evaluate(async user=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave;await r44.syncNow();const row=window.__r44Mock.rows[user];
    return{local:Boolean(r43.readEnvelope()),deletedAt:row.deleted_at,envelope:row.save_envelope,revision:Number(row.client_revision_ms)||0,meta:r44.readMeta(),tombstones:r44.state.tombstones};
  },USER_A);
  assert.equal(tombstone.local,false,"cloud tombstone must not resurrect a cleared browser save");
  assert.ok(tombstone.deletedAt,"cleared Solo run must persist a cloud deletion timestamp");
  assert.equal(tombstone.envelope,null,"tombstone must not retain stale cloud checkpoint data");
  assert.ok(tombstone.revision>0,"tombstone must carry a conflict-resolution revision");
  assert.equal(tombstone.meta.ownerUserId,USER_A,"tombstone ownership must remain bound to the account that cleared the save");
  assert.ok(tombstone.tombstones>=1,"cloud tombstone upload diagnostic must advance");

  console.log("[r44 cloud] account switch cannot upload another account's browser save");
  const accountIsolation=await page.evaluate(async({userA,userB,envelope})=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave;
    localStorage.setItem(r43.PRIMARY_KEY,JSON.stringify(envelope));localStorage.removeItem(r43.BACKUP_KEY);
    localStorage.setItem(r44.META_KEY,JSON.stringify({version:1,ownerUserId:userA,localRevisionMs:Number(envelope.savedAt)||0,tombstoneRevisionMs:0,lastFingerprint:r44.fingerprint(envelope),lastSyncedFingerprint:r44.fingerprint(envelope),lastCloudRevisionMs:Number(envelope.savedAt)||0,lastSyncAt:Date.now()}));
    r44.observeLocal();window.__r44Mock.currentUser=userB;delete window.__r44Mock.rows[userB];const writesBefore=window.__r44Mock.writes.length;await r44.refreshAuthAndSync();
    return{status:r44.state.status,userId:r44.state.userId,rowB:window.__r44Mock.rows[userB]||null,writesDelta:window.__r44Mock.writes.length-writesBefore,local:r44.fingerprint(r43.readEnvelope())};
  },{userA:USER_A,userB:USER_B,envelope:upload.envelope});
  assert.equal(accountIsolation.userId,USER_B,"mock account switch must be observed");
  assert.equal(accountIsolation.rowB,null,"foreign browser save must not be uploaded into the second account");
  assert.equal(accountIsolation.writesDelta,0,"account conflict must not perform a cloud write");
  assert.equal(accountIsolation.status,"account_conflict","account conflict must be surfaced in the UI state");
  assert.equal(accountIsolation.local,upload.localFingerprint,"account switch must not mutate the foreign local save");

  assert.deepEqual(errors,[],`r44 cloud-save regression must not throw page errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler r44 authenticated cloud mirror, fresh-device restore, deferred conflict, offline fallback, tombstone and account isolation passed in Chromium.");
  await context.close();
}finally{
  await browser.close().catch(()=>{});
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
