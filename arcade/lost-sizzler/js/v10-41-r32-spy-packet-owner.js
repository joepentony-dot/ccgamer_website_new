/* The Lost Sizzler V10.41 r32/r33 — final Spy ownership seal.
 *
 * r32 keeps Spy action/result packets isolated from ordinary multiplayer and
 * owns the final visual interpolation path. r33 adds the classic Spy Vs Spy
 * presentation/interaction contract without reopening Dungeon ownership:
 * - simultaneous Player 1 / Player 2 split views when both live agents exist
 * - compact Trapulator-style panels with a rooms-only reference map
 * - a fixed, understandable three-trap loadout and victim-effect descriptions
 * - TAB inventory isolation so the shared Dungeon inventory cannot strand Spy
 *   in mode="inventory"
 * - guest/host searched-furniture reconciliation
 * - account-aware rating prompt suppression hook
 *
 * The Trapulator is state-driven and throttled. It never rebuilds DOM on each
 * animation frame, so this presentation layer cannot undo r32 movement/camera
 * smoothing.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R32_SPY_PACKET_OWNER__)return;
  window.__CCG_LOST_SIZZLER_V141_R32_SPY_PACKET_OWNER__=true;

  const MODE_ID="sizzler-saboteurs";
  const MONITOR_MS=20,FRAME_MS=1000/60,LOCAL_VISUAL_ALPHA=.32,REMOTE_VISUAL_ALPHA=.28,MAX_VISUAL_GAP=4.25;
  const CLASSIC_UI_MS=125,LEGACY_UI_MS=140,PANEL_RATIO=.23;
  const CLASSIC_TRAPS=Object.freeze([
    Object.freeze({id:"powerBrick",name:"BOMB",place:"FURNITURE",effect:"-2 HP · DROPS CARRIED ITEMS",remedy:"WATER BUCKET",slowMs:1800}),
    Object.freeze({id:"spring",name:"SPRING",place:"FURNITURE",effect:"-1 HP · DROPS ITEMS · SLOWS",remedy:"WIRE CUTTERS",slowMs:3500}),
    Object.freeze({id:"custard",name:"WATER BUCKET",place:"CLOSED DOOR",effect:"SLOWS · VISION HIT",remedy:"UMBRELLA",slowMs:2800,visionMs:2800})
  ]);
  const CLASSIC_TRAP_IDS=CLASSIC_TRAPS.map(row=>row.id);
  const CLASSIC_COUNTERS=Object.freeze({fusePuller:"WATER BUCKET",screwdriver:"WIRE CUTTERS",raincoat:"UMBRELLA",scissors:"WIRE CUTTERS",scanner:"TRAP SCANNER"});

  const state={
    timer:0,adopted:false,r32Packet:null,normalBase:null,spyCompositions:0,normalRestores:0,
    stableEnterSeals:0,visualSmoothingSeals:0,visualFrames:0,visualStepRestores:0,lastMode:false,
    classicUiMounted:false,classicUiRenders:0,classicTrapForces:0,splitRenderSeals:0,keyGuardInstalled:false,tabGuards:0,roomMapRenders:0,
    lastClassicUiAt:0,lastClassicUiSignature:"",lastLegacyUiAt:0,lastLegacyUiSignature:"",
    pendingSearch:null,lastSearchCount:0,searchedMarks:0,classicPacketCompositions:0,
    seenEvents:new Set(),seenEventOrder:[],lastTrapByVictim:new Map(),
    baseRender:null,baseDrawFog:null,
    ratingChecked:false,ratingAlreadySubmitted:false,ratingUserId:"",ratingLastCheckAt:0,ratingListenersInstalled:false
  };

  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID}catch(_){return false}};
  const active=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const match=()=>active()?.state||null;
  const authoritative=()=>Boolean(active()?.authoritative);
  const overhaul=()=>{try{return window.CCGLostSizzlerV141R32SpyOverhaul||null}catch(_){return null}};
  const spyNetwork=()=>{try{return window.CCGLostSizzlerV141R29SpyNetwork||null}catch(_){return null}};
  const spyEngine=()=>{try{return window.CCGLostSizzlerV141R29SpyEngine||null}catch(_){return null}};
  const localPlayer=()=>{try{return p1||null}catch(_){return null}};
  const actorId=()=>{try{return String(net?.sessionId||p1?.id||"P1")}catch(_){return"P1"}};
  const modelFor=id=>{try{return match()?.players?.find?.(row=>String(row?.id||"")===String(id||""))||null}catch(_){return null}};
  const liveFor=id=>{try{return String(p1?.id||"")===String(id||"")?p1:remote?.get?.(id)||null}catch(_){return null}};
  const trapDef=id=>CLASSIC_TRAPS.find(row=>row.id===id)||null;
  const nowMs=()=>Date.now();
  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};

  function usableNormal(fn){return typeof fn==="function"&&!fn.__ccgV141R32SpyPacket&&!fn.__ccgV141R29SpyNetworkOwner&&!fn.__ccgV141R33ClassicPacket}

  function capture(){
    const api=overhaul();if(!api||!net?.cb)return false;
    const current=net.cb.onPacket,base=api.state?.packetBase;
    if(current?.__ccgV141R32SpyPacket&&!current?.__ccgV141R33ClassicPacket)state.r32Packet=current;
    if(typeof base==="function"&&base.__ccgV141R32SpyPacket&&!base.__ccgV141R33ClassicPacket)state.r32Packet=base;
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
    wrapped.__ccgV141R32SpyEnter=true;
    wrapped.__ccgV141R32SpyStableEnter=true;
    wrapped.__ccgOriginal=base;
    engine.enterIsolation=wrapped;
    state.stableEnterSeals++;
    return true
  }

  function frameAlpha(base,dt){
    const elapsed=Math.max(1,Math.min(50,Number(dt)||FRAME_MS));
    return 1-Math.pow(1-base,elapsed/FRAME_MS)
  }

  function smoothVisualPlayer(player,alpha){
    if(!player)return false;
    const x=Number(player.x),y=Number(player.y);
    if(!Number.isFinite(x)||!Number.isFinite(y))return false;
    let rx=Number(player.rx),ry=Number(player.ry);
    if(!Number.isFinite(rx)||!Number.isFinite(ry)){player.rx=x;player.ry=y;return true}
    const gap=Math.abs(x-rx)+Math.abs(y-ry);
    if(gap>MAX_VISUAL_GAP){player.rx=x;player.ry=y;return true}
    rx+=(x-rx)*alpha;ry+=(y-ry)*alpha;
    player.rx=Math.abs(x-rx)<.001?x:rx;
    player.ry=Math.abs(y-ry)<.001?y:ry;
    return true
  }

  function smoothVisualPositions(dt){
    if(!spyActive())return false;
    const localAlpha=frameAlpha(LOCAL_VISUAL_ALPHA,dt),remoteAlpha=frameAlpha(REMOTE_VISUAL_ALPHA,dt),local=localPlayer();
    smoothVisualPlayer(local,localAlpha);
    try{for(const player of remote?.values?.()||[])smoothVisualPlayer(player,remoteAlpha)}catch(_){}
    state.visualFrames++;
    return true
  }

  function localVisualSnapshot(api){
    const player=localPlayer();if(!player)return null;
    const model=modelFor(player.id);
    return{player,x:Number(player.x),y:Number(player.y),rx:Number(player.rx),ry:Number(player.ry),status:String(model?.status||""),worldBuilds:Number(api?.state?.worldBuilds||0)}
  }

  function restoreSteppedVisual(snapshot,api){
    const player=snapshot?.player;
    if(!player||snapshot.status!=="active"||Number(api?.state?.worldBuilds||0)!==snapshot.worldBuilds)return false;
    if(String(modelFor(player.id)?.status||"")!=="active")return false;
    const x=Number(player.x),y=Number(player.y),delta=Math.abs(x-snapshot.x)+Math.abs(y-snapshot.y);
    if(!(delta>0&&delta<=4.01)||!Number.isFinite(snapshot.rx)||!Number.isFinite(snapshot.ry))return false;
    player.rx=snapshot.rx;player.ry=snapshot.ry;state.visualStepRestores++;
    return true
  }

  function rememberEvent(key){
    if(!key||state.seenEvents.has(key))return false;
    state.seenEvents.add(key);state.seenEventOrder.push(key);
    while(state.seenEventOrder.length>180){const old=state.seenEventOrder.shift();state.seenEvents.delete(old)}
    return true
  }

  function recordTrapHit(victimId,trapId){
    const def=trapDef(trapId);if(!def||!victimId)return false;
    const model=modelFor(victimId),now=nowMs();
    if(model){
      model.effects=model.effects||{};
      if(def.slowMs)model.effects.slow=Math.max(Number(model.effects.slow||0),now+def.slowMs);
      if(def.visionMs)model.effects["obscure-reveal"]=Math.max(Number(model.effects["obscure-reveal"]||0),now+def.visionMs)
    }
    state.lastTrapByVictim.set(String(victimId),{trapId,until:now+Math.max(2200,def.slowMs||0,def.visionMs||0)});
    state.lastClassicUiSignature="";
    return true
  }

  function processRuleEvents(){
    if(!spyActive())return false;
    const rows=match()?.events||[];let changed=false;
    for(const event of rows){
      if(event?.type!=="trap-triggered")continue;
      const key=`${event.type}|${event.at}|${event.trapId}|${event.victimId}`;
      if(!rememberEvent(key))continue;
      recordTrapHit(String(event.victimId||""),String(event.trapType||""));changed=true
    }
    return changed
  }

  function enforceClassicTrapLoadout(){
    if(!spyActive())return false;
    const m=match();if(!m)return false;let changed=false;
    const desired=CLASSIC_TRAP_IDS.join("|");
    if((m.trapLoadout||[]).join("|")!==desired){m.trapLoadout=[...CLASSIC_TRAP_IDS];state.classicTrapForces++;changed=true}
    if(Array.isArray(m.traps)){
      const keep=m.traps.filter(row=>CLASSIC_TRAP_IDS.includes(String(row?.trapId||"")));
      if(keep.length!==m.traps.length){m.traps=keep;changed=true}
    }
    const allowedCounters=["fusePuller","screwdriver","raincoat"];
    for(const room of m.map?.rooms||[])for(const [index,item] of (room.furniture||[]).entries()){
      const content=String(item?.contents||"");
      if(!content.startsWith("counter:"))continue;
      const id=content.slice(8);if(allowedCounters.includes(id))continue;
      item.contents=`counter:${allowedCounters[index%allowedCounters.length]}`;changed=true
    }
    if(changed)state.lastClassicUiSignature="";
    return changed
  }

  function searchFurnitureById(id){
    const m=match();if(!m||!id)return null;
    for(const room of m.map?.rooms||[]){
      const item=(room.furniture||[]).find(row=>String(row?.id||"")===String(id));
      if(item)return{room,item}
    }
    return null
  }

  function markFurnitureSearched(id){
    const found=searchFurnitureById(id);if(!found)return false;
    if(found.item.searched)return true;
    found.item.searched=true;state.searchedMarks++;state.lastLegacyUiSignature="";
    return true
  }

  function targetHasArmedTrap(id){
    return Boolean(match()?.traps?.some?.(row=>row?.armed&&row.targetType==="furniture"&&String(row.targetId||"")===String(id||"")))
  }

  function trackSearchCompletion(){
    const api=overhaul();if(!spyActive()||!api?.state)return false;
    const q=api.state.search,count=Number(api.state.searches||0);
    if(q?.targetId&&!state.pendingSearch)state.pendingSearch={id:String(q.targetId),hadTrap:targetHasArmedTrap(q.targetId)};
    if(count<=state.lastSearchCount)return false;
    state.lastSearchCount=count;
    if(authoritative()&&state.pendingSearch){
      if(!state.pendingSearch.hadTrap)markFurnitureSearched(state.pendingSearch.id);
      state.pendingSearch=null
    }
    return true
  }

  function classicPacket(event,payload){
    const api=overhaul(),base=state.r32Packet;if(typeof base!=="function")return undefined;
    const isSearch=event===api?.ACTION_PACKET&&payload?.type==="search";
    const searchHadTrap=isSearch?targetHasArmedTrap(payload?.furnitureId):false;
    const result=base.apply(this,arguments);
    if(!spyActive())return result;
    if(isSearch&&authoritative()&&!searchHadTrap)markFurnitureSearched(payload?.furnitureId);
    if(event===api?.RESULT_PACKET&&String(payload?.actorId||"")===actorId()){
      const info=payload?.result||{};
      if(state.pendingSearch&&["objective","weapon","counter","empty"].includes(String(info.kind||"")))markFurnitureSearched(state.pendingSearch.id);
      if(info.kind==="trap-triggered")recordTrapHit(String(payload.actorId||""),String(info.trapId||""));
      if(info.kind!=="search")state.pendingSearch=null;
      state.lastClassicUiSignature="";state.lastLegacyUiSignature=""
    }
    return result
  }
  classicPacket.__ccgV141R32SpyPacket=true;
  classicPacket.__ccgV141R33ClassicPacket=true;

  function sealVisualSmoothing(){
    const api=overhaul(),engine=spyEngine(),base=api?.overhaulUpdate;
    if(!api||!engine||typeof base!=="function")return false;
    if(engine.isolatedUpdate?.__ccgV141R32SpyVisualSmoothing)return true;
    if(engine.isolatedUpdate!==base&&!engine.isolatedUpdate?.__ccgV141R32SpyOverhaul)return false;
    const wrapped=function isolatedUpdateR32VisualSmoothing(dt){
      const before=localVisualSnapshot(api),result=base.apply(this,arguments);
      if(spyActive()){
        restoreSteppedVisual(before,api);
        smoothVisualPositions(dt);
        enforceClassicTrapLoadout();
        trackSearchCompletion();
        processRuleEvents();
        renderClassicUi(false);
        normaliseLegacySpyUi(false)
      }
      return result
    };
    wrapped.__ccgV141R32SpyOverhaul=true;
    wrapped.__ccgV141R32SpyVisualSmoothing=true;
    // Older post-playtest smoothing recognises this marker and yields.
    wrapped.__ccgV141PostPlaytestSpySmooth=true;
    wrapped.__ccgOriginal=base;
    engine.isolatedUpdate=wrapped;state.visualSmoothingSeals++;
    return true
  }

  function injectClassicStyles(){
    if(document.getElementById("ccg-spy-classic-r33-style"))return true;
    const style=document.createElement("style");style.id="ccg-spy-classic-r33-style";
    style.textContent=`
      #spy-classic-trapulators{display:none;position:absolute;inset:0 0 0 auto;width:23%;z-index:129;pointer-events:none;background:#050309;border-left:2px solid rgba(108,236,255,.42);box-sizing:border-box}
      body[data-special-mode="sizzler-saboteurs"] #spy-classic-trapulators{display:block}
      .spy-classic-trapulator{position:absolute;right:0;width:100%;height:50%;box-sizing:border-box;padding:8px 8px 7px;overflow:hidden;background:linear-gradient(180deg,#0e0a18,#05040a);color:#efe8f6;font:800 9px/1.18 "Courier New",monospace}
      .spy-classic-trapulator[data-slot="1"]{top:0;border-bottom:2px solid #6cecff}.spy-classic-trapulator[data-slot="2"]{bottom:0;border-top:2px solid #ff63b7}
      .spy-classic-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:4px}.spy-classic-head b{font-size:11px;color:#ffd85a}.spy-classic-head span{white-space:nowrap;color:#cfc5da}
      .spy-classic-map{display:block;width:100%;height:56px;border:1px solid rgba(255,255,255,.16);background:#020204;margin:3px 0 5px}
      .spy-classic-loadout{display:grid;gap:3px}.spy-classic-trap{display:grid;grid-template-columns:18px 1fr;gap:5px;padding:3px 4px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.025);min-width:0}
      .spy-classic-trap button{pointer-events:auto;width:18px;height:18px;padding:0;border:1px solid #6cecff;background:#07131b;color:#eaffff;font:900 9px/1 "Courier New",monospace;cursor:pointer}.spy-classic-trap button:disabled{opacity:.4;cursor:default}.spy-classic-trap[data-selected="true"]{border-color:#ffd85a;background:rgba(255,216,90,.06)}.spy-classic-trap[data-selected="true"] button{border-color:#ffd85a;color:#ffd85a}
      .spy-classic-trap strong{display:block;color:#fff;font-size:9px}.spy-classic-trap small{display:block;color:#bdb2ca;font-size:7px;white-space:normal}.spy-classic-trap em{display:block;color:#72ff9b;font-style:normal;font-size:7px}
      .spy-classic-weapon,.spy-classic-status,.spy-classic-controls{margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,.12)}.spy-classic-weapon b{color:#6cecff}.spy-classic-status b{color:#ffd85a}.spy-classic-controls{color:#a99db5;font-size:7px}
      .spy-classic-hit{display:none;position:absolute;left:0;width:77%;height:50%;z-index:128;pointer-events:none;place-items:center;text-align:center;font:900 16px/1.2 "Courier New",monospace;text-shadow:0 2px 4px #000;background:rgba(255,255,255,.05)}body[data-special-mode="sizzler-saboteurs"] .spy-classic-hit[data-visible="true"]{display:grid}.spy-classic-hit[data-slot="1"]{top:0}.spy-classic-hit[data-slot="2"]{bottom:0}.spy-classic-hit[data-trap="powerBrick"]{background:rgba(255,68,68,.18);color:#ffd1d1}.spy-classic-hit[data-trap="spring"]{background:rgba(255,216,90,.13);color:#fff0a7}.spy-classic-hit[data-trap="custard"]{background:rgba(108,236,255,.16);color:#d8fbff}
      body[data-special-mode="sizzler-saboteurs"] #radar-canvas{visibility:visible!important}body[data-special-mode="sizzler-saboteurs"] .radar-legend{visibility:visible!important}
      body[data-ccg-lost-sizzler-rated="true"] #ccg-rating-panel{display:none!important}
      @media(max-width:900px){#spy-classic-trapulators{width:28%}.spy-classic-hit{width:72%}.spy-classic-trapulator{padding:5px}.spy-classic-map{height:42px}.spy-classic-trap small,.spy-classic-trap em{display:none}}
    `;
    document.head.appendChild(style);return true
  }

  function ensureClassicUi(){
    injectClassicStyles();
    const wrap=document.querySelector(".canvas-wrap");if(!wrap)return null;
    let root=document.getElementById("spy-classic-trapulators");
    if(!root){
      root=document.createElement("div");root.id="spy-classic-trapulators";root.setAttribute("aria-label","Spy Vs Spy Trapulator panels");
      for(const slot of [1,2]){
        const panel=document.createElement("section");panel.className="spy-classic-trapulator";panel.dataset.slot=String(slot);
        panel.innerHTML=`<div class="spy-classic-head"><b>PLAYER ${slot}</b><span class="spy-classic-hp">--</span></div><canvas class="spy-classic-map" width="180" height="72" aria-label="Player ${slot} room reference map"></canvas><div class="spy-classic-loadout"></div><div class="spy-classic-weapon"></div><div class="spy-classic-status"></div><div class="spy-classic-controls">1/2/3 SELECT · T SET · E SEARCH · SPACE ATTACK · TAB ITEMS</div>`;
        root.appendChild(panel)
      }
      wrap.appendChild(root);
      for(const slot of [1,2]){
        const hit=document.createElement("div");hit.className="spy-classic-hit";hit.dataset.slot=String(slot);hit.dataset.visible="false";wrap.appendChild(hit)
      }
      root.addEventListener("click",event=>{
        const button=event.target?.closest?.("[data-spy-classic-trap-index]");if(!button||!spyActive())return;
        const local=modelFor(actorId());if(Number(button.dataset.slot)!==Number(local?.slot||0))return;
        enforceClassicTrapLoadout();overhaul()?.selectTrap?.(Number(button.dataset.spyClassicTrapIndex)||0);
        state.lastClassicUiSignature="";renderClassicUi(true)
      });
      state.classicUiMounted=true
    }
    return root
  }

  function roomMapSignature(){
    const m=match();if(!m?.map)return"";
    return`${m.round}|${(m.map.rooms||[]).map(r=>`${r.id}:${r.gridX},${r.gridY}`).join(";")}|${(m.map.edges||[]).map(e=>`${e.a}>${e.b}`).join(";")}`
  }

  function drawRoomReference(canvasEl,mapSig=roomMapSignature()){
    const m=match(),rooms=m?.map?.rooms||[];if(!canvasEl||!rooms.length)return false;
    if(canvasEl.dataset.mapSignature===mapSig)return false;
    const g=canvasEl.getContext?.("2d");if(!g)return false;
    const w=canvasEl.width,h=canvasEl.height;g.clearRect(0,0,w,h);g.fillStyle="#020204";g.fillRect(0,0,w,h);
    const minX=Math.min(...rooms.map(r=>Number(r.gridX)||0)),maxX=Math.max(...rooms.map(r=>Number(r.gridX)||0)),minY=Math.min(...rooms.map(r=>Number(r.gridY)||0)),maxY=Math.max(...rooms.map(r=>Number(r.gridY)||0));
    const cols=Math.max(1,maxX-minX+1),rows=Math.max(1,maxY-minY+1),pad=7,cw=(w-pad*2)/cols,ch=(h-pad*2)/rows,centre=r=>({x:pad+(Number(r.gridX)-minX+.5)*cw,y:pad+(Number(r.gridY)-minY+.5)*ch});
    const byId=new Map(rooms.map(r=>[String(r.id),r]));g.strokeStyle="rgba(108,236,255,.28)";g.lineWidth=1;
    for(const edge of m.map?.edges||[]){
      const a=byId.get(String(edge.a)),b=byId.get(String(edge.b));if(!a||!b)continue;
      const ca=centre(a),cb=centre(b);g.beginPath();g.moveTo(ca.x,ca.y);g.lineTo(cb.x,cb.y);g.stroke()
    }
    for(const room of rooms){
      const x=pad+(Number(room.gridX)-minX)*cw+2,y=pad+(Number(room.gridY)-minY)*ch+2;
      g.fillStyle="#2b2338";g.fillRect(x,y,Math.max(3,cw-4),Math.max(3,ch-4));g.strokeStyle="#6d5b88";g.strokeRect(x+.5,y+.5,Math.max(2,cw-5),Math.max(2,ch-5))
    }
    canvasEl.dataset.mapMode="rooms-only";canvasEl.dataset.mapSignature=mapSig;state.roomMapRenders++;
    return true
  }

  function weaponHelp(model){
    const weapon=model?.weapon;
    if(!weapon)return{title:"ROLLED-UP RULEBOOK",detail:"SPACE · 1 HP PER HIT"};
    const uses=Number.isFinite(Number(weapon.uses))?`${Math.max(0,Number(weapon.uses))} USE${Number(weapon.uses)===1?"":"S"}`:"UNLIMITED";
    const damage=Math.max(0,Number(weapon.damage||0));
    if(String(weapon.id)==="chicken")return{title:"RUBBER CHICKEN",detail:`SPACE · ${uses} · ${damage||1} HP PER HIT`};
    return{title:String(weapon.name||"WEAPON").toUpperCase(),detail:`SPACE · ${uses}${damage?` · ${damage} HP`:" · SPECIAL EFFECT"}`}
  }

  function counterHelp(model){const id=String(model?.counter||"");return id?(CLASSIC_COUNTERS[id]||id.toUpperCase()):"NONE"}
  function objectiveCount(model){return Number(Boolean(model?.hasCase))+["joystick","tape","key"].filter(id=>model?.objectives?.includes?.(id)||model?.looseItem===id).length}

  function trapStatus(model){
    if(!model)return"WAITING FOR AGENT";
    if(model.status!=="active")return"KNOCKED OUT";
    const now=nowMs(),hit=state.lastTrapByVictim.get(String(model.id));
    if(hit&&hit.until>now){const def=trapDef(hit.trapId);if(def)return`${def.name} HIT · ${def.effect}`}
    const slow=Number(model.effects?.slow||0),vision=Number(model.effects?.["obscure-reveal"]||0);
    if(slow>now)return`SLOWED · ${Math.ceil((slow-now)/250)/4}s`;
    if(vision>now)return`VISION HIT · ${Math.ceil((vision-now)/250)/4}s`;
    return"ACTIVE"
  }

  function renderHitOverlay(model,slot){
    const node=document.querySelector(`.spy-classic-hit[data-slot="${slot}"]`),hit=model?state.lastTrapByVictim.get(String(model.id)):null,now=nowMs();
    if(!node)return false;
    if(!hit||hit.until<=now){if(node.dataset.visible!=="false"){node.dataset.visible="false";node.textContent=""}return false}
    const def=trapDef(hit.trapId);if(!def){node.dataset.visible="false";return false}
    const text=`${def.name}! ${def.effect}`;
    if(node.dataset.visible!=="true"||node.dataset.trap!==def.id||node.textContent!==text){node.dataset.visible="true";node.dataset.trap=def.id;node.textContent=text}
    return true
  }

  function modelUiSignature(model,slot,local,selected){
    if(!model)return`${slot}|missing`;
    const weapon=model.weapon||{},hit=state.lastTrapByVictim.get(String(model.id)),status=trapStatus(model);
    return[
      slot,String(model.id||""),String(model.name||""),String(model.status||""),Number(model.hp||0),Number(model.maxHp||0),
      objectiveCount(model),String(weapon.id||""),Number.isFinite(Number(weapon.uses))?Number(weapon.uses):"inf",String(model.counter||""),Number(model.trapCharges||0),
      status,Number(local?.slot)===slot?selected:-1,String(hit?.trapId||""),hit&&hit.until>nowMs()?1:0
    ].join("|")
  }

  function renderClassicUi(force=false){
    if(!spyActive())return false;
    const t=perfNow();if(!force&&t-state.lastClassicUiAt<CLASSIC_UI_MS)return false;state.lastClassicUiAt=t;
    const root=ensureClassicUi(),m=match();if(!root||!m)return false;
    enforceClassicTrapLoadout();
    const local=modelFor(actorId()),selected=Number(overhaul()?.state?.selectedTrapIndex||0),mapSig=roomMapSignature();
    const models=[1,2].map(slot=>m.players?.find?.(row=>Number(row?.slot)===slot)||m.players?.[slot-1]||null);
    const overall=`${mapSig}|${models.map((model,index)=>modelUiSignature(model,index+1,local,selected)).join("||")}`;
    if(!force&&overall===state.lastClassicUiSignature)return false;
    state.lastClassicUiSignature=overall;let changed=false;
    for(const slot of [1,2]){
      const panel=root.querySelector(`.spy-classic-trapulator[data-slot="${slot}"]`),model=models[slot-1];if(!panel)continue;
      const panelSig=modelUiSignature(model,slot,local,selected);
      if(force||panel.dataset.uiSignature!==panelSig){
        panel.dataset.uiSignature=panelSig;
        panel.querySelector(".spy-classic-head b").textContent=`PLAYER ${slot} · ${String(model?.name||"AGENT").toUpperCase()}`;
        panel.querySelector(".spy-classic-hp").textContent=model?`HP ${Math.max(0,Number(model.hp||0))}/${Math.max(1,Number(model.maxHp||1))} · CASE ${objectiveCount(model)}/4`:"--";
        const list=panel.querySelector(".spy-classic-loadout");
        if(list)list.innerHTML=CLASSIC_TRAPS.map((trap,index)=>`<div class="spy-classic-trap" data-selected="${Number(local?.slot)===slot&&selected===index}"><button type="button" data-slot="${slot}" data-spy-classic-trap-index="${index}" ${Number(local?.slot)===slot?"":"disabled"}>${index+1}</button><div><strong>${trap.name} · ${trap.place}</strong><small>${trap.effect}</small><em>REMEDY: ${trap.remedy}</em></div></div>`).join("");
        const weapon=weaponHelp(model),weaponNode=panel.querySelector(".spy-classic-weapon");
        if(weaponNode)weaponNode.innerHTML=`<b>WEAPON · ${weapon.title}</b><br><span>${weapon.detail}</span><br><span>REMEDY HELD · ${counterHelp(model)}</span><br><span>TRAPS LEFT · ${Math.max(0,Number(model?.trapCharges||0))}</span>`;
        const status=panel.querySelector(".spy-classic-status");if(status)status.innerHTML=`<b>STATUS</b> · ${trapStatus(model)}`;
        changed=true
      }
      if(drawRoomReference(panel.querySelector(".spy-classic-map"),mapSig))changed=true;
      renderHitOverlay(model,slot)
    }
    if(changed)state.classicUiRenders++;
    return changed
  }

  function classiciseText(value){
    return String(value||"").replace(/EXPLODING POWER BRICK/gi,"BOMB").replace(/SPRING-LOADED JOYSTICK/gi,"SPRING").replace(/CUSTARD BUCKET/gi,"WATER BUCKET")
  }

  function normaliseLegacySpyUi(force=false){
    if(!spyActive())return false;
    const t=perfNow();if(!force&&t-state.lastLegacyUiAt<LEGACY_UI_MS)return false;state.lastLegacyUiAt=t;
    const api=overhaul(),model=modelFor(actorId()),field=document.querySelector("#spy-r32-inventory .spy-r32-field"),toast=document.getElementById("spy-r32-objective-toast"),searchLabel=document.getElementById("spy-search-label");
    const weapon=weaponHelp(model),signature=[weapon.title,weapon.detail,counterHelp(model),String(toast?.textContent||""),String(searchLabel?.textContent||""),Boolean(api?.state?.inventoryOpen)].join("|");
    if(!force&&signature===state.lastLegacyUiSignature)return false;state.lastLegacyUiSignature=signature;
    if(field&&model){
      const markup=`<div class="spy-r32-row"><span>Weapon</span><b>${weapon.title}</b></div><div class="spy-r32-row"><span>Use / Effect</span><b>${weapon.detail}</b></div><div class="spy-r32-row"><span>Trap Remedy</span><b>${counterHelp(model)}</b></div>`;
      if(field.innerHTML!==markup)field.innerHTML=markup
    }
    if(toast?.textContent){let text=classiciseText(toast.textContent);if(/ALREADY SEARCHED/i.test(text))text="YOU HAVE ALREADY SEARCHED";if(text!==toast.textContent)toast.textContent=text}
    if(searchLabel?.textContent&&/ALREADY SEARCHED/i.test(searchLabel.textContent)&&searchLabel.textContent!=="YOU HAVE ALREADY SEARCHED")searchLabel.textContent="YOU HAVE ALREADY SEARCHED";
    for(const node of document.querySelectorAll("#spy-r32-inventory .spy-r32-traps .spy-r32-row")){
      const next=classiciseText(node.textContent);if(next===node.textContent)continue;
      for(const child of node.childNodes)if(child.nodeType===Node.TEXT_NODE)child.textContent=classiciseText(child.textContent);
      for(const span of node.querySelectorAll("span,b,button"))span.textContent=classiciseText(span.textContent)
    }
    if(api?.state?.inventoryOpen)forceSharedPlaying(false);
    return true
  }

  function forceSharedPlaying(focusWhenClosed=true){
    if(!spyActive())return false;let repaired=false;
    try{if(typeof mode!=="undefined"&&(mode==="inventory"||mode==="paused")){mode="playing";repaired=true}}catch(_){}
    try{UI?.inventory?.classList?.add("hidden");UI?.pause?.classList?.add("hidden")}catch(_){}
    if(repaired)try{input?.clear?.()}catch(_){}
    if(focusWhenClosed&&!overhaul()?.state?.inventoryOpen)requestAnimationFrame(()=>{try{document.getElementById("game")?.focus?.({preventScroll:true})}catch(_){}});
    return true
  }

  function keyGuard(event){
    if(!spyActive()||(event?.defaultPrevented&&event.code!=="Tab"))return;
    if(event.code!=="Tab")return;
    event.preventDefault?.();event.stopImmediatePropagation?.();state.tabGuards++;
    forceSharedPlaying(true);
    requestAnimationFrame(()=>{forceSharedPlaying(true);state.lastClassicUiSignature="";state.lastLegacyUiSignature="";renderClassicUi(true);normaliseLegacySpyUi(true)})
  }

  function installKeyGuard(){
    if(state.keyGuardInstalled)return true;
    addEventListener("keydown",keyGuard,true);state.keyGuardInstalled=true;
    return true
  }

  function spyViewPlayers(){
    const m=match(),rows=[];
    for(const model of [...(m?.players||[])].sort((a,b)=>Number(a?.slot||0)-Number(b?.slot||0))){const live=liveFor(model.id);if(live)rows.push({model,live})}
    return rows
  }

  function sealSplitRender(){
    if(state.baseRender)return true;
    let current=null;try{current=window.render}catch(_){return false}
    if(typeof current!=="function")return false;state.baseRender=current;
    try{
      if(typeof window.drawFog==="function"){
        state.baseDrawFog=window.drawFog;
        window.drawFog=function drawFogSpyClassic(){if(spyActive())return;return state.baseDrawFog.apply(this,arguments)}
      }
    }catch(_){}
    const wrapped=function renderSpyClassicSplit(){
      if(!spyActive())return state.baseRender.apply(this,arguments);
      const rows=spyViewPlayers();
      if(rows.length<2||typeof canvas==="undefined"||!canvas||typeof ctx==="undefined"||!ctx||typeof renderView!=="function")return state.baseRender.apply(this,arguments);
      try{
        renderShake=shake>0?{x:(Math.random()-.5)*shake,y:(Math.random()-.5)*shake}:{x:0,y:0};
        if(shake>0){shake*=.84;if(shake<.25)shake=0}
        ctx.fillStyle=P?.black||"#000";ctx.fillRect(0,0,canvas.width,canvas.height);
        const playW=Math.max(1,Math.floor(canvas.width*(1-PANEL_RATIO))),half=Math.floor(canvas.height/2);
        renderView(rows[0].live,{x:0,y:0,w:playW,h:half});
        renderView(rows[1].live,{x:0,y:half,w:playW,h:canvas.height-half});
        ctx.fillStyle="#6cecff";ctx.fillRect(0,half-1,playW,2);
        ctx.fillStyle="#030205";ctx.fillRect(playW,0,canvas.width-playW,canvas.height);
        try{buildReferenceGuide?.()}catch(_){}
        renderClassicUi(false);
        if(typeof damageFlash!=="undefined"&&damageFlash>0){ctx.fillStyle=`rgba(255,50,70,${Math.min(.18,damageFlash*.18)})`;ctx.fillRect(0,0,playW,canvas.height)}
        return
      }catch(error){
        console.warn("[Lost Sizzler r33] split render fell back safely",error);
        return state.baseRender.apply(this,arguments)
      }
    };
    wrapped.__ccgV141R33SpySplit=true;
    window.render=wrapped;state.splitRenderSeals++;
    return true
  }

  async function checkRatingEligibility(force=false){
    const now=nowMs();if(!force&&state.ratingChecked&&now-state.ratingLastCheckAt<60000)return state.ratingAlreadySubmitted;
    state.ratingLastCheckAt=now;
    try{
      const context=await window.ccgSupabase?.getCurrentUserContext?.(),user=context?.user;
      if(!user){state.ratingChecked=true;state.ratingAlreadySubmitted=false;state.ratingUserId="";document.body?.removeAttribute?.("data-ccg-lost-sizzler-rated");return false}
      state.ratingUserId=String(user.id||"");const localKey=`ccg-lost-sizzler-rated:${state.ratingUserId}`;
      if(localStorage.getItem(localKey)==="1"){state.ratingChecked=true;state.ratingAlreadySubmitted=true;suppressRatingPrompt();return true}
      const client=await window.ccgSupabase?.getClient?.();if(!client?.functions?.invoke){state.ratingChecked=true;return false}
      const {data,error}=await client.functions.invoke("lost-sizzler-feedback",{body:{action:"rating_status"}});
      if(error)throw error;
      state.ratingChecked=true;state.ratingAlreadySubmitted=Boolean(data?.rated);
      if(state.ratingAlreadySubmitted){localStorage.setItem(localKey,"1");suppressRatingPrompt()}
      return state.ratingAlreadySubmitted
    }catch(error){
      console.warn("[Lost Sizzler] rating eligibility check failed safely",error);state.ratingChecked=true;return false
    }
  }

  function suppressRatingPrompt(){
    if(!state.ratingAlreadySubmitted)return false;
    document.body?.setAttribute?.("data-ccg-lost-sizzler-rated","true");
    try{sessionStorage.setItem("ccg-lost-sizzler-rating-shown","1")}catch(_){}
    const panel=document.getElementById("ccg-rating-panel");
    if(panel&&!panel.classList.contains("hidden")){
      panel.classList.add("hidden");
      try{if(typeof mode!=="undefined"&&mode==="paused"&&typeof pause==="function")pause(true)}catch(_){}
    }
    return true
  }

  function installRatingGuard(){
    if(state.ratingListenersInstalled)return true;
    state.ratingListenersInstalled=true;
    window.addEventListener("ccg:auth-ready",()=>checkRatingEligibility(true));
    window.addEventListener("ccg:auth-changed",()=>{state.ratingChecked=false;state.ratingAlreadySubmitted=false;document.body?.removeAttribute?.("data-ccg-lost-sizzler-rated");checkRatingEligibility(true)});
    setTimeout(()=>checkRatingEligibility(true),200);
    return true
  }

  function adoptR32Maintenance(){
    const api=overhaul();if(!api?.state)return false;
    capture();
    if(!state.adopted){if(api.state.timer){clearInterval(api.state.timer);api.state.timer=0}state.adopted=true}
    const engine=spyEngine();if(!engine?.isolatedUpdate?.__ccgV141R32SpyVisualSmoothing)api.patchEngine?.();
    sealStableEnter();sealVisualSmoothing();sealSplitRender();installKeyGuard();ensureClassicUi();
    return true
  }

  function restoreNormal(){
    const api=overhaul(),network=spyNetwork();if(!api||!net?.cb)return false;
    capture();
    if(net.cb.onPacket?.__ccgV141R29SpyNetworkOwner)try{network?.restore?.()}catch(_){}
    capture();
    if(state.normalBase&&net.cb.onPacket!==state.normalBase){net.cb.onPacket=state.normalBase;state.normalRestores++}
    if(api.state){api.state.packetInstalled=false;api.state.packetBase=state.normalBase||api.state.packetBase}
    if(state.lastMode){
      api.setInventory?.(false);api.state.search=null;api.state.worldKey="";api.state.round=0;api.state.lastRoomByPlayer?.clear?.();api.state.lastMode="";
      const label=document.getElementById("spy-r32-room-label");if(label)label.textContent="";
      state.pendingSearch=null;state.lastClassicUiSignature="";state.lastLegacyUiSignature=""
    }
    document.querySelectorAll(".spy-classic-hit").forEach(node=>node.dataset.visible="false");
    state.lastMode=false;
    return true
  }

  function composeSpy(){
    const api=overhaul(),network=spyNetwork();if(!api||!net?.cb)return false;
    capture();if(!state.r32Packet)return false;
    const current=net.cb.onPacket;
    if(usableNormal(current))state.normalBase=current;
    if(api.state&&state.normalBase)api.state.packetBase=state.normalBase;
    if(current?.__ccgV141R29SpyNetworkOwner){if(network?.state)network.state.basePacket=classicPacket}
    else if(current!==classicPacket){net.cb.onPacket=classicPacket;state.classicPacketCompositions++}
    if(api.state)api.state.packetInstalled=true;
    if(!state.lastMode){
      api.buildOverhaulWorld?.(true);enforceClassicTrapLoadout();api.renderInventory?.();api.state.lastMode=MODE_ID;
      state.spyCompositions++;state.lastSearchCount=Number(api.state.searches||0);state.lastClassicUiSignature="";state.lastLegacyUiSignature=""
    }
    state.lastMode=true;
    enforceClassicTrapLoadout();trackSearchCompletion();processRuleEvents();renderClassicUi(false);normaliseLegacySpyUi(false);forceSharedPlaying(false);
    return true
  }

  function monitor(){
    if(!adoptR32Maintenance())return;
    if(spyActive())composeSpy();else restoreNormal();
    if(state.ratingAlreadySubmitted)suppressRatingPrompt()
  }

  injectClassicStyles();installRatingGuard();monitor();
  state.timer=setInterval(()=>{try{monitor()}catch(error){console.warn("[Lost Sizzler r33] Spy final-owner monitor failed safely",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{
    if(state.timer)clearInterval(state.timer);state.timer=0;
    if(state.keyGuardInstalled)removeEventListener("keydown",keyGuard,true);
    try{restoreNormal()}catch(_){}
  },{once:true});

  window.CCGLostSizzlerV141R32SpyPacketOwner={
    CLASSIC_TRAPS,capture,classicPacket,sealStableEnter,sealVisualSmoothing,smoothVisualPositions,enforceClassicTrapLoadout,markFurnitureSearched,trackSearchCompletion,
    ensureClassicUi,renderClassicUi,drawRoomReference,forceSharedPlaying,sealSplitRender,checkRatingEligibility,suppressRatingPrompt,adoptR32Maintenance,composeSpy,restoreNormal,
    get state(){return state}
  };
})();