/* The Lost Sizzler V10.36 — loading feedback, Spy field kit and render ownership hardening. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V136_BOOTSTRAP__)return;
  window.__CCG_LOST_SIZZLER_V136_BOOTSTRAP__=true;

  const REV=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"latest").trim();
  const BOX_TYPES=new Set(["crate","box","boxes","woodenCrate","cargoCrate","crateStack"]);
  const state={
    loadingStartedAt:performance.now(),observedScripts:new WeakSet(),modulesReady:0,progress:4,gateHooked:false,
    runtimeInstalled:false,lastWorld:null,lastRepairSignature:"",loadingTimer:0,hookTimer:0,observer:null,
    legacyInventory:null
  };

  function ensureStyles(){
    if(document.querySelector('link[data-ccg-v136-special-ui="true"]'))return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=`css/v10-36-special-ui.css?v=${REV}`;
    link.dataset.ccgV136SpecialUi="true";
    document.head.appendChild(link);
  }

  function ensureLoadingUi(){
    let overlay=document.getElementById("ccg-release-loading");
    if(overlay)return overlay;
    if(!document.body)return null;
    overlay=document.createElement("div");
    overlay.id="ccg-release-loading";
    overlay.className="ccg-release-loading";
    overlay.setAttribute("role","status");
    overlay.setAttribute("aria-live","polite");
    overlay.innerHTML=`<div class="ccg-release-loading-card"><span class="ccg-release-loading-kicker">CHEEKY COMMODORE QUEST</span><h2>LOADING — PLEASE WAIT</h2><p id="ccg-release-loading-status">Preparing The Lost Sizzler game systems…</p><progress id="ccg-release-loading-progress" max="100" value="4">4%</progress><div class="ccg-release-loading-meta"><span id="ccg-release-loading-percent" class="ccg-release-loading-percent">4%</span><span>THE LOST SIZZLER · PREPARING RUNTIME</span></div></div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  function setLoadingProgress(value,message=""){
    const overlay=ensureLoadingUi();if(!overlay)return;
    const pct=Math.max(0,Math.min(100,Math.round(Number(value)||0)));
    state.progress=Math.max(state.progress,pct);
    const progress=overlay.querySelector("#ccg-release-loading-progress"),percent=overlay.querySelector("#ccg-release-loading-percent"),status=overlay.querySelector("#ccg-release-loading-status");
    if(progress)progress.value=state.progress;
    if(percent)percent.textContent=`${state.progress}%`;
    if(status&&message)status.textContent=message;
    overlay.hidden=false;
  }

  function finishLoading(errors=[]){
    const overlay=ensureLoadingUi();
    if(errors.length){
      overlay?.classList.add("is-error");
      setLoadingProgress(100,"A required game system did not load. Refresh the page to retry.");
      return;
    }
    setLoadingProgress(100,"Game systems ready.");
    setTimeout(()=>{const node=document.getElementById("ccg-release-loading");if(node)node.hidden=true},320);
  }

  function enhancementScript(node){
    if(!(node instanceof HTMLScriptElement)||!node.src)return false;
    const hasMarker=[...node.attributes].some(attr=>attr.name.startsWith("data-ccg-"));
    if(!hasMarker)return false;
    try{return /\/arcade\/lost-sizzler\/js\/|\/js\//.test(new URL(node.src,location.href).pathname)}catch(_){return false}
  }

  function watchScript(node){
    if(!enhancementScript(node)||state.observedScripts.has(node))return;
    state.observedScripts.add(node);
    const ready=()=>{
      state.modulesReady++;
      const pct=Math.min(92,10+state.modulesReady*2);
      setLoadingProgress(pct,`Preparing game systems… ${state.modulesReady} modules ready.`);
    };
    node.addEventListener("load",ready,{once:true});
    node.addEventListener("error",ready,{once:true});
  }

  function startLoadingWatch(){
    ensureStyles();
    const start=()=>{
      ensureLoadingUi();setLoadingProgress(4,"Preparing The Lost Sizzler game systems…");
      document.querySelectorAll("script[src]").forEach(watchScript);
      state.observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node instanceof HTMLScriptElement)watchScript(node);else if(node?.querySelectorAll)node.querySelectorAll("script[src]").forEach(watchScript)}});
      state.observer.observe(document.documentElement,{childList:true,subtree:true});
      state.loadingTimer=setInterval(()=>{
        const gate=window.CCGLostSizzlerReleaseGate;
        if(gate?.state?.ready){finishLoading([]);clearInterval(state.loadingTimer);state.loadingTimer=0;return}
        if(gate?.state?.failed){finishLoading(gate.state.errors||["load failed"]);clearInterval(state.loadingTimer);state.loadingTimer=0;return}
        if(state.progress<88)setLoadingProgress(state.progress+1,"Preparing game systems… please wait.");
      },420);
    };
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
  }

  const escHtml=value=>String(value==null?"":value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const cellKey=(x,y)=>`${x},${y}`;
  const md=(a,b)=>Math.abs(Number(a?.x||0)-Number(b?.x||0))+Math.abs(Number(a?.y||0)-Number(b?.y||0));
  const specialActive=()=>window.CCGLostSizzlerSpecialModes?.active||null;
  const spyActive=()=>specialActive()?.type==="sizzler-saboteurs";
  const actorId=()=>String(typeof net!=="undefined"&&net?.sessionId||typeof p1!=="undefined"&&p1?.id||"P1");

  function formatTime(ms){const total=Math.max(0,Math.ceil((Number(ms)||0)/1000)),m=Math.floor(total/60),s=total%60;return`${m}:${String(s).padStart(2,"0")}`}
  function effectText(effect){return({squeak:"Squeak and knockback",launch:"Heavy launch/knockback",obscure:"Vision obscured",slow:"Movement slowed",drop:"Forces carried objectives to drop",wobble:"Movement disrupted",decoy:"Deploys a distracting decoy effect",flash:"Brief blinding flash",bonk:"Basic melee hit",blast:"Blast and forced drop","obscure-reveal":"Obscures and reveals the victim",reveal:"Reveals the victim","timed-blast":"Delayed explosion"}[effect]||String(effect||"Special effect"))}
  function trapLocationText(locations){return(locations||[]).map(v=>({floor:"floor",door:"doorway",furniture:"furniture"}[v]||v).toUpperCase()).join(" / ")||"SPECIAL"}

  function captureInventoryChrome(){
    const panel=document.querySelector("#inventory-panel>.inventory-panel");if(!panel||state.legacyInventory)return panel;
    const title=panel.querySelector(".mobile-panel-head h2"),notice=document.getElementById("inventory-mobile-notice"),guideHeading=[...panel.querySelectorAll(":scope > h3")][0]||null,dossier=document.getElementById("inventory-dossier-btn"),intro=[...panel.querySelectorAll(":scope > p")].find(node=>node.id!=="inventory-mobile-notice")||null;
    state.legacyInventory={panel,title,notice,guideHeading,dossier,intro,titleText:title?.textContent||"Inventory & Objective",noticeText:notice?.textContent||"",guideText:guideHeading?.textContent||"",dossierHidden:dossier?.classList.contains("v136-spy-hidden")||false,introHidden:intro?.classList.contains("v136-spy-hidden")||false};
    return panel;
  }

  function restoreInventoryChrome(){
    const saved=state.legacyInventory;if(!saved)return;
    saved.panel?.classList.remove("spy-field-kit");
    if(saved.title)saved.title.textContent=saved.titleText;
    if(saved.notice)saved.notice.textContent=saved.noticeText;
    if(saved.guideHeading)saved.guideHeading.textContent=saved.guideText;
    if(saved.dossier)saved.dossier.classList.toggle("v136-spy-hidden",saved.dossierHidden);
    if(saved.intro)saved.intro.classList.toggle("v136-spy-hidden",saved.introHidden);
  }

  function spyControls(){return[
    ["WASD / ARROWS","MOVE","Move through rooms and doorways."],
    ["SPACE","ATTACK","Use your current novelty weapon. With no weapon, you fall back to the Rolled-Up Rulebook."],
    ["E","SEARCH","Stand beside furniture and search it for objectives, weapons and trap counters."],
    ["T","ARM TRAP","Places the first valid floor trap from this round's trap loadout. Each placement uses one trap charge."],
    ["X","EXTRACT","When the case is complete and you are in the extraction room, hold your ground for the extraction countdown."],
    ["SHIFT","DASH","Short movement burst using the normal movement system."],
    ["C","CLOSE DOOR","Close an open nearby room door to slow or misdirect the other agent."],
    ["TAB","FIELD KIT","Open or close this Spy Vs Spy manual and live equipment readout."],
    ["F","FULLSCREEN","F toggles fullscreen. Sound is controlled from the SOUND button in the top bar."],
    ["ESC","LEAVE MATCH","Ends the special mode and returns to the game options. This is not the Spy pause key."]
  ]}

  function objectiveRows(player){
    const held=id=>id==="case"?Boolean(player?.hasCase):Boolean(player?.objectives?.includes(id)||player?.looseItem===id);
    return[
      ["case","SIZZLER CASE","The container required for the winning extraction. Once you have it, the Joystick, Tape and Key can be stored inside it."],
      ["joystick","GOLDEN JOYSTICK","One of the three required case contents. Without the case you can carry only one loose objective piece at a time."],
      ["tape","SECRET LOADING TAPE","One of the three required case contents. Search furniture and watch for dropped pieces."],
      ["key","DUNGEON KEY","The final required case component. Case + Joystick + Tape + Key unlocks extraction."]
    ].map(([id,name,desc])=>`<div class="spy-manual-entry ${held(id)?"is-held":""}"><b>${escHtml(name)}</b><span>${escHtml(desc)}</span><small>${held(id)?"CURRENTLY CARRIED":"NOT CURRENTLY CARRIED"}</small></div>`).join("")
  }

  function weaponRows(SAB,player){
    const current=player?.weapon?.id||"melee",rows=[{id:"melee",name:"Rolled-Up Rulebook",uses:Infinity,damage:1,knockback:1,effect:"bonk"},...Object.values(SAB.WEAPONS||{})];
    return rows.map(w=>{const uses=Number.isFinite(w.uses)?`${w.uses} USE${w.uses===1?"":"S"}`:"UNLIMITED",parts=[w.damage?`${w.damage} DAMAGE`:"NO DIRECT DAMAGE",w.knockback?`KNOCKBACK ${w.knockback}`:"NO KNOCKBACK",effectText(w.effect)];if(w.effectMs)parts.push(`${(w.effectMs/1000).toFixed(1)} SEC EFFECT`);return`<div class="spy-manual-entry ${current===w.id?"is-held":""}"><b>${escHtml(w.name)}</b><span>${escHtml(parts.join(" · "))}</span><small>${uses}${current===w.id?" · EQUIPPED":""}</small></div>`}).join("")
  }

  function trapRows(SAB,match){
    return Object.values(SAB.TRAPS||{}).map(t=>{const live=match?.trapLoadout?.includes(t.id),counter=t.counter&&SAB.COUNTERS?.[t.counter]?.name,parts=[trapLocationText(t.locations),t.damage?`${t.damage} DAMAGE`:"NO DIRECT DAMAGE",effectText(t.effect)];if(t.effectMs)parts.push(`${(t.effectMs/1000).toFixed(1)} SEC EFFECT`);if(t.fuseMs)parts.push(`${Math.round(t.fuseMs/1000)} SEC FUSE`);parts.push(counter?`COUNTER: ${counter}`:"NO COUNTER");if(t.oncePerMatch)parts.push("ONCE PER MATCH");return`<div class="spy-manual-entry ${live?"is-live":""}"><b>${escHtml(t.name)}</b><span>${escHtml(parts.join(" · "))}</span><small>${live?"AVAILABLE IN THIS ROUND":"NOT IN THIS ROUND'S LOADOUT"}</small></div>`}).join("")
  }

  function counterRows(SAB,player){
    return Object.values(SAB.COUNTERS||{}).map(c=>{const trap=SAB.TRAPS?.[c.counters],held=player?.counter===c.id;return`<div class="spy-manual-entry ${held?"is-held":""}"><b>${escHtml(c.name)}</b><span>Automatically neutralises ${escHtml(trap?.name||c.counters)} when the matching trap is encountered.</span><small>${held?"CURRENTLY CARRIED · CONSUMED WHEN USED":"NOT CURRENTLY CARRIED"}</small></div>`}).join("")
  }

  function renderSpyInventoryPanel(){
    const active=specialActive(),SAB=window.CCGLostSizzlerSaboteurs,panel=captureInventoryChrome();if(!panel||!SAB)return false;
    panel.classList.add("spy-field-kit");
    const saved=state.legacyInventory;if(saved?.title)saved.title.textContent="SPY VS SPY FIELD KIT";
    if(saved?.notice)saved.notice.textContent="Spy-only controls, objectives, novelty weapons, traps and counters. Normal dungeon inventory information is hidden for this mode.";
    if(saved?.guideHeading)saved.guideHeading.textContent="SPY FIELD MANUAL — ITEMS, TRAPS & COUNTERS";
    saved?.dossier?.classList.add("v136-spy-hidden");saved?.intro?.classList.add("v136-spy-hidden");
    const match=active?.state,local=match?.players?.find(player=>String(player.id)===actorId())||match?.players?.[0]||null,opponent=match?.players?.find(player=>player!==local)||null;
    const objective=document.getElementById("inventory-objective"),loadout=document.getElementById("inventory-loadout"),list=document.getElementById("inventory-list"),guide=document.getElementById("inventory-guide");
    if(!match||!local){
      if(objective)objective.innerHTML="<b>SPY VS SPY</b><span>Waiting for the host to send the match state…</span><small>The field manual will populate as soon as the round is ready.</small>";
      if(loadout)loadout.innerHTML="<b>AGENT STATUS</b><span>CONNECTING…</span>";
    }else{
      const complete=Boolean(local.hasCase&&["joystick","tape","key"].every(id=>local.objectives?.includes(id))),remaining=formatTime(Number(match.roundEndsAt||0)-Date.now()),modifier=match.modifier?.name||"STANDARD DOUBLE-CROSS";
      if(objective)objective.innerHTML=`<b>ROUND ${Number(match.round||0)}/5 · FIRST TO 3</b><span>Find the Sizzler Case, Golden Joystick, Secret Loading Tape and Dungeon Key. ${complete?"YOUR CASE IS COMPLETE — REACH EXTRACTION AND PRESS X.":"Search furniture, sabotage the other agent and assemble the complete case."}</span><small>${escHtml(modifier)} · ${remaining} REMAINING · SCORE ${Number(match.wins?.[local.id]||0)}-${Number(match.wins?.[opponent?.id]||0)}</small>`;
      const weapon=local.weapon||{id:"melee",name:"Rolled-Up Rulebook",uses:Infinity},counter=local.counter&&SAB.COUNTERS?.[local.counter],effects=Object.entries(local.effects||{}).filter(([,until])=>Number(until)>Date.now()).map(([name,until])=>`${String(name).toUpperCase()} ${formatTime(Number(until)-Date.now())}`),pieces=[local.hasCase&&"CASE",...(local.objectives||[]).map(v=>String(v).toUpperCase()),local.looseItem&&`LOOSE ${String(local.looseItem).toUpperCase()}`].filter(Boolean);
      const uses=Number.isFinite(weapon.uses)?`${weapon.uses} USE${weapon.uses===1?"":"S"} LEFT`:"UNLIMITED";
      if(loadout)loadout.innerHTML=`<b>${escHtml(local.name||"AGENT")} · ${Number(local.hp||0)}/${Number(local.maxHp||0)} HP</b><span>${escHtml(weapon.name||"Rolled-Up Rulebook")} · ${uses} · TRAP CHARGES ${Number(local.trapCharges||0)} · COUNTER ${escHtml(counter?.name||"NONE")}</span><small>${pieces.length?pieces.map(piece=>`<span class="spy-kit-tag held">${escHtml(piece)}</span>`).join(""):"NO OBJECTIVE PIECES CARRIED"}${effects.length?`<br>${effects.map(effect=>`<span class="spy-kit-tag">${escHtml(effect)}</span>`).join("")}`:""}</small>`;
    }
    if(list)list.innerHTML=`<div class="spy-controls-grid">${spyControls().map(([key,title,desc])=>`<div class="spy-control-card"><kbd>${escHtml(key)}</kbd><b>${escHtml(title)}</b><span>${escHtml(desc)}</span></div>`).join("")}</div><div class="spy-warning-box"><b>HOW TO WIN A ROUND:</b> assemble the complete case, reach the extraction room and press X. Knockouts make the victim drop carried objectives. If time expires, carried objectives, HP, knockouts and trap hits are used to separate the agents; a tie enters sudden death.</div>`;
    if(guide)guide.innerHTML=`<section class="spy-manual-section"><h4>Required objective pieces</h4><div class="spy-manual-grid">${objectiveRows(local)}</div></section><section class="spy-manual-section"><h4>Novelty weapons</h4><div class="spy-manual-grid">${weaponRows(SAB,local)}</div></section><section class="spy-manual-section"><h4>Trap loadout</h4><div class="spy-manual-grid">${trapRows(SAB,match)}</div></section><section class="spy-manual-section"><h4>Trap counters</h4><div class="spy-manual-grid">${counterRows(SAB,local)}</div></section>`;
    return true;
  }

  function roomForDecor(blocker){
    if(!world?.rooms?.length)return null;
    const direct=Number.isInteger(blocker?.roomId)?world.rooms.find(room=>room.id===blocker.roomId):null;if(direct)return direct;
    try{const id=window.CCGWorld?.roomAt?.(world,blocker.x,blocker.y);return world.rooms.find(room=>room.id===id)||null}catch(_){return null}
  }

  function doorGroups(){
    const groups=new Map();for(const d of host?.doors||[]){if(!d||d.type==="secret"||d.hidden)continue;const id=d.groupId||`single:${d.id||cellKey(d.x,d.y)}`;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(d)}return[...groups.values()]
  }

  function inferDoorOrientation(leaves){
    const first=leaves?.[0];if(first?.orientation)return first.orientation;
    if((leaves||[]).length>1){const xs=new Set(leaves.map(d=>d.x)),ys=new Set(leaves.map(d=>d.y));if(xs.size===1&&ys.size>1)return"vertical";if(ys.size===1&&xs.size>1)return"horizontal"}
    const x=first?.x,y=first?.y,left=world?.map?.[y]?.[x-1]===0,right=world?.map?.[y]?.[x+1]===0,up=world?.map?.[y-1]?.[x]===0,down=world?.map?.[y+1]?.[x]===0;
    return left&&right&&!up&&!down?"vertical":up&&down&&!left&&!right?"horizontal":left&&right?"vertical":"horizontal"
  }

  function nearAnyDoor(x,y,distance=2){return(host?.doors||[]).some(d=>d.type!=="secret"&&md(d,{x,y})<=distance)}
  function occupiedForRelocation(x,y,ignore=null){
    if(world?.map?.[y]?.[x]!==0||nearAnyDoor(x,y,2))return true;
    if((host?.blockingDecor||[]).some(d=>d!==ignore&&d.x===x&&d.y===y))return true;
    for(const list of [host?.items,host?.chests,host?.generators,host?.shrines,host?.switches,host?.shops,host?.deathCaches])if((list||[]).some(q=>q?.active!==false&&q.x===x&&q.y===y))return true;
    if((host?.enemies||[]).some(q=>q?.alive&&q.x===x&&q.y===y))return true;
    try{if((typeof allPlayers==="function"?allPlayers():[]).some(q=>q&&q.x===x&&q.y===y))return true}catch(_){}
    return false
  }

  function relocateDoorObstacle(blocker){
    if(!blocker||blocker.structural)return false;const room=roomForDecor(blocker);if(!room)return false;
    const candidates=[];for(let y=room.y+2;y<=room.y+room.h-2;y++)for(let x=room.x+2;x<=room.x+room.w-2;x++){if(occupiedForRelocation(x,y,blocker))continue;candidates.push({x,y,d:Math.abs(x-blocker.x)+Math.abs(y-blocker.y)})}
    candidates.sort((a,b)=>a.d-b.d||a.y-b.y||a.x-b.x);const q=candidates[0],decor=(world.decor||[]).find(d=>d.id===blocker.id);
    if(q){blocker.x=q.x;blocker.y=q.y;if(decor){decor.x=q.x;decor.y=q.y}return true}
    host.blockingDecor=(host.blockingDecor||[]).filter(d=>d!==blocker);if(decor)decor.destroyed=true;return true
  }

  function routeStillExists(){
    if(!world?.map||!world.start||!world.exit)return true;const start={x:Math.round(world.start.x),y:Math.round(world.start.y)},goal={x:Math.round(world.exit.x),y:Math.round(world.exit.y)};
    if(world.map[start.y]?.[start.x]!==0||world.map[goal.y]?.[goal.x]!==0)return true;
    const queue=[start],seen=new Set([cellKey(start.x,start.y)]);for(let i=0;i<queue.length&&i<22000;i++){const current=queue[i];if(current.x===goal.x&&current.y===goal.y)return true;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=current.x+dx,y=current.y+dy,key=cellKey(x,y);if(seen.has(key)||world.map[y]?.[x]!==0)continue;seen.add(key);queue.push({x,y})}}return false
  }

  function frameOccupied(x,y){
    if((host?.doors||[]).some(d=>d.x===x&&d.y===y))return true;
    if((host?.blockingDecor||[]).some(d=>d.x===x&&d.y===y))return true;
    for(const list of [host?.items,host?.chests,host?.generators,host?.shrines,host?.switches])if((list||[]).some(q=>q?.active!==false&&q.x===x&&q.y===y))return true;
    try{if((typeof allPlayers==="function"?allPlayers():[]).some(q=>q&&q.x===x&&q.y===y))return true}catch(_){}
    return false
  }

  function repairDoorConnections(){
    if(!world?.map||!host?.doors)return{moved:0,frames:0};world.doorFrameCells=world.doorFrameCells||[];let moved=0,frames=0;const doorSet=new Set(host.doors.map(d=>cellKey(d.x,d.y)));
    for(const leaves of doorGroups()){
      if(!leaves.length)continue;const orientation=inferDoorOrientation(leaves);for(const d of leaves){d.orientation=d.orientation||orientation;d._ccgAttachedFrame=true}
      const supports=[];if(orientation==="vertical"){const x=leaves[0].x,ys=leaves.map(d=>d.y);supports.push({x,y:Math.min(...ys)-1},{x,y:Math.max(...ys)+1})}else{const y=leaves[0].y,xs=leaves.map(d=>d.x);supports.push({x:Math.min(...xs)-1,y},{x:Math.max(...xs)+1,y})}
      for(const q of supports){
        if(q.x<=1||q.y<=1||q.y>=world.map.length-1||q.x>=world.map[0].length-1||doorSet.has(cellKey(q.x,q.y)))continue;
        const blocker=(host.blockingDecor||[]).find(d=>d.x===q.x&&d.y===q.y);if(blocker&&!blocker.structural&&relocateDoorObstacle(blocker))moved++;
        if(frameOccupied(q.x,q.y)||world.map[q.y]?.[q.x]!==0)continue;
        world.map[q.y][q.x]=1;if(!routeStillExists()){world.map[q.y][q.x]=0;continue}
        if(!world.doorFrameCells.some(cell=>cell.x===q.x&&cell.y===q.y))world.doorFrameCells.push({...q,orientation,groupId:leaves[0].groupId||null});frames++;
      }
    }
    if(moved||frames)host.revision=(host.revision||0)+1;return{moved,frames}
  }

  function ensureDestructibleBoxes(){
    if(!world?.decor||!host)return 0;host.blockingDecor=host.blockingDecor||[];let fixed=0;
    for(const decor of world.decor){
      if(!decor||decor.destroyed||!BOX_TYPES.has(String(decor.type||"")))continue;decor.structural=false;decor.blocking=true;let blocker=host.blockingDecor.find(row=>row.id===decor.id);
      if(!blocker){blocker={id:decor.id,x:decor.x,y:decor.y,type:decor.type,roomId:decor.roomId,hp:Math.max(1,Number(decor.hp||2)),maxHp:Math.max(1,Number(decor.maxHp||decor.hp||2)),structural:false};host.blockingDecor.push(blocker);fixed++}
      else{if(blocker.structural){blocker.structural=false;fixed++}if(!Number.isFinite(Number(blocker.hp))||Number(blocker.hp)<=0){blocker.hp=Math.max(1,Number(decor.hp||2));fixed++}blocker.maxHp=Math.max(Number(blocker.maxHp||0),Number(blocker.hp||2));decor.hp=blocker.hp;decor.maxHp=blocker.maxHp}
    }
    if(fixed)host.revision=(host.revision||0)+1;return fixed
  }

  function installChestFrameGutters(){
    try{
      if(typeof lostSizzlerPixelAssets==="undefined")return false;const source=lostSizzlerPixelAssets.chests;if(!source||source.__ccgV136Guttered)return false;
      const build=()=>{if(!source.naturalWidth||!source.naturalHeight||source.naturalWidth%32||source.naturalHeight%32)return;const canvas=document.createElement("canvas");canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;const g=canvas.getContext("2d");if(!g)return;g.imageSmoothingEnabled=false;g.clearRect(0,0,canvas.width,canvas.height);for(let y=0;y<source.naturalHeight;y+=32)for(let x=0;x<source.naturalWidth;x+=32)g.drawImage(source,x+1,y+1,30,30,x+1,y+1,30,30);const clean=new Image();clean.onload=()=>{clean.__ccgV136Guttered=true;lostSizzlerPixelAssets.chests=clean};clean.src=canvas.toDataURL("image/png")};
      if(source.complete)build();else source.addEventListener("load",build,{once:true});return true
    }catch(error){console.warn("[Lost Sizzler V10.36] chest frame gutter pass skipped",error);return false}
  }

  function renderOwnershipAudit(){
    return Object.freeze({
      normalDoors:"V10.35 environment atlas only; legacy door renderer retained only for closed secret masonry",
      wallTorches:"V10.35 environment atlas only; legacy wall-light flames are suppressed",
      standardEnemies:"V10.35 enemy atlases replace the procedural standard-enemy sprite path once loaded",
      player:"V10.34 explorer sheet replaces the procedural player body once loaded; V10.35 isolates frame edges",
      chests:"V10.34 chest sheet replaces the procedural chest drawing once loaded; V10.36 isolates chest frame edges",
      intentionalLegacy:["secret-door masonry","carried player torch flame","fireplaces","special enemies without V10.35 atlas rows"],
      noDoubleDrawPolicy:true
    })
  }

  function repairSignature(){const active=specialActive(),floor=typeof run!=="undefined"?run?.floor||0:0;return`${floor}|${active?.type||"dungeon"}|${active?.state?.round||0}|${host?.doors?.length||0}|${world?.decor?.length||0}|${world?._v135SpyDoorMap?1:0}`}
  function repairWorldIfNeeded(force=false){
    if(typeof world==="undefined"||typeof host==="undefined"||!world||!host)return false;const signature=repairSignature();if(!force&&state.lastWorld===world&&state.lastRepairSignature===signature)return false;
    ensureDestructibleBoxes();repairDoorConnections();state.lastWorld=world;state.lastRepairSignature=signature;return true
  }

  function installRuntime(){
    if(state.runtimeInstalled)return true;
    if(typeof window.renderInventoryPanel!=="function"||!window.CCGLostSizzlerSpecialModes||!window.CCGLostSizzlerSaboteurs)return false;
    captureInventoryChrome();
    const legacyRender=window.renderInventoryPanel;
    window.renderInventoryPanel=function renderInventoryPanelV136(){if(spyActive())return renderSpyInventoryPanel();restoreInventoryChrome();return legacyRender.apply(this,arguments)};
    if(typeof window.startWorld==="function"){
      const oldStart=window.startWorld;window.startWorld=function startWorldV136DoorFurnitureAudit(){const result=oldStart.apply(this,arguments);try{repairWorldIfNeeded(true)}catch(error){console.warn("[Lost Sizzler V10.36] world repair failed",error)}return result};
    }
    if(typeof window.update==="function"){
      const oldUpdate=window.update;window.update=function updateV136DoorFurnitureAudit(dt){const result=oldUpdate.apply(this,arguments);try{repairWorldIfNeeded(false)}catch(error){console.warn("[Lost Sizzler V10.36] live repair failed",error)}return result};
    }
    const special=window.CCGLostSizzlerSpecialModes;
    if(special?.startOnline&&!special.__v136DoorInventoryWrapped){
      const oldStart=special.startOnline.bind(special),oldStop=special.stop?.bind(special);
      special.startOnline=function startOnlineV136(){const result=oldStart.apply(special,arguments);try{repairWorldIfNeeded(true)}catch(_){}return result};
      if(oldStop)special.stop=function stopV136(){restoreInventoryChrome();return oldStop.apply(special,arguments)};
      special.__v136DoorInventoryWrapped=true;
    }
    installChestFrameGutters();repairWorldIfNeeded(true);
    state.runtimeInstalled=true;
    window.CCGLostSizzlerV136={renderSpyInventoryPanel,repairDoorConnections,ensureDestructibleBoxes,repairWorldIfNeeded,renderOwnershipAudit,installChestFrameGutters,get state(){return state}};
    return true
  }

  function hookReleaseGate(){
    const gate=window.CCGLostSizzlerReleaseGate;if(!gate)return false;
    if(!gate.__v136Hooked){
      const oldFinish=gate.finish;
      gate.finish=function finishV136(errors=[]){installRuntime();finishLoading(errors);return oldFinish.apply(this,arguments)};
      gate.__v136Hooked=true;
    }
    state.gateHooked=true;
    if(gate.state?.ready){installRuntime();finishLoading([])}else if(gate.state?.failed)finishLoading(gate.state.errors||["load failed"]);
    return true
  }

  function startHooking(){
    if(hookReleaseGate()&&window.CCGLostSizzlerReleaseGate?.state?.ready)installRuntime();
    state.hookTimer=setInterval(()=>{
      hookReleaseGate();
      if(window.CCGLostSizzlerReleaseGate?.state?.ready&&installRuntime()){clearInterval(state.hookTimer);state.hookTimer=0}
    },60);
  }

  window.addEventListener("pagehide",()=>{if(state.loadingTimer)clearInterval(state.loadingTimer);if(state.hookTimer)clearInterval(state.hookTimer);state.observer?.disconnect?.()},{once:true});
  ensureStyles();startLoadingWatch();startHooking();
})();
