/* The Lost Sizzler V10.41 r40 — Dungeon Multiplayer Colyseus transport.
 *
 * This is intentionally a transport migration, not a rewrite of the mature
 * Dungeon simulation. The existing browser lobby host remains authoritative for
 * enemies, world mutations, puzzles, doors, shops and floor state. Once the
 * dedicated room is live, gameplay packets travel through Colyseus instead of
 * Supabase. Supabase stays connected for lobby/presence and becomes the gameplay
 * fallback immediately if the dedicated room disconnects.
 *
 * Solo, Tutorial, Split Screen, Weekly Vault, Horde and Spy never use this path.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R40_COLYSEUS_DUNGEON__)return;
  window.__CCG_LOST_SIZZLER_V141_R40_COLYSEUS_DUNGEON__=true;

  const DUNGEON="dungeon";
  const ENDPOINT="https://lost-sizzler-multiplayer.onrender.com";
  const SDK_URL="https://unpkg.com/@colyseus/sdk@0.18.2/dist/colyseus.js";
  const ACTIVE_TICK_MS=120,IDLE_TICK_MS=650,PING_MS=2500,ROLE_MS=1000,RETRY_MS=4500;
  const state={
    installed:false,timer:0,client:null,room:null,connecting:false,connected:false,transportLive:false,
    roomKey:"",reconnectAt:0,connectAttempts:0,lastPingAt:0,lastRoleAt:0,lastRoleSig:"",ping:0,status:"OFFLINE",lastError:"",
    sendWrapped:false,packetWrapped:false,deliveringColyseus:false,sent:0,received:0,suppressedSupabaseIncoming:0,fallbacks:0,
    hostActorId:"",playerCount:0,lastSequence:0
  };

  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const roomMode=()=>{try{return String(net?.getRoomMode?.()?.id||net?.roomMode||DUNGEON)}catch(_){return DUNGEON}};
  const isDungeonOnline=()=>{try{return playMode==="online"&&Boolean(net?.connected)&&roomMode()===DUNGEON&&!specialType()}catch(_){return false}};
  const actorId=()=>{try{return String(p1?.id||net?.sessionId||"P1")}catch(_){return"P1"}};
  const playerName=()=>{try{return String(p1?.name||net?.playerName||"Player")}catch(_){return"Player"}};
  const roomCode=()=>{try{return String(net?.roomCode||"").toUpperCase()}catch(_){return""}};
  const currentRoomKey=()=>`${roomCode()}|${actorId()}`;
  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};

  function injectStatus(){
    if(document.getElementById("dungeon-server-status"))return;
    const anchor=document.getElementById("net-status");if(!anchor?.parentElement)return;
    const badge=document.createElement("span");badge.id="dungeon-server-status";badge.className="status";badge.hidden=true;badge.title="Dedicated Lost Sizzler Dungeon transport";badge.style.cssText="border-color:#6cecff;color:#6cecff;white-space:nowrap";anchor.insertAdjacentElement("afterend",badge)
  }
  function updateStatus(text,tone="cyan"){
    injectStatus();const badge=document.getElementById("dungeon-server-status");if(!badge)return;badge.hidden=!isDungeonOnline();if(badge.hidden)return;badge.textContent=text;
    const colour=tone==="green"?"#72ff9b":tone==="red"?"#ff6868":tone==="gold"?"#ffd85a":"#6cecff";badge.style.color=colour;badge.style.borderColor=colour
  }

  function loadSdk(){
    if(window.Colyseus?.Client)return Promise.resolve(window.Colyseus);
    const existing=document.querySelector('script[data-ccg-colyseus-sdk="true"]');
    if(existing)return new Promise((resolve,reject)=>{const started=Date.now(),timer=setInterval(()=>{if(window.Colyseus?.Client){clearInterval(timer);resolve(window.Colyseus)}else if(Date.now()-started>20000){clearInterval(timer);reject(new Error("Colyseus browser SDK timed out"))}},80)});
    return new Promise((resolve,reject)=>{const script=document.createElement("script");script.src=SDK_URL;script.async=true;script.crossOrigin="anonymous";script.dataset.ccgColyseusSdk="true";script.onload=()=>window.Colyseus?.Client?resolve(window.Colyseus):reject(new Error("Colyseus SDK did not initialise"));script.onerror=()=>reject(new Error("Colyseus SDK could not be loaded"));document.head.appendChild(script)})
  }

  async function prewarm(){
    updateStatus("DUNGEON SERVER · WAKING","gold");const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),65000);
    try{
      const response=await fetch(`${ENDPOINT}/healthz`,{cache:"no-store",signal:controller.signal,mode:"cors"});
      if(!response.ok)throw new Error(`server health ${response.status}`);const body=await response.json().catch(()=>({}));
      if(body?.ok!==true)throw new Error("server health response invalid");return true
    }finally{clearTimeout(timeout)}
  }

  function deliver(event,payload,sequence=0){
    if(!isDungeonOnline())return false;const callback=net?.cb?.onPacket;if(typeof callback!=="function")return false;
    state.deliveringColyseus=true;try{state.received++;state.lastSequence=Math.max(state.lastSequence,Number(sequence)||0);callback(event,payload);return true}finally{state.deliveringColyseus=false}
  }

  function attachRoomHandlers(room){
    room.onMessage?.("game",message=>{if(!message?.event)return;deliver(String(message.event),message.payload,Number(message.sequence)||0)});
    room.onMessage?.("server_status",payload=>{
      if(payload?.mode!==DUNGEON||payload?.transport!=="colyseus")return;
      state.hostActorId=String(payload?.hostActorId||"");state.playerCount=Math.max(0,Number(payload?.playerCount)||0);
      if(!state.transportLive){
        state.transportLive=true;state.status="LIVE";document.body.dataset.dungeonTransport="colyseus";
        updateStatus("DUNGEON SERVER · LIVE","green");
        try{showToast?.("DUNGEON SERVER LIVE","Dungeon multiplayer gameplay packets are now travelling through the dedicated Colyseus server. Supabase remains available for lobby presence and fallback.","green",5200)}catch(_){}
      }
    });
    room.onMessage?.("pong",payload=>{const sent=Number(payload?.sentAt||0);if(sent)state.ping=Math.max(0,Math.round(Date.now()-sent));if(state.transportLive)updateStatus(`DUNGEON SERVER · ${state.ping}MS`,state.ping>180?"gold":"green")});
    if(typeof room.onError==="function")room.onError((code,message)=>{state.lastError=`${code}: ${message||"room error"}`;fallback("room error")});
    if(typeof room.onLeave==="function")room.onLeave(()=>fallback("server disconnected"))
  }

  async function connect(){
    if(state.connecting||state.connected||!isDungeonOnline())return false;
    const code=roomCode();if(!code)return false;
    state.connecting=true;state.connectAttempts++;state.status="CONNECTING";updateStatus("DUNGEON SERVER · CONNECTING","gold");
    try{
      await prewarm();const sdk=await loadSdk();if(!isDungeonOnline())throw new Error("Dungeon session ended while server was waking");
      const client=new sdk.Client(ENDPOINT);const room=await client.joinOrCreate("dungeon_v1",{roomCode:code,name:playerName(),actorId:actorId(),isLobbyHost:Boolean(net?.isHost)});
      state.client=client;state.room=room;state.connected=true;state.connecting=false;state.transportLive=false;state.status="SYNCING";state.reconnectAt=0;state.roomKey=currentRoomKey();
      attachRoomHandlers(room);room.send("role",{name:playerName(),isLobbyHost:Boolean(net?.isHost)});room.send("ping",{sentAt:Date.now()});updateStatus("DUNGEON SERVER · SYNCING","gold");return true
    }catch(error){
      state.connecting=false;state.connected=false;state.transportLive=false;state.room=null;state.client=null;state.lastError=String(error?.message||error);state.reconnectAt=Date.now()+RETRY_MS;state.status="FALLBACK";delete document.body.dataset.dungeonTransport;
      updateStatus("DUNGEON SERVER · SUPABASE FALLBACK","red");try{console.warn("[Lost Sizzler r40] Colyseus Dungeon connection failed; Supabase gameplay transport retained",error)}catch(_){}return false
    }
  }

  function fallback(reason="fallback"){
    const hadTransport=state.transportLive||state.connected;state.connected=false;state.transportLive=false;state.room=null;state.client=null;state.status="FALLBACK";state.reconnectAt=Date.now()+RETRY_MS;state.lastPingAt=0;state.lastRoleAt=0;state.lastRoleSig="";delete document.body.dataset.dungeonTransport;
    if(hadTransport)state.fallbacks++;updateStatus("DUNGEON SERVER · SUPABASE FALLBACK","red");
    try{console.warn(`[Lost Sizzler r40] ${reason}; Dungeon gameplay transport temporarily restored to Supabase`)}catch(_){}
  }

  async function disconnect(){
    const room=state.room;state.room=null;state.client=null;state.connected=false;state.transportLive=false;state.status="OFFLINE";state.lastPingAt=0;state.lastRoleAt=0;state.lastRoleSig="";state.hostActorId="";state.playerCount=0;delete document.body.dataset.dungeonTransport;
    try{await room?.leave?.()}catch(_){}
  }

  function wrapSend(){
    if(!net||typeof net.send!=="function")return false;const current=net.send;if(current.__ccgV141R40ColyseusDungeon){state.sendWrapped=true;return true}
    const wrapped=function sendV141R40ColyseusDungeon(event,payload){
      if(state.transportLive&&state.room&&isDungeonOnline()){
        state.sent++;try{state.room.send("game",{event:String(event||""),payload});return Promise.resolve("ok")}catch(error){state.lastError=String(error?.message||error);fallback("gameplay relay send failed")}
      }
      return current.apply(this,arguments)
    };
    wrapped.__ccgV141R40ColyseusDungeon=true;wrapped.__ccgOriginal=current;net.send=wrapped;state.sendWrapped=true;return true
  }

  function wrapPacketReceiver(){
    if(!net?.cb||typeof net.cb.onPacket!=="function")return false;const current=net.cb.onPacket;if(current.__ccgV141R40ColyseusDungeon){state.packetWrapped=true;return true}
    const wrapped=function packetV141R40ColyseusDungeon(event,payload){
      if(state.transportLive&&isDungeonOnline()&&!state.deliveringColyseus){state.suppressedSupabaseIncoming++;return false}
      return current.apply(this,arguments)
    };
    wrapped.__ccgV141R40ColyseusDungeon=true;wrapped.__ccgOriginal=current;net.cb.onPacket=wrapped;state.packetWrapped=true;return true
  }

  function sendRoleAndPing(t){
    if(!state.room)return;const roleSig=`${actorId()}|${playerName()}|${Boolean(net?.isHost)}`;
    if(roleSig!==state.lastRoleSig||t-state.lastRoleAt>=ROLE_MS){state.lastRoleSig=roleSig;state.lastRoleAt=t;state.room.send("role",{name:playerName(),isLobbyHost:Boolean(net?.isHost)})}
    if(t-state.lastPingAt>=PING_MS){state.lastPingAt=t;state.room.send("ping",{sentAt:Date.now()})}
  }

  function install(){wrapSend();wrapPacketReceiver();injectStatus();state.installed=true;document.body.dataset.v141R40ColyseusDungeon="true";return true}

  function tick(){
    install();
    if(!isDungeonOnline()){
      if(state.connected||state.connecting)disconnect();const badge=document.getElementById("dungeon-server-status");if(badge)badge.hidden=true;state.roomKey="";return
    }
    const key=currentRoomKey();if(state.roomKey&&state.roomKey!==key){disconnect();state.reconnectAt=0}
    if(!state.connected&&!state.connecting&&Date.now()>=state.reconnectAt){connect();return}
    if(state.room)sendRoleAndPing(perfNow())
  }

  function schedule(){state.timer=setTimeout(()=>{tick();schedule()},isDungeonOnline()?ACTIVE_TICK_MS:IDLE_TICK_MS)}

  install();schedule();addEventListener("pagehide",()=>{if(state.timer)clearTimeout(state.timer);state.timer=0;try{state.room?.leave?.()}catch(_){}},{once:true});
  window.CCGLostSizzlerV141R40ColyseusDungeon={ENDPOINT,SDK_URL,connect,disconnect,deliver,isDungeonOnline,getDiagnostics(){return{connected:state.connected,transportLive:state.transportLive,status:state.status,ping:state.ping,hostActorId:state.hostActorId,playerCount:state.playerCount,sent:state.sent,received:state.received,suppressedSupabaseIncoming:state.suppressedSupabaseIncoming,fallbacks:state.fallbacks,lastSequence:state.lastSequence,lastError:state.lastError}},get state(){return state}};
})();
