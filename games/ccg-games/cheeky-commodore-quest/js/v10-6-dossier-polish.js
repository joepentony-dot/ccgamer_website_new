/* The Lost Sizzler — V10.6 named-enemy dossier scroll guidance and copy reduction. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_DOSSIER_V106__)return;
  window.__CCG_LOST_SIZZLER_DOSSIER_V106__=true;

  const PHONE_QUERY="(max-width:700px)";
  const panel=()=>document.querySelector("#named-dossier-panel .dossier-panel");
  const overlay=()=>document.getElementById("named-dossier-panel");
  const list=()=>document.getElementById("named-dossier-list");
  const onPhone=()=>window.matchMedia?.(PHONE_QUERY)?.matches;

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

  function polishDossier(){stripRepeatedLore();ensureCue();}

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

  const dossierList=list();
  if(dossierList&&window.MutationObserver){
    const observer=new MutationObserver(()=>{
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
})();
