/* The Lost Sizzler V10.20 — final tutorial reset and dossier alias hardening. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_ONBOARDING_HARDENING_V120__)return;
  window.__CCG_LOST_SIZZLER_ONBOARDING_HARDENING_V120__=true;

  const BLOCKED_KEY="ccg-lost-sizzler-player-dossier-block-v1";
  const CCG_ALIASES=new Set(["ccg","ccg player","cheeky commodore gamer"]);
  let wasTutorialActive=false;
  let resetForThisTutorial=false;

  const norm=value=>String(value||"").trim().toLowerCase();
  function readBlocked(){
    try{
      const raw=JSON.parse(localStorage.getItem(BLOCKED_KEY)||"[]");
      return new Set(Array.isArray(raw)?raw.map(norm).filter(Boolean):[]);
    }catch(_){return new Set()}
  }
  function writeBlocked(set){try{localStorage.setItem(BLOCKED_KEY,JSON.stringify([...set]))}catch(_){}}
  function playerIdentityNames(){
    const names=[];
    const input=document.getElementById("player-name");
    if(input?.value)names.push(input.value);
    try{if(typeof p1!=="undefined"&&p1?.name)names.push(p1.name)}catch(_){}
    try{if(typeof p2!=="undefined"&&p2?.name)names.push(p2.name)}catch(_){}
    return names.map(norm).filter(Boolean);
  }
  function aliasesFor(name){
    const n=norm(name),out=new Set(n?[n]:[]);
    if(CCG_ALIASES.has(n))for(const alias of CCG_ALIASES)out.add(alias);
    return out;
  }
  function syncPlayerDossierBlocks(){
    const blocked=readBlocked();
    const enemies=new Set((window.CCG_CONFIG?.followerElites||[]).map(row=>norm(row?.name)).filter(Boolean));
    let changed=false;
    for(const playerName of playerIdentityNames()){
      for(const alias of aliasesFor(playerName)){
        if(!enemies.has(alias)||blocked.has(alias))continue;
        blocked.add(alias);changed=true;
      }
    }
    if(changed)writeBlocked(blocked);
  }

  function rebuildPristineRunAfterTutorial(){
    try{
      if(typeof run==="undefined"||!run||run.daily||typeof PGR?.makeRun!=="function")return false;
      const difficulty=run.difficulty||"ARCADE",seed=run.seed;
      if(!seed)return false;
      const fresh=PGR.makeRun({difficulty,seed,daily:false});
      fresh.modifier=typeof PGR.chooseFloorModifier==="function"?PGR.chooseFloorModifier(fresh):null;
      run=fresh;
      if(typeof score!=="undefined")score=0;
      if(typeof won!=="undefined")won=false;
      if(typeof floorEntryCheckpoint!=="undefined")floorEntryCheckpoint=null;
      return true;
    }catch(error){
      console.warn("[Lost Sizzler] tutorial pristine-run reset failed",error);
      return false;
    }
  }

  function monitorTutorial(){
    syncPlayerDossierBlocks();
    const onboarding=window.CCGLostSizzlerOnboardingV120;
    const active=Boolean(onboarding?.state?.active);
    if(active&&!wasTutorialActive)resetForThisTutorial=false;
    if(wasTutorialActive&&!active&&!resetForThisTutorial){
      resetForThisTutorial=rebuildPristineRunAfterTutorial();
    }
    wasTutorialActive=active;
  }

  document.getElementById("player-name")?.addEventListener("input",syncPlayerDossierBlocks,{passive:true});
  document.addEventListener("focusin",event=>{if(event.target?.id==="player-name")syncPlayerDossierBlocks()},{passive:true});
  syncPlayerDossierBlocks();
  const timer=setInterval(monitorTutorial,15);
  window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});

  window.CCGLostSizzlerOnboardingHardeningV120={
    syncPlayerDossierBlocks,
    rebuildPristineRunAfterTutorial,
    aliases:[...CCG_ALIASES]
  };
})();
