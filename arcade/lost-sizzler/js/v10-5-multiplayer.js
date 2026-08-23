/* The Lost Sizzler V10.5 — verified internet multiplayer room flow. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_MULTIPLAYER_V105__)return;
  window.__CCG_LOST_SIZZLER_MULTIPLAYER_V105__=true;

  let lastWorldSyncAt=0;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function setBuildLabels(){
    document.querySelectorAll(".build-badge").forEach(node=>{node.textContent="BUILD V10.5"});
    const subtitle=document.querySelector(".brand p");
    if(subtitle)subtitle.textContent="THE LOST SIZZLER — V10.5";
  }

  if(typeof net!=="undefined"&&net?.send){
    const originalSend=net.send.bind(net);
    net.send=function sendV105(event,payload){
      if(event==="world"&&net.isHost&&payload&&typeof payload==="object"){
        payload={...payload,_v105Run:{
          floor:Number(run?.floor||1),
          deepest:Number(run?.deepest||run?.floor||1),
          difficulty:String(run?.difficulty||"ARCADE"),
          modifier:run?.modifier?{...run.modifier}:null,
          score:Math.max(0,Number(score||0)),
          hostMode:String(mode||"playing")
        }};
      }
      return originalSend(event,payload);
    };
  }

  if(typeof onWorld==="function"){
    const originalOnWorld=onWorld;
    onWorld=function onWorldV105VerifiedSync(snapshot){
      if(snapshot&&typeof net!=="undefined"&&net&&!net.isHost&&snapshot._v105Run&&run){
        const meta=snapshot._v105Run;
        const hostFloor=Math.max(1,Math.min(C.maxFloors,Number(meta.floor||1)));
        const floorChanged=Number(run.floor||1)!==hostFloor;
        run.floor=hostFloor;
        run.deepest=Math.max(Number(run.deepest||1),Number(meta.deepest||hostFloor));
        if(meta.difficulty)run.difficulty=String(meta.difficulty);
        run.modifier=meta.modifier?{...meta.modifier}:null;
        if(floorChanged&&typeof startWorld==="function"){
          startWorld(PGR.floorSeed(run),false,true);
        }
      }
      const result=originalOnWorld.apply(this,arguments);
      if(snapshot&&typeof net!=="undefined"&&net&&!net.isHost){
        if(snapshot._v105Run&&Number.isFinite(Number(snapshot._v105Run.score)))score=Math.max(0,Number(snapshot._v105Run.score));
        lastWorldSyncAt=performance.now();
      }
      return result;
    };
  }

  function setMenuNote(text){if(UI?.note)UI.note.textContent=text}
  function setMenuVisible(visible){UI?.menu?.classList.toggle("hidden",!visible);setRunPresentation(!visible)}
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
  async function waitForAuthoritativeWorld(timeoutMs=5500){
    const start=performance.now();lastWorldSyncAt=0;
    await net.send("hello",{id:net.sessionId,name:playerName(),roomCode:net.roomCode,wantsWorld:true,build:"V10.5"});
    while(performance.now()-start<timeoutMs){if(lastWorldSyncAt>=start)return true;await sleep(100)}
    return false;
  }

  async function createVerifiedRoom(){
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
  }

  async function joinVerifiedRoom(){
    const audio=S.start(),fs=requestPlayFullscreen();await Promise.all([audio,fs]);
    const roomCode=window.CCGNetwork.cleanCode(UI.roomCode.value);
    if(roomCode.length<4){setMenuNote("Enter the room code from the host.");return}
    setMenuNote(`Finding room ${roomCode} and verifying its host…`);
    try{
      const joined=await net.joinExistingRoom(roomCode,playerName());
      if(joined.transport!=="supabase")throw new Error("This is not an internet Realtime room.");
      prepareOnlineRun(roomCode);mode="playing";setMenuVisible(false);S.startMusic();sync();
      const synced=await waitForAuthoritativeWorld();
      if(!synced)throw new Error("The room was found, but the host did not send the dungeon state. The host may have disconnected.");
      const members=net.getMembers();
      say(`<strong>JOINED ${esc(roomCode)}</strong> — ${members.length}/${C.maxPlayers} players connected.`,"cyan");
      showToast("ONLINE ROOM CONNECTED",`Host verified. ${members.length}/${C.maxPlayers} players are currently in room ${roomCode}.`,"green",8500);sync();
    }catch(error){await resetFailedOnline();onlineError("ONLINE ROOM JOIN FAILED",error)}
  }

  createRoom=createVerifiedRoom;
  joinRoom=joinVerifiedRoom;

  function bindVerifiedButtons(){
    const createButton=document.getElementById("create-btn");
    const joinButton=document.getElementById("join-btn");
    if(createButton&&!createButton.dataset.v105OnlineBound){
      createButton.dataset.v105OnlineBound="true";
      createButton.addEventListener("click",event=>{
        event.preventDefault();event.stopImmediatePropagation();createVerifiedRoom();
      },{capture:true});
    }
    if(joinButton&&!joinButton.dataset.v105OnlineBound){
      joinButton.dataset.v105OnlineBound="true";
      joinButton.addEventListener("click",event=>{
        event.preventDefault();event.stopImmediatePropagation();joinVerifiedRoom();
      },{capture:true});
    }
  }

  function updateOnlineBadge(){
    if(typeof net==="undefined"||!net)return;
    const chip=document.getElementById("v104-room-chip");
    if(!chip)return;
    let count=chip.querySelector(".v105-room-count");
    if(!count){count=document.createElement("small");count.className="v105-room-count";chip.appendChild(count)}
    if(playMode==="online"&&net.connected){const d=net.getDiagnostics?.();count.textContent=`${d?.memberCount||net.getMembers().length}/${C.maxPlayers} PLAYERS · INTERNET`}
    else count.textContent="";
  }

  setBuildLabels();bindVerifiedButtons();updateOnlineBadge();
  setInterval(updateOnlineBadge,350);
})();
