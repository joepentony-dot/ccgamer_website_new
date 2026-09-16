/* C64 Dungeon Carnage V10.42 — local split-screen campaign state and serialized relic rewards. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_SPLIT_CAMPAIGN_STATE__)return;
  window.__CCG_LOST_SIZZLER_V142_SPLIT_CAMPAIGN_STATE__=true;

  const PLAYER_SCALARS=[
    "banishmentVessel","banishmentEssence","banishmentEssenceCost","sigilReveal","sigilWard","sigilBind","sigilBanish",
    "v142SightBonus","v142WardCooldownMs","v142BloodCartridge","v142BloodHealAt","scavenger","pendingLevels"
  ];
  const PLAYER_ARRAYS=["relics","skills","v142RelicDomains"];
  const state={installed:false,pendingRelics:[],activeRelic:null,suppressRelicUntil:0,observer:null};
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch(_){return value}};
  const currentRun=()=>{try{return typeof run!=="undefined"?run:null}catch(_){return null}};
  const localRoster=()=>{try{return typeof localPlayers==="function"?localPlayers().filter(Boolean):[p1,p2].filter(Boolean)}catch(_){return[]}};
  const domainRows=()=>window.CCG_CONFIG?.proceduralDungeon?.keyDomains||[];
  const domainById=id=>domainRows().find(row=>row.id===id)||null;
  const domainPower=domain=>String(domain?.sigilPower||"").toUpperCase();

  function copyPlayerV142(target,source){
    if(!target||!source)return target;
    if(source.rpgStats&&typeof source.rpgStats==="object")target.rpgStats={...source.rpgStats};
    for(const key of PLAYER_ARRAYS)if(Array.isArray(source[key]))target[key]=source[key].map(value=>typeof value==="object"&&value?clone(value):value);
    for(const key of PLAYER_SCALARS)if(source[key]!==undefined)target[key]=source[key];
    if(source.v142WardReadyAt!==undefined)target.v142WardReadyAt=source.v142WardReadyAt;
    if(source.v142BindReadyAt!==undefined)target.v142BindReadyAt=source.v142BindReadyAt;
    return target;
  }

  function applyPower(player,domain){
    if(!player||!domain)return false;
    window.CCGLostSizzlerV142ProceduralOverhaul?.initRpg?.(player);
    const power=domainPower(domain);
    if(power==="REVEAL")player.sigilReveal=true;
    if(power==="WARD"){player.sigilWard=true;player.v142WardReadyAt=0}
    if(power==="BIND"){player.sigilBind=true;player.v142BindReadyAt=0}
    return Boolean(power);
  }

  function seededChoices(player,domain){
    const api=window.CCGLostSizzlerV142ProceduralOverhaul;
    const pool=(api?.relics||[]).filter(row=>!new Set(player?.relics||[]).has(row.id));
    if(!pool.length)return[];
    const choices=pool.length>=3?[...pool]:[...(api?.relics||[])];
    const seed=`${currentRun()?.seed||"CCG"}-${domain?.id||"KEY"}-RELIC-${player?.level||1}`;
    const random=typeof window.CCGProgression?.seededRandom==="function"?window.CCGProgression.seededRandom(seed):Math.random;
    for(let i=choices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]]}
    return choices.slice(0,3);
  }

  function applyRelic(player,id){
    if(!player||!id)return false;
    player.relics=Array.isArray(player.relics)?player.relics:[];
    if(player.relics.includes(id))return false;
    if(id==="archive-plate"){player.maxHealth=(Number(player.maxHealth)||0)+2;player.health=Math.min(player.maxHealth,(Number(player.health)||0)+2)}
    else if(id==="sid-capacitor"){player.maxMana=(Number(player.maxMana)||0)+50;player.mana=Math.min(player.maxMana,(Number(player.mana)||0)+50)}
    else if(id==="hot-fire-button"){player.damageBonus=(Number(player.damageBonus)||0)+1;player.maxMana=Math.max(60,(Number(player.maxMana)||0)-20);player.mana=Math.min(Number(player.mana)||0,player.maxMana)}
    else if(id==="competition-pro-spring")player.moveMultiplier=(Number(player.moveMultiplier)||1)*.90;
    else if(id==="scavenger-rom"){player.scavenger=(Number(player.scavenger)||0)+.35;player.potionBonus=(Number(player.potionBonus)||0)+1}
    else if(id==="alchemist-seal"){const cost=window.CCGLostSizzlerV142ProceduralOverhaul?.essenceCost?.(player)??player.banishmentEssenceCost??3;player.banishmentEssenceCost=Math.max(2,Number(cost)-1)}
    else if(id==="cartographer-chip")player.v142SightBonus=(Number(player.v142SightBonus)||0)+1;
    else if(id==="blood-cartridge"){player.v142BloodCartridge=true;player.v142BloodHealAt=(Number(currentRun()?.stats?.kills)||0)+10}
    else if(id==="ward-amplifier")player.v142WardCooldownMs=18000;
    else return false;
    player.relics.push(id);
    return true;
  }

  function ensureModal(){
    let modal=document.getElementById("v142-relic-choice");
    if(modal)return modal;
    modal=document.createElement("section");
    modal.id="v142-relic-choice";
    modal.className="hidden";
    modal.setAttribute("role","dialog");
    modal.setAttribute("aria-modal","true");
    document.body.appendChild(modal);
    return modal;
  }

  function finishRelicChoice(player,domain,relic,previousMode){
    if(!applyRelic(player,relic.id))return;
    player.v142RelicDomains=Array.isArray(player.v142RelicDomains)?player.v142RelicDomains:[];
    if(!player.v142RelicDomains.includes(domain.id))player.v142RelicDomains.push(domain.id);
    const modal=ensureModal();
    modal.classList.add("hidden");
    state.activeRelic=null;
    try{if(typeof mode!=="undefined")mode=previousMode==="v142relic"?"playing":previousMode||"playing"}catch(_){}
    try{showToast(`RELIC CLAIMED — ${relic.name}`,relic.desc,"green",8000)}catch(_){}
    try{sync()}catch(_){}
    setTimeout(pumpRelics,0);
  }

  function pumpRelics(){
    if(state.activeRelic||!state.pendingRelics.length||performance.now()<state.suppressRelicUntil)return;
    const modal=ensureModal();
    if(!modal.classList.contains("hidden"))return;
    const next=state.pendingRelics.shift(),player=next?.player,domain=next?.domain;
    if(!player||!domain)return pumpRelics();
    player.v142RelicDomains=Array.isArray(player.v142RelicDomains)?player.v142RelicDomains:[];
    if(player.v142RelicDomains.includes(domain.id))return pumpRelics();
    const choices=seededChoices(player,domain);
    if(!choices.length){player.v142RelicDomains.push(domain.id);return pumpRelics()}
    const previousMode=(()=>{try{return typeof mode!=="undefined"?mode:"playing"}catch(_){return"playing"}})();
    state.activeRelic={player,domain};
    try{mode="v142relic";input?.clear?.()}catch(_){}
    modal.innerHTML=`<div class="v142-card"><small>KEY DOMAIN CLEARED · ${String(player.name||"PLAYER").toUpperCase()}</small><h2>CHOOSE A RELIC</h2><p>${domain.name||"A dungeon Key"} has awakened part of the Sigil for ${player.name||"this character"}. Choose one relic for this character's campaign build.</p><div class="v142-relic-grid">${choices.map(row=>`<button type="button" data-v142-split-relic="${row.id}"><b>${row.name}</b><span>${row.desc}</span></button>`).join("")}</div></div>`;
    modal.querySelectorAll("[data-v142-split-relic]").forEach(button=>button.addEventListener("click",()=>{
      const relic=choices.find(row=>row.id===button.dataset.v142SplitRelic);
      if(relic)finishRelicChoice(player,domain,relic,previousMode);
    }));
    modal.classList.remove("hidden");
  }

  function queueDomainReward(player,domain){
    if(!player||!domain)return;
    applyPower(player,domain);
    player.v142RelicDomains=Array.isArray(player.v142RelicDomains)?player.v142RelicDomains:[];
    if(player.v142RelicDomains.includes(domain.id)||state.pendingRelics.some(row=>row.player===player&&row.domain.id===domain.id)||state.activeRelic?.player===player&&state.activeRelic?.domain?.id===domain.id)return;
    state.pendingRelics.push({player,domain});
    pumpRelics();
  }

  function suppressScheduledBaseRelic(){
    state.suppressRelicUntil=performance.now()+900;
    setTimeout(()=>{
      const modal=document.getElementById("v142-relic-choice");
      if(modal&&!modal.classList.contains("hidden")){
        modal.classList.add("hidden");
        try{if(typeof mode!=="undefined"&&mode==="v142relic")mode="playing"}catch(_){}
      }
      state.suppressRelicUntil=0;
      pumpRelics();
    },360);
  }

  function installPreserve(){
    if(typeof preservePlayer!=="function"||preservePlayer.__v142SplitCampaignState)return false;
    const base=preservePlayer;
    const wrapped=function preservePlayerV142SplitCampaignState(old,...args){return copyPlayerV142(base(old,...args),old)};
    wrapped.__v142SplitCampaignState=true;
    wrapped.__ccgOriginal=base;
    preservePlayer=wrapped;
    return true;
  }

  function installMovementAuthority(){
    if(typeof movementTriggers!=="function"||movementTriggers.__v142SplitCampaignState)return false;
    const base=movementTriggers;
    const wrapped=function movementTriggersV142SplitCampaignState(player){
      const beforeDomains=new Set(Array.isArray(currentRun()?.v142ClaimedDomains)?currentRun().v142ClaimedDomains:[]);
      const result=base.apply(this,arguments);
      const locals=localRoster();
      if(locals.length<2)return result;
      const afterDomains=[...new Set(Array.isArray(currentRun()?.v142ClaimedDomains)?currentRun().v142ClaimedDomains:[])];
      const added=afterDomains.filter(id=>!beforeDomains.has(id));
      if(!added.length)return result;
      suppressScheduledBaseRelic();
      for(const id of added){
        const domain=domainById(id);
        if(!domain)continue;
        for(const local of locals)queueDomainReward(local,domain);
      }
      return result;
    };
    wrapped.__v142SplitCampaignState=true;
    wrapped.__ccgOriginal=base;
    movementTriggers=wrapped;
    return true;
  }

  function install(){
    const ready=Boolean(window.CCGLostSizzlerV142ProceduralOverhaul&&window.CCGLostSizzlerV142FiveDepthCampaign&&window.CCG_CONFIG?.proceduralDungeon&&typeof preservePlayer==="function"&&typeof movementTriggers==="function");
    if(!ready)return false;
    installPreserve();
    installMovementAuthority();
    state.installed=true;
    return true;
  }

  if(!install())throw new Error("V10.42 local split campaign state could not install in ordered bootstrap.");
  state.observer=new MutationObserver(()=>{
    if(performance.now()<state.suppressRelicUntil){
      const modal=document.getElementById("v142-relic-choice");
      if(modal&&!modal.classList.contains("hidden")){
        modal.classList.add("hidden");
        try{if(typeof mode!=="undefined"&&mode==="v142relic")mode="playing"}catch(_){}
      }
    }else pumpRelics();
  });
  state.observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  addEventListener("pagehide",()=>state.observer?.disconnect?.(),{once:true});

  window.CCGLostSizzlerV142SplitCampaignState=Object.freeze({state,copyPlayerV142,queueDomainReward});
})();
