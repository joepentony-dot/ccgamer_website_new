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

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R43SoloSave)&&Boolean(window.CCGLostSizzlerV141R44SoloCloudSave)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});

  // Install a deterministic in-browser Supabase mock after the site's real auth
  // bridge has loaded. The production r44 code still exercises its real
  // getClient/auth/table-query paths; only the remote transport is substituted.
  await page.evaluate(userA=>{
    const store={rows:{},writes:[],readError:null,writeError:null,currentUser:userA};
    const copy=value=>value==null?value:JSON.parse(JSON.stringify(value));
    const client={from(table){
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
  },USER_A);

  const clean=await page.evaluate(async()=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave;
    r43.clearSoloSave();localStorage.removeItem(r44.META_KEY);r44.observeLocal();await r44.refreshAuthAndSync();
    return{signedIn:r44.state.signedIn,userId:r44.state.userId,row:window.__r44Mock.rows[r44.state.userId]||null}
  });
  assert.equal(clean.signedIn,true,"cloud regression must begin with a resolved authenticated account");
  assert.equal(clean.userId,USER_A,"r44 must use the authenticated website account id");
  assert.equal(clean.row,null,"empty account must begin without a cloud row");

  // A real Floor 1 Solo autosave must remain local-first, then mirror to the
  // authenticated row without changing the r43 envelope.
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&window.CCGLostSizzlerV141R43SoloSave?.readEnvelope?.()?.summary?.floor===1,null,{timeout:20000});
  await page.waitForFunction(user=>Boolean(window.__r44Mock?.rows?.[user]?.save_envelope),USER_A,{timeout:10000});
  const upload=await page.evaluate(user=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,local=r43.readEnvelope(),row=window.__r44Mock.rows[user];
    window.__r44Mock.savedEnvelope=JSON.parse(JSON.stringify(local));
    return{localFingerprint:r44.fingerprint(local),cloudFingerprint:r44.fingerprint(row.save_envelope),owner:row.user_id,deletedAt:row.deleted_at,writes:window.__r44Mock.writes.length,status:r44.state.status,meta:r44.readMeta()}
  },USER_A);
  assert.equal(upload.localFingerprint,upload.cloudFingerprint,"Floor 1 cloud mirror must be byte-state equivalent to the validated local envelope");
  assert.equal(upload.owner,USER_A,"cloud row must be owned by the authenticated account");
  assert.equal(upload.deletedAt,null,"ordinary save mirror must not be a tombstone");
  assert.ok(upload.writes>=1,"Floor 1 autosave must reach the cloud mirror asynchronously");
  assert.equal(upload.meta.ownerUserId,USER_A,"local sync metadata must remember which account owns the browser save");

  // Simulate a brand-new browser/device by removing only local save state while
  // leaving the authenticated cloud row intact. r44 must restore the cloud save
  // into r43's local slot while the game is at the menu.
  await page.evaluate(()=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,user=r44.state.userId;
    document.body.dataset.runActive="false";mode="menu";UI.menu.classList.remove("hidden");
    localStorage.removeItem(r43.PRIMARY_KEY);localStorage.removeItem(r43.BACKUP_KEY);
    localStorage.setItem(r44.META_KEY,JSON.stringify({version:1,ownerUserId:user,localRevisionMs:0,tombstoneRevisionMs:0,lastFingerprint:"",lastSyncedFingerprint:"",lastCloudRevisionMs:0,lastSyncAt:0}));
    r44.observeLocal();
  });
  await page.evaluate(()=>window.CCGLostSizzlerV141R44SoloCloudSave.syncNow());
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R43SoloSave?.readEnvelope?.()?.summary?.floor===1,null,{timeout:10000});
  const restored=await page.evaluate(()=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,e=r43.readEnvelope();
    return{fingerprint:r44.fingerprint(e),expected:r44.fingerprint(window.__r44Mock.savedEnvelope),downloads:r44.state.downloads,status:r44.state.status,button:document.getElementById("continue-save-btn")?.textContent||""}
  });
  assert.equal(restored.fingerprint,restored.expected,"new-device reconciliation must restore the account cloud envelope locally");
  assert.ok(restored.downloads>=1,"cloud restore diagnostic must advance");
  assert.equal(restored.status,"restored","successful cloud download must publish restored status");
  assert.match(restored.button,/Continue Solo — Floor 1/,"restored cloud save must feed the existing r43 Continue UI");

  // A newer cloud copy must never alter the current active run. It is deferred
  // until the title/menu is safe, then becomes the new local Continue state.
  await page.click("#continue-save-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&run?.floor===1,null,{timeout:20000});
  const newer=await page.evaluate(async user=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,current=r43.readEnvelope(),cp=JSON.parse(JSON.stringify(current.checkpoint));
    cp.score=(Number(cp.score)||0)+4321;await new Promise(resolve=>setTimeout(resolve,8));
    const envelope=r43.makeEnvelope(cp,"cloud_test_newer"),row=r44.savePayload(user,envelope);window.__r44Mock.rows[user]=JSON.parse(JSON.stringify(row));window.__r44Mock.newerEnvelope=JSON.parse(JSON.stringify(envelope));
    const before=r44.fingerprint(r43.readEnvelope()),result=await r44.syncNow(),after=r44.fingerprint(r43.readEnvelope());
    return{before,after,action:result?.action||"",status:r44.state.status}
  },USER_A);
  assert.equal(newer.after,newer.before,"newer cloud state must not replace local storage during an active run");
  assert.match(newer.action,/deferred/,"active-run cloud conflict must be explicitly deferred");
  assert.equal(newer.status,"deferred","active-run conflict must expose deferred status");

  await page.evaluate(()=>{document.body.dataset.runActive="false";mode="menu";UI.menu.classList.remove("hidden")});
  await page.evaluate(()=>window.CCGLostSizzlerV141R44SoloCloudSave.syncNow());
  const afterDeferred=await page.evaluate(()=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,e=r43.readEnvelope();return{fingerprint:r44.fingerprint(e),expected:r44.fingerprint(window.__r44Mock.newerEnvelope),score:e?.checkpoint?.score||0,status:r44.state.status}
  });
  assert.equal(afterDeferred.fingerprint,afterDeferred.expected,"deferred cloud save must install once the active run leaves gameplay");
  assert.equal(afterDeferred.status,"restored","post-run cloud reconciliation must report a restore");

  // Cloud corruption is never trusted. A broken payload must not replace the
  // valid browser save; when possible the valid local copy repairs the mirror.
  const corruption=await page.evaluate(async user=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,local=r43.readEnvelope(),before=r44.fingerprint(local),bad=JSON.parse(JSON.stringify(local));
    bad.checkpoint.score=(Number(bad.checkpoint.score)||0)+99;
    const row=r44.savePayload(user,local);row.save_envelope=bad;window.__r44Mock.rows[user]=row;
    const invalidBefore=r44.state.cloudInvalid,result=await r44.syncNow(),after=r44.fingerprint(r43.readEnvelope()),cloud=r44.cloudState(window.__r44Mock.rows[user]);
    return{before,after,invalidDelta:r44.state.cloudInvalid-invalidBefore,resultOk:result?.ok,cloudKind:cloud.kind}
  },USER_A);
  assert.equal(corruption.after,corruption.before,"invalid cloud data must never replace the local Solo save");
  assert.ok(corruption.invalidDelta>=1,"invalid cloud envelope must be recorded by diagnostics");
  assert.equal(corruption.cloudKind,"save","valid local state should repair an invalid cloud mirror when account ownership matches");

  // A transport failure must leave the local save untouched and degrade to the
  // browser fallback rather than blocking play or throwing a page error.
  const offline=await page.evaluate(async()=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,before=r44.fingerprint(r43.readEnvelope());
    window.__r44Mock.readError={message:"simulated offline"};const result=await r44.syncNow();const after=r44.fingerprint(r43.readEnvelope());window.__r44Mock.readError=null;
    return{before,after,ok:result?.ok,status:r44.state.status,error:r44.state.lastError}
  });
  assert.equal(offline.after,offline.before,"network failure must not mutate the browser save");
  assert.equal(offline.ok,false,"network failure must report a failed cloud attempt");
  assert.equal(offline.status,"unavailable","network failure must expose local-fallback status");
  assert.match(offline.error,/simulated offline/,"cloud diagnostic must retain the transport error without throwing");

  // Clearing the canonical Solo checkpoint while Solo ownership is active must
  // write a tombstone to the account. A later reconcile with no local envelope
  // must keep the save deleted instead of resurrecting the old cloud payload.
  await page.evaluate(()=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave;const saved=r43.readEnvelope();run=JSON.parse(JSON.stringify(saved.checkpoint.run));p1=JSON.parse(JSON.stringify(saved.checkpoint.player));p2=null;playMode="solo";document.body.dataset.runActive="true";mode="playing";
  });
  await page.evaluate(()=>PGR.clearCheckpoint());
  await page.waitForFunction(user=>Boolean(window.__r44Mock?.rows?.[user]?.deleted_at),USER_A,{timeout:10000});
  const tombstone=await page.evaluate(async user=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,row=window.__r44Mock.rows[user];
    document.body.dataset.runActive="false";mode="menu";await r44.syncNow();
    return{local:Boolean(r43.readEnvelope()),deletedAt:row.deleted_at,envelope:row.save_envelope,revision:Number(row.client_revision_ms)||0,meta:r44.readMeta(),status:r44.state.status,tombstones:r44.state.tombstones}
  },USER_A);
  assert.equal(tombstone.local,false,"cloud tombstone must not resurrect a cleared browser save");
  assert.ok(tombstone.deletedAt,"cleared Solo run must persist a cloud deletion timestamp");
  assert.equal(tombstone.envelope,null,"tombstone must not retain stale cloud checkpoint data");
  assert.ok(tombstone.revision>0,"tombstone must carry a conflict-resolution revision");
  assert.equal(tombstone.meta.ownerUserId,USER_A,"tombstone ownership must remain bound to the account that cleared the save");
  assert.ok(tombstone.tombstones>=1,"cloud tombstone upload diagnostic must advance");

  // Account switching must never leak a local save into another user's cloud row.
  // Re-create a valid browser save explicitly owned by A, then sign the mock in
  // as B with no cloud row. B must receive no upload and local state stays put.
  const accountIsolation=await page.evaluate(async({userA,userB})=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,envelope=JSON.parse(JSON.stringify(window.__r44Mock.savedEnvelope));
    localStorage.setItem(r43.PRIMARY_KEY,JSON.stringify(envelope));localStorage.removeItem(r43.BACKUP_KEY);
    localStorage.setItem(r44.META_KEY,JSON.stringify({version:1,ownerUserId:userA,localRevisionMs:Number(envelope.savedAt)||0,tombstoneRevisionMs:0,lastFingerprint:r44.fingerprint(envelope),lastSyncedFingerprint:"",lastCloudRevisionMs:0,lastSyncAt:0}));
    r44.observeLocal();delete window.__r44Mock.rows[userB];const beforeWrites=window.__r44Mock.writes.filter(row=>row.user_id===userB).length,before=r44.fingerprint(r43.readEnvelope());
    window.__r44Mock.currentUser=userB;await r44.refreshAuthAndSync();const after=r44.fingerprint(r43.readEnvelope()),afterWrites=window.__r44Mock.writes.filter(row=>row.user_id===userB).length;
    return{before,after,writeDelta:afterWrites-beforeWrites,status:r44.state.status,userId:r44.state.userId,bRow:window.__r44Mock.rows[userB]||null}
  },{userA:USER_A,userB:USER_B});
  assert.equal(accountIsolation.userId,USER_B,"auth refresh must switch cloud identity to account B");
  assert.equal(accountIsolation.after,accountIsolation.before,"account B must not replace account A's explicitly owned browser save");
  assert.equal(accountIsolation.writeDelta,0,"account A browser save must never upload into account B cloud storage");
  assert.equal(accountIsolation.bRow,null,"account B must remain cloud-empty after foreign local conflict");
  assert.equal(accountIsolation.status,"account_conflict","foreign local ownership must be surfaced as a safe sync pause");

  await page.waitForTimeout(350);
  assert.deepEqual(errors,[],`r44 Solo cloud-save regression must not produce page errors: ${errors.join("\n")}`);
  console.log("V10.41 r44 local-first upload, cross-device restore, active-run deferral, corruption fallback, tombstone and account isolation browser regression passed.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
