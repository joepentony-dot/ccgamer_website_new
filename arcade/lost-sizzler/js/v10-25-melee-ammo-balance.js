/* The Lost Sizzler V10.25 — sword-first combat, scarce firearm ammo and very rare melee finds. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_MELEE_AMMO_V125__)return;
  window.__CCG_LOST_SIZZLER_MELEE_AMMO_V125__=true;

  const MAX_START_AMMO=60;
  const FLOOR_AMMO_ARCADE=3;
  const FLOOR_AMMO_LOW=2;
  const FLOOR_AMMO_CASUAL=4;
  const FLOOR_MELEE_FIND_CHANCE=.05;
  const FLOOR_MELEE_PITY_STEP=.015;
  const FLOOR_MELEE_MAX_CHANCE=.095;
  const FIRST_GUN_MAGAZINE=16;
  const RESPAWN_AMMO=6;
  const START_SWORD={id:"archive-sword",name:"Archive Sword",short:"SWORD",rarity:"STARTER",power:1,cooldown:390,colour:"#ffd85a",desc:"Reliable close-range sword. Unlimited use and strong enough to knock ordinary enemies into hazards."};
  const RARE_MELEE=[
    {id:"sid-sabre",name:"SID Sabre",short:"SID SABRE",rarity:"SIZZLER",power:4,cooldown:420,weight:65,colour:"#6cecff",desc:"A very rare melee find with heavy close-range damage."},
    {id:"gold-medal-greatsword",name:"Gold Medal Greatsword",short:"GOLD BLADE",rarity:"GOLD MEDAL",power:6,cooldown:540,weight:28,colour:"#ffd85a",desc:"Exceptionally rare. Slow, brutal and capable of flattening ordinary enemies."},
    {id:"zzap-power-blade",name:"Zzap! 97% Power Blade",short:"97% BLADE",rarity:"ZZAP! 97%",power:8,cooldown:620,weight:7,colour:"#ff5bae",desc:"An extremely rare melee weapon with enormous single-hit damage."}
  ];
  const installed={players:false,combat:false,items:false,world:false,hud:false,survival:false,tutorial:false};

  const hash32=value=>{let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const unit=value=>hash32(value)/4294967296;
  const cloneMelee=w=>({...w});
  const tutorialState=()=>window.CCGLostSizzlerOnboardingV120?.state||null;
  const hasGun=p=>Boolean(p?.firearmUnlocked&&p?.weapon);
  const meleeFor=p=>p?.meleeWeapon||START_SWORD;
  const meleeMastery=p=>Math.floor(Math.max(0,Number(p?.level||1)-1)/5);
  const meleeDamageFor=p=>Math.max(1,Number(meleeFor(p).power||1)+meleeMastery(p)+Math.floor(Number(p?.damageBonus||0)*.5));
  const toneFor=rarity=>rarity==="ZZAP! 97%"?"red":rarity==="GOLD MEDAL"?"gold":"cyan";

  function configureAmmoModel(){
    try{
      if(window.CCG_CONFIG?.player){
        window.CCG_CONFIG.player.maxMana=MAX_START_AMMO;
        window.CCG_CONFIG.player.emergencyAmmo=0;
        window.CCG_CONFIG.player.emergencyRechargeMs=0;
      }
    }catch(_){}
  }

  function normaliseExistingPlayer(p){
    if(!p)return;
    p.maxMana=Math.max(MAX_START_AMMO,Math.min(Number(p.maxMana||MAX_START_AMMO),140));
    p.mana=Math.max(0,Math.min(Number(p.mana||0),p.maxMana));
    p.meleeWeapon=p.meleeWeapon?{...p.meleeWeapon}:cloneMelee(START_SWORD);
    if(p.firearmUnlocked===undefined)p.firearmUnlocked=Boolean(p.weapon&&p.weapon.id!=="pulse-start-placeholder");
    if(!p.firearmUnlocked)p.weapon=null;
    p.emergencyRechargeMs=0;
  }

  function installPlayers(){
    if(installed.players||typeof makePlayer!=="function"||typeof preservePlayer!=="function")return;
    const oldMake=makePlayer,oldPreserve=preservePlayer;
    makePlayer=function makePlayerV125(id,name,x,y){
      const p=oldMake(id,name,x,y);
      p.maxMana=MAX_START_AMMO;
      p.mana=0;
      p.weapon=null;
      p.firearmUnlocked=false;
      p.meleeWeapon=cloneMelee(START_SWORD);
      p.emergencyRechargeMs=0;
      return p;
    };
    preservePlayer=function preservePlayerV125(old,x,y){
      const p=oldPreserve(old,x,y);
      p.maxMana=Math.max(MAX_START_AMMO,Math.min(Number(old?.maxMana||MAX_START_AMMO),140));
      p.mana=Math.max(0,Math.min(Number(old?.mana||0),p.maxMana));
      p.firearmUnlocked=old?.firearmUnlocked===undefined?Boolean(old?.weapon):Boolean(old.firearmUnlocked);
      p.weapon=p.firearmUnlocked&&old?.weapon?{...old.weapon}:null;
      p.meleeWeapon=old?.meleeWeapon?{...old.meleeWeapon}:cloneMelee(START_SWORD);
      p.emergencyRechargeMs=0;
      return p;
    };
    installed.players=true;
  }

  function slashFx(p,d,melee){
    try{
      const tx=p.x+Math.sign(d.x||0),ty=p.y+Math.sign(d.y||0),col=melee.colour||"#ffd85a";
      ring(tx,ty,col,24);
      for(let i=0;i<10;i++)particles.push({x:(p.x+.5+(d.x||0)*(.35+i*.025))*C.tile,y:(p.y+.5+(d.y||0)*(.35+i*.025))*C.tile,vx:(Math.random()-.5)*1.7,vy:(Math.random()-.5)*1.7,life:120+i*15,col,size:1.4+Math.random()*2.2,drag:.91,glow:7});
    }catch(_){}
  }

  function meleeAttack(p,d){
    if(!p||typeof mode==="undefined"||mode!=="playing"||(p.hitStunMs||0)>0)return false;
    const cd=p===p2?fire2:fire1;if(cd>0)return false;
    const melee=meleeFor(p),dir=d&&(d.x||d.y)?{x:Math.sign(d.x),y:Math.sign(d.y)}:(p.dir||{x:1,y:0});
    p.dir=dir;
    p._meleeSwingAt=performance.now();p._meleeSwingMs=Math.max(220,Math.min(320,Number(melee.cooldown||390)*.68));p._meleeSwingDir={...dir};p._meleeSwingColour=melee.colour||"#ffd85a";
    if(p===p2)fire2=Number(melee.cooldown||390);else fire1=Number(melee.cooldown||390);
    p.emergencyRechargeMs=0;
    try{S.sfx("dash")}catch(_){}
    slashFx(p,dir,melee);
    const tx=p.x+dir.x,ty=p.y+dir.y;
    const enemy=(host?.enemies||[]).find(e=>e?.alive&&e.x===tx&&e.y===ty);
    const generator=(host?.generators||[]).find(g=>g?.alive&&g.x===tx&&g.y===ty);
    let hit=false;
    if(enemy){
      const damage=meleeDamageFor(p);
      damageEnemy(enemy,damage,"physical",p);hit=true;
      try{floatText(tx,ty,melee.rarity==="STARTER"?"SLASH!":`${melee.short}!`,melee.colour||P.gold,{life:620})}catch(_){}
    }else if(generator){
      damageGenerator(generator,meleeDamageFor(p),p);hit=true;
    }else if(typeof damageFurnitureAt==="function"&&damageFurnitureAt(tx,ty,meleeDamageFor(p),p))hit=true;
    else if(host?.stalker?.awake&&host.stalker.x===tx&&host.stalker.y===ty){
      hit=true;try{S.sfx("stalker");showToast(`${String(C.stalker.name||"Count Loadula").toUpperCase()} RESISTS THE BLADE`,`Melee can push ordinary enemies into danger, but ${C.stalker.name||"Count Loadula"} still requires a Banishment Flask.`,"red",6200)}catch(_){}
    }
    try{if(run)run.alert=Math.min(100,Number(run.alert||0)+(hit?.45:.2));if(hit)shake=Math.max(shake,1.6)}catch(_){}
    const ts=tutorialState();if(ts?.active&&Number(ts.step)===1)ts.fired=true;
    try{sync()}catch(_){}
    return true;
  }

  function installCombat(){
    if(installed.combat||typeof firePlayer!=="function"||typeof dashPlayer!=="function")return;
    const oldFire=firePlayer;
    firePlayer=function firePlayerV125(p,d){
      if(!p)return;
      const dir=d&&(d.x||d.y)?{x:Math.sign(d.x),y:Math.sign(d.y)}:(p.dir||{x:1,y:0}),tx=p.x+dir.x,ty=p.y+dir.y;
      const adjacentEnemy=(host?.enemies||[]).some(e=>e?.alive&&e.x===tx&&e.y===ty),adjacentFurniture=(host?.blockingDecor||[]).some(item=>item?.x===tx&&item?.y===ty);
      /* Fire is contextual at one tile: a hostile or smashable directly in the
       * faced cell always receives the unlimited melee swing. Guns are used,
       * and ammunition consumed, only when that close target does not exist. */
      if(adjacentEnemy||adjacentFurniture||!hasGun(p)||Number(p.mana||0)<=0)return meleeAttack(p,dir);
      return oldFire(p,d);
    };
    dashPlayer=function dashPlayerV125(p,d){
      if(!p||!d||typeof mode==="undefined"||mode!=="playing")return false;
      const now=performance.now(),delay=Number(C?.player?.dashDelay||510);
      if(now-Number(p._v125LastDashAt||0)<delay)return false;
      p._v125LastDashAt=now;
      movePlayer(p,d.x,d.y,true);
      const ts=tutorialState();if(ts?.active&&Number(ts.step)===2)ts.dashed=true;
      try{sync()}catch(_){}
      return true;
    };
    if(typeof updateEmergencyAmmo==="function")updateEmergencyAmmo=function updateEmergencyAmmoV125(p){if(p)p.emergencyRechargeMs=0};
    installed.combat=true;
  }

  function rareMeleeFor(key){
    const roll=unit(`${key}|MELEE-TIER`)*100;
    let cursor=0;for(const item of RARE_MELEE){cursor+=item.weight;if(roll<cursor)return cloneMelee(item)}
    return cloneMelee(RARE_MELEE[0]);
  }

  function safeMeleeCell(key){
    if(!world?.rooms||!host)return null;
    const blockedRooms=new Set([world.startRoomId,world.exitRoomId,host.sigilRoomId,host.trader?.roomId,host.startShop?.roomId,host.rescue?.roomId,host.spiderNest?.roomId,host.skeletonHorde?.roomId].filter(v=>v!=null));
    const rooms=world.rooms.filter(r=>r&&!blockedRooms.has(r.id)&&!r.optional&&!r.sanctuary&&!r.dedicatedHazard&&!r.dangerous&&Number(r.depth||0)>=3).sort((a,b)=>hash32(`${key}|ROOM|${a.id}`)-hash32(`${key}|ROOM|${b.id}`));
    for(const room of rooms){
      const cells=[];
      for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++){
        if(world.map?.[y]?.[x]!==0)continue;
        if((host.doors||[]).some(q=>Math.abs(q.x-x)+Math.abs(q.y-y)<=2))continue;
        if((host.items||[]).some(q=>q.active&&q.x===x&&q.y===y))continue;
        if((host.enemies||[]).some(q=>q.alive&&q.x===x&&q.y===y))continue;
        cells.push({x,y});
      }
      cells.sort((a,b)=>hash32(`${key}|CELL|${a.x},${a.y}`)-hash32(`${key}|CELL|${b.x},${b.y}`));
      if(cells[0])return cells[0];
    }
    return null;
  }

  function spawnVeryRareMelee(){
    if(!host||!run||!world||Number(run.floor||1)<2)return false;
    if(window.CCGLostSizzlerOnboardingV120?.state?.active)return false;
    if((host.items||[]).some(i=>i.kind==="meleeWeapon"))return true;
    if((typeof localPlayers==="function"?localPlayers():[]).some(p=>p?.meleeWeapon&&p.meleeWeapon.id!==START_SWORD.id))return true;
    const key=`${run.seed}|F${run.floor}|V125-MELEE`;
    run._v125MeleeRolls=run._v125MeleeRolls&&typeof run._v125MeleeRolls==="object"?run._v125MeleeRolls:{};
    let roll=run._v125MeleeRolls[run.floor];
    if(!roll){
      const pity=Math.max(0,Number(run._v125MeleePity||0)),chance=Math.min(FLOOR_MELEE_MAX_CHANCE,FLOOR_MELEE_FIND_CHANCE+pity*FLOOR_MELEE_PITY_STEP),found=unit(`${key}|ROLL`)<chance;
      roll={found,chance,pity};run._v125MeleeRolls[run.floor]=roll;run._v125MeleePity=found?0:pity+1;
    }
    if(!roll.found)return false;
    const q=safeMeleeCell(key);if(!q)return false;
    const melee=rareMeleeFor(key);
    host.items.push({id:`rare-melee-${run.floor}-${hash32(key).toString(36)}`,...q,kind:"meleeWeapon",meleeWeapon:melee,active:true,title:`${melee.rarity} ${melee.name}`});
    host.revision=(host.revision||0)+1;
    return true;
  }

  function pruneAmmoSupplies(){
    if(!host?.items||!run)return;
    const ammo=host.items.filter(i=>i?.active&&(i.kind==="ammo"||i.kind==="mana"));
    let target=String(run.difficulty||"ARCADE")==="CASUAL"?FLOOR_AMMO_CASUAL:FLOOR_AMMO_ARCADE;
    if(run.modifier?.id==="LOW_AMMO")target=FLOOR_AMMO_LOW;
    const keep=new Set([...ammo].sort((a,b)=>hash32(`${run.seed}|F${run.floor}|AMMO|${a.id}`)-hash32(`${run.seed}|F${run.floor}|AMMO|${b.id}`)).slice(0,target).map(i=>i.id));
    host.items=host.items.filter(i=>!(i?.active&&(i.kind==="ammo"||i.kind==="mana"))||keep.has(i.id));
  }

  function installWorld(){
    if(installed.world||typeof startWorld!=="function")return;
    const oldStart=startWorld;
    startWorld=function startWorldV125(...args){
      const result=oldStart.apply(this,args);
      try{for(const p of typeof localPlayers==="function"?localPlayers():[])normaliseExistingPlayer(p);pruneAmmoSupplies();spawnVeryRareMelee()}catch(error){console.warn("[Lost Sizzler V10.25] world balance pass failed",error)}
      return result;
    };
    installed.world=true;
  }

  function equipMelee(p,melee){
    if(!p||!melee)return false;
    const old=meleeFor(p);p.meleeWeapon={...melee};
    try{S.sfx("elite");showToast(`${melee.rarity} ${melee.name}`,`${melee.desc} Current damage ${meleeDamageFor(p)} including level mastery. This occupies the dedicated melee slot, not an inventory slot.${old?.name?` Replaced ${old.name}.`:""}`,toneFor(melee.rarity),8500)}catch(_){}
    return true;
  }

  function installItems(){
    if(installed.items||typeof equipWeapon!=="function"||typeof applyItem!=="function"||typeof applyLoot!=="function")return;
    const oldEquip=equipWeapon,oldItem=applyItem,oldLoot=applyLoot;
    equipWeapon=function equipWeaponV125(p,weapon){
      const first=!hasGun(p);oldEquip(p,weapon);p.firearmUnlocked=true;p.maxMana=Math.max(MAX_START_AMMO,Math.min(Number(p.maxMana||MAX_START_AMMO),140));
      if(first&&Number(p.mana||0)<=0){p.mana=Math.min(p.maxMana,FIRST_GUN_MAGAZINE);p.ammoFlashMs=C.player.ammoFlashMs;try{showToast("FIREARM ACQUIRED",`${weapon.displayName||weapon.name} is now equipped with ${p.mana} rounds. Ammunition is scarce; at zero ammo the attack control automatically returns to ${meleeFor(p).name}.`,"gold",9000)}catch(_){}}
      p.emergencyRechargeMs=0;
    };
    applyLoot=function applyLootV125(loot,p){
      if(loot?.kind==="ammo"){
        const rarityOrder=["COMMON","UNCOMMON","SIZZLER","GOLD MEDAL","ZZAP! 97%"],idx=Math.max(0,rarityOrder.indexOf(loot.rarity));
        return oldLoot({...loot,amount:Math.min(Number(loot.amount||18),14+idx*3)},p);
      }
      return oldLoot(loot,p);
    };
    applyItem=function applyItemV125(i,p){
      if(i?.kind==="meleeWeapon"){
        equipMelee(p,i.meleeWeapon||START_SWORD);
        try{awardXP(p,10,`${i.title||"Rare melee weapon"} collected`);updateQuests();PGR.checkAchievements(run,p)}catch(_){}
        return true;
      }
      if(i?.kind==="ammo"||i?.kind==="mana"){
        const n=Math.max(1,Math.round(18*(1+(p.scavenger||0))*PGR.difficulty(run).ammo));
        p.mana=Math.min(p.maxMana,p.mana+n);p.ammoFlashMs=C.player.ammoFlashMs;p.emergencyRechargeMs=0;
        try{S.sfx("pickup");showToast("AMMO PACK",`${p===p2?"P2":"P1"} gains ${n} rounds. Firearms hit hard, so make them count.`,"cyan");awardXP(p,typeof pickupXP==="function"?pickupXP(i.kind):3,"AMMO PACK collected");updateQuests();PGR.checkAchievements(run,p)}catch(_){}
        return true;
      }
      return oldItem(i,p);
    };
    installed.items=true;
  }

  function installSurvival(){
    if(installed.survival||typeof usePotion!=="function"||typeof useInventorySlot!=="function"||typeof hurtPlayer!=="function")return;
    usePotion=function usePotionV125(p){
      const ix=PGR.firstInventory(p,"potion");if(ix<0){S.sfx("empty");showToast("NO POTION","There is no restoration potion in your inventory stacks.","red");return}
      PGR.inventoryRemove(p,ix);const heal=4+(p.potionBonus||0);p.health=Math.min(p.maxHealth,p.health+heal);p.hpBarMs=3200;S.sfx("potion");showToast("POTION USED",`+${heal} health. Potions no longer restore firearm ammunition.`,"green");sync();
    };
    const oldInventoryUse=useInventorySlot;
    useInventorySlot=function useInventorySlotV125(p,index){
      const it=p?.inventory?.[index];
      if(it?.kind!=="potion")return oldInventoryUse(p,index);
      PGR.inventoryRemove(p,index);const heal=4+(p.potionBonus||0);p.health=Math.min(p.maxHealth,p.health+heal);p.hpBarMs=3200;S.sfx("potion");showToast("POTION USED",`+${heal} health. Ammunition must be found separately.`,"green");sync();try{renderInventoryPanel()}catch(_){}
    };
    const oldHurt=hurtPlayer;
    hurtPlayer=function hurtPlayerV125(p,n,friendly=false,source="enemy"){
      const deathsBefore=Number(run?.stats?.deaths||0);const result=oldHurt(p,n,friendly,source);const deathsAfter=Number(run?.stats?.deaths||0);
      if(p&&deathsAfter>deathsBefore&&p.health>0){p.mana=hasGun(p)?Math.min(Number(p.maxMana||MAX_START_AMMO),RESPAWN_AMMO):0;p.emergencyRechargeMs=0;try{sync()}catch(_){}}
      return result;
    };
    installed.survival=true;
  }

  function installHud(){
    if(installed.hud||typeof sync!=="function")return;
    const oldSync=sync;
    sync=function syncV125(...args){
      const result=oldSync.apply(this,args);
      try{
        if(p1){
          const melee=meleeFor(p1),usingMelee=!hasGun(p1)||Number(p1.mana||0)<=0;
          if(usingMelee&&UI?.weapon)UI.weapon.textContent=String(melee.short||melee.name||"SWORD").slice(0,16).toUpperCase();
          if(usingMelee&&UI?.power)UI.power.textContent=String(meleeDamageFor(p1));
          if(UI?.weapon)UI.weapon.title=hasGun(p1)?`Firearm: ${p1.weapon?.displayName||p1.weapon?.name}. Melee: ${melee.name}. ${p1.mana>0?"Attack fires the gun.":"Ammo empty — Attack uses melee."}`:`Melee only: ${melee.name}. Find a firearm in the dungeon.`;
          const touch=document.querySelector('#v104-touch-controls [data-action="fire"]');if(touch)touch.textContent=usingMelee?"SLASH":"FIRE";
        }
      }catch(_){}
      return result;
    };
    document.querySelectorAll(".command-grid span").forEach(span=>{if(span.querySelector("kbd")?.textContent?.includes("SPACE")){const b=span.querySelector("b");if(b)b.textContent="ATTACK"}});
    document.querySelectorAll(".keys-help kbd").forEach(k=>{k.textContent=k.textContent.replace("SPACE FIRE","SPACE ATTACK").replace("ENTER FIRE","ENTER ATTACK")});
    installed.hud=true;
  }

  function installTutorial(){
    if(installed.tutorial)return;
    const timer=setInterval(()=>{
      const ts=tutorialState(),modal=document.getElementById("ccg-tutorial-stage-modal");if(!ts?.active||!modal||modal.classList.contains("hidden"))return;
      const step=Number(ts.step||0),title=modal.querySelector("h2"),copy=modal.querySelector("p:not(.tutorial-detail)"),detail=modal.querySelector(".tutorial-detail");
      if(step===1){
        if(title)title.textContent="ATTACK — START WITH YOUR SWORD";
        if(copy)copy.textContent="You begin with an Archive Sword, not a gun. Press SPACE on desktop or SLASH on mobile to swing it. The tutorial advances when you make the attack.";
        if(detail)detail.textContent="Firearms must be found or bought. Once you have one, this same attack control fires while ammunition remains. At 0 ammo it automatically switches back to your equipped melee weapon. Ammo is deliberately scarce.";
      }else if(step===2&&detail){detail.textContent="Dash is controlled by its cooldown and no longer consumes firearm ammunition. Use it to create space before committing to close-range sword attacks."}
      else if(step===8&&detail){detail.textContent="Enemies normally avoid traps and vortex pits, but gunfire or melee knockback can force them into hazards. Rare melee weapons do enormous damage and use a dedicated equipment slot, so they never fill your inventory."}
    },120);
    window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
    installed.tutorial=true;
  }

  function install(){
    configureAmmoModel();installPlayers();installCombat();installItems();installWorld();installHud();installSurvival();installTutorial();
    try{for(const p of typeof localPlayers==="function"?localPlayers():[])normaliseExistingPlayer(p)}catch(_){}
  }

  install();
  let attempts=0;const retry=setInterval(()=>{attempts++;install();if(Object.values(installed).every(Boolean)||attempts>=80)clearInterval(retry)},100);
  window.addEventListener("pagehide",()=>clearInterval(retry),{once:true});
  window.CCGLostSizzlerMeleeAmmoV125={START_SWORD,RARE_MELEE,meleeAttack,hasGun,meleeFor,meleeMastery,meleeDamageFor,pruneAmmoSupplies,spawnVeryRareMelee,constants:{FLOOR_MELEE_FIND_CHANCE,FLOOR_MELEE_PITY_STEP,FLOOR_MELEE_MAX_CHANCE}};
})();
