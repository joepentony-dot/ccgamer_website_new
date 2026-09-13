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
      /* Ordinary floor traps promise health damage. Preserve the canonical
         hurtPlayer owner, including its mode/invulnerability/death rules, but
         temporarily remove armour from this one delegated hit so a phone run
         cannot show “-1 health” while silently consuming ARM instead. */
      const beforeHealth=Number(player.health||0),beforeArmor=Number(player.armor||0);
      player.armor=0;
      let result;
      try{result=current.apply(this,arguments)}finally{player.armor=beforeArmor}
      if(Number(player.health||0)<beforeHealth)state.trapHits++;
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
        body[data-run-active="true"] .ccg-game,
        body[data-run-active="true"] .ccg-game:fullscreen,
        body[data-run-active="true"] .ccg-game:-webkit-full-screen{
          grid-template-rows:28px minmax(0,1fr) 54px!important;
        }
        body[data-run-active="true"] .ccg-game>.mission{
          height:28px!important;
          min-height:28px!important;
          padding:3px 7px!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub{
          height:54px!important;
          min-height:54px!important;
          padding:4px 5px max(4px,env(safe-area-inset-bottom))!important;
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
  }

  installPortraitLayout();
  installTrapDamageOwner();
  tick();
  state.timer=setInterval(()=>{try{tick()}catch(error){console.warn("[C64 Dungeon Carnage r19] mobile stability tick failed safely",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerV142R19MobileTrapLayoutStability={installPortraitLayout,installTrapDamageOwner,rearmInactiveTrapContacts,trapActive,get state(){return state}};
})();
