/* The Lost Sizzler V10.41 r31 — Solo Dungeon playtest regression fixes. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R31_SOLO_DUNGEON_REGRESSIONS__)return;
  window.__CCG_LOST_SIZZLER_V141_R31_SOLO_DUNGEON_REGRESSIONS__=true;

  const INSTALL_MS=80;
  const MONITOR_MS=120;
  const POST_RESUME_ATTACK_GRACE_MS=2600;
  const ACTIVE_SPECIAL_MODES=new Set(["horde-survivor","sizzler-saboteurs"]);
  const state={
    timer:0,monitorTimer:0,installed:false,chestWrapped:false,pauseWrapped:false,shopBound:false,styleInstalled:false,cpuCookRenderWrapped:false,
    shopWalletRefreshes:0,chestImmediateDeliveries:0,chestFeedbacks:0,cpuCookRepairs:0,genericCookRelabels:0,pauseCombatResets:0,postResumeAttackRearms:0,lastResumeAt:0,lastHost:null
  };

  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const controllerId=()=>{try{return String(window.CCGLostSizzlerModeRuntime?.detect?.()||document.body?.dataset?.modeController||"")}catch(_){return String(document.body?.dataset?.modeController||"")}};
  const dungeonSolo=()=>{
    if(ACTIVE_SPECIAL_MODES.has(specialType()))return false;
    const detected=controllerId();
    if(detected==="dungeon-solo")return true;
    if(["dungeon-online","horde-solo","horde-online","spy-online","split-screen"].includes(detected))return false;
    try{return String(playMode||"solo")==="solo"&&!p2&&document.body?.dataset?.hordeSolo!=="true"}catch(_){return false}
  };
  const dungeonSoloPlaying=()=>{try{return dungeonSolo()&&document.body?.dataset?.runActive==="true"&&mode==="playing"&&Boolean(p1)}catch(_){return false}};
  const finite=value=>Number.isFinite(Number(value));
  const editable=target=>{try{return Boolean(target?.closest?.("input,textarea,select,[contenteditable='true'],[contenteditable='']"))}catch(_){return false}};
  const formatScore=value=>{try{return typeof pad==="function"?pad(Number(value)||0):String(Math.max(0,Math.floor(Number(value)||0))).padStart(6,"0")}catch(_){return"000000"}};

  function installScoreVisibilityStyle(){
    if(state.styleInstalled)return true;
    if(document.getElementById("ccg-v141-r31-solo-dungeon-style")){state.styleInstalled=true;return true}
    const style=document.createElement("style");style.id="ccg-v141-r31-solo-dungeon-style";style.textContent=`
      body[data-mode-controller="dungeon-solo"] .run-stat:has(#hud-score){position:relative!important;z-index:5!important;overflow:visible!important;min-width:86px!important}
      body[data-mode-controller="dungeon-solo"] #hud-score{position:relative!important;z-index:6!important;display:block!important;visibility:visible!important;opacity:1!important;overflow:visible!important;text-overflow:clip!important;color:#ffd85a!important}
    `;document.head.appendChild(style);state.styleInstalled=true;return true
  }

  function refreshShopWallet(){
    try{
      if(!activeShop||!p1)return false;
      const scoreNode=UI?.shopScore||document.getElementById("shop-score"),artefactNode=UI?.shopArtefacts||document.getElementById("shop-artefacts"),nextNode=UI?.shopNextPrice||document.getElementById("shop-next-price"),hudScore=UI?.score||document.getElementById("hud-score");
      if(scoreNode)scoreNode.textContent=formatScore(score);
      if(hudScore)hudScore.textContent=formatScore(score);
      if(artefactNode){let count=0;try{count=PGR?.inventoryKindCount?.(p1,"artefact")||0}catch(_){}artefactNode.textContent=String(Math.max(0,Number(count)||0))}
      if(nextNode){let next=1000;try{next=typeof shopScorePrice==="function"?shopScorePrice(activeShop):1000*(1+Math.max(0,Number(activeShop.scorePurchases)||0))}catch(_){}nextNode.textContent=String(Math.max(0,Math.floor(Number(next)||0)))}
      state.shopWalletRefreshes++;return true
    }catch(_){return false}
  }

  function onShopClick(event){
    const button=event.target?.closest?.("[data-shop-buy]");if(!button||!document.getElementById("shop-panel")?.contains(button))return;
    queueMicrotask(()=>refreshShopWallet());
    requestAnimationFrame(()=>refreshShopWallet());
    setTimeout(()=>refreshShopWallet(),60);
  }
  function installShopFix(){
    if(state.shopBound)return true;
    document.addEventListener("click",onShopClick,true);state.shopBound=true;return true
  }

  function lootName(loot){return String(loot?.weapon?.displayName||loot?.name||loot?.kind||"CHEST LOOT").toUpperCase()}
  function lootColour(loot){
    const rarity=String(loot?.rarity||"").toUpperCase();
    try{if(rarity==="ZZAP! 97%")return P?.pink||"#ff5bae";if(rarity==="GOLD MEDAL")return P?.gold||"#ffd85a";if(rarity==="SIZZLER")return P?.cyan||"#6cecff";return P?.white||"#faf4ff"}catch(_){return"#faf4ff"}
  }
  function chestFeedback(chest,loot){
    if(!chest||!loot)return false;
    const rarity=String(loot.rarity||"LOOT").toUpperCase(),name=lootName(loot),text=`${rarity} · ${name}`;
    try{floatText(chest.x,chest.y,text,lootColour(loot),{life:2400})}catch(_){}
    chest._v141R31Feedback=text;state.chestFeedbacks++;return true
  }
  function ownedSource(name){
    try{const entry=window.CCGLostSizzlerModeRuntime?.ownedSystemState?.(name);if(typeof entry?.source==="function")return entry.source}catch(_){}
    const current=window[name];if(current?.__ccgV141ModeOwnedGate&&typeof current.__ccgV141ModeOwnedSource==="function")return current.__ccgV141ModeOwnedSource;
    return typeof current==="function"?current:null
  }
  function sourceHasMarker(fn,marker){
    let current=fn;for(let depth=0;current&&depth<8;depth++){
      if(current[marker])return true;
      current=current.__ccgV141ModeOwnedSource||current.__ccgOriginal||current.__ccgV141R31Original||null;
    }
    return false
  }
  function installChestFix(){
    const source=ownedSource("openChest");if(typeof source!=="function")return false;
    if(sourceHasMarker(source,"__ccgV141R31ChestFix")){state.chestWrapped=true;return true}
    const wrapped=function openChestV141R31ImmediateLoot(player,chest){
      if(!dungeonSolo()||!chest?.active)return source.apply(this,arguments);
      let captured=chest.loot||null,deliveredImmediately=false,insideDelivery=false;
      const baseTimeout=window.setTimeout,baseFloatPickup=window.floatPickupText,baseLoot=PGR?.lootForChest;
      try{
        if(typeof baseLoot==="function")PGR.lootForChest=function(){const loot=baseLoot.apply(this,arguments);captured=captured||loot;return loot};
        if(typeof baseFloatPickup==="function")window.floatPickupText=function(){if(insideDelivery)return;return baseFloatPickup.apply(this,arguments)};
        window.setTimeout=function(callback,delay,...args){
          let chestDelivery=false;
          if(Number(delay)===500&&typeof callback==="function"){
            try{const sourceText=Function.prototype.toString.call(callback);chestDelivery=sourceText.includes("floatPickupText")&&sourceText.includes("applyLoot")}catch(_){}
          }
          if(chestDelivery&&!deliveredImmediately){
            deliveredImmediately=true;insideDelivery=true;
            try{callback(...args)}finally{insideDelivery=false}
            return 0
          }
          return baseTimeout.call(window,callback,delay,...args)
        };
        const result=source.apply(this,arguments);
        if(result&&chest?.opened&&captured){chestFeedback(chest,captured);if(deliveredImmediately)state.chestImmediateDeliveries++}
        return result
      }finally{
        window.setTimeout=baseTimeout;
        if(typeof baseFloatPickup==="function")window.floatPickupText=baseFloatPickup;
        if(typeof baseLoot==="function")PGR.lootForChest=baseLoot
      }
    };
    wrapped.__ccgV141R31ChestFix=true;wrapped.__ccgV141R31Original=source;wrapped.__ccgOriginal=source;
    window.openChest=wrapped;
    try{window.CCGLostSizzlerModeRuntime?.ensureOwnedSystemGates?.()}catch(_){}
    state.chestWrapped=true;return true
  }

  function aliasCpuPortrait(){
    try{if(typeof avatarImages!=="undefined"&&avatarImages?.has?.("CPU")&&!avatarImages.has("CPU Cook"))avatarImages.set("CPU Cook",avatarImages.get("CPU"))}catch(_){}
  }
  function isCpuCookFollower(follower){
    if(!follower||String(follower.kind||"").toLowerCase()!=="cook")return false;
    const name=String(follower.name||"").trim().toUpperCase(),initials=String(follower.initials||"").trim().toUpperCase(),music=String(follower.musicKey||"").trim().toLowerCase(),avatar=String(follower.avatar||"").trim().toLowerCase();
    return name==="CPU"||name==="CPU COOK"||initials==="CPU"||music==="cpu"||/(^|\/)cpu\.png(?:$|[?#])/.test(avatar)
  }
  function normaliseCpuCook(){
    if(!dungeonSolo()||!host?.enemies)return false;
    aliasCpuPortrait();let changed=false;
    for(const enemy of host.enemies){
      if(!isCpuCookFollower(enemy?.follower))continue;
      const already=String(enemy.follower.name||"")==="CPU Cook"&&String(enemy.follower.initials||"")==="CPU";
      if(!already){enemy.follower={...enemy.follower,name:"CPU Cook",initials:"CPU"};changed=true}
      if(!enemy._v141R31NamedCpuCook){enemy._v141R31NamedCpuCook=true;changed=true}
    }
    if(changed){host.revision=(host.revision||0)+1;state.cpuCookRepairs++}
    return changed
  }
  function genericCookDisplayName(enemy){return enemy&&String(enemy.kind||"")==="cook"&&!enemy.follower?"Kitchen Cook":null}
  function installCpuCookRenderFix(){
    const current=window.drawEnemy;if(typeof current!=="function")return false;
    if(current.__ccgV141R31CpuCookRenderFix){state.cpuCookRenderWrapped=true;return true}
    const wrapped=function drawEnemyV141R31CpuCookIdentity(enemy){
      if(!dungeonSolo()||!genericCookDisplayName(enemy))return current.apply(this,arguments);
      const baseLabel=window.label;if(typeof baseLabel!=="function")return current.apply(this,arguments);
      window.label=function labelV141R31GenericCook(text,...args){
        if(String(text)==="CPU Cook"){state.genericCookRelabels++;return baseLabel.call(this,"Kitchen Cook",...args)}
        return baseLabel.call(this,text,...args)
      };
      try{return current.apply(this,arguments)}finally{window.label=baseLabel}
    };
    wrapped.__ccgV141R31CpuCookRenderFix=true;wrapped.__ccgOriginal=current;window.drawEnemy=wrapped;state.cpuCookRenderWrapped=true;return true
  }

  function resetSoloCombatAfterResume(reason="resume"){
    if(!dungeonSoloPlaying())return false;
    try{fire1=0;fireBuffer1=0}catch(_){}
    try{
      if(p1){p1.hitStunMs=0;if("controlLocked" in p1)p1.controlLocked=false;if("controlsLocked" in p1)p1.controlsLocked=false}
    }catch(_){}
    state.lastResumeAt=performance.now();state.pauseCombatResets++;
    try{document.getElementById("game")?.focus?.({preventScroll:true})}catch(_){}
    return reason
  }
  function installPauseFix(){
    if(state.pauseWrapped)return true;
    const currentClose=window.closePauseMenu,currentPause=window.pause;
    if(typeof currentClose!=="function"||typeof currentPause!=="function")return false;
    if(!currentClose.__ccgV141R31PauseFix){
      const wrappedClose=function closePauseMenuV141R31(){const wasSolo=dungeonSolo();const result=currentClose.apply(this,arguments);if(wasSolo)queueMicrotask(()=>resetSoloCombatAfterResume("close pause"));return result};
      wrappedClose.__ccgV141R31PauseFix=true;wrappedClose.__ccgOriginal=currentClose;window.closePauseMenu=wrappedClose;
    }
    if(!currentPause.__ccgV141R31PauseFix){
      const wrappedPause=function pauseV141R31(){const wasSolo=dungeonSolo(),wasPaused=(()=>{try{return mode==="paused"}catch(_){return false}})();const result=currentPause.apply(this,arguments);if(wasSolo&&wasPaused)queueMicrotask(()=>resetSoloCombatAfterResume("pause toggle"));return result};
      wrappedPause.__ccgV141R31PauseFix=true;wrappedPause.__ccgOriginal=currentPause;window.pause=wrappedPause;
    }
    state.pauseWrapped=true;return true
  }
  function onPostResumeAttack(event){
    if(event.code!=="Space"||event.repeat||editable(event.target)||!dungeonSoloPlaying())return;
    const elapsed=performance.now()-Number(state.lastResumeAt||0);if(elapsed<0||elapsed>POST_RESUME_ATTACK_GRACE_MS)return;
    try{fire1=0;if(!finite(fireBuffer1)||fireBuffer1<0)fireBuffer1=0;if(typeof queueAttack==="function")queueAttack(p1);else fireBuffer1=700;state.postResumeAttackRearms++}catch(_){}
  }

  const logEntries=[
    ["LS-0827-01","FIXED","Secret shop wallet refresh","Score, artefact count and the next score price now commit to the open shop immediately after a purchase instead of waiting for a later refresh."],
    ["LS-0827-02","FIXED","Sizzler chest reward feedback","Chest loot is delivered on the opening action and the exact rarity/item name is announced at the chest, preventing a pause during the old delay from swallowing the reward."],
    ["LS-0827-03","FIXED","CPU Cook named presentation","The configured CPU follower is normalised to CPU Cook with its named portrait treatment, while ordinary cook enemies keep a separate Kitchen Cook identity."],
    ["LS-0827-04","FIXED","Solo attack loss after repeated pauses","Solo Dungeon resume now clears stale attack cooldown/buffer and transient control locks, with a short post-resume attack rearm safeguard."],
    ["LS-0827-05","FIXED","Solo score HUD visibility","The Solo Dungeon score cell is kept above overlapping hub layers and its live value is refreshed alongside shop transactions."]
  ];
  const escLog=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  function mountLog(){
    const tracker=document.getElementById("developer-changelog");if(!tracker)return false;
    const latest=tracker.querySelector(".developer-changelog-latest");if(latest)latest.textContent="LATEST UPDATE · 27 AUG 2026 · V10.41 · r31";
    const stamp=tracker.querySelector(".developer-changelog-intro time");if(stamp){stamp.dateTime="2026-08-27";stamp.textContent="Last updated 27 August 2026 · V10.41 · r31"}
    const list=tracker.querySelector(".developer-log-day .developer-log-list");if(!list)return false;
    for(const [id,status,title,copy] of [...logEntries].reverse()){
      if(tracker.querySelector(`[data-r31-entry="${id}"]`))continue;
      list.insertAdjacentHTML("afterbegin",`<article class="developer-log-entry" data-r31-entry="${escLog(id)}"><code class="developer-log-id">${escLog(id)}</code><span class="developer-log-status fixed">${escLog(status)}</span><div class="developer-log-copy"><b>${escLog(title)}</b><span>${escLog(copy)}</span></div></article>`)
    }
    return true
  }

  function monitor(){
    try{
      installChestFix();installPauseFix();installCpuCookRenderFix();
      if(dungeonSolo()){
        if(host&&host!==state.lastHost){state.lastHost=host;normaliseCpuCook()}
        else normaliseCpuCook();
        if(typeof mode!=="undefined"&&mode==="shop")refreshShopWallet();
        try{const hud=UI?.score||document.getElementById("hud-score");if(hud)hud.textContent=formatScore(score)}catch(_){}
      }
      mountLog()
    }catch(_){}
  }

  function install(){
    const gate=window.CCGLostSizzlerReleaseGate;if(gate&&!gate.state?.ready)return false;
    if(!document.body||!window.CCGLostSizzlerModeRuntime||typeof window.openChest!=="function"||typeof window.pause!=="function")return false;
    installScoreVisibilityStyle();installShopFix();installChestFix();installPauseFix();installCpuCookRenderFix();
    addEventListener("keydown",onPostResumeAttack,true);
    monitor();state.monitorTimer=setInterval(monitor,MONITOR_MS);
    state.installed=true;document.body.dataset.v141R31SoloDungeon="true";return true
  }

  if(!install())state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},INSTALL_MS);
  addEventListener("pagehide",()=>{
    if(state.timer)clearInterval(state.timer);if(state.monitorTimer)clearInterval(state.monitorTimer);state.timer=state.monitorTimer=0;
    if(state.shopBound)document.removeEventListener("click",onShopClick,true);
    removeEventListener("keydown",onPostResumeAttack,true)
  },{once:true});

  window.CCGLostSizzlerV141R31SoloDungeon={refreshShopWallet,normaliseCpuCook,genericCookDisplayName,resetSoloCombatAfterResume,installChestFix,installPauseFix,installCpuCookRenderFix,mountLog,monitor,logEntries,get state(){return state}};
})();
