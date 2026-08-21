/* The Lost Sizzler V10.5 — verified internet multiplayer room flow. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_MULTIPLAYER_V105__)return;
  window.__CCG_LOST_SIZZLER_MULTIPLAYER_V105__=true;

  let lastWorldSyncAt=0;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  if(typeof onWorld==="function"){
    const originalOnWorld=onWorld;
    onWorld=function onWorldV105VerifiedSync(snapshot){
      const result=originalOnWorld.apply(this,arguments);
      if(snapshot&&typeof net!=="undefined"&&net&&!net.isHost)lastWorldSyncAt=performance.now();
      return result;
    };
  }

  function setMenuNote(text){if(UI?.note)UI.note.textContent=text}
  function setMenuVisible(visible){UI?.menu?.classList.toggle("hidden",!visible)}
  function onlineError(title,error){
    const message=String(error?.message||error||"Online multiplayer could not connect.");
    setMenuNote(message);
    try{showToast(title,message,"red",10000)}catch(_){}
  }
  async function resetFailedOnline(){
    try{await net?.leave?.()}catch(_){}
    playMode="solo";mode="menu";setMenuVisible(true);
  }
  function prepareOnlineRun(roomCode){
    run=PGR.makeRun({difficulty:UI.difficulty?.value||"ARCADE",seed:roomCode});
    run.modifier=PGR.chooseFloorModifier(run,Math.random);
    playMode="online";
    startWorld(PGR.floorSeed(run),false,false);
  }
  async function waitForAuthoritativeWorld(timeoutMs=5000){
    const start=performance.now();lastWorldSyncAt=0;
    await net.send("hello",{id:net.sessionId,name:playerName(),roomCode:net.roomCode,wantsWorld:true,build:"V10.5"});
    while(performance.now()-start<timeoutMs){if(lastWorldSyncAt>=start)return true;await sleep(100)}
    return false;
  }

  createRoom=async function createRoomV105(){
    const audio=S.start(),fs=requestPlayFullscreen();await Promise.all([audio,fs]);
    setMenuNote("Creating verified internet room…");
    let created=null,roomCode="";
    try{
      for(let attempt=0;attempt<4&&!created;attempt++){
        roomCode=net.createCode();
        try{created=await net.createOnlineRoom(roomCode,playerName())}
        catch(error){if(!/already in use/i.test(String(error?.message||"")))throw error}
      }
      if(!created)throw new Error("Could not allocate an unused room code. Please try again.");
      prepareOnlineRun(roomCode);mode="playing";UI.roomCode.value=roomCode;setMenuVisible(false);S.startMusic();
      say(`<strong>ROOM ${esc(roomCode)}</strong> ONLINE. Share this code with up to three other players.`,"cyan");
      showToast("ONLINE ROOM CREATED",`ROOM ${roomCode} — waiting for players. Maximum 4 players.`,"green",9000);
      broadcastWorld();sync();
    }catch(error){await resetFailedOnline();onlineError("ONLINE ROOM NOT CREATED",error)}
  };

  joinRoom=async function joinRoomV105(){
    const audio=S.start(),fs=requestPlayFullscreen();await Promise.all([audio,fs]);
    const roomCode=window.CCGNetwork.cleanCode(UI.roomCode.value);
    if(roomCode.length<4){setMenuNote("Enter the room code from the host.");return}
    setMenuNote(`Finding room ${roomCode} and verifying its host…`);
    try{
      const joined=await net.joinExistingRoom(roomCode,playerName());
      if(joined.transport!=="supabase")throw new Error("This is not an internet Realtime room.");
      prepareOnlineRun(roomCode);mode="playing";setMenuVisible(false);S.startMusic();sync();
      const synced=await waitForAuthoritativeWorld(5000);
      if(!synced)throw new Error("The room was found, but the host did not send the dungeon state. The host may have disconnected.");
      const members=net.getMembers();
      say(`<strong>JOINED ${esc(roomCode)}</strong> — ${members.length}/${C.maxPlayers} players connected.`,"cyan");
      showToast("ONLINE ROOM CONNECTED",`Host verified. ${members.length}/${C.maxPlayers} players are currently in room ${roomCode}.`,"green",8500);sync();
    }catch(error){await resetFailedOnline();onlineError("ONLINE ROOM JOIN FAILED",error)}
  };

  function updateOnlineBadge(){
    if(typeof net==="undefined"||!net)return;
    const chip=document.getElementById("v104-room-chip");
    if(!chip)return;
    let count=chip.querySelector(".v105-room-count");
    if(!count){count=document.createElement("small");count.className="v105-room-count";chip.appendChild(count)}
    if(playMode==="online"&&net.connected){const d=net.getDiagnostics?.();count.textContent=`${d?.memberCount||net.getMembers().length}/${C.maxPlayers} PLAYERS · INTERNET`}
    else count.textContent="";
  }
  setInterval(updateOnlineBadge,350);updateOnlineBadge();
})();
