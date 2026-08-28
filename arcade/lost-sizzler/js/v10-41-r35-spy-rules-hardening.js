/* The Lost Sizzler V10.41 r35 — Spy rules/control/render hardening.
 *
 * Loaded after the r32 overhaul but before the r33 final packet owner so Spy
 * has one early keyboard owner. This layer is Spy-only and leaves Solo,
 * Dungeon Multiplayer and Horde untouched.
 *
 * Owns:
 * - TAB = Spy inventory, F = fullscreen (never Field Kit)
 * - no Dungeon shrines or wall switches in Spy
 * - searchable trap-charge pickups
 * - 0 HP => 10 second ghost, random-room respawn, carried kit captured by rival
 * - captured weapon/counter stash inside the Spy inventory
 * - a lightweight last-good-frame watchdog for the sudden black-canvas failure
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R35_SPY_RULES_HARDENING__)return;
  window.__CCG_LOST_SIZZLER_V141_R35_SPY_RULES_HARDENING__=true;

  const MODE_ID="sizzler-saboteurs",TICK_MS=40,GHOST_MS=10000,TRAP_PICKUPS=4,PROBE_MS=160,BACKUP_MS=500;
  const state={
    timer:0,keyOwnerInstalled:false,legacyAdopted:false,legacyWasSpy:false,rulesPatched:false,rulesPatchCount:0,
    trapSeedKey:"",trapPickupsSeeded:0,trapPickupsFound:0,objectsPurged:0,knockoutsProcessed:0,ghostRespawns:0,lootTransfers:0,
    inventorySnapshots:new Map(),seenEvents:new Set(),seenEventOrder:[],lastControlSignature:"",
    renderSource:null,renderGuard:null,renderGuardCalls:0,lastRenderCallAt:0,lastProbeAt:0,lastBackupAt:0,blackProbeStreak:0,blackRecoveries:0,renderErrors:0,
    quarantinedRenderSource:null,blackSourceQuarantines:0,
    backupCanvas:null,backupCtx:null,probeCanvas:null,probeCtx:null,lastGoodReady:false,renderRecoveryQueued:false
  };

  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID}catch(_){return false}};
  const active=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const match=()=>active()?.state||null;
  const authoritative=()=>Boolean(active()?.authoritative);
  const overhaul=()=>{try{return window.CCGLostSizzlerV141R32SpyOverhaul||null}catch(_){return null}};
  const finalOwner=()=>{try{return window.CCGLostSizzlerV141R32SpyPacketOwner||null}catch(_){return null}};
  const legacyIsolation=()=>{try{return window.CCGLostSizzlerV141R27SpyIsolation||null}catch(_){return null}};
  const actorId=()=>{try{return String(net?.sessionId||p1?.id||"P1")}catch(_){return"P1"}};
  const modelFor=id=>match()?.players?.find?.(row=>String(row?.id||"")===String(id||""))||null;
  const copy=value=>{try{return value==null?value:structuredClone(value)}catch(_){try{return JSON.parse(JSON.stringify(value))}catch(__){return value}}};
  const hash=value=>{try{return Number(window.CCGLostSizzlerSaboteurs?.hash32?.(value))>>>0}catch(_){let h=2166136261>>>0;for(const c of String(value||"")){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}};
  const editable=target=>{try{return Boolean(target?.closest?.("input,textarea,select,[contenteditable='true'],[contenteditable='']"))}catch(_){return false}};
  const now=()=>Date.now();

  function forceSharedPlaying(focus=true){
    if(!spyActive())return false;
    try{if(typeof mode!=="undefined"&&(mode==="inventory"||mode==="paused"||mode==="dossier"))mode="playing"}catch(_){}
    try{UI?.inventory?.classList?.add?.("hidden");UI?.pause?.classList?.add?.("hidden")}catch(_){}
    if(focus&&!overhaul()?.state?.inventoryOpen)requestAnimationFrame(()=>{try{document.getElementById("game")?.focus?.({preventScroll:true})}catch(_){}});
    return true
  }

  function toggleSpyInventory(){
    const api=overhaul();if(!api?.setInventory)return false;
    const open=!Boolean(api.state?.inventoryOpen);forceSharedPlaying(false);api.setInventory(open);forceSharedPlaying(!open);renderCapturedInventory();return open
  }

  function keyOwner(event){
    if(!spyActive()||editable(event?.target))return;const code=String(event?.code||"");
    if(code==="Tab"){event.preventDefault?.();event.stopImmediatePropagation?.();if(!event.repeat)toggleSpyInventory();return}
    if(code==="KeyF"){event.preventDefault?.();event.stopImmediatePropagation?.();if(!event.repeat)try{typeof toggleFullscreen==="function"&&toggleFullscreen()}catch(error){console.warn("[Lost Sizzler r35] fullscreen toggle failed safely",error)}return}
    if(code==="Escape"&&overhaul()?.state?.inventoryOpen){event.preventDefault?.();event.stopImmediatePropagation?.();overhaul()?.setInventory?.(false);forceSharedPlaying(true)}
  }

  function installKeyOwner(){
    if(state.keyOwnerInstalled)return true;const legacy=legacyIsolation();
    if(legacy?.onSpyKeyDown)try{removeEventListener("keydown",legacy.onSpyKeyDown,true)}catch(_){}
    addEventListener("keydown",keyOwner,true);state.keyOwnerInstalled=true;return true
  }

  function adoptLegacyIsolation(){
    const legacy=legacyIsolation();if(!legacy)return false;
    if(!state.legacyAdopted){
      try{removeEventListener("keydown",legacy.onSpyKeyDown,true)}catch(_){}
      try{if(legacy.state?.timer){clearInterval(legacy.state.timer);legacy.state.timer=0}}catch(_){}
      state.legacyAdopted=true
    }
    if(spyActive()){
      try{legacy.installMoveGuard?.();legacy.installFurnitureGuard?.();legacy.protectSpyWorld?.();legacy.renderSpyUi?.()}catch(_){}
      state.legacyWasSpy=true;normaliseControlHints();return true
    }
    if(state.legacyWasSpy){state.legacyWasSpy=false;try{legacy.restoreUi?.()}catch(_){}}
    return false
  }

  function normaliseControlHints(){
    if(!spyActive())return false;
    const dock=document.querySelector(".shortcut-dock .command-grid"),desired='<span><kbd>WASD</kbd><b>MOVE</b></span><span><kbd>SPACE</kbd><b>ATTACK</b></span><span><kbd>E</kbd><b>SEARCH</b></span><span><kbd>T</kbd><b>ARM TRAP</b></span><span><kbd>X</kbd><b>EXTRACT</b></span><span><kbd>C</kbd><b>CLOSE DOOR</b></span><span><kbd>SHIFT</kbd><b>DASH</b></span><span><kbd>TAB</kbd><b>INVENTORY</b></span><span><kbd>F</kbd><b>FULLSCREEN</b></span>';
    if(dock&&dock.innerHTML!==desired)dock.innerHTML=desired;
    const card=document.querySelector(".critical-card.inventory-card");if(card){const k=card.querySelector("kbd"),b=card.querySelector("b"),strong=card.querySelector("strong"),span=card.querySelector("span");if(k)k.textContent="TAB";if(b)b.textContent="INVENTORY";if(strong)strong.textContent="SPY ITEMS & TRAPS";if(span)span.textContent="OPEN / CLOSE"}
    const hint=document.getElementById("fullscreen-hint");if(hint)hint.innerHTML='<b>SPY VS SPY CONTROLS</b> — <kbd>E</kbd> SEARCH · <kbd>TAB</kbd> INVENTORY · <kbd>F</kbd> FULLSCREEN';
    const inventory=document.querySelector("#spy-r32-inventory .spy-r32-sub");if(inventory)inventory.textContent="TAB closes · 1/2/3 selects a trap · T places the selected trap";
    state.lastControlSignature="TAB-INVENTORY|F-FULLSCREEN";return true
  }

  function dungeonOnlyObject(row){
    if(!row)return false;const text=[row.kind,row.type,row.id,row.name,row.label,row.interaction].map(v=>String(v||"").toLowerCase()).join(" ");
    return text.includes("shrine")||text.includes("wall-switch")||text.includes("wall switch")||text.includes("wallswitch")||/(^|[^a-z])switch([^a-z]|$)/.test(text)
  }

  function purgeDungeonOnlyObjects(){
    if(!spyActive())return 0;let removed=0;
    try{if(Array.isArray(host?.shrines)){removed+=host.shrines.length;host.shrines.length=0}}catch(_){}
    try{if(Array.isArray(host?.switches)){removed+=host.switches.length;host.switches.length=0}}catch(_){}
    try{if(Array.isArray(host?.doors)){const keep=host.doors.filter(row=>row?.spyR32Door||row?.spyDoor||!dungeonOnlyObject(row));removed+=host.doors.length-keep.length;if(keep.length!==host.doors.length)host.doors.splice(0,host.doors.length,...keep)}}catch(_){}
    try{if(Array.isArray(host?.blockingDecor)){const keep=host.blockingDecor.filter(row=>row?.spyR32Furniture||row?.spyFurniture||!dungeonOnlyObject(row));removed+=host.blockingDecor.length-keep.length;if(keep.length!==host.blockingDecor.length)host.blockingDecor.splice(0,host.blockingDecor.length,...keep)}}catch(_){}
    try{if(Array.isArray(world?.decor)){const keep=world.decor.filter(row=>row?.spyR32Furniture||row?.spyFurniture||!dungeonOnlyObject(row));removed+=world.decor.length-keep.length;if(keep.length!==world.decor.length)world.decor.splice(0,world.decor.length,...keep)}}catch(_){}
    if(removed){state.objectsPurged+=removed;try{host.revision++}catch(_){}}return removed
  }

  function seedTrapPickups(){
    const m=match();if(!spyActive()||!authoritative()||!m?.map?.rooms?.length)return false;
    const key=`${m.seed}|${m.round}|R35-TRAP-PICKUPS`;if(state.trapSeedKey===key)return true;const candidates=[];
    for(const room of m.map.rooms||[])for(const item of room.furniture||[]){if(item?.searched||item?.spyR35TrapPickup)continue;const content=String(item?.contents||"");if(content&&content!=="empty")continue;candidates.push({item,score:hash(`${key}|${room.id}|${item.id}`)})}
    candidates.sort((a,b)=>a.score-b.score);const count=Math.min(TRAP_PICKUPS,candidates.length);for(let i=0;i<count;i++){candidates[i].item.contents="trapCharge:1";candidates[i].item.spyR35TrapPickup=true}
    state.trapSeedKey=key;state.trapPickupsSeeded=count;return true
  }

  function patchSaboteurRules(){
    const base=window.CCGLostSizzlerSaboteurs;if(!base||base.__ccgV141R35Rules)return Boolean(base);if(typeof base.searchFurniture!=="function")return false;
    const baseSearch=base.searchFurniture,counters=Object.freeze({...base.COUNTERS,trapCharge:Object.freeze({id:"trapCharge",name:"Trap Charge"})});
    const searchFurniture=function searchFurnitureR35(matchState,playerId,furnitureId,at){
      const player=matchState?.players?.find?.(row=>String(row?.id||"")===String(playerId||"")),room=matchState?.map?.rooms?.find?.(row=>String(row?.id||"")===String(player?.roomId||"")),item=room?.furniture?.find?.(row=>String(row?.id||"")===String(furnitureId||"")),content=String(item?.contents||"");
      if(!player||player.status!=="active"||!item||!content.startsWith("trapCharge:"))return baseSearch.apply(this,arguments);
      const armed=matchState?.traps?.some?.(row=>row?.armed&&String(row?.roomId||"")===String(player.roomId||"")&&row?.targetType==="furniture"&&String(row?.targetId||"")===String(furnitureId||""));if(armed)return baseSearch.apply(this,arguments);if(item.searched)return{empty:true};
      const amount=Math.max(1,Math.min(3,Number(content.split(":")[1])||1));item.searched=true;item.contents=null;player.searches=Number(player.searches||0)+1;player.trapCharges=Math.max(0,Number(player.trapCharges||0))+amount;
      matchState.events?.push?.({type:"trap-charge-found",playerId:String(playerId||""),amount,roomId:player.roomId,furnitureId:String(furnitureId||""),at:Number(at)||Date.now()});return{counter:"trapCharge",trapCharge:amount}
    };
    window.CCGLostSizzlerSaboteurs=Object.freeze({...base,COUNTERS:counters,searchFurniture,__ccgV141R35Rules:true});state.rulesPatched=true;state.rulesPatchCount++;return true
  }

  function snapshotPlayer(player){if(!player)return null;return{hasCase:Boolean(player.hasCase),objectives:[...(player.objectives||[])],looseItem:player.looseItem||null,weapon:copy(player.weapon||null),counter:player.counter||null,trapCharges:Math.max(0,Number(player.trapCharges||0)),roomId:String(player.roomId||"")}}
  function rememberInventorySnapshots(){for(const player of match()?.players||[])if(player?.status==="active")state.inventorySnapshots.set(String(player.id||""),snapshotPlayer(player))}
  function rememberEvent(key){if(!key||state.seenEvents.has(key))return false;state.seenEvents.add(key);state.seenEventOrder.push(key);while(state.seenEventOrder.length>240){const oldest=state.seenEventOrder.shift();state.seenEvents.delete(oldest)}return true}
  function addCapturedWeapon(player,weapon){if(!player||!weapon)return false;if(!player.weapon){player.weapon=copy(weapon);return true}player.spyCapturedWeapons=Array.isArray(player.spyCapturedWeapons)?player.spyCapturedWeapons:[];player.spyCapturedWeapons.push(copy(weapon));return true}
  function addCapturedCounter(player,counter){if(!player||!counter)return false;if(!player.counter){player.counter=counter;return true}if(player.counter===counter)return true;player.spyCapturedCounters=Array.isArray(player.spyCapturedCounters)?player.spyCapturedCounters:[];if(!player.spyCapturedCounters.includes(counter))player.spyCapturedCounters.push(counter);return true}

  function transferKnockoutLoot(event){
    const m=match(),victim=modelFor(event?.playerId),attacker=modelFor(event?.attackerId),snap=state.inventorySnapshots.get(String(event?.playerId||""));if(!m||!victim||!snap)return false;
    if(attacker&&attacker.id!==victim.id){if(snap.hasCase)attacker.hasCase=true;const captured=[...snap.objectives];if(snap.looseItem)captured.push(snap.looseItem);attacker.objectives=Array.from(new Set([...(attacker.objectives||[]),...captured].filter(Boolean)));addCapturedWeapon(attacker,snap.weapon);addCapturedCounter(attacker,snap.counter);attacker.trapCharges=Math.max(0,Number(attacker.trapCharges||0))+snap.trapCharges;state.lootTransfers++}
    const stamp=String(Number(event?.at)||"");if(Array.isArray(m.looseObjects)&&stamp)m.looseObjects=m.looseObjects.filter(item=>!(String(item?.id||"").includes(`-${stamp}-`)&&String(item?.roomId||"")===String(snap.roomId||"")));
    victim.hasCase=false;victim.objectives=[];victim.looseItem=null;victim.weapon=null;victim.counter=null;victim.trapCharges=0;const ghostUntil=(Number(event?.at)||now())+GHOST_MS;victim.status="ghost";victim.hp=0;victim.ghostUntil=ghostUntil;victim.respawnAt=ghostUntil;
    m.events?.push?.({type:"ghost-start",playerId:victim.id,attackerId:event?.attackerId||null,until:ghostUntil,at:Number(event?.at)||now()});return true
  }

  function announce(text,tone="cyan",duration=2600){
    const node=document.getElementById("spy-r32-objective-toast");if(node){node.textContent=text;node.dataset.visible="true";node.style.borderColor=tone==="red"?"#ff6868":tone==="gold"?"#ffd85a":"#6cecff";clearTimeout(node.__r35Timer);node.__r35Timer=setTimeout(()=>{node.dataset.visible="false"},duration)}
    try{if(typeof showToast==="function")showToast(text.includes("·")?text.split("·")[0].trim():"SPY REPORT",text,tone,duration)}catch(_){}
  }

  function processEvents(){
    const m=match();if(!spyActive()||!m)return false;let changed=false;
    for(const event of m.events||[]){const key=`${event?.type}|${event?.at}|${event?.playerId||event?.victimId||""}|${event?.attackerId||event?.ownerId||""}`;if(!rememberEvent(key))continue;
      if(event?.type==="knockout"){transferKnockoutLoot(event);state.knockoutsProcessed++;changed=true;if(String(event.playerId||"")===actorId())announce("KNOCKED OUT · GHOST FOR 10 SECONDS","red",3200);else if(String(event.attackerId||"")===actorId())announce("OPPONENT KNOCKED OUT · THEIR ITEMS ARE NOW YOURS","gold",3200)}
      else if(event?.type==="trap-charge-found"){state.trapPickupsFound+=Math.max(1,Number(event.amount)||1);changed=true;if(String(event.playerId||"")===actorId())announce(`TRAP CHARGE FOUND · +${Math.max(1,Number(event.amount)||1)}`,"cyan",2500)}
    }return changed
  }

  function randomRespawnRoom(m,player,at){const rooms=(m?.map?.rooms||[]).filter(room=>!room?.spawn&&!room?.extraction),pool=rooms.length?rooms:(m?.map?.rooms||[]);if(!pool.length)return null;return pool[hash(`${m.seed}|${m.round}|${player.id}|${at}|R35-GHOST-RESPAWN`)%pool.length]}
  function respawnGhosts(){
    if(!spyActive()||!authoritative())return false;const m=match(),t=now();let changed=false;
    for(const player of m?.players||[]){if(player?.status!=="ghost"||t<Number(player.ghostUntil||player.respawnAt||Infinity))continue;const room=randomRespawnRoom(m,player,t);if(!room)continue;player.status="active";player.hp=Math.max(1,Number(player.maxHp||6));player.roomId=room.id;player.respawnAt=0;player.ghostUntil=0;player.invulnerableUntil=t+1800;player.roomEnteredAt=t;m.events?.push?.({type:"ghost-respawn",playerId:player.id,roomId:room.id,at:t});state.ghostRespawns++;changed=true;if(String(player.id||"")===actorId())announce("RESPAWNED · FIND YOUR STOLEN KIT","cyan",2600)}return changed
  }

  function ensureGhostUi(){
    const wrap=document.querySelector(".canvas-wrap");if(!wrap)return false;for(const slot of [1,2])if(!wrap.querySelector(`.spy-r35-ghost[data-slot="${slot}"]`)){const node=document.createElement("div");node.className="spy-r35-ghost";node.dataset.slot=String(slot);node.dataset.visible="false";node.innerHTML='<b>GHOST</b><span>10.0s</span>';wrap.appendChild(node)}
    if(!document.getElementById("ccg-spy-r35-style")){const style=document.createElement("style");style.id="ccg-spy-r35-style";style.textContent=`.spy-r35-ghost{display:none;position:absolute;left:0;width:77%;height:50%;z-index:131;pointer-events:none;place-items:center;text-align:center;color:rgba(255,255,255,.78);text-shadow:0 2px 7px #000;font:900 12px/1.1 "Courier New",monospace;background:radial-gradient(circle at center,rgba(200,225,255,.07),transparent 35%)}body[data-special-mode="sizzler-saboteurs"] .spy-r35-ghost[data-visible="true"]{display:grid}.spy-r35-ghost[data-slot="1"]{top:0}.spy-r35-ghost[data-slot="2"]{bottom:0}.spy-r35-ghost b{display:block;font-size:18px;letter-spacing:2px;opacity:.74}.spy-r35-ghost span{display:block;margin-top:3px;font-size:10px;color:#bdefff}#spy-r32-inventory .spy-r35-captured{border-color:rgba(255,216,90,.42)}#spy-r32-inventory .spy-r35-captured button{margin-left:8px}`;document.head.appendChild(style)}return true
  }

  function updateGhostUi(){
    ensureGhostUi();const t=now();for(const slot of [1,2]){const model=match()?.players?.find?.(row=>Number(row?.slot)===slot),node=document.querySelector(`.spy-r35-ghost[data-slot="${slot}"]`);if(!node)continue;const ghost=model?.status==="ghost"&&Number(model.ghostUntil||0)>t;node.dataset.visible=String(Boolean(ghost));if(ghost){const remain=Math.max(0,(Number(model.ghostUntil)-t)/1000),span=node.querySelector("span");if(span)span.textContent=`${remain.toFixed(1)}s · ITEMS CAPTURED BY OPPONENT`}const status=document.querySelector(`.spy-classic-trapulator[data-slot="${slot}"] .spy-classic-status`);if(status&&ghost)status.innerHTML=`<b>STATUS</b> · GHOST · ${Math.max(0,(Number(model.ghostUntil)-t)/1000).toFixed(1)}s`}
  }

  function renderCapturedInventory(){
    if(!spyActive())return false;const api=overhaul(),panel=document.getElementById("spy-r32-inventory"),player=modelFor(actorId());if(!panel||!player)return false;const grid=panel.querySelector(".spy-r32-grid");if(!grid)return false;
    let section=grid.querySelector(".spy-r35-captured");if(!section){section=document.createElement("section");section.className="spy-r35-captured";section.innerHTML='<h3>CAPTURED ITEMS</h3><div class="spy-r35-captured-list"></div>';grid.appendChild(section)}
    const list=section.querySelector(".spy-r35-captured-list"),weapons=player.spyCapturedWeapons||[],counters=player.spyCapturedCounters||[],weaponRows=weapons.map((weapon,index)=>`<div class="spy-r32-row"><span>WEAPON · ${String(weapon?.name||weapon?.id||"CAPTURED").toUpperCase()}</span><button type="button" data-r35-equip-weapon="${index}">EQUIP</button></div>`),counterRows=counters.map((counter,index)=>`<div class="spy-r32-row"><span>COUNTER · ${String(window.CCGLostSizzlerSaboteurs?.COUNTERS?.[counter]?.name||counter).toUpperCase()}</span><button type="button" data-r35-equip-counter="${index}">EQUIP</button></div>`);
    if(list)list.innerHTML=[...weaponRows,...counterRows].join("")||'<div class="spy-r32-row"><span>None captured yet</span><b>—</b></div>';
    if(!panel.dataset.r35CaptureClicks){panel.dataset.r35CaptureClicks="true";panel.addEventListener("click",event=>{const weaponButton=event.target?.closest?.("[data-r35-equip-weapon]"),counterButton=event.target?.closest?.("[data-r35-equip-counter]"),me=modelFor(actorId());if(!me)return;if(weaponButton){const index=Number(weaponButton.dataset.r35EquipWeapon),stash=me.spyCapturedWeapons||[],chosen=stash[index];if(!chosen)return;const current=me.weapon;me.weapon=stash.splice(index,1)[0];if(current)stash.push(current);api?.renderInventory?.();renderCapturedInventory()}if(counterButton){const index=Number(counterButton.dataset.r35EquipCounter),stash=me.spyCapturedCounters||[],chosen=stash[index];if(!chosen)return;const current=me.counter;me.counter=stash.splice(index,1)[0];if(current&&!stash.includes(current))stash.push(current);api?.renderInventory?.();renderCapturedInventory()}})}return true
  }

  function normaliseTrapPickupText(){for(const node of [document.getElementById("spy-r32-objective-toast"),document.getElementById("spy-search-label")])if(node?.textContent&&/COUNTER FOUND\s*·?\s*TRAP CHARGE/i.test(node.textContent))node.textContent="TRAP CHARGE FOUND · +1"}

  function ensureRenderCanvases(){
    try{if(!state.probeCanvas){state.probeCanvas=document.createElement("canvas");state.probeCanvas.width=18;state.probeCanvas.height=10;state.probeCtx=state.probeCanvas.getContext("2d",{willReadFrequently:true})}if(!state.backupCanvas){state.backupCanvas=document.createElement("canvas");state.backupCtx=state.backupCanvas.getContext("2d")}if(typeof canvas!=="undefined"&&canvas&&(state.backupCanvas.width!==canvas.width||state.backupCanvas.height!==canvas.height)){state.backupCanvas.width=canvas.width;state.backupCanvas.height=canvas.height;state.lastGoodReady=false}return Boolean(state.probeCtx&&state.backupCtx)}catch(_){return false}
  }
  function canvasLooksBlack(){if(!ensureRenderCanvases()||typeof canvas==="undefined"||!canvas)return false;try{const playW=Math.max(1,Math.floor(canvas.width*.77));state.probeCtx.clearRect(0,0,18,10);state.probeCtx.drawImage(canvas,0,0,playW,canvas.height,0,0,18,10);const data=state.probeCtx.getImageData(0,0,18,10).data;let lit=0;for(let i=0;i<data.length;i+=4)if(data[i]>14||data[i+1]>14||data[i+2]>14){lit++;if(lit>=4)return false}return true}catch(_){return false}}
  function backupGoodFrame(){if(!ensureRenderCanvases()||typeof canvas==="undefined"||!canvas)return false;try{state.backupCtx.clearRect(0,0,state.backupCanvas.width,state.backupCanvas.height);state.backupCtx.drawImage(canvas,0,0);state.lastGoodReady=true;state.lastBackupAt=now();return true}catch(_){return false}}
  function restoreGoodFrame(){if(!state.lastGoodReady||typeof ctx==="undefined"||!ctx||!state.backupCanvas)return false;try{ctx.drawImage(state.backupCanvas,0,0,canvas.width,canvas.height);state.blackRecoveries++;return true}catch(_){return false}}
  function queueRenderRecovery(){if(state.renderRecoveryQueued)return;state.renderRecoveryQueued=true;setTimeout(()=>{state.renderRecoveryQueued=false;if(!spyActive())return;try{forceSharedPlaying(false);overhaul()?.buildOverhaulWorld?.(false);finalOwner()?.adoptR32Maintenance?.();finalOwner()?.composeSpy?.();window.__CCG_LOST_SIZZLER_SCHEDULE_RESIZE__?.()}catch(error){console.warn("[Lost Sizzler r35] Spy render recovery failed safely",error)}},0)}

  function installRenderGuard(force=false){
    if(!spyActive()||!finalOwner())return false;let current=null;try{current=window.render}catch(_){return false}if(typeof current!=="function")return false;if(!force&&current===state.renderGuard)return true;if(!force&&state.renderGuard&&now()-state.lastRenderCallAt<650)return true;if(current?.__ccgV141R35SpyBlackGuard){state.renderGuard=current;return true}state.renderSource=current;
    const wrapped=function renderSpyR35BlackGuard(){
      state.renderGuardCalls++;state.lastRenderCallAt=now();
      if(spyActive()&&state.quarantinedRenderSource===current){if(restoreGoodFrame())queueRenderRecovery();return}
      let result;try{result=current.apply(this,arguments)}catch(error){state.renderErrors++;if(spyActive()&&restoreGoodFrame()){state.quarantinedRenderSource=current;state.blackSourceQuarantines++;queueRenderRecovery();return}queueRenderRecovery();return}
      if(!spyActive())return result;const t=now();if(t-state.lastProbeAt>=PROBE_MS){state.lastProbeAt=t;if(canvasLooksBlack()){state.blackProbeStreak++;if(state.blackProbeStreak>=2&&restoreGoodFrame()){if(state.quarantinedRenderSource!==current){state.quarantinedRenderSource=current;state.blackSourceQuarantines++}queueRenderRecovery()}}else{state.blackProbeStreak=0;if(t-state.lastBackupAt>=BACKUP_MS)backupGoodFrame()}}return result
    };
    wrapped.__ccgV141R35SpyBlackGuard=true;wrapped.__ccgOriginal=current;window.render=wrapped;state.renderGuard=wrapped;state.lastRenderCallAt=now();return true
  }

  function refresh(){installKeyOwner();patchSaboteurRules();adoptLegacyIsolation();if(!spyActive())return false;forceSharedPlaying(false);purgeDungeonOnlyObjects();seedTrapPickups();processEvents();respawnGhosts();rememberInventorySnapshots();updateGhostUi();renderCapturedInventory();normaliseTrapPickupText();normaliseControlHints();if(finalOwner())installRenderGuard(false);return true}

  installKeyOwner();patchSaboteurRules();refresh();state.timer=setInterval(()=>{try{refresh()}catch(error){console.warn("[Lost Sizzler r35] Spy hardening monitor failed safely",error)}},TICK_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0;if(state.keyOwnerInstalled)removeEventListener("keydown",keyOwner,true);try{if(state.legacyWasSpy)legacyIsolation()?.restoreUi?.()}catch(_){}},{once:true});

  window.CCGLostSizzlerV141R35SpyRulesHardening={toggleSpyInventory,installKeyOwner,normaliseControlHints,purgeDungeonOnlyObjects,seedTrapPickups,patchSaboteurRules,processEvents,respawnGhosts,renderCapturedInventory,installRenderGuard,canvasLooksBlack,restoreGoodFrame,refresh,constants:{GHOST_MS,TRAP_PICKUPS},get state(){return state}};
})();