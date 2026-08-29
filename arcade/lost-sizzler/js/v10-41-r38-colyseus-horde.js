/* The Lost Sizzler V10.41 r38 — dedicated Colyseus Horde transport/authority.
 * Supabase remains available for the existing lobby while active Horde gameplay
 * moves to the dedicated server. Browser-host authority is restored if the
 * dedicated room disconnects, so a server fault cannot strand the current run.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R38_COLYSEUS_HORDE__)return;
  window.__CCG_LOST_SIZZLER_V141_R38_COLYSEUS_HORDE__=true;

  const HORDE="horde-survivor";
  const ENDPOINT="https://lost-sizzler-multiplayer.onrender.com";
  const SDK_URL="https://unpkg.com/@colyseus/sdk@0.18.2/dist/colyseus.js";
  const TICK_MS=50,POSITION_HEARTBEAT_MS=250,PING_MS=2000,RETRY_MS=4500;
  const state={installed:false,timer:0,client:null,room:null,connecting:false,connected:false,authorityLive:false,arenaSent:false,lastRunKey:"",lastPositionAt:0,lastPositionSig:"",lastPingAt:0,ping:0,lastStateAt:0,reconnectAt:0,connectAttempts:0,states:0,enemyCreates:0,enemyUpdates:0,enemyRemovals:0,suppressedSupabase:0,hitsSent:0,playerPackets:0,status:"OFFLINE",lastError:"",lastReviveHold:null};

  const special=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const isHorde=()=>String(special()?.type||document.body?.dataset?.specialMode||"")===HORDE;
  const onlineHorde=()=>{try{return isHorde()&&playMode==="online"&&Boolean(net?.connected)&&Boolean(p1)&&Boolean(world)&&Boolean(host)}catch(_){return false}};
  const actorId=()=>{try{return String(p1?.id||net?.sessionId||"P1")}catch(_){return"P1"}};
  const roomCode=()=>{try{return String(net?.roomCode||special()?.roomCode||"").toUpperCase()}catch(_){return""}};
  const runKey=()=>{try{return `${roomCode()}|${special()?.seed||run?.seed||""}`}catch(_){return roomCode()}};
  const members=()=>{try{return net?.getMembers?.()||[]}catch(_){return[]}};
  const expectedPlayers=()=>Math.max(1,Math.min(4,members().length||special()?.state?.playerCount||1));
  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};

  function injectStatus(){
    if(document.getElementById("horde-server-status"))return;
    const anchor=document.getElementById("net-status");if(!anchor?.parentElement)return;
    const badge=document.createElement("span");badge.id="horde-server-status";badge.className="status";badge.hidden=true;badge.title="Dedicated Lost Sizzler Horde server";badge.style.cssText="border-color:#6cecff;color:#6cecff;white-space:nowrap";anchor.insertAdjacentElement("afterend",badge)
  }
  function updateStatus(text,tone="cyan"){
    injectStatus();const badge=document.getElementById("horde-server-status");if(!badge)return;badge.hidden=!isHorde();if(badge.hidden)return;badge.textContent=text;
    const colour=tone==="green"?"#72ff9b":tone==="red"?"#ff6868":tone==="gold"?"#ffd85a":"#6cecff";badge.style.color=colour;badge.style.borderColor=colour
  }

  function loadSdk(){
    if(window.Colyseus?.Client)return Promise.resolve(window.Colyseus);
    const existing=document.querySelector('script[data-ccg-colyseus-sdk="true"]');
    if(existing)return new Promise((resolve,reject)=>{const started=Date.now(),timer=setInterval(()=>{if(window.Colyseus?.Client){clearInterval(timer);resolve(window.Colyseus)}else if(Date.now()-started>20000){clearInterval(timer);reject(new Error("Colyseus browser SDK timed out"))}},80)});
    return new Promise((resolve,reject)=>{const script=document.createElement("script");script.src=SDK_URL;script.async=true;script.crossOrigin="anonymous";script.dataset.ccgColyseusSdk="true";script.onload=()=>window.Colyseus?.Client?resolve(window.Colyseus):reject(new Error("Colyseus SDK did not initialise"));script.onerror=()=>reject(new Error("Colyseus SDK could not be loaded"));document.head.appendChild(script)})
  }
  async function prewarm(){
    updateStatus("HORDE SERVER · WAKING","gold");const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),65000);
    try{const response=await fetch(`${ENDPOINT}/healthz`,{cache:"no-store",signal:controller.signal,mode:"cors"});if(!response.ok)throw new Error(`server health ${response.status}`);const body=await response.json().catch(()=>({}));if(body?.ok!==true)throw new Error("server health response invalid");return true}finally{clearTimeout(timeout)}
  }

  function values(collection){const out=[];if(!collection)return out;try{if(typeof collection.forEach==="function"){collection.forEach(value=>out.push(value));return out}}catch(_){}try{return Object.values(collection)}catch(_){return out}}
  const physicalKind=kind=>({bat:"ghost",fighter:"hunter",elite:"guardian",warden:"knight"}[String(kind||"")]||String(kind||"spider"));
  function makeReplica(model){
    const hp=Math.max(0,Number(model?.health??model?.hp??1));const rawMax=model?.maxHealth??model?.maxHp??hp;const maxHp=Math.max(1,Number(rawMax)||1);const boss=Boolean(model?.boss);
    return{id:String(model.id),x:Number(model.x)||0,y:Number(model.y)||0,kind:physicalKind(model.kind),hp,maxHp,alive:hp>0,aiState:"chase",facing:{x:0,y:1},lastSeen:null,memoryMs:999999,searchMs:0,moveCooldown:999999,attackCooldown:999999,chargeCooldown:999999,healCooldown:999999,flash:0,hpBarMs:0,hordeEnemy:true,hordeModelId:String(model.id),hordeWarden:boss,champion:boss,championName:boss?(model.name||"The Horde Warden"):undefined,moveSpeedScale:Number(model.speed||1),_v141NetworkReplica:true,_v141ColyseusReplica:true}
  }
  function syncEnemies(models){
    if(!host?.enemies)return;const liveIds=new Set();
    for(const model of models){if(!model||model.alive===false||Number(model.health??model.hp??0)<=0)continue;const id=String(model.id);liveIds.add(id);let enemy=host.enemies.find(row=>String(row?.hordeModelId||row?.id||"")===id);if(!enemy){enemy=makeReplica(model);host.enemies.push(enemy);state.enemyCreates++}
      enemy.x=Number(model.x)||0;enemy.y=Number(model.y)||0;enemy.hp=Math.max(0,Number(model.health??model.hp??0));const rawMax=model.maxHealth??model.maxHp??enemy.maxHp??enemy.hp;enemy.maxHp=Math.max(1,Number(rawMax)||1);enemy.alive=enemy.hp>0;enemy.kind=physicalKind(model.kind);enemy.hordeEnemy=true;enemy.hordeModelId=id;enemy.hordeWarden=Boolean(model.boss);enemy._v141NetworkReplica=true;enemy._v141ColyseusReplica=true;enemy.moveCooldown=999999;enemy.attackCooldown=999999;if(model.boss){enemy.champion=true;enemy.championName=model.name||"The Horde Warden"}state.enemyUpdates++}
    const before=host.enemies.length;host.enemies=host.enemies.filter(enemy=>{if(!(enemy?.hordeEnemy||enemy?.hordeWarden||enemy?._v141NetworkReplica||enemy?._v141ColyseusReplica))return true;const id=String(enemy?.hordeModelId||enemy?.id||"");return liveIds.has(id)});state.enemyRemovals+=Math.max(0,before-host.enemies.length)
  }

  function buildPlayer(model){return{id:String(model?.actorId||model?.id||""),name:String(model?.name||"Player"),x:Number(model?.x)||0,y:Number(model?.y)||0,hp:Math.max(0,Number(model?.health||0)),maxHp:Math.max(1,Number(model?.maxHealth||10)),status:String(model?.status||"active"),dirX:Number(model?.dirX)||0,dirY:Number(model?.dirY)||0,downExpiresAt:Number(model?.downExpiresAt||0),invulnerableUntil:Number(model?.invulnerableUntil||0),currentWeapon:String(model?.currentWeapon||"starter"),kills:Number(model?.kills||0),revives:Number(model?.revives||0)}}
  function buildEnemy(model){return{id:String(model.id),kind:String(model.kind||"spider"),name:String(model.name||"Enemy"),x:Number(model.x)||0,y:Number(model.y)||0,hp:Math.max(0,Number(model.health||0)),maxHp:Math.max(1,Number(model.maxHealth||1)),damage:Number(model.damage||1),speed:Number(model.speed||1),score:Number(model.score||0),alive:model.alive!==false,targetId:String(model.targetId||""),boss:Boolean(model.boss)}}
  function syncRemotePlayer(model){
    if(!model.id||model.id===actorId())return;const old=remote.get(model.id)||{};const x=Number(model.x)||0,y=Number(model.y)||0;
    remote.set(model.id,{...old,id:model.id,name:model.name,x,y,health:model.status==="active"?Math.max(1,model.hp):1,maxHealth:model.maxHp,dir:{x:model.dirX,y:model.dirY},lastSeen:performance.now(),rx:old.rx??x,ry:old.ry??y,hordeStatus:model.status,_v141ColyseusPlayer:true})
  }

  function applyServerState(server){
    if(!server||!isHorde())return;state.states++;state.lastStateAt=perfNow();const live=special();if(!live)return;
    const players=values(server.players).map(buildPlayer),enemyRows=values(server.enemies).map(buildEnemy),enemies=enemyRows.filter(row=>!row.boss),boss=enemyRows.find(row=>row.boss)||null,pickups=values(server.pickups).map(row=>({id:String(row.id),x:Number(row.x)||0,y:Number(row.y)||0,restore:Number(row.restore||2)}));
    const target=live.state||{};live.state=target;target.state=String(server.status||target.state||"briefing");target.wave=Number(server.wave||0);target.score=Number(server.score||0);target.playerCount=Number(server.playerCount||players.length||1);target.spawned=Number(server.spawned||0);target.defeated=Number(server.defeated||0);target.waveEndsAt=Number(server.waveEndsAt||0);target.intermissionEndsAt=Number(server.intermissionEndsAt||0);target.players=players;target.activeEnemies=enemies;target.boss=boss;target.health={...(target.health||{}),active:pickups};target._v141ServerQuota=Number(server.quota||0);target._v141ServerAuthority=true;
    for(const model of players){if(model.id===actorId()){if(p1){p1.maxHealth=model.maxHp;p1.health=model.status==="active"?Math.max(1,model.hp):1;p1.hpBarMs=900;p1.mana=p1.maxMana;p1.hordeStatus=model.status}}else syncRemotePlayer(model)}
    score=Math.max(0,Math.floor(Number(server.score||0)));syncEnemies([...enemies,...(boss?[boss]:[])]);
    const ready=Boolean(server.serverAuthoritative&&server.arenaReady&&String(server.status||"")!=="warming");if(ready&&!state.authorityLive){state.authorityLive=true;live.authoritative=false;document.body.dataset.hordeTransport="colyseus";updateStatus(`HORDE SERVER · ${state.ping?`${state.ping}MS`:"LIVE"}`,"green");try{showToast("DEDICATED HORDE SERVER","Enemy AI, waves, damage and multiplayer state are now running on the dedicated server.","green",6500)}catch(_){}}if(state.authorityLive)live.authoritative=false
  }

  function hordeWeapon(level){const H=window.CCGLostSizzlerHorde,weapon=H?.WEAPONS?.[Math.max(0,Number(level||1)-1)],power=1+Math.floor(Math.max(0,Number(level||1)-1)/2),name=weapon?.name||"Archive Sidearm";return{id:`horde-wave-${level}`,name,displayName:name,rarity:level>=9?"ZZAP! 97%":level>=6?"GOLD MEDAL":"SIZZLER",power,delay:Math.max(.42,1-level*.045),shots:level>=8?3:level>=3?2:1,ammo:1,element:level>=5?"shock":"energy",ttl:18,mods:[],rating:power}}
  function onHordeEvent(event){
    if(!event||!isHorde())return;const live=special();
    if(event.type==="wave-start"){const w=hordeWeapon(Number(event.wave||1));if(p1){p1.firearmUnlocked=true;p1.weapon={...w};p1.mana=p1.maxMana}try{showToast(`HORDE WAVE ${event.wave} — ${event.title}`,`${Number(event.quota||live?.state?._v141ServerQuota||0)} enemies. Dedicated server authority active.`,Number(event.wave)===10?"red":"gold",7600)}catch(_){}}
    else if(event.type==="weapon-unlocked"){const w=hordeWeapon(Number(live?.state?.wave||1));if(p1){p1.firearmUnlocked=true;p1.weapon={...w};p1.mana=p1.maxMana}}
    else if(event.type==="player-down"){try{showToast("PLAYER DOWN","Hold E beside the downed player for five seconds to revive them.","red",6500)}catch(_){}}
    else if(event.type==="revive-complete"){try{showToast("REVIVE COMPLETE","A Horde player is back in the fight.","green",4200)}catch(_){}}
    else if(event.type==="boss-start"){try{showToast("THE HORDE WARDEN","The final boss has entered the arena.","red",7000)}catch(_){}}
    else if(event.type==="victory"){try{showToast("HORDE SURVIVOR COMPLETE",`Final score: ${Math.floor(Number(live?.state?.score||score||0)).toLocaleString()}.`,"green",12000)}catch(_){}}
    else if(event.type==="defeat"){try{showToast("THE HORDE WON","No active players remain.","red",12000)}catch(_){}}
  }

  function encodeArena(){
    if(!world?.map?.length)return null;const height=world.map.length,width=world.map[0]?.length||0;if(!width)return null;const blocked=new Set((host?.blockingDecor||[]).filter(row=>row&&row.blocking!==false).map(row=>`${Math.round(Number(row.x))},${Math.round(Number(row.y))}`));let encoded="";
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)encoded+=world.map?.[y]?.[x]===0&&!blocked.has(`${x},${y}`)?"1":"0";return{width,height,walkable:encoded}
  }

  function attachRoomHandlers(room){
    const onState=server=>applyServerState(server);if(typeof room.onStateChange==="function")room.onStateChange(onState);else if(room.onStateChange?.on)room.onStateChange.on(onState);try{applyServerState(room.state)}catch(_){}
    room.onMessage?.("horde_event",onHordeEvent);
    room.onMessage?.("enemy_attack",event=>{if(!event)return;try{S?.sfx?.(event.ranged?"fire":"hit");if(typeof floatText==="function")floatText(Number(event.x)||0,Number(event.y)||0,"!",P?.red||"#ff6868")}catch(_){}});
    room.onMessage?.("horde_fx",event=>{if(!event)return;const enemy=host?.enemies?.find(row=>String(row?.hordeModelId||row?.id||"")===String(event.enemyId||""));if(enemy){enemy.flash=150;enemy.hpBarMs=1100}});
    room.onMessage?.("pong",payload=>{const sent=Number(payload?.sentAt||0);if(sent)state.ping=Math.max(0,Math.round(Date.now()-sent));if(state.authorityLive)updateStatus(`HORDE SERVER · ${state.ping}MS`,state.ping>180?"gold":"green")});
    room.onMessage?.("server_notice",payload=>{if(payload?.type==="authority-started")updateStatus("HORDE SERVER · LIVE","green")});
    room.onMessage?.("server_error",payload=>{state.lastError=String(payload?.message||payload?.code||"Server error");updateStatus("HORDE SERVER · ERROR","red")});
    if(typeof room.onError==="function")room.onError((code,message)=>{state.lastError=`${code}: ${message||"room error"}`;fallback("room error")});
    if(typeof room.onLeave==="function")room.onLeave(()=>fallback("server disconnected"))
  }

  async function connect(){
    if(state.connecting||state.connected||!onlineHorde())return false;state.connecting=true;state.connectAttempts++;state.status="CONNECTING";updateStatus("HORDE SERVER · CONNECTING","gold");
    try{await prewarm();const sdk=await loadSdk();if(!onlineHorde())throw new Error("Horde run ended while server was waking");const code=roomCode();if(!code)throw new Error("Missing Horde room code");const client=new sdk.Client(ENDPOINT);const room=await client.joinOrCreate("horde_v1",{roomCode:code,seed:String(special()?.seed||run?.seed||code),name:String(p1?.name||"Player"),actorId:actorId(),isLobbyHost:Boolean(net?.isHost),expectedPlayers:expectedPlayers()});state.client=client;state.room=room;state.connected=true;state.connecting=false;state.status="CONNECTED";state.arenaSent=false;state.reconnectAt=0;attachRoomHandlers(room);if(net?.isHost){const arena=encodeArena();if(arena){room.send("arena_init",arena);state.arenaSent=true}}room.send("player_state",{x:p1.x,y:p1.y,dirX:p1.dir?.x||1,dirY:p1.dir?.y||0,mana:p1.mana,maxMana:p1.maxMana});updateStatus("HORDE SERVER · SYNCING","gold");return true}
    catch(error){state.connecting=false;state.connected=false;state.room=null;state.client=null;state.lastError=String(error?.message||error);state.reconnectAt=Date.now()+RETRY_MS;updateStatus("HORDE SERVER · RETRYING","red");try{console.warn("[Lost Sizzler r38] Colyseus Horde connection failed",error)}catch(_){}return false}
  }

  function fallback(reason="fallback"){
    const live=special();state.connected=false;state.authorityLive=false;state.room=null;state.client=null;state.arenaSent=false;state.status="FALLBACK";state.reconnectAt=Date.now()+RETRY_MS;if(live?.type===HORDE)live.authoritative=Boolean(net?.isHost);delete document.body.dataset.hordeTransport;updateStatus("HORDE SERVER · RECONNECTING","red");try{console.warn(`[Lost Sizzler r38] ${reason}; browser Horde authority temporarily restored`)}catch(_){}
  }
  async function disconnect(){const room=state.room;state.room=null;state.client=null;state.connected=false;state.authorityLive=false;state.arenaSent=false;state.lastPositionAt=0;state.lastPositionSig="";state.lastPingAt=0;state.ping=0;state.lastReviveHold=null;state.status="OFFLINE";delete document.body.dataset.hordeTransport;try{await room?.leave?.()}catch(_){}}

  function playerSignature(){const d=p1?.dir||{};return[p1?.x,p1?.y,d.x,d.y,p1?.mana,p1?.maxMana].join("|")}
  function sendPlayer(t){const room=state.room;if(!room||!p1)return;const sig=playerSignature();if(sig===state.lastPositionSig&&t-state.lastPositionAt<POSITION_HEARTBEAT_MS)return;state.lastPositionSig=sig;state.lastPositionAt=t;state.playerPackets++;room.send("player_state",{x:p1.x,y:p1.y,dirX:p1.dir?.x||0,dirY:p1.dir?.y||0,mana:p1.mana,maxMana:p1.maxMana})}
  function sendRevive(){if(!state.room)return;let holding=false;try{holding=Boolean(input?.has?.("KeyE"))}catch(_){}if(state.lastReviveHold===holding)return;state.lastReviveHold=holding;state.room.send("revive_hold",{holding})}

  function wrapHostEnemyStep(){if(typeof hostEnemyStep!=="function"||hostEnemyStep.__ccgV141R38Colyseus)return false;const original=hostEnemyStep,wrapped=function(dt){if(state.authorityLive&&isHorde())return false;return original.apply(this,arguments)};wrapped.__ccgV141R38Colyseus=true;wrapped.__ccgOriginal=original;hostEnemyStep=wrapped;return true}
  function wrapDamageEnemy(){if(typeof damageEnemy!=="function"||damageEnemy.__ccgV141R38Colyseus)return false;const original=damageEnemy,wrapped=function(enemy,power,element,attacker){if(state.authorityLive&&isHorde()&&enemy&&(enemy._v141ColyseusReplica||enemy.hordeEnemy||enemy.hordeWarden)){const id=String(enemy.hordeModelId||enemy.id||"");if(id&&state.room){state.hitsSent++;state.room.send("enemy_hit",{enemyId:id,power:Math.max(1,Number(power||1)),element:String(element||"energy")});enemy.flash=160;enemy.hpBarMs=1000;return true}}return original.apply(this,arguments)};wrapped.__ccgV141R38Colyseus=true;wrapped.__ccgOriginal=original;damageEnemy=wrapped;return true}
  function wrapSupabase(){if(!net||typeof net.send!=="function"||net.send.__ccgV141R38Colyseus)return false;const original=net.send,gameplay=new Set(["v133_special_state","v133_special_input","player","world","shot","hit","player_hit","enemy_shot","fx","notice"]);net.send=function(event,payload){if(state.authorityLive&&isHorde()&&gameplay.has(String(event))){state.suppressedSupabase++;return Promise.resolve("ok")}return original.apply(this,arguments)};net.send.__ccgV141R38Colyseus=true;net.send.__ccgOriginal=original;return true}
  function install(){wrapHostEnemyStep();wrapDamageEnemy();wrapSupabase();injectStatus();state.installed=true;document.body.dataset.v141R38ColyseusHorde="true";return true}

  function tick(){
    install();if(!onlineHorde()){if(state.connected||state.connecting)disconnect();const badge=document.getElementById("horde-server-status");if(badge)badge.hidden=true;state.lastRunKey="";return}
    const key=runKey();if(state.lastRunKey!==key){state.lastRunKey=key;state.reconnectAt=0;state.lastPositionAt=0;state.lastPositionSig=""}
    if(!state.connected&&!state.connecting&&Date.now()>=state.reconnectAt){connect();return}if(!state.room)return;
    if(net?.isHost&&!state.arenaSent){const arena=encodeArena();if(arena){state.room.send("arena_init",arena);state.arenaSent=true}}
    const t=perfNow();sendPlayer(t);sendRevive();if(t-state.lastPingAt>=PING_MS){state.lastPingAt=t;state.room.send("ping",{sentAt:Date.now()})}if(state.authorityLive&&p1){p1.mana=p1.maxMana;const live=special();if(live)live.authoritative=false}
  }

  install();state.timer=setInterval(tick,TICK_MS);addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0;try{state.room?.leave?.()}catch(_){}},{once:true});
  window.CCGLostSizzlerV141R38ColyseusHorde={ENDPOINT,SDK_URL,connect,disconnect,encodeArena,applyServerState,getDiagnostics(){return{connected:state.connected,authorityLive:state.authorityLive,status:state.status,ping:state.ping,states:state.states,enemyCreates:state.enemyCreates,enemyUpdates:state.enemyUpdates,enemyRemovals:state.enemyRemovals,suppressedSupabase:state.suppressedSupabase,hitsSent:state.hitsSent,playerPackets:state.playerPackets,lastError:state.lastError}},get state(){return state}};
})();
