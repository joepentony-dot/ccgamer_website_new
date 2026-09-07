/* The Lost Sizzler V10.42 r3 — earned Warden radar/navigation cues. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_WARDEN_NAVIGATION_CUES__)return;
  window.__CCG_LOST_SIZZLER_V142_WARDEN_NAVIGATION_CUES__=true;

  const C=window.CCG_CONFIG,WORLD=window.CCGWorld;
  if(!C||!WORLD)return;

  const baseRenderRadarPanel=typeof renderRadarPanel==="function"?renderRadarPanel:null;
  const R=()=>{try{return typeof run!=="undefined"?run:null}catch(_){return null}},H=()=>{try{return typeof host!=="undefined"?host:null}catch(_){return null}},W=()=>{try{return typeof world!=="undefined"?world:null}catch(_){return null}};
  const floor=(r=R())=>Math.max(1,Math.min(Number(C.maxFloors)||5,Math.floor(Number(r?.floor)||1)));
  const roomAt=(w,x,y)=>{try{return w&&WORLD.roomAt?WORLD.roomAt(w,Number(x),Number(y)):-1}catch(_){return-1}};
  const centre=room=>room?{x:Math.floor(Number(room.x||0)+Number(room.w||0)/2),y:Math.floor(Number(room.y||0)+Number(room.h||0)/2)}:null;

  function floorRecord(n=floor(),r=R()){
    if(!r)return null;r.v142WardenFloors=r.v142WardenFloors&&typeof r.v142WardenFloors==="object"?r.v142WardenFloors:{};
    const key=String(n);return r.v142WardenFloors[key]||(r.v142WardenFloors[key]={floor:n,available:null,resolved:false,skipped:false,killFragmentAwarded:false,cacheFragmentAwarded:false});
  }

  function markDomainKnowledge(p,r=R(),h=H(),w=W()){
    if(!p||!r||!h||!w)return false;const domain=h.v142WardenDomain,row=floorRecord(floor(r),r);if(!domain||!row)return false;
    const inside=roomAt(w,p.x,p.y)===Number(domain.roomId);
    if(!inside&&!domain.inside)return false;
    if(row.domainDiscovered)return false;
    row.domainDiscovered=true;row.domainDiscoveredAt=Date.now();return true;
  }

  function brokenWarden(h=H()){
    if(!h)return null;
    const enemy=(h.enemies||[]).find(e=>e?.alive&&e.v142WardBroken&&!e.v142WardenDefeated);
    if(enemy)return enemy;
    const count=h.stalker;return count?.awake&&count.v142WardBroken&&!count.v142WardenDefeated?count:null;
  }

  function markerState(p,r=R(),h=H(),w=W()){
    if(!p||!r||!h||!w)return[];markDomainKnowledge(p,r,h,w);
    const n=floor(r),row=floorRecord(n,r),domain=h.v142WardenDomain,markers=[];
    if(domain&&Number(domain.floor||n)===n&&row?.domainDiscovered&&!domain.cleansed&&domain.active!==false){
      const room=w.rooms?.[Number(domain.roomId)],q=centre(room);if(q)markers.push({kind:"corruption",...q,label:String(domain.profileName||"WARDEN CORRUPTION"),roomId:Number(domain.roomId)});
    }
    const refuge=h.v142WardenCheckpoint;
    if(refuge?.active&&Number(refuge.floor)===n&&Number.isFinite(Number(refuge.x))&&Number.isFinite(Number(refuge.y)))markers.push({kind:"refuge",x:Number(refuge.x),y:Number(refuge.y),label:"CLEANSED REFUGE",roomId:Number(refuge.roomId)});
    const cache=(h.chests||[]).find(chest=>chest?.active&&chest.v142WardenCache);
    if(cache)markers.push({kind:"cache",x:Number(cache.x),y:Number(cache.y),label:"WARDEN CACHE",roomId:Number(cache.roomId)});
    const target=brokenWarden(h);
    if(target)markers.push({kind:"broken-warden",x:Number(target.x),y:Number(target.y),label:"WARD BROKEN"});
    return markers.filter(marker=>Number.isFinite(marker.x)&&Number.isFinite(marker.y));
  }

  function radarGeometry(canvas,p){
    if(!canvas||!p)return null;const rect=canvas.getBoundingClientRect?.()||{width:canvas.width||300,height:canvas.height||160},rw=Math.max(260,Math.round(Number(rect.width)||Number(canvas.width)||300)),rh=Math.max(140,Math.round(Number(rect.height)||Number(canvas.height)||160));
    const pad=9,cols=Math.min(Number(C.worldWidth)||96,Math.max(46,Math.floor(rw/6))),rows=Math.min(Number(C.worldHeight)||64,Math.max(24,Math.floor(rh/5.5))),minX=Math.max(0,Math.min((Number(C.worldWidth)||96)-cols,Math.round(Number(p.x)-cols/2))),minY=Math.max(0,Math.min((Number(C.worldHeight)||64)-rows,Math.round(Number(p.y)-rows/2))),maxX=minX+cols,maxY=minY+rows,scale=Math.min((rw-pad*2)/cols,(rh-pad*2)/rows),mapW=cols*scale,mapH=rows*scale,ox=(rw-mapW)/2,oy=(rh-mapH)/2;
    return{rw,rh,minX,minY,maxX,maxY,scale,ox,oy,inside:q=>q&&q.x>=minX&&q.x<maxX&&q.y>=minY&&q.y<maxY,px:q=>ox+(q.x-minX)*scale,py:q=>oy+(q.y-minY)*scale};
  }

  function drawMarker(ctx,g,marker,now=Date.now()){
    if(!ctx||!g?.inside(marker))return false;const x=g.px(marker),y=g.py(marker),pulse=.78+Math.sin(now/180)*.22;ctx.save();ctx.lineWidth=1.5;
    if(marker.kind==="corruption"){
      ctx.strokeStyle=`rgba(226,96,255,${.7+.25*pulse})`;ctx.fillStyle="rgba(128,38,160,.65)";ctx.beginPath();ctx.moveTo(x,y-6);ctx.lineTo(x+6,y);ctx.lineTo(x,y+6);ctx.lineTo(x-6,y);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(x,y,8+2*pulse,0,Math.PI*2);ctx.stroke();
    }else if(marker.kind==="refuge"){
      ctx.fillStyle="rgba(100,255,162,.9)";ctx.strokeStyle="rgba(235,255,243,.95)";ctx.fillRect(x-5,y-2,10,4);ctx.fillRect(x-2,y-5,4,10);ctx.strokeRect(x-5.5,y-2.5,11,5);ctx.strokeRect(x-2.5,y-5.5,5,11);
    }else if(marker.kind==="cache"){
      ctx.fillStyle="rgba(255,205,86,.9)";ctx.strokeStyle="rgba(255,248,208,.98)";ctx.fillRect(x-5,y-4,10,8);ctx.strokeRect(x-5,y-4,10,8);ctx.fillStyle="rgba(89,48,18,.9)";ctx.fillRect(x-1,y-1,2,3);
    }else if(marker.kind==="broken-warden"){
      ctx.strokeStyle=`rgba(255,82,112,${.75+.25*pulse})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,6+2*pulse,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x-5,y-5);ctx.lineTo(x+5,y+5);ctx.moveTo(x+5,y-5);ctx.lineTo(x-5,y+5);ctx.stroke();
    }
    ctx.restore();return true;
  }

  function drawWardenRadar(p){
    const canvas=typeof document!=="undefined"?document.getElementById("radar-canvas"):null,ctx=canvas?.getContext?.("2d");if(!canvas||!ctx||!p)return 0;const g=radarGeometry(canvas,p);if(!g)return 0;let count=0,now=Date.now();for(const marker of markerState(p))if(drawMarker(ctx,g,marker,now))count++;return count;
  }

  if(baseRenderRadarPanel){
    renderRadarPanel=function(p){const result=baseRenderRadarPanel(p);try{drawWardenRadar(p)}catch(error){console.warn("[Lost Sizzler V10.42] Warden radar cues failed safely",error)}return result};
  }

  window.CCGLostSizzlerV142WardenNavigationCues={version:"V10.42 r3",floorRecord,markDomainKnowledge,brokenWarden,markerState,radarGeometry,drawWardenRadar};
})();
