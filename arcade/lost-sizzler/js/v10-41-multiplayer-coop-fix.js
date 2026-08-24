/* The Lost Sizzler V10.41 — co-op combat visibility, teammate radar and refined room joining. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_MULTIPLAYER_COOP_V141__)return;
  window.__CCG_LOST_SIZZLER_MULTIPLAYER_COOP_V141__=true;

  const VALID_ROOM_MODES=new Set(["dungeon","horde-survivor","sizzler-saboteurs"]);
  const state={combat:false,packet:false,render:false,join:false,pendingSwings:new Map(),attempts:0};
  const specialType=()=>window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"";
  const online=()=>typeof playMode!=="undefined"&&playMode==="online"&&typeof net!=="undefined"&&Boolean(net?.connected);
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const safeDir=value=>({x:Math.sign(Number(value?.x)||0),y:Math.sign(Number(value?.y)||0)});

  function modeHintFromLocation(){
    try{
      const value=String(new URL(location.href).searchParams.get("mode")||"").trim();
      return VALID_ROOM_MODES.has(value)?value:"";
    }catch(_){return""}
  }

  function applyModeHint(value){
    const modeId=VALID_ROOM_MODES.has(String(value||""))?String(value):"";
    if(!modeId||typeof net==="undefined"||!net)return false;
    try{net.configureRoomMode?.(modeId);return true}catch(_){return false}
  }

  function parseInvite(value){
    const raw=String(value||"").trim();if(!raw)return null;
    try{
      const url=new URL(raw,location.href),room=window.CCGNetwork?.cleanCode?.(url.searchParams.get("room")||"")||"",roomMode=String(url.searchParams.get("mode")||"");
      if(room.length>=4)return{room,roomMode:VALID_ROOM_MODES.has(roomMode)?roomMode:""};
    }catch(_){}
    const room=window.CCGNetwork?.cleanCode?.(raw)||"";
    return room.length>=4?{room,roomMode:""}:null;
  }

  function installJoinRefinement(){
    if(state.join)return;
    const input=document.getElementById("room-code");if(!input)return;
    state.join=true;
    input.placeholder="ROOM CODE";
    const pageRoom=(()=>{try{return window.CCGNetwork?.cleanCode?.(new URL(location.href).searchParams.get("room")||"")||""}catch(_){return""}})();
    const pageMode=modeHintFromLocation();
    if(pageMode)applyModeHint(pageMode);
    if(pageRoom.length>=4&&!input.value)input.value=pageRoom;
    input.addEventListener("paste",event=>{
      const parsed=parseInvite(event.clipboardData?.getData("text")||"");if(!parsed)return;
      event.preventDefault();input.value=parsed.room;
      if(parsed.roomMode)applyModeHint(parsed.roomMode);
      const note=document.getElementById("menu-note");
      if(note)note.textContent=parsed.roomMode?`Invite detected: ${parsed.roomMode==="horde-survivor"?"Horde Multiplayer":parsed.roomMode==="sizzler-saboteurs"?"Spy Vs Spy Multiplayer":"Dungeon Multiplayer"} · room ${parsed.room}. Press Join Online Room.`:`Room ${parsed.room} detected. Press Join Online Room; the host will confirm the multiplayer mode.`;
    });
  }

  function swingPayload(player){
    const started=Number(player?._meleeSwingAt||0),total=clamp(player?._meleeSwingMs,180,500),elapsed=performance.now()-started;
    if(!started||elapsed<0||elapsed>total+80)return null;
    return{id:String(player.id||net?.sessionId||""),dir:safeDir(player._meleeSwingDir||player.dir),colour:String(player._meleeSwingColour||player.meleeWeapon?.colour||"#ffd85a"),durationMs:total,weapon:player.meleeWeapon?{id:player.meleeWeapon.id,name:player.meleeWeapon.name,short:player.meleeWeapon.short,colour:player.meleeWeapon.colour}:null,sentAt:Date.now()};
  }

  function installCombatSend(){
    if(state.combat||typeof firePlayer!=="function"||!window.CCGLostSizzlerMeleeAmmoV125)return;
    const original=firePlayer;
    firePlayer=function firePlayerV141CoopVisibility(player,direction){
      const before=Number(player?._meleeSwingAt||0),result=original.apply(this,arguments),after=Number(player?._meleeSwingAt||0);
      if(player&&player===p1&&online()&&after>before){
        const payload=swingPayload(player);if(payload)try{net.send("v141_melee_swing",payload).catch?.(()=>{})}catch(_){}
      }
      return result;
    };
    state.combat=true;
  }

  function remoteSlashFx(player,payload){
    if(!player)return;
    const dir=safeDir(payload?.dir||player.dir),colour=String(payload?.colour||player.meleeWeapon?.colour||"#ffd85a"),duration=clamp(payload?.durationMs,180,500),at=performance.now();
    player._meleeSwingAt=at;player._meleeSwingMs=duration;player._meleeSwingDir={...dir};player._meleeSwingColour=colour;
    if(payload?.weapon)player.meleeWeapon={...(player.meleeWeapon||{}),...payload.weapon};
    try{
      const tx=Number(player.x||0)+dir.x,ty=Number(player.y||0)+dir.y;
      if(typeof ring==="function")ring(tx,ty,colour,24);
      if(Array.isArray(particles)&&typeof C!=="undefined")for(let i=0;i<10;i++)particles.push({x:(Number(player.x||0)+.5+dir.x*(.35+i*.025))*C.tile,y:(Number(player.y||0)+.5+dir.y*(.35+i*.025))*C.tile,vx:(Math.random()-.5)*1.7,vy:(Math.random()-.5)*1.7,life:120+i*15,col:colour,size:1.4+Math.random()*2.2,drag:.91,glow:7});
    }catch(_){}
  }

  function installPacketReceive(){
    if(state.packet||typeof net==="undefined"||!net?.cb?.onPacket)return;
    const original=net.cb.onPacket;
    net.cb.onPacket=function onPacketV141CoopVisibility(event,payload){
      if(event==="v141_melee_swing"){
        if(!payload?.id||payload.id===net.sessionId)return;
        const player=typeof remote!=="undefined"?remote.get(payload.id):null;
        if(player)remoteSlashFx(player,payload);else state.pendingSwings.set(String(payload.id),{payload,expires:performance.now()+900});
        return;
      }
      return original.apply(this,arguments);
    };
    state.packet=true;
  }

  function flushPendingSwings(){
    if(!state.pendingSwings.size||typeof remote==="undefined")return;
    const t=performance.now();
    for(const [id,row] of state.pendingSwings){
      if(t>row.expires){state.pendingSwings.delete(id);continue}
      const player=remote.get(id);if(!player)continue;remoteSlashFx(player,row.payload);state.pendingSwings.delete(id);
    }
  }

  function drawTeammatesOnRadar(){
    if(!online()||specialType()==="sizzler-saboteurs"||typeof world==="undefined"||!world?.map||typeof remote==="undefined")return;
    const radar=document.getElementById("radar-canvas"),rctx=radar?.getContext?.("2d");if(!radar||!rctx)return;
    const mapH=world.map.length,mapW=Math.max(1,...world.map.map(row=>Array.isArray(row)?row.length:0));if(!mapW||!mapH)return;
    const scale=Math.min(radar.width/mapW,radar.height/mapH),drawW=mapW*scale,drawH=mapH*scale,ox=(radar.width-drawW)/2,oy=(radar.height-drawH)/2;
    const players=[...remote.values()].filter(player=>player&&Number(player.health||0)>0&&performance.now()-Number(player.lastSeen||0)<6500);
    if(!players.length)return;
    rctx.save();
    for(const player of players){
      const x=ox+(Number(player.x||0)+.5)*scale,y=oy+(Number(player.y||0)+.5)*scale,r=Math.max(3.4,Math.min(6.5,scale*.7));
      rctx.beginPath();rctx.arc(x,y,r+2,0,Math.PI*2);rctx.fillStyle="rgba(0,0,0,.82)";rctx.fill();
      rctx.beginPath();rctx.arc(x,y,r,0,Math.PI*2);rctx.fillStyle="#6cecff";rctx.fill();rctx.strokeStyle="#ffffff";rctx.lineWidth=1.3;rctx.stroke();
      const initial=String(player.name||"P").trim().charAt(0).toUpperCase();if(initial&&r>=4.4){rctx.fillStyle="#05040a";rctx.font=`bold ${Math.max(7,Math.round(r*1.45))}px monospace`;rctx.textAlign="center";rctx.textBaseline="middle";rctx.fillText(initial,x,y+.4)}
    }
    rctx.restore();
  }

  function installRenderOverlay(){
    if(state.render||typeof render!=="function")return;
    const original=render;
    render=function renderV141CoopVisibility(){const result=original.apply(this,arguments);flushPendingSwings();try{drawTeammatesOnRadar()}catch(error){console.warn("[Lost Sizzler V10.41] teammate radar overlay failed safely",error)}return result};
    state.render=true;
  }

  function install(){
    installJoinRefinement();
    if(!window.CCGLostSizzlerReleaseGate?.state?.ready)return false;
    installCombatSend();installPacketReceive();installRenderOverlay();flushPendingSwings();
    return state.combat&&state.packet&&state.render&&state.join;
  }

  install();
  const timer=setInterval(()=>{state.attempts++;if(install()||state.attempts>180)clearInterval(timer)},100);
  window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
  window.CCGLostSizzlerMultiplayerCoopV141={state,parseInvite,applyModeHint,drawTeammatesOnRadar,install};
})();