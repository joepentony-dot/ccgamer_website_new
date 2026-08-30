/* The Lost Sizzler V10.41 r44a — resilient Solo cloud-clear handoff.
 *
 * r44 owns cloud synchronization, while r43 owns the local Solo save. This
 * guard protects the narrow handoff between them: if a later runtime installer
 * replaces CCGProgression.clearCheckpoint after r44 first wrapped it, the
 * current function is wrapped again so a real local Solo clear still produces
 * the r44 cloud tombstone. No checkpoint creation or gameplay state is owned
 * here.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R44_CLOUD_CLEAR_GUARD__)return;
  window.__CCG_LOST_SIZZLER_V141_R44_CLOUD_CLEAR_GUARD__=true;

  const state={timer:0,wraps:0,lastWrapped:null};

  function install(){
    const progression=window.CCGProgression;
    const cloud=window.CCGLostSizzlerV141R44SoloCloudSave;
    if(!progression||typeof progression.clearCheckpoint!=="function"||!cloud)return false;

    const current=progression.clearCheckpoint;
    if(current.__ccgV141R44CloudTombstone===true){
      state.lastWrapped=current;
      return true
    }

    progression.clearCheckpoint=function clearCheckpointV141R44ResilientCloudTombstone(){
      const before=cloud.localEnvelope?.()||null;
      const metaBefore=cloud.readMeta?.()||{};
      const result=current.apply(this,arguments);
      const after=cloud.localEnvelope?.()||null;
      if(before&&!after&&!cloud.state?.suppressObservation){
        cloud.noteLocalTombstone?.(Date.now(),cloud.state?.userId||metaBefore.ownerUserId||"")
      }
      return result
    };
    progression.clearCheckpoint.__ccgV141R44CloudTombstone=true;
    progression.clearCheckpoint.__ccgV141R44CloudClearGuard=true;
    progression.clearCheckpoint.__ccgOriginal=current;
    state.lastWrapped=progression.clearCheckpoint;
    state.wraps++;
    return true
  }

  install();
  state.timer=setInterval(install,200);
  addEventListener("ccg:auth-ready",install);
  addEventListener("ccg:auth-changed",install);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});

  window.CCGLostSizzlerV141R44CloudClearGuard={install,get state(){return state}};
})();
