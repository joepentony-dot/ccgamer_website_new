/* C64 Dungeon Carnage V10.42 r19 — mobile trap damage and portrait layout stability. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R19_MOBILE_TRAP_LAYOUT_STABILITY__)return;
  window.__CCG_LOST_SIZZLER_V142_R19_MOBILE_TRAP_LAYOUT_STABILITY__=true;

  const STYLE_ID="ccg-v142-r19-mobile-trap-layout";
  const MONITOR_MS=80;
  const state={timer:0,rearms:0,damageOwnerInstalls:0,trapHits:0,trapContactBlocks:0,trapProtectionBlocks:0,canvasAspectRepairs:0};
  const trapContacts=new Set();
  const trapDamageInFlight=new Set();
  const trapProtectionUntil=new Map();

  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const ordinaryDungeon=()=>document.body?.dataset?.runActive==="true"&&!new Set(["horde-survivor","sizzler-saboteurs"]).has(specialType());
  const players=()=>{try{return (typeof localPlayers==="function"?localPlayers():[typeof p1!=="undefined"?p1:null,typeof p2!=="undefined"?p2:null]).filter(Boolean)}catch(_){return[]}};
  const playerId=player=>String(player?.id||player?.name||(player===globalThis.p2?"P2":"P1"));
  const trapId=trap=>String(trap?.id||`${trap?.x},${trap?.y}`);
  const r57TrapKey=(player,trap)=>`${playerId(player)}|${trapId(trap)}`;
  const worldKey=()=>{try{return `${String(run?.seed||"run")}|F${Math.max(1,Number(run?.floor||1))}`}catch(_){return"run|F1"}};
  const canonicalTrapKey=(player,trap,runtime)=>`${String(runtime?.worldKey||worldKey())}|${playerId(player)}|${trapId(trap)}`;

  function trapActive(trap,now=performance.now()){
    if(!trap?.active)return false;
    try{return typeof SYS?.trapActive==="function"?Boolean(SYS.trapActive(trap,now)):true}catch(_){return true}
  }

  function environmentalTrapSource(source){return /trap/i.test(String(source||""))}
  function activeTrapContact(player){
    try{
      const now=performance.now();
      const trap=(host?.traps||[]).find(trap=>trap?.active&&Number(trap.x)===Number(player?.x)&&Number(trap.y)===Number(player?.y)&&trapActive(trap,now));
      if(!trap)return null;
      const rare=window.CCGLostSizzlerRareEventsBalance||null;
      return{trap,key:canonicalTrapKey(player,trap,rare?.trapRuntime)}
    }catch(_){return null}
  }

  function installTrapDamageOwner(){
    const current=window.hurtPlayer;
    if(typeof current!=="function")return false;
    /* R1/R18 and other guarded owners can legitimately wrap hurtPlayer after R19
       loads. For trap semantics R19 must see the untouched incoming player state,
       so only treat the owner as installed when R19 itself is outermost. If a
       later owner appears, wrap that complete chain once; the nested R19 instance
       sees trapDamageInFlight and delegates without double-applying the guard. */
    if(current?.__ccgV142R19MobileTrapDamage===true)return true;
    const wrapped=function hurtPlayerV142R19MobileTrapDamage(player,amount,flash,source){
      if(!ordinaryDungeon()||!player||!environmentalTrapSource(source))return current.apply(this,arguments);
      /* Floor-trap health damage is one hit per active contact. Later environment
         wrappers deliberately own other hazard cadence and may bypass or mutate
         the base invulnerability field, so preserve the successful trap hit's
         canonical protection window independently across a brief leave/re-entry. */
      const contact=activeTrapContact(player),contactKey=String(contact?.key||"");
      /* R19 owns occupied floor-trap contacts only. Environmental owners such as
         R60 deliberately accept trap-labelled damage without an occupied floor
         trap (for example stale-invulnerability recovery). Delegating that case
         preserves their established ownership instead of swallowing it here. */
      if(!contactKey)return current.apply(this,arguments);
      const now=performance.now();
      if(contactKey){
        const protectedUntil=Number(trapProtectionUntil.get(contactKey)||0);
        if(protectedUntil>now){state.trapProtectionBlocks++;return false}
        if(protectedUntil>0)trapProtectionUntil.delete(contactKey);
      }
      if(Number(player.invuln||0)>0)return false;
      if(contactKey&&trapContacts.has(contactKey)){state.trapContactBlocks++;return false}
      if(contactKey&&trapDamageInFlight.has(contactKey))return current.apply(this,arguments);
      if(contactKey)trapDamageInFlight.add(contactKey);
      const beforeHealth=Number(player.health||0),beforeArmor=Number(player.armor||0);
      player.armor=0;
      let result;
      try{result=current.apply(this,arguments)}finally{
        player.armor=beforeArmor;
        if(contactKey)trapDamageInFlight.delete(contactKey)
      }
      if(Number(player.health||0)<beforeHealth){
        state.trapHits++;
        if(contactKey){
          trapContacts.add(contactKey);
          const protectionMs=Math.max(0,Number(player.invuln||0));
          if(protectionMs>0)trapProtectionUntil.set(contactKey,performance.now()+protectionMs)
        }
      }
      return result
    };
    wrapped.__ccgV142R19MobileTrapDamage=true;
    wrapped.__ccgOriginal=current;
    window.hurtPlayer=wrapped;
    state.damageOwnerInstalls++;
    return true
  }

  function rearmInactiveTrapContacts(){
    if(!ordinaryDungeon())return false;
    const r57=window.CCGLostSizzlerV141R57DesktopPrepStability||null;
    const rare=window.CCGLostSizzlerRareEventsBalance||null;
    const canonical=rare?.trapRuntime?.contact;
    const now=performance.now();
    for(const player of players()){
      for(const trap of host?.traps||[]){
        if(!player||!trap)continue;
        const contactKey=canonicalTrapKey(player,trap,rare?.trapRuntime);
        const protectedUntil=Number(trapProtectionUntil.get(contactKey)||0);
        if(protectedUntil>0&&protectedUntil<=now)trapProtectionUntil.delete(contactKey);
        const occupied=Number(trap.x)===Number(player.x)&&Number(trap.y)===Number(player.y);
        if(occupied&&trapActive(trap,now))continue;
        let changed=false;
        if(trapContacts.delete(contactKey))changed=true;
        trapDamageInFlight.delete(contactKey);
        if(canonical?.delete?.(contactKey))changed=true;
        const key=r57TrapKey(player,trap);
        if(r57?.state?.trapCycles?.get?.(key)===true){r57.state.trapCycles.set(key,false);changed=true}
        if(changed)state.rearms++;
      }
    }
    return true
  }

  function portraitTouchViewport(){
    try{
      const portrait=window.matchMedia?.("(orientation: portrait)")?.matches ?? (Number(window.innerHeight||0)>=Number(window.innerWidth||0));
      const coarse=window.matchMedia?.("(pointer: coarse)")?.matches===true;
      return Boolean(portrait&&(coarse||Number(window.innerWidth||0)<=900));
    }catch(_){return false}
  }

  function syncPortraitCanvasAspect(){
    if(!ordinaryDungeon()||!portraitTouchViewport())return false;
    const wrap=document.querySelector?.(".canvas-wrap");
    const gameCanvas=document.getElementById?.("game")||window.canvas||globalThis.canvas;
    if(!wrap||!gameCanvas)return false;
    const rect=wrap.getBoundingClientRect?.();
    const cssW=Number(rect?.width||0),cssH=Number(rect?.height||0);
    if(!Number.isFinite(cssW)||!Number.isFinite(cssH)||cssW<2||cssH<2)return false;

    /* The canonical resize guard protects the render budget with a 640x360
       minimum backing store. On narrow portrait phones that independently
       clamps width but not height, producing a backing-store aspect ratio that
       no longer matches the displayed canvas. Scale both axes together instead:
       square dungeon tiles stay square while the camera can use the taller phone
       viewport rather than stretching a landscape frame. */
    const scale=Math.max(1,640/cssW,360/cssH);
    let targetW=Math.max(2,Math.round(cssW*scale));
    let targetH=Math.max(2,Math.round(cssH*scale));
    const maxPixels=1900000;
    if(targetW*targetH>maxPixels){
      const budgetScale=Math.sqrt(maxPixels/(targetW*targetH));
      targetW=Math.max(2,Math.floor(targetW*budgetScale));
      targetH=Math.max(2,Math.floor(targetH*budgetScale));
    }
    const cssAspect=cssW/cssH,currentAspect=Number(gameCanvas.width||0)/Math.max(1,Number(gameCanvas.height||0));
    const targetAspect=targetW/targetH;
    if(Math.abs(currentAspect-cssAspect)<=0.004&&Math.abs(currentAspect-targetAspect)<=0.004)return false;
    gameCanvas.width=targetW;gameCanvas.height=targetH;
    try{const gameCtx=window.ctx||globalThis.ctx;if(gameCtx)gameCtx.imageSmoothingEnabled=false}catch(_){}
    try{window.cameras?.clear?.();globalThis.cameras?.clear?.()}catch(_){}
    state.canvasAspectRepairs++;
    return true
  }

  function installPortraitLayout(){
    if(document.getElementById(STYLE_ID))return true;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      @media (orientation:portrait) and (max-width:900px), (orientation:portrait) and (pointer:coarse){
        /* During active portrait play only three direct shell rows should own
           viewport height: mission, dungeon and compact combat HUD. The normal
           title/desktop information rows are useful before play, but leaving
           them in grid auto-placement after switching to a three-row template
           creates implicit rows and can collapse .game-area to zero height. */
        body[data-run-active="true"] .ccg-game,
        body[data-run-active="true"] .ccg-game:fullscreen,
        body[data-run-active="true"] .ccg-game:-webkit-full-screen{
          grid-template-rows:28px minmax(0,1fr) 74px!important;
        }
        body[data-run-active="true"] .ccg-game>.v102-topbar,
        body[data-run-active="true"] .ccg-game>.critical-strip,
        body[data-run-active="true"] .ccg-game>.fullscreen-hint,
        body[data-run-active="true"] .ccg-game>.tactical-zone{
          display:none!important;
        }
        body[data-run-active="true"] .ccg-game>.mission{
          grid-row:1!important;
          height:28px!important;
          min-height:28px!important;
          padding:3px 7px!important;
        }
        body[data-run-active="true"] .ccg-game>.game-area{
          grid-row:2!important;
          min-height:0!important;
          height:100%!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub{
          grid-row:3!important;
          display:grid!important;
          grid-template-columns:minmax(0,1.18fr) minmax(0,1fr)!important;
          grid-template-rows:minmax(0,1fr)!important;
          gap:3px!important;
          height:74px!important;
          min-height:74px!important;
          max-height:74px!important;
          padding:3px max(4px,env(safe-area-inset-right)) max(3px,env(safe-area-inset-bottom)) max(4px,env(safe-area-inset-left))!important;
          overflow:hidden!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub>.hub-inventory,
        body[data-run-active="true"] .ccg-game>.player-hub>.hub-telemetry{
          display:none!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub>.core-stats{
          grid-template-columns:repeat(4,minmax(0,1fr))!important;
          gap:2px!important;
          min-width:0!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .hub-stat{
          min-width:0!important;
          min-height:0!important;
          padding:3px 2px 9px!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .hub-stat span{
          font-size:5.8px!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .hub-stat b{
          margin-top:2px!important;
          font-size:9px!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub>.hub-progress{
          grid-column:auto!important;
          display:grid!important;
          grid-template-columns:minmax(78px,1.35fr) repeat(3,minmax(38px,.55fr))!important;
          grid-template-rows:minmax(0,1fr)!important;
          gap:2px!important;
          min-width:0!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .priority-xp{
          grid-column:auto!important;
          min-width:0!important;
          padding:3px!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .priority-xp-head{
          display:block!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .priority-xp-head b,
        body[data-run-active="true"] .ccg-game>.player-hub .priority-xp-head strong{
          display:block!important;
          font-size:6px!important;
          white-space:nowrap!important;
          overflow:hidden!important;
          text-overflow:ellipsis!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .priority-xp small{
          display:none!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .xp-track{
          height:5px!important;
          margin:3px 0 0!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .run-stat{
          min-width:0!important;
          padding:3px 2px!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .run-stat span{
          font-size:5.5px!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .run-stat b{
          margin-top:2px!important;
          font-size:8px!important;
        }
        body[data-run-active="true"] .ccg-game>.game-area>.canvas-wrap,
        body[data-run-active="true"] .ccg-game:fullscreen>.game-area>.canvas-wrap,
        body[data-run-active="true"] .ccg-game:-webkit-full-screen>.game-area>.canvas-wrap{
          width:100%!important;
          height:100%!important;
          min-width:0!important;
          min-height:0!important;
          max-width:100%!important;
          max-height:100%!important;
          aspect-ratio:auto!important;
          overflow:hidden!important;
        }
        body[data-run-active="true"] .ccg-game>.game-area>.canvas-wrap>canvas#game,
        body[data-run-active="true"] .ccg-game:fullscreen>.game-area>.canvas-wrap>canvas#game,
        body[data-run-active="true"] .ccg-game:-webkit-full-screen>.game-area>.canvas-wrap>canvas#game,
        body[data-run-active="true"] .ccg-game .v102-game-area .canvas-wrap canvas#game{
          display:block!important;
          width:100%!important;
          height:100%!important;
          max-width:100%!important;
          max-height:100%!important;
          aspect-ratio:auto!important;
          object-fit:fill!important;
        }
        body[data-run-active="true"] .ccg-game>.game-area>#v104-touch-controls{
          display:flex!important;
          grid-template-columns:138px minmax(0,1fr)!important;
          gap:5px!important;
          min-height:146px!important;
          max-height:146px!important;
          padding:4px max(5px,env(safe-area-inset-right)) max(4px,env(safe-area-inset-bottom)) max(5px,env(safe-area-inset-left))!important;
        }
        body[data-run-active="true"] .ccg-game #v104-touch-controls .v104-touch-pad{
          grid-template-columns:repeat(3,44px)!important;
          grid-template-rows:repeat(3,44px)!important;
          gap:2px!important;
          width:136px!important;
          height:136px!important;
        }
        body[data-run-active="true"] .ccg-game #v104-touch-controls .v104-touch-pad .v104-touch-btn{
          min-width:44px!important;
          min-height:44px!important;
          padding:0!important;
        }
        body[data-run-active="true"] .ccg-game #v104-touch-controls .v104-touch-actions{
          height:136px!important;
          gap:4px!important;
        }
        body[data-run-active="true"] .ccg-game #v104-touch-controls .v104-touch-btn{
          min-height:44px!important;
          padding:3px 2px!important;
          font-size:9.5px!important;
          line-height:1.08!important;
        }
      }
      @media (orientation:portrait) and (max-width:380px){
        body[data-run-active="true"] .ccg-game>.game-area>#v104-touch-controls{
          grid-template-columns:136px minmax(0,1fr)!important;
          min-height:146px!important;
          max-height:146px!important;
        }
      }
    `;
    document.head.appendChild(style);
    return true
  }

  function tick(){
    installPortraitLayout();
    installTrapDamageOwner();
    rearmInactiveTrapContacts();
    syncPortraitCanvasAspect();
  }

  installPortraitLayout();
  installTrapDamageOwner();
  tick();
  state.timer=setInterval(()=>{try{tick()}catch(error){console.warn("[C64 Dungeon Carnage r19] mobile stability tick failed safely",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerV142R19MobileTrapLayoutStability={installPortraitLayout,installTrapDamageOwner,rearmInactiveTrapContacts,syncPortraitCanvasAspect,trapActive,get state(){return state}};
})();