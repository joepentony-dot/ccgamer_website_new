/* The Lost Sizzler V10.41 r39 — Horde responsive viewport and dedicated handoff safety.
 * Loaded only after Horde actually starts. It owns Horde-specific screen use and
 * prevents the retained browser-host migration layer from fighting Colyseus.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R39_HORDE_RESPONSIVE_HANDOFF__)return;
  window.__CCG_LOST_SIZZLER_V141_R39_HORDE_RESPONSIVE_HANDOFF__=true;

  const HORDE="horde-survivor";
  const STYLE_ID="ccg-v141-r39-horde-responsive";
  const state={styleInstalled:false,memberGuard:false,toastGuard:false,bannerGuard:false,authorityCorrections:0,legacyMigrationMessages:0,resizeRequests:0,rosterPlaced:false,rosterWatchActive:false,rosterMoves:0,bannerRectsSuppressed:0,compactViewport:false,radarVisibilityCorrections:0};
  let rosterObserver=null;

  const special=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const isHorde=()=>String(special()?.type||document.body?.dataset?.specialMode||"")===HORDE;
  const dedicated=()=>window.CCGLostSizzlerV141R38ColyseusHorde||null;
  const dedicatedPreferred=()=>isHorde()&&Boolean(dedicated());
  const dedicatedLive=()=>dedicatedPreferred()&&Boolean(dedicated()?.state?.authorityLive||document.body?.dataset?.hordeTransport==="colyseus");

  function injectStyle(){
    if(document.getElementById(STYLE_ID)){state.styleInstalled=true;return true}
    const style=document.createElement("style");style.id=STYLE_ID;style.textContent=`
body[data-special-mode="horde-survivor"][data-run-active="true"] .ccg-game{
  width:100vw!important;max-width:none!important;height:100dvh!important;max-height:100dvh!important;min-height:0!important;margin:0!important;
  display:grid!important;grid-template-columns:minmax(0,1fr) clamp(220px,18vw,310px)!important;grid-template-rows:auto auto minmax(0,1fr) auto!important;
  overflow:hidden!important;background:#050307!important
}
body[data-special-mode="horde-survivor"][data-run-active="true"] .ccg-game>.topbar{grid-column:1/-1!important;grid-row:1!important;min-width:0!important}
body[data-special-mode="horde-survivor"][data-run-active="true"] .ccg-game>#horde-performance-status{
  grid-column:1/-1!important;grid-row:2!important;width:100%!important;min-width:0!important;margin:0!important;align-self:stretch!important
}
body[data-special-mode="horde-survivor"][data-run-active="true"] .ccg-game>.critical-strip,
body[data-special-mode="horde-survivor"][data-run-active="true"] .ccg-game>.mission,
body[data-special-mode="horde-survivor"][data-run-active="true"] .ccg-game>.fullscreen-hint{display:none!important}
body[data-special-mode="horde-survivor"][data-run-active="true"] .v102-game-area{
  grid-column:1!important;grid-row:3!important;display:block!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;
  max-height:none!important;overflow:hidden!important;padding:4px!important;background:#020104!important
}
body[data-special-mode="horde-survivor"][data-run-active="true"] .v102-game-area .canvas-wrap{
  display:block!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;max-height:none!important;overflow:hidden!important;margin:0!important
}
body[data-special-mode="horde-survivor"][data-run-active="true"] .v102-game-area .canvas-wrap canvas#game{
  display:block!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;object-fit:fill!important;background:#030205!important
}
body[data-special-mode="horde-survivor"][data-run-active="true"] .v102-game-area .game-message-rail{display:none!important}
body[data-special-mode="horde-survivor"][data-run-active="true"] .tactical-zone{
  grid-column:2!important;grid-row:3!important;display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:minmax(0,1fr) auto!important;
  width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;max-height:none!important;padding:4px!important;gap:5px!important;overflow:hidden!important;background:#07040a!important
}
body[data-special-mode="horde-survivor"][data-run-active="true"] .tactical-zone>.dossier-card,
body[data-special-mode="horde-survivor"][data-run-active="true"] .tactical-zone>.shortcut-dock{display:none!important}
body[data-special-mode="horde-survivor"][data-run-active="true"] .tactical-zone>.radar-card{
  display:grid!important;grid-template-rows:auto minmax(0,1fr) auto!important;width:100%!important;height:100%!important;min-height:0!important;max-height:none!important;padding:6px!important;overflow:hidden!important
}
body[data-special-mode="horde-survivor"][data-run-active="true"] .tactical-zone>.radar-card canvas{
  display:block!important;width:100%!important;height:100%!important;min-height:0!important;max-height:none!important;object-fit:fill!important
}
body[data-special-mode="horde-survivor"][data-run-active="true"] .tactical-zone>.radar-card .radar-legend{gap:5px!important;font-size:6px!important;max-height:22px!important;overflow:hidden!important}
body[data-special-mode="horde-survivor"][data-run-active="true"] #horde-live-roster{
  position:static!important;inset:auto!important;display:block!important;width:100%!important;max-width:none!important;max-height:150px!important;margin:0!important;padding:8px!important;overflow:auto!important;transform:none!important;z-index:auto!important
}
body[data-special-mode="horde-survivor"][data-run-active="true"] .player-hub{
  grid-column:1/-1!important;grid-row:4!important;width:100%!important;min-width:0!important;min-height:70px!important;max-height:92px!important;height:auto!important;
  overflow:hidden!important;padding:5px 7px!important;gap:5px!important
}
body[data-special-mode="horde-survivor"][data-run-active="true"] .player-hub .core-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:5px!important}
body[data-special-mode="horde-survivor"][data-run-active="true"] .player-hub .hub-stat{min-height:44px!important;padding:5px 7px!important}
@media(max-width:900px){
  body[data-special-mode="horde-survivor"][data-run-active="true"] .ccg-game{
    grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto auto minmax(0,1fr) auto auto!important;height:100dvh!important;max-height:100dvh!important
  }
  body[data-special-mode="horde-survivor"][data-run-active="true"] .ccg-game>#horde-performance-status{grid-column:1!important;grid-row:2!important}
  body[data-special-mode="horde-survivor"][data-run-active="true"] .v102-game-area{grid-column:1!important;grid-row:3!important;padding:2px 0!important;height:100%!important;min-height:0!important}
  body[data-special-mode="horde-survivor"][data-run-active="true"] .v102-game-area .canvas-wrap{height:100%!important;min-height:0!important;border-left:0!important;border-right:0!important}
  body[data-special-mode="horde-survivor"][data-run-active="true"] .player-hub{grid-column:1!important;grid-row:4!important;min-height:54px!important;max-height:70px!important;padding:3px 5px!important}
  body[data-special-mode="horde-survivor"][data-run-active="true"] .player-hub .hub-stat{min-height:38px!important;padding:3px 5px!important}
  body[data-special-mode="horde-survivor"][data-run-active="true"] .tactical-zone{
    grid-column:1!important;grid-row:5!important;display:block!important;width:100%!important;height:auto!important;min-height:0!important;max-height:82px!important;padding:3px 5px!important;overflow:hidden!important
  }
  body[data-special-mode="horde-survivor"][data-run-active="true"] .tactical-zone>.radar-card{display:none!important}
  body[data-special-mode="horde-survivor"][data-run-active="true"] #horde-live-roster{display:block!important;max-height:76px!important;padding:5px!important;overflow:auto!important}
}
@media(max-width:520px){
  body[data-special-mode="horde-survivor"][data-run-active="true"] .player-hub{min-height:48px!important;max-height:62px!important}
  body[data-special-mode="horde-survivor"][data-run-active="true"] .tactical-zone{max-height:70px!important}
  body[data-special-mode="horde-survivor"][data-run-active="true"] #horde-live-roster{max-height:64px!important}
}
`;
    document.head.appendChild(style);state.styleInstalled=true;return true
  }

  function stopRosterWatch(){
    if(rosterObserver){try{rosterObserver.disconnect()}catch(_){}rosterObserver=null}
    state.rosterWatchActive=false;return true
  }

  function placeRoster(){
    if(!isHorde())return false;const roster=document.getElementById("horde-live-roster"),tactical=document.querySelector(".ccg-game>.tactical-zone");
    if(!roster||!tactical)return false;
    if(roster.parentElement!==tactical){tactical.appendChild(roster);state.rosterMoves++}
    state.rosterPlaced=true;return true
  }

  function watchRosterPlacement(){
    if(!isHorde()){stopRosterWatch();return false}
    placeRoster();
    if(rosterObserver||typeof MutationObserver!=="function"){state.rosterWatchActive=Boolean(rosterObserver);return Boolean(rosterObserver)}
    const root=document.querySelector(".ccg-game")||document.body;if(!root)return false;
    rosterObserver=new MutationObserver(()=>{
      if(!isHorde()){stopRosterWatch();return}
      const before=state.rosterMoves;
      if(placeRoster()&&state.rosterMoves!==before)requestResize()
    });
    rosterObserver.observe(root,{childList:true,subtree:true});state.rosterWatchActive=true;return true
  }

  function enforceResponsiveVisibility(){
    const radar=document.querySelector(".ccg-game>.tactical-zone>.radar-card");
    if(!isHorde()){
      state.compactViewport=false;
      if(radar?.dataset?.ccgV141R39CompactHidden==="true"){
        radar.style.removeProperty("display");delete radar.dataset.ccgV141R39CompactHidden;state.radarVisibilityCorrections++
      }
      return false
    }
    let compact=false;
    try{compact=Boolean(window.matchMedia?.("(max-width: 900px)")?.matches)}catch(_){compact=Number(window.innerWidth||0)<=900}
    if(!compact)compact=Number(window.innerWidth||0)<=900;
    state.compactViewport=compact;
    if(!radar)return false;
    if(compact){
      if(radar.style.getPropertyValue("display")!=="none"||radar.style.getPropertyPriority("display")!=="important"){
        radar.style.setProperty("display","none","important");state.radarVisibilityCorrections++
      }
      radar.dataset.ccgV141R39CompactHidden="true";return true
    }
    if(radar.dataset.ccgV141R39CompactHidden==="true"){
      radar.style.removeProperty("display");delete radar.dataset.ccgV141R39CompactHidden;state.radarVisibilityCorrections++
    }
    return true
  }

  function requestResize(){
    state.resizeRequests++;enforceResponsiveVisibility();
    requestAnimationFrame(()=>{try{window.__CCG_LOST_SIZZLER_SCHEDULE_RESIZE__?.()}catch(_){try{resizeGameCanvas?.()}catch(__){}}})
  }

  function legacyHordeBannerRect(x,y,w,h){
    if(!isHorde())return false;
    const nx=Number(x),ny=Number(y),nw=Number(w),nh=Number(h);
    return [nx,ny,nw,nh].every(Number.isFinite)&&nx>=13&&nx<=15&&ny>=13&&ny<=15&&nw>=300&&nh>=68&&nh<=71
  }

  function installBannerGuard(){
    const current=window.render;if(typeof current!=="function")return false;
    if(current.__ccgV141R39HordeBannerGuard){state.bannerGuard=true;return true}
    const original=current;
    const wrapped=function renderV141R39HordeBannerGuard(){
      if(!isHorde()||typeof ctx==="undefined"||!ctx)return original.apply(this,arguments);
      const baseFillRect=ctx.fillRect,baseStrokeRect=ctx.strokeRect;
      try{
        ctx.fillRect=function(x,y,w,h){if(legacyHordeBannerRect(x,y,w,h)){state.bannerRectsSuppressed++;return}return baseFillRect.apply(this,arguments)};
        ctx.strokeRect=function(x,y,w,h){if(legacyHordeBannerRect(x,y,w,h)){state.bannerRectsSuppressed++;return}return baseStrokeRect.apply(this,arguments)};
        return original.apply(this,arguments)
      }finally{ctx.fillRect=baseFillRect;ctx.strokeRect=baseStrokeRect}
    };
    wrapped.__ccgV141R39HordeBannerGuard=true;wrapped.__ccgOriginal=original;window.render=wrapped;state.bannerGuard=true;return true
  }

  function enforceDedicatedAuthority(){
    if(!dedicatedPreferred())return false;const live=special();if(!live)return false;
    if(live.authoritative!==false){live.authoritative=false;state.authorityCorrections++}
    return true
  }

  function wrapMembers(){
    const callbacks=typeof net!=="undefined"?net?.cb:null,current=callbacks?.onMembers;if(!callbacks||typeof current!=="function")return false;
    if(current.__ccgV141R39HordeHandoff){state.memberGuard=true;return true}
    const wrapped=function onMembersV141R39HordeHandoff(){const result=current.apply(this,arguments);if(dedicatedPreferred())enforceDedicatedAuthority();return result};
    wrapped.__ccgV141R39HordeHandoff=true;wrapped.__ccgOriginal=current;callbacks.onMembers=wrapped;state.memberGuard=true;return true
  }

  function wrapToast(){
    const current=window.showToast;if(typeof current!=="function")return false;
    if(current.__ccgV141R39HordeHandoff){state.toastGuard=true;return true}
    const wrapped=function showToastV141R39HordeHandoff(title,text,tone,duration){
      if(isHorde()&&String(title||"").toUpperCase()==="HOST MIGRATION COMPLETE"&&dedicatedPreferred()){
        state.legacyMigrationMessages++;
        if(dedicatedLive())return false;
        return current.call(this,"HORDE SERVER CONNECTING","Dedicated Horde authority is taking over this match. Keep this page open while synchronisation completes.","gold",4200)
      }
      return current.apply(this,arguments)
    };
    wrapped.__ccgV141R39HordeHandoff=true;wrapped.__ccgOriginal=current;window.showToast=wrapped;state.toastGuard=true;return true
  }

  injectStyle();watchRosterPlacement();installBannerGuard();wrapMembers();wrapToast();enforceDedicatedAuthority();requestResize();

  const transportObserver=new MutationObserver(records=>{
    if(!records.some(record=>record.attributeName==="data-horde-transport"||record.attributeName==="data-special-mode"))return;
    if(isHorde()){watchRosterPlacement();installBannerGuard();if(dedicatedPreferred())enforceDedicatedAuthority();requestResize()}
    else{stopRosterWatch();enforceResponsiveVisibility()}
  });
  transportObserver.observe(document.body,{attributes:true,attributeFilter:["data-horde-transport","data-special-mode"]});

  addEventListener("resize",requestResize,{passive:true});
  addEventListener("orientationchange",requestResize,{passive:true});
  addEventListener("pagehide",()=>{transportObserver.disconnect();stopRosterWatch()},{once:true});

  window.CCGLostSizzlerV141R39HordeResponsive={
    enforceDedicatedAuthority,enforceResponsiveVisibility,placeRoster,watchRosterPlacement,requestResize,installBannerGuard,
    getDiagnostics(){return{...state,dedicatedLive:dedicatedLive(),dedicatedPreferred:dedicatedPreferred()}},
    get state(){return state}
  };
})();
