/* The Lost Sizzler V10.41 — Horde/Spy UI and performance hardening.
 *
 * This late release layer owns presentation fixes that must not leak between
 * game modes. It keeps the Horde roster out of the canvas, makes Horde health
 * collection reconcile the authoritative rules model and physical player,
 * reduces needless Horde per-frame maintenance, and gives Spy Vs Spy its own
 * stable HUD/search feedback instead of repeatedly rewriting Dungeon widgets.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_UI_SPY_PERFORMANCE_HARDENING__)return;
  window.__CCG_LOST_SIZZLER_V141_UI_SPY_PERFORMANCE_HARDENING__=true;

  const HORDE="horde-survivor",SPY="sizzler-saboteurs";
  const HORDE_HEALTH_MS=45,HORDE_CLEANUP_MS=900,HORDE_RECONCILE_MS=220,HORDE_REINFORCE_MS=90,HORDE_DRIVE_MS=48,HORDE_ROSTER_MAX_MS=900;
  const SEARCH_FEEDBACK_MS=520,SEARCH_COMPLETE_MS=420,MONITOR_MS=50;
  const state={
    timer:0,installed:false,lastMode:"",stylesInstalled:false,
    hordeFocusWrapped:false,hordeLiveWrapped:false,hordeFocusBase:null,hordeLiveBase:null,
    hordeFocusActive:false,lastHordeCleanupAt:0,lastHordeHealthAt:0,lastHordeReconcileAt:0,lastHordeReinforceAt:0,lastHordeDriveAt:0,lastHordeRosterAt:0,lastHordeRosterSignature:"",
    hordeRosterMoves:0,hordeRosterRenders:0,hordeHealthCollections:0,hordeHealthFallbacks:0,hordeLeakRepairs:0,
    spyUiActive:false,lastSpyHudSignature:"",spyHudRenders:0,spyLegacyUiSuppressions:0,
    searchTargetId:"",searchTargetLabel:"",searchStartedAt:0,searchCompletedAt:0,searchPulses:0,lastSearchRenderSignature:""
  };

  const special=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const specialType=()=>String(special()?.type||document.body?.dataset?.specialMode||"");
  const hordeActive=()=>specialType()===HORDE;
  const spyActive=()=>specialType()===SPY;
  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const html=value=>String(value==null?"":value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const actorId=()=>{try{return String(net?.sessionId||p1?.id||"P1")}catch(_){return"P1"}};

  function livePlayers(){
    const rows=[];
    try{if(typeof p1!=="undefined"&&p1)rows.push(p1)}catch(_){}
    try{if(typeof p2!=="undefined"&&p2&&!rows.includes(p2))rows.push(p2)}catch(_){}
    try{for(const player of remote?.values?.()||[])if(player&&!rows.includes(player))rows.push(player)}catch(_){}
    return rows
  }

  function ensureStyles(){
    if(document.getElementById("ccg-v141-ui-spy-performance-style")){state.stylesInstalled=true;return true}
    const style=document.createElement("style");
    style.id="ccg-v141-ui-spy-performance-style";
    style.textContent=`
      /* Horde roster belongs below gameplay, never over the playfield. */
      body[data-special-mode="horde-survivor"] #horde-live-roster{
        display:grid!important;
        grid-template-columns:minmax(150px,.75fr) minmax(0,1.8fr)!important;
        gap:8px 16px!important;
        align-items:center!important;
        position:static!important;
        inset:auto!important;
        width:100%!important;
        max-width:none!important;
        min-width:0!important;
        margin:0!important;
        padding:8px 12px!important;
        box-sizing:border-box!important;
        pointer-events:none!important;
        z-index:auto!important;
        background:linear-gradient(90deg,rgba(20,12,27,.96),rgba(7,5,12,.96))!important;
      }
      body[data-special-mode="horde-survivor"] #horde-live-roster .v138-head{align-self:start!important}
      body[data-special-mode="horde-survivor"] #horde-live-roster .v138-join{grid-column:1!important;margin:2px 0 0!important}
      body[data-special-mode="horde-survivor"] #horde-live-roster #horde-live-remaining{grid-column:1!important;margin-top:3px!important;padding-top:3px!important}
      body[data-special-mode="horde-survivor"] #horde-live-roster ul{
        grid-column:2!important;grid-row:1 / span 3!important;display:flex!important;flex-wrap:wrap!important;gap:5px 12px!important;margin:0!important;align-items:center!important
      }
      body[data-special-mode="horde-survivor"] #horde-live-roster li{max-width:220px!important}

      /* Spy owns a dedicated UI. Dungeon mission/key/inventory chrome is hidden
         rather than being rewritten back and forth by retained compatibility layers. */
      body[data-special-mode="sizzler-saboteurs"] .ccg-game>.critical-strip,
      body[data-special-mode="sizzler-saboteurs"] .ccg-game>.mission,
      body[data-special-mode="sizzler-saboteurs"] .ccg-game>.fullscreen-hint,
      body[data-special-mode="sizzler-saboteurs"] .ccg-game>.tactical-zone,
      body[data-special-mode="sizzler-saboteurs"] .player-hub>.core-stats,
      body[data-special-mode="sizzler-saboteurs"] .player-hub>.hub-inventory,
      body[data-special-mode="sizzler-saboteurs"] .player-hub>.hub-progress,
      body[data-special-mode="sizzler-saboteurs"] .player-hub>.hub-telemetry{
        display:none!important;
      }
      body[data-special-mode="sizzler-saboteurs"] .player-hub{
        display:block!important;grid-template-columns:minmax(0,1fr)!important;min-height:0!important
      }
      #spy-independent-hud{display:none}
      body[data-special-mode="sizzler-saboteurs"] #spy-independent-hud{
        display:grid!important;grid-template-columns:minmax(150px,.72fr) minmax(0,1.8fr) minmax(180px,.85fr);gap:10px 14px;align-items:stretch;
        padding:10px 12px;border:1px solid rgba(185,120,255,.52);border-radius:9px;background:linear-gradient(135deg,rgba(23,10,34,.96),rgba(5,7,15,.97));box-sizing:border-box
      }
      #spy-independent-hud .spy-summary{display:grid;align-content:center;gap:3px;min-width:0}
      #spy-independent-hud .spy-summary b{color:#ffd85a;font:900 12px/1.2 "Courier New",monospace;letter-spacing:.45px}
      #spy-independent-hud .spy-summary span{color:#cfc5da;font:800 10px/1.25 "Courier New",monospace}
      #spy-independent-hud .spy-objectives{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;min-width:0}
      #spy-independent-hud .spy-objective{display:grid;gap:2px;min-width:0;padding:7px 8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.025);text-align:center}
      #spy-independent-hud .spy-objective b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#efe8f6;font:900 9px/1.15 "Courier New",monospace}
      #spy-independent-hud .spy-objective strong{color:#ff7777;font:900 10px/1.15 "Courier New",monospace}
      #spy-independent-hud .spy-objective[data-held="true"]{border-color:rgba(114,255,155,.55);background:rgba(114,255,155,.06)}
      #spy-independent-hud .spy-objective[data-held="true"] strong{color:#72ff9b}
      #spy-independent-hud .spy-loadout{display:grid;align-content:center;gap:3px;min-width:0;text-align:right}
      #spy-independent-hud .spy-loadout b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#6cecff;font:900 10px/1.25 "Courier New",monospace}
      #spy-independent-hud .spy-loadout span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#cfc5da;font:800 9px/1.25 "Courier New",monospace}

      /* Dedicated Spy context/search feedback replaces the legacy text-only prompt. */
      body[data-spy-independent-ui="true"] #spy-context-prompt{display:none!important}
      #spy-search-indicator{display:none;position:absolute;left:50%;bottom:18px;transform:translateX(-50%);z-index:126;width:min(520px,82%);padding:8px 11px;border:2px solid #6cecff;background:rgba(4,2,10,.95);box-shadow:0 4px 20px rgba(0,0,0,.72);pointer-events:none;box-sizing:border-box}
      body[data-special-mode="sizzler-saboteurs"] #spy-search-indicator[data-visible="true"]{display:block}
      #spy-search-indicator .spy-search-copy{display:flex;justify-content:space-between;gap:10px;color:#eaffff;font:900 11px/1.2 "Courier New",monospace;letter-spacing:.4px}
      #spy-search-indicator .spy-search-copy span:last-child{color:#ffd85a;white-space:nowrap}
      #spy-search-indicator .spy-search-track{height:6px;margin-top:6px;border:1px solid rgba(108,236,255,.42);background:rgba(0,0,0,.6);overflow:hidden}
      #spy-search-indicator .spy-search-track i{display:block;width:0;height:100%;background:linear-gradient(90deg,#6cecff,#72ff9b);transition:width 40ms linear}
      #spy-search-indicator[data-state="ready"] .spy-search-track i{background:#6cecff}
      #spy-search-indicator[data-state="complete"]{border-color:#72ff9b}
      #spy-search-indicator[data-state="complete"] .spy-search-track i{background:#72ff9b}
      #spy-search-indicator[data-state="searched"]{border-color:rgba(185,120,255,.72)}
      #spy-search-indicator[data-state="searched"] .spy-search-track{display:none}

      @media(max-width:900px){
        body[data-special-mode="horde-survivor"] #horde-live-roster{grid-template-columns:1fr!important;gap:4px!important}
        body[data-special-mode="horde-survivor"] #horde-live-roster ul{grid-column:1!important;grid-row:auto!important}
        body[data-special-mode="sizzler-saboteurs"] #spy-independent-hud{grid-template-columns:1fr!important}
        #spy-independent-hud .spy-loadout{text-align:left}
      }
      @media(max-width:620px){
        #spy-independent-hud .spy-objectives{grid-template-columns:repeat(2,minmax(0,1fr))}
        #spy-search-indicator{width:92%}
      }
    `;
    document.head.appendChild(style);state.stylesInstalled=true;return true
  }

  function mountHordeRoster(){
    const roster=document.getElementById("horde-live-roster"),hub=document.querySelector(".player-hub");
    if(!roster||!hub)return false;
    if(roster.parentElement!==hub){hub.appendChild(roster);state.hordeRosterMoves++}
    return true
  }

  function hordeRosterSignature(){
    const runState=special()?.state;
    let members=[];try{members=net?.getMembers?.()||[]}catch(_){}
    const rows=members.map(member=>{
      const model=runState?.players?.find(player=>String(player?.id||"")===String(member?.id||""));
      return[String(member?.id||""),String(member?.name||""),String(model?.status||"active"),Math.round(Number(model?.hp||0))].join(":")
    });
    return`${String(net?.roomCode||"-----")}|${Number(runState?.wave||0)}|${rows.join("|")}`
  }

  function updateHordeRoster(force=false){
    const api=window.CCGLostSizzlerV138;if(!api||typeof api.updateRoster!=="function")return false;
    mountHordeRoster();
    const now=perfNow(),signature=hordeRosterSignature();
    if(!force&&signature===state.lastHordeRosterSignature&&now-state.lastHordeRosterAt<HORDE_ROSTER_MAX_MS)return false;
    state.lastHordeRosterSignature=signature;state.lastHordeRosterAt=now;api.updateRoster();mountHordeRoster();state.hordeRosterRenders++;return true
  }

  function resolveHordeModel(live,runState,index=0){
    if(!live||!runState)return null;
    const exact=(runState.players||[]).find(model=>String(model?.id||"")===String(live.id||""));if(exact)return exact;
    let local=false;try{local=live===p1}catch(_){}
    if(local&&Number(runState.playerCount||runState.players?.length||0)===1&&runState.players?.[0]){state.hordeHealthFallbacks++;return runState.players[0]}
    const actor=(runState.players||[]).find(model=>String(model?.id||"")===actorId());if(local&&actor){state.hordeHealthFallbacks++;return actor}
    return runState.players?.[index]||null
  }

  function repairHordeHealth(runState=special()?.state,now=Date.now()){
    const H=window.CCGLostSizzlerHorde;if(!hordeActive()||!runState?.health?.active?.length||typeof H?.collectHealth!=="function")return false;
    let changed=false;const lives=livePlayers();
    for(const [index,live] of lives.entries()){
      const model=resolveHordeModel(live,runState,index);if(!model||model.status!=="active"||Number(model.hp)>=Number(model.maxHp))continue;
      for(const pickup of [...runState.health.active]){
        const distance=Math.hypot(Number(live.x)-Number(pickup?.x),Number(live.y)-Number(pickup?.y));if(!Number.isFinite(distance)||distance>1.05)continue;
        if(!H.collectHealth(runState,pickup.id,model.id,now))continue;
        live.maxHealth=Math.max(1,Number(model.maxHp||live.maxHealth||10));live.health=Math.max(0,Number(model.hp||0));live.hpBarMs=Math.max(2600,Number(live.hpBarMs||0));
        try{S?.sfx?.("pickup")}catch(_){}
        try{floatText?.(live.x,live.y,`+${Number(pickup.restore||3)} HP`,P?.green||"#72ff9b")}catch(_){}
        state.hordeHealthCollections++;changed=true;break
      }
    }
    return changed
  }

  function hordeDungeonLeak(){
    if(!hordeActive())return false;
    try{
      const forbidden=[host?.items,host?.chests,host?.shrines,host?.switches,host?.shops,host?.deathCaches,host?.generators,host?.traps,host?.hazardRooms,host?.arenas,host?.timedRooms];
      if(forbidden.some(value=>Array.isArray(value)&&value.length>0))return true;
      for(const player of livePlayers())if((Array.isArray(player?.inventory)&&player.inventory.length>0)||Number(player?.bronzeKeys||0)>0||Number(player?.torchMs||0)>0)return true;
    }catch(_){}
    return false
  }

  function installHordeFocusOwner(){
    const api=window.CCGLostSizzlerV137,current=api?.updateHordeFocus;if(!api||typeof current!=="function")return false;
    if(current.__ccgV141UiPerformanceFocus){state.hordeFocusWrapped=true;return true}
    state.hordeFocusBase=current;
    const wrapped=function updateHordeFocusV141UiPerformance(){
      if(!hordeActive()){
        if(state.hordeFocusActive){state.hordeFocusActive=false;state.lastHordeCleanupAt=state.lastHordeHealthAt=0;return current.apply(api,arguments)}
        return false
      }
      const now=perfNow(),wall=Date.now(),runState=special()?.state;
      if(!state.hordeFocusActive){state.hordeFocusActive=true;state.lastHordeCleanupAt=0;state.lastHordeHealthAt=0}
      const leak=hordeDungeonLeak();
      if(!state.lastHordeCleanupAt||leak||now-state.lastHordeCleanupAt>=HORDE_CLEANUP_MS){
        current.apply(api,arguments);state.lastHordeCleanupAt=now;state.lastHordeHealthAt=now;if(leak)state.hordeLeakRepairs++;
        repairHordeHealth(runState,wall);return true
      }
      if(now-state.lastHordeHealthAt>=HORDE_HEALTH_MS){
        try{api.randomiseHealthPickups?.(runState,wall)}catch(_){}
        repairHordeHealth(runState,wall);state.lastHordeHealthAt=now
      }
      return true
    };
    try{Object.assign(wrapped,current)}catch(_){}wrapped.__ccgV141UiPerformanceFocus=true;wrapped.__ccgOriginal=current;api.updateHordeFocus=wrapped;state.hordeFocusWrapped=true;return true
  }

  function installHordeLiveOwner(){
    const api=window.CCGLostSizzlerV138,current=api?.updateHordeLive;if(!api||typeof current!=="function")return false;
    if(current.__ccgV141UiPerformanceLive){state.hordeLiveWrapped=true;return true}
    state.hordeLiveBase=current;
    const wrapped=function updateHordeLiveV141UiPerformance(dt){
      if(!hordeActive()){
        state.lastHordeReconcileAt=state.lastHordeReinforceAt=state.lastHordeDriveAt=state.lastHordeRosterAt=0;state.lastHordeRosterSignature="";
        return current.apply(api,arguments)
      }
      const now=perfNow(),live=special();mountHordeRoster();
      try{api.ensureLocalCentreSpawn?.()}catch(_){}
      if(live?.authoritative){
        if(!state.lastHordeReconcileAt||now-state.lastHordeReconcileAt>=HORDE_RECONCILE_MS){try{api.reconcilePlayers?.()}catch(_){}state.lastHordeReconcileAt=now}
        if(!state.lastHordeReinforceAt||now-state.lastHordeReinforceAt>=HORDE_REINFORCE_MS){try{api.reinforceWave?.(Date.now())}catch(_){}state.lastHordeReinforceAt=now}
        if(!state.lastHordeDriveAt||now-state.lastHordeDriveAt>=HORDE_DRIVE_MS){const elapsed=state.lastHordeDriveAt?Math.max(4,Math.min(90,now-state.lastHordeDriveAt)):Math.max(4,Number(dt)||16);try{api.driveEnemies?.(elapsed)}catch(_){}state.lastHordeDriveAt=now}
      }
      updateHordeRoster(false);return true
    };
    try{Object.assign(wrapped,current)}catch(_){}wrapped.__ccgV141UiPerformanceLive=true;wrapped.__ccgOriginal=current;api.updateHordeLive=wrapped;state.hordeLiveWrapped=true;return true
  }

  function ensureSpyHud(){
    let hud=document.getElementById("spy-independent-hud");if(hud)return hud;
    const hub=document.querySelector(".player-hub");if(!hub)return null;
    hud=document.createElement("section");hud.id="spy-independent-hud";hud.setAttribute("aria-label","Spy Vs Spy independent status and objectives");
    hud.innerHTML=`<div class="spy-summary"><b id="spy-hud-round">SPY VS SPY</b><span id="spy-hud-score">ROUND 0 · SCORE 0-0</span><span id="spy-hud-health">HEALTH 0/0</span></div><div class="spy-objectives"><div class="spy-objective" data-spy-objective="case" data-held="false"><b>SIZZLER CASE</b><strong>MISSING</strong></div><div class="spy-objective" data-spy-objective="joystick" data-held="false"><b>JOYSTICK</b><strong>MISSING</strong></div><div class="spy-objective" data-spy-objective="tape" data-held="false"><b>LOADING TAPE</b><strong>MISSING</strong></div><div class="spy-objective" data-spy-objective="key" data-held="false"><b>DUNGEON KEY</b><strong>MISSING</strong></div></div><div class="spy-loadout"><b id="spy-hud-weapon">WEAPON · RULEBOOK</b><span id="spy-hud-counter">COUNTER · NONE</span><span id="spy-hud-traps">TRAPS · NONE</span><span>F · FIELD KIT</span></div>`;
    hub.appendChild(hud);return hud
  }

  function objectiveHeld(model,id){
    if(!model)return false;if(id==="case")return Boolean(model.hasCase);return Boolean(model.objectives?.includes?.(id)||model.looseItem===id)
  }

  function localSpyModel(){
    const match=special()?.state,id=actorId();return match?.players?.find(model=>String(model?.id||"")===id)||match?.players?.[0]||null
  }

  function spyWeaponName(model){
    const weapon=model?.weapon,SAB=window.CCGLostSizzlerSaboteurs;if(!weapon)return"ROLLED-UP RULEBOOK";
    if(typeof weapon==="string")return String(SAB?.WEAPONS?.[weapon]?.name||weapon).toUpperCase();
    return String(weapon.name||weapon.displayName||SAB?.WEAPONS?.[weapon.id]?.name||weapon.id||"ROLLED-UP RULEBOOK").toUpperCase()
  }

  function spyCounterName(model){
    const id=model?.counter;if(!id)return"NONE";return String(window.CCGLostSizzlerSaboteurs?.COUNTERS?.[id]?.name||id).toUpperCase()
  }

  function spyTrapText(match){
    const SAB=window.CCGLostSizzlerSaboteurs,ids=Array.isArray(match?.trapLoadout)?match.trapLoadout:[];if(!ids.length)return"NONE";
    return ids.map(id=>String(SAB?.TRAPS?.[id]?.name||id)).join(" · ").toUpperCase()
  }

  function renderSpyHud(force=false){
    const hud=ensureSpyHud();if(!hud||!spyActive())return false;
    const match=special()?.state,model=localSpyModel(),opponent=match?.players?.find(row=>row!==model),held={case:objectiveHeld(model,"case"),joystick:objectiveHeld(model,"joystick"),tape:objectiveHeld(model,"tape"),key:objectiveHeld(model,"key")};
    const signature=[Number(match?.round||0),String(match?.modifier?.name||""),Number(match?.wins?.[model?.id]||0),Number(match?.wins?.[opponent?.id]||0),Number(model?.hp||0),Number(model?.maxHp||0),held.case,held.joystick,held.tape,held.key,spyWeaponName(model),spyCounterName(model),spyTrapText(match)].join("|");
    if(!force&&signature===state.lastSpyHudSignature)return false;state.lastSpyHudSignature=signature;
    const round=hud.querySelector("#spy-hud-round"),scoreNode=hud.querySelector("#spy-hud-score"),health=hud.querySelector("#spy-hud-health"),weapon=hud.querySelector("#spy-hud-weapon"),counter=hud.querySelector("#spy-hud-counter"),traps=hud.querySelector("#spy-hud-traps");
    if(round)round.textContent=`SPY VS SPY · ROUND ${Number(match?.round||0)}/5`;
    if(scoreNode)scoreNode.textContent=`${String(match?.modifier?.name||"DOUBLE-CROSS").toUpperCase()} · SCORE ${Number(match?.wins?.[model?.id]||0)}-${Number(match?.wins?.[opponent?.id]||0)}`;
    if(health)health.textContent=`HEALTH ${Math.max(0,Number(model?.hp||0))}/${Math.max(1,Number(model?.maxHp||1))}`;
    for(const id of ["case","joystick","tape","key"]){const node=hud.querySelector(`[data-spy-objective="${id}"]`),value=held[id];if(node){node.dataset.held=String(value);const strong=node.querySelector("strong");if(strong)strong.textContent=value?"HELD":"MISSING"}}
    if(weapon)weapon.textContent=`WEAPON · ${spyWeaponName(model)}`;if(counter)counter.textContent=`COUNTER · ${spyCounterName(model)}`;if(traps)traps.textContent=`TRAPS · ${spyTrapText(match)}`;
    state.spyHudRenders++;return true
  }

  function ensureSearchIndicator(){
    let node=document.getElementById("spy-search-indicator");if(node)return node;
    const wrap=document.querySelector(".canvas-wrap");if(!wrap)return null;
    node=document.createElement("div");node.id="spy-search-indicator";node.dataset.visible="false";node.dataset.state="ready";node.setAttribute("role","status");node.setAttribute("aria-live","polite");node.innerHTML='<div class="spy-search-copy"><span id="spy-search-label">E — SEARCH</span><span id="spy-search-percent">READY</span></div><div class="spy-search-track"><i id="spy-search-fill"></i></div>';wrap.appendChild(node);return node
  }

  function nearSpyFurniture(){
    if(!spyActive())return null;let live=null;try{live=p1||null}catch(_){}if(!live)return null;
    const model=localSpyModel(),match=special()?.state,near=(host?.blockingDecor||[]).filter(item=>item?.spyFurniture&&Math.abs(Number(item.x)-Number(live.x))+Math.abs(Number(item.y)-Number(live.y))<=1).sort((a,b)=>(Math.abs(Number(a.x)-Number(live.x))+Math.abs(Number(a.y)-Number(live.y)))-(Math.abs(Number(b.x)-Number(live.x))+Math.abs(Number(b.y)-Number(live.y))))[0];
    if(!near)return null;
    const room=match?.map?.rooms?.find(row=>String(row?.id||"")===String(model?.roomId||"")),logical=room?.furniture?.find(item=>String(item?.id||"")===String(near.logicalFurnitureId||""));
    const raw=String(near.type||logical?.type||"FURNITURE").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/_/g," ");return{near,logical,id:String(logical?.id||near.logicalFurnitureId||near.id||"furniture"),label:raw.toUpperCase(),searched:Boolean(logical?.searched)}
  }

  function renderSearchIndicator(){
    const node=ensureSearchIndicator();if(!node)return false;
    if(!spyActive()){node.dataset.visible="false";state.lastSearchRenderSignature="";return false}
    const target=nearSpyFurniture(),now=perfNow(),labelNode=node.querySelector("#spy-search-label"),percent=node.querySelector("#spy-search-percent"),fill=node.querySelector("#spy-search-fill");
    let visible=false,mode="ready",label="",status="",progress=0;
    const activePulse=Boolean(state.searchStartedAt&&now-state.searchStartedAt<SEARCH_FEEDBACK_MS+SEARCH_COMPLETE_MS);
    if(activePulse&&state.searchTargetId){
      visible=true;const elapsed=now-state.searchStartedAt;
      if(elapsed<SEARCH_FEEDBACK_MS){mode="searching";progress=Math.max(0,Math.min(100,Math.round(elapsed/SEARCH_FEEDBACK_MS*100)));label=`SEARCHING ${state.searchTargetLabel||"FURNITURE"}`;status=`${progress}%`}
      else{mode="complete";progress=100;label=`SEARCH COMPLETE · ${state.searchTargetLabel||"FURNITURE"}`;status="DONE";if(!state.searchCompletedAt)state.searchCompletedAt=now}
    }else if(target){
      visible=true;if(target.searched){mode="searched";progress=100;label=`${target.label} — ALREADY SEARCHED`;status="DONE"}else{mode="ready";progress=0;label=`E — SEARCH ${target.label}`;status="READY"}
    }
    const signature=`${visible}|${mode}|${label}|${status}|${progress}`;if(signature===state.lastSearchRenderSignature)return visible;state.lastSearchRenderSignature=signature;
    node.dataset.visible=String(visible);node.dataset.state=mode;if(labelNode)labelNode.textContent=label;if(percent)percent.textContent=status;if(fill)fill.style.width=`${progress}%`;return visible
  }

  function beginSearchFeedback(){
    if(!spyActive())return false;const target=nearSpyFurniture();if(!target||target.searched)return false;
    state.searchTargetId=target.id;state.searchTargetLabel=target.label;state.searchStartedAt=perfNow();state.searchCompletedAt=0;state.searchPulses++;state.lastSearchRenderSignature="";renderSearchIndicator();return true
  }

  function claimSpyUi(){
    ensureSpyHud();ensureSearchIndicator();document.body.dataset.spyIndependentUi="true";
    const legacy=window.CCGLostSizzlerV141R27SpyIsolation;
    try{if(legacy?.state&&legacy.state.rendering!==true){legacy.state.rendering=true;state.spyLegacyUiSuppressions++}}catch(_){}
    state.spyUiActive=true;renderSpyHud(false);renderSearchIndicator();return true
  }

  function releaseSpyUi(){
    if(!state.spyUiActive)return false;state.spyUiActive=false;state.lastSpyHudSignature="";state.searchTargetId=state.searchTargetLabel="";state.searchStartedAt=state.searchCompletedAt=0;state.lastSearchRenderSignature="";
    delete document.body.dataset.spyIndependentUi;const search=document.getElementById("spy-search-indicator");if(search)search.dataset.visible="false";
    const legacy=window.CCGLostSizzlerV141R27SpyIsolation;try{if(legacy?.state)legacy.state.rendering=false;legacy?.restoreUi?.()}catch(_){}return true
  }

  function onKeyDown(event){
    if(!spyActive()||String(event?.code||"")!=="KeyE"||event?.repeat)return;beginSearchFeedback()
  }

  function install(){
    ensureStyles();installHordeFocusOwner();installHordeLiveOwner();ensureSpyHud();ensureSearchIndicator();
    if(!state.installed){addEventListener("keydown",onKeyDown,true);state.installed=true}
    return state.hordeFocusWrapped&&state.hordeLiveWrapped
  }

  function monitor(){
    install();const type=specialType();
    if(type===HORDE){mountHordeRoster();updateHordeRoster(false);if(state.spyUiActive)releaseSpyUi()}
    else if(type===SPY){claimSpyUi()}
    else if(state.spyUiActive)releaseSpyUi();
    state.lastMode=type
  }

  install();monitor();state.timer=setInterval(()=>{try{monitor()}catch(error){console.warn("[Lost Sizzler V10.41] UI/performance hardening monitor failed",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0;releaseSpyUi()},{once:true});

  window.CCGLostSizzlerV141UiSpyPerformance={
    ensureStyles,mountHordeRoster,updateHordeRoster,repairHordeHealth,hordeDungeonLeak,installHordeFocusOwner,installHordeLiveOwner,
    ensureSpyHud,renderSpyHud,ensureSearchIndicator,nearSpyFurniture,renderSearchIndicator,beginSearchFeedback,claimSpyUi,releaseSpyUi,monitor,
    ownsUi:()=>spyActive()&&document.body?.dataset?.spyIndependentUi==="true",
    get state(){return state}
  };
})();
