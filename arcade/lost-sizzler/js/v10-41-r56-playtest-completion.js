/* The Lost Sizzler V10.41 r56 — playtest completion owner.
 *
 * Late runtime ownership for live defects that remained after R54/R55:
 * environmental trap/blast damage, guaranteed chest contents, reward feedback,
 * compact Quick Inventory icons, and combat liveness after repeated pauses.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R56_PLAYTEST_COMPLETION__)return;
  window.__CCG_LOST_SIZZLER_V141_R56_PLAYTEST_COMPLETION__=true;

  const STYLE_ID="ccg-v141-r56-playtest-completion";
  const CARRIED_LOOT=new Set(["potion","torch","teleport","banishment","artefact"]);
  const ENVIRONMENT_SOURCE=/(?:\btrap\b|anti[- ]loitering blast)/i;
  const SPECIAL_BLOCK=new Set(["horde-survivor","sizzler-saboteurs"]);
  const BLOCKING_PANELS=["pause","inventory-panel","item-info-panel","named-dossier-panel","shop-panel","level-up","artefact-choice-panel","floor-complete","save-panel"];
  const ATTACK_BUFFER_LIMIT=1400;
  const state={
    timer:0,trapCycles:new Map(),pendingChests:new Map(),deliveredChestLoot:new WeakSet(),chestLoot:new WeakSet(),
    trapHits:0,environmentHits:0,chestDeliveries:0,chestBlocks:0,shrineFeedbacks:0,pickupFeedbacks:0,quickIconPasses:0,
    combatRearms:0,cooldownRepairs:0,bufferRepairs:0,stunRepairs:0,modeRepairs:0,attackIntentRepairs:0,lastMode:"",lastResumeAt:0,lastShrine:"",lastPickup:"",
    cooldown:{p1:{value:0,changedAt:performance.now()},p2:{value:0,changedAt:performance.now()}},
    stun:{p1:{value:0,changedAt:performance.now()},p2:{value:0,changedAt:performance.now()}}
  };

  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const running=()=>{
    if(document.body?.dataset?.runActive==="true")return true;
    try{
      const state=String(typeof mode!=="undefined"?mode:"");
      if(run&&host&&p1&&!["menu","end"].includes(state)){document.body.dataset.runActive="true";return true}
    }catch(_){}
    return false
  };
  const ordinaryDungeon=()=>running()&&!SPECIAL_BLOCK.has(specialType());
  const visible=id=>{const n=document.getElementById(id);return Boolean(n&&!n.classList.contains("hidden")&&getComputedStyle(n).display!=="none")};
  const blocked=()=>BLOCKING_PANELS.some(visible);
  const durability=p=>Number(p?.health||0)+Number(p?.armor||0);
  const playerKey=p=>String(p?.id||p?.name||(p===globalThis.p2?"P2":"P1"));
  const trapKey=(p,t)=>`${playerKey(p)}|${String(t?.id||`${t?.x},${t?.y}`)}`;
  const lootName=loot=>String(loot?.weapon?.displayName||loot?.name||loot?.title||loot?.kind||"CHEST LOOT").toUpperCase();
  const lootTone=loot=>String(loot?.rarity||"").toUpperCase()==="GOLD MEDAL"?"gold":String(loot?.rarity||"").toUpperCase()==="ZZAP! 97%"?"red":"cyan";
  const lootColour=loot=>{try{return String(loot?.rarity||"").toUpperCase()==="GOLD MEDAL"?P.gold:String(loot?.rarity||"").toUpperCase()==="ZZAP! 97%"?P.pink:P.cyan}catch(_){return"#6cecff"}};

  function originalChainHasMarker(fn,marker,limit=64){
    const seen=new Set();let current=fn,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth++<limit){
      try{if(current[marker])return true}catch(_){}
      seen.add(current);current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null
    }
    return false
  }

  function installStyle(){
    if(document.getElementById(STYLE_ID))return true;
    const style=document.createElement("style");style.id=STYLE_ID;style.textContent=`
      #quick-slots .quick-slot{position:relative!important;padding-top:3px!important}
      #quick-slots .quick-slot .r56-quick-slot-icon{position:absolute!important;left:50%!important;top:4px!important;transform:translateX(-50%)!important;width:22px!important;height:22px!important;display:grid!important;place-items:center!important;pointer-events:none!important;z-index:3!important}
      #quick-slots .quick-slot .r56-quick-slot-icon .item-svg-wrap{width:22px!important;height:22px!important;display:grid!important;place-items:center!important;border:0!important;background:transparent!important;padding:0!important}
      #quick-slots .quick-slot .r56-quick-slot-icon svg,#quick-slots .quick-slot .r56-quick-slot-icon img.item-art{width:20px!important;height:20px!important;max-width:20px!important;max-height:20px!important;display:block!important;object-fit:contain!important;filter:drop-shadow(0 0 3px currentColor)!important}
      #quick-slots .quick-slot .stack-name{left:2px!important;right:2px!important;bottom:1px!important;padding:0 2px!important;text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;font-size:5px!important;z-index:4!important}
      #quick-slots .quick-slot .stack-count{z-index:6!important}
      #quick-slots .quick-slot.r56-has-icon .stack-name{background:rgba(3,2,5,.78)!important}
    `;document.head.appendChild(style);return true
  }

  function environmentalSource(source){return ENVIRONMENT_SOURCE.test(String(source||""))}
  function installEnvironmentalDamage(){
    // r58 owns every trap-attributed HEALTH change in game-play.js.
    // Retained only as a compatibility surface for older diagnostics.
    return false
  }

  function trapIsActive(trap,now=performance.now()){
    if(!trap?.active)return false;
    try{return typeof SYS!=="undefined"&&typeof SYS?.trapActive==="function"?Boolean(SYS.trapActive(trap,now)):true}catch(_){return true}
  }
  function rearmCanonicalTrapContact(player,trap){
    const contact=window.CCGLostSizzlerRareEventsBalance?.trapRuntime?.contact;
    if(!contact?.delete)return false;
    const playerId=String(player?.id||player?.name||"player"),trapId=String(trap?.id||`${trap?.x},${trap?.y}`),suffix=`|${playerId}|${trapId}`;
    let removed=false;
    for(const key of [...contact])if(String(key).endsWith(suffix)){contact.delete(key);removed=true}
    return removed
  }
  function trapCycleTick(){
    // r58 owns player/trap/cycle detection and triggering.
    return false
  }

  function inventoryCanTake(player,loot){
    if(!CARRIED_LOOT.has(String(loot?.kind||"")))return true;
    try{return typeof PGR?.inventoryCanAdd==="function"?Boolean(PGR.inventoryCanAdd(player,loot)):true}catch(_){return true}
  }
  function installApplyLoot(){
    const current=window.applyLoot;if(typeof current!=="function")return false;
    if(current.__ccgV141R56ChestDelivery)return true;
    const wrapped=function applyLootV141R56ChestDelivery(loot,player){
      const chestLoot=loot&&state.chestLoot.has(loot);
      if(chestLoot&&state.deliveredChestLoot.has(loot))return true;
      const result=current.apply(this,arguments);
      if(chestLoot&&result!==false)state.deliveredChestLoot.add(loot);
      return result
    };
    wrapped.__ccgV141R56ChestDelivery=true;wrapped.__ccgOriginal=current;window.applyLoot=wrapped;return true
  }
  function retireSupersededChestDelivery(){
    const current=window.openChest;
    if(typeof current!=="function"||current.__ccgV141R56ChestDelivery!==true)return false;
    const next=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null;
    if(!next||!originalChainHasMarker(next,"__ccgV142R1"))return false;
    window.openChest=next;
    return true
  }
  function installChestDelivery(){
    const current=window.openChest;if(typeof current!=="function")return false;
    if(originalChainHasMarker(current,"__ccgV142R1")){
      retireSupersededChestDelivery();
      return true
    }
    if(originalChainHasMarker(current,"__ccgV141R56ChestDelivery"))return true;
    const wrapped=function openChestV141R56Guaranteed(player,chest){
      if(!ordinaryDungeon()||!chest?.active)return current.apply(this,arguments);
      let loot=chest.loot||null;
      if(!loot)try{loot=PGR?.lootForChest?.(chest,run,Math.random)||null}catch(_){}
      if(!loot){
        try{showToast("CHEST CONTENTS RECOVERING","This chest stayed closed because its reward could not be generated safely. Try it again.","red",6500)}catch(_){}
        return false
      }
      chest.loot=loot;state.chestLoot.add(loot);
      if(!inventoryCanTake(player,loot)){
        state.chestBlocks++;const name=lootName(loot);
        try{showToast("INVENTORY FULL — CHEST HELD",`${name} is inside. Free a Quick Inventory slot and reopen this chest; the reward will not be lost.`,lootTone(loot),7500)}catch(_){}
        try{floatText(player.x,player.y,`CHEST HELD · ${name}`,lootColour(loot),{life:2600})}catch(_){}
        return false
      }
      const result=current.apply(this,arguments);
      if(chest.opened&&!state.deliveredChestLoot.has(loot)){
        try{
          const delivered=window.applyLoot?.(loot,player);
          if(delivered!==false){state.deliveredChestLoot.add(loot);state.chestDeliveries++}
          else state.pendingChests.set(String(chest.id||`${chest.x},${chest.y}`),{chest,loot,player})
        }catch(error){state.pendingChests.set(String(chest.id||`${chest.x},${chest.y}`),{chest,loot,player});console.warn("[Lost Sizzler r56] chest delivery queued",error)}
      }else if(chest.opened)state.chestDeliveries++;
      return result
    };
    wrapped.__ccgV141R56ChestDelivery=true;wrapped.__ccgOriginal=current;window.openChest=wrapped;return true
  }
  function pendingChestTick(){
    for(const [key,row] of state.pendingChests){
      if(!row?.loot||!row?.player){state.pendingChests.delete(key);continue}
      if(state.deliveredChestLoot.has(row.loot)){state.pendingChests.delete(key);continue}
      if(!inventoryCanTake(row.player,row.loot))continue;
      try{const result=window.applyLoot?.(row.loot,row.player);if(result!==false){state.deliveredChestLoot.add(row.loot);state.pendingChests.delete(key);state.chestDeliveries++;showToast?.("CHEST REWARD DELIVERED",lootName(row.loot),lootTone(row.loot),5200)}}catch(_){}
    }
  }

  function shrineSummary(before,player){
    const parts=[],maxHp=Number(player?.maxHealth||0)-before.maxHealth,hp=Number(player?.health||0)-before.health,damage=Number(player?.damageBonus||0)-before.damageBonus,maxMana=Number(player?.maxMana||0)-before.maxMana,armour=Number(player?.armor||0)-before.armour,alert=Number(run?.alert||0)-before.alert;
    if(maxHp)parts.push(`${maxHp>0?"+":""}${maxHp} MAX HP`);if(hp)parts.push(`${hp>0?"+":""}${hp} HP`);if(damage)parts.push(`${damage>0?"+":""}${damage} DAMAGE`);if(maxMana)parts.push(`${maxMana>0?"+":""}${maxMana} MAX AMMO`);if(armour)parts.push(`${armour>0?"+":""}${armour} ARMOUR`);if(alert)parts.push(`${alert>0?"+":""}${Math.round(alert)} ALERT`);return parts.join(" · ")||"SHRINE ACTIVATED"
  }
  function installShrineFeedback(){
    const current=window.triggerShrine;if(typeof current!=="function")return false;
    if(originalChainHasMarker(current,"__ccgV141R56ShrineFeedback"))return true;
    const wrapped=function triggerShrineV141R56Feedback(player){
      if(!ordinaryDungeon()||!player)return current.apply(this,arguments);
      const shrine=(host?.shrines||[]).find(s=>s?.active&&s.x===player.x&&s.y===player.y),before={maxHealth:Number(player.maxHealth||0),health:Number(player.health||0),damageBonus:Number(player.damageBonus||0),maxMana:Number(player.maxMana||0),armour:Number(player.armor||0),alert:Number(run?.alert||0)};
      const result=current.apply(this,arguments);
      if(shrine&&shrine.active===false&&!shrine.__r56Feedback){
        shrine.__r56Feedback=true;const text=shrineSummary(before,player);shrine.__r56RewardText=text;state.lastShrine=text;state.shrineFeedbacks++;
        try{floatText(player.x,player.y,text,P.gold,{life:2800})}catch(_){}
        try{showToast("SHRINE REWARD",text,"gold",6500)}catch(_){}
      }
      return result
    };
    wrapped.__ccgV141R56ShrineFeedback=true;wrapped.__ccgOriginal=current;window.triggerShrine=wrapped;return true
  }

  function recentFloaterHas(start,pattern){
    try{return (floaters||[]).slice(start).some(row=>pattern.test(String(row?.text||row?.label||"")))}catch(_){return false}
  }
  function installPickupFeedback(){
    const current=window.applyItem;if(typeof current!=="function")return false;
    if(current.__ccgV141R56PickupFeedback)return true;
    const wrapped=function applyItemV141R56Feedback(item,player){
      if(!ordinaryDungeon()||!item||!player)return current.apply(this,arguments);
      const beforeScore=Number(score||0),beforeXp=Number(player.totalXp||0),start=(()=>{try{return floaters.length}catch(_){return 0}})();
      const result=current.apply(this,arguments);
      if(item.__r56PickupFeedback)return result;item.__r56PickupFeedback=true;
      queueMicrotask(()=>{
        const scoreGain=Math.max(0,Number(score||0)-beforeScore),xpGain=Math.max(0,Number(player.totalXp||0)-beforeXp),feedback=[],visual=[];
        if(scoreGain){const text=`+${Math.round(scoreGain).toLocaleString()} SCORE`;feedback.push(text);if(!recentFloaterHas(start,/\b(?:SCORE|GOLD)\b/i))visual.push(text)}
        if(String(item.kind||"")==="xpOrb"){const text=xpGain?`+${Math.round(xpGain)} XP`:`+0 XP · FLOOR CAP`;feedback.push(text);if(!recentFloaterHas(start,/\bXP\b/i))visual.push(text)}
        if(feedback.length){state.lastPickup=feedback.join(" · ");state.pickupFeedbacks++}
        if(visual.length){try{floatText(player.x,player.y,visual.join(" · "),xpGain&&!scoreGain?P.cyan:P.gold,{life:2200})}catch(_){}}
      });
      return result
    };
    wrapped.__ccgV141R56PickupFeedback=true;wrapped.__ccgOriginal=current;window.applyItem=wrapped;return true
  }

  function renderQuickIcons(){
    if(SPECIAL_BLOCK.has(specialType()))return false;
    let player=null;try{player=p1}catch(_){return false}if(!player)return false;
    const slots=document.querySelectorAll("#quick-slots .quick-slot");
    slots.forEach((slot,index)=>{
      const item=player.inventory?.[index]||null,existing=slot.querySelector(".r56-quick-slot-icon");
      if(!item){existing?.remove();slot.classList.remove("r56-has-icon");delete slot.dataset.r56IconKind;return}
      const kind=String(item.kind||"loot"),label=String(PGR?.inventoryLabel?.(item)||item.name||kind);
      let icon=existing;if(!icon){icon=document.createElement("span");icon.className="r56-quick-slot-icon";slot.appendChild(icon)}
      if(slot.dataset.r56IconKind!==kind||!icon.querySelector("svg,img.item-art")){try{icon.innerHTML=typeof itemIconSVG==="function"?itemIconSVG(kind,label):""}catch(_){icon.innerHTML=""};slot.dataset.r56IconKind=kind}
      slot.classList.add("r56-has-icon");
    });
    state.quickIconPasses++;return true
  }

  function rearmCombat(){
    // r58 owns FIRE cadence, buffers, held input and pause/inventory resets.
    return false
  }
  function combatTick(){
    return false
  }

  function installOwners(){installStyle();installApplyLoot();installChestDelivery();installShrineFeedback();installPickupFeedback()}
  function tick(){
    installOwners();pendingChestTick();renderQuickIcons()
  }

  installOwners();tick();state.timer=setInterval(()=>{try{tick()}catch(error){console.warn("[Lost Sizzler r56] completion tick failed",error)}},80);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  document.body.dataset.v141R56PlaytestCompletion="true";
  window.CCGLostSizzlerV141R56PlaytestCompletion={originalChainHasMarker,installOwners,trapIsActive,trapCycleTick,pendingChestTick,renderQuickIcons,rearmCombat,combatTick,get state(){return state}};
})();
