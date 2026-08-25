(function(){
  'use strict';
  const Q=window.CCGQuest=window.CCGQuest||{};

  function positiveInt(value,fallback){const n=Math.floor(Number(value));return Number.isFinite(n)&&n>0?n:fallback;}
  function positiveNumber(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback;}
  function animationFrames(meta,state){
    const animations=meta?.animations&&typeof meta.animations==='object'?meta.animations:{};
    const raw=animations[state]??animations.idle??[0];
    if(Array.isArray(raw))return raw.map(Number).filter(Number.isFinite);
    if(Number.isFinite(Number(raw)))return[Number(raw)];
    return[0];
  }
  function stateProfile(meta,state){
    const table=meta?.stateMeta&&typeof meta.stateMeta==='object'?meta.stateMeta:{};
    return table[state]||table.idle||{};
  }

  Q.spriteFrame=function(meta,state,timeSeconds=0){
    const frames=animationFrames(meta,state);
    const fps=positiveNumber(meta?.fps,8);
    const loop=meta?.loop!==false;
    if(!frames.length)return 0;
    const step=Math.max(0,Math.floor(timeSeconds*fps));
    return frames[loop?step%frames.length:Math.min(step,frames.length-1)];
  };

  Q.spriteStateProfile=function(meta,state){
    const p=stateProfile(meta,state);
    return {
      drawWidth:positiveNumber(p.drawWidth,positiveNumber(meta?.drawWidth,0)),
      drawHeight:positiveNumber(p.drawHeight,positiveNumber(meta?.drawHeight,0)),
      offsetX:Number(p.offsetX)||0,
      offsetY:Number(p.offsetY)||0,
      hitbox:p.hitbox||null,
      muzzle:p.muzzle||null,
      cameraKick:Number(p.cameraKick)||0
    };
  };

  Q.spriteWorldRect=function(meta,state,cx,groundY){
    const p=Q.spriteStateProfile(meta,state);
    return {x:cx-p.drawWidth/2+p.offsetX,y:groundY-p.drawHeight+p.offsetY,w:p.drawWidth,h:p.drawHeight};
  };

  Q.spriteHitbox=function(meta,state,cx,groundY,fallback){
    const p=Q.spriteStateProfile(meta,state),h=p.hitbox;
    if(!h)return fallback?{...fallback}:null;
    if(h.x<0||h.y<0){
      return {x:cx+(Number(h.x)||0),y:groundY+(Number(h.y)||0),w:Number(h.w)||0,h:Number(h.h)||0};
    }
    const base=fallback||{x:cx-39,y:groundY-132,w:78,h:132};
    return {x:base.x+(Number(h.x)||0),y:base.y+(Number(h.y)||0),w:Number(h.w)||base.w,h:Number(h.h)||base.h};
  };

  Q.drawSpriteSheet=function(ctx,image,meta,state,timeSeconds,x,y,w,h,face=1){
    if(!ctx||!image||!meta)return false;
    const fw=positiveInt(meta.frameWidth,0),fh=positiveInt(meta.frameHeight,0);
    if(!fw||!fh)return false;
    const cols=positiveInt(meta.columns,Math.max(1,Math.floor((image.naturalWidth||image.width||fw)/fw)));
    const frame=Q.spriteFrame(meta,state,timeSeconds);
    const sx=(frame%cols)*fw,sy=Math.floor(frame/cols)*fh;
    const iw=image.naturalWidth||image.width||0,ih=image.naturalHeight||image.height||0;
    if(sx<0||sy<0||sx+fw>iw||sy+fh>ih)return false;
    ctx.save();
    if(face<0){ctx.translate(x*2+w,0);ctx.scale(-1,1);}
    ctx.drawImage(image,sx,sy,fw,fh,x,y,w,h);
    ctx.restore();
    return true;
  };

  Q.drawAnchoredSprite=function(ctx,image,meta,state,timeSeconds,cx,groundY,face=1){
    const r=Q.spriteWorldRect(meta,state,cx,groundY);
    return Q.drawSpriteSheet(ctx,image,meta,state,timeSeconds,r.x,r.y,r.w,r.h,face);
  };
})();
