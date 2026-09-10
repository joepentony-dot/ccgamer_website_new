/* The Lost Sizzler V10.42 r14 — deterministic combat/encounter authority bridge.
 * Bridges established combat defeat reports into the shared r13 encounter runtime.
 * It does not own AI ticks, spawning, movement, rendering, networking or persistence.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R14_COMBAT_ENCOUNTER_BRIDGE__)return;
  window.__CCG_LOST_SIZZLER_V142_R14_COMBAT_ENCOUNTER_BRIDGE__=true;

  const R13=window.CCGLostSizzlerV142R13EncounterProgressionRuntime;
  if(!R13)return;

  const state={installed:true,defeatsAccepted:0,duplicatesRejected:0,eliteDefeatsAccepted:0,activations:0};
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const clone=value=>JSON.parse(JSON.stringify(value));

  function ensureBridge(hostState){
    if(!hostState)return null;
    if(hostState.v142CombatEncounterBridge)return hostState.v142CombatEncounterBridge;
    const bridge={version:"V10.42-r14",seenDefeats:new Set(),roomSignals:new Map()};
    bridge.snapshot=()=>snapshot(hostState);
    bridge.restore=payload=>restore(hostState,payload);
    hostState.v142CombatEncounterBridge=bridge;
    return bridge;
  }
  function runtimeRoom(hostState,roomId){
    return hostState?.v142EncounterRuntime?.rooms?.find?.(row=>String(row.roomId)===String(roomId))||null;
  }
  function activate(hostState,roomId,trigger="room-entry"){
    const bridge=ensureBridge(hostState),runtime=hostState?.v142EncounterRuntime;
    if(!bridge||!runtime?.activate)return false;
    const ok=Boolean(runtime.activate(roomId,trigger));
    if(ok){bridge.roomSignals.set(String(roomId),String(trigger));state.activations++}
    return ok;
  }
  function defeatToken(payload={}){
    const roomId=String(payload.roomId??"");
    const enemyId=String(payload.enemyId??payload.id??"");
    const wave=String(payload.wave??"");
    const elite=payload.elite?"elite":"mob";
    return String(payload.token||`${roomId}|${wave}|${elite}|${enemyId}`);
  }
  function reportEnemyDefeat(hostState,payload={}){
    const bridge=ensureBridge(hostState),runtime=hostState?.v142EncounterRuntime,row=runtimeRoom(hostState,payload.roomId);
    if(!bridge||!runtime||!row||row.completed)return false;
    const token=defeatToken(payload);
    if(!token||bridge.seenDefeats.has(token)){state.duplicatesRejected++;return false}
    bridge.seenDefeats.add(token);
    let ok=false;
    if(payload.elite){
      if(!row.eliteReady){bridge.seenDefeats.delete(token);return false}
      ok=Boolean(runtime.reportEliteDefeat?.(row.roomId));
      if(ok){state.eliteDefeatsAccepted++;state.defeatsAccepted++}
    }else{
      const count=clamp(Math.floor(payload.count||1),1,99);
      ok=Boolean(runtime.reportDefeat?.(row.roomId,count));
      if(ok)state.defeatsAccepted+=count;
    }
    if(!ok)bridge.seenDefeats.delete(token);
    return ok;
  }
  function nextDirective(hostState,roomId){
    const row=runtimeRoom(hostState,roomId);if(!row)return null;
    const encounter=row.encounter||{},target=row.waveTargets?.[Math.max(0,(row.currentWave||1)-1)]||0;
    const remaining=row.eliteReady?0:Math.max(0,target-(row.defeatedInWave||0));
    return Object.freeze({
      version:"V10.42-r14",roomId:row.roomId,saveKey:`${row.saveKey}:directive`,active:Boolean(row.active),completed:Boolean(row.completed),
      wave:row.currentWave||0,wavesTotal:row.waveTargets?.length||0,remaining,eliteReady:Boolean(row.eliteReady),eliteSpec:row.eliteReady?clone(encounter.eliteSpec||null):null,
      reinforcements:row.active&&!row.completed?clamp(encounter.reinforcements||0,0,3):0,event:row.eventFired?clone(encounter.event||null):null,
      rewardFocus:String(encounter.rewardFocus||"supplies"),rewardTier:clamp(encounter.rewardTier||1,1,4),routeBonus:String(encounter.routeBonus||"")
    });
  }
  function snapshot(hostState){
    const bridge=ensureBridge(hostState);if(!bridge)return null;
    return {version:"V10.42-r14",seenDefeats:[...bridge.seenDefeats].sort(),roomSignals:[...bridge.roomSignals.entries()].sort((a,b)=>a[0].localeCompare(b[0]))};
  }
  function restore(hostState,payload){
    const bridge=ensureBridge(hostState);if(!bridge)return hostState;
    bridge.seenDefeats=new Set(Array.isArray(payload?.seenDefeats)?payload.seenDefeats.map(String):[]);
    bridge.roomSignals=new Map(Array.isArray(payload?.roomSignals)?payload.roomSignals.map(row=>[String(row?.[0]??""),String(row?.[1]??"")]):[]);
    return hostState;
  }

  window.CCGLostSizzlerV142R14CombatEncounterBridge={version:"V10.42-r14",state,ensureBridge,runtimeRoom,activate,defeatToken,reportEnemyDefeat,nextDirective,snapshot,restore};
})();
