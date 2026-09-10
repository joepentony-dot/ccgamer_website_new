/* The Lost Sizzler V10.42 r9 — breakable scenery presentation director.
 * Renders the shared r8 furnishing state with richer material silhouettes, damage wear
 * and bounded impact/destruction feedback. Presentation only: no input, movement,
 * combat timing, save, entitlement, networking or progression ownership.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R9_BREAKABLE_PRESENTATION_DIRECTOR__)return;
  window.__CCG_LOST_SIZZLER_V142_R9_BREAKABLE_PRESENTATION_DIRECTOR__=true;

  const R8=window.CCGLostSizzlerV142R8BreakableInteractionDirector,C=window.CCG_CONFIG||{};
  if(!R8)return;

  const state={installed:false,tileFrames:0,propsDrawn:0,fxDrawn:0,impacts:0,destructions:0,fx:[]};
  const hostIndexes=new WeakMap();
  const now=()=>{try{return performance.now()}catch(_){return Date.now()}};
  const currentHost=()=>{try{return typeof host!=="undefined"?host:null}catch(_){return null}};
  const reduced=()=>document.body?.classList?.contains("ccg-reduced-motion")||(()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(_){return false}})();
  const constrained=()=>String(document.body?.dataset?.v141R47PerformanceTier||"normal")!=="normal";
  const tileSize=()=>Math.max(24,Number(C.tile)||42);
  const screenFor=(x,y)=>{try{return typeof ws==="function"?ws(x,y):null}catch(_){return null}};

  const MATERIALS={
    wood:{body:"118,76,46",edge:"213,154,87",detail:"80,48,31"},
    metal:{body:"98,106,118",edge:"205,184,134",detail:"55,61,72"},
    stone:{body:"119,118,108",edge:"205,198,169",detail:"69,73,72"},
    bone:{body:"186,177,139",edge:"240,225,178",detail:"91,83,66"},
    web:{body:"190,201,214",edge:"245,248,252",detail:"112,126,143"},
    ember:{body:"104,66,48",edge:"255,151,63",detail:"72,39,31"},
    arcane:{body:"112,78,142",edge:"216,154,255",detail:"63,42,84"}
  };

  function materialFor(kind){
    const value=String(kind||"");
    if(/web|cocoon/.test(value))return"web";
    if(/bone|burial|crypt/.test(value))return"bone";
    if(/brazier|slag/.test(value))return"ember";
    if(/crystal|sigil|rune|archive/.test(value))return"arcane";
    if(/armour|weapon|forge/.test(value))return"metal";
    if(/statue|urn|vase|plinth|pot/.test(value))return"stone";
    return"wood";
  }

  function styleFor(prop){
    const material=materialFor(prop?.kind),palette=MATERIALS[material]||MATERIALS.wood;
    const hp=Math.max(0,Number(prop?.hp)||0),maxHp=Math.max(1,Number(prop?.maxHp)||1);
    return Object.freeze({material,palette,health:Math.max(0,Math.min(1,hp/maxHp)),hazardous:Boolean(prop?.hazardous),webbed:Boolean(prop?.webbed)});
  }

  function buildIndex(hostState){
    const map=new Map();
    for(const room of hostState?.v142BreakableInteractions?.rooms||[]){
      for(const prop of room?.props?.values?.()||[]){
        const key=`${Math.floor(Number(prop.x)||0)},${Math.floor(Number(prop.y)||0)}`;
        if(!map.has(key))map.set(key,[]);
        map.get(key).push({room,prop});
      }
    }
    const index={rooms:hostState?.v142BreakableInteractions?.rooms||[],map};hostIndexes.set(hostState,index);return index;
  }

  function indexFor(hostState=currentHost()){
    if(!hostState)return null;
    const current=hostIndexes.get(hostState),rooms=hostState?.v142BreakableInteractions?.rooms||[];
    return current&&current.rooms===rooms?current:buildIndex(hostState);
  }

  function propsAt(x,y,hostState=currentHost()){
    return indexFor(hostState)?.map?.get(`${Math.floor(Number(x)||0)},${Math.floor(Number(y)||0)}`)||[];
  }

  function silhouette(ctx,s,tile,prop,style){
    const cx=s.x+tile*.5,base=s.y+tile*.80,w=tile*.54,h=tile*.52,p=style.palette;
    ctx.save();
    ctx.globalAlpha=prop.destroyed?.28:1;
    ctx.fillStyle="rgba(0,0,0,.28)";ctx.beginPath();ctx.ellipse(cx,base+tile*.07,w*.58,tile*.105,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=`rgba(${p.body},.92)`;ctx.strokeStyle=`rgba(${p.edge},.82)`;ctx.lineWidth=Math.max(1,tile*.035);
    const kind=String(prop.kind||"");
    if(style.material==="web"){
      ctx.beginPath();ctx.ellipse(cx,base-h*.42,w*.48,h*.52,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.strokeStyle=`rgba(${p.edge},.58)`;ctx.lineWidth=1;
      for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(cx,base-h*.44);ctx.lineTo(cx+i*w*.28,base-h*.96);ctx.stroke()}
      ctx.beginPath();ctx.arc(cx,base-h*.45,w*.33,0,Math.PI*2);ctx.stroke();
    }else if(/barrel|cask/.test(kind)){
      ctx.beginPath();ctx.ellipse(cx,base-h*.46,w*.43,h*.48,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.strokeStyle=`rgba(${p.detail},.92)`;for(const dy of [-.68,-.30]){ctx.beginPath();ctx.ellipse(cx,base+h*dy,w*.44,h*.10,0,0,Math.PI*2);ctx.stroke()}
    }else if(/rack|stand/.test(kind)){
      ctx.lineWidth=Math.max(2,tile*.055);ctx.beginPath();ctx.moveTo(cx-w*.36,base);ctx.lineTo(cx-w*.30,base-h*.80);ctx.moveTo(cx+w*.36,base);ctx.lineTo(cx+w*.30,base-h*.80);ctx.moveTo(cx-w*.42,base-h*.58);ctx.lineTo(cx+w*.42,base-h*.58);ctx.stroke();
      ctx.fillStyle=`rgba(${p.body},.82)`;ctx.fillRect(cx-w*.18,base-h*.82,w*.36,h*.56);
    }else if(/statue|plinth/.test(kind)){
      ctx.fillRect(cx-w*.42,base-h*.16,w*.84,h*.16);ctx.fillRect(cx-w*.30,base-h*.62,w*.60,h*.46);
      ctx.beginPath();ctx.arc(cx,base-h*.74,w*.20,0,Math.PI*2);ctx.fill();ctx.stroke();
    }else if(/urn|vase|pot|slag/.test(kind)){
      ctx.beginPath();ctx.moveTo(cx-w*.24,base-h*.78);ctx.quadraticCurveTo(cx-w*.48,base-h*.42,cx-w*.30,base);ctx.lineTo(cx+w*.30,base);ctx.quadraticCurveTo(cx+w*.48,base-h*.42,cx+w*.24,base-h*.78);ctx.closePath();ctx.fill();ctx.stroke();
    }else if(/bone-pile/.test(kind)){
      ctx.lineWidth=Math.max(2,tile*.05);for(const angle of [-.5,.15,.65]){ctx.save();ctx.translate(cx,base-h*.24);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(-w*.34,0);ctx.lineTo(w*.34,0);ctx.stroke();ctx.restore()}
      ctx.beginPath();ctx.arc(cx-w*.28,base-h*.25,w*.10,0,Math.PI*2);ctx.arc(cx+w*.28,base-h*.25,w*.10,0,Math.PI*2);ctx.fill();
    }else{
      ctx.fillRect(cx-w*.42,base-h*.64,w*.84,h*.64);ctx.strokeRect(cx-w*.42,base-h*.64,w*.84,h*.64);
      ctx.strokeStyle=`rgba(${p.detail},.78)`;ctx.beginPath();ctx.moveTo(cx-w*.34,base-h*.54);ctx.lineTo(cx+w*.34,base-h*.10);ctx.moveTo(cx+w*.34,base-h*.54);ctx.lineTo(cx-w*.34,base-h*.10);ctx.stroke();
    }
    if(style.health<.999&&!prop.destroyed){
      ctx.strokeStyle="rgba(35,25,23,.86)";ctx.lineWidth=Math.max(1,tile*.035);ctx.beginPath();ctx.moveTo(cx-w*.12,base-h*.67);ctx.lineTo(cx+w*.03,base-h*.43);ctx.lineTo(cx-w*.08,base-h*.26);ctx.lineTo(cx+w*.16,base-h*.08);ctx.stroke();
    }
    if(!prop.destroyed&&!reduced()&&!constrained()&&(style.hazardous||style.material==="arcane")){
      const pulse=.36+.16*Math.sin(now()/230+(Number(prop.x)||0));ctx.globalAlpha=pulse;ctx.fillStyle=style.hazardous?"rgba(255,118,44,.72)":"rgba(198,118,255,.65)";ctx.beginPath();ctx.arc(cx,base-h*.62,tile*.10,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  function pruneFx(time=now()){
    while(state.fx.length&&time-state.fx[0].at>700)state.fx.shift();
    if(state.fx.length>72)state.fx.splice(0,state.fx.length-72);
  }

  function enqueueFx(fx){
    if(!fx||!Number.isFinite(Number(fx.x))||!Number.isFinite(Number(fx.y)))return false;
    state.fx.push({...fx,at:now()});state.impacts+=1;if(/burst/.test(String(fx.kind||"")))state.destructions+=1;pruneFx();return true;
  }

  function drawFxForTile(ctx,s,tile,x,y){
    const time=now();pruneFx(time);
    for(const fx of state.fx){
      if(Math.floor(Number(fx.x))!==Math.floor(Number(x))||Math.floor(Number(fx.y))!==Math.floor(Number(y)))continue;
      const age=Math.max(0,time-fx.at),life=Math.max(0,1-age/700);if(life<=0)continue;
      const count=constrained()?3:reduced()?2:6,seed=Number(fx.seed)||1,cx=s.x+tile*.5,cy=s.y+tile*.55;
      ctx.save();ctx.globalAlpha=life;
      const kind=String(fx.kind||"");ctx.fillStyle=kind==="web-burst"?"rgba(236,242,248,.86)":kind==="ember-burst"?"rgba(255,130,55,.90)":kind==="prop-hit"?"rgba(235,210,157,.72)":"rgba(190,166,126,.82)";
      for(let i=0;i<count;i++){
        const a=((seed>>>((i%4)*5))&31)/31*Math.PI*2,r=(1-life)*tile*(.16+i*.045),px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r-age*.012;
        ctx.fillRect(px,py,Math.max(1,tile*.045),Math.max(1,tile*.045));
      }
      ctx.restore();state.fxDrawn+=1;
    }
  }

  function drawTileOverlay(x,y){
    if(typeof ctx==="undefined")return;
    const s=screenFor(x,y);if(!s)return;
    const tile=tileSize(),entries=propsAt(x,y);
    for(const {prop} of entries){silhouette(ctx,s,tile,prop,styleFor(prop));state.propsDrawn+=1}
    drawFxForTile(ctx,s,tile,x,y);state.tileFrames+=1;
  }

  function installTileWrapper(){
    const base=window.drawTile;if(typeof base!=="function")return false;if(base.__ccgV142R9Breakables)return true;
    const wrapped=function drawTileV142R9Breakables(x,y){const result=base.apply(this,arguments);try{drawTileOverlay(x,y)}catch(_){}return result};
    wrapped.__ccgV142R9Breakables=true;wrapped.__ccgOriginal=base;window.drawTile=wrapped;state.installed=true;return true;
  }

  const baseDamage=R8.damageBreakable.bind(R8),baseStrike=R8.strikeAt.bind(R8);
  R8.damageBreakable=function damageBreakableV142R9(){const result=baseDamage(...arguments);if(result?.fx)enqueueFx(result.fx);return result};
  R8.strikeAt=function strikeAtV142R9(){const results=baseStrike(...arguments);for(const row of results||[])if(row?.fx)enqueueFx(row.fx);return results};

  function impactAt(roomOrKey,x,y,amount=1,radius=.72){return R8.strikeAt(roomOrKey,x,y,amount,radius)}
  installTileWrapper();

  window.CCGLostSizzlerV142R9BreakablePresentationDirector={version:"V10.42-r9",state,MATERIALS,materialFor,styleFor,propsAt,impactAt,enqueueFx,installTileWrapper};
})();