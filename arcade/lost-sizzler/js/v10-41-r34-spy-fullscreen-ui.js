/* The Lost Sizzler V10.41 r34 — Spy fullscreen panel polish.
 *
 * Keeps the stable r32/r33 gameplay owners untouched and improves only the
 * Spy presentation layer:
 * - fullscreen side panels use spare map space for live reports
 * - room maps sit at the far right of each player half
 * - Player 1 has one white self-position dot; Player 2 has one black dot
 * - each map shows only its own player, never the opponent and never a trail
 * - fullscreen Spy mirrors search/item notifications into the side panel so
 *   large transient notices no longer cover the playfield
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R34_SPY_FULLSCREEN_UI__)return;
  window.__CCG_LOST_SIZZLER_V141_R34_SPY_FULLSCREEN_UI__=true;

  const MODE_ID="sizzler-saboteurs",TICK_MS=80;
  const state={timer:0,mounted:false,lastFullscreen:null,fullscreenChanges:0,markerRenders:0,noticeRenders:0,lastNotices:new Map()};

  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID}catch(_){return false}};
  const match=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.state||null}catch(_){return null}};
  const finalOwner=()=>{try{return window.CCGLostSizzlerV141R32SpyPacketOwner||null}catch(_){return null}};
  const actorId=()=>{try{return String(net?.sessionId||p1?.id||"P1")}catch(_){return"P1"}};
  const modelForSlot=slot=>match()?.players?.find?.(row=>Number(row?.slot)===Number(slot))||match()?.players?.[Number(slot)-1]||null;
  const liveFor=model=>{if(!model)return null;try{return String(p1?.id||"")===String(model.id||"")?p1:remote?.get?.(model.id)||null}catch(_){return null}};
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function injectStyles(){
    if(document.getElementById("ccg-spy-r34-fullscreen-style"))return true;
    const style=document.createElement("style");style.id="ccg-spy-r34-fullscreen-style";
    style.textContent=`
      .spy-classic-map-wrap{position:relative;width:100%;min-width:0;box-sizing:border-box}
      .spy-classic-map-wrap>.spy-classic-map{margin:0!important}
      .spy-classic-position-map{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated}
      .spy-classic-notice{display:none;min-width:0;box-sizing:border-box;border:1px solid rgba(108,236,255,.28);background:linear-gradient(135deg,rgba(9,17,24,.94),rgba(6,4,11,.96));padding:7px 8px;overflow:hidden}
      .spy-classic-notice b{display:block;margin-bottom:4px;color:#6cecff;font:900 8px/1.1 "Courier New",monospace;letter-spacing:.45px}
      .spy-classic-notice span{display:block;color:#f1edf5;font:900 9px/1.25 "Courier New",monospace;overflow-wrap:anywhere}
      .spy-classic-notice small{display:block;margin-top:4px;color:#a99db5;font:800 7px/1.2 "Courier New",monospace}

      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-trapulator{
        display:grid!important;
        grid-template-columns:minmax(0,1.15fr) minmax(118px,.85fr);
        grid-template-areas:
          "head head"
          "notice map"
          "loadout loadout"
          "weapon status"
          "controls controls";
        grid-template-rows:auto 70px auto auto auto;
        column-gap:8px;row-gap:4px;
        align-content:start;
        padding:8px 9px 7px!important;
      }
      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-head{grid-area:head;margin:0!important}
      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-notice{display:block;grid-area:notice;height:70px}
      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-map-wrap{grid-area:map;justify-self:end;align-self:start;width:100%;max-width:164px;height:70px}
      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-map-wrap>.spy-classic-map{width:100%!important;height:70px!important}
      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-loadout{grid-area:loadout;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}
      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-trap{grid-template-columns:18px minmax(0,1fr);padding:3px;gap:4px}
      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-trap strong{font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-trap small,
      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-trap em{font-size:6px;line-height:1.16}
      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-weapon{grid-area:weapon;margin-top:0;padding-top:4px;min-width:0}
      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-status{grid-area:status;margin-top:0;padding-top:4px;min-width:0}
      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-controls{grid-area:controls;margin-top:0;padding-top:3px;text-align:center}

      /* These messages are mirrored into the local player's report panel in
         fullscreen Spy. Outside fullscreen their established presentation stays. */
      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] #spy-r32-objective-toast,
      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] #spy-search-indicator,
      body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] #pickup-toast.show{display:none!important}

      @media(max-width:1100px){
        body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-trapulator{grid-template-columns:minmax(0,1fr) 128px;column-gap:5px;padding:6px!important}
        body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-map-wrap{max-width:128px}
        body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-trap small,
        body[data-special-mode="sizzler-saboteurs"][data-spy-classic-fullscreen="true"] .spy-classic-trap em{display:none}
      }
    `;
    document.head.appendChild(style);return true
  }

  function syncFullscreenState(force=false){
    const active=spyActive(),fullscreen=active&&Boolean(document.fullscreenElement);
    if(!force&&fullscreen===state.lastFullscreen)return fullscreen;
    state.lastFullscreen=fullscreen;state.fullscreenChanges++;
    if(fullscreen)document.body?.setAttribute?.("data-spy-classic-fullscreen","true");
    else document.body?.removeAttribute?.("data-spy-classic-fullscreen");
    return fullscreen
  }

  function ensurePanelAugments(){
    injectStyles();const root=document.getElementById("spy-classic-trapulators");if(!root)return false;let changed=false;
    for(const slot of [1,2]){
      const panel=root.querySelector(`.spy-classic-trapulator[data-slot="${slot}"]`);if(!panel)continue;
      let notice=panel.querySelector(".spy-classic-notice");
      if(!notice){
        notice=document.createElement("div");notice.className="spy-classic-notice";notice.dataset.slot=String(slot);notice.innerHTML='<b>LIVE REPORT</b><span>NO NEW REPORTS</span><small>SEARCHES, ITEMS AND TRAP WARNINGS APPEAR HERE</small>';
        const map=panel.querySelector(".spy-classic-map");panel.insertBefore(notice,map||panel.firstChild);changed=true
      }
      const map=panel.querySelector(".spy-classic-map");if(!map)continue;
      let wrap=map.parentElement?.classList?.contains("spy-classic-map-wrap")?map.parentElement:null;
      if(!wrap){
        wrap=document.createElement("div");wrap.className="spy-classic-map-wrap";map.parentNode.insertBefore(wrap,map);wrap.appendChild(map);changed=true
      }
      let overlay=wrap.querySelector(".spy-classic-position-map");
      if(!overlay){
        overlay=document.createElement("canvas");overlay.className="spy-classic-position-map";overlay.width=Number(map.width)||180;overlay.height=Number(map.height)||72;overlay.dataset.slot=String(slot);overlay.dataset.markerCount="0";overlay.setAttribute("aria-hidden","true");wrap.appendChild(overlay);changed=true
      }
    }
    state.mounted=true;return changed
  }

  function mapGeometry(canvasEl){
    const m=match(),rooms=m?.map?.rooms||[];if(!canvasEl||!rooms.length)return null;
    const w=Number(canvasEl.width)||180,h=Number(canvasEl.height)||72;
    const minX=Math.min(...rooms.map(r=>Number(r.gridX)||0)),maxX=Math.max(...rooms.map(r=>Number(r.gridX)||0));
    const minY=Math.min(...rooms.map(r=>Number(r.gridY)||0)),maxY=Math.max(...rooms.map(r=>Number(r.gridY)||0));
    const cols=Math.max(1,maxX-minX+1),rows=Math.max(1,maxY-minY+1),pad=7,cw=(w-pad*2)/cols,ch=(h-pad*2)/rows;
    return{rooms,minX,minY,pad,cw,ch}
  }

  function markerPosition(canvasEl,model){
    if(!canvasEl||!model)return null;const geo=mapGeometry(canvasEl);if(!geo)return null;
    const logical=geo.rooms.find(room=>String(room?.id||"")===String(model.roomId||""));if(!logical)return null;
    const cellX=geo.pad+(Number(logical.gridX)-geo.minX)*geo.cw+2,cellY=geo.pad+(Number(logical.gridY)-geo.minY)*geo.ch+2;
    const cellW=Math.max(3,geo.cw-4),cellH=Math.max(3,geo.ch-4),live=liveFor(model);
    let px=Number(live?.rx),py=Number(live?.ry);if(!Number.isFinite(px))px=Number(live?.x);if(!Number.isFinite(py))py=Number(live?.y);if(!Number.isFinite(px))px=Number(model.x);if(!Number.isFinite(py))py=Number(model.y);
    let ux=.5,uy=.5;
    try{
      const physical=world?.rooms?.[Number(logical.dungeonRoomId)];
      if(physical&&Number.isFinite(px)&&Number.isFinite(py)){
        ux=clamp((px-Number(physical.x))/Math.max(1,Number(physical.w)||1),0,1);
        uy=clamp((py-Number(physical.y))/Math.max(1,Number(physical.h)||1),0,1)
      }
    }catch(_){}
    return{x:cellX+ux*cellW,y:cellY+uy*cellH,roomId:String(logical.id||""),sourceX:px,sourceY:py}
  }

  function drawSelfMarker(slot){
    const panel=document.querySelector(`.spy-classic-trapulator[data-slot="${slot}"]`),base=panel?.querySelector(".spy-classic-map"),overlay=panel?.querySelector(".spy-classic-position-map"),model=modelForSlot(slot);if(!base||!overlay)return false;
    if(overlay.width!==base.width)overlay.width=base.width;if(overlay.height!==base.height)overlay.height=base.height;
    const g=overlay.getContext?.("2d");if(!g)return false;g.clearRect(0,0,overlay.width,overlay.height);
    const point=markerPosition(overlay,model);if(!point){overlay.dataset.markerCount="0";delete overlay.dataset.markerRoom;return false}
    const fill=slot===1?"#ffffff":"#000000",stroke=slot===1?"#000000":"#ffffff",radius=4;
    g.beginPath();g.arc(point.x,point.y,radius,0,Math.PI*2);g.fillStyle=fill;g.fill();g.lineWidth=1.5;g.strokeStyle=stroke;g.stroke();
    overlay.dataset.markerCount="1";overlay.dataset.markerSlot=String(slot);overlay.dataset.markerColour=slot===1?"white":"black";overlay.dataset.markerRoom=point.roomId;overlay.dataset.markerX=point.x.toFixed(2);overlay.dataset.markerY=point.y.toFixed(2);overlay.dataset.sourceX=Number.isFinite(point.sourceX)?point.sourceX.toFixed(3):"";overlay.dataset.sourceY=Number.isFinite(point.sourceY)?point.sourceY.toFixed(3):"";
    state.markerRenders++;return true
  }

  function activeLocalNotice(){
    const toast=document.getElementById("spy-r32-objective-toast");
    if(toast?.dataset?.visible==="true"&&String(toast.textContent||"").trim())return{title:"SPY REPORT",text:String(toast.textContent||"").trim(),sub:"ACTION CONFIRMED"};
    const search=document.getElementById("spy-search-indicator"),label=document.getElementById("spy-search-label"),percent=document.getElementById("spy-search-percent");
    if(search?.dataset?.visible==="true"&&String(label?.textContent||"").trim())return{title:"SEARCH",text:String(label.textContent||"").trim(),sub:String(percent?.textContent||"").trim()||"SEARCH STATUS"};
    const pickup=document.getElementById("pickup-toast"),pickupTitle=document.getElementById("pickup-title"),pickupText=document.getElementById("pickup-text");
    if(pickup?.classList?.contains("show")&&String(pickupTitle?.textContent||"").trim())return{title:String(pickupTitle.textContent||"").trim(),text:String(pickupText?.textContent||"").trim(),sub:"LIVE GAME REPORT"};
    return null
  }

  function trapNotice(model){
    const owner=finalOwner(),hit=model?owner?.state?.lastTrapByVictim?.get?.(String(model.id||"")):null;if(!hit||Number(hit.until||0)<=Date.now())return null;
    const def=owner?.CLASSIC_TRAPS?.find?.(row=>String(row?.id||"")===String(hit.trapId||""));if(!def)return null;
    return{title:"TRAP HIT",text:`${def.name} · ${def.effect}`,sub:`REMEDY: ${def.remedy}`}
  }

  function updateNotice(slot){
    const node=document.querySelector(`.spy-classic-notice[data-slot="${slot}"]`),model=modelForSlot(slot);if(!node)return false;
    const local=String(model?.id||"")===actorId(),notice=(local?activeLocalNotice():null)||trapNotice(model)||{title:"LIVE REPORT",text:"NO NEW REPORTS",sub:"SEARCHES, ITEMS AND TRAP WARNINGS APPEAR HERE"};
    const signature=`${notice.title}|${notice.text}|${notice.sub}`;if(state.lastNotices.get(slot)===signature)return false;state.lastNotices.set(slot,signature);
    const b=node.querySelector("b"),span=node.querySelector("span"),small=node.querySelector("small");if(b)b.textContent=notice.title;if(span)span.textContent=notice.text;if(small)small.textContent=notice.sub;state.noticeRenders++;return true
  }

  function refresh(force=false){
    if(!spyActive()){
      if(state.lastFullscreen!==false||document.body?.hasAttribute?.("data-spy-classic-fullscreen")){state.lastFullscreen=false;document.body?.removeAttribute?.("data-spy-classic-fullscreen")}
      return false
    }
    finalOwner()?.ensureClassicUi?.();ensurePanelAugments();syncFullscreenState(force);
    drawSelfMarker(1);drawSelfMarker(2);updateNotice(1);updateNotice(2);return true
  }

  function monitor(){try{refresh(false)}catch(error){console.warn("[Lost Sizzler r34] Spy fullscreen UI refresh failed safely",error)}}

  injectStyles();monitor();state.timer=setInterval(monitor,TICK_MS);
  document.addEventListener("fullscreenchange",()=>refresh(true));
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0;document.body?.removeAttribute?.("data-spy-classic-fullscreen")},{once:true});

  window.CCGLostSizzlerV141R34SpyFullscreenUi={ensurePanelAugments,mapGeometry,markerPosition,drawSelfMarker,updateNotice,syncFullscreenState,refresh,get state(){return state}};
})();