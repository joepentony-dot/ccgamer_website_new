/* The Lost Sizzler V10.41 r36 — Spy Vs Spy perfection finalizer.
 *
 * Spy-only final reconciliation layer for the post-r35 playtest issues:
 * - explicit, escapable Spy item inventory;
 * - physical player/health recovery after a ghost respawn;
 * - stale-control/search recovery so an active agent cannot remain frozen;
 * - guaranteed visible melee swing state for Spy attacks;
 * - repaired door-opening lifecycle so the shared door renderer receives a
 *   real opening interval instead of an instant closed->open transition;
 * - authoritative remote-player room/trap reconciliation;
 * - persistent trap-armed/search feedback in the Trapulator HUD;
 * - a desktop command rail which occupies real unused space to the right of
 *   the fitted 16:9 game canvas without covering the playfield.
 *
 * This module never acquires window.update/render ownership and is inert in
 * Solo, Dungeon Multiplayer, Horde and local Split Screen.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R36_SPY_PERFECTION__)return;
  window.__CCG_LOST_SIZZLER_V141_R36_SPY_PERFECTION__=true;

  const MODE_ID="sizzler-saboteurs";
  const TICK_MS=50,UI_MS=90,DOOR_MS=520,SEARCH_STALE_MS=1800,EVENT_MEMORY=320;
  const state={
    timer:0,installed:false,inventoryExitMounted:false,railMounted:false,lastUiAt:0,lastRailSignature:"",
    statusById:new Map(),doorById:new Map(),roomById:new Map(),seenEvents:new Set(),seenEventOrder:[],
    inventoryCloses:0,healthRepairs:0,respawnRepairs:0,freezeRepairs:0,searchRepairs:0,
    doorRepairs:0,swings:0,remoteTrapChecks:0,trapEvents:0,trapArmedEvents:0,railLayouts:0
  };

  const active=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const match=()=>active()?.state||null;
  const spyActive=()=>active()?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID;
  const authoritative=()=>Boolean(active()?.authoritative);
  const overhaul=()=>{try{return window.CCGLostSizzlerV141R32SpyOverhaul||null}catch(_){return null}};
  const hardening=()=>{try{return window.CCGLostSizzlerV141R35SpyRulesHardening||null}catch(_){return null}};
  const finalOwner=()=>{try{return window.CCGLostSizzlerV141R32SpyPacketOwner||null}catch(_){return null}};
  const SAB=()=>{try{return window.CCGLostSizzlerSaboteurs||null}catch(_){return null}};
  const actorId=()=>{try{return String(net?.sessionId||p1?.id||"P1")}catch(_){return"P1"}};
  const modelFor=id=>match()?.players?.find?.(row=>String(row?.id||"")===String(id||""))||null;
  const localModel=()=>modelFor(actorId())||match()?.players?.[0]||null;
  const liveFor=id=>{try{return String(p1?.id||"")===String(id||"")?p1:remote?.get?.(id)||null}catch(_){return null}};
  const nowPerf=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const now=()=>Date.now();
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const editable=target=>{try{return Boolean(target?.closest?.("input,textarea,select,[contenteditable='true'],[contenteditable='']"))}catch(_){return false}};
  const trapName=id=>finalOwner()?.CLASSIC_TRAPS?.find?.(row=>String(row.id)===String(id))?.name||SAB()?.TRAPS?.[id]?.name||String(id||"TRAP").toUpperCase();
  const roomFor=id=>match()?.map?.rooms?.find?.(row=>String(row?.id||"")===String(id||""))||null;
  const physicalRoomFor=id=>{const logical=roomFor(id);const index=Number(logical?.dungeonRoomId);return Number.isFinite(index)?world?.rooms?.[index]||null:null};

  function installStyles(){
    if(document.getElementById("ccg-spy-r36-perfection-style"))return true;
    const style=document.createElement("style");style.id="ccg-spy-r36-perfection-style";
    style.textContent=`
      #spy-r32-inventory .spy-r36-inventory-head{position:sticky;top:-18px;z-index:5;display:flex;justify-content:flex-end;margin:-18px -18px 10px;padding:10px 10px 7px;background:linear-gradient(180deg,#150b20 75%,transparent)}
      #spy-r32-inventory .spy-r36-return{min-width:174px!important;border:2px solid #72ff9b!important;background:#07160e!important;color:#dfffea!important;padding:9px 13px!important;font-size:11px!important}
      #spy-r32-inventory .spy-r36-return:focus{outline:2px solid #fff;outline-offset:2px}
      .spy-r36-searchline,.spy-r36-armedline{margin:3px 0;padding:4px 5px;border:1px solid rgba(108,236,255,.22);background:rgba(2,8,13,.64);font:900 7px/1.2 "Courier New",monospace;min-width:0;overflow:hidden}
      .spy-r36-searchline{color:#9cefff}.spy-r36-armedline{color:#ffd85a}
      .spy-r36-searchline i{display:block;height:3px;margin-top:3px;background:#10222b;overflow:hidden}.spy-r36-searchline i:after{content:"";display:block;width:var(--spy-search,0%);height:100%;background:linear-gradient(90deg,#6cecff,#72ff9b)}
      .spy-classic-trap .spy-r36-armed-badge{display:inline-block;margin-left:4px;padding:1px 3px;border:1px solid rgba(255,216,90,.5);color:#ffd85a;font:900 6px/1 "Courier New",monospace;vertical-align:middle}
      #spy-r36-desktop-rail{display:none;position:absolute;z-index:132;box-sizing:border-box;overflow:auto;border-left:2px solid rgba(185,120,255,.5);background:linear-gradient(180deg,#0d0714,#040308);padding:10px;color:#eee8f4;font:800 9px/1.28 "Courier New",monospace}
      #spy-r36-desktop-rail h3{margin:0 0 8px;color:#ffd85a;font:900 13px/1.1 "Courier New",monospace;letter-spacing:.5px}
      #spy-r36-desktop-rail .spy-r36-card{margin:0 0 8px;padding:8px;border:1px solid rgba(108,236,255,.22);background:rgba(255,255,255,.025)}
      #spy-r36-desktop-rail .spy-r36-card b{display:block;margin-bottom:4px;color:#6cecff;font-size:8px}.spy-r36-card strong{color:#fff}.spy-r36-card small{display:block;margin-top:4px;color:#a99db5;line-height:1.3}
      #spy-r36-desktop-rail .spy-r36-health{height:5px;margin:5px 0;background:#160b16;border:1px solid rgba(255,255,255,.12);overflow:hidden}#spy-r36-desktop-rail .spy-r36-health i{display:block;height:100%;background:#72ff9b}
      #spy-r36-desktop-rail .spy-r36-actions{display:grid;grid-template-columns:1fr;gap:5px;margin-bottom:8px}#spy-r36-desktop-rail button{pointer-events:auto;border:1px solid #6cecff;background:#07131b;color:#eaffff;padding:7px 8px;font:900 8px/1.2 "Courier New",monospace;cursor:pointer}#spy-r36-desktop-rail button[data-selected="true"]{border-color:#ffd85a;color:#ffd85a}
      #spy-r36-desktop-rail .spy-r36-trap-list{display:grid;gap:4px}.spy-r36-trap-row{display:flex;justify-content:space-between;gap:5px;border-top:1px solid rgba(255,255,255,.08);padding-top:4px}.spy-r36-trap-row span:last-child{color:#ffd85a;text-align:right}
      body[data-special-mode="sizzler-saboteurs"] .spy-r36-live{display:block}
      @media(max-width:1200px){#spy-r36-desktop-rail{display:none!important}}
    `;
    document.head.appendChild(style);return true
  }

  function forcePlaying(focus=true){
    if(!spyActive())return false;
    try{if(typeof mode!=="undefined"&&["inventory","paused","dossier"].includes(String(mode)))mode="playing"}catch(_){}
    try{UI?.inventory?.classList?.add?.("hidden");UI?.pause?.classList?.add?.("hidden")}catch(_){}
    if(focus)requestAnimationFrame(()=>{try{document.getElementById("game")?.focus?.({preventScroll:true})}catch(_){}});
    return true
  }

  function closeInventory(){
    const api=overhaul();if(!api?.setInventory)return false;
    api.setInventory(false);forcePlaying(true);state.inventoryCloses++;return true
  }

  function ensureInventoryExit(){
    installStyles();const root=document.getElementById("spy-r32-inventory"),panel=root?.querySelector?.(".spy-r32-panel");if(!root||!panel)return false;
    let head=panel.querySelector(".spy-r36-inventory-head");
    if(!head){head=document.createElement("div");head.className="spy-r36-inventory-head";head.innerHTML='<button type="button" class="spy-r36-return">RETURN TO GAME</button>';panel.insertBefore(head,panel.firstChild);state.inventoryExitMounted=true}
    if(!root.__ccgR36CloseBound){
      root.__ccgR36CloseBound=true;
      root.addEventListener("click",event=>{if(event.target===root||event.target?.closest?.(".spy-r36-return")){event.preventDefault?.();event.stopPropagation?.();closeInventory()}})
    }
    return true
  }

  function centre(room){return room?{x:Math.floor(Number(room.x)+Number(room.w)/2),y:Math.floor(Number(room.y)+Number(room.h)/2)}:null}
  function validCell(x,y){
    x=Math.round(Number(x));y=Math.round(Number(y));if(!Number.isFinite(x)||!Number.isFinite(y))return false;
    try{if(world?.map?.[y]?.[x]!==0)return false;if((host?.blockingDecor||[]).some(item=>Number(item.x)===x&&Number(item.y)===y))return false}catch(_){return false}
    return true
  }
  function repairPosition(model,live){
    if(!model||!live)return false;const x=Number(live.x),y=Number(live.y);if(Number.isFinite(x)&&Number.isFinite(y)&&validCell(x,y))return false;
    const q=centre(physicalRoomFor(model.roomId));if(!q||!validCell(q.x,q.y))return false;live.x=live.rx=q.x;live.y=live.ry=q.y;model.x=q.x;model.y=q.y;state.freezeRepairs++;return true
  }

  function syncPlayers(){
    const m=match();if(!spyActive()||!m)return false;const t=now();let changed=false;
    for(const model of m.players||[]){
      const id=String(model?.id||""),live=liveFor(id);if(!id||!live)continue;const previous=state.statusById.get(id)||String(live._v141r32Status||"");const current=String(model.status||"");
      const maxHp=Math.max(1,Number(model.maxHp||live.maxHealth||6));model.maxHp=maxHp;live.maxHealth=maxHp;
      if(current==="active"){
        if(previous&&previous!=="active"){
          model.hp=maxHp;live.health=maxHp;live.hpBarMs=Math.max(2600,Number(live.hpBarMs||0));live._v141r32Status="active";
          const q=centre(physicalRoomFor(model.roomId));if(q&&validCell(q.x,q.y)){live.x=live.rx=q.x;live.y=live.ry=q.y;model.x=q.x;model.y=q.y}
          state.respawnRepairs++;changed=true
        }else{
          const hp=clamp(model.hp,0,maxHp);if(Number(live.health)!==hp){live.health=hp;state.healthRepairs++;changed=true}
        }
        repairPosition(model,live);
        const effects=model.effects||{};for(const key of Object.keys(effects))if(Number(effects[key]||0)>0&&Number(effects[key])<=t)delete effects[key]
      }else if(current==="ghost"||current==="knocked-out"){
        live.health=Math.max(0,Number(model.hp||0));live._v141r32Status=current
      }
      state.statusById.set(id,current)
    }
    return changed
  }

  function repairStaleControl(){
    if(!spyActive())return false;const api=overhaul(),model=localModel();if(!api||!model)return false;let changed=false;
    const q=api.state?.search,t=nowPerf();
    if(q&&t-Number(q.completesAt||q.startedAt||t)>SEARCH_STALE_MS){api.state.search=null;state.searchRepairs++;changed=true;try{window.CCGLostSizzlerV141UiSpyPerformance?.cancelSearchFeedback?.()}catch(_){} }
    if(model.status==="active"&&!api.state?.inventoryOpen){
      try{if(typeof mode!=="undefined"&&mode!=="playing"){mode="playing";changed=true}}catch(_){}
      try{if(!UI?.inventory?.classList?.contains?.("hidden")){UI.inventory.classList.add("hidden");changed=true}}catch(_){}
      if(changed){state.freezeRepairs++;forcePlaying(true)}
    }
    return changed
  }

  function repairDoors(){
    if(!spyActive())return false;const t=nowPerf();let changed=false;
    for(const door of host?.doors||[]){
      if(!door?.spyR32Door)continue;const id=String(door.id||`${door.x},${door.y}`),previous=state.doorById.get(id);
      if(door.opening){
        const start=Number(door.openingStart),end=Number(door.openAt),duration=end-start;
        if(!Number.isFinite(start)||!Number.isFinite(end)||duration<DOOR_MS-40){door.openingStart=Number.isFinite(start)&&start>0?start:t;door.openAt=door.openingStart+DOOR_MS;door.open=false;door._v141r36DoorRepair=true;state.doorRepairs++;changed=true}
        if(t>=Number(door.openAt||0)){door.open=true;door.opening=false;door.openSoundDone=true;door._v141r36DoorRepair=false;changed=true}
      }else if(previous&&previous.open===false&&door.open===true&&!previous.opening&&!door._v141r36AnimatedOpen){
        door.open=false;door.opening=true;door.openingStart=t;door.openAt=t+DOOR_MS;door.openSoundDone=false;door._v141r36DoorRepair=true;door._v141r36AnimatedOpen=true;state.doorRepairs++;changed=true;try{S?.sfx?.("open")}catch(_){}
      }
      state.doorById.set(id,{open:Boolean(door.open),opening:Boolean(door.opening)})
    }
    return changed
  }

  function swingFx(){
    if(!spyActive()||overhaul()?.state?.inventoryOpen)return false;const model=localModel(),player=liveFor(actorId());if(!model||model.status!=="active"||!player)return false;
    const dir=player.dir&&typeof player.dir==="object"?{x:Math.sign(Number(player.dir.x)||0),y:Math.sign(Number(player.dir.y)||0)}:{x:1,y:0};if(!dir.x&&!dir.y)dir.x=1;
    const t=nowPerf(),colour="#ffd85a";player._meleeSwingAt=t;player._meleeSwingMs=300;player._meleeSwingDir={...dir};player._meleeSwingColour=colour;state.swings++;
    try{S?.sfx?.("dash")}catch(_){}
    try{typeof ring==="function"&&ring(Number(player.x)+dir.x,Number(player.y)+dir.y,colour,24)}catch(_){}
    try{if(Array.isArray(particles)&&C?.tile)for(let i=0;i<7;i++)particles.push({x:(Number(player.x)+.5+dir.x*.65)*C.tile,y:(Number(player.y)+.5+dir.y*.65)*C.tile,vx:(Math.random()-.5)*3.5,vy:(Math.random()-.5)*3.5,life:130+Math.random()*120,col:colour,size:1.5+Math.random()*2,drag:.93})}catch(_){}
    try{if(playMode==="online"&&net?.connected)Promise.resolve(net.send("v141_melee_fx",{actorId:actorId(),x:Number(player.x),y:Number(player.y),dir:{...dir},colour,swingMs:300,sentAt:Date.now()})).catch(()=>{})}catch(_){}
    return true
  }

  function onKeyDown(event){
    if(!spyActive()||editable(event?.target))return;const code=String(event?.code||"");
    if(code==="Space"&&!event.repeat)swingFx();
    if(code==="Escape"&&overhaul()?.state?.inventoryOpen){event.preventDefault?.();event.stopPropagation?.();closeInventory()}
  }

  function rememberEvent(key){
    if(!key||state.seenEvents.has(key))return false;state.seenEvents.add(key);state.seenEventOrder.push(key);while(state.seenEventOrder.length>EVENT_MEMORY){const oldest=state.seenEventOrder.shift();state.seenEvents.delete(oldest)}return true
  }

  function setTrapOverlay(victimId,trapId,duration=3600){
    const owner=finalOwner(),map=owner?.state?.lastTrapByVictim;if(!map?.set||!victimId||!trapId)return false;map.set(String(victimId),{trapId:String(trapId),until:now()+duration});return true
  }

  function processTrapEvents(){
    if(!spyActive())return false;const m=match();if(!m)return false;let changed=false;
    for(const event of m.events||[]){
      const type=String(event?.type||"");if(!["trap-armed","trap-triggered","trap-disarmed","ghost-respawn","respawn"].includes(type))continue;
      const key=[type,event?.at,event?.trapId,event?.trapType,event?.playerId,event?.victimId].join("|");if(!rememberEvent(key))continue;
      if(type==="trap-armed"){
        state.trapArmedEvents++;changed=true;
        if(String(event.playerId||"")===actorId())try{S?.sfx?.("key")}catch(_){}
      }else if(type==="trap-triggered"){
        const victimId=String(event.victimId||event.playerId||""),trapId=String(event.trapType||"");const victim=modelFor(victimId),live=liveFor(victimId);
        state.trapEvents++;changed=true;setTrapOverlay(victimId,trapId,trapId==="spring"?4200:trapId==="custard"?3600:3000);
        if(victim){victim.effects=victim.effects||{};const t=now();if(trapId==="spring")victim.effects.slow=Math.max(Number(victim.effects.slow||0),t+3500);if(trapId==="custard"){victim.effects.slow=Math.max(Number(victim.effects.slow||0),t+2800);victim.effects["obscure-reveal"]=Math.max(Number(victim.effects["obscure-reveal"]||0),t+2800)}}
        if(live&&victim){live.maxHealth=Math.max(1,Number(victim.maxHp||live.maxHealth||6));live.health=Math.max(0,Number(victim.hp||0));live.hpBarMs=Math.max(2600,Number(live.hpBarMs||0))}
        if(victimId===actorId())try{S?.sfx?.("hurt")}catch(_){}
      }else if(type==="ghost-respawn"||type==="respawn"){
        const model=modelFor(event.playerId),live=liveFor(event.playerId);if(model&&live){const max=Math.max(1,Number(model.maxHp||6));model.hp=max;live.maxHealth=max;live.health=max;live.hpBarMs=Math.max(2600,Number(live.hpBarMs||0));state.healthRepairs++;changed=true}
      }else changed=true
    }
    return changed
  }

  function physicalLogicalRoom(live){
    if(!live)return null;const x=Number(live.x),y=Number(live.y);if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    const physical=(world?.rooms||[]).find(room=>x>=Number(room.x)&&x<=Number(room.x)+Number(room.w)&&y>=Number(room.y)&&y<=Number(room.y)+Number(room.h));if(!physical)return null;
    return match()?.map?.rooms?.find?.(room=>Number(room.dungeonRoomId)===Number(physical.id))||null
  }

  function reconcileRemoteTraps(){
    if(!spyActive()||!authoritative())return false;const m=match(),api=overhaul();if(!m||!api?.triggerTrapForPlayer)return false;let changed=false;
    for(const model of m.players||[]){
      if(model?.status!=="active")continue;const live=liveFor(model.id);if(!live)continue;const id=String(model.id),logical=physicalLogicalRoom(live),previous=state.roomById.get(id)||String(model.roomId||"");
      if(logical?.id&&String(logical.id)!==String(model.roomId||""))model.roomId=logical.id;
      const current=String(logical?.id||model.roomId||"");
      if(previous&&current&&previous!==current){
        const edge=m.map?.edges?.find?.(row=>(String(row.a)===previous&&String(row.b)===current)||(String(row.b)===previous&&String(row.a)===current));if(edge){api.triggerTrapForPlayer(model,{type:"door",id:edge.id});state.remoteTrapChecks++;changed=true}
      }
      state.roomById.set(id,current);
      for(const trap of m.traps||[]){
        if(!trap?.armed||String(trap.ownerId||"")===id)continue;
        if(trap.targetType==="floor"&&String(trap.roomId)===current&&Math.round(Number(trap.x))===Math.round(Number(live.x))&&Math.round(Number(trap.y))===Math.round(Number(live.y))){api.triggerTrapForPlayer(model,{type:"floor",id:trap.targetId});state.remoteTrapChecks++;changed=true;break}
        if(trap.targetType==="door"){
          const door=(host?.doors||[]).find(row=>String(row?.id||"")===String(trap.targetId||""));if(!door)continue;
          if(Math.round(Number(door.x))!==Math.round(Number(live.x))||Math.round(Number(door.y))!==Math.round(Number(live.y)))continue;
          const restore=model.roomId;model.roomId=trap.roomId;api.triggerTrapForPlayer(model,{type:"door",id:trap.targetId});model.roomId=current||restore;state.remoteTrapChecks++;changed=true;break
        }
      }
    }
    return changed
  }

  function ensurePanelWidgets(){
    const root=document.getElementById("spy-classic-trapulators");if(!root)return false;let changed=false;
    for(const slot of [1,2]){
      const panel=root.querySelector(`.spy-classic-trapulator[data-slot="${slot}"]`);if(!panel)continue;
      if(!panel.querySelector(".spy-r36-searchline")){const node=document.createElement("div");node.className="spy-r36-searchline";node.innerHTML='<span>SEARCH READY</span><i></i>';panel.querySelector(".spy-classic-head")?.insertAdjacentElement("afterend",node);changed=true}
      if(!panel.querySelector(".spy-r36-armedline")){const node=document.createElement("div");node.className="spy-r36-armedline";node.textContent="ARMED TRAPS · NONE";panel.querySelector(".spy-classic-loadout")?.insertAdjacentElement("afterend",node);changed=true}
    }
    return changed
  }

  function updatePanelWidgets(){
    if(!spyActive())return false;ensurePanelWidgets();const m=match(),local=localModel(),q=overhaul()?.state?.search,t=nowPerf();
    for(const slot of [1,2]){
      const model=m?.players?.find?.(row=>Number(row?.slot)===slot)||m?.players?.[slot-1],panel=document.querySelector(`.spy-classic-trapulator[data-slot="${slot}"]`);if(!model||!panel)continue;
      const search=panel.querySelector(".spy-r36-searchline"),armed=panel.querySelector(".spy-r36-armedline"),isLocal=String(model.id)===String(local?.id);
      if(search){
        let text="SEARCH READY",progress=0;
        if(isLocal&&q){progress=clamp((t-Number(q.startedAt||t))/Math.max(1,Number(q.completesAt||t)-Number(q.startedAt||t)),0,1);text=`SEARCHING ${String(q.targetLabel||"FURNITURE").toUpperCase()} · ${Math.round(progress*100)}%`}
        else if(model.status!=="active")text=model.status==="ghost"?"GHOST · SEARCH DISABLED":"SEARCH DISABLED";
        search.querySelector("span").textContent=text;search.style.setProperty("--spy-search",`${Math.round(progress*100)}%`)
      }
      if(armed){const rows=(m.traps||[]).filter(trap=>trap?.armed&&String(trap.ownerId)===String(model.id));armed.textContent=rows.length?`ARMED TRAPS · ${rows.map(trap=>trapName(trap.trapId)).join(" · ")}`:"ARMED TRAPS · NONE"}
      const cards=[...panel.querySelectorAll(".spy-classic-trap")];cards.forEach((card,index)=>{const trapId=m.trapLoadout?.[index],count=(m.traps||[]).filter(trap=>trap?.armed&&String(trap.ownerId)===String(model.id)&&String(trap.trapId)===String(trapId)).length;let badge=card.querySelector(".spy-r36-armed-badge");if(count&&!badge){badge=document.createElement("span");badge.className="spy-r36-armed-badge";card.querySelector("strong")?.appendChild(badge)}if(badge){badge.textContent=count?`ARMED ×${count}`:"";badge.style.display=count?"inline-block":"none"}})
    }
    return true
  }

  function ensureRail(){
    installStyles();const area=document.querySelector(".ccg-game>.game-area");if(!area)return null;let rail=document.getElementById("spy-r36-desktop-rail");
    if(!rail){rail=document.createElement("aside");rail.id="spy-r36-desktop-rail";rail.setAttribute("aria-label","Spy command status");rail.innerHTML='<h3>SPY COMMAND</h3><div class="spy-r36-actions"><button type="button" data-r36-items>OPEN ITEM INVENTORY</button><button type="button" data-r36-trap="0">1 · SELECT BOMB</button><button type="button" data-r36-trap="1">2 · SELECT SPRING</button><button type="button" data-r36-trap="2">3 · SELECT WATER BUCKET</button></div><div class="spy-r36-content"></div>';area.appendChild(rail);rail.addEventListener("click",event=>{const items=event.target?.closest?.("[data-r36-items]");if(items){overhaul()?.setInventory?.(true);overhaul()?.renderInventory?.();return}const trap=event.target?.closest?.("[data-r36-trap]");if(trap)overhaul()?.selectTrap?.(Number(trap.dataset.r36Trap)||0)});state.railMounted=true}
    return rail
  }

  function layoutRail(){
    const rail=ensureRail(),area=document.querySelector(".ccg-game>.game-area"),canvas=document.getElementById("game");if(!rail||!area||!canvas||!spyActive()){if(rail)rail.style.display="none";return false}
    const a=area.getBoundingClientRect(),c=canvas.getBoundingClientRect(),gap=a.right-c.right;
    if(innerWidth<1200||gap<210||c.height<420){rail.style.display="none";return false}
    rail.style.display="block";rail.style.left=`${Math.max(0,c.right-a.left+6)}px`;rail.style.top=`${Math.max(0,c.top-a.top)}px`;rail.style.width=`${Math.max(200,gap-8)}px`;rail.style.height=`${Math.max(200,Math.min(c.height,a.height-(c.top-a.top)))}px`;state.railLayouts++;return true
  }

  function updateRail(){
    const rail=ensureRail();if(!rail||!spyActive())return false;layoutRail();if(rail.style.display==="none")return false;
    const m=match(),me=localModel(),other=m?.players?.find?.(row=>row!==me),q=overhaul()?.state?.search,t=nowPerf(),max=Math.max(1,Number(me?.maxHp||6)),hp=clamp(me?.hp,0,max),armed=(m?.traps||[]).filter(trap=>trap?.armed&&String(trap.ownerId)===String(me?.id));
    const progress=q?clamp((t-Number(q.startedAt||t))/Math.max(1,Number(q.completesAt||t)-Number(q.startedAt||t)),0,1):0,search=q?`SEARCHING ${String(q.targetLabel||"FURNITURE").toUpperCase()} · ${Math.round(progress*100)}%`:"READY — E BESIDE FURNITURE";
    const signature=[m?.round,me?.status,hp,max,me?.roomId,other?.status,other?.hp,search,armed.map(row=>`${row.trapId}:${row.roomId}:${row.targetType}`).join("|")].join("~");
    if(signature===state.lastRailSignature)return true;state.lastRailSignature=signature;
    const content=rail.querySelector(".spy-r36-content"),selected=Number(overhaul()?.state?.selectedTrapIndex||0);rail.querySelectorAll("[data-r36-trap]").forEach(button=>button.dataset.selected=String(Number(button.dataset.r36Trap)===selected));
    const room=roomFor(me?.roomId),remaining=(room?.furniture||[]).filter(item=>!item.searched).length,effects=Object.entries(me?.effects||{}).filter(([,until])=>Number(until)>now()).map(([name,until])=>`${name.toUpperCase()} ${Math.ceil((Number(until)-now())/1000)}s`).join(" · ")||"NONE";
    const trapRows=armed.length?armed.map(row=>`<div class="spy-r36-trap-row"><span>${trapName(row.trapId)}</span><span>${String(row.targetType||"").toUpperCase()} · ${String(row.roomId||"")}</span></div>`).join(""):"<small>NO ARMED TRAPS</small>";
    content.innerHTML=`<div class="spy-r36-card"><b>YOUR AGENT</b><strong>${String(me?.name||"PLAYER").toUpperCase()} · ${String(me?.status||"WAITING").toUpperCase()}</strong><div class="spy-r36-health"><i style="width:${Math.round(hp/max*100)}%"></i></div><span>HP ${hp}/${max} · ${String(room?.spyArchetype||me?.roomId||"ROOM").toUpperCase()}</span><small>${remaining} searchable · effects: ${effects}</small></div><div class="spy-r36-card"><b>SEARCH STATUS</b><strong>${search}</strong><div class="spy-r36-health"><i style="width:${Math.round(progress*100)}%"></i></div><small>TAB opens items · RETURN TO GAME or TAB closes them.</small></div><div class="spy-r36-card"><b>ARMED TRAPS</b><div class="spy-r36-trap-list">${trapRows}</div><small>A set trap stays listed until it is sprung or disarmed.</small></div><div class="spy-r36-card"><b>OPPONENT</b><strong>${String(other?.name||"PLAYER 2").toUpperCase()} · ${String(other?.status||"WAITING").toUpperCase()}</strong><span>HP ${Math.max(0,Number(other?.hp||0))}/${Math.max(1,Number(other?.maxHp||6))}</span><small>Opponent location remains private unless Spy rules reveal it.</small></div>`;
    return true
  }

  function updateUi(force=false){const t=nowPerf();if(!force&&t-state.lastUiAt<UI_MS)return false;state.lastUiAt=t;ensureInventoryExit();updatePanelWidgets();updateRail();return true}

  function resetOutsideSpy(){
    const rail=document.getElementById("spy-r36-desktop-rail");if(rail)rail.style.display="none";state.lastRailSignature="";state.statusById.clear();state.doorById.clear();state.roomById.clear();return false
  }

  function tick(){
    if(!spyActive())return resetOutsideSpy();
    ensureInventoryExit();repairStaleControl();syncPlayers();repairDoors();reconcileRemoteTraps();processTrapEvents();updateUi(false);state.installed=true;document.body.dataset.spyR36Perfection="true";return true
  }

  addEventListener("keydown",onKeyDown,true);addEventListener("resize",()=>{if(spyActive())layoutRail()},{passive:true});
  tick();state.timer=setInterval(()=>{try{tick()}catch(error){console.warn("[Lost Sizzler r36] Spy perfection pass failed safely",error)}},TICK_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0;removeEventListener("keydown",onKeyDown,true)},{once:true});

  window.CCGLostSizzlerV141R36SpyPerfection={
    closeInventory,ensureInventoryExit,syncPlayers,repairStaleControl,repairDoors,swingFx,processTrapEvents,reconcileRemoteTraps,ensurePanelWidgets,updatePanelWidgets,layoutRail,updateRail,tick,
    constants:{TICK_MS,UI_MS,DOOR_MS,SEARCH_STALE_MS},get state(){return state}
  };
})();
