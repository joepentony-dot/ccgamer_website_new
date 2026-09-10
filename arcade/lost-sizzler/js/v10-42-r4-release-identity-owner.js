/* C64 Dungeon Carnage V10.42 r4 — narrow release-identity presentation owner. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R4_RELEASE_IDENTITY_OWNER__)return;
  window.__CCG_LOST_SIZZLER_V142_R4_RELEASE_IDENTITY_OWNER__=true;

  const state={stamps:0,mutations:0,observer:null,queued:false};

  function activeBuild(){
    return String(window.CCGLostSizzlerV142Bootstrap?.build||"V10.42 r2").trim()||"V10.42 r2";
  }

  function activeFamily(){
    const match=activeBuild().match(/^V\d+(?:\.\d+)+/i);
    return match?match[0].toUpperCase():"V10.42";
  }

  function versionCheckOutdated(){
    return window.CCGLostSizzlerVersion?.state?.outdated===true;
  }

  function stamp(){
    state.queued=false;
    if(versionCheckOutdated())return false;
    const subtitle=document.querySelector(".v102-brand p,.brand p");
    const badge=document.querySelector(".build-badge");
    const expectedSubtitle=`C64 DUNGEON CARNAGE — ${activeFamily()}`;
    const expectedBadge=`BUILD ${activeBuild().toUpperCase()}`;
    let changed=false;
    if(subtitle&&subtitle.textContent!==expectedSubtitle){subtitle.textContent=expectedSubtitle;changed=true}
    if(badge&&badge.textContent!==expectedBadge){badge.textContent=expectedBadge;changed=true}
    state.stamps+=1;
    return changed;
  }

  function queueStamp(){
    if(state.queued)return;
    state.queued=true;
    queueMicrotask(stamp);
  }

  function install(){
    stamp();
    if(state.observer)return true;
    const subtitle=document.querySelector(".v102-brand p,.brand p"),badge=document.querySelector(".build-badge");
    if(!subtitle&&!badge)return false;
    const observer=new MutationObserver(()=>{state.mutations+=1;queueStamp()});
    if(subtitle)observer.observe(subtitle,{childList:true,characterData:true,subtree:true});
    if(badge)observer.observe(badge,{childList:true,characterData:true,subtree:true});
    state.observer=observer;
    return true;
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
  addEventListener("ccg:v142-ready",queueStamp);
  addEventListener("pagehide",()=>{state.observer?.disconnect();state.observer=null},{once:true});

  window.CCGLostSizzlerV142R4ReleaseIdentityOwner=Object.freeze({
    install,
    stamp,
    diagnostics:()=>Object.freeze({stamps:state.stamps,mutations:state.mutations,observing:Boolean(state.observer)})
  });
})();
