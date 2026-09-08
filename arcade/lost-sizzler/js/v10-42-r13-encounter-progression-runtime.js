/* The Lost Sizzler V10.42 r13 — deterministic encounter progression runtime.
 * Materialises the r12 encounter plans into shared, save-safe room progression.
 * It owns no AI tick, movement, renderer, networking or persistence backend: the
 * established combat runtime reports defeats and this layer resolves waves,
 * elite gates, one-shot room events and exactly-once completion rewards.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R13_ENCOUNTER_PROGRESSION_RUNTIME__)return;
  window.__CCG_LOST_SIZZLER_V142_R13_ENCOUNTER_PROGRESSION_RUNTIME__=true;

  const R12=window.CCGLostSizzlerV142R12DynamicEncounterDirector,W=window.CCGWorld;
  if(!R12||!W||typeof W.createHostState!=="function")return;

  const state={installed:false,hosts:0,activations:0,wavesCleared:0,elitesCleared:0,rewardsClaimed:0};
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const clone=value=>JSON.parse(JSON.stringify(value));

  function waveTargets(encounter){
    const pressure=clamp(encounter?.pressure||1,1,5),waves=clamp(encounter?.waves||1,1,3),seed=String(encounter?.saveKey||encounter?.key||"");
    const salt=[...seed].reduce((sum,ch)=>(sum+ch.charCodeAt(0))%7,0);
    return Array.from({length:waves},(_,index)=>clamp(2+Math.floor(pressure/2)+index+((salt+index)%2),2,7));
  }
  function rewardFor(encounter){
    const focus=String(encounter?.rewardFocus||"supplies"),tier=clamp(encounter?.rewardTier||1,1,4);
    return Object.freeze({kind:"encounter-clear",focus,tier,routeBonus:String(encounter?.routeBonus||""),elite:Boolean(encounter?.elite),token:`${encounter?.saveKey||encounter?.key}:reward`});
  }
  function runtimeRoom(encounter){
    const targets=waveTargets(encounter);
    return {
      version:"V10.42-r13",roomId:encounter.roomId,saveKey:`${encounter.saveKey}:progress`,encounter,
      active:false,completed:false,currentWave:0,defeatedInWave:0,waveTargets:targets,wavesCleared:0,
      eliteReady:false,eliteDefeated:false,eventFired:false,rewardClaimed:false,reward:rewardFor(encounter)
    };
  }
  function roomById(runtime,roomId){return runtime.rooms.find(row=>String(row.roomId)===String(roomId))||null}
  function activate(runtime,roomId,trigger="room-entry"){
    const row=roomById(runtime,roomId);if(!row||row.completed)return false;
    const expected=String(row.encounter?.event?.trigger||"room-entry");
    if(trigger!=="force"&&String(trigger)!==expected)return false;
    if(row.active)return true;
    row.active=true;row.currentWave=Math.max(1,row.currentWave||0);
    if(row.encounter?.event?.oneShot&&!row.eventFired)row.eventFired=true;
    state.activations++;return true;
  }
  function completeIfReady(row){
    if(!row||row.completed)return false;
    if(row.wavesCleared<row.waveTargets.length)return false;
    if(row.encounter?.elite&&!row.eliteDefeated){row.eliteReady=true;return false}
    row.completed=true;row.active=false;row.eliteReady=false;return true;
  }
  function reportDefeat(runtime,roomId,count=1){
    const row=roomById(runtime,roomId);if(!row?.active||row.completed||row.eliteReady)return false;
    row.defeatedInWave+=clamp(Math.floor(count),1,99);
    const target=row.waveTargets[Math.max(0,row.currentWave-1)]||1;
    if(row.defeatedInWave<target)return true;
    row.wavesCleared++;state.wavesCleared++;row.defeatedInWave=0;
    if(row.wavesCleared<row.waveTargets.length){row.currentWave=row.wavesCleared+1;return true}
    completeIfReady(row);return true;
  }
  function reportEliteDefeat(runtime,roomId){
    const row=roomById(runtime,roomId);if(!row?.active||row.completed||!row.encounter?.elite||!row.eliteReady||row.eliteDefeated)return false;
    row.eliteDefeated=true;row.eliteReady=false;state.elitesCleared++;completeIfReady(row);return true;
  }
  function claimReward(runtime,roomId){
    const row=roomById(runtime,roomId);if(!row?.completed||row.rewardClaimed)return null;
    row.rewardClaimed=true;state.rewardsClaimed++;return row.reward;
  }
  function snapshot(runtime){
    return runtime.rooms.map(row=>({saveKey:row.saveKey,active:Boolean(row.active),completed:Boolean(row.completed),currentWave:row.currentWave,defeatedInWave:row.defeatedInWave,wavesCleared:row.wavesCleared,eliteReady:Boolean(row.eliteReady),eliteDefeated:Boolean(row.eliteDefeated),eventFired:Boolean(row.eventFired),rewardClaimed:Boolean(row.rewardClaimed)}));
  }
  function restore(runtime,payload){
    const rows=Array.isArray(payload)?payload:[];
    for(const saved of rows){
      const row=runtime.rooms.find(item=>item.saveKey===saved?.saveKey);if(!row)continue;
      row.active=Boolean(saved.active);row.completed=Boolean(saved.completed);row.currentWave=clamp(saved.currentWave,0,row.waveTargets.length);row.defeatedInWave=Math.max(0,Math.floor(Number(saved.defeatedInWave)||0));row.wavesCleared=clamp(saved.wavesCleared,0,row.waveTargets.length);row.eliteReady=Boolean(saved.eliteReady);row.eliteDefeated=Boolean(saved.eliteDefeated);row.eventFired=Boolean(saved.eventFired);row.rewardClaimed=Boolean(saved.rewardClaimed);
      if(row.completed)row.active=false;
    }
    return runtime;
  }
  function materializeHost(hostState){
    const encounters=hostState?.v142DynamicEncounters?.rooms||[];
    const runtime={version:"V10.42-r13",rooms:encounters.map(runtimeRoom)};
    runtime.activate=(roomId,trigger)=>activate(runtime,roomId,trigger);
    runtime.reportDefeat=(roomId,count)=>reportDefeat(runtime,roomId,count);
    runtime.reportEliteDefeat=roomId=>reportEliteDefeat(runtime,roomId);
    runtime.claimReward=roomId=>claimReward(runtime,roomId);
    runtime.snapshot=()=>snapshot(runtime);
    runtime.restore=payload=>restore(runtime,clone(payload));
    if(hostState)hostState.v142EncounterRuntime=runtime;
    state.hosts++;return hostState;
  }

  const baseCreateHostState=W.createHostState.bind(W);
  W.createHostState=function createHostStateV142R13EncounterProgression(worldState){return materializeHost(baseCreateHostState(worldState))};
  state.installed=true;
  window.CCGLostSizzlerV142R13EncounterProgressionRuntime={version:"V10.42-r13",state,waveTargets,rewardFor,runtimeRoom,materializeHost,activate,reportDefeat,reportEliteDefeat,claimReward,snapshot,restore};
})();
