/* The Lost Sizzler V10.38 — live-join Horde, centre spawns and perimeter pressure. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V138_HORDE_LIVE__)return;
  window.__CCG_LOST_SIZZLER_V138_HORDE_LIVE__=true;

  const INSTALL_MS=80;
  const PLAYER_GRACE_MS=3200;
  const SINGLE_PLAYER_QUOTAS=Object.freeze([36,44,52,60,70,80,90,100,112,44]);
  const PLAYER_QUOTA_SCALE=Object.freeze({1:1,2:1.25,3:1.5,4:1.75});
  const ACTIVE_CAP=Object.freeze({1:18,2:24,3:30,4:36});
  const CENTRE_OFFSETS=Object.freeze([
    Object.freeze({x:-1,y:-1}),Object.freeze({x:0,y:-1}),
    Object.freeze({x:-1,y:0}),Object.freeze({x:0,y:0})
  ]);
  const missingSince=new Map();
  const seenPlayers=new Set();
  const state={installed:false,updateWrapped:false,controllerOwnedUpdate:true,renderWrapped:false,membersWrapped:false,packetWrapped:false,toastWrapped:false,localSpawnKey:"",waveKey:"",nextExtraAt:0,timer:0};

  const api=()=>window.CCGLostSizzlerSpecialModes||null;
  const active=()=>api()?.active||null;
  const H=()=>window.CCGLostSizzlerHorde||null;
  const isHorde=()=>active()?.type==="horde-survivor";
  const isAuthority=()=>Boolean(isHorde()&&active()?.authoritative);
  const members=()=>net?.getMembers?.()||[];
  const playerCount=()=>Math.max(1,Math.min(4,members().length||active()?.state?.playerCount||1));
  const actorId=()=>String(net?.sessionId||p1?.id||"P1");
  const hash32=value=>{
    const horde=H();if(horde?.hash32)return horde.hash32(value);
    let hash=2166136261>>>0;for(const ch of String(value||"")){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619)}return hash>>>0
  };
  const alivePlayers=()=>{
    try{return (typeof allPlayers==="function"?allPlayers():[p1,...(remote?.values?.()||[])].filter(Boolean)).filter(player=>player&&Number(player.health||0)>0)}catch(_){return[]}
  };

  function desiredQuota(wave,count=playerCount()){
    const level=Math.max(1,Math.min(10,Number(wave)||1)),players=Math.max(1,Math.min(4,Number(count)||1));
    return Math.max(1,Math.round(SINGLE_PLAYER_QUOTAS[level-1]*(PLAYER_QUOTA_SCALE[players]||1)))
  }
  function desiredActiveCap(count=playerCount()){
    return ACTIVE_CAP[Math.max(1,Math.min(4,Number(count)||1))]||ACTIVE_CAP[1]
  }

  function injectStyles(){
    if(document.getElementById("ccg-v138-horde-live-style"))return;
    const style=document.createElement("style");style.id="ccg-v138-horde-live-style";style.textContent=`
      #horde-live-roster{display:none;position:absolute;top:96px;right:16px;z-index:94;width:min(290px,34%);padding:9px 11px;border:1px solid rgba(255,216,90,.72);background:rgba(3,2,7,.88);box-shadow:0 0 18px rgba(0,0,0,.42);pointer-events:none;font-family:"Courier New",monospace}
      body[data-special-mode="horde-survivor"] #horde-live-roster{display:block}
      #horde-live-roster .v138-head{display:flex;justify-content:space-between;gap:8px;color:#ffd85a;font-size:11px;font-weight:900}
      #horde-live-roster .v138-join{display:block;margin-top:3px;color:#6cecff;font-size:9px;font-weight:800}
      #horde-live-roster ul{display:grid;grid-template-columns:1fr 1fr;gap:3px 8px;list-style:none;margin:7px 0 0;padding:0}
      #horde-live-roster li{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f8f3ff;font-size:9px}
      #horde-live-roster li[data-status="downed"]{color:#ff7777}#horde-live-roster li[data-status="eliminated"]{opacity:.55}
      #horde-live-join-note{margin:7px 0 4px;padding:7px 10px;border:1px solid rgba(255,216,90,.38);background:rgba(255,216,90,.05);color:#d9cfeb;font-size:9px;line-height:1.45;text-align:center}
      #horde-live-join-note b{color:#ffd85a}
      @media(max-width:760px){#horde-live-roster{top:82px;right:8px;width:min(250px,48%)}#horde-live-roster ul{grid-template-columns:1fr}}
    `;document.head.appendChild(style)
  }

  function injectUi(){
    injectStyles();
    if(!document.getElementById("horde-live-roster")){
      const gameArea=document.querySelector(".game-area");if(gameArea){const panel=document.createElement("aside");panel.id="horde-live-roster";panel.setAttribute("aria-label","Horde players currently playing");panel.innerHTML='<div class="v138-head"><span>HORDE PLAYERS</span><span id="horde-live-count">0/4</span></div><span id="horde-live-room" class="v138-join">ROOM ----- · JOIN ANY TIME</span><ul id="horde-live-list"></ul>';gameArea.appendChild(panel)}
    }
    if(!document.getElementById("horde-live-join-note")){
      const joinRow=document.querySelector("#menu .join-row");if(joinRow){const note=document.createElement("p");note.id="horde-live-join-note";note.innerHTML='<b>HORDE ROOMS STAY OPEN:</b> enter the room code to join an active Horde at any wave. Up to four players can fight together.';joinRow.insertAdjacentElement("afterend",note)}
    }
  }

  function updateRoster(){
    const panel=document.getElementById("horde-live-roster");if(!panel)return;
    const rows=members(),runState=active()?.state;
    const count=document.getElementById("horde-live-count"),room=document.getElementById("horde-live-room"),list=document.getElementById("horde-live-list");
    if(count)count.textContent=`${rows.length}/4`;
    if(room)room.textContent=`ROOM ${String(net?.roomCode||"-----")} · JOIN ANY TIME`;
    if(list)list.innerHTML=rows.map((member,index)=>{const model=runState?.players?.find(player=>String(player.id)===String(member.id)),status=String(model?.status||"active");return `<li data-status="${status}">${index===0?"★ ":""}${esc?.(member.name||"Player")||String(member.name||"Player")}${member.id===net?.sessionId?" · YOU":""}${status!=="active"?` · ${status.toUpperCase()}`:""}</li>`}).join("")||"<li>Waiting for players…</li>"
  }

  function arenaRoom(){return world?._v135HordeArena?(world.rooms||[]).find(room=>room?.hordeArena)||world.rooms?.[0]:null}
  function centreSlots(){
    const room=arenaRoom();if(!room)return[];const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2);
    return CENTRE_OFFSETS.map(offset=>({x:cx+offset.x,y:cy+offset.y}))
  }
  function modelTemplate(member,index,runState){
    const slots=centreSlots(),cell=slots[index%Math.max(1,slots.length)]||{x:Number(runState?.arena?.centre?.x||40),y:Number(runState?.arena?.centre?.y||26)},wave=Math.max(0,Number(runState?.wave||0));
    const weapons=(H()?.WEAPONS||[]).slice(0,wave).map(row=>row.id),current=wave>0?H()?.WEAPONS?.[wave-1]?.id||null:null;
    return{id:String(member.id),name:String(member.name||"CCG Player").slice(0,18),x:cell.x,y:cell.y,hp:10,maxHp:10,status:"active",downedAt:0,downExpiresAt:0,invulnerableUntil:Date.now()+1600,selfReviveAvailable:false,weapons,currentWeapon:current,kills:0,revives:0,damageTaken:0,lateJoinedAt:Date.now()}
  }

  function reconcilePlayers(rows=members()){
    const live=active(),runState=live?.state;if(!live||live.type!=="horde-survivor"||!live.authoritative||!runState)return false;
    const now=Date.now(),admitted=rows.slice(0,4),ids=new Set(admitted.map(row=>String(row.id)));let changed=false;
    for(const [index,member] of admitted.entries()){
      const id=String(member.id),existing=runState.players?.find(player=>String(player.id)===id);missingSince.delete(id);
      if(existing){existing.name=String(member.name||existing.name||"CCG Player").slice(0,18);continue}
      if(["victory","defeat"].includes(runState.state))continue;
      runState.players=runState.players||[];runState.players.push(modelTemplate(member,index,runState));seenPlayers.add(id);changed=true;
      try{showToast("HORDE PLAYER JOINED",`${member.name||"A player"} joined during wave ${Math.max(1,Number(runState.wave||1))}.`,"cyan",5200)}catch(_){}
    }
    for(const player of [...(runState.players||[])]){
      const id=String(player.id);if(ids.has(id))continue;
      if(!missingSince.has(id)){missingSince.set(id,now);continue}
      if(now-Number(missingSince.get(id)||now)<PLAYER_GRACE_MS)continue;
      runState.players=runState.players.filter(row=>String(row.id)!==id);missingSince.delete(id);changed=true
    }
    const nextCount=Math.max(1,Math.min(4,runState.players?.length||1));if(runState.playerCount!==nextCount){runState.playerCount=nextCount;changed=true}
    const hostId=String(admitted[0]?.id||runState.hostId||"");if(hostId&&runState.hostId!==hostId){runState.hostId=hostId;changed=true}
    return changed
  }

  function ensureLocalCentreSpawn(){
    if(!isHorde()||!world?._v135HordeArena||!p1)return false;
    const key=`${active()?.seed||run?.seed||"HORDE"}|${actorId()}`;if(state.localSpawnKey===key)return false;
    const rows=members(),index=Math.max(0,rows.findIndex(row=>String(row.id)===actorId())),slots=centreSlots(),cell=slots[index%Math.max(1,slots.length)];if(!cell)return false;
    p1.x=cell.x;p1.y=cell.y;p1.rx=cell.x;p1.ry=cell.y;p1.health=Math.max(1,Number(p1.health||10));
    const model=active()?.state?.players?.find(player=>String(player.id)===actorId());if(model){model.x=cell.x;model.y=cell.y}
    try{cameras?.clear?.();resetCamp?.(p1,true);reveal?.(p1);markRoomVisit?.(p1);rememberTrail?.(p1)}catch(_){}
    state.localSpawnKey=key;return true
  }

  function cellOccupied(x,y,except=null){
    if((host?.enemies||[]).some(enemy=>enemy!==except&&enemy?.alive&&enemy.x===x&&enemy.y===y))return true;
    return alivePlayers().some(player=>player.x===x&&player.y===y)
  }
  function safeCell(x,y,except=null){return Boolean(world?.map?.[y]?.[x]===0&&(!host?.blockingDecor||!host.blockingDecor.some(row=>row.x===x&&row.y===y))&&!cellOccupied(x,y,except))}
  function perimeterCell(key,except=null){
    const room=arenaRoom();if(!room)return null;const minX=room.x+2,maxX=room.x+room.w-2,minY=room.y+2,maxY=room.y+room.h-2,seed=hash32(`${active()?.seed||run?.seed||"HORDE"}|PERIMETER|${key}`),side=seed%4;
    for(let attempt=0;attempt<80;attempt++){
      const n=hash32(`${seed}|${attempt}`),x=minX+(n%Math.max(1,maxX-minX+1)),y=minY+((n>>>9)%Math.max(1,maxY-minY+1)),cell=side===0?{x:minX,y}:side===1?{x:maxX,y}:side===2?{x,y:minY}:{x,y:maxY};if(safeCell(cell.x,cell.y,except))return cell
    }
    return{x:minX,y:minY}
  }
  function weightedKind(wave,serial){
    const def=H()?.WAVES?.[Math.max(0,Number(wave)-1)],groups=def?.groups||[];if(!groups.length)return"spider";const total=groups.reduce((sum,row)=>sum+Number(row.weight||0),0)||1;let roll=(hash32(`${active()?.seed}|EXTRA|${wave}|${serial}`)%100000)/100000*total;
    for(const group of groups){roll-=Number(group.weight||0);if(roll<=0)return group.kind}return groups[groups.length-1].kind
  }
  const physicalKind=kind=>({bat:"ghost",fighter:"hunter",elite:"guardian",warden:"knight"}[kind]||kind);
  function makeExtraModel(runState){
    const serial=Number(runState.nextEnemyId||1),kind=weightedKind(runState.wave,serial),base=H()?.ENEMIES?.[kind]||H()?.ENEMIES?.spider,cell=perimeterCell(`extra-${runState.wave}-${serial}`);if(!base||!cell)return null;
    runState.nextEnemyId=serial+1;
    return{id:`horde-${runState.wave}-${serial}`,kind,name:base.name,hp:base.hp,maxHp:base.hp,damage:base.damage,speed:base.speed,score:base.score,alive:true,spawnRoomId:"perimeter",x:cell.x,y:cell.y,spawnedAt:Date.now(),targetId:null,_v138Extra:true}
  }
  function materialiseExtra(model){
    if(!model||!host||host.enemies.some(enemy=>enemy.id===model.id&&enemy.alive))return null;
    const enemy={id:model.id,x:model.x,y:model.y,kind:physicalKind(model.kind),hp:Number(model.hp||1),maxHp:Number(model.maxHp||model.hp||1),alive:true,aiState:"chase",facing:{x:0,y:1},lastSeen:null,memoryMs:999999,searchMs:0,moveCooldown:999999,attackCooldown:420,chargeCooldown:900,healCooldown:999999,flash:0,hpBarMs:0,hordeEnemy:true,hordeModelId:model.id,hordeReinforcement:true,moveSpeedScale:1,_v135ArenaSpawned:true,_v138PerimeterManaged:true};
    host.enemies.push(enemy);host.revision=(host.revision||0)+1;return enemy
  }
  function reserveId(wave){return`v138-wave-${wave}-reserve`}
  function reinforceWave(now=Date.now()){
    const live=active(),runState=live?.state,horde=H();if(!live?.authoritative||live.type!=="horde-survivor"||!runState||!horde||!["wave","siege"].includes(runState.state))return false;
    const count=Math.max(1,Math.min(4,runState.playerCount||playerCount())),baseQuota=horde.quotaFor(runState.wave,count),target=desiredQuota(runState.wave,count),rid=reserveId(runState.wave);
    runState._v138DesiredQuota=target;
    let reserve=(runState.activeEnemies||[]).find(model=>model.id===rid);
    if(runState.spawned>=baseQuota&&runState.spawned<target&&!reserve){reserve={id:rid,kind:"reserve",name:"Reinforcement reserve",hp:1,maxHp:1,alive:true,_v138Reserve:true};runState.activeEnemies.push(reserve)}
    if(runState.spawned<baseQuota&&reserve){runState.activeEnemies=runState.activeEnemies.filter(model=>model!==reserve);reserve=null}
    const physical=(host?.enemies||[]).filter(enemy=>enemy?.alive&&enemy.hordeEnemy&&!enemy.hordeWarden).length;
    if(runState.spawned>=baseQuota&&runState.spawned<target&&physical<desiredActiveCap(count)&&now>=Number(state.nextExtraAt||0)){
      const model=makeExtraModel(runState);if(model){runState.activeEnemies.push(model);runState.spawned+=1;materialiseExtra(model);state.nextExtraAt=now+Math.max(145,330-Math.max(1,Number(runState.wave||1))*14)}
    }
    if(runState.spawned>=target){runState.activeEnemies=runState.activeEnemies.filter(model=>model.id!==rid)}
    return true
  }

  function approachStep(enemy,target){
    const dx=Number(target.x)-Number(enemy.x),dy=Number(target.y)-Number(enemy.y);if(Math.abs(dx)+Math.abs(dy)<=1)return null;
    const xdir=Math.sign(dx),ydir=Math.sign(dy),primary=Math.abs(dx)>=Math.abs(dy)?[{x:enemy.x+xdir,y:enemy.y},{x:enemy.x,y:enemy.y+ydir}]:[{x:enemy.x,y:enemy.y+ydir},{x:enemy.x+xdir,y:enemy.y}];
    const fallback=[{x:enemy.x+ydir,y:enemy.y},{x:enemy.x-ydir,y:enemy.y},{x:enemy.x,y:enemy.y+xdir},{x:enemy.x,y:enemy.y-xdir}];
    return [...primary,...fallback].find(cell=>safeCell(cell.x,cell.y,enemy))||null
  }
  function driveEnemies(dt){
    if(!isAuthority()||!world?._v135HordeArena||!host)return false;const players=alivePlayers();if(!players.length)return false;const elapsed=Math.max(4,Math.min(80,Number(dt)||16));
    for(const enemy of host.enemies||[]){
      if(!enemy?.alive||!enemy.hordeEnemy)continue;
      if(!enemy._v138PerimeterManaged){if(!enemy._v135ArenaSpawned){const cell=perimeterCell(enemy.id,enemy);if(cell){enemy.x=cell.x;enemy.y=cell.y}}enemy._v135ArenaSpawned=true;enemy._v138PerimeterManaged=true}
      const target=[...players].sort((a,b)=>Math.hypot(enemy.x-a.x,enemy.y-a.y)-Math.hypot(enemy.x-b.x,enemy.y-b.y))[0];if(!target)continue;
      enemy.aiState="chase";enemy.lastSeen={x:target.x,y:target.y};enemy.memoryMs=999999;enemy.searchMs=0;enemy.targetId=target.id;enemy.moveCooldown=Math.max(Number(enemy.moveCooldown||0),90000);
      enemy._v138ApproachMs=Number(enemy._v138ApproachMs||0)-elapsed;if(enemy._v138ApproachMs>0)continue;
      const speed=Math.max(.55,Number((active()?.state?.activeEnemies||[]).find(model=>model.id===enemy.hordeModelId)?.speed||1)),step=approachStep(enemy,target);
      if(step){enemy.facing={x:Math.sign(step.x-enemy.x),y:Math.sign(step.y-enemy.y)};enemy.x=step.x;enemy.y=step.y;const model=active()?.state?.activeEnemies?.find(row=>row.id===enemy.hordeModelId);if(model){model.x=enemy.x;model.y=enemy.y}}
      enemy._v138ApproachMs=Math.max(145,Math.round(330/speed))
    }
    return true
  }

  function redrawHordeBanner(){
    if(!isHorde()||!active()?.state||typeof ctx==="undefined"||typeof canvas==="undefined")return false;const runState=active().state,wave=Math.max(0,Number(runState.wave||0)),definition=H()?.WAVES?.[Math.max(0,wave-1)],quota=wave?desiredQuota(wave,runState.playerCount||playerCount()):0,width=Math.min(canvas.width-28,735),physical=(host?.enemies||[]).filter(enemy=>enemy?.alive&&enemy.hordeEnemy).length;
    ctx.save();ctx.fillStyle="rgba(3,2,7,.9)";ctx.fillRect(14,14,width,70);ctx.strokeStyle="#ffd85a";ctx.strokeRect(14.5,14.5,width-1,69);ctx.textAlign="left";ctx.font='bold 16px "Courier New",monospace';ctx.fillStyle="#ffd85a";ctx.fillText(`HORDE SURVIVOR · WAVE ${wave}/10 · ${definition?.title||"BRIEFING"}`,27,38);ctx.font='bold 12px "Courier New",monospace';ctx.fillStyle="#6cecff";ctx.fillText(`DEFEATED ${Number(runState.defeated||0)}/${quota} · ACTIVE ${physical} · PLAYERS ${runState.playerCount||playerCount()}/4 · AMMO ∞`,27,62);ctx.restore();return true
  }

  function updateHordeLive(dt){
    if(!isHorde()){state.localSpawnKey="";state.waveKey="";return false}
    try{
      ensureLocalCentreSpawn();
      if(isAuthority()){reconcilePlayers();reinforceWave(Date.now());driveEnemies(dt)}
      updateRoster();
      return true
    }catch(error){
      console.warn("[Lost Sizzler V10.38] Horde live update failed",error);
      return false
    }
  }

  function wrapToast(){
    if(state.toastWrapped||typeof window.showToast!=="function")return false;const original=window.showToast;
    window.showToast=function showToastV138HordeQuota(title,text,tone,duration){if(isHorde()&&/^HORDE WAVE /i.test(String(title||""))){const runState=active()?.state;if(runState?.wave)text=`${desiredQuota(runState.wave,runState.playerCount||playerCount())} enemies. They enter from the outer perimeter and converge on the centre. Unlimited ammunition and shared revives are active.`}return original.call(this,title,text,tone,duration)};
    state.toastWrapped=true;return true
  }

  function wrapMembers(){
    if(state.membersWrapped||!net?.cb)return false;const original=net.cb.onMembers;
    net.cb.onMembers=function onMembersV138HordeJoin(rows,isHost,changed){const result=original?.(rows,isHost,changed);try{if(isHorde()&&isHost)reconcilePlayers(rows||[]);updateRoster()}catch(error){console.warn("[Lost Sizzler V10.38] Horde roster sync failed",error)}return result};state.membersWrapped=true;return true
  }
  function wrapPacket(){
    if(state.packetWrapped||!net?.cb)return false;const original=net.cb.onPacket;
    net.cb.onPacket=function onPacketV138HordeLive(event,payload){const result=original?.(event,payload);if(event==="v133_special_state"&&isHorde())setTimeout(updateRoster,0);return result};state.packetWrapped=true;return true
  }
  function wrapRender(){
    if(!state.renderWrapped&&typeof window.render==="function"){
      const original=window.render;window.render=function renderV138HordeLive(){const result=original.apply(this,arguments);try{redrawHordeBanner()}catch(error){console.warn("[Lost Sizzler V10.38] Horde banner render failed",error)}return result};state.renderWrapped=true
    }
    return state.renderWrapped
  }

  function install(){
    injectUi();const gate=window.CCGLostSizzlerReleaseGate;if(gate&&!gate.state?.ready)return false;if(!window.CCGLostSizzlerV137?.state?.installed||!api()||!H()||!net?.cb)return false;
    wrapToast();wrapMembers();wrapPacket();wrapRender();if(!state.installed){state.installed=true;document.body.dataset.v138HordeLive="true"}return state.toastWrapped&&state.membersWrapped&&state.packetWrapped&&state.renderWrapped
  }

  injectUi();state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},INSTALL_MS);install();window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV138={SINGLE_PLAYER_QUOTAS,PLAYER_QUOTA_SCALE,ACTIVE_CAP,CENTRE_OFFSETS,desiredQuota,desiredActiveCap,reconcilePlayers,ensureLocalCentreSpawn,perimeterCell,reinforceWave,driveEnemies,updateHordeLive,updateRoster,redrawHordeBanner,get state(){return state}};
})();