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

  Q.spriteFrame=function(meta,state,timeSeconds=0){
    const frames=animationFrames(meta,state);
    const fps=positiveNumber(meta?.fps,8);
    const loop=meta?.loop!==false;
    if(!frames.length)return 0;
    const step=Math.max(0,Math.floor(timeSeconds*fps));
    return frames[loop?step%frames.length:Math.min(step,frames.length-1)];
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
})();