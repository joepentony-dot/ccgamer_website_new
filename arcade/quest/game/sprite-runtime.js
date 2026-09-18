(function(){
  'use strict';
  const Q=window.CCGQuest=window.CCGQuest||{};

  function positiveInt(value,fallback){const n=Math.floor(Number(value));return Number.isFinite(n)&&n>0?n:fallback;}
  function positiveNumber(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback;}
  function stateProfile(meta,state){const table=meta?.stateMeta&&typeof meta.stateMeta==='object'?meta.stateMeta:{};return table[state]||table.idle||{};}
  function animationFrames(meta,state){
    const animations=meta?.animations&&typeof meta.animations==='object'?meta.animations:{};
    const raw=animations[state]??animations.idle??[0];
    if(Array.isArray(raw))return raw.map(Number).filter(Number.isFinite);
    if(Number.isFinite(Number(raw)))return[Number(raw)];
    return[0];
  }

  Q.createSpriteAnimator=function(initial='idle'){return{state:initial,time:0,loops:0};};
  Q.stepSpriteAnimator=function(anim,nextState,dt){
    if(!anim)return 0;
    if(anim.state!==nextState){anim.state=nextState;anim.time=0;anim.loops=0;return 0;}
    anim.time+=Math.max(0,Number(dt)||0);
    return anim.time;
  };

  Q.spriteFrame=function(meta,state,timeSeconds=0){
    const frames=animationFrames(meta,state),fps=positiveNumber(stateProfile(meta,state).fps,positiveNumber(meta?.fps,8));
    const loop=stateProfile(meta,state).loop??meta?.loop??true;
    if(!frames.length)return 0;
    const step=Math.max(0,Math.floor(Math.max(0,timeSeconds)*fps));
    return frames[loop?step%frames.length:Math.min(step,frames.length-1)];
  };

  Q.spriteStateProfile=function(meta,state){
    const p=stateProfile(meta,state);
    return{
      drawWidth:positiveNumber(p.drawWidth,positiveNumber(meta?.drawWidth,0)),
      drawHeight:positiveNumber(p.drawHeight,positiveNumber(meta?.drawHeight,0)),
      offsetX:Number(p.offsetX)||0,
      offsetY:Number(p.offsetY)||0,
      anchorX:Number.isFinite(Number(p.anchorX))?Number(p.anchorX):.5,
      anchorY:Number.isFinite(Number(p.anchorY))?Number(p.anchorY):1,
      hitbox:p.hitbox||null,
      muzzle:p.muzzle||null,
      cameraKick:Number(p.cameraKick)||0,
      nativeFacing:Number(p.nativeFacing)||Number(meta?.nativeFacing)||1
    };
  };

  Q.spriteWorldRect=function(meta,state,anchorX,anchorY){
    const p=Q.spriteStateProfile(meta,state);
    return{
      x:anchorX-p.drawWidth*p.anchorX+p.offsetX,
      y:anchorY-p.drawHeight*p.anchorY+p.offsetY,
      w:p.drawWidth,
      h:p.drawHeight
    };
  };

  Q.spriteHitbox=function(meta,state,anchorX,anchorY,fallback){
    const p=Q.spriteStateProfile(meta,state),h=p.hitbox;
    if(!h)return fallback?{...fallback}:null;
    if(h.anchor===true||h.x<0||h.y<0){
      return{x:anchorX+(Number(h.x)||0),y:anchorY+(Number(h.y)||0),w:Number(h.w)||0,h:Number(h.h)||0};
    }
    const r=Q.spriteWorldRect(meta,state,anchorX,anchorY);
    return{x:r.x+(Number(h.x)||0),y:r.y+(Number(h.y)||0),w:Number(h.w)||r.w,h:Number(h.h)||r.h};
  };

  Q.drawSpriteSheet=function(ctx,image,meta,state,timeSeconds,x,y,w,h,face=1){
    if(!ctx||!image||!meta)return false;
    const fw=positiveInt(meta.frameWidth,0),fh=positiveInt(meta.frameHeight,0);
    if(!fw||!fh)return false;
    const iw=image.naturalWidth||image.width||0,ih=image.naturalHeight||image.height||0;
    const cols=positiveInt(meta.columns,Math.max(1,Math.floor(iw/fw)));
    const frame=Q.spriteFrame(meta,state,timeSeconds);
    const sx=(frame%cols)*fw,sy=Math.floor(frame/cols)*fh;
    if(sx<0||sy<0||sx+fw>iw||sy+fh>ih)return false;
    const nativeFacing=Q.spriteStateProfile(meta,state).nativeFacing||1;
    const desiredFacing=face<0?-1:1;
    const flip=desiredFacing!==nativeFacing;
    ctx.save();
    if(flip){ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(image,sx,sy,fw,fh,0,0,w,h);}
    else ctx.drawImage(image,sx,sy,fw,fh,x,y,w,h);
    ctx.restore();
    return true;
  };

  Q.drawAnchoredSprite=function(ctx,image,meta,state,timeSeconds,anchorX,anchorY,face=1){
    const r=Q.spriteWorldRect(meta,state,anchorX,anchorY);
    return Q.drawSpriteSheet(ctx,image,meta,state,timeSeconds,r.x,r.y,r.w,r.h,face);
  };
})();
