/* The Lost Sizzler V10.41 — Stage 8 event-driven NPC dialogue foundation. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_STAGE8_NPC_DIALOGUE__)return;
  window.__CCG_LOST_SIZZLER_STAGE8_NPC_DIALOGUE__=true;

  const REPEAT_MS=7000;
  const SPECIAL_MODES=new Set(["horde-survivor","sizzler-saboteurs"]);
  const memory=new WeakMap();
  const state={installed:false,assignmentGate:false,reAdoptions:0,presentations:0,suppressed:0,last:null};
  const lines=Object.freeze({
    scout:Object.freeze({
      trapped:Object.freeze({key:"scout.trapped",title:"CCG SCOUT — FOUND",speaker:"Scout",text:"There you are. Get me to one of the permanently lit sanctuary rooms and I’ll stay close.",tone:"green",duration:7600,voiceKey:"npc.scout.found"}),
      following:Object.freeze({key:"scout.following",title:"CCG SCOUT — FOLLOWING",speaker:"Scout",text:"Still here. Keep heading for the lights; I’m right behind you.",tone:"cyan",duration:6000,voiceKey:"npc.scout.following"}),
      rescued:Object.freeze({key:"scout.rescued",title:"CCG SCOUT — SAFE",speaker:"Scout",text:"Made it. I’m staying with the lights. If you find anyone else down here, send them this way.",tone:"green",duration:7000,voiceKey:"npc.scout.safe"})
    })
  });

  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const controllerId=()=>{try{return String(window.CCGLostSizzlerModeRuntime?.detect?.()||document.body?.dataset?.modeController||"")}catch(_){return String(document.body?.dataset?.modeController||"")}};
  function soloDungeon(){
    if(SPECIAL_MODES.has(specialType()))return false;
    const detected=controllerId();
    if(detected)return detected==="dungeon-solo";
    try{return document.body?.dataset?.runActive==="true"&&String(playMode||"solo")==="solo"&&!p2&&document.body?.dataset?.hordeSolo!=="true"}catch(_){return false}
  }
  const clockNow=()=>{try{return performance.now()}catch(_){return Date.now()}};
  function withinReach(player,entity){
    if(!player||!entity)return false;
    try{return typeof md==="function"?md(player,entity)<=1:Math.abs(Number(player.x)-Number(entity.x))+Math.abs(Number(player.y)-Number(entity.y))<=1}catch(_){return false}
  }
  function scoutState(rescue){if(rescue?.rescued)return"rescued";if(rescue?.following)return"following";return"trapped"}
  function lineForScout(rescue,stateKey=""){const key=stateKey||scoutState(rescue);return lines.scout[key]||lines.scout.trapped}
  function present(entity,line,{player=null,force=false}={}){
    if(!soloDungeon()||!entity||!line)return false;
    if(player&&!withinReach(player,entity))return false;
    const now=clockNow(),previous=memory.get(entity);
    if(!force&&previous?.key===line.key&&now-previous.at<REPEAT_MS){state.suppressed++;return false}
    try{showToast(line.title,`${line.speaker}: ${line.text}`,line.tone,line.duration)}catch(_){return false}
    memory.set(entity,{key:line.key,at:now});
    state.presentations++;
    state.last={key:line.key,title:line.title,text:line.text,voiceKey:line.voiceKey,at:now};
    return true
  }
  function presentScout(player,{force=false,stateKey=""}={}){
    let rescue=null;try{rescue=host?.rescue||null}catch(_){return false}
    if(!rescue)return false;
    return present(rescue,lineForScout(rescue,stateKey),{player,force})
  }
  function ancestryHasMarker(source,marker){
    const seen=new Set();
    let current=source;
    while(typeof current==="function"&&!seen.has(current)){
      if(current[marker])return true;
      seen.add(current);
      current=current.__ccgOriginal;
    }
    return false
  }
  function wrapRescueOwner(source){
    if(typeof source!=="function")return source;
    if(ancestryHasMarker(source,"__ccgStage8NpcDialogue"))return source;
    const wrapped=function triggerRescueStage8Dialogue(player){
      let before=null;
      if(soloDungeon()){
        try{const rescue=host?.rescue;if(rescue)before={rescued:Boolean(rescue.rescued),following:Boolean(rescue.following),found:Boolean(rescue.found)}}catch(_){}
      }
      const result=source.apply(this,arguments);
      if(!before||!soloDungeon())return result;
      try{
        const rescue=host?.rescue;if(!rescue)return result;
        if(!before.rescued&&!before.following&&rescue.following&&rescue.found)present(rescue,lines.scout.trapped,{player});
        else if(rescue.rescued&&withinReach(player,rescue))present(rescue,lines.scout.rescued,{player});
        else if(rescue.following&&withinReach(player,rescue))present(rescue,lines.scout.following,{player});
      }catch(_){}
      return result
    };
    wrapped.__ccgStage8NpcDialogue=true;
    wrapped.__ccgOriginal=source;
    return wrapped
  }

  let rescueAssignmentGate=null;
  function installRescueAssignmentGate(){
    if(rescueAssignmentGate)return true;
    const descriptor=Object.getOwnPropertyDescriptor(window,"triggerRescue");
    if(descriptor&&!descriptor.configurable)return false;
    if(descriptor&&(descriptor.get||descriptor.set))return false;
    let current=wrapRescueOwner(window.triggerRescue);
    try{
      Object.defineProperty(window,"triggerRescue",{
        configurable:true,
        enumerable:descriptor?.enumerable??true,
        get(){return current},
        set(next){
          if(typeof next!=="function"){current=next;state.installed=false;return}
          const alreadyOwned=ancestryHasMarker(next,"__ccgStage8NpcDialogue");
          current=alreadyOwned?next:wrapRescueOwner(next);
          if(!alreadyOwned)state.reAdoptions++;
          state.installed=ancestryHasMarker(current,"__ccgStage8NpcDialogue")
        }
      });
    }catch(_){return false}
    rescueAssignmentGate={descriptor};
    state.assignmentGate=true;
    state.installed=ancestryHasMarker(current,"__ccgStage8NpcDialogue");
    return true
  }
  function install(){
    const source=window.triggerRescue;
    if(typeof source!=="function")return false;
    if(!rescueAssignmentGate&&installRescueAssignmentGate())return Boolean(window.triggerRescue?.__ccgStage8NpcDialogue);
    if(ancestryHasMarker(source,"__ccgStage8NpcDialogue")){state.installed=true;return true}
    window.triggerRescue=wrapRescueOwner(source);
    state.installed=ancestryHasMarker(window.triggerRescue,"__ccgStage8NpcDialogue");
    return state.installed
  }

  function installScoutToastBridge(){
    const source=window.showToast;
    if(typeof source!=="function")return false;
    if(ancestryHasMarker(source,"__ccgStage8ScoutToastBridge"))return true;
    const wrapped=function stage8ScoutToastBridge(title){
      const scoutFound=String(title||"").toUpperCase()==="CCG SCOUT FOUND";
      const hadDialogueOwner=ancestryHasMarker(window.triggerRescue,"__ccgStage8NpcDialogue");
      const result=source.apply(this,arguments);
      if(!scoutFound||!soloDungeon())return result;
      install();
      if(hadDialogueOwner)return result;
      try{
        const rescue=host?.rescue||null,player=typeof p1!=="undefined"?p1:null;
        if(rescue?.following&&rescue?.found&&!rescue?.rescued)present(rescue,lines.scout.trapped,{player});
      }catch(_){}
      return result
    };
    wrapped.__ccgStage8ScoutToastBridge=true;
    wrapped.__ccgOriginal=source;
    window.showToast=wrapped;
    return true
  }

  let installObserver=null;
  function ensureInstallObserver(){
    if(installObserver||typeof MutationObserver!=="function"||!document.body)return false;
    installObserver=new MutationObserver(()=>{install();installScoutToastBridge()});
    installObserver.observe(document.body,{attributes:true,attributeFilter:["data-release-ready","data-run-active","data-mode-controller"]});
    return true
  }
  function installWhenReady(){
    const installed=install();
    installScoutToastBridge();
    ensureInstallObserver();
    return installed
  }

  installWhenReady();
  queueMicrotask(installWhenReady);
  if(document.readyState!=="complete")addEventListener("load",installWhenReady,{once:true});
  window.CCGLostSizzlerStage8NpcDialogue={state,lines,soloDungeon,lineForScout,present,presentScout,install,installWhenReady,installScoutToastBridge,installRescueAssignmentGate,ancestryHasMarker};
})();