/* The Lost Sizzler V10.12 — encounter-only named enemy dossiers.
 *
 * A named enemy is revealed only after the player has actually seen that enemy
 * type. The first discovery opens a single-entry dossier and pauses the run.
 * Later sightings are tracked silently and never reopen the discovery panel.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_DOSSIER_DISCOVERY_V112__)return;
  window.__CCG_LOST_SIZZLER_DOSSIER_DISCOVERY_V112__=true;

  const discoveryQueue=[];
  const knownRow=row=>Boolean((row?.encounters||0)>0||(row?.defeats||0)>0);

  function updateDossierCopy(){
    const mainButton=document.getElementById("named-dossier-btn");
    const inventoryButton=document.getElementById("inventory-dossier-btn");
    const panel=document.querySelector("#named-dossier-panel .dossier-panel");
    if(mainButton)mainButton.textContent="OPEN DISCOVERED DOSSIER";
    if(inventoryButton)inventoryButton.textContent="Named Enemy Dossier";
    const intro=panel?[...panel.children].find(node=>node.tagName==="P"):null;
    if(intro)intro.textContent="Only named enemies you have encountered are recorded here. A new enemy entry opens once, on the first encounter with that enemy type.";
  }

  try{
    if(typeof renderNamedDossier==="function"){
      renderNamedDossier=function(){
        if(!UI.namedDossierList)return;
        const dossier=PGR.readDossier();
        const discovered=(C.followerElites||[]).filter(f=>knownRow(dossier[f.name]));
        const roster=dossierFocusName
          ? discovered.filter(f=>f.name===dossierFocusName)
          : discovered;

        if(!roster.length){
          UI.namedDossierList.innerHTML='<div class="dossier-empty"><b>NO NAMED ENEMIES DISCOVERED YET</b><span>The dossier will add an enemy when you first encounter that enemy type in the dungeon.</span></div>';
          return;
        }

        UI.namedDossierList.innerHTML=roster.map(f=>{
          const row=dossier[f.name]||{encounters:0,defeats:0};
          const freed=(row.defeats||0)>0;
          const focus=dossierFocusName===f.name?" focused":"";
          const portrait=OVERRIDES.images?.namedEnemies?.[f.name]||f.avatar||C.logoFallback;
          const state=freed?"FREED FROM THE DUNGEON":"ENCOUNTERED";
          return `<article class="dossier-entry ${freed?"freed":"encountered"}${focus}"><img src="${esc(portrait)}" alt="${esc(f.name)}"><div><b>${esc(f.name)}</b><span class="dossier-type">${esc(f.kind.toUpperCase())} • ARM ${f.armor||0} • TORCH CARRIER</span><span class="dossier-state">${state}</span><div class="dossier-stats"><span class="dossier-stat"><span>ENCOUNTERS</span><strong>${row.encounters||0}</strong></span><span class="dossier-stat"><span>FREED</span><strong>${row.defeats||0}</strong></span></div><p class="dossier-trait"><strong>STRENGTH:</strong> ${esc(f.strength||"Adaptive combat behaviour.")}</p><p class="dossier-trait weakness"><strong>WEAKNESS:</strong> ${esc(f.weakness||"No confirmed weakness.")}</p></div></article>`;
        }).join("");

        if(dossierFocusName)setTimeout(()=>UI.namedDossierList?.querySelector?.(".focused")?.scrollIntoView?.({block:"center"}),40);
      };
    }
  }catch(error){console.warn("[Lost Sizzler] encounter-only dossier renderer unavailable",error);}

  try{
    if(typeof showNamedDossier==="function"){
      showNamedDossier=function(name="",pauseRun=true){
        dossierFocusName=typeof name==="string"?name:"";
        renderNamedDossier();
        UI.namedDossier?.classList.remove("hidden");
        if(pauseRun&&mode==="playing"){
          mode="dossier";
          input.clear();
        }
      };
    }
  }catch(error){console.warn("[Lost Sizzler] dossier display override unavailable",error);}

  function openNextDiscovery(){
    if(!discoveryQueue.length||mode!=="playing"||!UI.namedDossier?.classList.contains("hidden"))return;
    const name=discoveryQueue.shift();
    S.sfx?.("elite");
    showNamedDossier(name,true);
  }

  function continueDiscoveryQueue(){
    if(!discoveryQueue.length)return;
    setTimeout(openNextDiscovery,0);
  }

  try{
    if(typeof updateNamedEncounters==="function"){
      updateNamedEncounters=function(){
        const visible=(host.enemies||[])
          .filter(e=>e.alive&&e.follower&&localPlayers().some(p=>visibleTo(p,e.x,e.y)))
          .sort((a,b)=>md(a,p1)-md(b,p1));
        const chosen=visible[0]||null;
        const stored=PGR.readDossier();

        for(const e of visible){
          if(e.dossierSeen)continue;
          const name=e.follower.name;
          const alreadyKnown=knownRow(stored[name]);
          e.dossierSeen=true;
          run.stats.namedEncounters=(run.stats.namedEncounters||0)+1;
          const row=PGR.recordNamedEncounter(name,false)||{encounters:1,defeats:0};
          stored[name]=row;
          if(!alreadyKnown&&!discoveryQueue.includes(name)&&dossierFocusName!==name)discoveryQueue.push(name);
        }

        S.setNamedEnemy?.(chosen?.follower?.name||"");
        if(!host.stalker?.near)S.setRoomMood(chosen?"named":roomMoodFor(W.roomAt(world,p1.x,p1.y)));
        openNextDiscovery();
      };
    }
  }catch(error){console.warn("[Lost Sizzler] first-encounter dossier trigger unavailable",error);}

  document.getElementById("named-dossier-close")?.addEventListener("click",continueDiscoveryQueue);
  document.getElementById("named-dossier-close-top")?.addEventListener("click",continueDiscoveryQueue);
  window.addEventListener("keydown",event=>{
    if(event.code==="Escape"&&UI.namedDossier?.classList.contains("hidden"))continueDiscoveryQueue();
  });

  updateDossierCopy();
  window.CCGLostSizzlerDossierDiscoveryV112={
    refresh:()=>{updateDossierCopy();if(typeof renderNamedDossier==="function")renderNamedDossier();},
    pending:()=>[...discoveryQueue]
  };
})();
