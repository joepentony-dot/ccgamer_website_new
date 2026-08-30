/* The Lost Sizzler V10.41 r44 — authenticated Solo cloud-save mirror.
 *
 * r43 remains the only owner of Solo checkpoint creation and local restore.
 * This layer mirrors r43's already-validated floor-entry envelope to the
 * signed-in CCG account through Supabase RLS. Network/auth failure never blocks
 * local play, Save & Quit, or Continue. Weekly, Tutorial, Split Screen and all
 * multiplayer modes remain outside this layer.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R44_SOLO_CLOUD_SAVE__)return;
  window.__CCG_LOST_SIZZLER_V141_R44_SOLO_CLOUD_SAVE__=true;

  const TABLE="lost_sizzler_solo_saves";
  const META_KEY="ccg-lost-sizzler-solo-cloud-sync-v1";
  const META_VERSION=1;
  const POLL_MS=600;
  const RETRY_MS=5000;
  const FRESH_DEVICE_WINDOW_MS=3000;
  const SELECT_COLUMNS="user_id,schema_name,schema_version,game_version,save_envelope,save_checksum,save_saved_at,client_revision_ms,deleted_at,updated_at";

  const state={
    timer:0,retryTimer:0,syncPromise:null,syncAgain:false,signedIn:false,userId:"",
    status:"boot",lastError:"",lastSyncAt:0,lastCloudCheckAt:0,lastObservedFingerprint:"",
    uploads:0,downloads:0,tombstones:0,cloudReads:0,cloudInvalid:0,authChecks:0,
    statusNode:null,suppressObservation:0,clearWrapped:false,freshDeviceUntil:0
  };

  const api=()=>window.CCGLostSizzlerV141R43SoloSave||null;
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch(_){return null}};
  const text=value=>String(value??"").trim();
  const nowMs=()=>Date.now();
  const activeRun=()=>document.body?.dataset?.runActive==="true";

  function defaultMeta(){return{version:META_VERSION,ownerUserId:"",localRevisionMs:0,tombstoneRevisionMs:0,lastFingerprint:"",lastSyncedFingerprint:"",lastCloudRevisionMs:0,lastSyncAt:0}}
  function readMeta(){
    try{
      const raw=JSON.parse(localStorage.getItem(META_KEY)||"null");
      if(!raw||Number(raw.version)!==META_VERSION)return defaultMeta();
      return{...defaultMeta(),...raw,version:META_VERSION,ownerUserId:text(raw.ownerUserId)}
    }catch(_){return defaultMeta()}
  }
  function writeMeta(meta){
    const next={...defaultMeta(),...(meta||{}),version:META_VERSION,ownerUserId:text(meta?.ownerUserId)};
    try{localStorage.setItem(META_KEY,JSON.stringify(next))}catch(_){}
    return next
  }

  function localEnvelope(){
    const r43=api();if(!r43)return null;
    try{return r43.validateEnvelope?.(r43.readEnvelope?.())||null}catch(_){return null}
  }
  function fingerprint(envelope){return envelope?`${Math.max(0,Number(envelope.savedAt)||0)}:${text(envelope.checksum)}`:""}
  function revisionForEnvelope(envelope){const n=Number(envelope?.savedAt);return Number.isFinite(n)&&n>0?Math.floor(n):0}
  function looksLikeFreshDevice(meta,envelope){
    return Boolean(!envelope&&meta&&text(meta.ownerUserId)&&!Number(meta.localRevisionMs||0)&&!Number(meta.tombstoneRevisionMs||0)&&!text(meta.lastFingerprint)&&!text(meta.lastSyncedFingerprint)&&!Number(meta.lastCloudRevisionMs||0))
  }
  function markFreshDevice(meta,envelope){
    if(looksLikeFreshDevice(meta,envelope))state.freshDeviceUntil=Math.max(state.freshDeviceUntil,nowMs()+FRESH_DEVICE_WINDOW_MS);
    return state.freshDeviceUntil>nowMs()
  }
  function clearFreshDevice(){state.freshDeviceUntil=0}

  function ensureStatusNode(){
    if(state.statusNode?.isConnected)return state.statusNode;
    const anchor=document.getElementById("solo-save-summary");
    if(!anchor)return null;
    let node=document.getElementById("solo-cloud-save-status");
    if(!node){node=document.createElement("p");node.id="solo-cloud-save-status";node.className="collection-summary solo-cloud-save-status hidden";anchor.insertAdjacentElement("afterend",node)}
    state.statusNode=node;return node
  }

  function renderStatus(status=state.status,detail=""){
    state.status=status||state.status;const node=ensureStatusNode();if(!node)return;
    const local=localEnvelope();let copy="";
    if(state.status==="syncing")copy="Cloud save: syncing with your CCG account…";
    else if(state.status==="synced")copy="Cloud save: synced to your CCG account.";
    else if(state.status==="restored")copy="Cloud save: restored from your CCG account.";
    else if(state.status==="tombstoned")copy="Cloud save: completed/cleared run removal synced.";
    else if(state.status==="account_conflict")copy="Cloud save paused — this browser save belongs to another signed-in account.";
    else if(state.status==="deferred")copy="Cloud save update waiting until this active run returns to the menu.";
    else if(state.status==="invalid_cloud")copy="Cloud save was rejected as invalid — the browser save remains unchanged.";
    else if(state.status==="unavailable")copy="Cloud save unavailable — the browser save remains safe on this device.";
    else if(!state.signedIn&&local)copy="Cloud save: sign in to sync this Solo run across devices.";
    else if(state.signedIn&&local)copy="Cloud save: signed in — browser save is ready to sync.";
    if(detail&&copy)copy+=` ${detail}`;
    node.textContent=copy;node.classList.toggle("hidden",!copy)
  }

  async function authContext(){
    state.authChecks++;
    const bridge=window.ccgSupabase;if(!bridge)return null;
    try{
      if(typeof bridge.waitForSessionReady==="function")return await bridge.waitForSessionReady({timeoutMs:5000});
      if(typeof bridge.getCurrentUserContext==="function")return await bridge.getCurrentUserContext();
      if(typeof bridge.waitForAuth==="function"){
        const session=await bridge.waitForAuth();return{user:session?.user||null,session,isAuthenticated:Boolean(session?.user)}
      }
    }catch(error){state.lastError=text(error?.message||error)}
    return null
  }

  async function getClient(){
    const bridge=window.ccgSupabase;if(!bridge||typeof bridge.getClient!=="function")throw new Error("Website account service unavailable");
    return bridge.getClient()
  }

  async function fetchCloudRow(client,userId){
    const {data,error}=await client.from(TABLE).select(SELECT_COLUMNS).eq("user_id",userId).maybeSingle();
    if(error)throw error;state.cloudReads++;state.lastCloudCheckAt=nowMs();return data||null
  }

  function cloudState(row){
    if(!row)return{kind:"none",revision:0,row:null,envelope:null};
    let revision=Math.max(0,Math.floor(Number(row.client_revision_ms)||0));
    if(row.deleted_at){
      const deletedMs=Date.parse(row.deleted_at);if(!revision&&Number.isFinite(deletedMs))revision=deletedMs;
      return{kind:"tombstone",revision,row,envelope:null}
    }
    const r43=api(),envelope=r43?.validateEnvelope?.(row.save_envelope)||null;
    if(!envelope||text(envelope.checksum)!==text(row.save_checksum)){
      state.cloudInvalid++;return{kind:"invalid",revision,row,envelope:null}
    }
    if(!revision)revision=revisionForEnvelope(envelope);
    return{kind:"save",revision,row,envelope}
  }

  function savePayload(userId,envelope){
    const r43=api(),revision=revisionForEnvelope(envelope)||nowMs();
    return{
      user_id:userId,schema_name:text(envelope.schema||r43?.SCHEMA),schema_version:Number(envelope.schemaVersion||r43?.SCHEMA_VERSION)||2,
      game_version:text(envelope.gameVersion||"V10.41")||"V10.41",save_envelope:clone(envelope),save_checksum:text(envelope.checksum),
      save_saved_at:new Date(revision).toISOString(),client_revision_ms:revision,deleted_at:null
    }
  }

  function tombstonePayload(userId,revision){
    const r43=api(),rev=Math.max(1,Math.floor(Number(revision)||nowMs()));
    return{user_id:userId,schema_name:text(r43?.SCHEMA||"ccg-lost-sizzler-solo-save"),schema_version:Number(r43?.SCHEMA_VERSION)||2,game_version:"V10.41",save_envelope:null,save_checksum:null,save_saved_at:null,client_revision_ms:rev,deleted_at:new Date(rev).toISOString()}
  }

  async function uploadSave(client,userId,envelope){
    const payload=savePayload(userId,envelope),{error}=await client.from(TABLE).upsert(payload,{onConflict:"user_id"});if(error)throw error;
    const meta=readMeta();writeMeta({...meta,ownerUserId:userId,localRevisionMs:payload.client_revision_ms,tombstoneRevisionMs:0,lastFingerprint:fingerprint(envelope),lastSyncedFingerprint:fingerprint(envelope),lastCloudRevisionMs:payload.client_revision_ms,lastSyncAt:nowMs()});
    clearFreshDevice();state.uploads++;state.lastSyncAt=nowMs();state.lastError="";renderStatus("synced");return payload
  }

  async function uploadTombstone(client,userId,revision){
    const payload=tombstonePayload(userId,revision),{error}=await client.from(TABLE).upsert(payload,{onConflict:"user_id"});if(error)throw error;
    const meta=readMeta();writeMeta({...meta,ownerUserId:userId,localRevisionMs:0,tombstoneRevisionMs:payload.client_revision_ms,lastFingerprint:"",lastSyncedFingerprint:"",lastCloudRevisionMs:payload.client_revision_ms,lastSyncAt:nowMs()});
    clearFreshDevice();state.tombstones++;state.lastSyncAt=nowMs();state.lastError="";renderStatus("tombstoned");return payload
  }

  function installCloudEnvelope(envelope,userId,revision){
    const r43=api(),validated=r43?.validateEnvelope?.(envelope)||null;if(!validated||activeRun())return false;
    const current=localEnvelope(),meta=readMeta();
    if(current&&meta.ownerUserId&&meta.ownerUserId!==userId){renderStatus("account_conflict");return false}
    state.suppressObservation++;
    try{
      if(current&&r43?.BACKUP_KEY)localStorage.setItem(r43.BACKUP_KEY,JSON.stringify(current));
      localStorage.setItem(r43.PRIMARY_KEY,JSON.stringify(validated));
      state.lastObservedFingerprint=fingerprint(validated);
      writeMeta({...meta,ownerUserId:userId,localRevisionMs:revisionForEnvelope(validated)||revision,tombstoneRevisionMs:0,lastFingerprint:fingerprint(validated),lastSyncedFingerprint:fingerprint(validated),lastCloudRevisionMs:revision,lastSyncAt:nowMs()});
      clearFreshDevice();r43.updateMenu?.();state.downloads++;state.lastSyncAt=nowMs();state.lastError="";renderStatus("restored");
      try{showToast?.("CLOUD SAVE RESTORED",`Floor ${validated.summary?.floor||validated.checkpoint?.run?.floor||1} is ready to continue on this device.`,"green",6500)}catch(_){}
      return true
    }catch(error){state.lastError=text(error?.message||error);return false}
    finally{queueMicrotask(()=>{state.suppressObservation=Math.max(0,state.suppressObservation-1)})}
  }

  function applyCloudTombstone(userId,revision){
    const r43=api(),meta=readMeta(),current=localEnvelope();if(activeRun())return false;
    if(current&&meta.ownerUserId&&meta.ownerUserId!==userId){renderStatus("account_conflict");return false}
    if(current&&!meta.ownerUserId){renderStatus("account_conflict");return false}
    state.suppressObservation++;
    try{
      if(r43?.PRIMARY_KEY)localStorage.removeItem(r43.PRIMARY_KEY);if(r43?.BACKUP_KEY)localStorage.removeItem(r43.BACKUP_KEY);
      state.lastObservedFingerprint="";
      writeMeta({...meta,ownerUserId:userId,localRevisionMs:0,tombstoneRevisionMs:revision,lastFingerprint:"",lastSyncedFingerprint:"",lastCloudRevisionMs:revision,lastSyncAt:nowMs()});
      clearFreshDevice();r43?.updateMenu?.();state.lastSyncAt=nowMs();state.lastError="";renderStatus("tombstoned");return true
    }catch(error){state.lastError=text(error?.message||error);return false}
    finally{queueMicrotask(()=>{state.suppressObservation=Math.max(0,state.suppressObservation-1)})}
  }

  function noteLocalTombstone(revision=nowMs(),owner=""){
    const meta=readMeta(),rev=Math.max(1,Math.floor(Number(revision)||nowMs())),resolvedOwner=text(owner||state.userId||meta.ownerUserId);
    clearFreshDevice();writeMeta({...meta,ownerUserId:resolvedOwner,localRevisionMs:0,tombstoneRevisionMs:rev,lastFingerprint:"",lastSyncedFingerprint:""});
    state.lastObservedFingerprint="";scheduleSync(30);return rev
  }

  function effectiveLocal(meta,envelope,userId){
    const saveRevision=revisionForEnvelope(envelope),sameOwner=!meta.ownerUserId||meta.ownerUserId===userId;
    const tombRevision=sameOwner?Math.max(0,Number(meta.tombstoneRevisionMs)||0):0;
    if(tombRevision>saveRevision)return{kind:"tombstone",revision:tombRevision,envelope:null};
    if(envelope)return{kind:"save",revision:saveRevision,envelope};
    return{kind:"none",revision:0,envelope:null}
  }

  async function reconcile(){
    const r43=api();if(!r43)return{ok:false,reason:"r43_unavailable"};
    const userId=state.userId;if(!state.signedIn||!userId){renderStatus("local_only");return{ok:true,reason:"signed_out"}}
    const client=await getClient(),row=await fetchCloudRow(client,userId),cloud=cloudState(row),envelope=localEnvelope(),meta=readMeta(),freshDevice=state.freshDeviceUntil>nowMs()&&meta.ownerUserId===userId;

    if(envelope&&meta.ownerUserId&&meta.ownerUserId!==userId){renderStatus("account_conflict");return{ok:true,reason:"foreign_local",cloud}}
    if(freshDevice&&cloud.kind==="save"&&!activeRun())return{ok:installCloudEnvelope(cloud.envelope,userId,cloud.revision),action:"restore_initial_cloud_save"};
    const local=effectiveLocal(meta,envelope,userId);
    if(cloud.kind==="invalid"){
      clearFreshDevice();renderStatus("invalid_cloud");
      if(local.kind==="save"&&(meta.ownerUserId===userId||!meta.ownerUserId))await uploadSave(client,userId,local.envelope);
      else if(local.kind==="tombstone"&&meta.ownerUserId===userId)await uploadTombstone(client,userId,local.revision);
      return{ok:false,reason:"invalid_cloud"}
    }

    if(cloud.kind==="none"){
      if(local.kind==="save")return{ok:true,action:"upload_save",value:await uploadSave(client,userId,local.envelope)};
      if(local.kind==="tombstone"&&meta.ownerUserId===userId)return{ok:true,action:"upload_tombstone",value:await uploadTombstone(client,userId,local.revision)};
      clearFreshDevice();renderStatus("synced");return{ok:true,action:"empty"}
    }

    if(local.kind==="none"){
      if(cloud.kind==="save"){
        if(activeRun()){renderStatus("deferred");return{ok:true,action:"deferred_cloud_save"}}
        return{ok:installCloudEnvelope(cloud.envelope,userId,cloud.revision),action:"restore_cloud_save"}
      }
      if(cloud.kind==="tombstone"){
        clearFreshDevice();writeMeta({...meta,ownerUserId:userId,localRevisionMs:0,tombstoneRevisionMs:cloud.revision,lastCloudRevisionMs:cloud.revision,lastSyncAt:nowMs()});renderStatus("tombstoned");return{ok:true,action:"accept_cloud_tombstone"}
      }
    }

    if(local.kind==="save"&&!meta.ownerUserId&&cloud.kind==="tombstone"&&cloud.revision>=local.revision){clearFreshDevice();renderStatus("account_conflict");return{ok:true,reason:"unowned_local_vs_cloud_tombstone"}}

    if(local.revision>cloud.revision){
      if(local.kind==="save")return{ok:true,action:"upload_newer_save",value:await uploadSave(client,userId,local.envelope)};
      return{ok:true,action:"upload_newer_tombstone",value:await uploadTombstone(client,userId,local.revision)}
    }
    if(cloud.revision>local.revision){
      if(activeRun()){renderStatus("deferred");return{ok:true,action:"deferred_newer_cloud"}}
      if(cloud.kind==="save")return{ok:installCloudEnvelope(cloud.envelope,userId,cloud.revision),action:"restore_newer_cloud"};
      return{ok:applyCloudTombstone(userId,cloud.revision),action:"apply_newer_tombstone"}
    }

    if(local.kind==="tombstone"||cloud.kind==="tombstone"){
      if(local.kind==="tombstone"&&cloud.kind!=="tombstone")return{ok:true,action:"tie_upload_tombstone",value:await uploadTombstone(client,userId,local.revision)};
      if(cloud.kind==="tombstone"&&local.kind!=="tombstone"){
        if(activeRun()){renderStatus("deferred");return{ok:true,action:"deferred_tie_tombstone"}}
        return{ok:applyCloudTombstone(userId,cloud.revision),action:"tie_apply_tombstone"}
      }
      clearFreshDevice();renderStatus("tombstoned");return{ok:true,action:"tombstone_synced"}
    }
    if(local.kind==="save"&&cloud.kind==="save"){
      if(fingerprint(local.envelope)===fingerprint(cloud.envelope)){
        clearFreshDevice();writeMeta({...meta,ownerUserId:userId,localRevisionMs:local.revision,lastFingerprint:fingerprint(local.envelope),lastSyncedFingerprint:fingerprint(local.envelope),lastCloudRevisionMs:cloud.revision,lastSyncAt:nowMs()});renderStatus("synced");return{ok:true,action:"already_synced"}
      }
      if(activeRun()){renderStatus("deferred");return{ok:true,action:"deferred_tie_conflict"}}
      return{ok:installCloudEnvelope(cloud.envelope,userId,cloud.revision),action:"tie_cloud_save"}
    }
    clearFreshDevice();renderStatus("synced");return{ok:true,action:"noop"}
  }

  function scheduleRetry(){if(state.retryTimer)return;state.retryTimer=setTimeout(()=>{state.retryTimer=0;if(state.signedIn)syncNow().catch(()=>{})},RETRY_MS)}
  function scheduleSync(delay=0){
    if(state.syncPromise){state.syncAgain=true;return state.syncPromise}
    setTimeout(()=>syncNow().catch(()=>{}),Math.max(0,Number(delay)||0));return null
  }

  async function syncNow(){
    if(state.syncPromise){state.syncAgain=true;return state.syncPromise}
    state.syncPromise=(async()=>{
      if(!state.signedIn||!state.userId){renderStatus("local_only");return{ok:true,reason:"signed_out"}}
      renderStatus("syncing");
      try{const result=await reconcile();state.lastError="";return result}
      catch(error){state.lastError=text(error?.message||error);renderStatus("unavailable");scheduleRetry();return{ok:false,error:state.lastError}}
    })().finally(()=>{
      state.syncPromise=null;
      if(state.syncAgain){state.syncAgain=false;queueMicrotask(()=>syncNow().catch(()=>{}))}
    });
    return state.syncPromise
  }

  async function refreshAuthAndSync(){
    const context=await authContext(),userId=text(context?.user?.id||context?.session?.user?.id||"");
    state.signedIn=Boolean(context?.isAuthenticated??userId)&&Boolean(userId);state.userId=state.signedIn?userId:"";
    if(!state.signedIn){clearFreshDevice();renderStatus("local_only");return{signedIn:false}}
    const envelope=localEnvelope(),meta=readMeta();if(meta.ownerUserId===state.userId)markFreshDevice(meta,envelope);
    await syncNow();return{signedIn:true,userId:state.userId}
  }

  function observeLocal(){
    const envelope=localEnvelope(),fp=fingerprint(envelope),meta=readMeta();
    if(!envelope&&markFreshDevice(meta,envelope)){state.lastObservedFingerprint="";return false}
    if(fp===state.lastObservedFingerprint)return false;
    const previous=state.lastObservedFingerprint;state.lastObservedFingerprint=fp;
    if(state.suppressObservation)return false;
    if(envelope){
      const revision=revisionForEnvelope(envelope),owner=state.signedIn&&state.userId?state.userId:meta.ownerUserId;
      writeMeta({...meta,ownerUserId:owner,localRevisionMs:revision,tombstoneRevisionMs:revision>=Number(meta.tombstoneRevisionMs||0)?0:meta.tombstoneRevisionMs,lastFingerprint:fp});
      if(previous||meta.lastFingerprint!==fp)scheduleSync(40)
    }
    return true
  }

  function wrapCheckpointClear(){
    const progression=window.CCGProgression;
    if(state.clearWrapped||!progression||typeof progression.clearCheckpoint!=="function")return false;
    const source=progression.clearCheckpoint;
    progression.clearCheckpoint=function clearCheckpointV141R44CloudTombstone(){
      const before=localEnvelope(),metaBefore=readMeta(),result=source.apply(this,arguments),after=localEnvelope();
      if(before&&!after&&!state.suppressObservation)noteLocalTombstone(nowMs(),state.userId||metaBefore.ownerUserId);
      return result
    };
    progression.clearCheckpoint.__ccgV141R44CloudTombstone=true;
    progression.clearCheckpoint.__ccgOriginal=source;
    state.clearWrapped=true;
    return true
  }

  function bootstrapObservation(){
    const envelope=localEnvelope(),fp=fingerprint(envelope),meta=readMeta();state.lastObservedFingerprint=fp;
    if(envelope&&!meta.localRevisionMs)writeMeta({...meta,localRevisionMs:revisionForEnvelope(envelope),lastFingerprint:fp});
    else markFreshDevice(meta,envelope);
    wrapCheckpointClear();renderStatus("boot")
  }

  function onAuthEvent(){refreshAuthAndSync().catch(error=>{state.lastError=text(error?.message||error);renderStatus("unavailable")})}
  function onFocus(){if(state.signedIn)syncNow().catch(()=>{});else onAuthEvent()}
  function onOnline(){if(state.signedIn)syncNow().catch(()=>{})}
  function onStorage(event){if(event?.key===api()?.PRIMARY_KEY||event?.key===api()?.BACKUP_KEY||event?.key===META_KEY){observeLocal();if(state.signedIn)scheduleSync(50)}}

  bootstrapObservation();
  state.timer=setInterval(()=>{wrapCheckpointClear();observeLocal();ensureStatusNode();renderStatus(state.status)},POLL_MS);
  addEventListener("ccg:auth-ready",onAuthEvent);addEventListener("ccg:auth-changed",onAuthEvent);addEventListener("focus",onFocus);addEventListener("online",onOnline);addEventListener("storage",onStorage);
  setTimeout(onAuthEvent,80);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);if(state.retryTimer)clearTimeout(state.retryTimer)},{once:true});

  window.CCGLostSizzlerV141R44SoloCloudSave={
    TABLE,META_KEY,META_VERSION,localEnvelope,fingerprint,cloudState,savePayload,tombstonePayload,
    installCloudEnvelope,applyCloudTombstone,noteLocalTombstone,reconcile,syncNow,refreshAuthAndSync,observeLocal,renderStatus,readMeta,
    get state(){return state}
  };
})();
