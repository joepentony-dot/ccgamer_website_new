/* The Lost Sizzler V10.33 — live Horde Survivor and Sizzler Saboteurs adapter. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_SPECIAL_MODES_V133__)return;
  window.__CCG_LOST_SIZZLER_SPECIAL_MODES_V133__=true;

  const H=window.CCGLostSizzlerHorde,HA=window.CCGLostSizzlerHordeAudio;
  const SAB=window.CCGLostSizzlerSaboteurs,SA=window.CCGLostSizzlerSaboteursAudio;
  const keys=new Set(),touchKeys=new Set(),inputs=new Map(),visuals=new Map();
  let active=null,hordeAudio=null,saboteursAudio=null,lastStateSend=0,lastInputSend=0;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const distance=(a,b)=>Math.hypot(Number(a?.x||0)-Number(b?.x||0),Number(a?.y||0)-Number(b?.y||0));
  const now=()=>Date.now();
  const members=()=>net?.getMembers?.()||[];
  const admitted=id=>members().some(member=>member.id===id);
  const actorId=()=>net?.sessionId||"P1";
  const isEditable=target=>target instanceof Element&&Boolean(target.closest("input,textarea,select,[contenteditable='true'],[contenteditable='']"));

  function inputState(){
    const held=code=>keys.has(code)||touchKeys.has(code),left=held("ArrowLeft")||held("KeyA"),right=held("ArrowRight")||held("KeyD"),up=held("ArrowUp")||held("KeyW"),down=held("ArrowDown")||held("KeyS");
    return{dx:(right?1:0)-(left?1:0),dy:(down?1:0)-(up?1:0),fire:held("Space"),interact:held("KeyE"),trap:held("KeyT"),extract:held("KeyX"),sentAt:now()};
  }
  function setTouch(action,on){const map={up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight",fire:"Space",potion:"KeyE",torch:"KeyT"},code=map[action];if(!code)return;if(on)touchKeys.add(code);else touchKeys.delete(code)}

  addEventListener("keydown",event=>{
    if(!active||isEditable(event.target))return;
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","KeyE","KeyT","KeyX","Escape"].includes(event.code)){event.preventDefault();event.stopImmediatePropagation()}
    if(event.code==="Escape"){stop("Special mode ended.");return}
    keys.add(event.code);
  },true);
  addEventListener("keyup",event=>{if(!active)return;keys.delete(event.code)},true);
  addEventListener("blur",()=>{keys.clear();touchKeys.clear()});
  document.addEventListener("pointerdown",event=>{if(!active)return;const action=event.target?.closest?.("[data-action]")?.dataset?.action;if(action){event.preventDefault();setTouch(action,true)}},true);
  document.addEventListener("pointerup",event=>{if(!active)return;const action=event.target?.closest?.("[data-action]")?.dataset?.action;if(action)setTouch(action,false)},true);

  function hydrateState(type,state){
    if(!state)return null;state.events=Array.isArray(state.events)?state.events:[];
    if(type==="horde-survivor")state.announcer=state.announcer||{busyUntil:0,lastPlayed:{},current:null};
    else state.announcer=state.announcer||{busyUntil:0,lastPlayed:{},current:null};
    return state;
  }
  function publicState(){if(!active?.state)return null;return active.type==="horde-survivor"?H.publicState(active.state):SAB.publicState(active.state)}
  function sendState(force=false){if(!active?.authoritative||!active.state||!net?.connected)return;const time=now();if(!force&&time-lastStateSend<125)return;lastStateSend=time;net.send("v133_special_state",{roomMode:active.type,state:publicState(),sentAt:time}).catch(()=>{})}
  function sendInput(){if(!active||active.authoritative||!net?.connected)return;const time=now();if(time-lastInputSend<75)return;lastInputSend=time;net.send("v133_special_input",{roomMode:active.type,actorId:actorId(),input:inputState()}).catch(()=>{})}

  function announce(title,text,tone="cyan",duration=6500){try{showToast(title,text,tone,duration)}catch(_){}}
  function handleHordeEvents(events){for(const event of events){
    if(event.type==="wave-start"){hordeAudio?.setWave?.(event.wave);announce(`HORDE WAVE ${event.wave} — ${event.title}`,`${event.quota} enemies. Unlimited ammunition; survive and keep moving.`,event.wave===10?"red":"gold",7500)}
    else if(event.type==="weapon-unlocked")announce("WEAPON UPGRADED",event.weapon?.name||"A stronger Horde weapon is active.","cyan",5200);
    else if(event.type==="player-down")announce("PLAYER DOWN","Hold E beside the downed player for five seconds to revive them.","red",6500);
    else if(event.type==="victory")announce("HORDE SURVIVOR COMPLETE",`Final score: ${Math.floor(active.state.score).toLocaleString()}. Press Escape to return to the menu.`,"green",12000);
    else if(event.type==="defeat")announce("THE HORDE WON","No active players remain. Press Escape to return to the menu.","red",12000);
  }}
  function handleSaboteurEvents(events){for(const event of events){
    if(event.type==="round-start")announce(`SPY VS SPY — ROUND ${event.round}`,`${active.state.modifier?.name||"Double-cross"}. Find the case, joystick, tape and key, then extract.`,"gold",8500);
    else if(event.type==="round-won")announce("ROUND WON",`${active.state.players.find(player=>player.id===event.playerId)?.name||"An agent"} takes the round.`,"green",6500);
    else if(event.type==="match-won")announce("SPY VS SPY COMPLETE",`${active.state.players.find(player=>player.id===event.playerId)?.name||"An agent"} wins the match. Press Escape to return.`,"green",12000);
    else if(event.type==="trap-triggered")announce("TRAP TRIGGERED",event.selfTriggered?"An agent triggered their own trap.":"The sabotage worked.","red",5200);
  }}

  function moveHordePlayer(player,input,dt){
    if(!player||player.status!=="active")return;let dx=Number(input?.dx||0),dy=Number(input?.dy||0);if(dx||dy){const length=Math.hypot(dx,dy)||1,step=clamp(dt,0,45)*.0085;dx/=length;dy/=length;player.x=clamp(player.x+dx*step,2,78);player.y=clamp(player.y+dy*step,2,50);active.facing.set(player.id,{x:dx,y:dy})}
  }
  function fireHorde(player,input,time){
    if(!player||player.status!=="active"||!input?.fire||time<Number(active.cooldowns.get(`fire:${player.id}`)||0))return;
    active.cooldowns.set(`fire:${player.id}`,time+Math.max(105,205-Number(active.state.wave||1)*7));const facing=active.facing.get(player.id)||{x:1,y:0},damage=1+Math.floor(Math.max(0,Number(active.state.wave||1)-1)/3);
    if(active.state.state==="boss"&&active.state.boss?.alive){const boss=active.state.boss,d=distance(player,boss),dot=((boss.x-player.x)*facing.x+(boss.y-player.y)*facing.y)/Math.max(.001,d);if(d<=14&&dot>.55){H.damageBoss(active.state,damage,player.id,time);return}}
    const target=[...active.state.activeEnemies].filter(enemy=>enemy.alive).map(enemy=>{const d=distance(player,enemy),dot=((enemy.x-player.x)*facing.x+(enemy.y-player.y)*facing.y)/Math.max(.001,d);return{enemy,d,dot}}).filter(row=>row.d<=13&&row.dot>.58).sort((a,b)=>a.d-b.d)[0];
    if(!target)return;target.enemy.hp=Math.max(0,Number(target.enemy.hp||1)-damage);if(target.enemy.hp<=0)H.defeatEnemy(active.state,target.enemy.id,player.id,time);
  }
  function updateHorde(dt,time){
    const state=active.state;if(!state)return;const local=inputState();inputs.set(actorId(),local);
    for(const player of state.players){const current=player.id===actorId()?local:inputs.get(player.id)||{};moveHordePlayer(player,current,dt);fireHorde(player,current,time);if(current.interact){const downed=state.players.find(other=>other.status==="downed"&&distance(player,other)<=H.REVIVE_DISTANCE);if(downed&&!state.revives[downed.id])H.startRevive(state,player.id,downed.id,time)}}
    if(["wave","siege"].includes(state.state)&&time>=Number(active.nextSpawnAt||0)){H.spawnNext(state,time);active.nextSpawnAt=time+clamp(760-Number(state.wave||1)*35,330,760)}
    for(const enemy of state.activeEnemies){if(!enemy.alive)continue;const target=[...state.players].filter(player=>player.status==="active").sort((a,b)=>distance(enemy,a)-distance(enemy,b))[0];if(!target)continue;const d=distance(enemy,target);if(d>.62){const step=clamp(dt,0,45)*.0021*Number(enemy.speed||1),dx=(target.x-enemy.x)/Math.max(.001,d),dy=(target.y-enemy.y)/Math.max(.001,d);enemy.x=clamp(enemy.x+dx*step,1,79);enemy.y=clamp(enemy.y+dy*step,1,51)}else if(time>=Number(enemy.attackAt||0)){enemy.attackAt=time+900;H.applyDamage(state,target.id,enemy.damage,time)}}
    if(state.boss?.alive){const boss=state.boss,target=state.players.find(player=>player.id===boss.targetId&&player.status==="active")||state.players.find(player=>player.status==="active");if(target){const d=distance(boss,target);if(d>.85){boss.x+=(target.x-boss.x)/Math.max(.001,d)*clamp(dt,0,45)*.0017;boss.y+=(target.y-boss.y)/Math.max(.001,d)*clamp(dt,0,45)*.0017}else if(time>=Number(boss.attackAt||0)){boss.attackAt=time+1050;H.applyDamage(state,target.id,boss.damage,time)}}}
    for(const pickup of [...state.health.active]){const player=state.players.find(entry=>entry.status==="active"&&distance(entry,pickup)<.8);if(player)H.collectHealth(state,pickup.id,player.id,time)}
    H.tick(state,time);handleHordeEvents(H.drainEvents(state));
  }

  function sabRoom(match,id){return match.map?.rooms.find(room=>room.id===id)}
  function moveSaboteur(player,input,time){
    if(!player||player.status!=="active"||time<Number(active.cooldowns.get(`move:${player.id}`)||0))return;
    const dx=Number(input?.dx||0),dy=Number(input?.dy||0);if(!dx&&!dy)return;const room=sabRoom(active.state,player.roomId),edges=active.state.map.edges.filter(edge=>edge.a===room.id||edge.b===room.id),neighbours=edges.map(edge=>sabRoom(active.state,edge.a===room.id?edge.b:edge.a)).filter(Boolean),target=neighbours.map(next=>({next,score:(next.gridX-room.gridX)*dx+(next.gridY-room.gridY)*dy})).filter(row=>row.score>0).sort((a,b)=>b.score-a.score)[0]?.next;if(target){SAB.movePlayer(active.state,player.id,target.id,time);active.cooldowns.set(`move:${player.id}`,time+260)}}
  function sabAction(player,input,time){
    if(!player||player.status!=="active")return;
    if(input.trap&&time>=Number(active.cooldowns.get(`trap:${player.id}`)||0)){active.cooldowns.set(`trap:${player.id}`,time+700);const room=sabRoom(active.state,player.roomId);for(const trapId of active.state.trapLoadout){const def=SAB.TRAPS[trapId],type=def.locations.find(value=>value==="floor"||value==="furniture"&&room?.furniture?.length||value==="door"),targetId=type==="furniture"?room.furniture[0]?.id:type==="door"?active.state.map.edges.find(edge=>edge.a===room.id||edge.b===room.id)?.id:null;if(type&&SAB.placeTrap(active.state,player.id,trapId,{type,id:targetId},time))break}}
    if(input.extract&&time>=Number(active.cooldowns.get(`extract:${player.id}`)||0)){active.cooldowns.set(`extract:${player.id}`,time+700);SAB.beginExtraction(active.state,player.id,time)}
    if(!input.fire||time<Number(active.cooldowns.get(`action:${player.id}`)||0))return;active.cooldowns.set(`action:${player.id}`,time+420);
    const opponent=active.state.players.find(other=>other.id!==player.id&&other.status==="active"&&other.roomId===player.roomId);if(opponent){SAB.useWeapon(active.state,player.id,opponent.id,time);return}
    const loose=active.state.looseObjects.find(item=>item.roomId===player.roomId);if(loose&&SAB.collectLoose(active.state,player.id,loose.id,time))return;
    const room=sabRoom(active.state,player.roomId),furniture=room?.furniture?.find(item=>!item.searched);if(furniture){SAB.searchFurniture(active.state,player.id,furniture.id,time);return}
    SAB.beginExtraction(active.state,player.id,time);
  }
  function updateSaboteurs(dt,time){
    const match=active.state;if(!match)return;const local=inputState();inputs.set(actorId(),local);
    for(const player of match.players){const current=player.id===actorId()?local:inputs.get(player.id)||{};moveSaboteur(player,current,time);sabAction(player,current,time)}
    SAB.tick(match,time);if(match.state==="round-complete"){match._adapterNextRoundAt=Number(match._adapterNextRoundAt||time+4500);if(time>=match._adapterNextRoundAt){delete match._adapterNextRoundAt;SAB.beginRound(match,time)}}
    handleSaboteurEvents(SAB.drainEvents(match));
  }

  function updateSpecial(dt){
    if(!active)return;sendInput();if(!active.authoritative||!active.state)return;
    const time=now();if(active.type==="horde-survivor")updateHorde(dt,time);else updateSaboteurs(dt,time);sendState();
  }

  function smooth(id,x,y){const current=visuals.get(id)||{x,y};current.x+=(x-current.x)*.28;current.y+=(y-current.y)*.28;visuals.set(id,current);return current}
  function fitArena(){const margin=44,scale=Math.min((canvas.width-margin*2)/80,(canvas.height-margin*2)/52),ox=(canvas.width-80*scale)/2,oy=(canvas.height-52*scale)/2;return{scale,ox,oy,point:(x,y)=>({x:ox+x*scale,y:oy+y*scale})}}
  function textLine(text,x,y,size=14,colour="#faf4ff",align="left"){ctx.fillStyle=colour;ctx.font=`bold ${size}px "Courier New",monospace`;ctx.textAlign=align;ctx.fillText(String(text),x,y)}
  function renderHorde(){
    const state=active.state;ctx.fillStyle="#05040a";ctx.fillRect(0,0,canvas.width,canvas.height);if(!state){textLine("WAITING FOR HOST STATE…",canvas.width/2,canvas.height/2,18,"#ffd85a","center");return}const f=fitArena(),p=f.point;
    ctx.fillStyle="#151021";ctx.strokeStyle="#6cecff";ctx.lineWidth=2;ctx.fillRect(f.ox,f.oy,80*f.scale,52*f.scale);ctx.strokeRect(f.ox,f.oy,80*f.scale,52*f.scale);for(const room of state.arena.spawnRooms){const q=p(room.x,room.y);ctx.fillStyle="#25172e";ctx.fillRect(q.x,q.y,room.w*f.scale,room.h*f.scale)}for(const cover of state.arena.cover){const q=p(cover.x,cover.y);ctx.fillStyle="#6b4b3a";ctx.fillRect(q.x-f.scale*.6,q.y-f.scale*.6,f.scale*1.2,f.scale*1.2)}
    for(const item of state.health.active){const q=p(item.x,item.y);ctx.fillStyle="#72ff9b";ctx.fillRect(q.x-5,q.y-5,10,10)}
    for(const enemy of state.activeEnemies){const v=smooth(enemy.id,enemy.x,enemy.y),q=p(v.x,v.y);ctx.fillStyle=enemy.kind==="knight"?"#c8c0d0":enemy.kind==="bat"?"#b978ff":"#ff6868";ctx.beginPath();ctx.arc(q.x,q.y,Math.max(4,f.scale*.34),0,Math.PI*2);ctx.fill()}
    if(state.boss?.alive){const v=smooth(state.boss.id,state.boss.x,state.boss.y),q=p(v.x,v.y);ctx.fillStyle="#ff3b52";ctx.fillRect(q.x-12,q.y-12,24,24);textLine(`${Math.ceil(state.boss.hp)}/${state.boss.maxHp}`,q.x,q.y-17,10,"#ffd85a","center")}
    for(const player of state.players){const v=smooth(player.id,player.x,player.y),q=p(v.x,v.y),local=player.id===actorId();ctx.fillStyle=player.status==="downed"?"#9b8daa":local?"#6cecff":"#ffd85a";ctx.beginPath();ctx.arc(q.x,q.y,Math.max(6,f.scale*.45),0,Math.PI*2);ctx.fill();textLine(player.name,q.x,q.y-11,9,ctx.fillStyle,"center")}
    const wave=H.WAVES[Math.max(0,state.wave-1)];textLine("HORDE SURVIVOR",24,28,20,"#ffd85a");textLine(`WAVE ${state.wave||0}/10 · ${wave?.title||"BRIEFING"} · SCORE ${Math.floor(state.score).toLocaleString()}`,24,50,13,"#faf4ff");textLine(`ENEMIES ${state.defeated}/${state.wave?H.quotaFor(state.wave,state.playerCount):0} · WEAPON ${H.WEAPONS[Math.max(0,state.wave-1)]?.name||"WAITING"} · AMMO ∞`,24,69,12,"#6cecff");textLine("MOVE WASD/ARROWS · HOLD SPACE FIRE · HOLD E BESIDE DOWNED ALLY",canvas.width/2,canvas.height-15,11,"#c8c0d0","center");
  }
  function renderSaboteurs(){
    const match=active.state;ctx.fillStyle="#05030a";ctx.fillRect(0,0,canvas.width,canvas.height);if(!match){textLine("WAITING FOR HOST STATE…",canvas.width/2,canvas.height/2,18,"#ffd85a","center");return}const player=match.players.find(entry=>entry.id===actorId())||match.players[0],room=sabRoom(match,player?.roomId),opponent=match.players.find(entry=>entry.id!==player?.id),colour=player?.colour||"#6cecff";
    const w=Math.min(canvas.width*.72,760),h=Math.min(canvas.height*.64,470),x=(canvas.width-w)/2,y=(canvas.height-h)/2;ctx.fillStyle="#15101f";ctx.strokeStyle=colour;ctx.lineWidth=3;ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);
    const edges=match.map?.edges?.filter(edge=>edge.a===room?.id||edge.b===room?.id)||[];for(const edge of edges){const other=sabRoom(match,edge.a===room.id?edge.b:edge.a),dx=Math.sign(other.gridX-room.gridX),dy=Math.sign(other.gridY-room.gridY),doorX=x+w/2+dx*(w/2-9),doorY=y+h/2+dy*(h/2-9);ctx.fillStyle="#ffd85a";ctx.fillRect(doorX-(dy?28:7),doorY-(dx?28:7),dy?56:14,dx?56:14)}
    for(const [index,item] of (room?.furniture||[]).entries()){const cols=5,qx=x+70+(index%cols)*Math.max(70,(w-140)/cols),qy=y+90+Math.floor(index/cols)*80;ctx.fillStyle=item.searched?"#3c3343":"#8b5e3c";ctx.fillRect(qx-18,qy-14,36,28);textLine(item.searched?"EMPTY":"SEARCH",qx,qy+28,8,"#c8c0d0","center")}
    if(opponent?.roomId===player?.roomId&&opponent.status==="active"){ctx.fillStyle=opponent.colour;ctx.beginPath();ctx.arc(x+w*.7,y+h*.52,18,0,Math.PI*2);ctx.fill();textLine(opponent.name,x+w*.7,y+h*.52-28,11,opponent.colour,"center")}
    ctx.fillStyle=colour;ctx.beginPath();ctx.arc(x+w*.3,y+h*.52,18,0,Math.PI*2);ctx.fill();textLine(player?.name||"AGENT",x+w*.3,y+h*.52-28,11,colour,"center");
    textLine("SPY VS SPY MULTIPLAYER",24,28,20,"#ffd85a");textLine(`ROUND ${match.round}/5 · ${match.modifier?.name||"BRIEFING"} · ${match.wins[player.id]||0}-${match.wins[opponent.id]||0}`,24,50,13,"#faf4ff");textLine(`${room?.name||room?.id||"ROOM"} · HP ${player.hp}/${player.maxHp} · TRAPS ${player.trapCharges} · NO MINIMAP`,24,70,12,colour);textLine(`CASE ${player.hasCase?"✓":"—"} · JOYSTICK ${player.objectives.includes("joystick")?"✓":"—"} · TAPE ${player.objectives.includes("tape")?"✓":"—"} · KEY ${player.objectives.includes("key")?"✓":"—"}`,24,89,11,"#72ff9b");textLine("MOVE TO A DOOR · SPACE SEARCH/ATTACK · T PLACE TRAP · X EXTRACT",canvas.width/2,canvas.height-15,11,"#c8c0d0","center");
  }
  function renderSpecial(){if(!active)return;if(active.type==="horde-survivor")renderHorde();else renderSaboteurs()}

  function startOnline(meta={}){
    const type=String(meta.roomMode||"");if(type==="horde-survivor"&&(!H||!HA)||type==="sizzler-saboteurs"&&(!SAB||!SA)||!["horde-survivor","sizzler-saboteurs"].includes(type))return false;
    stop(undefined,true);const time=now(),entries=(meta.players||members()).map(entry=>({id:String(entry.id),name:String(entry.name||"CCG Player")}));active={type,state:null,authoritative:Boolean(net?.isHost),facing:new Map(),cooldowns:new Map(),nextSpawnAt:time+3200,startedAt:time};inputs.clear();visuals.clear();keys.clear();touchKeys.clear();
    try{S.stopMusic?.()}catch(_){}mode="special";playMode="online";setRunPresentation(true);UI.menu?.classList.add("hidden");document.getElementById("online-lobby")?.classList.add("hidden");
    if(type==="horde-survivor"){hordeAudio=HA.createController();hordeAudio.start(1);if(active.authoritative)active.state=H.createRun({players:entries,hostId:meta.hostId||entries[0]?.id,seed:meta.seed||meta.roomCode,now:time});announce("HORDE SURVIVOR LIVE","Ten host-authoritative waves. Unlimited ammunition, shared revives and a final Warden battle.","gold",9000)}
    else{saboteursAudio=SA.createController({baseVolume:.14});saboteursAudio.start();if(active.authoritative){active.state=SAB.createMatch({players:entries.slice(0,2),hostId:meta.hostId||entries[0]?.id,seed:meta.seed||meta.roomCode,now:time});SAB.beginRound(active.state,time)}announce("SPY VS SPY LIVE","Two players only. Best of five; search, sabotage, fight and extract. The minimap is disabled.","gold",9000)}
    if(active.authoritative){if(type==="horde-survivor")handleHordeEvents(H.drainEvents(active.state));else handleSaboteurEvents(SAB.drainEvents(active.state));setTimeout(()=>sendState(true),50)}
    return true;
  }
  function stop(message="Returned to game options.",silent=false){
    if(!active&&!hordeAudio&&!saboteursAudio)return false;active=null;inputs.clear();visuals.clear();keys.clear();touchKeys.clear();hordeAudio?.dispose?.();saboteursAudio?.dispose?.();hordeAudio=null;saboteursAudio=null;
    if(!silent){mode="menu";playMode="solo";setRunPresentation(false);document.getElementById("online-lobby")?.classList.add("hidden");UI.menu?.classList.remove("hidden");net?.leave?.().finally?.(()=>net?.setSolo?.(playerName()));if(message)setTimeout(()=>{if(UI?.note)UI.note.textContent=message},0)}return true;
  }

  const originalPacket=net?.cb?.onPacket;
  if(net?.cb)net.cb.onPacket=function onPacketV133Special(event,payload){
    if(event==="v133_special_input"&&active?.authoritative&&payload?.roomMode===active.type&&admitted(payload.actorId)){inputs.set(payload.actorId,{...payload.input});return}
    if(event==="v133_special_state"&&active&&!active.authoritative&&payload?.roomMode===active.type&&payload.state){active.state=hydrateState(active.type,payload.state);return}
    return originalPacket?.(event,payload);
  };
  const originalMembers=net?.cb?.onMembers;
  if(net?.cb)net.cb.onMembers=function onMembersV133Special(rows,isHost,changed){const result=originalMembers?.(rows,isHost,changed);if(active&&isHost&&!active.authoritative){active.authoritative=true;active.state=hydrateState(active.type,active.state);announce("HOST MIGRATION COMPLETE","This browser has adopted the latest special-mode state and is now authoritative.","cyan",7500)}return result};
  if(typeof update==="function"){const original=update;update=function updateV133Special(dt){if(active)return updateSpecial(Number(dt)||0);return original.apply(this,arguments)}}
  if(typeof render==="function"){const original=render;render=function renderV133Special(){if(active)return renderSpecial();return original.apply(this,arguments)}}
  document.getElementById("quit-btn")?.addEventListener("click",event=>{if(!active)return;event.preventDefault();event.stopImmediatePropagation();stop()},true);

  window.CCGLostSizzlerSpecialModes={startOnline,stop,get active(){return active},updateForTest:updateSpecial,renderForTest:renderSpecial};
})();
