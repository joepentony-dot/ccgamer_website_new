/* The Lost Sizzler V10.41 r58 — Spy Vs Spy lethal sabotage overhaul.
 *
 * Final Spy-only rules owner:
 * - one ten-minute match with a personal clock for each agent;
 * - trap placement reaches the contextual r32 owner instead of the stale floor-trap fallback;
 * - traps never trigger on their owner and instantly eliminate the opposing agent;
 * - any elimination costs the victim 30 seconds and transfers carried Spy kit to the killer;
 * - death gets a trap/melee effect, silhouette ghost beat and remote-room respawn;
 * - extraction with the complete case wins immediately;
 * - Solo dungeon entities and systems are continuously removed from Spy.
 *
 * The legacy Saboteurs engine remains intact for historical contracts. This file is
 * loaded last by the Spy lazy loader and replaces only the live Spy-facing methods.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R58_SPY_OVERHAUL__)return;
  window.__CCG_LOST_SIZZLER_V141_R58_SPY_OVERHAUL__=true;

  const MODE_ID="sizzler-saboteurs";
  const MATCH_MS=10*60*1000;
  const DEATH_PENALTY_MS=30*1000;
  const RESPAWN_BEAT_MS=2800;
  const EXTRACTION_MS=3000;
  const TICK_MS=40;
  const CLASSIC_TRAPS=Object.freeze(["powerBrick","spring","custard"]);
  const SOLO_ARRAYS=Object.freeze([
    "enemies","items","chests","shrines","switches","generators","arenas","timedRooms","hazardRooms","shops","deathCaches",
    "traps","ammoPacks","potions","torches","teleports","boulders","floorEvents","events","sigilDefenderIds"
  ]);
  const state={
    timer:0,installed:false,rulesPatched:false,inputPatched:false,wasSpy:false,matchKey:"",lastTickAt:0,
    trapKeyPasses:0,trapPlacementsObserved:0,ownerTrapIgnores:0,trapKills:0,combatKills:0,timePenalties:0,
    lootTransfers:0,respawns:0,soloPurges:0,soloObjectsRemoved:0,clockCompletions:0,extractions:0,
    deathSerial:0,seenDeaths:new Map(),lastError:""
  };

  let nativeStopImmediate=null;
  let baseSaboteurs=null;

  const active=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const match=()=>active()?.state||null;
  const spyActive=()=>active()?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID;
  const authoritative=()=>Boolean(active()?.authoritative);
  const actorId=()=>{try{return String(net?.sessionId||p1?.id||"P1")}catch(_){return"P1"}};
  const r32=()=>{try{return window.CCGLostSizzlerV141R32SpyOverhaul||null}catch(_){return null}};
  const now=()=>Date.now();
  const clone=value=>{try{return value==null?value:structuredClone(value)}catch(_){try{return JSON.parse(JSON.stringify(value))}catch(__){return value}}};
  const modelFor=(m,id)=>m?.players?.find?.(row=>String(row?.id||"")===String(id||""))||null;
  const opponentFor=(m,id)=>m?.players?.find?.(row=>String(row?.id||"")!==String(id||""))||null;
  const itemCount=player=>Number(Boolean(player?.hasCase))+Number(player?.objectives?.length||0)+Number(Boolean(player?.looseItem));
  const finite=value=>Number.isFinite(Number(value));
  const formatClock=ms=>{const total=Math.max(0,Math.ceil((Number(ms)||0)/1000)),minutes=Math.floor(total/60),seconds=total%60;return`${minutes}:${String(seconds).padStart(2,"0")}`};

  function ensureStyles(){
    if(document.getElementById("ccg-spy-r58-style"))return true;
    const style=document.createElement("style");style.id="ccg-spy-r58-style";
    style.textContent=`
      body[data-special-mode="sizzler-saboteurs"] .spy-r35-ghost{display:none!important}
      #spy-r58-clockboard{display:none;position:absolute;z-index:152;left:1.2%;top:9px;width:74.6%;pointer-events:none;box-sizing:border-box;font:900 12px/1.15 "Courier New",monospace;text-shadow:0 2px 4px #000}
      body[data-special-mode="sizzler-saboteurs"] #spy-r58-clockboard{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:9px}
      #spy-r58-clockboard .spy-r58-clock{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 11px;border:2px solid currentColor;background:rgba(3,4,10,.9);box-shadow:0 5px 18px rgba(0,0,0,.52)}
      #spy-r58-clockboard .spy-r58-clock[data-low="true"]{animation:spy-r58-clock-pulse .8s steps(2,end) infinite}
      #spy-r58-clockboard .spy-r58-clock b{font-size:clamp(16px,1.8vw,25px);letter-spacing:.05em}#spy-r58-clockboard .spy-r58-clock span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #spy-r58-clockboard .spy-r58-versus{padding:5px 7px;border:1px solid rgba(255,255,255,.25);background:rgba(3,4,10,.84);color:#fff;text-align:center}
      .spy-r58-death-fx{display:none;position:absolute;left:0;width:77%;height:50%;z-index:155;pointer-events:none;overflow:hidden;isolation:isolate;font-family:"Courier New",monospace}
      body[data-special-mode="sizzler-saboteurs"] .spy-r58-death-fx[data-visible="true"]{display:block}.spy-r58-death-fx[data-slot="1"]{top:0}.spy-r58-death-fx[data-slot="2"]{bottom:0}
      .spy-r58-death-fx .spy-r58-flash{position:absolute;inset:0;opacity:0;animation:spy-r58-flash .9s ease-out forwards}
      .spy-r58-death-fx[data-kind="trap"][data-trap="powerBrick"] .spy-r58-flash{background:radial-gradient(circle at 50% 50%,rgba(255,245,170,.95) 0 4%,rgba(255,91,45,.62) 13%,rgba(90,0,0,.38) 32%,transparent 66%)}
      .spy-r58-death-fx[data-kind="trap"][data-trap="spring"] .spy-r58-flash{background:repeating-linear-gradient(0deg,rgba(255,216,90,.24) 0 5px,transparent 5px 19px);animation-name:spy-r58-spring}
      .spy-r58-death-fx[data-kind="trap"][data-trap="custard"] .spy-r58-flash{background:linear-gradient(165deg,rgba(130,241,255,.58),rgba(30,89,180,.3) 43%,transparent 76%);animation-name:spy-r58-water}
      .spy-r58-death-fx[data-kind="combat"] .spy-r58-flash{background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.36),rgba(255,90,110,.24) 24%,transparent 62%)}
      .spy-r58-ghost-shape{position:absolute;left:50%;top:48%;width:56px;height:92px;transform:translate(-50%,-50%) scale(.35);opacity:0;filter:drop-shadow(0 0 12px rgba(220,240,255,.48));animation:spy-r58-ghost 1.55s .45s ease-out forwards}
      .spy-r58-ghost-shape:before{content:"";position:absolute;left:16px;top:0;width:25px;height:25px;border-radius:50%;background:#07090d;border:2px solid rgba(225,240,255,.62)}
      .spy-r58-ghost-shape:after{content:"";position:absolute;left:7px;top:24px;width:42px;height:62px;border-radius:48% 48% 34% 34%;background:#07090d;border:2px solid rgba(225,240,255,.55);clip-path:polygon(0 0,100% 0,100% 78%,78% 100%,55% 82%,31% 100%,0 78%)}
      .spy-r58-death-card{position:absolute;left:50%;bottom:10%;transform:translateX(-50%);min-width:min(480px,82%);padding:9px 14px;border:2px solid #ff6868;background:rgba(3,4,9,.94);box-shadow:0 8px 30px rgba(0,0,0,.78);text-align:center;color:#fff;opacity:0;animation:spy-r58-card .25s .38s ease-out forwards}
      .spy-r58-death-card strong{display:block;color:#ff8f91;font-size:clamp(13px,1.6vw,21px);letter-spacing:.06em}.spy-r58-death-card span{display:block;margin-top:3px;color:#fff3b0;font-size:clamp(9px,1vw,12px)}
      @keyframes spy-r58-flash{0%{opacity:0}12%{opacity:1}70%{opacity:.18}100%{opacity:0}}@keyframes spy-r58-spring{0%{opacity:0;transform:translateY(0)}25%{opacity:.9;transform:translateY(-18px)}55%{opacity:.35;transform:translateY(8px)}100%{opacity:0;transform:translateY(0)}}
      @keyframes spy-r58-water{0%{opacity:0}12%{opacity:.95}100%{opacity:.12}}@keyframes spy-r58-ghost{0%{opacity:0;transform:translate(-50%,-35%) scale(.35)}36%{opacity:.92;transform:translate(-50%,-58%) scale(1.08)}100%{opacity:.12;transform:translate(-50%,-78%) scale(.9)}}@keyframes spy-r58-card{to{opacity:1}}@keyframes spy-r58-clock-pulse{50%{filter:brightness(1.5)}}
      @media(max-width:900px){#spy-r58-clockboard{width:71%;font-size:9px}.spy-r58-death-fx{width:72%}.spy-r58-death-card{min-width:min(340px,88%)}}
      @media(prefers-reduced-motion:reduce){.spy-r58-death-fx *{animation-duration:.01ms!important;animation-iteration-count:1!important}#spy-r58-clockboard .spy-r58-clock{animation:none!important}}
    `;
    document.head.appendChild(style);return true
  }

  function ensureUi(){
    ensureStyles();const wrap=document.querySelector(".canvas-wrap");if(!wrap)return false;
    let clocks=document.getElementById("spy-r58-clockboard");if(!clocks){clocks=document.createElement("div");clocks.id="spy-r58-clockboard";clocks.innerHTML='<div class="spy-r58-clock" data-slot="1"><span></span><b>10:00</b></div><div class="spy-r58-versus">TIME</div><div class="spy-r58-clock" data-slot="2"><span></span><b>10:00</b></div>';wrap.appendChild(clocks)}
    for(const slot of [1,2])if(!wrap.querySelector(`.spy-r58-death-fx[data-slot="${slot}"]`)){const node=document.createElement("div");node.className="spy-r58-death-fx";node.dataset.slot=String(slot);node.dataset.visible="false";node.innerHTML='<div class="spy-r58-flash"></div><div class="spy-r58-ghost-shape"></div><div class="spy-r58-death-card"><strong></strong><span></span></div>';wrap.appendChild(node)}
    return true
  }

  function slotFor(m,id){const model=modelFor(m,id);if(Number(model?.slot)===2)return 2;return 1}
  function deathTitle(death){if(death?.kind==="trap")return`${String(death.trapName||"TRAP").toUpperCase()} SPRUNG — INSTANT KNOCKOUT`;return"AGENT KNOCKED OUT"}
  function showDeathFx(m,player,death){
    ensureUi();const slot=slotFor(m,player?.id),node=document.querySelector(`.spy-r58-death-fx[data-slot="${slot}"]`);if(!node)return false;
    clearTimeout(node.__r58Timer);node.dataset.visible="false";void node.offsetWidth;node.dataset.kind=String(death?.kind||"combat");node.dataset.trap=String(death?.trapId||"");
    node.querySelector("strong").textContent=deathTitle(death);node.querySelector("span").textContent="-30 SECONDS · CARRIED ITEMS TRANSFERRED · RESPAWNING ELSEWHERE";node.dataset.visible="true";
    node.__r58Timer=setTimeout(()=>{node.dataset.visible="false"},RESPAWN_BEAT_MS+350);return true
  }

  function renderClocks(){
    if(!spyActive())return false;ensureUi();const m=match();if(!m)return false;const hostNow=now();
    for(const slot of [1,2]){const player=(m.players||[]).find(row=>Number(row.slot)===slot)||m.players?.[slot-1],node=document.querySelector(`#spy-r58-clockboard .spy-r58-clock[data-slot="${slot}"]`);if(!node||!player)continue;
      let remaining=Math.max(0,Number(player.timeRemainingMs??MATCH_MS));if(!authoritative()&&m.state==="playing"&&finite(m.r58ClockAt))remaining=Math.max(0,remaining-Math.max(0,hostNow-Number(m.r58ClockAt)));
      node.style.color=String(player.colour||"#fff");node.dataset.low=String(remaining<=60000);node.querySelector("span").textContent=String(player.name||`PLAYER ${slot}`).toUpperCase();node.querySelector("b").textContent=formatClock(remaining)
    }
    const mid=document.querySelector("#spy-r58-clockboard .spy-r58-versus");if(mid){const ex=m.r58Extraction,remain=ex?Math.max(0,Number(ex.completesAt||0)-hostNow):0;mid.textContent=ex?`EXTRACT ${Math.ceil(remain/100)/10}s`:m.state==="match-complete"?"MATCH OVER":"TIME"}
    return true
  }

  function transferWeapon(receiver,weapon){if(!receiver||!weapon)return false;if(!receiver.weapon){receiver.weapon=clone(weapon);return true}receiver.spyCapturedWeapons=Array.isArray(receiver.spyCapturedWeapons)?receiver.spyCapturedWeapons:[];receiver.spyCapturedWeapons.push(clone(weapon));return true}
  function transferCounter(receiver,counter){if(!receiver||!counter)return false;if(!receiver.counter){receiver.counter=counter;return true}if(receiver.counter===counter)return true;receiver.spyCapturedCounters=Array.isArray(receiver.spyCapturedCounters)?receiver.spyCapturedCounters:[];if(!receiver.spyCapturedCounters.includes(counter))receiver.spyCapturedCounters.push(counter);return true}
  function transferAllCarried(victim,killer){
    if(!victim||!killer||String(victim.id)===String(killer.id))return false;
    if(victim.hasCase)killer.hasCase=true;
    const objectives=[...(victim.objectives||[])];if(victim.looseItem)objectives.push(victim.looseItem);killer.objectives=Array.from(new Set([...(killer.objectives||[]),...objectives].filter(Boolean)));
    transferWeapon(killer,victim.weapon);transferCounter(killer,victim.counter);
    killer.trapCharges=Math.max(0,Number(killer.trapCharges||0))+Math.max(0,Number(victim.trapCharges||0));
    if(Array.isArray(victim.spyCapturedWeapons)&&victim.spyCapturedWeapons.length){killer.spyCapturedWeapons=Array.isArray(killer.spyCapturedWeapons)?killer.spyCapturedWeapons:[];killer.spyCapturedWeapons.push(...victim.spyCapturedWeapons.map(clone))}
    if(Array.isArray(victim.spyCapturedCounters)&&victim.spyCapturedCounters.length){killer.spyCapturedCounters=Array.isArray(killer.spyCapturedCounters)?killer.spyCapturedCounters:[];killer.spyCapturedCounters=Array.from(new Set([...killer.spyCapturedCounters,...victim.spyCapturedCounters]))}
    victim.hasCase=false;victim.objectives=[];victim.looseItem=null;victim.weapon=null;victim.counter=null;victim.trapCharges=0;victim.spyCapturedWeapons=[];victim.spyCapturedCounters=[];state.lootTransfers++;return true
  }

  function completeMatch(m,winnerId,at,reason,loserId=null){
    if(!m||m.state==="match-complete")return false;m.state="match-complete";m.matchWinnerId=winnerId||null;m.completedAt=at;m.r58Extraction=null;m.extraction=null;m.r58Result={winnerId:winnerId||null,loserId:loserId||null,reason:String(reason||"complete"),at};
    m.events?.push?.({type:"match-won",playerId:winnerId||null,loserId:loserId||null,reason:String(reason||"complete"),r58:true,at});if(reason==="timer")state.clockCompletions++;if(reason==="extraction")state.extractions++;return true
  }

  function penaliseClock(m,victim,at){
    if(!victim)return false;victim.timeRemainingMs=Math.max(0,Number(victim.timeRemainingMs??MATCH_MS)-DEATH_PENALTY_MS);victim.r58PenaltyCount=Math.max(0,Number(victim.r58PenaltyCount||0))+1;victim.r58LastPenaltyAt=at;state.timePenalties++;
    if(victim.timeRemainingMs<=0){const winner=opponentFor(m,victim.id);completeMatch(m,winner?.id||null,at,"timer",victim.id)}return true
  }

  function killAgent(m,victimId,killerId,at,{kind="combat",trapId="",trapName=""}={}){
    const victim=modelFor(m,victimId),killer=modelFor(m,killerId);if(!m||!victim||victim.status!=="active"||m.state==="match-complete")return false;
    const deathRoom=String(victim.roomId||"");if(killer&&String(killer.id)!==String(victim.id))transferAllCarried(victim,killer);
    victim.hp=0;victim.status="ghost";victim.invulnerableUntil=Number.MAX_SAFE_INTEGER;victim.r58DeathRoomId=deathRoom;victim.r58RespawnAt=at+RESPAWN_BEAT_MS;victim.respawnAt=Number.MAX_SAFE_INTEGER;victim.ghostUntil=Number.MAX_SAFE_INTEGER;
    const serial=++state.deathSerial;victim.r58Death={serial,kind,trapId,trapName,killerId:killer?.id||null,deathRoomId:deathRoom,at,respawnAt:victim.r58RespawnAt};
    penaliseClock(m,victim,at);if(killer&&String(killer.id)!==String(victim.id))killer.knockouts=Math.max(0,Number(killer.knockouts||0))+1;
    m.events?.push?.({type:"spy-r58-death",playerId:victim.id,victimId:victim.id,attackerId:killer?.id||null,ownerId:killer?.id||null,kind,trapId,trapType:trapId,deathSerial:serial,penaltyMs:DEATH_PENALTY_MS,at});
    if(kind==="trap")state.trapKills++;else state.combatKills++;return true
  }

  function trapEffect(player,trap,at){
    const effect=String(trap?.effect||"");const duration=Math.max(0,Number(trap?.effectMs||0));player.effects=player.effects||{};
    if(effect==="slow")player.effects.slow=at+Math.max(duration,3500);
    else if(effect==="obscure-reveal"){player.effects.slow=at+Math.max(duration,2800);player.effects["obscure-reveal"]=at+Math.max(duration,2800);player.revealedUntil=Math.max(Number(player.revealedUntil||0),at+Math.max(duration,2800))}
    else if(duration>0)player.effects[effect]=at+duration
  }

  function triggerTrapR58(m,playerId,target,at=now()){
    if(!m||m.state==="match-complete")return false;const victim=modelFor(m,playerId);if(!victim||victim.status!=="active")return false;
    const placed=(m.traps||[]).find(entry=>entry?.armed&&String(entry.roomId)===String(victim.roomId)&&entry.targetType===target?.type&&(entry.targetId==null||String(entry.targetId)===String(target?.id)));if(!placed)return false;
    if(String(placed.ownerId)===String(victim.id)){state.ownerTrapIgnores++;return false}
    const trap=window.CCGLostSizzlerSaboteurs?.TRAPS?.[placed.trapId]||baseSaboteurs?.TRAPS?.[placed.trapId]||{};
    if(trap.counter&&victim.counter===trap.counter){placed.armed=false;victim.counter=null;m.events?.push?.({type:"trap-disarmed",playerId:victim.id,trapId:placed.id,at});return true}
    placed.armed=false;const owner=modelFor(m,placed.ownerId);if(owner)owner.trapHits=Math.max(0,Number(owner.trapHits||0))+1;trapEffect(victim,trap,at);
    m.events?.push?.({type:"trap-triggered",trapId:placed.id,trapType:placed.trapId,ownerId:placed.ownerId,victimId:victim.id,playerId:victim.id,selfTriggered:false,instantDeath:true,penaltyMs:DEATH_PENALTY_MS,at});
    return killAgent(m,victim.id,placed.ownerId,at,{kind:"trap",trapId:String(placed.trapId||""),trapName:String(trap?.name||placed.trapId||"TRAP")})
  }

  function useWeaponR58(m,attackerId,targetId,at=now()){
    if(!m||m.state==="match-complete")return false;const attacker=modelFor(m,attackerId),target=modelFor(m,targetId);if(!attacker||!target||attacker.status!=="active"||target.status!=="active"||String(attacker.roomId)!==String(target.roomId))return false;
    const weapon=attacker.weapon||{id:"melee",name:"Rolled-Up Rulebook",uses:Infinity,damage:1,knockback:1,effect:"bonk"};if(Number(weapon.uses)<=0)return false;if(Number.isFinite(Number(weapon.uses)))weapon.uses=Math.max(0,Number(weapon.uses)-1);
    const duration=Math.max(0,Number(weapon.effectMs||0));target.effects=target.effects||{};if(duration>0)target.effects[String(weapon.effect||"hit")]=at+duration;
    const damage=Math.max(0,Math.round(Number(weapon.damage)||0));if(damage>0)target.hp=Math.max(0,Number(target.hp||0)-damage);
    m.events?.push?.({type:"weapon-used",attackerId:attacker.id,targetId:target.id,weaponId:String(weapon.id||"melee"),remainingUses:weapon.uses,at});
    if(target.hp<=0)return killAgent(m,target.id,attacker.id,at,{kind:"combat",trapName:String(weapon.name||"MELEE")});return true
  }

  function damagePlayerR58(m,playerId,amount,attackerId,at=now(),source="combat"){
    const player=modelFor(m,playerId);if(!player||player.status!=="active"||m?.state==="match-complete"||at<Number(player.invulnerableUntil||0))return false;player.hp=Math.max(0,Number(player.hp||0)-Math.max(0,Math.round(Number(amount)||0)));if(player.hp<=0)killAgent(m,player.id,attackerId,at,{kind:String(source).startsWith("trap:")?"trap":"combat",trapId:String(source).startsWith("trap:")?String(source).slice(5):""});return true
  }

  function beginExtractionR58(m,playerId,at=now()){
    const api=window.CCGLostSizzlerSaboteurs,player=modelFor(m,playerId);if(!m||m.state!=="playing"||!player||player.status!=="active"||String(player.roomId)!==String(m.map?.extractionRoomId)||!api?.hasCompleteCase?.(player))return false;
    m.extraction=null;m.r58Extraction={playerId:player.id,startedAt:at,completesAt:at+EXTRACTION_MS};m.events?.push?.({type:"extraction-start",playerId:player.id,completesAt:at+EXTRACTION_MS,r58:true,at});return true
  }

  function chooseRespawnRoom(m,player,at){
    const killer=modelFor(m,player?.r58Death?.killerId),deathRoom=String(player?.r58DeathRoomId||"");let rooms=(m?.map?.rooms||[]).filter(room=>String(room.id)!==deathRoom&&String(room.id)!==String(killer?.roomId||"")&&!room.extraction);
    const armedRooms=new Set((m?.traps||[]).filter(trap=>trap?.armed&&String(trap.ownerId)!==String(player?.id)).map(trap=>String(trap.roomId)));const safer=rooms.filter(room=>!armedRooms.has(String(room.id)));if(safer.length)rooms=safer;
    if(!rooms.length)rooms=(m?.map?.rooms||[]).filter(room=>String(room.id)!==deathRoom);if(!rooms.length)return null;
    const graph=baseSaboteurs?.graphDistance||window.CCGLostSizzlerSaboteurs?.graphDistance;rooms.sort((a,b)=>{const da=typeof graph==="function"&&killer?Number(graph(m.map,killer.roomId,a.id)):0,db=typeof graph==="function"&&killer?Number(graph(m.map,killer.roomId,b.id)):0;return db-da||String(a.id).localeCompare(String(b.id))});
    const far=rooms.filter(room=>{if(typeof graph!=="function"||!killer)return true;return Number(graph(m.map,killer.roomId,room.id))>=2});const pool=far.length?far:rooms;const hash=baseSaboteurs?.hash32?.(`${m.seed}|${player.id}|${at}|R58-RESPAWN`)??0;return pool[Math.abs(Number(hash)||0)%pool.length]
  }

  function respawnR58(m,at){
    if(!authoritative()||!m||m.state==="match-complete")return false;let changed=false;
    for(const player of m.players||[]){if(player?.status!=="ghost"||at<Number(player.r58RespawnAt||Infinity))continue;const room=chooseRespawnRoom(m,player,at);if(!room)continue;player.status="active";player.hp=Math.max(1,Number(player.maxHp||6));player.roomId=room.id;player.invulnerableUntil=at+1400;player.roomEnteredAt=at;player.respawnAt=0;player.ghostUntil=0;player.r58RespawnAt=0;m.events?.push?.({type:"ghost-respawn",playerId:player.id,roomId:room.id,r58:true,at});state.respawns++;changed=true}
    return changed
  }

  function tickExtractionR58(m,at){
    const ex=m?.r58Extraction;if(!ex||m.state==="match-complete")return false;const api=window.CCGLostSizzlerSaboteurs,player=modelFor(m,ex.playerId);
    if(!player||player.status!=="active"||String(player.roomId)!==String(m.map?.extractionRoomId)||!api?.hasCompleteCase?.(player)){m.r58Extraction=null;m.events?.push?.({type:"extraction-cancelled",playerId:ex.playerId,r58:true,at});return false}
    if(at<Number(ex.completesAt||0))return false;return completeMatch(m,player.id,at,"extraction",opponentFor(m,player.id)?.id||null)
  }

  function timerWinner(m,expired){const other=opponentFor(m,expired?.id);if(other)return other;return [...(m.players||[])].sort((a,b)=>Number(b.timeRemainingMs||0)-Number(a.timeRemainingMs||0)||itemCount(b)-itemCount(a)||Number(b.knockouts||0)-Number(a.knockouts||0))[0]||null}
  function tickClocks(m,at){
    if(!authoritative()||!m||m.state!=="playing")return false;const previous=finite(m.r58ClockAt)?Number(m.r58ClockAt):at,delta=Math.max(0,at-previous);m.r58ClockAt=at;if(!delta)return false;
    for(const player of m.players||[])player.timeRemainingMs=Math.max(0,Number(player.timeRemainingMs??MATCH_MS)-delta);
    const expired=(m.players||[]).find(player=>Number(player.timeRemainingMs||0)<=0);if(expired){const winner=timerWinner(m,expired);completeMatch(m,winner?.id||null,at,"timer",expired.id)}return true
  }

  function normaliseMatch(m,at=now()){
    if(!m||!spyActive())return false;const key=`${String(m.seed||"")}|${String(active()?.hostId||"")}|R58`;if(m.r58Rules&&state.matchKey===key)return false;
    m.r58Rules=true;m.r58Version=58;m.bestOf=1;m.roundsToWin=1;m.round=Math.max(1,Number(m.round||1));m.roundWinnerId=null;m.suddenDeathEndsAt=0;m.roundEndsAt=Number.MAX_SAFE_INTEGER;m.r58StartedAt=at;m.r58ClockAt=at;m.r58Extraction=null;m.extraction=null;m.trapLoadout=[...CLASSIC_TRAPS];m.state=m.state==="match-complete"?m.state:"playing";m.wins=m.wins||{};
    for(const player of m.players||[]){player.timeRemainingMs=MATCH_MS;player.r58PenaltyCount=0;player.r58RespawnAt=0;player.r58Death=null;player.r58DeathRoomId="";player.status="active";player.hp=Math.max(1,Number(player.maxHp||player.hp||6));player.respawnAt=0;player.ghostUntil=0;player.invulnerableUntil=0;player.trapCharges=Math.max(3,Number(player.trapCharges||0))}
    m.events?.push?.({type:"spy-r58-start",matchMs:MATCH_MS,deathPenaltyMs:DEATH_PENALTY_MS,trapLoadout:[...CLASSIC_TRAPS],at});state.matchKey=key;state.lastTickAt=at;return true
  }

  function clearArray(owner,name,keep=null){try{const list=owner?.[name];if(!Array.isArray(list))return 0;const before=list.length;if(keep){const next=list.filter(keep);if(next.length!==before)list.splice(0,list.length,...next)}else list.length=0;return before-list.length}catch(_){return 0}}
  function purgeSoloState(){
    if(!spyActive())return 0;let removed=0;
    try{for(const name of SOLO_ARRAYS)removed+=clearArray(host,name)}catch(_){}
    try{removed+=clearArray(host,"doors",row=>Boolean(row?.spyR32Door||row?.spyDoor));removed+=clearArray(host,"blockingDecor",row=>Boolean(row?.spyR32Furniture||row?.spyFurniture))}catch(_){}
    try{removed+=clearArray(world,"decor",row=>Boolean(row?.spyR32Furniture||row?.spyFurniture))}catch(_){}
    for(const name of ["stalker","guardian","sigilWarden","rescue","objective","startShop","trader","rareVortexPit","memoryPuzzle","sequenceTorchPuzzle","weightBridge","bloodClue","spiderNest","skeletonHorde"]){try{if(host?.[name]){host[name]=null;removed++}}catch(_){}}
    try{host.keysCollected=0;host.exitSigilCollected=false;host.sigilRoomId=null}catch(_){}
    try{if(typeof enemyBullets!=="undefined"&&Array.isArray(enemyBullets)){removed+=enemyBullets.length;enemyBullets.length=0}}catch(_){}
    try{if(typeof bullets!=="undefined"&&Array.isArray(bullets)){removed+=bullets.length;bullets.length=0}}catch(_){}
    try{if(typeof hazards!=="undefined"&&Array.isArray(hazards)){removed+=hazards.length;hazards.length=0}}catch(_){}
    try{if(run){run.specialMode=MODE_ID;run.modifier=null;run.floorComplete=false;run.runComplete=false}}catch(_){}
    if(removed){state.soloObjectsRemoved+=removed;state.soloPurges++;try{host.revision=(host.revision||0)+1}catch(_){}}return removed
  }

  function patchInputOwnership(){
    if(state.inputPatched||typeof Event==="undefined"||!Event.prototype?.stopImmediatePropagation)return state.inputPatched;
    nativeStopImmediate=Event.prototype.stopImmediatePropagation;
    Event.prototype.stopImmediatePropagation=function stopImmediatePropagationR58Spy(){
      try{if(spyActive()&&this instanceof KeyboardEvent&&["KeyT","KeyX"].includes(String(this.code||""))){state.trapKeyPasses+=this.code==="KeyT"?1:0;Event.prototype.stopPropagation.call(this);return}}
      catch(_){}
      return nativeStopImmediate.call(this)
    };
    state.inputPatched=true;return true
  }

  function patchSaboteurRules(){
    const current=window.CCGLostSizzlerSaboteurs;if(!current)return false;if(current.__ccgV141R58SpyRules){state.rulesPatched=true;return true}if(!baseSaboteurs)baseSaboteurs=current;
    const wrapped=Object.freeze({...current,
      MATCH_MS,DEATH_PENALTY_MS,R58_RESPAWN_MS:RESPAWN_BEAT_MS,
      triggerTrap:triggerTrapR58,useWeapon:useWeaponR58,damagePlayer:damagePlayerR58,
      knockout:(m,playerId,attackerId,at,source)=>killAgent(m,playerId,attackerId,at,{kind:String(source||"").startsWith("trap:")?"trap":"combat",trapId:String(source||"").startsWith("trap:")?String(source).slice(5):""}),
      respawnPlayers:respawnR58,beginExtraction:beginExtractionR58,tickExtraction:tickExtractionR58,
      __ccgV141R58SpyRules:true
    });
    window.CCGLostSizzlerSaboteurs=wrapped;state.rulesPatched=true;return true
  }

  function observeDeaths(){
    const m=match();if(!spyActive()||!m)return false;let changed=false;
    for(const player of m.players||[]){const death=player?.r58Death,serial=Number(death?.serial||0),seen=Number(state.seenDeaths.get(String(player.id))||0);if(!serial||serial<=seen)continue;state.seenDeaths.set(String(player.id),serial);showDeathFx(m,player,death);changed=true}
    return changed
  }

  function repairClassicTrapTargets(){
    if(!spyActive())return false;let changed=false;
    try{for(const row of host?.blockingDecor||[])if(row?.spyFurniture&&!row.spyR32Furniture){row.spyR32Furniture=true;changed=true}for(const row of host?.doors||[])if(row?.spyDoor&&!row.spyR32Door){row.spyR32Door=true;changed=true}}catch(_){}
    return changed
  }

  function tick(){
    try{
      if(!spyActive()){if(state.wasSpy){state.wasSpy=false;state.matchKey="";state.seenDeaths.clear();document.querySelectorAll(".spy-r58-death-fx").forEach(node=>node.dataset.visible="false")}return false}
      state.wasSpy=true;patchInputOwnership();patchSaboteurRules();const m=match();if(!m)return false;normaliseMatch(m);m.roundEndsAt=Number.MAX_SAFE_INTEGER;m.suddenDeathEndsAt=0;m.extraction=null;m.trapLoadout=[...CLASSIC_TRAPS];repairClassicTrapTargets();purgeSoloState();
      if(authoritative()&&m.state==="playing"){const t=now();tickClocks(m,t);respawnR58(m,t);tickExtractionR58(m,t)}
      observeDeaths();renderClocks();try{r32()?.renderInventory?.()}catch(_){};state.lastError="";return true
    }catch(error){state.lastError=String(error?.message||error);console.warn("[Lost Sizzler r58] Spy overhaul tick failed safely",error);return false}
  }

  function install(){patchInputOwnership();patchSaboteurRules();ensureUi();if(!state.timer)state.timer=setInterval(tick,TICK_MS);state.installed=true;tick();return true}

  install();
  addEventListener("focus",()=>{if(spyActive())tick()},{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&spyActive())tick()},{passive:true});
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerV141R58SpyOverhaul={
    MATCH_MS,DEATH_PENALTY_MS,RESPAWN_BEAT_MS,EXTRACTION_MS,CLASSIC_TRAPS,
    install,tick,normaliseMatch,purgeSoloState,patchSaboteurRules,patchInputOwnership,
    triggerTrapR58,useWeaponR58,damagePlayerR58,killAgent,transferAllCarried,respawnR58,chooseRespawnRoom,
    beginExtractionR58,tickExtractionR58,tickClocks,completeMatch,renderClocks,observeDeaths,
    get state(){return state}
  };
})();
