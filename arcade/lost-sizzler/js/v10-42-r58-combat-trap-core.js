/* C64 Dungeon Carnage V10.42 r58 — authoritative FIRE + ordinary floor-trap core. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R58CombatTrapCore)return;

  const ATTACK_BUFFER_MS=700;
  const SPECIAL_BLOCK=new Set(["horde-survivor","sizzler-saboteurs"]);
  const trapContacts=new Map();
  const state={installed:false,shots:0,shotBlocks:0,shotBuffers:0,lastShotBlock:"",trapContacts:0,trapHits:0,trapRetries:0,trapRearms:0,trapHitsByKind:{fire:0,spike:0,shock:0,other:0}};

  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const runActive=()=>document.body?.dataset?.runActive==="true";
  const playing=()=>{try{return String(mode)==="playing"}catch(_){return false}};
  const ordinaryDungeon=()=>runActive()&&playing()&&!SPECIAL_BLOCK.has(specialType());
  const isPlayer2=p=>{try{return Boolean(p2)&&p===p2}catch(_){return false}};
  const playerId=p=>String(p?.id||p?.name||(isPlayer2(p)?"P2":"P1"));
  const trapId=t=>String(t?.id||`${t?.x},${t?.y}`);
  const worldKey=()=>{try{return `${String(run?.seed||"run")}|F${Math.max(1,Number(run?.floor||1))}`}catch(_){return"run|F1"}};
  const contactKey=(p,t)=>`${worldKey()}|${playerId(p)}|${trapId(t)}`;

  function deepestOriginal(fn){
    const seen=new Set();let current=fn,last=typeof fn==="function"?fn:null;
    while(typeof current==="function"&&!seen.has(current)){seen.add(current);last=current;current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null}
    return last
  }
  const canonicalHurtPlayer=deepestOriginal(window.hurtPlayer);

  function localPlayerList(){try{return typeof localPlayers==="function"?localPlayers():[typeof p1!=="undefined"?p1:null,typeof p2!=="undefined"?p2:null].filter(Boolean)}catch(_){return[]}}
  function trapActive(trap,now=performance.now()){if(!trap?.active)return false;try{return typeof SYS?.trapActive==="function"?Boolean(SYS.trapActive(trap,now)):true}catch(_){return true}}
  function trapCycleId(trap,now=performance.now()){const period=Number(trap?.period),phase=Number(trap?.phase)||0,stamp=Number(now);if(!Number.isFinite(period)||period<=0||!Number.isFinite(stamp))return 0;return Math.floor((stamp+phase)/period)}

  function rearmTrapContacts(){
    if(!runActive()){if(trapContacts.size){state.trapRearms+=trapContacts.size;trapContacts.clear()}return true}
    const now=performance.now(),live=new Set();
    try{
      for(const p of localPlayerList())for(const t of host?.traps||[]){
        if(!p||!t)continue;
        const key=contactKey(p,t),occupied=Number(p.x)===Number(t.x)&&Number(p.y)===Number(t.y);
        if(!occupied||!trapActive(t,now))continue;
        live.add(key);
        const record=trapContacts.get(key),cycle=trapCycleId(t,now);
        if(record&&record.cycle!==cycle){trapContacts.delete(key);state.trapRearms++}
      }
    }catch(_){}
    for(const key of [...trapContacts.keys()])if(!live.has(key)){trapContacts.delete(key);state.trapRearms++}
    return true
  }

  function emitTrapDamage(p,t){
    const detail={playerId:playerId(p),trapId:trapId(t),kind:String(t?.kind||"floor"),x:Number(t?.x),y:Number(t?.y),at:Number(p?.__ccgLastDamageAt||performance.now())};
    try{const reporter=window.CCGLostSizzlerBugReporter;if(typeof reporter?.recordTrapDamage==="function")reporter.recordTrapDamage(detail);else dispatchEvent(new CustomEvent("ccg:trap-damage",{detail}))}catch(_){}
  }

  function applyTrapDamage(p,t){
    if(!ordinaryDungeon()||!p||Number(p.health||0)<=0||!t?.active)return false;
    if(Number(p.x)!==Number(t.x)||Number(p.y)!==Number(t.y))return false;
    const now=performance.now();if(!trapActive(t,now))return false;
    const key=contactKey(p,t),cycle=trapCycleId(t,now),record=trapContacts.get(key);state.trapContacts++;
    if(record?.cycle===cycle)return true;
    const beforeHealth=Number(p.health||0),beforeArmor=Number(p.armor||0),beforeInvuln=Number(p.invuln||0),beforeDeaths=Number(run?.stats?.deaths||0);
    if(beforeHealth<=0||typeof canonicalHurtPlayer!=="function")return false;
    let threw=false;
    try{p.armor=0;p.invuln=0;canonicalHurtPlayer.call(window,p,1,false,`${String(t.kind||"floor")} trap`)}
    catch(error){threw=true;throw error}
    finally{p.armor=beforeArmor;if(threw)p.invuln=beforeInvuln}
    const healthLost=Number(p.health||0)<beforeHealth,deathRecorded=Number(run?.stats?.deaths||0)>beforeDeaths;
    if(!healthLost&&!deathRecorded){p.invuln=beforeInvuln;state.trapRetries++;return false}
    trapContacts.set(key,{cycle,at:now});
    const raw=String(t.kind||"other").toLowerCase(),kind=["fire","spike","shock"].includes(raw)?raw:"other";
    state.trapHits++;state.trapHitsByKind[kind]=(Number(state.trapHitsByKind[kind])||0)+1;
    try{S?.sfx?.("trap");showToast?.(`${String(t.kind||"floor").toUpperCase()} TRAP`,"-1 health.","red")}catch(_){}
    emitTrapDamage(p,t);
    return true
  }

  function triggerTrapFresh(p){
    if(!ordinaryDungeon()||!p)return false;
    rearmTrapContacts();const now=performance.now();
    for(const t of host?.traps||[])if(t?.active&&Number(t.x)===Number(p.x)&&Number(t.y)===Number(p.y)&&trapActive(t,now))return applyTrapDamage(p,t);
    return false
  }

  function updateTrapContacts(){
    if(!ordinaryDungeon())return false;
    rearmTrapContacts();const now=performance.now();let handled=false;
    for(const p of localPlayerList()){
      if(!p||Number(p.health||0)<=0)continue;
      for(const t of host?.traps||[]){
        if(!t?.active||Number(t.x)!==Number(p.x)||Number(t.y)!==Number(p.y)||!trapActive(t,now))continue;
        handled=applyTrapDamage(p,t)||handled;break;
      }
    }
    return handled
  }

  function attackDirectionFresh(p,requested){try{if(typeof attackDirection==="function")return attackDirection(p,requested)}catch(_){}const source=requested&&(requested.x||requested.y)?requested:p?.dir,x=Math.sign(Number(source?.x||0)),y=Math.sign(Number(source?.y||0));return x||y?{x,y}:{x:1,y:0}}
  function activeProjectiles(p){try{return (bullets||[]).filter(b=>b?.ttl>0&&b.owner===p?.id).length}catch(_){return 0}}

  function queueAttackFresh(p){
    if(!p)return false;
    try{if(isPlayer2(p))fireBuffer2=Math.max(Number(fireBuffer2||0),ATTACK_BUFFER_MS);else fireBuffer1=Math.max(Number(fireBuffer1||0),ATTACK_BUFFER_MS);state.shotBuffers++;return true}catch(_){return false}
  }

  function firePlayerFresh(p,requestedDirection){
    if(!p||!ordinaryDungeon()){state.shotBlocks++;state.lastShotBlock="not-playing";return false}
    if(Number(p.hitStunMs||0)>0){state.shotBlocks++;state.lastShotBlock="hit-stun";return false}
    let cooldown=0;try{cooldown=Number(isPlayer2(p)?fire2:fire1)||0}catch(_){}
    if(cooldown>0){state.shotBlocks++;state.lastShotBlock="cooldown";return false}
    const w=p.weapon||((typeof baseWeapon==="function")?baseWeapon():null);
    if(!w){state.shotBlocks++;state.lastShotBlock="no-weapon";return false}
    const active=activeProjectiles(p),max=Math.max(1,Number(C?.player?.maxProjectiles||1)+Math.max(0,Number(w.shots||1)-1));
    if(active>=max){state.shotBlocks++;state.lastShotBlock="projectile-cap";try{S?.sfx?.("empty")}catch(_){}return false}
    if(Number(p.mana||0)<1){
      state.shotBlocks++;state.lastShotBlock="no-ammo";try{S?.sfx?.("empty")}catch(_){}
      try{if(Number(p.mana||0)<=0&&!(p.emergencyRechargeMs>0)){p.emergencyRechargeMs=C.player.emergencyRechargeMs;showToast?.("EMERGENCY CAPACITOR CHARGING",`You are completely dry. Survive for ${Math.ceil(C.player.emergencyRechargeMs/1000)} seconds and the reserve capacitor will restore ${C.player.emergencyAmmo} emergency shots.`,"red",8500)}else showToast?.("LOW AMMO","Find a supply pack or switch tactics.","red")}catch(_){}
      return false
    }
    const direction=attackDirectionFresh(p,requestedDirection),dirs=typeof weaponDirections==="function"?weaponDirections(p,direction):[direction],selected=(dirs||[direction]).slice(0,Math.max(1,max-active));
    if(!selected.length){state.shotBlocks++;state.lastShotBlock="no-direction";return false}
    const beforeCount=activeProjectiles(p),beforeMana=Number(p.mana||0);
    p.dir=direction;p.mana=beforeMana-1;p.ammoFlashMs=C.player.ammoFlashMs;p._fireAnimAt=performance.now();
    const delay=(p.rapidMs>0?88:C.player.fireDelay)*(Number(w.delay||1));p._fireAnimMs=Math.max(120,Math.min(260,Number(delay)||180));
    for(const z of selected){
      const b={id:`${p.id}-${Date.now()}-${Math.random()}`,owner:p.id,ownerName:p.name,x:p.x,y:p.y,dx:z.x,dy:z.y,ttl:w.ttl||18,power:(w.power||1)+(p.damageBonus||0),pierce:w.pierce||0,element:w.element||"energy",style:w.id||"pulse"};
      try{spawnBullet(b,false);if(playMode==="online"&&!isPlayer2(p))net.send("shot",b)}catch(_){}
    }
    if(activeProjectiles(p)<=beforeCount){p.mana=beforeMana;state.shotBlocks++;state.lastShotBlock="spawn-failed";return false}
    try{run.alert=Math.min(100,Number(run.alert||0)+1.8);if(isPlayer2(p))fire2=delay;else fire1=delay;S?.sfx?.("fire");muzzle?.(p.x,p.y,direction);sync?.()}catch(_){}
    state.shots++;state.lastShotBlock="";return true
  }

  function attackNow(){
    let p=null;try{p=p1||null}catch(_){}if(!p||!ordinaryDungeon())return false;
    let cooldown=0;try{cooldown=Number(fire1||0)}catch(_){}
    if(cooldown>0)return queueAttackFresh(p);
    const fired=firePlayerFresh(p,attackDirectionFresh(p));
    if(fired){try{fireBuffer1=0}catch(_){}return true}
    if(state.lastShotBlock==="cooldown"||state.lastShotBlock==="hit-stun")return queueAttackFresh(p);
    return false
  }

  function resetAttackState(){
    try{input?.delete?.("Space");input?.delete?.("Numpad0");fireBuffer1=0;if(!Number.isFinite(Number(fire1))||Number(fire1)<0||Number(fire1)>5000)fire1=0;if(!Number.isFinite(Number(projectileCD))||Number(projectileCD)<0||Number(projectileCD)>1000)projectileCD=0}catch(_){}
    return true
  }

  firePlayerFresh.__ccgV142R58AuthoritativeFire=true;
  triggerTrapFresh.__ccgV142R58AuthoritativeTrap=true;
  queueAttackFresh.__ccgV142R58AuthoritativeQueue=true;
  window.firePlayer=firePlayerFresh;window.triggerTrap=triggerTrapFresh;window.queueAttack=queueAttackFresh;
  state.installed=true;
  window.CCGLostSizzlerV142R58CombatTrapCore=Object.freeze({version:"V10.42-r58-combat-trap-core",state,trapContacts,trapActive,trapCycleId,rearmTrapContacts,applyTrapDamage,triggerTrap:triggerTrapFresh,updateTrapContacts,firePlayer:firePlayerFresh,queueAttack:queueAttackFresh,attackNow,resetAttackState});
})();
