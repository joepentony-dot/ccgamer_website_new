/* The Lost Sizzler V10.41 — multiplayer combat presence and teammate radar sync. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_MULTIPLAYER_PRESENCE__)return;
  window.__CCG_LOST_SIZZLER_V141_MULTIPLAYER_PRESENCE__=true;

  const state={installed:false,fireWrapped:false,packetWrapped:false,radarWrapped:false,timer:0,lastSwingSent:0};
  const TEAM_COLOURS=["#72ff9b","#ff6cc9","#ffb85c","#b978ff"];
  const actorId=()=>String(typeof net!=="undefined"&&net?.sessionId||"");
  const admitted=id=>{
    try{return Boolean(id)&&net?.getMembers?.().some(member=>String(member.id)===String(id))}catch(_){return false}
  };
  const spyMode=()=>document.body?.dataset?.specialMode==="sizzler-saboteurs";

  function canShowWorldFx(x,y){
    try{
      if(typeof p1==="undefined"||!p1)return false;
      return typeof visibleTo!=="function"||visibleTo(p1,Number(x),Number(y));
    }catch(_){return false}
  }

  function remoteSlashFx(payload,player){
    const dir=payload?.dir&&typeof payload.dir==="object"?{x:Math.sign(Number(payload.dir.x)||0),y:Math.sign(Number(payload.dir.y)||0)}:{x:1,y:0};
    if(!dir.x&&!dir.y)dir.x=1;
    const colour=String(payload?.colour||player?.meleeWeapon?.colour||"#ffd85a");
    const swingMs=Math.max(180,Math.min(420,Number(payload?.swingMs)||260));
    const at=performance.now();
    if(player){
      player.dir={...dir};
      player._meleeSwingAt=at;
      player._meleeSwingMs=swingMs;
      player._meleeSwingDir={...dir};
      player._meleeSwingColour=colour;
    }
    const x=Number(player?.x??payload?.x),y=Number(player?.y??payload?.y);
    if(!Number.isFinite(x)||!Number.isFinite(y)||!canShowWorldFx(x,y))return;
    const tx=x+dir.x,ty=y+dir.y;
    try{if(typeof ring==="function")ring(tx,ty,colour,24)}catch(_){}
    try{
      if(typeof particles!=="undefined"&&Array.isArray(particles)&&typeof C!=="undefined"){
        for(let i=0;i<8;i++)particles.push({x:tx*C.tile+C.tile/2,y:ty*C.tile+C.tile/2,vx:(Math.random()-.5)*4.4,vy:(Math.random()-.5)*4.4,life:150+Math.random()*150,col:colour,size:2+Math.random()*2.5,drag:.93});
      }
    }catch(_){}
  }

  function installFireSync(){
    if(state.fireWrapped||typeof firePlayer!=="function"||typeof net==="undefined")return state.fireWrapped;
    const original=firePlayer;
    firePlayer=function firePlayerV141MultiplayerPresence(player,direction){
      const before=Number(player?._meleeSwingAt||0);
      const result=original.apply(this,arguments);
      const after=Number(player?._meleeSwingAt||0);
      if(player&&player===p1&&playMode==="online"&&net?.connected&&after>before&&after!==state.lastSwingSent){
        state.lastSwingSent=after;
        const dir=player._meleeSwingDir||player.dir||direction||{x:1,y:0};
        const packet={
          actorId:actorId(),
          x:Number(player.x),y:Number(player.y),
          dir:{x:Math.sign(Number(dir?.x)||0),y:Math.sign(Number(dir?.y)||0)},
          colour:String(player._meleeSwingColour||player.meleeWeapon?.colour||"#ffd85a"),
          swingMs:Math.max(180,Math.min(420,Number(player._meleeSwingMs)||260)),
          sentAt:Date.now()
        };
        try{Promise.resolve(net.send("v141_melee_fx",packet)).catch(()=>{})}catch(_){}
      }
      return result;
    };
    firePlayer.__ccgV141Wrapped=true;
    state.fireWrapped=true;
    return true;
  }

  function installPacketSync(){
    if(state.packetWrapped||typeof net==="undefined"||!net?.cb)return state.packetWrapped;
    const previous=net.cb.onPacket;
    net.cb.onPacket=function onPacketV141MultiplayerPresence(event,payload){
      if(event==="v141_melee_fx"){
        const id=String(payload?.actorId||"");
        if(!id||id===actorId()||!admitted(id))return;
        const player=typeof remote!=="undefined"?remote.get(id):null;
        remoteSlashFx(payload,player||null);
        return;
      }
      return previous?.(event,payload);
    };
    state.packetWrapped=true;
    return true;
  }

  function drawTeamMarker(ctx,x,y,colour,label,edge=false,angle=0){
    ctx.save();
    ctx.translate(Math.round(x),Math.round(y));
    if(edge)ctx.rotate(angle);
    ctx.fillStyle=colour;ctx.strokeStyle="#fff";ctx.lineWidth=1.25;ctx.shadowColor=colour;ctx.shadowBlur=6;
    ctx.beginPath();
    if(edge){ctx.moveTo(6,0);ctx.lineTo(-4,-4);ctx.lineTo(-4,4);ctx.closePath()}
    else{ctx.arc(0,0,4.2,0,Math.PI*2)}
    ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    if(!edge){ctx.font='bold 9px Consolas, "Courier New", monospace';ctx.textAlign="center";ctx.textBaseline="bottom";ctx.fillStyle="#fff";ctx.fillText(label,0,-6)}
    ctx.restore();
  }

  function overlayTeamRadar(player){
    if(spyMode()||playMode!=="online"||typeof remote==="undefined"||!remote?.size)return;
    const canvas=document.getElementById("radar-canvas"),ctx=canvas?.getContext?.("2d");if(!canvas||!ctx||!world||!player)return;
    const rw=canvas.width,rh=canvas.height,pad=9,cols=Math.min(C.worldWidth,Math.max(46,Math.floor(rw/6))),rows=Math.min(C.worldHeight,Math.max(24,Math.floor(rh/5.5))),minX=Math.max(0,Math.min(C.worldWidth-cols,Math.round(player.x-cols/2))),minY=Math.max(0,Math.min(C.worldHeight-rows,Math.round(player.y-rows/2))),maxX=minX+cols,maxY=minY+rows,sc=Math.min((rw-pad*2)/cols,(rh-pad*2)/rows),mw=cols*sc,mh=rows*sc,ox=(rw-mw)/2,oy=(rh-mh)/2;
    const members=net?.getMembers?.()||[],order=new Map(members.map((member,index)=>[String(member.id),index+1]));
    let colourIndex=0;
    for(const model of remote.values()){
      if(!model||performance.now()-Number(model.lastSeen||0)>5000||Number(model.health||0)<=0)continue;
      const q={x:Number(model.rx??model.x),y:Number(model.ry??model.y)};if(!Number.isFinite(q.x)||!Number.isFinite(q.y))continue;
      const label=`P${order.get(String(model.id))||colourIndex+2}`,colour=TEAM_COLOURS[colourIndex++%TEAM_COLOURS.length];
      const rawX=ox+(q.x-minX)*sc,rawY=oy+(q.y-minY)*sc,inside=q.x>=minX&&q.x<maxX&&q.y>=minY&&q.y<maxY;
      if(inside){drawTeamMarker(ctx,rawX,rawY,colour,label,false);continue}
      const cx=Math.max(ox+5,Math.min(ox+mw-5,rawX)),cy=Math.max(oy+5,Math.min(oy+mh-5,rawY)),angle=Math.atan2(rawY-cy,rawX-cx);
      drawTeamMarker(ctx,cx,cy,colour,label,true,angle);
    }
    const legend=document.querySelector(".radar-legend");
    if(legend&&!legend.querySelector('[data-v141-team="true"]')){
      const item=document.createElement("span");item.dataset.v141Team="true";item.innerHTML='<i style="background:#72ff9b"></i>TEAM';legend.appendChild(item);
    }
  }

  function installRadar(){
    if(state.radarWrapped||typeof renderRadarPanel!=="function")return state.radarWrapped;
    const original=renderRadarPanel;
    renderRadarPanel=function renderRadarPanelV141MultiplayerPresence(player){
      const result=original.apply(this,arguments);
      try{overlayTeamRadar(player)}catch(error){console.warn("[Lost Sizzler V10.41] teammate radar overlay failed",error)}
      return result;
    };
    state.radarWrapped=true;
    return true;
  }

  function install(){
    const gate=window.CCGLostSizzlerReleaseGate;
    if(gate&&!gate.state?.ready)return false;
    const ready=installFireSync()&&installPacketSync()&&installRadar();
    if(ready){state.installed=true;document.body.dataset.v141MultiplayerPresence="true"}
    return ready;
  }

  state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},90);
  install();
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141={get state(){return state},overlayTeamRadar,remoteSlashFx,install};
})();
