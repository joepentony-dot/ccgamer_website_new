/* The Lost Sizzler V10.41 r31 — Solo Dungeon playtest regression fixes. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R31_SOLO_DUNGEON_REGRESSIONS__)return;
  window.__CCG_LOST_SIZZLER_V141_R31_SOLO_DUNGEON_REGRESSIONS__=true;

  const INSTALL_MS=80;
  const MONITOR_MS=120;
  const POST_RESUME_ATTACK_GRACE_MS=2600;
  const CANVAS_WATCH_MS=650;
  const CANVAS_BLANK_CONFIRMATIONS=2;
  const ACTIVE_SPECIAL_MODES=new Set(["horde-survivor","sizzler-saboteurs"]);
  const state={
    timer:0,monitorTimer:0,installed:false,chestWrapped:false,pauseWrapped:false,panelBound:false,shopBound:false,styleInstalled:false,cpuCookRenderWrapped:false,cpuCookSpawnWrapped:false,
    shopWalletRefreshes:0,chestImmediateDeliveries:0,chestFeedbacks:0,cpuCookRepairs:0,genericCookRelabels:0,pauseCombatResets:0,postResumeAttackRearms:0,displayRecoveries:0,displayFrames:0,lastResumeAt:0,lastHost:null,
    canvasBlankStreak:0,canvasRecoveries:0,canvasHealthyFrames:0,canvasFallbackRestores:0,lastCanvasCheckAt:0,backupCanvas:null
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
      if(nextNode){let next=1000;try{next=typeof shopScorePrice==="function"?shopScorePrice(activeShop):1000*(2**Math.max(0,Math.floor(Number(activeShop.scorePurchases)||0)))}catch(_){}nextNode.textContent=String(Math.max(0,Math.floor(Number(next)||0)))}
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
    const rarity=String(loot.rarity||"LOOT").toUpperCase(),name=lootName(loot),scoreReward=Math.max(0,Math.floor(Number(chest.rewardScore)||0)),xpReward=Math.max(0,Math.floor(Number(chest.rewardXp)||0)),rewardText=[scoreReward?`+${scoreReward.toLocaleString()} SCORE`:"",xpReward?`+${xpReward} XP`:""].filter(Boolean).join(" · "),text=`${rarity} · ${name}${rewardText?` · ${rewardText}`:""}`;
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
  function installCpuCookSpawnFix(){
    const current=window.startWorld;if(typeof current!=="function")return false;
    if(sourceHasMarker(current,"__ccgV141R31CpuCookSpawnFix")){state.cpuCookSpawnWrapped=true;return true}
    const wrapped=function startWorldV141R31CpuCook(){
      const result=current.apply(this,arguments);
      if(dungeonSolo()){
        normaliseCpuCook();
        queueMicrotask(()=>normaliseCpuCook());
      }
      return result
    };
    wrapped.__ccgV141R31CpuCookSpawnFix=true;wrapped.__ccgOriginal=current;
    window.startWorld=wrapped;state.cpuCookSpawnWrapped=true;return true
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
  function visiblePanel(id){const node=document.getElementById(id);return Boolean(node&&!node.classList.contains("hidden"))}
  function recoverSoloDisplay(reason="panel close"){
    if(!dungeonSolo()||document.body?.dataset?.runActive!=="true")return false;
    if(visiblePanel("pause")||visiblePanel("inventory-panel")||visiblePanel("item-info-panel")||visiblePanel("named-dossier-panel")||visiblePanel("shop-panel"))return false;
    try{if(["paused","inventory","dossier"].includes(mode))mode="playing"}catch(_){}
    try{input?.clear?.();last=performance.now();cameras?.clear?.()}catch(_){}
    const draw=()=>{
      try{
        window.__CCG_LOST_SIZZLER_SCHEDULE_RESIZE__?.();
        if(typeof resizeGameCanvas==="function")resizeGameCanvas();
        if(typeof render==="function")render();
        if(canvas&&canvas.width>0&&canvas.height>0)state.displayFrames++;
      }catch(error){try{console.warn("[Lost Sizzler r31] Solo display recovery retry",error)}catch(_){}}
    };
    draw();try{requestAnimationFrame(draw)}catch(_){}setTimeout(draw,60);
    state.displayRecoveries++;
    try{document.getElementById("game")?.focus?.({preventScroll:true})}catch(_){}
    return reason
  }

  function canvasFrameIsBlank(){
    if(!dungeonSoloPlaying())return false;
    try{
      if(!canvas||canvas.width<8||canvas.height<8)return false;
      const context=ctx||canvas.getContext("2d",{willReadFrequently:true});if(!context)return false;
      const xs=[.16,.33,.5,.67,.84],ys=[.16,.33,.5,.67,.84];let visible=0,samples=0;
      for(const yf of ys)for(const xf of xs){
        const x=Math.max(0,Math.min(canvas.width-1,Math.floor(canvas.width*xf))),y=Math.max(0,Math.min(canvas.height-1,Math.floor(canvas.height*yf))),pixel=context.getImageData(x,y,1,1).data;samples++;
        if(pixel[3]>12&&(pixel[0]+pixel[1]+pixel[2])>30)visible++;
      }
      return samples===25&&visible===0
    }catch(_){return false}
  }
  function captureHealthyCanvas(){
    try{
      if(!canvas||canvas.width<8||canvas.height<8||canvasFrameIsBlank())return false;
      let backup=state.backupCanvas;
      if(!backup){backup=document.createElement("canvas");state.backupCanvas=backup}
      if(backup.width!==canvas.width)backup.width=canvas.width;if(backup.height!==canvas.height)backup.height=canvas.height;
      const context=backup.getContext("2d");if(!context)return false;context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,backup.width,backup.height);context.drawImage(canvas,0,0);state.canvasHealthyFrames++;return true
    }catch(_){return false}
  }
  function restoreHealthyCanvas(){
    try{
      const backup=state.backupCanvas;if(!backup||!canvas||backup.width!==canvas.width||backup.height!==canvas.height)return false;
      const context=ctx||canvas.getContext("2d");if(!context)return false;context.save();context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.globalCompositeOperation="source-over";context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(backup,0,0);context.restore();state.canvasFallbackRestores++;return true
    }catch(_){return false}
  }
  function watchSoloCanvas(force=false){
    const now=performance.now();if(!force&&now-Number(state.lastCanvasCheckAt||0)<CANVAS_WATCH_MS)return false;state.lastCanvasCheckAt=now;
    if(!dungeonSoloPlaying()||visiblePanel("pause")||visiblePanel("inventory-panel")||visiblePanel("item-info-panel")||visiblePanel("named-dossier-panel")||visiblePanel("shop-panel")){state.canvasBlankStreak=0;return false}
    if(!canvasFrameIsBlank()){state.canvasBlankStreak=0;captureHealthyCanvas();return false}
    state.canvasBlankStreak++;
    if(state.canvasBlankStreak<CANVAS_BLANK_CONFIRMATIONS)return false;
    state.canvasBlankStreak=0;state.canvasRecoveries++;recoverSoloDisplay("blank canvas watchdog");
    requestAnimationFrame(()=>{
      try{
        if(canvasFrameIsBlank())restoreHealthyCanvas();else captureHealthyCanvas();
        setTimeout(()=>{try{if(canvasFrameIsBlank())restoreHealthyCanvas();else captureHealthyCanvas()}catch(_){}},90)
      }catch(_){}
    });
    return true
  }

  function scheduleDisplayRecovery(reason){queueMicrotask(()=>recoverSoloDisplay(reason));setTimeout(()=>recoverSoloDisplay(reason),80)}
  function onPanelReturn(event){
    const id=String(event.target?.closest?.("button")?.id||"");
    if(!["resume-btn","inventory-close","inventory-close-top","item-info-close","named-dossier-close","named-dossier-close-top","shop-close"].includes(id))return;
    scheduleDisplayRecovery(id)
  }
  function onPanelReturnKey(event){if(!["Escape","Tab"].includes(event.code))return;scheduleDisplayRecovery(event.code)}
  function installPanelReturnFix(){
    if(state.panelBound)return true;
    document.addEventListener("click",onPanelReturn,true);addEventListener("keydown",onPanelReturnKey,true);state.panelBound=true;return true
  }
  function installPauseFix(){
    if(state.pauseWrapped)return true;
    const currentClose=window.closePauseMenu,currentPause=window.pause;
    if(typeof currentClose!=="function"||typeof currentPause!=="function")return false;
    if(!currentClose.__ccgV141R31PauseFix){
      const wrappedClose=function closePauseMenuV141R31(){const wasSolo=dungeonSolo();const result=currentClose.apply(this,arguments);if(wasSolo){queueMicrotask(()=>resetSoloCombatAfterResume("close pause"));scheduleDisplayRecovery("close pause")}return result};
      wrappedClose.__ccgV141R31PauseFix=true;wrappedClose.__ccgOriginal=currentClose;window.closePauseMenu=wrappedClose;
    }
    if(!currentPause.__ccgV141R31PauseFix){
      const wrappedPause=function pauseV141R31(){const wasSolo=dungeonSolo(),wasPaused=(()=>{try{return mode==="paused"}catch(_){return false}})();const result=currentPause.apply(this,arguments);if(wasSolo&&wasPaused){queueMicrotask(()=>resetSoloCombatAfterResume("pause toggle"));scheduleDisplayRecovery("pause toggle")}return result};
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
    ["LS-0828-01","FIXED","Recurring Solo black canvas","Solo Dungeon now watches the live gameplay canvas during active play. Two consecutive blank-frame checks trigger a canvas/camera rebuild and, if the fresh render is still blank, the last healthy frame is restored while live rendering retries."],
    ["LS-0827-01","FIXED","Secret shop wallet refresh","Score, artefact count and the next score price now commit to the open shop immediately after a purchase instead of waiting for a later refresh."],
    ["LS-0827-02","FIXED","Sizzler chest reward feedback","Chest loot is delivered on the opening action and the exact rarity/item name is announced at the chest, preventing a pause during the old delay from swallowing the reward."],
    ["LS-0827-03","FIXED","CPU Cook named presentation","The configured CPU follower is normalised to CPU Cook with its named portrait treatment, while ordinary cook enemies keep a separate Kitchen Cook identity."],
    ["LS-0827-04","FIXED","Solo attack loss after repeated pauses","Solo Dungeon resume now clears stale attack cooldown/buffer and transient control locks, with a short post-resume attack rearm safeguard."],
    ["LS-0827-05","FIXED","Solo score HUD visibility","The Solo Dungeon score cell is kept above overlapping hub layers and its live value is refreshed alongside shop transactions."],
    ["LS-0827-06","FIXED","Black screen after Pause or inventory","Returning from Pause, inventory, item information or the dossier now restores the live Solo render frame, canvas sizing, camera state and keyboard focus."],
    ["LS-0827-07","FIXED","Repeat shop purchases","Normal shop stock no longer becomes Sold or Traded after one purchase. The shared price now doubles through 1,000, 2,000, 4,000 and onward for every purchase made at that shop."],
    ["LS-0827-08","ADDED","Guaranteed chest score and XP","Every opened chest now awards 10 XP plus a depth-scaled score reward, with the exact amounts displayed at the chest and in the reward notice."],
    ["LS-0827-09","FIXED","Death Stalker pursuit","Without a lit torch frightening it, the Death Stalker now clears ordinary cover and flank tactics and takes a direct pursuit route toward the player."],
    ["LS-0827-10","FIXED","Repeat rating prompt for signed-in players","Before showing Rate This Game, the game now checks whether the verified signed-in account has already submitted a rating and suppresses the prompt when it has."]
  ];
  const escLog=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  function mountLog(){
    const tracker=document.getElementById("developer-changelog");if(!tracker)return false;
    const latest=tracker.querySelector(".developer-changelog-latest");if(latest)latest.textContent="LATEST UPDATE · 28 AUG 2026 · V10.41 · r31";
    const stamp=tracker.querySelector(".developer-changelog-intro time");if(stamp){stamp.dateTime="2026-08-28";stamp.textContent="Last updated 28 August 2026 · V10.41 · r31"}
    const list=tracker.querySelector(".developer-log-day .developer-log-list");if(!list)return false;
    for(const [id,status,title,copy] of [...logEntries].reverse()){
      if(tracker.querySelector(`[data-r31-entry="${id}"]`))continue;
      list.insertAdjacentHTML("afterbegin",`<article class="developer-log-entry" data-r31-entry="${escLog(id)}"><code class="developer-log-id">${escLog(id)}</code><span class="developer-log-status fixed">${escLog(status)}</span><div class="developer-log-copy"><b>${escLog(title)}</b><span>${escLog(copy)}</span></div></article>`)
    }
    return true
  }

  function monitor(){
    try{
      installChestFix();installPauseFix();installPanelReturnFix();installCpuCookSpawnFix();installCpuCookRenderFix();
      if(dungeonSolo()){
        if(host&&host!==state.lastHost){state.lastHost=host;state.canvasBlankStreak=0;state.backupCanvas=null;normaliseCpuCook()}
        else normaliseCpuCook();
        if(typeof mode!=="undefined"&&mode==="shop")refreshShopWallet();
        try{const hud=UI?.score||document.getElementById("hud-score");if(hud)hud.textContent=formatScore(score)}catch(_){}
        watchSoloCanvas();
      }else{state.canvasBlankStreak=0}
      mountLog()
    }catch(_){}
  }

  function install(){
    const gate=window.CCGLostSizzlerReleaseGate;if(gate&&!gate.state?.ready)return false;
    if(!document.body||!window.CCGLostSizzlerModeRuntime||typeof window.openChest!=="function"||typeof window.pause!=="function")return false;
    installScoreVisibilityStyle();installShopFix();installChestFix();installPauseFix();installPanelReturnFix();installCpuCookSpawnFix();installCpuCookRenderFix();
    addEventListener("keydown",onPostResumeAttack,true);
    monitor();state.monitorTimer=setInterval(monitor,MONITOR_MS);
    state.installed=true;document.body.dataset.v141R31SoloDungeon="true";return true
  }

  if(!install())state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},INSTALL_MS);
  addEventListener("pagehide",()=>{
    if(state.timer)clearInterval(state.timer);if(state.monitorTimer)clearInterval(state.monitorTimer);state.timer=state.monitorTimer=0;
    if(state.shopBound)document.removeEventListener("click",onShopClick,true);
    if(state.panelBound){document.removeEventListener("click",onPanelReturn,true);removeEventListener("keydown",onPanelReturnKey,true)}
    removeEventListener("keydown",onPostResumeAttack,true);state.backupCanvas=null
  },{once:true});

  window.CCGLostSizzlerV141R31SoloDungeon={refreshShopWallet,normaliseCpuCook,genericCookDisplayName,resetSoloCombatAfterResume,recoverSoloDisplay,canvasFrameIsBlank,captureHealthyCanvas,restoreHealthyCanvas,watchSoloCanvas,installChestFix,installPauseFix,installPanelReturnFix,installCpuCookSpawnFix,installCpuCookRenderFix,mountLog,monitor,logEntries,get state(){return state}};
})();