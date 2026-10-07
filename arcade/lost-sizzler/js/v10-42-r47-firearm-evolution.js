/* C64 Dungeon Carnage V10.42 r47 — single evolving firearm progression.
 * Dungeon mode only. The established sword-first start is preserved: the first
 * weapon pickup acquires Tier 1 and later pickups improve that one firearm.
 * Non-common named weapon rewards preserve their actual archetype at the current
 * tier cap; capped duplicate special weapons refine/re-forge instead of becoming
 * score or XP. Only ordinary common capped caches may be salvaged for ammunition.
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
  const state={installed:false,weaponInstalls:0,inventoryInstalls:0,acquisitions:0,upgrades:0,reforges:0,salvages:0,migrations:0};

  const currentRun=()=>{try{return run||null}catch(_){return null}};
  const dungeonMode=()=>{try{const special=String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"");return special!=="horde-survivor"&&special!=="sizzler-saboteurs"}catch(_){return true}};
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch(_){return value&&typeof value==="object"?{...value}:value}};
  const capForFloor=floor=>FLOOR_CAP[Math.max(1,Math.min(5,Math.floor(Number(floor)||1)))]||2;
  function weaponPattern(incoming){
    const id=String(incoming?.patternOverride||incoming?.id||"").toLowerCase();
    if(["spread","fire","shock","pierce","repeater"].includes(id))return id;
    if(Array.isArray(incoming?.mods)&&incoming.mods.some(mod=>/three-way/i.test(String(mod))))return"spread";
    return"pulse"
  }
  function stageWeapon(tier,pattern="",refinement=0){
    const stage=STAGES[Math.max(1,Math.min(6,Math.floor(Number(tier)||1)))]||STAGES[1],explicit=String(pattern||"").toLowerCase(),variant=explicit||stage.id||"pulse",refine=Math.max(0,Math.min(3,Math.floor(Number(refinement)||0)));
    const weapon={...clone(stage),displayName:`TIER ${stage.tier} · ${stage.name}`,rarity:stage.tier>=6?"GOLD MEDAL":stage.tier>=4?"SIZZLER":stage.tier>=2?"UNCOMMON":"COMMON",colour:stage.tier>=6?"#ffd85a":stage.tier>=4?"#ff5bae":"#6cecff",ammo:1,element:"energy",mods:stage.tier>=4?["THREE-WAY"]:[],evolutionTier:stage.tier};
    if(explicit==="spread"){weapon.id="spread";weapon.name=`Spread Pulse ${stage.tier}`;weapon.displayName=`TIER ${stage.tier} · SPREAD PULSE`;weapon.shots=3;weapon.delay=Math.max(1.02,Number(stage.delay||1));weapon.mods=["THREE-WAY"];weapon.patternOverride="spread";weapon.desc="Three-way fire pattern scaled to the current floor tier cap."}
    else if(explicit==="fire"){weapon.id="fire";weapon.name=`SID Fire Lance ${stage.tier}`;weapon.displayName=`TIER ${stage.tier} · SID FIRE LANCE`;weapon.element="fire";weapon.shots=1;weapon.power=Math.max(2,Number(stage.power||1)+1);weapon.delay=Math.max(1.12,Number(stage.delay||1)*1.16);weapon.ttl=Number(stage.ttl||18)+2;weapon.mods=["FIRE LANCE"];weapon.patternOverride="fire";weapon.desc="Heavy fire-damage variant scaled to the current floor tier cap."}
    else if(explicit==="shock"){weapon.id="shock";weapon.name=`Shockwave Emitter ${stage.tier}`;weapon.displayName=`TIER ${stage.tier} · SHOCKWAVE EMITTER`;weapon.element="shock";weapon.shots=8;weapon.power=Math.max(1,Number(stage.power||1));weapon.delay=Math.max(1.28,Number(stage.delay||1)*1.28);weapon.ttl=4;weapon.mods=["SHOCKWAVE"];weapon.patternOverride="shock";weapon.desc="Short-range eight-way shock variant scaled to the current floor tier cap."}
    else if(explicit==="pierce"){weapon.id="pierce";weapon.name=`Piercing Beam ${stage.tier}`;weapon.displayName=`TIER ${stage.tier} · PIERCING BEAM`;weapon.shots=1;weapon.power=Math.max(2,Number(stage.power||1));weapon.pierce=Math.max(2,Number(stage.pierce||0));weapon.delay=Math.max(.98,Number(stage.delay||1)*1.08);weapon.mods=["PIERCING"];weapon.patternOverride="pierce";weapon.desc="Penetrating beam variant scaled to the current floor tier cap."}
    else if(explicit==="repeater"){weapon.id="repeater";weapon.name=`Rapid Repeater ${stage.tier}`;weapon.displayName=`TIER ${stage.tier} · RAPID REPEATER`;weapon.element="physical";weapon.shots=1;weapon.power=Math.max(1,Number(stage.power||1));weapon.delay=Math.max(.48,Number(stage.delay||1)*.68);weapon.mods=["RAPID"];weapon.patternOverride="repeater";weapon.desc="Fast-fire physical variant scaled to the current floor tier cap."}
    else if(explicit==="pulse"){weapon.patternOverride="pulse";if(stage.id==="spread"){weapon.id="pulse";weapon.name=`Heavy Pulse ${stage.tier}`;weapon.displayName=`TIER ${stage.tier} · HEAVY PULSE`;weapon.shots=1;weapon.pierce=Math.max(0,Number(stage.pierce||0));weapon.mods=[]}}
    if(refine>0){weapon.refinement=refine;weapon.delay=Math.max(.42,Number(weapon.delay||1)*(1-refine*.04));weapon.ttl=Math.max(4,Number(weapon.ttl||18)+refine*2);if(refine>=2)weapon.pierce=Math.max(1,Number(weapon.pierce||0));weapon.mods=[...(weapon.mods||[]),`REFINED ×${refine}`];weapon.displayName+=` · +${refine}`;weapon.desc+=` Refinement ${refine}/3 improves handling and projectile reach.`}
    return weapon
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
    const floor=Math.max(1,Number(currentRun()?.floor||1)),cap=capForFloor(floor),derived=Math.max(1,deriveTier(player)),tier=Math.min(cap,derived),pattern=String(player.weaponPatternOverride||player.weapon?.patternOverride||""),refinement=Math.max(0,Math.min(3,Math.floor(Number(player.weaponRefinement)||0)));
    const canonical=stageWeapon(tier,pattern,refinement);
    const changed=derived!==tier||!player.weapon||Number(player.weapon.shots||1)!==canonical.shots||Number(player.weapon.power||1)!==canonical.power||Number(player.weapon.pierce||0)!==canonical.pierce||String(player.weapon.id||"")!==canonical.id||(player.ownedWeapons||[]).length!==1;
    player.weapon=canonical;player.weaponEvolutionTier=tier;player.weaponLevel=tier;player.firearmUnlocked=true;
    player.ownedWeapons=[clone(canonical)];player.activeWeaponIndex=0;
    if(changed)state.migrations++;
    return canonical
  }
  function salvageAmmo(player,floor){
    const max=Math.max(1,Number(player?.maxMana||0)),gain=Math.max(1,Math.round(max*.25)),before=Math.max(0,Number(player?.mana||0));
    if(player){player.mana=Math.min(max,before+gain);try{player.ammoFlashMs=C.player.ammoFlashMs}catch(_){}}
    state.salvages++;
    return Math.max(0,Number(player?.mana||0)-before)
  }
  function salvageXp(player){
    if(!player)return 0;
    const before=Math.max(0,Number(player.totalXp||0));
    try{if(typeof awardXP==="function")awardXP(player,10,"Capped weapon cache");else PGR?.gainXP?.(player,currentRun(),10,"Capped weapon cache")}catch(_){}
    return Math.max(0,Number(player.totalXp||0)-before)
  }
  function applyPickup(player,incoming,baseEquip){
    if(!player||!dungeonMode())return baseEquip(player,incoming);
    const floor=Math.max(1,Number(currentRun()?.floor||1)),cap=capForFloor(floor),incomingRarity=String(incoming?.rarity||"COMMON").toUpperCase(),incomingPattern=weaponPattern(incoming),specialWeapon=["UNCOMMON","SIZZLER","GOLD MEDAL","ZZAP! 97%"].includes(incomingRarity);
    collapseOwnership(player);
    const tier=deriveTier(player),currentPattern=String(player.weaponPatternOverride||player.weapon?.patternOverride||player.weapon?.id||"pulse").toLowerCase(),currentRefinement=Math.max(0,Math.min(3,Math.floor(Number(player.weaponRefinement)||0)));
    if(specialWeapon){
      let next=tier>0?Math.min(cap,tier+1):1,pattern=incomingPattern,refinement=0,action="";
      if(tier>=cap&&tier>0){
        next=cap;
        if(pattern!==currentPattern){action="variant";refinement=0}
        else if(currentRefinement<3){action="refine";refinement=currentRefinement+1}
        else{
          const variants=["spread","fire","pierce","repeater","shock","pulse"],ix=Math.max(0,variants.indexOf(currentPattern));
          pattern=variants[(ix+1)%variants.length];refinement=0;action="reforge"
        }
      }else action=tier===0?"acquire":"upgrade";
      player.firearmUnlocked=true;player.weaponPatternOverride=pattern;player.weaponRefinement=refinement;
      const weapon=stageWeapon(next,pattern,refinement),result=baseEquip(player,weapon);
      player.weaponEvolutionTier=next;player.weaponLevel=next;player.weapon=stageWeapon(next,pattern,refinement);collapseOwnership(player);
      if(tier===0)state.acquisitions++;else if(next>tier)state.upgrades++;else state.reforges++;
      try{window.dispatchEvent(new CustomEvent("ccg:firearm-evolved",{detail:{playerId:String(player?.id||player?.name||"P1"),floor,first:tier===0,beforeTier:tier,afterTier:next,weaponName:String(player.weapon?.name||player.weapon?.displayName||""),variant:pattern,refinement}}))}catch(_){}
      try{
        S.sfx("weapon");
        const sourceName=String(incoming?.displayName||incoming?.name||incomingRarity+" WEAPON");
        const title=action==="refine"?"RARE WEAPON REFINED":action==="variant"?"RARE WEAPON TYPE EQUIPPED":action==="reforge"?"MASTERED CACHE REFORGED":tier===0?"RARE WEAPON ACQUIRED":"RARE WEAPON EVOLVED";
        const text=action==="refine"
          ?`${sourceName} improved your ${player.weapon.displayName} at the Floor ${floor} Tier ${cap} cap. Refinement ${refinement}/3 — no score/XP conversion.`
          :action==="reforge"
            ?`${sourceName} matched an already master-refined weapon, so the cache was transparently reforged into ${player.weapon.displayName}. It remains a weapon reward.`
            :`${sourceName} equipped as ${player.weapon.displayName} at Tier ${next}/${cap}. The advertised weapon archetype is retained instead of being converted into currency.`;
        showToast(title,text,"gold",9000)
      }catch(_){}
      return result
    }
    if(tier>=cap&&tier>0){
      const ammo=salvageAmmo(player,floor);
      try{stats.weapons++}catch(_){}
      try{
        S.sfx("pickup");
        if(ammo>0)showToast("COMMON WEAPON CACHE — AMMO",`This ordinary cache cannot improve Tier ${cap}. +${ammo} ammo restored. Non-common named weapon drops always remain weapon rewards.`,"cyan",7600);
        else{
          const xp=salvageXp(player);
          if(xp>0)showToast("COMMON CACHE — +10 XP",`Ammo is full, so this ordinary capped cache became +${xp} XP. Rare named weapons never use this fallback.`,"cyan",7600);
          else{try{score+=250}catch(_){}showToast("COMMON CACHE — +250 SCORE","This ordinary capped cache had no ammo/XP room. Rare named weapons never use this fallback.","gold",7600)}
        }
      }catch(_){}
      queueMicrotask(()=>collapseOwnership(player));
      return player.weapon
    }
    const pattern=String(player.weaponPatternOverride||player.weapon?.patternOverride||""),refinement=Math.max(0,Math.min(3,Math.floor(Number(player.weaponRefinement)||0))),next=Math.max(1,Math.min(cap,tier+1)),weapon=stageWeapon(next,pattern,refinement),first=tier===0;
    if(first)player.firearmUnlocked=true;
    const result=baseEquip(player,weapon);
    player.firearmUnlocked=true;player.weaponEvolutionTier=next;player.weaponLevel=next;player.weapon=stageWeapon(next,pattern,refinement);collapseOwnership(player);
    if(first)state.acquisitions++;else state.upgrades++;
    try{window.dispatchEvent(new CustomEvent("ccg:firearm-evolved",{detail:{playerId:String(player?.id||player?.name||"P1"),floor,first,beforeTier:tier,afterTier:next,weaponName:String(player.weapon?.name||player.weapon?.displayName||"")}}))}catch(_){}
    try{
      const title=first?"WEAPON ACQUIRED":"WEAPON EVOLVED";
      const text=first
        ?"Tier 1 firearm unlocked. Your Archive Sword remains the unlimited close-range fallback; later weapon caches evolve this weapon."
        :`Tier ${tier} → Tier ${next}. ${next===4?"Three-way fire is now unlocked.":next<6?`Floor ${floor} cap: Tier ${cap}.`:"Maximum firearm tier reached."}`;
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
        panel.innerHTML=`<b>EVOLVING FIREARM · TIER ${tier}/6</b><span>${weapon.displayName} — ${weaponSummary(weapon)}</span><small>${tier<cap?`The next common cache advances the tier; named non-common weapons also preserve their own Fire/Spread/Pierce/Repeater/Shock pattern.`:`Floor ${floor} cap reached. Common duplicates may salvage to ammo, but non-common named weapons change type or refine the firearm instead of becoming score/XP.`}</small>`
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
    version:"V10.42-r47-firearm-evolution",state,STAGES,FLOOR_CAP,capForFloor,weaponPattern,stageWeapon,deriveTier,collapseOwnership,applyPickup,salvageAmmo,decorateInventory,install
  });
})();
