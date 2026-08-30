/* The Lost Sizzler V10.41 r48 — character animation polish and sprite-cell safety.
 *
 * Enemy families in the canonical renderer are procedural rather than atlas-
 * frame driven, so their animation already produces a fresh pose every render.
 * r48 makes their world-space interpolation frame-rate independent so motion is
 * equally smooth at 60/90/120/144 Hz. The explorer/player is the one character
 * family driven by a 6x4 sheet of 32px cells; r48 isolates every cell behind a
 * transparent gutter and expands the walk/attack cadence without changing
 * gameplay coordinates, hitboxes, AI, damage, movement speed or networking.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R48_CHARACTER_ANIMATION__)return;
  window.__CCG_LOST_SIZZLER_V141_R48_CHARACTER_ANIMATION__=true;

  const PLAYER_CELL=32;
  const PLAYER_COLS=6;
  const PLAYER_ROWS=4;
  const PLAYER_PAD=2;
  const PLAYER_STRIDE=PLAYER_CELL+PLAYER_PAD*2;
  const WALK_FRAME_MS=92;
  const WALK_SEQUENCE=Object.freeze([
    Object.freeze({column:1,x:-1,y:0,label:"left-stride"}),
    Object.freeze({column:0,x:0,y:-1,label:"centre-rise"}),
    Object.freeze({column:2,x:1,y:0,label:"right-stride"}),
    Object.freeze({column:0,x:0,y:0,label:"centre-settle"})
  ]);
  const ATTACK_SEQUENCE=Object.freeze([
    Object.freeze({column:0,x:0,y:0,label:"wind-up"}),
    Object.freeze({column:3,x:-1,y:-1,label:"draw-back"}),
    Object.freeze({column:3,x:0,y:-1,label:"early-swing"}),
    Object.freeze({column:4,x:1,y:0,label:"impact"}),
    Object.freeze({column:4,x:0,y:-1,label:"follow-through"}),
    Object.freeze({column:0,x:0,y:0,label:"recover"})
  ]);

  const state={
    installTimer:0,playerSource:null,playerWrapper:null,enemyScreenSource:null,enemyScreenWrapper:null,
    atlasSource:null,paddedAtlas:null,atlasBuilds:0,playerDraws:0,safePlayerDraws:0,
    walkFramesUsed:0,attackFramesUsed:0,hurtFramesUsed:0,enemyScreenSamples:0,
    lastPlayerDraw:null,lastError:"",enemyTimes:new Map()
  };

  const reducedMotion=()=>{try{return Boolean(matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)}catch(_){return false}};
  const nowMs=()=>performance.now();
  const explorerSheet=()=>{try{return typeof lostSizzlerPixelAssets!=="undefined"?lostSizzlerPixelAssets?.explorer||null:null}catch(_){return null}};

  function buildPaddedExplorerAtlas(){
    const sheet=explorerSheet();
    if(!sheet?.complete||sheet.naturalWidth!==PLAYER_COLS*PLAYER_CELL||sheet.naturalHeight!==PLAYER_ROWS*PLAYER_CELL)return null;
    if(state.paddedAtlas&&state.atlasSource===sheet)return state.paddedAtlas;
    try{
      const atlas=document.createElement("canvas");atlas.width=PLAYER_COLS*PLAYER_STRIDE;atlas.height=PLAYER_ROWS*PLAYER_STRIDE;
      const out=atlas.getContext("2d",{alpha:true});if(!out)return null;out.imageSmoothingEnabled=false;out.clearRect(0,0,atlas.width,atlas.height);
      for(let row=0;row<PLAYER_ROWS;row++)for(let column=0;column<PLAYER_COLS;column++){
        out.drawImage(sheet,column*PLAYER_CELL,row*PLAYER_CELL,PLAYER_CELL,PLAYER_CELL,column*PLAYER_STRIDE+PLAYER_PAD,row*PLAYER_STRIDE+PLAYER_PAD,PLAYER_CELL,PLAYER_CELL)
      }
      state.atlasSource=sheet;state.paddedAtlas=atlas;state.atlasBuilds++;return atlas
    }catch(error){state.lastError=String(error?.message||error);return null}
  }

  function verifySourceFrameMargins(){
    const sheet=explorerSheet();
    if(!sheet?.complete||sheet.naturalWidth!==PLAYER_COLS*PLAYER_CELL||sheet.naturalHeight!==PLAYER_ROWS*PLAYER_CELL)return{ok:false,reason:"source-unavailable",edgeOpaquePixels:-1,framesTouchingEdges:[]};
    try{
      const canvas=document.createElement("canvas");canvas.width=sheet.naturalWidth;canvas.height=sheet.naturalHeight;
      const out=canvas.getContext("2d",{alpha:true,willReadFrequently:true});if(!out)return{ok:false,reason:"context-unavailable",edgeOpaquePixels:-1,framesTouchingEdges:[]};
      out.imageSmoothingEnabled=false;out.clearRect(0,0,canvas.width,canvas.height);out.drawImage(sheet,0,0);
      let edgeOpaquePixels=0;const framesTouchingEdges=[];
      for(let row=0;row<PLAYER_ROWS;row++)for(let column=0;column<PLAYER_COLS;column++){
        const data=out.getImageData(column*PLAYER_CELL,row*PLAYER_CELL,PLAYER_CELL,PLAYER_CELL).data;let edgePixels=0;
        for(let x=0;x<PLAYER_CELL;x++)for(const y of [0,PLAYER_CELL-1])if(data[(y*PLAYER_CELL+x)*4+3]!==0)edgePixels++;
        for(let y=1;y<PLAYER_CELL-1;y++)for(const x of [0,PLAYER_CELL-1])if(data[(y*PLAYER_CELL+x)*4+3]!==0)edgePixels++;
        if(edgePixels){edgeOpaquePixels+=edgePixels;framesTouchingEdges.push({row,column,edgePixels})}
      }
      return{ok:edgeOpaquePixels===0,edgeOpaquePixels,framesTouchingEdges,frames:PLAYER_COLS*PLAYER_ROWS}
    }catch(error){state.lastError=String(error?.message||error);return{ok:false,reason:"source-margin-check-failed",edgeOpaquePixels:-1,framesTouchingEdges:[]}}
  }

  function verifyPaddedAtlas(){
    const atlas=buildPaddedExplorerAtlas();if(!atlas)return{ok:false,reason:"atlas-unavailable",opaqueGutterPixels:-1,width:0,height:0,frames:0};
    try{
      const out=atlas.getContext("2d",{willReadFrequently:true});let opaque=0;
      for(let row=0;row<PLAYER_ROWS;row++)for(let column=0;column<PLAYER_COLS;column++){
        const x=column*PLAYER_STRIDE,y=row*PLAYER_STRIDE,data=out.getImageData(x,y,PLAYER_STRIDE,PLAYER_STRIDE).data;
        for(let py=0;py<PLAYER_STRIDE;py++)for(let px=0;px<PLAYER_STRIDE;px++){
          if(px>=PLAYER_PAD&&px<PLAYER_PAD+PLAYER_CELL&&py>=PLAYER_PAD&&py<PLAYER_PAD+PLAYER_CELL)continue;
          if(data[(py*PLAYER_STRIDE+px)*4+3]!==0)opaque++
        }
      }
      return{ok:opaque===0,opaqueGutterPixels:opaque,width:atlas.width,height:atlas.height,frames:PLAYER_COLS*PLAYER_ROWS}
    }catch(error){state.lastError=String(error?.message||error);return{ok:false,reason:"pixel-check-failed",opaqueGutterPixels:-1,width:atlas.width,height:atlas.height,frames:PLAYER_COLS*PLAYER_ROWS}}
  }

  function playerPose(p,requestedColumn,time=nowMs()){
    const hurt=Number(p?.hitStunMs||0)>0;if(hurt){state.hurtFramesUsed++;return{column:5,x:0,y:0,label:"hurt"}}
    const swingMs=Math.max(1,Number(p?._meleeSwingMs||260)),swingAge=time-Number(p?._meleeSwingAt||-Infinity),swingActive=swingAge>=0&&swingAge<swingMs;
    if(swingActive){const progress=Math.max(0,Math.min(.999999,swingAge/swingMs)),index=Math.min(ATTACK_SEQUENCE.length-1,Math.floor(progress*ATTACK_SEQUENCE.length));state.attackFramesUsed++;return ATTACK_SEQUENCE[index]}
    const moving=Math.abs(Number(p?.x??p?.rx)-Number(p?.rx||0))+Math.abs(Number(p?.y??p?.ry)-Number(p?.ry||0))>.025;
    if(moving&&!reducedMotion()){
      const seed=String(p?.id||p?.name||"player").length%WALK_SEQUENCE.length,index=(Math.floor(time/WALK_FRAME_MS)+seed)%WALK_SEQUENCE.length;state.walkFramesUsed++;return WALK_SEQUENCE[index]
    }
    return{column:Math.max(0,Math.min(PLAYER_COLS-1,Number(requestedColumn)||0)),x:0,y:0,label:"idle"}
  }

  function drawIsolatedPlayerCell(nativeDrawImage,sheet,args,p){
    if(args.length!==8)return false;
    let [sx,sy,sw,sh,dx,dy,dw,dh]=args;
    if(sheet!==explorerSheet()||Number(sw)!==PLAYER_CELL||Number(sh)!==PLAYER_CELL)return false;
    const sourceColumn=Math.round(Number(sx)/PLAYER_CELL),sourceRow=Math.round(Number(sy)/PLAYER_CELL);
    if(sourceColumn<0||sourceColumn>=PLAYER_COLS||sourceRow<0||sourceRow>=PLAYER_ROWS)return false;
    const atlas=buildPaddedExplorerAtlas();if(!atlas)return false;
    const pose=playerPose(p,sourceColumn),column=Math.max(0,Math.min(PLAYER_COLS-1,Number(pose.column)||0)),scaleX=Number(dw)/PLAYER_CELL,scaleY=Number(dh)/PLAYER_CELL;
    const destX=Number(dx)-PLAYER_PAD*scaleX+Number(pose.x||0)*scaleX,destY=Number(dy)-PLAYER_PAD*scaleY+Number(pose.y||0)*scaleY,destW=PLAYER_STRIDE*scaleX,destH=PLAYER_STRIDE*scaleY;
    nativeDrawImage.call(ctx,atlas,column*PLAYER_STRIDE,sourceRow*PLAYER_STRIDE,PLAYER_STRIDE,PLAYER_STRIDE,destX,destY,destW,destH);
    state.safePlayerDraws++;state.lastPlayerDraw={column,row:sourceRow,pose:pose.label,sourceX:column*PLAYER_STRIDE,sourceY:sourceRow*PLAYER_STRIDE,sourceW:PLAYER_STRIDE,sourceH:PLAYER_STRIDE,destX,destY,destW,destH};return true
  }

  function installPlayerWrapper(){
    const current=window.drawPlayer;if(typeof current!=="function")return false;
    if(current.__ccgV141R48CharacterAnimation){state.playerWrapper=current;return true}
    if(current===state.playerSource)return true;
    const wrapped=function drawPlayerV141R48Animation(p,kind="p1"){
      state.playerDraws++;
      let context=null;try{context=ctx}catch(_){return current.apply(this,arguments)}
      if(!context||typeof context.drawImage!=="function")return current.apply(this,arguments);
      const nativeDrawImage=context.drawImage;
      context.drawImage=function r48PlayerDrawImage(image,...args){
        try{if(drawIsolatedPlayerCell(nativeDrawImage,image,args,p))return}catch(error){state.lastError=String(error?.message||error)}
        return nativeDrawImage.call(context,image,...args)
      };
      try{return current.apply(this,arguments)}finally{context.drawImage=nativeDrawImage}
    };
    wrapped.__ccgV141R48CharacterAnimation=true;wrapped.__ccgOriginal=current;window.drawPlayer=wrapped;state.playerSource=current;state.playerWrapper=wrapped;return true
  }

  function interpolationRate(baseRate,dtMs){
    const base=Math.max(0,Math.min(.95,Number(baseRate)||0)),dt=Math.max(1,Math.min(80,Number(dtMs)||16.6667));
    if(base<=0)return 0;return 1-Math.pow(1-base,dt/16.6667)
  }

  function installEnemyScreenWrapper(){
    const current=window.enemyScreen;if(typeof current!=="function")return false;
    if(current.__ccgV141R48FrameRateIndependent){state.enemyScreenWrapper=current;return true}
    if(current===state.enemyScreenSource)return true;
    const wrapped=function enemyScreenV141R48(e){
      try{
        if(typeof enemyVisuals==="undefined"||typeof ws!=="function"||!e)return current.apply(this,arguments);
        let visual=enemyVisuals.get(e.id);if(!visual){visual={rx:e.x,ry:e.y};enemyVisuals.set(e.id,visual)}
        const now=nowMs(),previous=state.enemyTimes.get(e.id),dt=previous==null?16.6667:Math.max(1,Math.min(80,now-previous));state.enemyTimes.set(e.id,now);
        const base=e.aiState==="chase"?.26:.14,rate=interpolationRate(base,dt);visual.rx+=(Number(e.x)-Number(visual.rx))*rate;visual.ry+=(Number(e.y)-Number(visual.ry))*rate;state.enemyScreenSamples++;return ws(visual.rx,visual.ry)
      }catch(error){state.lastError=String(error?.message||error);return current.apply(this,arguments)}
    };
    wrapped.__ccgV141R48FrameRateIndependent=true;wrapped.__ccgOriginal=current;window.enemyScreen=wrapped;state.enemyScreenSource=current;state.enemyScreenWrapper=wrapped;return true
  }

  function install(){const player=installPlayerWrapper(),enemy=installEnemyScreenWrapper();buildPaddedExplorerAtlas();return player&&enemy}

  install();
  state.installTimer=setInterval(()=>{install()},700);
  addEventListener("pagehide",()=>{if(state.installTimer)clearInterval(state.installTimer);state.enemyTimes.clear()},{once:true});

  window.CCGLostSizzlerV141R48CharacterAnimation={
    PLAYER_CELL,PLAYER_COLS,PLAYER_ROWS,PLAYER_PAD,PLAYER_STRIDE,WALK_FRAME_MS,WALK_SEQUENCE,ATTACK_SEQUENCE,
    buildPaddedExplorerAtlas,verifySourceFrameMargins,verifyPaddedAtlas,playerPose,interpolationRate,install,
    get state(){return state}
  };
})();
