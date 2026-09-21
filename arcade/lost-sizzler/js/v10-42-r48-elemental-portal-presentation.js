/* C64 Dungeon Carnage V10.42 r48 — elemental portal presentation.
 * Presentation only. Consumes the established elemental portal route and open exit.
 * No progression, collision, combat, AI, save, economy or simulation ownership.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R48_ELEMENTAL_PORTAL_PRESENTATION__)return;
  window.__CCG_LOST_SIZZLER_V142_R48_ELEMENTAL_PORTAL_PRESENTATION__=true;

  const state={installs:0,frames:0,lastElement:"",lastFloor:0};
  const ELEMENTS=new Set(["water","fire","earth","air"]);
  const constrained=()=>String(document.body?.dataset?.v141R47PerformanceTier||"normal")!=="normal";
  const severe=()=>String(document.body?.dataset?.v141R47PerformanceTier||"normal")==="severe";
  const reduced=()=>document.body?.classList?.contains("ccg-reduced-motion")||(()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(_){return false}})();

  function route(){
    try{
      const api=window.CCGLostSizzlerV142ElementalPortalFoundation;
      const floor=typeof run!=="undefined"?Number(run?.floor||0):0;
      return floor>0?api?.routeForFloor?.(floor)||null:null
    }catch(_){return null}
  }

  function line(x1,y1,x2,y2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}

  function drawWater(cx,cy,r,phase){
    ctx.beginPath();ctx.arc(cx,cy,r*.72,phase,phase+Math.PI*1.28);ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,r*.48,phase+Math.PI,phase+Math.PI*2.28);ctx.stroke();
    for(const offset of [-.25,.12,.38]){
      const y=cy+r*offset,w=r*(.48-Math.abs(offset)*.22);
      ctx.beginPath();ctx.moveTo(cx-w,y);ctx.quadraticCurveTo(cx,y-4,cx+w,y);ctx.stroke()
    }
  }
  function drawFire(cx,cy,r,phase){
    const count=severe()?4:8;
    for(let i=0;i<count;i++){
      const a=phase+i*Math.PI*2/count,inner=r*.50,outer=r*(i%2?.86:1.02);
      const x1=cx+Math.cos(a-.11)*inner,y1=cy+Math.sin(a-.11)*inner;
      const x2=cx+Math.cos(a)*outer,y2=cy+Math.sin(a)*outer;
      const x3=cx+Math.cos(a+.11)*inner,y3=cy+Math.sin(a+.11)*inner;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineTo(x3,y3);ctx.closePath();ctx.stroke()
    }
  }
  function drawEarth(cx,cy,r,phase){
    const q=r*.60,g=r*.22;
    ctx.strokeRect(cx-q,cy-q,q*2,q*2);
    line(cx-q,cy-g,cx-g,cy-g);line(cx-g,cy-g,cx-g,cy-q);
    line(cx+q,cy+g,cx+g,cy+g);line(cx+g,cy+g,cx+g,cy+q);
    ctx.save();ctx.translate(cx,cy);ctx.rotate(phase*.28);ctx.strokeRect(-g,-g,g*2,g*2);ctx.restore()
  }
  function drawAir(cx,cy,r,phase){
    const dir=Math.cos(phase)*3;
    for(const [dy,scale] of [[-.32,.78],[0,.96],[.32,.68]]){
      const y=cy+r*dy,w=r*scale;
      ctx.beginPath();ctx.moveTo(cx-w+dir,y);ctx.bezierCurveTo(cx-w*.25,y-7,cx+w*.22,y+7,cx+w+dir,y);ctx.stroke()
    }
    if(!severe()){
      ctx.beginPath();ctx.arc(cx+r*.32,cy-r*.42,r*.20,phase,phase+Math.PI*1.55);ctx.stroke()
    }
  }
  function drawMotif(element,cx,cy,r,phase){
    if(element==="water")drawWater(cx,cy,r,phase);
    else if(element==="fire")drawFire(cx,cy,r,phase);
    else if(element==="earth")drawEarth(cx,cy,r,phase);
    else if(element==="air")drawAir(cx,cy,r,phase)
  }

  function drawPortal(player,viewBox){
    try{
      if(document.body?.dataset?.runActive!=="true"||typeof ctx==="undefined"||typeof ws!=="function")return;
      if(typeof host==="undefined"||!host?.exitOpen||typeof world==="undefined"||!world?.exit)return;
      const portal=route();if(!portal||!ELEMENTS.has(String(portal.element||"").toLowerCase()))return;
      if(typeof visibleTo==="function"&&player&&!visibleTo(player,world.exit.x,world.exit.y))return;
      const s=ws(world.exit.x,world.exit.y),tile=Math.max(16,Number(window.CCG_CONFIG?.tile||C?.tile||32));
      const cx=s.x+tile/2,cy=s.y+tile/2,r=tile*(severe()?.56:.72);
      if(viewBox&&(cx<viewBox.x-r*2||cx>viewBox.x+viewBox.w+r*2||cy<viewBox.y-r*2||cy>viewBox.y+viewBox.h+r*2))return;
      const phase=reduced()?0:performance.now()/900;
      ctx.save();
      if(viewBox){ctx.beginPath();ctx.rect(viewBox.x,viewBox.y,viewBox.w,viewBox.h);ctx.clip()}
      ctx.globalAlpha=severe()?.60:.82;ctx.strokeStyle=String(portal.accent||"#b978ff");ctx.lineWidth=severe()?1.5:2;
      if(!severe()){ctx.globalAlpha=.10;ctx.fillStyle=String(portal.accent||"#b978ff");ctx.beginPath();ctx.arc(cx,cy,r*1.08,0,Math.PI*2);ctx.fill()}
      ctx.globalAlpha=severe()?.64:.88;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
      if(!constrained()){ctx.globalAlpha=.36;ctx.beginPath();ctx.arc(cx,cy,r*1.18,-phase,Math.PI*1.45-phase);ctx.stroke()}
      ctx.globalAlpha=severe()?.72:.92;drawMotif(String(portal.element).toLowerCase(),cx,cy,r,phase);
      if(!severe()&&viewBox?.w>=300){
        const label=String(portal.name||"ELEMENTAL PORTAL"),dest="FLOOR "+Number(portal.targetFloor||0);
        ctx.textAlign="center";ctx.textBaseline="bottom";ctx.font='bold 10px Consolas, "Courier New"';ctx.fillStyle=String(portal.accent||"#b978ff");ctx.globalAlpha=.94;
        ctx.fillText(label+"  →  "+dest,cx,cy-r*1.35)
      }
      ctx.restore();
      state.frames++;state.lastElement=String(portal.element||"");state.lastFloor=Number(portal.sourceFloor||0)
    }catch(_){}
  }

  function install(){
    const current=window.renderView;if(typeof current!=="function")return false;
    if(current.__ccgV142R48PortalPresentation)return true;
    const wrapped=function renderViewV142R48PortalPresentation(player,viewBox){
      const result=current.apply(this,arguments);
      drawPortal(player,viewBox);
      return result
    };
    wrapped.__ccgV142R48PortalPresentation=true;wrapped.__ccgOriginal=current;window.renderView=wrapped;state.installs++;return true
  }

  install();
  addEventListener("ccg:v142-ready",install);
  document.addEventListener("ccg:floor-start",install);

  window.CCGLostSizzlerV142R48ElementalPortalPresentation={
    version:"V10.42-r48",presentationOnly:true,simulationOwnership:false,progressionOwnership:false,
    collisionOwnership:false,combatOwnership:false,aiOwnership:false,saveOwnership:false,economyOwnership:false,
    install,drawPortal,route,get state(){return state}
  };
})();