/* The Lost Sizzler V10.41 r50 — multiplayer recovery and rejoin UX.
 *
 * This layer does not reconnect sockets, own gameplay packets or change host/
 * server authority. R38/R40/R41 and the canonical RoomNetwork keep that job.
 * R50 makes their existing recovery state understandable to the player and
 * provides a safe route back to the online menu with the room code preserved.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R50_MULTIPLAYER_RECOVERY_UX__)return;
  window.__CCG_LOST_SIZZLER_V141_R50_MULTIPLAYER_RECOVERY_UX__=true;

  const POLL_MS=300,HARD_LOSS_MS=8000;
  const state={timer:0,lastMode:"",lastStatus:"",lastMemberSig:"",lastMemberCount:0,lastConnected:null,lossSince:0,lastRoomCode:"",lastRoomMode:"",banner:null,returnBtn:null,endBtn:null,statusChanges:0,memberJoins:0,memberLeaves:0,recoveries:0};
  const safe=v=>String(v??"").trim();
  const online=()=>{try{return safe(playMode)==="online"&&document.body?.dataset?.runActive==="true"}catch(_){return false}};
  const roomCode=()=>{try{return safe(net?.roomCode||state.lastRoomCode).toUpperCase()}catch(_){return state.lastRoomCode}};
  const roomMode=()=>{try{return safe(net?.getRoomMode?.()?.id||net?.roomMode||state.lastRoomMode||"dungeon")}catch(_){return state.lastRoomMode||"dungeon"}};
  const members=()=>{try{return net?.getMembers?.()||[]}catch(_){return[]}};

  function transportApi(mode=roomMode()){
    if(mode==="horde-survivor")return window.CCGLostSizzlerV141R38ColyseusHorde||null;
    if(mode==="sizzler-saboteurs")return window.CCGLostSizzlerV141R41ColyseusSpy||null;
    return window.CCGLostSizzlerV141R40ColyseusDungeon||null
  }
  function diagnostics(mode=roomMode()){
    const api=transportApi(mode);try{return api?.getDiagnostics?.()||api?.state||null}catch(_){return null}
  }
  function transportStatus(mode=roomMode()){
    const d=diagnostics(mode),raw=safe(d?.status).toUpperCase();
    if(raw)return raw;
    try{if(mode==="horde-survivor"&&d?.authorityLive)return"LIVE";if(d?.transportLive)return"LIVE";if(d?.connected)return"SYNCING"}catch(_){}
    return"CONNECTING"
  }
  function modeLabel(mode=roomMode()){
    return mode==="horde-survivor"?"Horde":mode==="sizzler-saboteurs"?"Spy Vs Spy":"Dungeon"
  }

  function ensureStyles(){
    if(document.getElementById("ccg-r50-styles"))return;
    const style=document.createElement("style");style.id="ccg-r50-styles";style.textContent=`
      .ccg-r50-recovery{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:8px 0;padding:9px 12px;border:1px solid #ffd85a;background:rgba(22,15,3,.92);color:#ffeaa0;font-size:11px;line-height:1.35;box-shadow:0 0 18px rgba(255,216,90,.08)}
      .ccg-r50-recovery.hidden{display:none!important}.ccg-r50-recovery[data-tone="red"]{border-color:#ff6868;background:rgba(28,4,8,.94);color:#ffb0b0}.ccg-r50-recovery[data-tone="green"]{border-color:#72ff9b;background:rgba(3,24,12,.92);color:#b7ffc9}.ccg-r50-recovery strong{display:block;color:#fff;font-size:12px;letter-spacing:.5px}.ccg-r50-recovery button{flex:0 0 auto;padding:7px 10px;font-size:10px}
      #ccg-r50-online-return{margin-top:9px;width:100%}
      @media(max-width:700px){.ccg-r50-recovery{align-items:stretch;flex-direction:column}.ccg-r50-recovery button{width:100%}}
    `;document.head.appendChild(style)
  }
  function ensureBanner(){
    if(state.banner?.isConnected)return state.banner;ensureStyles();
    let node=document.getElementById("ccg-r50-recovery");
    if(!node){node=document.createElement("div");node.id="ccg-r50-recovery";node.className="ccg-r50-recovery hidden";node.setAttribute("role","status");node.setAttribute("aria-live","polite");node.innerHTML='<div><strong data-title>MULTIPLAYER RECOVERY</strong><span data-copy></span></div><button type="button" class="hidden" data-return>Return to Online Menu</button>';const mission=document.querySelector(".mission");mission?.insertAdjacentElement("afterend",node)}
    state.banner=node;state.returnBtn=node?.querySelector("[data-return]")||null;state.returnBtn?.addEventListener("click",returnToOnlineMenu);return node
  }
  function setBanner(title,copy,tone="gold",showReturn=false){
    const node=ensureBanner();if(!node)return;node.classList.remove("hidden");node.dataset.tone=tone;node.querySelector("[data-title]").textContent=title;node.querySelector("[data-copy]").textContent=copy;state.returnBtn?.classList.toggle("hidden",!showReturn)
  }
  function hideBanner(){state.banner?.classList.add("hidden");state.returnBtn?.classList.add("hidden")}

  function preserveRoom(){const code=roomCode(),mode=roomMode();if(code)state.lastRoomCode=code;if(mode)state.lastRoomMode=mode}
  async function returnToOnlineMenu(){
    preserveRoom();const code=state.lastRoomCode;
    try{await Promise.resolve(quitToMenu?.())}catch(_){try{document.getElementById("again-btn")?.click?.()}catch(__){}}
    setTimeout(()=>{
      const input=document.getElementById("room-code");if(input&&code){input.value=code;input.dispatchEvent(new Event("input",{bubbles:true}))}
      document.getElementById("join-btn")?.focus?.({preventScroll:true});
      try{showToast?.("ONLINE ROOM READY",code?`Room ${code} is ready to rejoin. Press Join Online Room when you are ready.`:"Choose an online mode or enter a room code to continue.","cyan",6500)}catch(_){}
    },80)
  }

  function ensureEndAction(){
    const end=document.getElementById("end"),again=document.getElementById("again-btn");if(!end||!again)return null;
    let btn=document.getElementById("ccg-r50-online-return");if(!btn){btn=document.createElement("button");btn.id="ccg-r50-online-return";btn.type="button";btn.textContent="Return to Online Menu";btn.className="hidden";again.insertAdjacentElement("beforebegin",btn);btn.addEventListener("click",returnToOnlineMenu)}state.endBtn=btn;return btn
  }
  function updateEndAction(){const btn=ensureEndAction();if(!btn)return;const visible=!document.getElementById("end")?.classList.contains("hidden")&&Boolean(state.lastRoomCode);btn.classList.toggle("hidden",!visible);if(visible)btn.textContent=state.lastRoomCode?`Return to Online Menu · Room ${state.lastRoomCode}`:"Return to Online Menu"}

  function notifyMembers(){
    if(!online())return;const rows=members(),sig=rows.map(row=>safe(row?.id)).filter(Boolean).sort().join("|");if(!state.lastMemberSig){state.lastMemberSig=sig;state.lastMemberCount=rows.length;return}
    if(sig===state.lastMemberSig)return;
    const before=new Set(state.lastMemberSig.split("|").filter(Boolean)),after=new Set(sig.split("|").filter(Boolean)),joined=[...after].filter(id=>!before.has(id)),left=[...before].filter(id=>!after.has(id));
    if(joined.length){state.memberJoins+=joined.length;try{showToast?.("PLAYER CONNECTED",`${joined.length===1?"A player has":"Players have"} joined the online room.`,"green",3600)}catch(_){}}
    if(left.length){state.memberLeaves+=left.length;try{showToast?.("PLAYER DISCONNECTED",`${left.length===1?"A player has":"Players have"} left the online room. The remaining session will continue where possible.`,"gold",5200)}catch(_){}}
    state.lastMemberSig=sig;state.lastMemberCount=rows.length
  }

  function updateRecovery(){
    if(!online()){hideBanner();state.lossSince=0;state.lastStatus="";state.lastConnected=null;state.lastMemberSig="";updateEndAction();return}
    preserveRoom();notifyMembers();const mode=roomMode(),label=modeLabel(mode),status=transportStatus(mode),netLive=Boolean(net?.connected);if(status!==state.lastStatus){state.statusChanges++;state.lastStatus=status}
    const healthy=status==="LIVE"||status==="CONNECTED";
    if(netLive&&healthy){
      if(state.lossSince){state.recoveries++;try{showToast?.("MULTIPLAYER RECOVERED",`${label} connection is live again.`,"green",4200)}catch(_){}}
      state.lossSince=0;hideBanner()
    }else{
      if(!state.lossSince)state.lossSince=Date.now();const hard=Date.now()-state.lossSince>=HARD_LOSS_MS;
      if(!netLive)setBanner(`${label.toUpperCase()} ROOM CONNECTION LOST`,`The room connection is unavailable. Existing recovery systems are still trying where possible.`,"red",hard);
      else if(status==="FALLBACK")setBanner(`${label.toUpperCase()} SERVER RECONNECTING`,`Gameplay is using the safe fallback transport while the dedicated server reconnects. You can keep playing.`,"gold",hard);
      else setBanner(`${label.toUpperCase()} SERVER CONNECTING`,`The dedicated multiplayer server is connecting or synchronising. The game will switch over automatically when ready.`,"gold",hard)
    }
    state.lastConnected=netLive;updateEndAction()
  }

  function tick(){try{updateRecovery()}catch(error){try{console.warn("[Lost Sizzler r50] recovery UX tick failed",error)}catch(_){}}}
  ensureStyles();ensureBanner();ensureEndAction();tick();state.timer=setInterval(tick,POLL_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});
  document.body.dataset.v141R50MultiplayerRecovery="true";
  window.CCGLostSizzlerV141R50MultiplayerRecoveryUX={transportStatus,returnToOnlineMenu,updateRecovery,preserveRoom,get state(){return state}};
})();
