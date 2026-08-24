/* The Lost Sizzler V10.41 — solo full-level explored map and M-key ownership. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_SOLO_FULL_MAP__)return;
  window.__CCG_LOST_SIZZLER_V141_SOLO_FULL_MAP__=true;

  const state={open:false,previousMode:"playing",pausedByMap:false,timer:0,renderedAt:0};
  const CELL=8;

  function ensureStyle(){
    if(document.querySelector('link[data-ccg-v141-solo-full-map="true"]'))return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="css/v10-41-solo-full-map.css?v=20260824a";
    link.dataset.ccgV141SoloFullMap="true";
    document.head.appendChild(link);
  }

  function isTypingTarget(target){
    if(!(target instanceof Element))return false;
    if(target.matches("input,textarea,select,[contenteditable='true'],[contenteditable='']"))return true;
    return Boolean(target.closest("input,textarea,select,[contenteditable='true'],[contenteditable='']"));
  }

  function soloRun(){
    try{return typeof playMode!=="undefined"&&playMode==="solo"&&document.body?.dataset?.runActive==="true"}catch(_){return false}
  }

  function ensurePanel(){
    let panel=document.getElementById("ccg-solo-full-map");
    if(panel)return panel;
    panel=document.createElement("section");
    panel.id="ccg-solo-full-map";
    panel.className="hidden";
    panel.setAttribute("role","dialog");
    panel.setAttribute("aria-modal","true");
    panel.setAttribute("aria-labelledby","ccg-solo-full-map-title");
    panel.innerHTML=`
      <div class="ccg-full-map-card">
        <div class="ccg-full-map-head">
          <div class="ccg-full-map-title"><b id="ccg-solo-full-map-title">FULL DUNGEON MAP</b><span>EXPLORED GROUND ONLY · UNDISCOVERED AREAS REMAIN DARK</span></div>
          <button type="button" id="ccg-solo-full-map-close">CLOSE · M</button>
        </div>
        <div class="ccg-full-map-stage"><canvas id="ccg-solo-full-map-canvas" width="1024" height="672" aria-label="Full explored dungeon map"></canvas></div>
        <div class="ccg-full-map-footer">
          <div class="ccg-full-map-legend"><span><i class="ccg-map-dot ccg-map-player"></i>YOU</span><span><i class="ccg-map-dot ccg-map-key"></i>KEY</span><span><i class="ccg-map-dot ccg-map-sigil"></i>SIGIL</span><span><i class="ccg-map-dot ccg-map-cache"></i>DEATH CACHE</span><span><i class="ccg-map-dot ccg-map-exit"></i>EXIT</span></div>
          <span>PRESS M OR ESC TO RETURN</span>
        </div>
      </div>`;
    document.body.appendChild(panel);
    panel.querySelector("#ccg-solo-full-map-close")?.addEventListener("click",()=>closeMap());
    return panel;
  }

  function exploredSet(){
    try{return explored?.get?.(p1?.id)||new Set()}catch(_){return new Set()}
  }

  function visibleKnowledge(ex,q){
    return Boolean(q&&ex.has(`${Math.round(Number(q.x))},${Math.round(Number(q.y))}`));
  }

  function drawMarker(context,q,colour,shape="square",label=""){
    if(!q)return;
    const x=Math.round((Number(q.x)+.5)*CELL),y=Math.round((Number(q.y)+.5)*CELL),size=Math.max(5,CELL-1);
    context.save();
    context.fillStyle=colour;
    context.strokeStyle="#ffffff";
    context.lineWidth=1.5;
    if(shape==="diamond"){
      context.translate(x,y);context.rotate(Math.PI/4);context.fillRect(-size/2,-size/2,size,size);context.strokeRect(-size/2,-size/2,size,size);context.rotate(-Math.PI/4);context.translate(-x,-y);
    }else if(shape==="cross"){
      context.strokeStyle=colour;context.lineWidth=2.5;context.beginPath();context.moveTo(x-4,y-4);context.lineTo(x+4,y+4);context.moveTo(x+4,y-4);context.lineTo(x-4,y+4);context.stroke();
    }else{
      context.fillRect(x-size/2,y-size/2,size,size);context.strokeRect(x-size/2,y-size/2,size,size);
    }
    if(label){
      context.font='bold 9px Consolas, "Courier New", monospace';context.textAlign="center";context.textBaseline="bottom";context.fillStyle="#fff";context.fillText(label,x,y-7);
    }
    context.restore();
  }

  function drawMap(){
    if(!state.open)return;
    if(!soloRun()||typeof world==="undefined"||!world||typeof p1==="undefined"||!p1){closeMap(false);return}
    const canvas=document.getElementById("ccg-solo-full-map-canvas"),context=canvas?.getContext?.("2d");
    if(!canvas||!context)return;
    const rows=Array.isArray(world.map)?world.map.length:0,cols=rows&&Array.isArray(world.map[0])?world.map[0].length:0;
    if(!rows||!cols)return;
    const width=cols*CELL,height=rows*CELL;
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
    context.imageSmoothingEnabled=false;
    context.fillStyle="#020104";context.fillRect(0,0,width,height);
    const ex=exploredSet();

    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      if(!ex.has(`${x},${y}`))continue;
      const tile=world.map[y]?.[x];
      context.fillStyle=tile?"#2c2435":"#655879";
      context.fillRect(x*CELL,y*CELL,CELL,CELL);
      if(!tile){context.fillStyle="rgba(255,255,255,.035)";context.fillRect(x*CELL+1,y*CELL+1,CELL-2,CELL-2)}
    }

    // Known route trail helps orient the player without revealing unseen geometry.
    try{
      const trail=playerTrails?.get?.(p1.id)||[];context.fillStyle="rgba(108,236,255,.28)";
      for(let i=0;i<trail.length;i+=3){const q=trail[i];if(!visibleKnowledge(ex,q))continue;context.fillRect((q.x+.3)*CELL,(q.y+.3)*CELL,Math.max(2,CELL*.4),Math.max(2,CELL*.4))}
    }catch(_){}

    // Main vault keys become map knowledge only after their tile has been explored.
    for(const item of host?.items||[]){
      if(!item?.active)continue;
      if(item.kind==="key"&&visibleKnowledge(ex,item))drawMarker(context,item,"#ffd85a","diamond");
      if(item.kind==="exitSigil"&&(visibleKnowledge(ex,item)||host?.radarSigilSeen))drawMarker(context,item,"#b978ff","diamond");
    }

    for(const cache of host?.deathCaches||[])if(cache?.active)drawMarker(context,cache,"#ff6076","cross");
    for(const shop of host?.shops||[])if(shop?.active&&shop?.discovered)drawMarker(context,shop,"#ffd85a","square");

    // Progression items restored from an older death cache are deliberately
    // always marked: the player owned them and therefore knows where they went.
    for(const marker of host?.progressionRecoveryMarkers||[]){
      if(!marker?.active)continue;
      drawMarker(context,marker,marker.kind==="exitSigil"?"#b978ff":"#ffd85a",marker.kind==="exitSigil"?"diamond":"square",marker.label||"");
    }

    if(world.exit&&visibleKnowledge(ex,world.exit))drawMarker(context,world.exit,host?.exitOpen?"#b978ff":"#71637d","square");
    drawMarker(context,p1,"#6cecff","square","YOU");

    context.strokeStyle="rgba(108,236,255,.20)";context.lineWidth=2;context.strokeRect(1,1,width-2,height-2);
    state.renderedAt=performance.now();
  }

  function startTimer(){
    if(state.timer)clearInterval(state.timer);
    drawMap();
    state.timer=setInterval(drawMap,120);
  }

  function stopTimer(){if(state.timer){clearInterval(state.timer);state.timer=0}}

  function openMap(){
    if(state.open||!soloRun())return false;
    if(typeof mode==="undefined"||mode!=="playing")return false;
    ensureStyle();const panel=ensurePanel();
    state.previousMode=mode;state.pausedByMap=true;state.open=true;
    try{input?.clear?.()}catch(_){}
    try{mode="paused"}catch(_){}
    document.body.dataset.ccgSoloMapOpen="true";
    panel.classList.remove("hidden");
    panel.querySelector("#ccg-solo-full-map-close")?.focus?.({preventScroll:true});
    startTimer();
    return true;
  }

  function closeMap(restore=true){
    if(!state.open)return false;
    state.open=false;stopTimer();
    document.getElementById("ccg-solo-full-map")?.classList.add("hidden");
    document.body.dataset.ccgSoloMapOpen="false";
    if(restore&&state.pausedByMap){
      try{if(mode==="paused"&&document.body.dataset.runActive==="true")mode=state.previousMode||"playing"}catch(_){}
    }
    state.pausedByMap=false;
    try{input?.clear?.()}catch(_){}
    try{document.getElementById("game")?.focus?.({preventScroll:true})}catch(_){}
    return true;
  }

  function onKey(event){
    if(isTypingTarget(event.target))return;
    if(event.code==="KeyM"){
      // M is owned by the map system everywhere. It must never reach the legacy
      // sound shortcut. Outside Solo gameplay it intentionally does nothing.
      event.preventDefault();event.stopImmediatePropagation();
      if(state.open)closeMap();else openMap();
      return;
    }
    if(state.open&&event.code==="Escape"){
      event.preventDefault();event.stopImmediatePropagation();closeMap();
    }
  }

  function correctControlCopy(){
    for(const node of document.querySelectorAll?.(".keys-help kbd")||[]){
      if(node.textContent.includes("M SOUND"))node.textContent=node.textContent.replace("M SOUND","M MAP");
    }
    const sound=document.getElementById("sound-btn");
    if(sound){sound.title="Toggle game sound/music. Keyboard M is reserved for the Solo full map.";sound.removeAttribute("aria-keyshortcuts")}
  }

  ensureStyle();ensurePanel();correctControlCopy();
  window.addEventListener("keydown",onKey,true);
  const copyTimer=setInterval(correctControlCopy,500);
  const observer=new MutationObserver(()=>{if(document.body.dataset.runActive!=="true"&&state.open)closeMap(false)});
  observer.observe(document.body,{attributes:true,attributeFilter:["data-run-active"]});
  window.addEventListener("resize",()=>{if(state.open)requestAnimationFrame(drawMap)},{passive:true});
  window.addEventListener("pagehide",()=>{stopTimer();clearInterval(copyTimer);observer.disconnect();window.removeEventListener("keydown",onKey,true)},{once:true});
  window.CCGLostSizzlerSoloFullMapV141={state,open:openMap,close:closeMap,draw:drawMap};
})();