/* The Lost Sizzler V10.41 r32 — Spy action packet ownership seal.
 *
 * The r32 overhaul needs its action/result packets only while Spy Vs Spy is
 * active. Its original 50 ms maintenance loop also reinstalled that wrapper in
 * ordinary online lobbies, briefly displacing the normal multiplayer packet
 * callback and delaying room-start packets. This seal adopts r32 maintenance,
 * keeps the normal callback untouched outside Spy, and composes r32 beneath
 * the dedicated r29 Spy position owner while Spy is active.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R32_SPY_PACKET_OWNER__)return;
  window.__CCG_LOST_SIZZLER_V141_R32_SPY_PACKET_OWNER__=true;

  const MODE_ID="sizzler-saboteurs",MONITOR_MS=20,FRAME_MS=1000/60,LOCAL_VISUAL_ALPHA=.32,REMOTE_VISUAL_ALPHA=.28,MAX_VISUAL_GAP=4.25;
  const state={timer:0,adopted:false,r32Packet:null,normalBase:null,spyCompositions:0,normalRestores:0,stableEnterSeals:0,visualSmoothingSeals:0,visualFrames:0,visualStepRestores:0,lastMode:false};

  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID}catch(_){return false}};
  const overhaul=()=>{try{return window.CCGLostSizzlerV141R32SpyOverhaul||null}catch(_){return null}};
  const spyNetwork=()=>{try{return window.CCGLostSizzlerV141R29SpyNetwork||null}catch(_){return null}};
  const spyEngine=()=>{try{return window.CCGLostSizzlerV141R29SpyEngine||null}catch(_){return null}};
  const localPlayer=()=>{try{return p1||null}catch(_){return null}};
  const modelFor=id=>{try{return window.CCGLostSizzlerSpecialModes?.active?.state?.players?.find?.(row=>String(row?.id||"")===String(id||""))||null}catch(_){return null}};

  function usableNormal(fn){return typeof fn==="function"&&!fn.__ccgV141R32SpyPacket&&!fn.__ccgV141R29SpyNetworkOwner}

  function capture(){
    const api=overhaul();if(!api||!net?.cb)return false;
    const current=net.cb.onPacket,base=api.state?.packetBase;
    if(current?.__ccgV141R32SpyPacket)state.r32Packet=current;
    if(usableNormal(base))state.normalBase=base;
    if(!state.normalBase&&usableNormal(current))state.normalBase=current;
    return Boolean(state.r32Packet&&state.normalBase)
  }

  function sealStableEnter(){
    const api=overhaul(),engine=spyEngine(),base=api?.state?.engineBaseEnter;
    if(!api||!engine||typeof base!=="function")return false;
    const current=engine.enterIsolation;
    if(current?.__ccgV141R32SpyStableEnter)return true;
    if(!current?.__ccgV141R32SpyEnter)return false;
    const wrapped=function enterSpyR32Stable(){
      const result=base.apply(this,arguments);
      if(spyActive())api.buildOverhaulWorld?.(false);
      return result
    };
    wrapped.__ccgV141R32SpyEnter=true;wrapped.__ccgV141R32SpyStableEnter=true;wrapped.__ccgOriginal=base;
    engine.enterIsolation=wrapped;state.stableEnterSeals++;return true
  }

  function frameAlpha(base,dt){
    const elapsed=Math.max(1,Math.min(50,Number(dt)||FRAME_MS));
    return 1-Math.pow(1-base,elapsed/FRAME_MS)
  }

  function smoothVisualPlayer(player,alpha){
    if(!player)return false;
    const x=Number(player.x),y=Number(player.y);if(!Number.isFinite(x)||!Number.isFinite(y))return false;
    let rx=Number(player.rx),ry=Number(player.ry);
    if(!Number.isFinite(rx)||!Number.isFinite(ry)){player.rx=x;player.ry=y;return true}
    const gap=Math.abs(x-rx)+Math.abs(y-ry);
    if(gap>MAX_VISUAL_GAP){player.rx=x;player.ry=y;return true}
    rx+=((x-rx)*alpha);ry+=((y-ry)*alpha);
    player.rx=Math.abs(x-rx)<.001?x:rx;player.ry=Math.abs(y-ry)<.001?y:ry;return true
  }

  function smoothVisualPositions(dt){
    if(!spyActive())return false;
    const localAlpha=frameAlpha(LOCAL_VISUAL_ALPHA,dt),remoteAlpha=frameAlpha(REMOTE_VISUAL_ALPHA,dt),local=localPlayer();
    smoothVisualPlayer(local,localAlpha);
    try{for(const player of remote?.values?.()||[])smoothVisualPlayer(player,remoteAlpha)}catch(_){}
    state.visualFrames++;return true
  }

  function localVisualSnapshot(api){
    const player=localPlayer();if(!player)return null;
    const model=modelFor(player.id);
    return{player,x:Number(player.x),y:Number(player.y),rx:Number(player.rx),ry:Number(player.ry),status:String(model?.status||""),worldBuilds:Number(api?.state?.worldBuilds||0)}
  }

  function restoreSteppedVisual(snapshot,api){
    const player=snapshot?.player;if(!player||snapshot.status!=="active"||Number(api?.state?.worldBuilds||0)!==snapshot.worldBuilds)return false;
    if(String(modelFor(player.id)?.status||"")!=="active")return false;
    const x=Number(player.x),y=Number(player.y),delta=Math.abs(x-snapshot.x)+Math.abs(y-snapshot.y);
    if(!(delta>0&&delta<=4.01)||!Number.isFinite(snapshot.rx)||!Number.isFinite(snapshot.ry))return false;
    player.rx=snapshot.rx;player.ry=snapshot.ry;state.visualStepRestores++;return true
  }

  function sealVisualSmoothing(){
    const api=overhaul(),engine=spyEngine(),base=api?.overhaulUpdate;
    if(!api||!engine||typeof base!=="function")return false;
    if(engine.isolatedUpdate?.__ccgV141R32SpyVisualSmoothing)return true;
    if(engine.isolatedUpdate!==base&&!engine.isolatedUpdate?.__ccgV141R32SpyOverhaul)return false;
    const wrapped=function isolatedUpdateR32VisualSmoothing(dt){
      const before=localVisualSnapshot(api),result=base.apply(this,arguments);
      if(spyActive()){restoreSteppedVisual(before,api);smoothVisualPositions(dt)}
      return result
    };
    wrapped.__ccgV141R32SpyOverhaul=true;wrapped.__ccgV141R32SpyVisualSmoothing=true;
    // The retained post-playtest monitor predates r32 and otherwise wraps the
    // Spy update again every 40 ms. Advertising its compatibility marker makes
    // that older owner yield while r32 remains the single final smoothing path.
    wrapped.__ccgV141PostPlaytestSpySmooth=true;wrapped.__ccgOriginal=base;
    engine.isolatedUpdate=wrapped;state.visualSmoothingSeals++;return true
  }

  function adoptR32Maintenance(){
    const api=overhaul();if(!api?.state)return false;
    capture();
    if(!state.adopted){
      if(api.state.timer){clearInterval(api.state.timer);api.state.timer=0}
      state.adopted=true;
    }
    const engine=spyEngine();if(!engine?.isolatedUpdate?.__ccgV141R32SpyVisualSmoothing)api.patchEngine?.();
    sealStableEnter();sealVisualSmoothing();return true
  }

  function restoreNormal(){
    const api=overhaul(),network=spyNetwork();if(!api||!net?.cb)return false;capture();
    if(net.cb.onPacket?.__ccgV141R29SpyNetworkOwner)try{network?.restore?.()}catch(_){}
    capture();
    if(state.normalBase&&net.cb.onPacket!==state.normalBase){net.cb.onPacket=state.normalBase;state.normalRestores++}
    if(api.state){api.state.packetInstalled=false;api.state.packetBase=state.normalBase||api.state.packetBase}
    if(state.lastMode){
      api.setInventory?.(false);api.state.search=null;api.state.worldKey="";api.state.round=0;api.state.lastRoomByPlayer?.clear?.();api.state.lastMode="";
      const label=document.getElementById("spy-r32-room-label");if(label)label.textContent="";
    }
    state.lastMode=false;return true
  }

  function composeSpy(){
    const api=overhaul(),network=spyNetwork();if(!api||!net?.cb)return false;capture();if(!state.r32Packet)return false;
    const current=net.cb.onPacket;
    if(usableNormal(current))state.normalBase=current;
    if(api.state&&state.normalBase)api.state.packetBase=state.normalBase;
    if(current?.__ccgV141R29SpyNetworkOwner){
      if(network?.state)network.state.basePacket=state.r32Packet;
    }else if(current!==state.r32Packet){
      net.cb.onPacket=state.r32Packet;
    }
    if(api.state)api.state.packetInstalled=true;
    if(!state.lastMode){
      api.buildOverhaulWorld?.(true);api.renderInventory?.();api.state.lastMode=MODE_ID;state.spyCompositions++
    }
    state.lastMode=true;return true
  }

  function monitor(){
    if(!adoptR32Maintenance())return;
    if(spyActive())composeSpy();else restoreNormal()
  }

  monitor();state.timer=setInterval(()=>{try{monitor()}catch(error){console.warn("[Lost Sizzler r32] Spy packet-owner monitor failed safely",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0;try{restoreNormal()}catch(_){}},{once:true});

  window.CCGLostSizzlerV141R32SpyPacketOwner={capture,sealStableEnter,sealVisualSmoothing,smoothVisualPositions,adoptR32Maintenance,composeSpy,restoreNormal,get state(){return state}};
})();