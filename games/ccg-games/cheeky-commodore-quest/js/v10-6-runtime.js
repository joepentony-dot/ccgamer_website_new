/* The Lost Sizzler V10.6 — host-controlled lobby and authoritative start flow. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_RUNTIME_V106__)return;
  window.__CCG_LOST_SIZZLER_RUNTIME_V106__=true;

  const lobby=document.getElementById("online-lobby"),roomLabel=document.getElementById("lobby-room-code"),status=document.getElementById("lobby-status"),invite=document.getElementById("lobby-invite-url"),list=document.getElementById("lobby-player-list"),startButton=document.getElementById("lobby-start-btn");
  let lobbyOpen=false,startHandled=false;
  const clean=value=>window.CCGNetwork.cleanCode(value);
  const setNote=text=>{if(UI?.note)UI.note.textContent=text};
  const inviteFor=code=>{const url=new URL(location.href);url.searchParams.set("room",code);url.hash="";return url.toString()};

  function setBuild(){document.querySelectorAll(".build-badge").forEach(n=>n.textContent="BUILD V10.6");const p=document.querySelector(".brand p");if(p)p.textContent="THE LOST SIZZLER — V10.6"}
  function showLobby(){lobbyOpen=true;mode="lobby";playMode="online";setRunPresentation(false);UI.menu?.classList.add("hidden");lobby?.classList.remove("hidden");updateLobby()}
  function hideLobby(){lobbyOpen=false;lobby?.classList.add("hidden")}
  function updateLobby(){
    if(!lobbyOpen||!net)return;const members=net.getMembers(),code=net.roomCode||clean(UI.roomCode?.value);
    if(roomLabel)roomLabel.textContent=code||"-----";if(status)status.textContent=`${members.length}/${C.maxPlayers} players connected${net.isHost?" · YOU ARE HOST":" · WAITING FOR HOST"}`;if(invite)invite.value=code?inviteFor(code):"";
    if(list)list.innerHTML=members.map((member,index)=>`<li class="${index===0?"host":""}">${esc(member.name||"Player")}${index===0?" — HOST":""}${member.id===net.sessionId?" — YOU":""}</li>`).join("")||"<li>Connecting…</li>";
    if(startButton){startButton.disabled=!net.isHost;startButton.textContent=net.isHost?"Start Dungeon":"Waiting for Host"}
    const chip=document.getElementById("v104-room-chip");if(chip)chip.textContent=playMode==="online"&&net.connected?`ROOM ${code} · ${members.length}/${C.maxPlayers}`:"";
  }
  function onlineError(title,error){const message=String(error?.message||error||"Online multiplayer could not connect.");setNote(message);try{showToast(title,message,"red",10000)}catch(_){}}
  async function leaveLobby(message="Online lobby closed."){
    try{await net.leave()}catch(_){}hideLobby();playMode="solo";mode="menu";setRunPresentation(false);net.setSolo(playerName());UI.menu?.classList.remove("hidden");setNote(message);sync?.()
  }
  function runMeta(){return{roomCode:net.roomCode,seed:net.roomCode,floor:1,difficulty:UI.difficulty?.value||"ARCADE",modifier:null,startedAt:Date.now(),build:"V10.6"}}
  function prepareRun(meta={}){
    run=PGR.makeRun({difficulty:meta.difficulty||UI.difficulty?.value||"ARCADE",seed:meta.seed||net.roomCode});run.floor=Math.max(1,Number(meta.floor||1));run.deepest=run.floor;run.modifier=meta.modifier?{...meta.modifier}:PGR.chooseFloorModifier(run,Math.random);playMode="online";startWorld(PGR.floorSeed(run),false,false);mode="playing";setRunPresentation(true);hideLobby();UI.menu?.classList.add("hidden");S.start();S.startMusic();sync()
  }
  async function createLobbyRoom(){
    setNote("Creating verified internet room…");let created=null,code="";
    try{for(let attempt=0;attempt<4&&!created;attempt++){code=net.createCode();try{created=await net.createOnlineRoom(code,playerName())}catch(error){if(!/already in use/i.test(String(error?.message||"")))throw error}}if(!created)throw new Error("Could not allocate an unused room code. Please try again.");UI.roomCode.value=code;startHandled=false;showLobby();showToast("ONLINE ROOM READY",`Share the invite for room ${code}. The dungeon will not begin until you press Start Dungeon.`,"green",9000)}catch(error){await leaveLobby(String(error?.message||error));onlineError("ONLINE ROOM NOT CREATED",error)}
  }
  async function joinLobbyRoom(){
    const code=clean(UI.roomCode?.value);if(code.length<4){setNote("Enter the room code from the host.");return}S.start();setNote(`Finding room ${code}…`);
    try{const joined=await net.joinExistingRoom(code,playerName());if(joined.transport!=="supabase")throw new Error("This is not a verified internet room.");UI.roomCode.value=code;startHandled=false;showLobby();showToast("ONLINE ROOM JOINED",`Room ${code} is waiting for its host to start.`,"green",8000)}catch(error){await leaveLobby(String(error?.message||error));onlineError("ONLINE ROOM JOIN FAILED",error)}
  }
  function startHostedRun(){
    if(!lobbyOpen||!net.isHost||startHandled)return;startHandled=true;requestPlayFullscreen();const meta=runMeta();prepareRun(meta);net.send("v106_lobby_start",meta);setTimeout(()=>broadcastWorld(),60);showToast("ONLINE DUNGEON STARTED",`${net.getMembers().length}/${C.maxPlayers} players entered room ${net.roomCode}.`,"green",7500)
  }
  function receiveStart(meta){if(net.isHost||startHandled)return;startHandled=true;requestPlayFullscreen();prepareRun(meta);net.send("hello",{id:net.sessionId,name:playerName(),roomCode:net.roomCode,wantsWorld:true,build:"V10.6"});showToast("HOST STARTED THE DUNGEON",`Room ${net.roomCode} is live.`,"green",7000)}

  const originalMembers=net.cb.onMembers;
  net.cb.onMembers=function onMembersV106(members,isHost,changed){const result=originalMembers?.(members,isHost,changed);updateLobby();if(changed&&isHost&&lobbyOpen)showToast("YOU ARE NOW HOST","The previous host disconnected. You can start the dungeon when everyone is ready.","cyan",8500);return result};
  const originalPacket=net.cb.onPacket;
  net.cb.onPacket=function onPacketV106(event,payload){if(event==="v106_lobby_start"){receiveStart(payload||{});return}if(event==="v106_lobby_cancel"){leaveLobby("The host cancelled the online lobby.");return}return originalPacket?.(event,payload)};
  const originalSend=net.send.bind(net);
  net.send=function sendV106(event,payload){if(event==="world"&&net.isHost&&payload&&typeof payload==="object")payload={...payload,_v106Run:{floor:Number(run?.floor||1),deepest:Number(run?.deepest||run?.floor||1),difficulty:String(run?.difficulty||"ARCADE"),modifier:run?.modifier?{...run.modifier}:null,score:Math.max(0,Number(score||0)),seed:String(run?.seed||net.roomCode),enemyDefeats:(run?.enemyDefeats||[]).map(row=>({...row,killers:(row.killers||[]).map(k=>({...k})),floors:(row.floors||[]).map(f=>({...f}))}))}};return originalSend(event,payload)};
  if(typeof onWorld==="function"){const originalWorld=onWorld;onWorld=function onWorldV106(snapshot){if(snapshot?._v106Run&&!net.isHost&&run){const meta=snapshot._v106Run,floor=Math.max(1,Math.min(C.maxFloors,Number(meta.floor||1)));if(run.floor!==floor){run.floor=floor;run.deepest=Math.max(run.deepest||1,Number(meta.deepest||floor));run.difficulty=meta.difficulty||run.difficulty;run.modifier=meta.modifier?{...meta.modifier}:null;startWorld(PGR.floorSeed(run),false,true)}score=Math.max(0,Number(meta.score||0));if(Array.isArray(meta.enemyDefeats))run.enemyDefeats=meta.enemyDefeats.map(row=>({...row,killers:(row.killers||[]).map(k=>({...k})),floors:(row.floors||[]).map(f=>({...f}))}))}return originalWorld.apply(this,arguments)}}

  function capture(button,handler,key){if(!button||button.dataset[key])return;button.dataset[key]="true";button.addEventListener("click",event=>{event.preventDefault();event.stopImmediatePropagation();handler()},true)}
  capture(document.getElementById("create-btn"),createLobbyRoom,"v106Create");capture(document.getElementById("join-btn"),joinLobbyRoom,"v106Join");capture(startButton,startHostedRun,"v106Start");
  capture(document.getElementById("lobby-cancel-btn"),async()=>{const wasHost=net.isHost;if(wasHost)try{await net.send("v106_lobby_cancel",{roomCode:net.roomCode})}catch(_){}await leaveLobby(wasHost?"Online room cancelled.":"You left the online room.")},"v106Cancel");
  capture(document.getElementById("lobby-copy-btn"),async()=>{try{await navigator.clipboard.writeText(invite.value);showToast("INVITE COPIED",`Room ${net.roomCode} invite copied.`,"green")}catch(_){invite.select();document.execCommand?.("copy")}},"v106Copy");
  capture(document.getElementById("lobby-share-btn"),async()=>{const data={title:"The Lost Sizzler online room",text:`Join room ${net.roomCode}`,url:invite.value};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(data.url);showToast("INVITE COPIED","Send the copied link to your players.","green")}}catch(_){}},"v106Share");

  createRoom=createLobbyRoom;joinRoom=joinLobbyRoom;setBuild();
  const invited=clean(new URLSearchParams(location.search).get("room"));if(invited.length>=4&&UI.roomCode){UI.roomCode.value=invited;setNote(`Invite received for room ${invited}. Enter your name and press Join Online Room.`)}
  setInterval(updateLobby,350);
  window.CCGLostSizzlerV106={createLobbyRoom,joinLobbyRoom,startHostedRun,leaveLobby,updateLobby,isLobbyOpen:()=>lobbyOpen};
})();
