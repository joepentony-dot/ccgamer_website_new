/* C64 Dungeon Carnage V10.42 r47 prep — depth and loot readability.
 * Presentation only. No timers, simulation ownership or state mutation.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R47_DEPTH_POLISH__)return;
  window.__CCG_LOST_SIZZLER_V142_R47_DEPTH_POLISH__=true;

  const state={itemFrames:0,chestFrames:0,viewFrames:0,itemInstall:0,chestInstall:0,viewInstall:0,depthGradientBuilds:0,depthKey:"",depthGradients:null};
  const active=()=>document.body?.dataset?.runActive==="true";
  const tier=()=>String(document.body?.dataset?.v141R47PerformanceTier||"normal");
  const severe=()=>tier()==="severe";
  const constrained=()=>tier()!=="normal";
  const reduced=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(_){return false}};
  const now=()=>performance.now();

  function canWorldDraw(){
    return active()&&typeof ctx!=="undefined"&&typeof C!=="undefined"&&typeof ws==="function";
  }

  function visible(entity){
    if(!entity)return false;
    try{return typeof visibleTo!=="function"||visibleTo(focus,entity.x,entity.y)}catch(_){return true}
  }

  function itemColour(item){
    try{
      if(typeof itemInfo==="function"){
        const info=itemInfo(item);
        if(Array.isArray(info)&&info[1])return String(info[1]);
      }
    }catch(_){}
    return "#ffd85a";
  }

  function importantItem(item){
    return /weapon|sigil|key|artefact|artifact|rapid|armour|teleport|game/i.test(String(item?.kind||""));
  }

  function drawItemGround(item){
    if(!canWorldDraw()||severe()||!item?.active||!visible(item))return;
    const s=ws(item.x,item.y),cx=s.x+C.tile/2,cy=s.y+C.tile*.78,col=itemColour(item);
    ctx.save();
    ctx.fillStyle="rgba(0,0,0,.34)";
    ctx.beginPath();ctx.ellipse(cx,cy,C.tile*.25,C.tile*.075,0,0,Math.PI*2);ctx.fill();
    if(importantItem(item)&&!constrained()){
      const pulse=reduced()?.28:.22+.08*Math.sin(now()/240+item.x*1.7+item.y);
      ctx.globalAlpha=pulse;ctx.strokeStyle=col;ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(cx,cy-C.tile*.16);ctx.lineTo(cx+C.tile*.25,cy);ctx.lineTo(cx,cy+C.tile*.12);ctx.lineTo(cx-C.tile*.25,cy);ctx.closePath();ctx.stroke();
    }
    ctx.restore();state.itemFrames++;
  }

  function installItem(){
    const current=window.drawItem;
    if(typeof current!=="function")return false;
    if(current.__ccgV142R47Depth)return true;
    const wrapped=function drawItemV142R47Depth(item){
      try{drawItemGround(item)}catch(_){}
      return current.apply(this,arguments);
    };
    wrapped.__ccgV142R47Depth=true;wrapped.__ccgOriginal=current;
    window.drawItem=wrapped;state.itemInstall++;return true;
  }

  function drawChestGrounds(){
    if(!canWorldDraw()||severe())return;
    let chests=[];try{chests=host?.chests||[]}catch(_){return}
    const t=now();
    for(const chest of chests){
      if(!chest?.active||!visible(chest))continue;
      const s=ws(chest.x,chest.y),cx=s.x+C.tile/2,cy=s.y+C.tile*.82;
      let col="#ffd85a";
      try{col=PGR?.colourForRarity?.(chest.loot?.rarity)||col}catch(_){}
      ctx.save();ctx.fillStyle="rgba(0,0,0,.42)";
      ctx.beginPath();ctx.ellipse(cx,cy,C.tile*.34,C.tile*.09,0,0,Math.PI*2);ctx.fill();
      if(!constrained()){
        const pulse=reduced()?.22:.18+.08*Math.sin(t/300+chest.x+chest.y);
        ctx.globalAlpha=pulse;ctx.strokeStyle=chest.locked?"#ffd85a":col;ctx.lineWidth=1.2;
        ctx.beginPath();ctx.ellipse(cx,cy,C.tile*.38,C.tile*.13,0,0,Math.PI*2);ctx.stroke();
      }
      ctx.restore();state.chestFrames++;
    }
  }

  function installChests(){
    const current=window.drawChests;
    if(typeof current!=="function")return false;
    if(current.__ccgV142R47Depth)return true;
    const wrapped=function drawChestsV142R47Depth(){
      try{drawChestGrounds()}catch(_){}
      return current.apply(this,arguments);
    };
    wrapped.__ccgV142R47Depth=true;wrapped.__ccgOriginal=current;
    window.drawChests=wrapped;state.chestInstall++;return true;
  }

  function drawViewDepth(viewBox){
    if(!canWorldDraw()||severe()||constrained()||!viewBox)return;
    const {x,y,w,h}=viewBox,edge=Math.max(18,Math.min(46,Math.round(Math.min(w,h)*.055)));
    const key=[x,y,w,h,edge].join("|");
    if(state.depthKey!==key||!state.depthGradients){
      const top=ctx.createLinearGradient(0,y,0,y+edge);top.addColorStop(0,"rgba(2,1,5,.22)");top.addColorStop(1,"rgba(2,1,5,0)");
      const bottom=ctx.createLinearGradient(0,y+h-edge,0,y+h);bottom.addColorStop(0,"rgba(2,1,5,0)");bottom.addColorStop(1,"rgba(2,1,5,.30)");
      const left=ctx.createLinearGradient(x,0,x+edge,0);left.addColorStop(0,"rgba(2,1,5,.18)");left.addColorStop(1,"rgba(2,1,5,0)");
      const right=ctx.createLinearGradient(x+w-edge,0,x+w,0);right.addColorStop(0,"rgba(2,1,5,0)");right.addColorStop(1,"rgba(2,1,5,.18)");
      state.depthKey=key;state.depthGradients={top,bottom,left,right};state.depthGradientBuilds++;
    }
    const {top,bottom,left,right}=state.depthGradients;
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    ctx.fillStyle=top;ctx.fillRect(x,y,w,edge);
    ctx.fillStyle=bottom;ctx.fillRect(x,y+h-edge,w,edge);
    ctx.fillStyle=left;ctx.fillRect(x,y,edge,h);
    ctx.fillStyle=right;ctx.fillRect(x+w-edge,y,edge,h);
    ctx.restore();state.viewFrames++;
  }

  function installView(){
    const current=window.renderView;
    if(typeof current!=="function")return false;
    if(current.__ccgV142R47Depth)return true;
    const wrapped=function renderViewV142R47Depth(player,viewBox){
      const result=current.apply(this,arguments);
      try{drawViewDepth(viewBox)}catch(_){}
      return result;
    };
    wrapped.__ccgV142R47Depth=true;wrapped.__ccgOriginal=current;
    window.renderView=wrapped;state.viewInstall++;return true;
  }

  function install(){installItem();installChests();installView();return true}
  install();
  addEventListener("ccg:v142-ready",install);
  document.addEventListener("ccg:floor-start",install);

  window.CCGLostSizzlerV142R47DepthPolish={
    version:"V10.42-r47-prep",presentationOnly:true,
    simulationOwnership:false,collisionOwnership:false,combatOwnership:false,
    progressionOwnership:false,saveOwnership:false,economyOwnership:false,
    install,get state(){return state}
  };
})();