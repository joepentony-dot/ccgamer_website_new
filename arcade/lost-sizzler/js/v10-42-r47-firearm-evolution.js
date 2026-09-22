/* C64 Dungeon Carnage V10.42 r47 — single evolving firearm progression.
 * Dungeon mode only. The established sword-first start is preserved: the first
 * weapon pickup acquires Tier 1, later pickups improve that one firearm, and a
 * pickup at the current floor cap is salvaged for ammunition.
 */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R47FirearmEvolution)return;

  const STAGES=Object.freeze([
    null,
    Object.freeze({tier:1,id:"pulse",name:"Field Pulse I",power:1,delay:1.08,shots:1,pierce:0,ttl:18,rating:1,desc:"Reliable single-shot starter firearm."}),
    Object.freeze({tier:2,id:"pulse",name:"Field Pulse II",power:1,delay:.92,shots:1,pierce:0,ttl:19,rating:3,desc:"A faster single-shot pulse upgrade."}),
    Object.freeze({tier:3,id:"pulse",name:"Heavy Pulse",power:2,delay:1.02,shots:1,pierce:0,ttl:19,rating:5,desc:"A stronger single-shot weapon for the second floor."}),
    Object.freeze({tier:4,id:"spread",name:"Tri-Pulse I",power:1,delay:1.08,shots:3,pierce:0,ttl:18,rating:7,desc:"Three-way fire unlocked for the deeper dungeon."}),
    Object.freeze({tier:5,id:"spread",name:"Tri-Pulse II",power:2,delay:1.00,shots:3,pierce:0,ttl:19,rating:9,desc:"Three-way fire with increased bolt power."}),
    Object.freeze({tier:6,id:"spread",name:"Tri-Pulse III",power:3,delay:.92,shots:3,pierce:1,ttl:20,rating:12,desc:"Final-floor three-way firearm with one point of penetration."})
  ]);
  const FLOOR_CAP=Object.freeze({1:2,2:3,3:4,4:5,5:6});
  const state={installed:false,weaponInstalls:0,inventoryInstalls:0,acquisitions:0,upgrades:0,salvages:0,migrations:0};

  const currentRun=()=>{try{return run||null}catch(_){return null}};
  const dungeonMode=()=>{try{const special=String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"");return special!=="horde-survivor"&&special!=="sizzler-saboteurs"}catch(_){return true}};
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch(_){return value&&typeof value==="object"?{...value}:value}};
  const capForFloor=floor=>FLOOR_CAP[Math.max(1,Math.min(5,Math.floor(Number(floor)||1)))]||2;
  function stageWeapon(tier){
    const stage=STAGES[Math.max(1,Math.min(6,Math.floor(Number(tier)||1)))]||STAGES[1];
    return{...clone(stage),displayName:`TIER ${stage.tier} · ${stage.name}`,rarity:stage.tier>=6?"GOLD MEDAL":stage.tier>=4?"SIZZLER":stage.tier>=2?"UNCOMMON":"COMMON",colour:stage.tier>=6?"#ffd85a":stage.tier>=4?"#ff5bae":"#6cecff",ammo:1,element:"energy",mods:stage.tier>=4?["THREE-WAY"]:[],evolutionTier:stage.tier}
  }
  function deriveTier(player){
    if(!player||player.firearmUnlocked===false)return 0;
    const explicit=Math.floor(Number(player?.weaponEvolutionTier||player?.weapon?.evolutionTier||0));
    if(explicit>=1&&explicit<=6)return explicit;
    if(!player.weapon)return 0;
    const w=player.weapon,shots=Math.max(1,Number(w.shots||1)),power=Math.max(1,Number(w.power||1)),pierce=Math.max(0,Number(w.pierce||0));
    if(shots>=3&&pierce>=1)return 6;
    if(shots>=3&&power>=2)return 5;
    if(shots>=3)return 4;
    if(power>=2)return 3;
    if(Number(w.delay||1)<.98)return 2;
    return 1
  }
  function collapseOwnership(player){
    if(!player||!dungeonMode())return null;
    if(player.firearmUnlocked===false){
      const changed=Boolean(player.weapon||(player.ownedWeapons||[]).length||Number(player.activeWeaponIndex)>=0||Number(player.weaponEvolutionTier||0)>0);
      player.weapon=null;player.weaponEvolutionTier=0;player.weaponLevel=0;player.ownedWeapons=[];player.activeWeaponIndex=-1;
      if(changed)state.migrations++;
      return null
    }
    const floor=Math.max(1,Number(currentRun()?.floor||1)),cap=capForFloor(floor),derived=Math.max(1,deriveTier(player)),tier=Math.min(cap,derived);
    const canonical=stageWeapon(tier);
    const changed=derived!==tier||!player.weapon||Number(player.weapon.shots||1)!==canonical.shots||Number(player.weapon.power||1)!==canonical.power||Number(player.weapon.pierce||0)!==canonical.pierce||String(player.weapon.id||"")!==canonical.id||(player.ownedWeapons||[]).length!==1;
    player.weapon=canonical;player.weaponEvolutionTier=tier;player.weaponLevel=tier;player.firearmUnlocked=true;
    player.ownedWeapons=[clone(canonical)];player.activeWeaponIndex=0;
    if(changed)state.migrations++;
    return canonical
  }
  function salvageAmmo(player,floor){
    const gain=Math.min(30,8+Math.max(1,Number(floor||1))*4),before=Math.max(0,Number(player?.mana||0));
    if(player){player.mana=Math.min(Number(player.maxMana||before+gain),before+gain);try{player.ammoFlashMs=C.player.ammoFlashMs}catch(_){}}
    state.salvages++;
    return Math.max(0,Number(player?.mana||0)-before)
  }
  function applyPickup(player,incoming,baseEquip){
    if(!player||!dungeonMode())return baseEquip(player,incoming);
    const floor=Math.max(1,Number(currentRun()?.floor||1)),cap=capForFloor(floor);
    collapseOwnership(player);
    const tier=deriveTier(player);
    if(tier>=cap&&tier>0){
      const ammo=salvageAmmo(player,floor);
      try{stats.weapons++}catch(_){}
      try{S.sfx("pickup");showToast("FIREARM PARTS SALVAGED",`Your Tier ${tier} firearm is already at the Floor ${floor} limit. The duplicate weapon is stripped for ${ammo} ammunition. Deeper floors unlock the next weapon tier.`,"cyan",7600)}catch(_){}
      queueMicrotask(()=>collapseOwnership(player));
      return player.weapon
    }
    const next=Math.max(1,Math.min(cap,tier+1)),weapon=stageWeapon(next),first=tier===0;
    if(first)player.firearmUnlocked=true;
    const result=baseEquip(player,weapon);
    player.firearmUnlocked=true;player.weaponEvolutionTier=next;player.weaponLevel=next;player.weapon=stageWeapon(next);collapseOwnership(player);
    if(first)state.acquisitions++;else state.upgrades++;
    try{
      const title=first?"FIREARM ACQUIRED":"FIREARM UPGRADED";
      const text=first
        ?`Tier 1: ${weapon.name}. Your Archive Sword remains the unlimited close-range fallback; later weapon pickups improve this firearm.`
        :`Tier ${tier} → Tier ${next}: ${weapon.name}. ${next===4?"Three-way fire is now unlocked.":next<6?`Floor ${floor} cap: Tier ${cap}.`:"Maximum firearm tier reached."}`;
      showToast(title,text,"gold",8200)
    }catch(_){}
    return result
  }

  function installWeaponOwner(){
    try{
      const current=window.equipWeapon;if(typeof current!=="function")return false;
      if(current.__ccgR47FirearmEvolution)return true;
      const wrapped=function(player,weapon,...rest){return applyPickup(player,weapon,(p,w)=>current.call(this,p,w,...rest))};
      wrapped.__ccgR47FirearmEvolution=true;wrapped.__ccgOriginal=current;window.equipWeapon=wrapped;state.weaponInstalls++;return true
    }catch(_){return false}
  }
  function weaponSummary(weapon){
    if(!weapon)return"NOT ACQUIRED";
    return`TIER ${weapon.evolutionTier||1}/6 · PWR ${weapon.power||1} · SHOTS ${weapon.shots||1} · FIRE RATE ${Number(weapon.delay||1).toFixed(2)}${weapon.pierce?` · PIERCE ${weapon.pierce}`:""}`;
  }
  function decorateInventory(){
    try{
      const player=typeof p1!=="undefined"?p1:null,load=document.getElementById("inventory-loadout");if(!player||!load||!dungeonMode())return false;
      const weapon=collapseOwnership(player);load.querySelector(".ccg-owned-weapons")?.remove();load.querySelector(".ccg-evolving-firearm")?.remove();
      const floor=Math.max(1,Number(currentRun()?.floor||1)),cap=capForFloor(floor),tier=deriveTier(player),panel=document.createElement("div");
      panel.className="ccg-evolving-firearm slot-actions";
      if(!weapon){
        const status=load.querySelector("small");if(status)status.textContent=String(status.textContent||"").replace(/^[^•]+(?=\s•\sMAP)/,"ARCHIVE SWORD");
        panel.innerHTML=`<b>EVOLVING FIREARM · NOT ACQUIRED</b><span>ARCHIVE SWORD ACTIVE · UNLIMITED MELEE</span><small>Your first weapon pickup becomes Tier 1 Field Pulse. Floor ${floor} allows firearm progression up to Tier ${cap}.</small>`
      }else{
        panel.innerHTML=`<b>EVOLVING FIREARM · TIER ${tier}/6</b><span>${weapon.displayName} — ${weaponSummary(weapon)}</span><small>${tier<cap?`The next weapon pickup upgrades this firearm to Tier ${tier+1}.`:`Floor ${floor} cap reached. Extra weapon pickups become ammunition${floor<5?`; Floor ${floor+1} unlocks the next tier`:"; maximum tier reached"}.`}</small>`
      }
      load.appendChild(panel);return true
    }catch(_){return false}
  }
  function installInventory(){
    try{
      const current=window.renderInventoryPanel;if(typeof current!=="function")return false;
      if(current.__ccgR47FirearmEvolutionInventory)return true;
      const wrapped=function(...args){const result=current.apply(this,args);decorateInventory();return result};
      wrapped.__ccgR47FirearmEvolutionInventory=true;wrapped.__ccgOriginal=current;window.renderInventoryPanel=wrapped;state.inventoryInstalls++;return true
    }catch(_){return false}
  }
  function install(){
    const a=installWeaponOwner(),b=installInventory();
    try{collapseOwnership(typeof p1!=="undefined"?p1:null);collapseOwnership(typeof p2!=="undefined"?p2:null)}catch(_){}
    state.installed=Boolean(a&&b);return state.installed
  }

  if(document.body?.dataset?.releaseReady==="true")queueMicrotask(install);
  addEventListener("ccg:v142-ready",()=>queueMicrotask(install),{once:true});
  document.addEventListener("ccg:floor-start",()=>{try{collapseOwnership(p1);collapseOwnership(p2)}catch(_){}},{passive:true});

  window.CCGLostSizzlerV142R47FirearmEvolution=Object.freeze({
    version:"V10.42-r47-firearm-evolution",state,STAGES,FLOOR_CAP,capForFloor,stageWeapon,deriveTier,collapseOwnership,applyPickup,salvageAmmo,decorateInventory,install
  });
})();
