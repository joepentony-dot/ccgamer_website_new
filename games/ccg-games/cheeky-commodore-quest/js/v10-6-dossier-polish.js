/* The Lost Sizzler — V10.6 named-enemy dossier discovery behaviour and polish. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_DOSSIER_V106__)return;
  window.__CCG_LOST_SIZZLER_DOSSIER_V106__=true;

  const PHONE_QUERY="(max-width:700px), (hover:none) and (pointer:coarse)";
  const panel=()=>document.querySelector("#named-dossier-panel .dossier-panel");
  const overlay=()=>document.getElementById("named-dossier-panel");
  const list=()=>document.getElementById("named-dossier-list");
  const onPhone=()=>window.matchMedia?.(PHONE_QUERY)?.matches;
  const discoveryQueue=[];
  let discoveryOpenScheduled=false;

  function ensureCss(){
    if(document.querySelector('link[data-ccg-dossier-polish="true"]'))return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="css/v10-6-dossier-polish.css";
    link.dataset.ccgDossierPolish="true";
    document.head.appendChild(link);
  }

  function stripRepeatedLore(){
    list()?.querySelectorAll?.(".dossier-lore")?.forEach(node=>node.remove());
  }

  function filterDossierEntries(){
    const root=list();
    if(!root)return;
    root.querySelectorAll(".dossier-entry.unknown").forEach(node=>node.remove());
    if(typeof dossierFocusName!=="undefined"&&dossierFocusName){
      root.querySelectorAll(".dossier-entry:not(.focused)").forEach(node=>node.remove());
    }
    if(!root.querySelector(".dossier-entry")&&!root.querySelector(".dossier-empty")){
      root.innerHTML='<div class="v104-credit-empty dossier-empty">No named enemies encountered yet. Entries are added only when you meet them in the dungeon.</div>';
    }
  }

  function removeCue(){document.getElementById("dossier-scroll-cue")?.remove();}

  function updateCue(){
    const box=panel(),cue=document.getElementById("dossier-scroll-cue"),wrap=overlay();
    if(!box||!cue||!wrap||wrap.classList.contains("hidden")||onPhone()){
      if(cue)cue.hidden=true;
      return;
    }
    const scrollable=box.scrollHeight>box.clientHeight+18;
    const nearBottom=box.scrollTop+box.clientHeight>=box.scrollHeight-36;
    cue.hidden=!scrollable||nearBottom;
  }

  function ensureCue(){
    if(onPhone()){removeCue();return;}
    const wrap=overlay(),box=panel();
    if(!wrap||!box)return;
    let cue=document.getElementById("dossier-scroll-cue");
    if(!cue){
      cue=document.createElement("button");
      cue.id="dossier-scroll-cue";
      cue.type="button";
      cue.className="dossier-scroll-cue";
      cue.setAttribute("aria-label","Scroll down to see more dossier entries and the Close Dossier button");
      cue.innerHTML='<span aria-hidden="true">▼ ▼ ▼</span><b>SCROLL FOR MORE</b>';
      cue.addEventListener("click",()=>{
        const target=panel();
        if(!target)return;
        target.scrollBy({top:Math.max(260,target.clientHeight*.72),behavior:"smooth"});
      });
      wrap.appendChild(cue);
    }
    if(box.dataset.dossierCueBound!=="true"){
      box.dataset.dossierCueBound="true";
      box.addEventListener("scroll",updateCue,{passive:true});
    }
    requestAnimationFrame(updateCue);
  }

  function polishDossier(){
    filterDossierEntries();
    stripRepeatedLore();
    ensureCue();
  }

  const originalRender=typeof renderNamedDossier==="function"?renderNamedDossier:null;
  if(originalRender){
    try{
      renderNamedDossier=function(){
        const result=originalRender.apply(this,arguments);
        polishDossier();
        return result;
      };
    }catch(error){console.warn("[Lost Sizzler] dossier render polish unavailable",error);}
  }

  const originalShow=typeof showNamedDossier==="function"?showNamedDossier:null;
  if(originalShow){
    try{
      showNamedDossier=function(){
        const result=originalShow.apply(this,arguments);
        requestAnimationFrame(polishDossier);
        return result;
      };
    }catch(error){console.warn("[Lost Sizzler] dossier scroll cue unavailable",error);}
  }

  function openNextDiscovery(){
    const wrap=overlay();
    if(!discoveryQueue.length||mode!=="playing"||!wrap||!wrap.classList.contains("hidden"))return;
    const name=discoveryQueue.shift();
    showToast(`NEW DOSSIER ENTRY — ${name.toUpperCase()}`,"First encounter recorded. Opening this enemy's dossier entry now.","gold",5200);
    showNamedDossier(name,true);
  }

  function scheduleNextDiscovery(){
    if(!discoveryQueue.length||discoveryOpenScheduled)return;
    discoveryOpenScheduled=true;
    setTimeout(()=>{
      discoveryOpenScheduled=false;
      openNextDiscovery();
    },0);
  }

  if(typeof updateNamedEncounters==="function"){
    try{
      updateNamedEncounters=function updateNamedEncountersDiscoveryOnly(){
        const visible=(host.enemies||[])
          .filter(e=>e.alive&&e.follower&&localPlayers().some(p=>visibleTo(p,e.x,e.y)))
          .sort((a,b)=>md(a,p1)-md(b,p1));
        const chosen=visible[0]||null;
        const stored=PGR.readDossier?.()||{};
        const knownNames=new Set(Object.entries(stored)
          .filter(([,row])=>(row?.encounters||0)>0||(row?.defeats||0)>0)
          .map(([name])=>name));

        for(const e of visible){
          if(e.dossierSeen)continue;
          e.dossierSeen=true;
          const name=e.follower.name;
          const firstEver=!knownNames.has(name);
          run.stats.namedEncounters=(run.stats.namedEncounters||0)+1;
          PGR.recordNamedEncounter(name,false);
          knownNames.add(name);
          if(firstEver&&!discoveryQueue.includes(name))discoveryQueue.push(name);
        }

        S.setNamedEnemy?.(chosen?.follower?.name||"");
        if(!host.stalker?.near)S.setRoomMood(chosen?"named":roomMoodFor(W.roomAt(world,p1.x,p1.y)));
        scheduleNextDiscovery();
      };
    }catch(error){console.warn("[Lost Sizzler] first-encounter dossier behaviour unavailable",error);}
  }

  document.getElementById("named-dossier-close")?.addEventListener("click",scheduleNextDiscovery);
  document.getElementById("named-dossier-close-top")?.addEventListener("click",scheduleNextDiscovery);
  window.addEventListener("keydown",event=>{
    if(event.code==="Escape"&&overlay()?.classList.contains("hidden"))scheduleNextDiscovery();
  });

  const dossierList=list();
  if(dossierList&&window.MutationObserver){
    const observer=new MutationObserver(()=>{
      filterDossierEntries();
      stripRepeatedLore();
      requestAnimationFrame(updateCue);
    });
    observer.observe(dossierList,{childList:true,subtree:true});
  }

  window.addEventListener("resize",()=>{
    if(onPhone())removeCue();
    else ensureCue();
    requestAnimationFrame(updateCue);
  });

  ensureCss();
  polishDossier();
  window.CCGLostSizzlerDossierDiscovery={pending:()=>[...discoveryQueue]};
})();
