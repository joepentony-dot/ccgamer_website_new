/* The Lost Sizzler V10.37 — stable notifications, Horde-only survival UI and community link. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V137_HORDE_FOCUS__)return;
  window.__CCG_LOST_SIZZLER_V137_HORDE_FOCUS__=true;

  const DISCORD_URL="https://discord.gg/83Xw9ktAn4";
  const HEALTH_MIN_DELAY_MS=15000;
  const HEALTH_MAX_DELAY_MS=26000;
  const MAX_HEALTH_PICKUPS=2;
  const INSTALL_INTERVAL_MS=60;
  const state={
    installed:false,
    toastWrapped:false,
    inventoryWrapped:false,
    updateWrapped:false,
    renderWrapped:false,
    initialHealthScheduled:false,
    lastMode:"",
    knownHealthIds:new Set(),
    installTimer:0
  };

  const specialApi=()=>window.CCGLostSizzlerSpecialModes||null;
  const specialActive=()=>specialApi()?.active||null;
  const hordeActive=()=>specialActive()?.type==="horde-survivor";
  const hordeState=()=>hordeActive()?specialActive()?.state||null:null;
  const hordeApi=()=>window.CCGLostSizzlerHorde||null;
  const actorId=()=>String(typeof net!=="undefined"&&net?.sessionId||typeof p1!=="undefined"&&p1?.id||"P1");
  const livePlayers=()=>{
    const rows=[];
    try{if(typeof p1!=="undefined"&&p1)rows.push(p1)}catch(_){}
    try{if(typeof remote!=="undefined"&&remote?.values)for(const player of remote.values())if(player)rows.push(player)}catch(_){}
    return rows
  };
  const modelPlayer=(id,stateValue=hordeState())=>stateValue?.players?.find(player=>String(player.id)===String(id))||null;
  const hash32=value=>{
    const H=hordeApi();
    if(H?.hash32)return H.hash32(value);
    let hash=2166136261>>>0;
    for(const char of String(value||"")){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}
    return hash>>>0
  };

  function injectStyles(){
    if(document.getElementById("ccg-v137-horde-focus-style"))return;
    const style=document.createElement("style");
    style.id="ccg-v137-horde-focus-style";
    style.textContent=`
      /* Transient reports must overlay gameplay instead of becoming grid rows.
         This prevents a warning appearing or disappearing from resizing the
         canvas and producing a visible camera/UI jolt. */
      body[data-run-active="true"] .ccg-game>.critical-strip{
        display:block!important;
        position:fixed!important;
        top:74px!important;
        left:0!important;
        right:0!important;
        width:100%!important;
        height:0!important;
        min-height:0!important;
        max-height:0!important;
        margin:0!important;
        padding:0!important;
        overflow:visible!important;
        z-index:88!important;
        pointer-events:none!important;
      }
      body[data-run-active="true"] .ccg-game>.critical-strip>*{pointer-events:none!important}
      body[data-run-active="true"] .ccg-game>.critical-strip>.banish-context{pointer-events:auto!important}
      body[data-run-active="true"] .ccg-game .game-area .game-message-rail{display:contents!important}
      body[data-run-active="true"] .ccg-game .game-area #pickup-toast{
        position:absolute!important;
        top:12px!important;
        left:50%!important;
        right:auto!important;
        bottom:auto!important;
        width:min(580px,76%)!important;
        min-width:0!important;
        max-width:min(580px,76%)!important;
        min-height:0!important;
        max-height:72px!important;
        height:auto!important;
        margin:0!important;
        transform:translateX(-50%)!important;
        z-index:92!important;
        overflow:hidden!important;
      }
      body[data-run-active="true"] .ccg-game .ccg-rating-rail{
        position:absolute!important;
        top:12px!important;
        left:50%!important;
        width:min(580px,76%)!important;
        transform:translateX(-50%)!important;
        z-index:93!important;
        margin:0!important;
      }

      /* Horde owns its own HUD. Ordinary dungeon objectives, inventory,
         keyring, shops and item controls are deliberately absent. */
      body[data-special-mode="horde-survivor"] .ccg-game>.mission,
      body[data-special-mode="horde-survivor"] .ccg-game>.critical-strip,
      body[data-special-mode="horde-survivor"] .ccg-game .shortcut-dock,
      body[data-special-mode="horde-survivor"] .ccg-game .hub-inventory,
      body[data-special-mode="horde-survivor"] .ccg-game .hub-progress,
      body[data-special-mode="horde-survivor"] .ccg-game #inventory-panel{
        display:none!important;
      }
      body[data-special-mode="horde-survivor"] .ccg-game>.tactical-zone{
        grid-template-rows:minmax(0,1fr)!important;
      }
      body[data-special-mode="horde-survivor"] .ccg-game>.tactical-zone>.radar-card{
        grid-row:1!important;
        height:100%!important;
      }
      body[data-special-mode="horde-survivor"] .ccg-game>.player-hub{
        grid-template-columns:minmax(0,1fr)!important;
      }
      body[data-special-mode="horde-survivor"] .ccg-game>.player-hub .core-stats{
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
      }
      body[data-special-mode="horde-survivor"] .ccg-game>.player-hub .armour-stat,
      body[data-special-mode="horde-survivor"] .ccg-game>.player-hub .ammo-stat{
        display:none!important;
      }

      .lost-sizzler-discord-cta{
        display:flex;
        align-items:center;
        justify-content:center;
        gap:12px;
        max-width:820px;
        margin:8px auto 10px;
        padding:10px 14px;
        border:1px solid rgba(108,236,255,.55);
        border-radius:8px;
        background:linear-gradient(90deg,rgba(88,101,242,.16),rgba(108,236,255,.07));
        color:#f6f2ff;
        text-decoration:none;
        box-shadow:0 0 18px rgba(88,101,242,.08);
      }
      .lost-sizzler-discord-cta b{color:#6cecff;font-size:11px;white-space:nowrap}
      .lost-sizzler-discord-cta span{font-size:9px;line-height:1.35;color:#cfc4da;text-align:left}
      .lost-sizzler-discord-cta:hover,
      .lost-sizzler-discord-cta:focus-visible{border-color:#ffd85a;outline:none}
      @media(max-width:650px){
        .lost-sizzler-discord-cta{align-items:flex-start;flex-direction:column;gap:4px}
        .lost-sizzler-discord-cta b{white-space:normal}
      }
    `;
    document.head.appendChild(style);
  }

  function injectDiscordLink(){
    if(document.getElementById("lost-sizzler-discord-link"))return true;
    const panel=document.querySelector("#menu>.panel");
    if(!panel)return false;
    const link=document.createElement("a");
    link.id="lost-sizzler-discord-link";
    link.className="lost-sizzler-discord-cta";
    link.href=DISCORD_URL;
    link.target="_blank";
    link.rel="noopener noreferrer";
    link.innerHTML="<b>JOIN THE LOST SIZZLER DISCORD</b><span>Discuss the game, compare runs, report bugs and suggest ideas with other Lost Sizzler players.</span>";
    const anchor=panel.querySelector(".desktop-play-recommendation")||panel.querySelector(".beta-stage-disclaimer");
    if(anchor)anchor.insertAdjacentElement("afterend",link);else panel.prepend(link);
    return true
  }

  function allowedHordeToast(title){
    const text=String(title||"").toUpperCase();
    return text.startsWith("HORDE ")||
      text==="HORDE SURVIVOR LIVE"||
      text==="HORDE SURVIVOR COMPLETE"||
      text==="THE HORDE WON"||
      text==="PLAYER DOWN"||
      text==="HOST MIGRATION COMPLETE"
  }

  function wrapToast(){
    if(state.toastWrapped||typeof window.showToast!=="function")return false;
    const original=window.showToast;
    window.showToast=function showToastV137HordeOnly(title,text,tone,duration){
      if(hordeActive()&&!allowedHordeToast(title))return false;
      return original.apply(this,arguments)
    };
    state.toastWrapped=true;
    return true
  }

  function closeLegacyInventory(){
    const panel=document.getElementById("inventory-panel");
    panel?.classList.add("hidden");
    try{if(typeof mode!=="undefined"&&mode==="inventory")mode="playing"}catch(_){}
  }

  function wrapInventory(){
    if(state.inventoryWrapped)return true;
    let wrapped=false;
    if(typeof window.toggleInventory==="function"){
      const originalToggle=window.toggleInventory;
      window.toggleInventory=function toggleInventoryV137(){
        if(hordeActive()){closeLegacyInventory();return false}
        return originalToggle.apply(this,arguments)
      };
      wrapped=true;
    }
    if(typeof window.renderInventoryPanel==="function"){
      const originalRenderInventory=window.renderInventoryPanel;
      window.renderInventoryPanel=function renderInventoryPanelV137(){
        if(hordeActive()){closeLegacyInventory();return false}
        return originalRenderInventory.apply(this,arguments)
      };
      wrapped=true;
    }
    state.inventoryWrapped=wrapped;
    return wrapped
  }

  function resetHordeUiState(){
    closeLegacyInventory();
    const toast=document.getElementById("pickup-toast");
    if(toast&&!allowedHordeToast(document.getElementById("pickup-title")?.textContent))toast.classList.remove("show");
  }

  function cleanHordeDungeonState(){
    if(!hordeActive())return false;
    try{
      if(typeof host!=="undefined"&&host){
        host.items=[];
        host.chests=[];
        host.shrines=[];
        host.switches=[];
        host.shops=[];
        host.trader=null;
        host.startShop=null;
        host.deathCaches=[];
        host.generators=[];
        host.traps=[];
        host.hazardRooms=[];
        host.arenas=[];
        host.timedRooms=[];
      }
      for(const player of livePlayers()){
        player.inventory=[];
        player.inventorySlots=0;
        player.bronzeKeys=0;
        player.torchMs=0;
        player.rapidMs=0;
      }
      resetHordeUiState();
      return true
    }catch(error){
      console.warn("[Lost Sizzler V10.37] Horde dungeon cleanup failed",error);
      return false
    }
  }

  function healthDelay(stateValue,key){
    const span=Math.max(1,HEALTH_MAX_DELAY_MS-HEALTH_MIN_DELAY_MS+1);
    return HEALTH_MIN_DELAY_MS+(hash32(`${stateValue?.seed||"HORDE"}|HEALTH-DELAY|${key}`)%span)
  }

  function blockedCell(x,y){
    try{
      if(typeof world==="undefined"||!world?.map||world.map[y]?.[x]!==0)return true;
      if(typeof host!=="undefined"&&(host?.blockingDecor||[]).some(row=>row?.x===x&&row?.y===y))return true;
      if(typeof host!=="undefined"&&(host?.enemies||[]).some(enemy=>enemy?.alive&&Math.hypot(Number(enemy.x)-x,Number(enemy.y)-y)<5))return true;
      if(livePlayers().some(player=>Math.hypot(Number(player.x)-x,Number(player.y)-y)<5))return true;
    }catch(_){return true}
    return false
  }

  function randomArenaCell(key){
    try{
      const room=(world?.rooms||[]).find(row=>row?.hordeArena)||world?.rooms?.[0];
      if(!room)return null;
      const minX=Math.max(2,Number(room.x||0)+2),maxX=Math.min(world.map[0].length-3,Number(room.x||0)+Number(room.w||0)-2);
      const minY=Math.max(2,Number(room.y||0)+2),maxY=Math.min(world.map.length-3,Number(room.y||0)+Number(room.h||0)-2);
      const width=Math.max(1,maxX-minX+1),height=Math.max(1,maxY-minY+1);
      for(let attempt=0;attempt<160;attempt++){
        const hash=hash32(`${specialActive()?.seed||hordeState()?.seed||"HORDE"}|${key}|${attempt}`);
        const x=minX+(hash%width),y=minY+((hash>>>9)%height);
        if(!blockedCell(x,y))return{x,y}
      }
      return{x:Math.floor((minX+maxX)/2),y:Math.floor((minY+maxY)/2)}
    }catch(_){return null}
  }

  function scheduleInitialHealth(stateValue,now){
    if(!stateValue?.health||state.initialHealthScheduled)return;
    const key=`START|${stateValue.startedAt||now}`;
    stateValue.health.nextSpawnAt=now+healthDelay(stateValue,key);
    state.initialHealthScheduled=true
  }

  function randomiseHealthPickups(stateValue,now){
    if(!stateValue?.health)return false;
    let changed=false;
    const active=Array.isArray(stateValue.health.active)?stateValue.health.active:[];
    if(active.length>MAX_HEALTH_PICKUPS){
      stateValue.health.active=active.slice(active.length-MAX_HEALTH_PICKUPS);
      changed=true
    }
    for(const pickup of stateValue.health.active){
      if(!pickup||pickup._v137Randomised)continue;
      const cell=randomArenaCell(pickup.id||`health-${now}`);
      if(cell){pickup.x=cell.x;pickup.y=cell.y}
      pickup.restore=3;
      pickup._v137Randomised=true;
      state.knownHealthIds.add(String(pickup.id||""));
      stateValue.health.nextSpawnAt=now+healthDelay(stateValue,pickup.id||now);
      changed=true
    }
    return changed
  }

  function collectHordeHealth(stateValue,now){
    const H=hordeApi();
    if(!H?.collectHealth||!stateValue?.health?.active?.length)return false;
    let collected=false;
    for(const model of stateValue.players||[]){
      if(model?.status!=="active"||Number(model.hp)>=Number(model.maxHp))continue;
      const live=livePlayers().find(player=>String(player.id)===String(model.id));
      if(!live)continue;
      for(const pickup of [...stateValue.health.active]){
        if(Math.hypot(Number(live.x)-Number(pickup.x),Number(live.y)-Number(pickup.y))>0.8)continue;
        if(!H.collectHealth(stateValue,pickup.id,model.id,now))continue;
        live.health=Number(model.hp||live.health||1);
        live.hpBarMs=2600;
        try{S?.sfx?.("pickup")}catch(_){}
        try{floatText?.(live.x,live.y,`+${Number(pickup.restore||3)} HP`,P?.green||"#72ff9b")}catch(_){}
        stateValue.health.nextSpawnAt=now+healthDelay(stateValue,`${pickup.id}|COLLECTED`);
        collected=true;
        break
      }
    }
    return collected
  }

  function updateHordeFocus(){
    const active=specialActive();
    if(!active||active.type!=="horde-survivor"){
      if(state.lastMode==="horde-survivor"){
        state.initialHealthScheduled=false;
        state.knownHealthIds.clear();
      }
      state.lastMode=active?.type||"";
      return false
    }
    state.lastMode="horde-survivor";
    cleanHordeDungeonState();
    const stateValue=active.state;
    if(!stateValue?.health)return true;
    const now=Date.now();
    if(active.authoritative){
      scheduleInitialHealth(stateValue,now);
      randomiseHealthPickups(stateValue,now);
      collectHordeHealth(stateValue,now);
    }
    return true
  }

  function drawHordeHealth(){
    const stateValue=hordeState();
    if(!stateValue?.health?.active?.length)return false;
    try{
      if(typeof ctx==="undefined"||typeof ws!=="function"||typeof C==="undefined")return false;
      const tile=Number(C.tile||32);
      for(const pickup of stateValue.health.active){
        if(!pickup?._v137Randomised)continue;
        const point=ws(Number(pickup.x),Number(pickup.y)),cx=Math.round(point.x+tile/2),cy=Math.round(point.y+tile/2),pulse=.86+Math.sin(performance.now()/180)*.08;
        const size=Math.max(14,Math.round(tile*.56*pulse));
        ctx.save();
        ctx.imageSmoothingEnabled=false;
        ctx.shadowColor="#72ff9b";
        ctx.shadowBlur=10;
        ctx.fillStyle="rgba(8,28,18,.94)";
        ctx.strokeStyle="#72ff9b";
        ctx.lineWidth=2;
        ctx.fillRect(Math.round(cx-size/2),Math.round(cy-size/2),size,size);
        ctx.strokeRect(Math.round(cx-size/2)+.5,Math.round(cy-size/2)+.5,size-1,size-1);
        ctx.fillStyle="#72ff9b";
        const bar=Math.max(3,Math.round(size*.22)),long=Math.max(8,Math.round(size*.68));
        ctx.fillRect(Math.round(cx-bar/2),Math.round(cy-long/2),bar,long);
        ctx.fillRect(Math.round(cx-long/2),Math.round(cy-bar/2),long,bar);
        ctx.restore()
      }
      return true
    }catch(error){
      console.warn("[Lost Sizzler V10.37] Horde health rendering failed",error);
      return false
    }
  }

  function wrapUpdateAndRender(){
    if(!state.updateWrapped&&typeof window.update==="function"){
      const originalUpdate=window.update;
      window.update=function updateV137HordeFocus(){
        const result=originalUpdate.apply(this,arguments);
        updateHordeFocus();
        return result
      };
      state.updateWrapped=true
    }
    if(!state.renderWrapped&&typeof window.render==="function"){
      const originalRender=window.render;
      window.render=function renderV137HordeHealth(){
        const result=originalRender.apply(this,arguments);
        if(hordeActive())drawHordeHealth();
        return result
      };
      state.renderWrapped=true
    }
    return state.updateWrapped&&state.renderWrapped
  }

  function interceptHordeKeys(event){
    if(!hordeActive())return;
    const code=String(event?.code||"");
    if(code!=="Tab"&&!/^Digit[1-6]$/.test(code)&&!/^Numpad[1-6]$/.test(code))return;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    closeLegacyInventory()
  }

  function install(){
    injectStyles();
    injectDiscordLink();
    const gate=window.CCGLostSizzlerReleaseGate;
    if(gate&&!gate.state?.ready)return false;
    if(!specialApi()||!hordeApi())return false;
    wrapToast();
    wrapInventory();
    wrapUpdateAndRender();
    if(!state.installed){
      addEventListener("keydown",interceptHordeKeys,true);
      state.installed=true;
      document.body.dataset.v137HordeFocus="true"
    }
    return state.toastWrapped&&state.updateWrapped&&state.renderWrapped
  }

  injectStyles();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",injectDiscordLink,{once:true});else injectDiscordLink();
  state.installTimer=setInterval(()=>{
    if(install()){clearInterval(state.installTimer);state.installTimer=0}
  },INSTALL_INTERVAL_MS);
  install();
  window.addEventListener("pagehide",()=>{if(state.installTimer)clearInterval(state.installTimer)},{once:true});

  window.CCGLostSizzlerV137={
    DISCORD_URL,
    constants:{HEALTH_MIN_DELAY_MS,HEALTH_MAX_DELAY_MS,MAX_HEALTH_PICKUPS},
    injectDiscordLink,
    cleanHordeDungeonState,
    randomiseHealthPickups,
    collectHordeHealth,
    updateHordeFocus,
    drawHordeHealth,
    get state(){return state}
  };
})();
