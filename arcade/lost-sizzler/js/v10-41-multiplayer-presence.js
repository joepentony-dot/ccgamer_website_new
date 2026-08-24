/* The Lost Sizzler V10.41 — multiplayer combat presence, teammate radar sync and refined invite joining. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_MULTIPLAYER_PRESENCE__)return;
  window.__CCG_LOST_SIZZLER_V141_MULTIPLAYER_PRESENCE__=true;

  const state={installed:false,fireWrapped:false,packetWrapped:false,radarWrapped:false,joinWrapped:false,timer:0,lastSwingSent:0,autoJoinStarted:false,inviteGateShown:false,inviteCancelled:false};
  const TEAM_COLOURS=["#72ff9b","#ff6cc9","#ffb85c","#b978ff"];
  const ROOM_MODES=new Set(["dungeon","horde-survivor","sizzler-saboteurs"]);
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

  function inviteMeta(){
    try{
      const url=new URL(location.href),room=window.CCGNetwork?.cleanCode?.(url.searchParams.get("room")||"")||"",roomMode=String(url.searchParams.get("mode")||"").trim();
      if(room.length<4)return null;
      return{room,roomMode:ROOM_MODES.has(roomMode)?roomMode:""};
    }catch(_){return null}
  }

  function inviteModeLabel(roomMode){
    if(roomMode==="horde-survivor")return"Horde Multiplayer";
    if(roomMode==="sizzler-saboteurs")return"Spy Vs Spy Multiplayer";
    return"Dungeon Multiplayer";
  }

  function applyInviteMode(roomMode){
    if(!roomMode||!ROOM_MODES.has(roomMode)||typeof net==="undefined"||!net)return;
    try{net.configureRoomMode?.(roomMode)}catch(_){}
  }

  function removeInviteParameters(){
    try{
      const url=new URL(location.href);url.searchParams.delete("room");url.searchParams.delete("mode");history.replaceState(null,"",url.toString());
    }catch(_){}
  }

  function ensureInviteNameGate(meta){
    let gate=document.getElementById("v141-invite-name-gate");
    if(gate)return gate;
    const host=document.querySelector(".game-area")||document.body;
    gate=document.createElement("div");
    gate.id="v141-invite-name-gate";
    gate.className="overlay hidden";
    gate.setAttribute("role","dialog");gate.setAttribute("aria-modal","true");gate.setAttribute("aria-labelledby","v141-invite-name-title");
    gate.innerHTML=`<div class="panel compact"><p class="lobby-kicker">MULTIPLAYER INVITE</p><h2 id="v141-invite-name-title">JOIN ROOM <span id="v141-invite-room"></span></h2><p id="v141-invite-mode"></p><label class="field"><span>YOUR PLAYER NAME</span><input id="v141-invite-player-name" maxlength="18" autocomplete="nickname" placeholder="ENTER YOUR NAME"></label><p id="v141-invite-name-note" class="note">Choose the name the other players will see, then join the shared game.</p><div class="menu-buttons"><button id="v141-invite-name-join" class="primary" type="button">Join Game</button><button id="v141-invite-name-cancel" type="button">Cancel</button></div></div>`;
    host.appendChild(gate);
    const nameInput=gate.querySelector("#v141-invite-player-name"),join=gate.querySelector("#v141-invite-name-join"),cancel=gate.querySelector("#v141-invite-name-cancel");
    const submit=()=>{
      const name=String(nameInput?.value||"").trim();
      if(!name){const note=gate.querySelector("#v141-invite-name-note");if(note)note.textContent="Enter a player name before joining.";nameInput?.focus();return}
      const mainName=document.getElementById("player-name"),roomInput=document.getElementById("room-code");
      if(mainName){mainName.value=name;mainName.dispatchEvent(new Event("input",{bubbles:true}));mainName.dispatchEvent(new Event("change",{bubbles:true}))}
      if(roomInput)roomInput.value=meta.room;
      applyInviteMode(meta.roomMode);
      state.autoJoinStarted=true;gate.classList.add("hidden");
      if(UI?.note)UI.note.textContent=`Joining ${inviteModeLabel(meta.roomMode)} room ${meta.room} as ${name}…`;
      const api=window.CCGLostSizzlerV106;
      if(api?.joinLobbyRoom){Promise.resolve(api.joinLobbyRoom()).catch(error=>console.warn("[Lost Sizzler V10.41] invite join failed",error));return}
      document.getElementById("join-btn")?.click();
    };
    join?.addEventListener("click",submit);
    nameInput?.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();submit()}});
    cancel?.addEventListener("click",()=>{
      state.inviteCancelled=true;state.autoJoinStarted=false;gate.classList.add("hidden");removeInviteParameters();
      if(UI?.note)UI.note.textContent="Multiplayer invite cancelled. Choose any game mode when ready.";
    });
    return gate;
  }

  function showInviteNameGate(meta){
    if(!meta||state.inviteCancelled||state.autoJoinStarted)return false;
    const gate=ensureInviteNameGate(meta),room=gate.querySelector("#v141-invite-room"),modeCopy=gate.querySelector("#v141-invite-mode"),nameInput=gate.querySelector("#v141-invite-player-name"),join=gate.querySelector("#v141-invite-name-join");
    if(room)room.textContent=meta.room;
    if(modeCopy)modeCopy.textContent=`${inviteModeLabel(meta.roomMode)} invite detected. Enter your name before connecting.`;
    const existing=String(document.getElementById("player-name")?.value||"").trim();
    if(nameInput&&!nameInput.value&&existing&&existing!=="CCG Player")nameInput.value=existing;
    if(join)join.textContent=meta.roomMode==="horde-survivor"?"Join Horde":meta.roomMode==="sizzler-saboteurs"?"Join Spy Vs Spy":"Join Dungeon";
    gate.classList.remove("hidden");state.inviteGateShown=true;
    setTimeout(()=>nameInput?.focus(),0);
    return true;
  }

  function installInviteJoining(){
    if(state.joinWrapped)return true;
    const input=document.getElementById("room-code"),joinButton=document.getElementById("join-btn");if(!input||!joinButton)return false;
    state.joinWrapped=true;
    input.addEventListener("paste",event=>{
      const text=String(event.clipboardData?.getData("text")||"").trim();if(!text)return;
      try{
        const url=new URL(text,location.href),room=window.CCGNetwork?.cleanCode?.(url.searchParams.get("room")||"")||"",roomMode=String(url.searchParams.get("mode")||"").trim();
        if(room.length<4)return;
        event.preventDefault();input.value=room;applyInviteMode(roomMode);
        if(UI?.note)UI.note.textContent=`Invite detected for room ${room}. Enter your player name above, then press Join Online Room.`;
      }catch(_){}
    });
    const meta=inviteMeta();
    if(meta){
      input.value=meta.room;applyInviteMode(meta.roomMode);
      if(UI?.note)UI.note.textContent=`Multiplayer invite detected for room ${meta.room}. Enter your player name to continue.`;
    }
    return true;
  }

  function tryAutoJoinInvite(){
    if(state.autoJoinStarted||state.inviteCancelled)return;
    const meta=inviteMeta();if(!meta)return;
    const gate=window.CCGLostSizzlerReleaseGate;
    if(gate&&!gate.state?.ready)return;
    const input=document.getElementById("room-code");if(!input)return;
    if(typeof mode!=="undefined"&&mode!=="menu")return;
    input.value=meta.room;applyInviteMode(meta.roomMode);showInviteNameGate(meta);
  }

  function install(){
    installInviteJoining();
    tryAutoJoinInvite();
    const gate=window.CCGLostSizzlerReleaseGate;
    if(gate&&!gate.state?.ready)return false;
    const ready=installFireSync()&&installPacketSync()&&installRadar()&&state.joinWrapped;
    if(ready){state.installed=true;document.body.dataset.v141MultiplayerPresence="true"}
    return ready;
  }

  state.timer=setInterval(()=>{install();if(state.installed&&(!inviteMeta()||state.inviteGateShown||state.autoJoinStarted||state.inviteCancelled)){clearInterval(state.timer);state.timer=0}},90);
  install();
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141={get state(){return state},overlayTeamRadar,remoteSlashFx,inviteMeta,showInviteNameGate,tryAutoJoinInvite,install};
})();