/* C64 Dungeon Carnage V10.42 r19 — mobile trap damage and portrait layout stability. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R19_MOBILE_TRAP_LAYOUT_STABILITY__)return;
  window.__CCG_LOST_SIZZLER_V142_R19_MOBILE_TRAP_LAYOUT_STABILITY__=true;

  const STYLE_ID="ccg-v142-r19-mobile-trap-layout";
  const MONITOR_MS=80;
  const state={timer:0,rearms:0,damageOwnerInstalls:0,trapHits:0};

  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const ordinaryDungeon=()=>document.body?.dataset?.runActive==="true"&&!new Set(["horde-survivor","sizzler-saboteurs"]).has(specialType());
  const players=()=>{try{return (typeof localPlayers==="function"?localPlayers():[typeof p1!=="undefined"?p1:null,typeof p2!=="undefined"?p2:null]).filter(Boolean)}catch(_){return[]}};
  const durability=player=>Number(player?.health||0)+Number(player?.armor||0);
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
  function chainHas(owner,marker){
    const seen=new Set();let current=owner;
    while(typeof current==="function"&&!seen.has(current)){
      if(current?.[marker]===true)return true;
      seen.add(current);current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null;
    }
    return false
  }

  function installTrapDamageOwner(){
    const current=window.hurtPlayer;
    if(typeof current!=="function")return false;
    if(chainHas(current,"__ccgV142R19MobileTrapDamage"))return true;
    const wrapped=function hurtPlayerV142R19MobileTrapDamage(player,amount,flash,source){
      if(!ordinaryDungeon()||!player||!environmentalTrapSource(source))return current.apply(this,arguments);
      const before=durability(player),oldInv=Number(player.invuln||0);
      player.invuln=0;
      const result=current.apply(this,arguments);
      const after=durability(player);
      if(after<before)state.trapHits++;
      else if(oldInv>0)player.invuln=oldInv;
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
        const occupied=Number(trap.x)===Number(player.x)&&Number(trap.y)===Number(player.y);
        if(occupied&&trapActive(trap,now))continue;
        let changed=false;
        if(canonical?.delete?.(canonicalTrapKey(player,trap,rare.trapRuntime)))changed=true;
        const key=r57TrapKey(player,trap);
        if(r57?.state?.trapCycles?.get?.(key)===true){r57.state.trapCycles.set(key,false);changed=true}
        if(changed)state.rearms++;
      }
    }
    return true
  }

  function installPortraitLayout(){
    if(document.getElementById(STYLE_ID))return true;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      @media (orientation:portrait) and (max-width:900px), (orientation:portrait) and (pointer:coarse){
        body[data-run-active="true"] .ccg-game>.game-area>.canvas-wrap,
        body[data-run-active="true"] .ccg-game:fullscreen>.game-area>.canvas-wrap,
        body[data-run-active="true"] .ccg-game:-webkit-full-screen>.game-area>.canvas-wrap{
          width:100%!important;
          height:auto!important;
          min-height:0!important;
          max-width:100%!important;
          max-height:100%!important;
          aspect-ratio:16/9!important;
          align-self:center!important;
          justify-self:center!important;
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
          aspect-ratio:16/9!important;
          object-fit:contain!important;
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
  }

  installPortraitLayout();
  installTrapDamageOwner();
  tick();
  state.timer=setInterval(()=>{try{tick()}catch(error){console.warn("[C64 Dungeon Carnage r19] mobile stability tick failed safely",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerV142R19MobileTrapLayoutStability={installPortraitLayout,installTrapDamageOwner,rearmInactiveTrapContacts,trapActive,get state(){return state}};
})();
