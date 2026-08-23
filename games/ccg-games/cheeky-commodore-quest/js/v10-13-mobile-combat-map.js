/* The Lost Sizzler V10.13 — mobile cardinal enemy fire and toggle minimap. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_MOBILE_COMBAT_MAP_V113__)return;
  window.__CCG_LOST_SIZZLER_MOBILE_COMBAT_MAP_V113__=true;

  const MOBILE_QUERY="(max-width:900px), (pointer:coarse)";
  const mobile=()=>window.matchMedia?.(MOBILE_QUERY)?.matches===true;
  let mapOpen=false;
  let mapTimer=0;

  function activePlayers(){
    try{
      if(typeof localPlayers==="function")return localPlayers().filter(player=>player&&Number(player.health||0)>0);
    }catch(_){}
    try{return typeof p1!=="undefined"&&p1?[p1]:[]}catch(_){return[]}
  }

  function nearestPlayerToShot(shot){
    const players=activePlayers();
    let best=null,bestDistance=Infinity;
    for(const player of players){
      const distance=Math.hypot(Number(player.x||0)-Number(shot.x||0),Number(player.y||0)-Number(shot.y||0));
      if(distance<bestDistance){best=player;bestDistance=distance}
    }
    return best;
  }

  function cardinaliseEnemyShot(shot){
    if(!mobile()||!shot||!Number(shot.dx)||!Number(shot.dy))return shot;
    const target=nearestPlayerToShot(shot);
    const ax=target?Number(target.x||0)-Number(shot.x||0):Number(shot.dx||0);
    const ay=target?Number(target.y||0)-Number(shot.y||0):Number(shot.dy||0);
    if(Math.abs(ax)>=Math.abs(ay)){
      shot.dx=Math.sign(ax)||Math.sign(Number(shot.dx||0))||1;
      shot.dy=0;
    }else{
      shot.dx=0;
      shot.dy=Math.sign(ay)||Math.sign(Number(shot.dy||0))||1;
    }
    shot.mobileCardinal=true;
    return shot;
  }

  if(typeof spawnEnemyShot==="function"){
    const originalSpawnEnemyShot=spawnEnemyShot;
    try{
      spawnEnemyShot=function spawnEnemyShotMobileCardinal(shot){
        if(shot)cardinaliseEnemyShot(shot);
        return originalSpawnEnemyShot.apply(this,arguments);
      };
    }catch(error){console.warn("[Lost Sizzler] mobile cardinal enemy fire unavailable",error)}
  }

  function mobileMapPanel(){return document.getElementById("ccg-mobile-minimap")}
  function mobileMapToggle(){return document.querySelector('[data-action="map"]')}

  function syncToggle(){
    const button=mobileMapToggle();
    if(!button)return;
    button.setAttribute("aria-pressed",mapOpen?"true":"false");
    button.classList.toggle("active",mapOpen);
    button.textContent=mapOpen?"MAP OFF":"MAP";
  }

  function copyRadar(){
    if(!mapOpen||!mobile())return;
    const source=document.getElementById("radar-canvas"),target=document.getElementById("ccg-mobile-minimap-canvas");
    if(!source||!target)return;
    try{
      if(typeof renderRadarPanel==="function"&&typeof p1!=="undefined"&&p1)renderRadarPanel(p1);
    }catch(_){}
    const context=target.getContext("2d");
    if(!context)return;
    const width=Math.max(1,source.width||260),height=Math.max(1,source.height||140);
    const ratio=width/height;
    const cssWidth=Math.max(220,Math.round(target.getBoundingClientRect().width||280));
    const cssHeight=Math.max(120,Math.round(cssWidth/ratio));
    if(target.width!==cssWidth||target.height!==cssHeight){target.width=cssWidth;target.height=cssHeight}
    context.imageSmoothingEnabled=false;
    context.clearRect(0,0,target.width,target.height);
    context.drawImage(source,0,0,target.width,target.height);
  }

  function stopMapTimer(){if(mapTimer){clearInterval(mapTimer);mapTimer=0}}
  function startMapTimer(){
    stopMapTimer();
    if(!mapOpen)return;
    copyRadar();
    mapTimer=setInterval(copyRadar,120);
  }

  function setMapOpen(open){
    mapOpen=Boolean(open&&mobile()&&document.body.dataset.runActive==="true");
    mobileMapPanel()?.classList.toggle("hidden",!mapOpen);
    syncToggle();
    if(mapOpen)startMapTimer();else stopMapTimer();
  }

  function toggleMap(event){
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setMapOpen(!mapOpen);
  }

  function ensureMapPanel(){
    if(!mobile())return;
    const wrap=document.querySelector(".canvas-wrap");
    if(!wrap||mobileMapPanel())return;
    const panel=document.createElement("section");
    panel.id="ccg-mobile-minimap";
    panel.className="ccg-mobile-minimap hidden";
    panel.setAttribute("aria-label","Dungeon minimap");
    panel.innerHTML='<div class="ccg-mobile-minimap-head"><b>MINIMAP</b><span>EXPLORED AREA</span><button type="button" id="ccg-mobile-minimap-close" aria-label="Close minimap">×</button></div><canvas id="ccg-mobile-minimap-canvas" width="280" height="150" aria-label="Explored dungeon minimap"></canvas><small>Only explored areas and discovered markers are shown.</small>';
    wrap.appendChild(panel);
    panel.querySelector("#ccg-mobile-minimap-close")?.addEventListener("pointerdown",toggleMap,{passive:false});
  }

  function ensureTouchMapButton(){
    if(!mobile())return;
    const actions=document.querySelector("#v104-touch-controls .v104-touch-actions");
    if(!actions||mobileMapToggle())return;
    const button=document.createElement("button");
    button.className="v104-touch-btn ccg-mobile-map-btn";
    button.type="button";
    button.dataset.action="map";
    button.textContent="MAP";
    button.setAttribute("aria-label","Toggle dungeon minimap");
    button.setAttribute("aria-pressed","false");
    button.addEventListener("pointerdown",toggleMap,{passive:false});
    actions.appendChild(button);
    syncToggle();
  }

  function ensureMobileMap(){ensureMapPanel();ensureTouchMapButton()}

  const retry=setInterval(()=>{
    ensureMobileMap();
    if(mobileMapPanel()&&mobileMapToggle())clearInterval(retry);
  },250);
  setTimeout(()=>clearInterval(retry),5000);
  ensureMobileMap();

  const bodyObserver=new MutationObserver(()=>{
    if(document.body.dataset.runActive!=="true")setMapOpen(false);
    else ensureMobileMap();
  });
  bodyObserver.observe(document.body,{attributes:true,attributeFilter:["data-run-active"]});

  window.matchMedia?.(MOBILE_QUERY)?.addEventListener?.("change",()=>{
    if(!mobile())setMapOpen(false);
    else ensureMobileMap();
  });
  window.addEventListener("resize",()=>{if(mapOpen)requestAnimationFrame(copyRadar)},{passive:true});
  window.addEventListener("pagehide",()=>{stopMapTimer();bodyObserver.disconnect()},{once:true});

  window.CCGLostSizzlerMobileCombatMap={
    isMobile:mobile,
    cardinaliseEnemyShot,
    setMapOpen,
    copyRadar
  };
})();
