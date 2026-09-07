/* The Lost Sizzler V10.42 r1 — combat, shop, dossier, chest and collectible stability. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R1_STABILITY__)return;
  window.__CCG_LOST_SIZZLER_V142_R1_STABILITY__=true;

  const diagnostics={
    combatTimerRepairs:0,
    staleProjectilesCleared:0,
    invalidProjectilesCleared:0,
    shopCounterRepairs:0,
    chestRewardRepairs:0,
    chestLootRecoveries:0,
    dossierSpaceCloses:0,
    alphabetOrderRepairs:0
  };
  const now=()=>performance.now();
  const safeNumber=value=>Number.isFinite(Number(value))?Number(value):0;
  const appliedChestLoot=new WeakSet();

  function repairCpuCookIdentity(){
    try{
      const list=window.CCG_CONFIG?.followerElites||[];
      const cpu=list.find(row=>row?.name==="CPU"||row?.name==="CPU Cook"||row?.kind==="cook");
      if(cpu){
        cpu.name="CPU Cook";
        cpu.initials="CPU";
        if(typeof avatarImages!=="undefined"&&avatarImages?.get?.("CPU")&&!avatarImages.get("CPU Cook"))avatarImages.set("CPU Cook",avatarImages.get("CPU"));
      }
      const key="ccg-named-enemy-dossier-v1",raw=localStorage.getItem(key),data=raw?JSON.parse(raw):{};
      if(data&&data.CPU){
        const old=data.CPU,current=data["CPU Cook"]||{encounters:0,defeats:0};
        data["CPU Cook"]={encounters:safeNumber(current.encounters)+safeNumber(old.encounters),defeats:safeNumber(current.defeats)+safeNumber(old.defeats)};
        delete data.CPU;localStorage.setItem(key,JSON.stringify(data));
      }
    }catch(_){}
  }

  function repairCombatTimers(){
    try{if(!Number.isFinite(fire1)||Math.abs(fire1)>5000){fire1=0;diagnostics.combatTimerRepairs++}}catch(_){}
    try{if(!Number.isFinite(fire2)||Math.abs(fire2)>5000){fire2=0;diagnostics.combatTimerRepairs++}}catch(_){}
    try{if(!Number.isFinite(projectileCD)||Math.abs(projectileCD)>1000){projectileCD=0;diagnostics.combatTimerRepairs++}}catch(_){}
    try{if(!Number.isFinite(fireBuffer1)||Math.abs(fireBuffer1)>2500){fireBuffer1=0;diagnostics.combatTimerRepairs++}}catch(_){}
    try{if(!Number.isFinite(fireBuffer2)||Math.abs(fireBuffer2)>2500){fireBuffer2=0;diagnostics.combatTimerRepairs++}}catch(_){}
    try{
      for(const player of [p1,p2].filter(Boolean)){
        if(!Number.isFinite(player.hitStunMs)||player.hitStunMs<0||player.hitStunMs>10000){player.hitStunMs=0;diagnostics.combatTimerRepairs++}
      }
    }catch(_){}
  }

  function repairProjectilePool(){
    try{
      const t=now();
      for(const bullet of bullets||[]){
        if(!bullet||safeNumber(bullet.ttl)<=0)continue;
        if(!Number.isFinite(Number(bullet.x))||!Number.isFinite(Number(bullet.y))||!Number.isFinite(Number(bullet.dx))||!Number.isFinite(Number(bullet.dy))||!Number.isFinite(Number(bullet.ttl))){
          bullet.ttl=0;diagnostics.invalidProjectilesCleared++;continue;
        }
        if(!Number.isFinite(Number(bullet.__v142BornAt)))bullet.__v142BornAt=t;
        if(t-bullet.__v142BornAt>5000){bullet.ttl=0;diagnostics.staleProjectilesCleared++}
      }
    }catch(_){}
  }

  try{
    if(typeof spawnBullet==="function"&&!spawnBullet.__ccgV142R1){
      const baseSpawnBullet=spawnBullet;
      spawnBullet=function(b,remoteShot){if(b&&!Number.isFinite(Number(b.__v142BornAt)))b.__v142BornAt=now();return baseSpawnBullet(b,remoteShot)};
      spawnBullet.__ccgV142R1=true;spawnBullet.__ccgOriginal=baseSpawnBullet;
    }
  }catch(_){}

  try{
    if(typeof firePlayer==="function"&&!firePlayer.__ccgV142R1){
      const baseFirePlayer=firePlayer;
      firePlayer=function(player,direction){repairCombatTimers();repairProjectilePool();return baseFirePlayer(player,direction)};
      firePlayer.__ccgV142R1=true;firePlayer.__ccgOriginal=baseFirePlayer;
    }
  }catch(_){}

  try{
    if(typeof update==="function"&&!update.__ccgV142R1CombatIntegrity){
      const baseUpdate=update;
      update=function(dt){repairCombatTimers();repairProjectilePool();return baseUpdate(dt)};
      update.__ccgV142R1CombatIntegrity=true;update.__ccgOriginal=baseUpdate;
    }
  }catch(_){}

  function shopPurchaseCount(shop){
    const a=Math.max(0,Math.floor(safeNumber(shop?.scorePurchases))),b=Math.max(0,Math.floor(safeNumber(shop?.__v142ScorePurchases)));
    return Math.max(a,b);
  }
  try{
    if(typeof shopScorePrice==="function"){
      shopScorePrice=function(shop){return 1000*(2**shopPurchaseCount(shop))};
    }
    if(typeof openShop==="function"&&!openShop.__ccgV142R1){
      const baseOpenShop=openShop;
      openShop=function(shop,player){if(shop){const n=shopPurchaseCount(shop);shop.scorePurchases=n;shop.__v142ScorePurchases=n}return baseOpenShop(shop,player)};
      openShop.__ccgV142R1=true;openShop.__ccgOriginal=baseOpenShop;
    }
    if(typeof buyShopItem==="function"&&!buyShopItem.__ccgV142R1){
      const baseBuyShopItem=buyShopItem;
      buyShopItem=function(id){
        const shop=activeShop,before=shopPurchaseCount(shop),isNormalScorePurchase=!['banishment','banishmentScore'].includes(String(id));
        const result=baseBuyShopItem(id);
        if(result&&shop&&isNormalScorePurchase){
          const after=shopPurchaseCount(shop),wanted=before+1;
          if(after<wanted){shop.scorePurchases=wanted;shop.__v142ScorePurchases=wanted;diagnostics.shopCounterRepairs++}
          else{shop.scorePurchases=after;shop.__v142ScorePurchases=after}
          try{renderShop()}catch(_){}
        }
        return result;
      };
      buyShopItem.__ccgV142R1=true;buyShopItem.__ccgOriginal=baseBuyShopItem;
    }
  }catch(_){}

  function chestLootName(loot){return loot?.weapon?.displayName||loot?.name||String(loot?.kind||"CHEST REWARD").toUpperCase()}
  function chestPlayerStillActive(player){
    try{return Boolean(player&&typeof localPlayers==="function"&&localPlayers().includes(player)&&run&&host)}catch(_){return false}
  }
  try{
    if(typeof applyLoot==="function"&&!applyLoot.__ccgV142R1ChestTracking){
      const baseApplyLoot=applyLoot;
      applyLoot=function(loot,player){
        if(loot&&typeof loot==="object")appliedChestLoot.add(loot);
        return baseApplyLoot(loot,player);
      };
      applyLoot.__ccgV142R1ChestTracking=true;applyLoot.__ccgOriginal=baseApplyLoot;
    }
    if(typeof openChest==="function"&&!openChest.__ccgV142R1){
      const baseOpenChest=openChest;
      openChest=function(player,chest){
        if(!chest?.active)return true;
        if(chest.locked&&player?.bronzeKeys<=0)return baseOpenChest(player,chest);
        if(!chest.loot){try{chest.loot=PGR.lootForChest(chest,run,Math.random)}catch(_){} }
        const beforeActive=chest.active,result=baseOpenChest(player,chest);
        if(beforeActive&&chest.active===false){
          const loot=chest.loot,name=chestLootName(loot),scoreReward=Math.max(0,safeNumber(chest.rewardScore)),xpReward=Math.max(0,safeNumber(chest.rewardXp));
          setTimeout(()=>{
            try{
              if(!loot||typeof loot!=="object")return;
              if(!appliedChestLoot.has(loot)&&chestPlayerStillActive(player)){
                applyLoot(loot,player);diagnostics.chestLootRecoveries++;
                try{floatPickupText(player,name,loot.rarity==="GOLD MEDAL"?P.gold:loot.rarity==="ZZAP! 97%"?P.pink:P.cyan)}catch(_){}
              }
              showToast("CHEST REWARD CONFIRMED",`${name} · +${scoreReward.toLocaleString()} score · +${xpReward} XP.`,"gold",6500);
              diagnostics.chestRewardRepairs++;
            }catch(_){}
          },650);
        }
        return result;
      };
      openChest.__ccgV142R1=true;openChest.__ccgOriginal=baseOpenChest;
    }
  }catch(_){}

  function isDossierVisible(){
    const panel=document.getElementById("named-dossier-panel");
    return Boolean(panel&&!panel.classList.contains("hidden"));
  }
  document.addEventListener("keydown",event=>{
    if(event.code!=="Space")return;
    if(isDossierVisible()){
      event.preventDefault();event.stopImmediatePropagation();
      try{hideNamedDossier()}catch(_){document.getElementById("named-dossier-panel")?.classList.add("hidden")}
      try{input?.delete?.("Space");fireBuffer1=0}catch(_){}
      diagnostics.dossierSpaceCloses++;return;
    }
    try{
      if(mode==="playing"&&!event.repeat&&p1){queueAttack(p1);if(!Number.isFinite(fire1)||fire1>5000)fire1=0}
    }catch(_){}
  },true);

  function repairAlphabetOrder(hostState){
    try{
      const games=(hostState?.items||[]).filter(item=>item?.active!==false&&item?.kind==="game"&&item?.alphabetLetter);
      if(games.length<2)return;
      const letters=games.map(item=>String(item.alphabetLetter));
      if(letters.join("")!==[...letters].sort().join(""))return;
      const seed=String(run?.seed||"CCG"),floor=Math.max(1,Number(run?.floor)||1),random=window.CCGProgression?.seededRandom?.(`${seed}-V10.42-R1-ANTI-ALPHA-F${floor}`)||Math.random;
      const payload=games.map(item=>({title:item.title,alphabetLetter:item.alphabetLetter}));
      for(let i=payload.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[payload[i],payload[j]]=[payload[j],payload[i]]}
      if(payload.map(row=>String(row.alphabetLetter)).join("")===[...letters].sort().join(""))payload.push(payload.shift());
      games.forEach((item,index)=>{item.title=payload[index].title;item.alphabetLetter=payload[index].alphabetLetter});
      hostState.v142FloorAlphabetDeck=games.map(item=>`${item.alphabetLetter}:${item.title}`);diagnostics.alphabetOrderRepairs++;
    }catch(_){}
  }
  try{
    const WORLD=window.CCGWorld;
    if(WORLD?.createHostState&&!WORLD.createHostState.__ccgV142R1){
      const baseCreateHostState=WORLD.createHostState.bind(WORLD);
      WORLD.createHostState=function(worldState){const result=baseCreateHostState(worldState);repairAlphabetOrder(result);return result};
      WORLD.createHostState.__ccgV142R1=true;WORLD.createHostState.__ccgOriginal=baseCreateHostState;
    }
  }catch(_){}

  repairCpuCookIdentity();
  window.CCGLostSizzlerV142R1Stability={diagnostics,repairCombatTimers,repairProjectilePool,repairAlphabetOrder,shopPurchaseCount};
})();