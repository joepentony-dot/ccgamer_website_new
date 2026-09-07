/* The Lost Sizzler V10.6 — host-controlled lobby and authoritative start flow. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_RUNTIME_V106__)return;
  window.__CCG_LOST_SIZZLER_RUNTIME_V106__=true;

  const lobby=document.getElementById("online-lobby"),roomLabel=document.getElementById("lobby-room-code"),status=document.getElementById("lobby-status"),invite=document.getElementById("lobby-invite-url"),list=document.getElementById("lobby-player-list"),startButton=document.getElementById("lobby-start-btn"),capacityCopy=document.getElementById("lobby-capacity-copy");
  let lobbyOpen=false,startHandled=false,joinAttempt=0;
  let lastStartMeta=null;
  const clean=value=>window.CCGNetwork.cleanCode(value);
  const setNote=text=>{if(UI?.note)UI.note.textContent=text};
  const modeDefinition=value=>window.CCGNetwork?.ROOM_MODES?.[String(value||"")]||window.CCGNetwork?.ROOM_MODES?.dungeon||{id:"dungeon",label:"Dungeon Multiplayer",maxPlayers:C.maxPlayers};
  const inviteFor=(code,roomMode=net?.getRoomMode?.().id||"dungeon")=>{const delivery=window.CCGLostSizzlerDelivery,base=delivery?.isDesktop&&typeof delivery.websiteUrl==="function"?delivery.websiteUrl("/arcade/lost-sizzler/"):location.href,url=new URL(base);url.searchParams.set("room",code);url.searchParams.set("mode",String(roomMode||"dungeon"));url.hash="";return url.toString()};

  function adoptRoomMode(value){
    const definition=modeDefinition(value);if(!net||!definition)return definition;
    net.roomMode=definition.id;net.roomCapacity=definition.maxPlayers;return definition
  }
  function setBuild(){document.querySelectorAll(".build-badge").forEach(n=>n.textContent="BUILD V10.35");const p=document.querySelector(".brand p");if(p)p.textContent="THE LOST SIZZLER — V10.35"}
  function showLobby(){lobbyOpen=true;mode="lobby";playMode="online";setRunPresentation(false);UI.menu?.classList.add("hidden");lobby?.classList.remove("hidden");updateLobby()}
  function hideLobby(){lobbyOpen=false;lobby?.classList.add("hidden")}
  function updateLobby(){
    if(!lobbyOpen||!net)return;
    if(!net.isHost&&!startHandled){
      const runtime=net.getHostRuntimePresence?.();
      if(runtime?.started&&runtime?.startMeta){receiveStart(runtime.startMeta);return}
    }
    const members=net.getMembers(),code=net.roomCode||clean(UI.roomCode?.value);
    const definition=net.getRoomMode?.()||modeDefinition("dungeon"),capacity=net.getCapacity?.()||definition.maxPlayers||C.maxPlayers;
    if(roomLabel)roomLabel.textContent=code||"-----";if(status)status.textContent=`${definition.label.toUpperCase()} · ${members.length}/${capacity} players connected${net.isHost?" · YOU ARE HOST":" · WAITING FOR HOST"}`;if(invite)invite.value=code?inviteFor(code,definition.id):"";
    if(list)list.innerHTML=members.map((member,index)=>`<li class="${index===0?"host":""}">${esc(member.name||"Player")}${index===0?" — HOST":""}${member.id===net.sessionId?" — YOU":""}</li>`).join("")||"<li>Connecting…</li>";
    if(startButton){startButton.disabled=!net.isHost;startButton.textContent=net.isHost?(definition.id==="horde-survivor"?"Start Horde":definition.id==="sizzler-saboteurs"?"Start Match":"Start Dungeon"):"Waiting for Host"}
    if(capacityCopy)capacityCopy.textContent=`The host controls the start. Guests remain in this lobby until the host begins. ${definition.label} holds ${capacity===2?"two":"four"} players; disconnected guests are removed and the earliest remaining player becomes host.`;
    const chip=document.getElementById("v104-room-chip");if(chip)chip.textContent=playMode==="online"&&net.connected?`ROOM ${code} · ${members.length}/${capacity}`:"";
  }
  function onlineError(title,error){const message=String(error?.message||error||"Online multiplayer could not connect.");setNote(message);try{showToast(title,message,"red",10000)}catch(_){}}
  async function leaveLobby(message="Online lobby closed."){
    joinAttempt++;try{await net.leave()}catch(_){}hideLobby();playMode="solo";mode="menu";startHandled=false;lastStartMeta=null;setRunPresentation(false);net.setSolo(playerName());UI.menu?.classList.remove("hidden");setNote(message);sync?.()
  }
  function runMeta(){const definition=net.getRoomMode?.()||modeDefinition("dungeon"),members=net.getMembers();return{roomCode:net.roomCode,roomMode:definition.id,roomCapacity:definition.maxPlayers,players:members.map(member=>({id:member.id,name:member.name})),hostId:members[0]?.id||net.sessionId,seed:net.roomCode,floor:1,difficulty:UI.difficulty?.value||"ARCADE",modifier:null,startedAt:Date.now(),build:"V10.35",protocol:"v106-lobby-2"}}
  function prepareRun(meta={}){
    const selected=String(meta.roomMode||net.getRoomMode?.().id||"dungeon"),definition=adoptRoomMode(selected);
    if(selected!=="dungeon"){
      const specialApi=window.CCGLostSizzlerSpecialModes;
      if(!specialApi?.startOnline)throw new Error(`${definition.label} is still loading. Refresh the game and try the room again.`);
      const started=specialApi.startOnline({...meta,roomMode:selected,players:meta.players||net.getMembers(),hostId:meta.hostId||net.getMembers()[0]?.id});
      if(!started)throw new Error(`${definition.label} could not initialise on this browser. Refresh and rejoin room ${net.roomCode}.`);
      hideLobby();UI.menu?.classList.add("hidden");return true
    }
    run=PGR.makeRun({difficulty:meta.difficulty||UI.difficulty?.value||"ARCADE",seed:meta.seed||net.roomCode});run.floor=Math.max(1,Number(meta.floor||1));run.deepest=run.floor;run.modifier=meta.modifier?{...meta.modifier}:PGR.chooseFloorModifier(run,Math.random);playMode="online";startWorld(PGR.floorSeed(run),false,false);mode="playing";setRunPresentation(true);hideLobby();UI.menu?.classList.add("hidden");S.start();S.startMusic();sync();return true
  }
  async function createLobbyRoom(selectedMode="dungeon"){
    setNote("Creating verified internet room…");let created=null,code="";startHandled=false;lastStartMeta=null;
    try{net.configureRoomMode?.(selectedMode);for(let attempt=0;attempt<4&&!created;attempt++){code=net.createCode();try{created=await net.createOnlineRoom(code,playerName(),{mode:selectedMode})}catch(error){if(!/already in use/i.test(String(error?.message||"")))throw error}}if(!created)throw new Error("Could not allocate an unused room code. Please try again.");UI.roomCode.value=code;showLobby();const definition=net.getRoomMode?.()||modeDefinition(selectedMode);showToast("ONLINE ROOM READY",`Share room ${code}. ${definition.label} begins when the host presses Start.`,"green",9000)}catch(error){await leaveLobby(String(error?.message||error));onlineError("ONLINE ROOM NOT CREATED",error)}
  }
  function requestRoomState(){
    if(!net?.connected||net.isHost)return;
    const payload={id:net.sessionId,name:playerName(),roomCode:net.roomCode,knownMode:net.getRoomMode?.().id||"dungeon",sentAt:Date.now()};
    try{net.send("v106_lobby_probe",payload).catch?.(()=>{})}catch(_){}
  }
  async function joinLobbyRoom(){
    const code=clean(UI.roomCode?.value);if(code.length<4){setNote("Enter the room code from the host.");return}S.start();setNote(`Finding room ${code}…`);
    const attempt=++joinAttempt;startHandled=false;lastStartMeta=null;
    try{
      const joined=await net.joinExistingRoom(code,playerName());if(attempt!==joinAttempt)return;if(joined.transport!=="supabase")throw new Error("This is not a verified internet room.");
      UI.roomCode.value=code;if(joined.roomMode?.id)adoptRoomMode(joined.roomMode.id);
      /* A host can answer the network hello while joinExistingRoom is still
       * resolving. If that start packet already launched the guest, never reset
       * startHandled or reopen the lobby afterwards. */
      if(startHandled||mode==="playing"||document.body?.dataset?.specialMode){hideLobby();UI.menu?.classList.add("hidden");setNote(`Room ${code} joined. Match state received from the host.`);return}
      showLobby();const definition=net.getRoomMode?.()||modeDefinition("dungeon");showToast("ONLINE ROOM JOINED",`${definition.label} · room ${code}. Waiting for the host to start.`,"green",8000);
      requestRoomState();setTimeout(()=>{if(attempt===joinAttempt&&!startHandled)requestRoomState()},320);setTimeout(()=>{if(attempt===joinAttempt&&!startHandled)requestRoomState()},900)
    }catch(error){if(attempt!==joinAttempt)return;await leaveLobby(String(error?.message||error));onlineError("ONLINE ROOM JOIN FAILED",error)}
  }
  function startHostedRun(){
    if(!lobbyOpen||!net.isHost||startHandled)return;const definition=net.getRoomMode?.()||modeDefinition("dungeon");if(definition.id==="sizzler-saboteurs"&&net.getMembers().length!==2){showToast("TWO AGENTS REQUIRED","Spy Vs Spy Multiplayer starts only when exactly two players are connected.","red",8000);return}
    try{
      startHandled=true;requestPlayFullscreen();const meta=runMeta();lastStartMeta=meta;prepareRun(meta);
      Promise.resolve(net.setRuntimePresence?.(true,meta)).catch(error=>console.warn("[Lost Sizzler] live start presence publish failed",error));
      const announce=()=>net.sendRequired("v106_lobby_start",meta).catch(error=>{setNote(`Room ${net.roomCode}: ${error.message}`);console.warn("[Lost Sizzler] lobby start relay retry failed",error)});announce();setTimeout(announce,280);setTimeout(announce,850);if(definition.id==="dungeon")setTimeout(()=>broadcastWorld(),1000);showToast(`${definition.label.toUpperCase()} STARTED`,`${net.getMembers().length}/${net.getCapacity?.()||C.maxPlayers} players entered room ${net.roomCode}.`,"green",7500)
    }catch(error){startHandled=false;lastStartMeta=null;try{Promise.resolve(net.setRuntimePresence?.(false,null)).catch(()=>{})}catch(_){}onlineError("MULTIPLAYER MODE COULD NOT START",error);showLobby()}
  }
  function receiveStart(meta){
    if(net.isHost||startHandled)return;const definition=adoptRoomMode(meta?.roomMode||net.getRoomMode?.().id||"dungeon");
    try{requestPlayFullscreen();prepareRun({...meta,roomMode:definition.id});startHandled=true;lastStartMeta={...meta,roomMode:definition.id};net.send("v106_lobby_ack",{id:net.sessionId,name:playerName(),roomMode:definition.id}).catch(()=>{});net.send("hello",{id:net.sessionId,name:playerName(),roomCode:net.roomCode,roomMode:definition.id,wantsWorld:definition.id==="dungeon",build:"V10.35"}).catch(()=>{});showToast(definition.id==="dungeon"?"HOST STARTED THE DUNGEON":`${definition.label.toUpperCase()} STARTED`,`Room ${net.roomCode} is live.`,"green",7000)}catch(error){startHandled=false;onlineError("HOST START COULD NOT BE APPLIED",error);showLobby()}
  }

  const originalMembers=net.cb.onMembers;
  net.cb.onMembers=function onMembersV106(members,isHost,changed){const result=originalMembers?.(members,isHost,changed);updateLobby();if(changed&&isHost&&lobbyOpen)showToast("YOU ARE NOW HOST","The previous host disconnected. You can start the selected multiplayer mode when everyone is ready.","cyan",8500);return result};
  const originalPacket=net.cb.onPacket;
  net.cb.onPacket=function onPacketV106(event,payload){
    if(event==="v106_lobby_start"){receiveStart(payload||{});return}
    if(event==="v106_lobby_meta"){
      if(payload?.roomMode)adoptRoomMode(payload.roomMode);updateLobby();
      if(payload?.started&&payload?.startMeta&&!startHandled)receiveStart(payload.startMeta);
      return
    }
    if(event==="v106_lobby_probe"){
      if(net.isHost){
        const definition=net.getRoomMode?.()||modeDefinition("dungeon"),live=Boolean(lastStartMeta&&mode==="playing");
        net.send("v106_lobby_meta",{roomCode:net.roomCode,roomMode:definition.id,roomCapacity:definition.maxPlayers,hostId:net.sessionId,started:live,startMeta:live?lastStartMeta:null,sentAt:Date.now()}).catch(()=>{});
        if(live)net.send("v106_lobby_start",lastStartMeta).catch(()=>{})
      }
      return
    }
    if(event==="v106_lobby_cancel"){leaveLobby("The host cancelled the online lobby.");return}
    if(event==="hello"&&net.isHost&&playMode==="online"&&mode==="playing"&&lastStartMeta){net.send("v106_lobby_start",lastStartMeta).catch(()=>{});if(lastStartMeta.roomMode==="dungeon")setTimeout(()=>broadcastWorld(),80);return originalPacket?.(event,payload)}
    return originalPacket?.(event,payload)
  };
  const originalConnection=net.cb.onConnection;net.cb.onConnection=function onConnectionV131(connected,message){originalConnection?.(connected,message);if(!connected){setNote(`Online room connection lost: ${message||"reconnecting…"}`);try{showToast("ONLINE CONNECTION LOST","The Realtime relay disconnected. Keep this page open while it reconnects.","red",9000)}catch(_){}}else{if(lobbyOpen)setNote(`Room ${net.roomCode} connected. Share the code and wait for the host.`);if(!net.isHost)setTimeout(requestRoomState,80)}updateLobby()};
  const originalSend=net.send.bind(net);
  net.send=function sendV106(event,payload){if(event==="world"&&net.isHost&&payload&&typeof payload==="object")payload={...payload,_v106Run:{floor:Number(run?.floor||1),deepest:Number(run?.deepest||run?.floor||1),difficulty:String(run?.difficulty||"ARCADE"),modifier:run?.modifier?{...run.modifier}:null,score:Math.max(0,Number(score||0)),seed:String(run?.seed||net.roomCode),enemyDefeats:(run?.enemyDefeats||[]).map(row=>({...row,killers:(row.killers||[]).map(k=>({...k})),floors:(row.floors||[]).map(f=>({...f}))}))}};return originalSend(event,payload)};
  if(typeof onWorld==="function"){const originalWorld=onWorld;onWorld=function onWorldV106(snapshot){if(snapshot?._v106Run&&!net.isHost&&run){const meta=snapshot._v106Run,floor=Math.max(1,Math.min(C.maxFloors,Number(meta.floor||1)));if(run.floor!==floor){run.floor=floor;run.deepest=Math.max(run.deepest||1,Number(meta.deepest||floor));run.difficulty=meta.difficulty||run.difficulty;run.modifier=meta.modifier?{...meta.modifier}:null;startWorld(PGR.floorSeed(run),false,true)}score=Math.max(0,Number(meta.score||0));if(Array.isArray(meta.enemyDefeats))run.enemyDefeats=meta.enemyDefeats.map(row=>({...row,killers:(row.killers||[]).map(k=>({...k})),floors:(row.floors||[]).map(f=>({...f}))}))}return originalWorld.apply(this,arguments)}}

  function capture(button,handler,key){if(!button||button.dataset[key])return;button.dataset[key]="true";button.addEventListener("click",event=>{event.preventDefault();event.stopImmediatePropagation();handler()},true)}
  capture(document.getElementById("create-btn"),()=>createLobbyRoom("dungeon"),"v106Create");capture(document.getElementById("horde-mode-btn"),()=>createLobbyRoom("horde-survivor"),"v106Horde");capture(document.getElementById("saboteurs-mode-btn"),()=>createLobbyRoom("sizzler-saboteurs"),"v106Saboteurs");capture(document.getElementById("join-btn"),joinLobbyRoom,"v106Join");capture(startButton,startHostedRun,"v106Start");
  capture(document.getElementById("lobby-cancel-btn"),async()=>{const wasHost=net.isHost;if(wasHost)try{await net.send("v106_lobby_cancel",{roomCode:net.roomCode})}catch(_){}await leaveLobby(wasHost?"Online room cancelled.":"You left the online room.")},"v106Cancel");
  capture(document.getElementById("lobby-copy-btn"),async()=>{try{await navigator.clipboard.writeText(invite.value);showToast("INVITE COPIED",`Room ${net.roomCode} invite copied.`,"green")}catch(_){invite.select();document.execCommand?.("copy")}},"v106Copy");
  capture(document.getElementById("lobby-share-btn"),async()=>{const data={title:"The Lost Sizzler online room",text:`Join ${net.getRoomMode?.().label||"The Lost Sizzler"} · room ${net.roomCode}`,url:invite.value};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(data.url);showToast("INVITE COPIED","Send the copied link to your players.","green")}}catch(_){}},"v106Share");

  createRoom=createLobbyRoom;joinRoom=joinLobbyRoom;setBuild();
  const params=new URLSearchParams(location.search),invited=clean(params.get("room")),invitedMode=modeDefinition(params.get("mode")||"dungeon");if(invited.length>=4&&UI.roomCode){UI.roomCode.value=invited;setNote(`Invite received for room ${invited}${params.get("mode")?` · ${invitedMode.label}`:""}. Enter your name and press Join Online Room. The host's live room mode will be verified when you connect.`)}
  setInterval(updateLobby,350);
  window.CCGLostSizzlerV106={createLobbyRoom,joinLobbyRoom,startHostedRun,leaveLobby,updateLobby,requestRoomState,isLobbyOpen:()=>lobbyOpen,isStartHandled:()=>startHandled,getLastStartMeta:()=>lastStartMeta};
})();