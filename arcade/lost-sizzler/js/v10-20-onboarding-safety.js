/* The Lost Sizzler V10.20 — gentle opening, welcome, tutorial zone and dossier identity safety. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_ONBOARDING_SAFETY_V120__)return;
  window.__CCG_LOST_SIZZLER_ONBOARDING_SAFETY_V120__=true;

  const SEEN="ccg-lost-sizzler-tutorial-seen-v1";
  const COMPLETE="ccg-lost-sizzler-tutorial-complete-v1";
  const VERIFIED="ccg-lost-sizzler-verified-enemies-v1";
  const BLOCKED="ccg-lost-sizzler-player-dossier-block-v1";
  const state={forceTutorial:false,choiceAccepted:false,tutorialRequested:false,active:false,step:0,start:null,moved:false,movementDistance:0,movementDirections:new Set(),lastMovement:new Map(),fired:false,swingCount:0,dashed:false,dashCount:0,inventoryOpened:false,inventoryClosed:false,pendingBegin:null,lockedDoors:[],panel:null,progressPanel:null,choice:null,welcomeForRun:false,autoAdvanceTimer:0,completionBanner:null,installed:{begin:false,startWorld:false,actions:false,dossier:false}};
  const readFlag=k=>{try{return localStorage.getItem(k)==="true"}catch(_){return false}};
  const writeFlag=(k,v=true)=>{try{localStorage.setItem(k,String(Boolean(v)))}catch(_){}};
  const norm=v=>String(v||"").trim().toLowerCase();
  const readSet=k=>{try{const x=JSON.parse(localStorage.getItem(k)||"[]");return new Set(Array.isArray(x)?x.map(norm):[])}catch(_){return new Set()}};
  const writeSet=(k,set)=>{try{localStorage.setItem(k,JSON.stringify([...set]))}catch(_){}};
  const readVerified=()=>readSet(VERIFIED),readBlocked=()=>readSet(BLOCKED);
  const markVerified=name=>{const key=norm(name);if(!key)return;const set=readVerified();if(set.has(key))return;set.add(key);writeSet(VERIFIED,set)};
  const blockPlayerEnemyName=name=>{const key=norm(name);if(!key)return;const set=readBlocked();if(set.has(key))return;set.add(key);writeSet(BLOCKED,set)};
  const playerNames=()=>{const set=new Set(),input=document.getElementById("player-name");try{if(p1?.name)set.add(norm(p1.name));if(p2?.name)set.add(norm(p2.name))}catch(_){}if(input?.value)set.add(norm(input.value));return set};

  function ensureStyle(){
    if(document.getElementById("ccg-onboarding-style"))return;
    const s=document.createElement("style");s.id="ccg-onboarding-style";s.textContent=`
      #ccg-tutorial-choice{z-index:10040}#ccg-tutorial-choice .panel{max-width:720px}
      #ccg-tutorial-choice .tutorial-kicker,.ccg-tutorial-rail .tutorial-kicker{font-size:.72rem;letter-spacing:.15em;color:#6cecff;font-weight:900}
      #ccg-tutorial-choice .tutorial-choice-actions,.ccg-tutorial-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}
      #ccg-tutorial-choice .tutorial-choice-actions button{min-width:210px}
      .ccg-tutorial-rail{border:1px solid rgba(108,236,255,.45);background:rgba(8,10,18,.96);padding:14px;border-radius:10px;margin-bottom:12px;box-shadow:0 0 24px rgba(108,236,255,.08)}
      .ccg-tutorial-rail h3{margin:5px 0 7px;color:#ffd85a;font-size:1rem}.ccg-tutorial-rail p{margin:0 0 8px;line-height:1.45}.ccg-tutorial-rail .tutorial-detail{font-size:.82rem;opacity:.86}
      .ccg-tutorial-progress{height:5px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden;margin:10px 0}.ccg-tutorial-progress span{display:block;height:100%;background:#6cecff}
      .ccg-tutorial-doit{display:block;color:#72ff9b;font-weight:900;font-size:.76rem;letter-spacing:.06em;margin:7px 0}.ccg-tutorial-done{display:block;color:#6cecff;font-weight:900;font-size:.76rem;letter-spacing:.06em;margin:7px 0}
      .ccg-tutorial-actions button{font-size:.76rem;padding:8px 10px}body[data-tutorial-active="true"] #mission-text{color:#ffd85a}
      @keyframes ccgTutorialCoachIn{from{opacity:0;transform:translate(-50%,16px) scale(.97)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
      @keyframes ccgTutorialCoachPulse{0%,100%{box-shadow:0 12px 38px rgba(0,0,0,.62),0 0 0 1px rgba(108,236,255,.18)}50%{box-shadow:0 12px 38px rgba(0,0,0,.62),0 0 28px rgba(108,236,255,.2)}}
      #ccg-tutorial-live-progress{position:fixed;z-index:10090;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);min-width:min(590px,calc(100vw - 28px));padding:12px 18px;border:1px solid rgba(108,236,255,.78);border-radius:13px;background:linear-gradient(135deg,rgba(19,13,31,.98),rgba(4,12,21,.98));box-shadow:0 12px 38px rgba(0,0,0,.62),inset 0 1px rgba(255,255,255,.06);text-align:center;color:#f1edf7;font:800 .8rem/1.5 monospace;letter-spacing:.04em;animation:ccgTutorialCoachIn .22s ease-out,ccgTutorialCoachPulse 2s ease-in-out infinite}
      #ccg-tutorial-live-progress:before{content:"TRAINING CONTROL";display:block;margin-bottom:5px;color:#6cecff;font-size:.62rem;letter-spacing:.2em}
      #ccg-tutorial-live-progress b{color:#ffd85a;font-size:.88rem}#ccg-tutorial-live-progress .done,#ccg-tutorial-live-progress .todo{display:inline-block;margin:3px 1px;padding:3px 7px;border-radius:6px;background:rgba(255,255,255,.055)}#ccg-tutorial-live-progress .done{color:#72ff9b;border:1px solid rgba(114,255,155,.35)}#ccg-tutorial-live-progress .todo{color:#c8c1d0;border:1px solid rgba(255,255,255,.09)}#ccg-tutorial-live-progress .control-key{display:inline-block;min-width:44px;margin:0 4px;padding:3px 9px;border:1px solid #ffd85a;border-bottom-width:3px;border-radius:6px;background:#20182c;color:#fff5bd;box-shadow:0 0 14px rgba(255,216,90,.16)}
      #ccg-tutorial-complete-banner{margin:0 0 14px;padding:12px 14px;border:1px solid rgba(114,255,155,.55);border-radius:10px;background:rgba(16,52,34,.46);box-shadow:0 0 22px rgba(114,255,155,.12)}
      #ccg-tutorial-complete-banner b{display:block;color:#72ff9b;letter-spacing:.08em;margin-bottom:4px}#ccg-tutorial-complete-banner span{display:block;line-height:1.4}
      @media(max-width:700px){.ccg-tutorial-rail{padding:10px}.ccg-tutorial-rail p{font-size:.82rem}#ccg-tutorial-choice .tutorial-choice-actions button{width:100%}}
    `;document.head.appendChild(s);
  }

  const STEPS=[
    ["move","MOVE AROUND","Use WASD or the arrow keys. On mobile, use the movement control. Move at least once in every direction: up, down, left and right.","The direction tracker remains on screen until all four movements have registered."],
    ["fire","SWING YOUR SWORD","Press SPACE to swing the sword three times. On mobile, hold or tap FIRE until three complete swings register.","Holding FIRE repeats the sword swing after each attack cooldown, just like automatic fire."],
    ["dash","DASH","Press LEFT SHIFT while moving to dash three times. Player 2 can use either Ctrl key. On mobile, use DASH.","The counter advances only when the dash action is actually performed."],
    ["inventory","OPEN AND CLOSE THE INVENTORY","Press TAB to open Inventory & Objective, then close it again.","You begin with limited carrying space. Potions, torches, teleports and artefacts use inventory capacity; shops can expand it."],
    ["objective","OBJECTIVES, RADAR & HINTS","Every floor has a main objective. Read the MISSION strip and Inventory objective text, then use the tactical radar to understand explored routes.","If objective progress stalls, hints escalate from a reminder to a direction and finally a temporary radar marker."],
    ["survival","HEALTH, ARMOUR & QUICK ITEMS","Armour absorbs damage before health. E uses a Potion, Q a Torch, R a Teleport spell, and C can close a nearby door.","Health packs restore HP immediately. Normal deaths can leave a recoverable death cache; Weekly Vault death ends that ranked attempt."],
    ["keys","KEYS, DOORS & CHESTS","Main keys advance objectives. Bronze keys open optional bronze doors or locked chests. The Exit Sigil is exposed only after its reinforced defenders are beaten.","The keyring shows Main, Bronze and Sigil counts. Approach doors and chests in the dungeon view; interaction results appear in the report panel."],
    ["threats","ENEMIES, NAMED ENEMIES & THE STALKER","Danger rises deeper into the map. Early rooms are deliberately lighter and special hordes are kept away from the opening stretch.","The enemy dossier records an entry only when that actual named enemy is encountered. Permanently banishing the Death Stalker with a Banishment Flask awards a large score bonus and can produce a rare Banishment Artefact; use B when the prompt appears in range."],
    ["rare","RARE EVENTS, SHOPS, HAZARDS & SCORE","Some floors contain uncommon events such as Mimics, the Gilded Elf, merchants, treasure encounters, mutations and very rare vortex pits.","Enemies normally avoid traps and vortex pits, but gunfire can knock them into hazards. Score buys supplies and matters in the Weekly Vault."],
    ["finish","TUTORIAL COMPLETE","You Are Ready To Take On The Adventure! Finishing training returns you to the main options instead of starting a run automatically.","Choose Play Solo when you are ready, or choose Tutorial again whenever you want another practice run."]
  ];

  function ensureChoice(){
    ensureStyle();if(state.choice?.isConnected)return state.choice;
    const hostNode=document.querySelector(".game-area")||document.body,wrap=document.createElement("div");wrap.id="ccg-tutorial-choice";wrap.className="overlay hidden";wrap.innerHTML=`<div class="panel compact"><span class="tutorial-kicker">START OPTIONS</span><h2>Play or use the Tutorial?</h2><p>The Tutorial Zone is a safe Training Archive that teaches the controls and the important dungeon systems in order.</p><p>You can take the tutorial as often as you like. Choosing Play Game starts the normal dungeon immediately.</p><div class="tutorial-choice-actions"><button type="button" class="primary" data-tutorial-enter>TUTORIAL</button><button type="button" data-tutorial-skip>PLAY GAME</button></div></div>`;hostNode.appendChild(wrap);state.choice=wrap;
    wrap.querySelector("[data-tutorial-enter]")?.addEventListener("click",()=>resolveChoice(true));wrap.querySelector("[data-tutorial-skip]")?.addEventListener("click",()=>resolveChoice(false));return wrap;
  }
  function showChoice(args){state.pendingBegin={args};ensureChoice().classList.remove("hidden");try{input?.clear?.()}catch(_){}}
  function resolveChoice(tutorial){
    writeFlag(SEEN,true);state.tutorialRequested=Boolean(tutorial);state.choice?.classList.add("hidden");const p=state.pendingBegin;state.pendingBegin=null;if(!p)return false;
    state.choiceAccepted=true;try{return beginRun.apply(window,p.args)}finally{state.choiceAccepted=false}
  }
  function ensureMenuButton(){if(document.getElementById("tutorial-zone-btn"))return;const row=document.querySelector("#menu .secondary-menu")||document.querySelector("#menu .menu-buttons");if(!row)return;const b=document.createElement("button");b.id="tutorial-zone-btn";b.type="button";b.textContent="Tutorial Zone";b.title="Start the safe Lost Sizzler tutorial";b.addEventListener("click",()=>{state.forceTutorial=true;state.tutorialRequested=true;state.choiceAccepted=true;try{startSolo()}finally{state.choiceAccepted=false;setTimeout(()=>state.forceTutorial=false,0)}});row.insertBefore(b,row.firstChild)}

  function showCompletionBanner(skipped=false){
    ensureStyle();state.completionBanner?.remove?.();const panel=document.querySelector("#menu .panel");if(!panel)return;
    const banner=document.createElement("div");banner.id="ccg-tutorial-complete-banner";banner.innerHTML=skipped?'<b>TUTORIAL ENDED</b><span>You are back at the game options. Choose Tutorial to practise again or Play Solo when you are ready.</span>':'<b>TUTORIAL COMPLETE</b><span>You Are Ready To Take On The Adventure! Choose Play Solo to start the dungeon, or Tutorial to run through the training again.</span>';
    const anchor=panel.querySelector(".hero-logo");if(anchor?.nextSibling)panel.insertBefore(banner,anchor.nextSibling);else panel.prepend(banner);state.completionBanner=banner;
  }

  function announceWelcome(daily=false,tutorial=false){
    if(state.welcomeForRun&&!tutorial)return;state.welcomeForRun=true;const title=tutorial?"WELCOME — TUTORIAL ZONE":daily?"WELCOME — WEEKLY HIGH-SCORE VAULT":"WELCOME TO THE LOST SIZZLER",text=tutorial?"This Training Archive is safe. Learn the essentials here, then return to the options when training is complete.":daily?"One ranked attempt. Read the objective, protect your health and make it count.":"Read the mission, use the radar and take the opening rooms steadily. Danger increases deeper into the dungeon.";try{showToast(title,text,tutorial?"green":"cyan",9000)}catch(_){}
  }

  const depth=id=>Math.max(0,Number(world?.rooms?.[id]?.depth||0));
  function removeEnemyIds(ids){const set=new Set(ids||[]);if(set.size)host.enemies=(host.enemies||[]).filter(e=>!set.has(e.id))}
  function clearSpiderNest(){const n=host?.spiderNest;if(!n)return;removeEnemyIds(n.enemyIds);const r=world?.rooms?.[n.roomId];if(r){r.spiderNest=false;r.verminRoom=false;r.dangerous=false;if(r.originalTheme)r.theme=r.originalTheme}host.spiderNest=null;if(world?.hauntedCorridor?.roomId===n.roomId)world.hauntedCorridor=null}
  function clearSkeletonHorde(){const h=host?.skeletonHorde;if(!h)return;removeEnemyIds(h.enemyIds);const r=world?.rooms?.[h.roomId];if(r){r.skeletonHorde=false;r.dangerous=false}host.skeletonHorde=null}
  function applyGentleOpening(){
    if(!world||!host||!run)return;const floor=Math.max(1,Number(run.floor||1)),safeDepth=floor===1?2:1;
    if(floor===1||depth(host.spiderNest?.roomId)<=safeDepth)clearSpiderNest();if(floor===1||depth(host.skeletonHorde?.roomId)<=safeDepth)clearSkeletonHorde();
    if(Array.isArray(host.hazardRooms)){const bad=new Set(host.hazardRooms.filter(h=>depth(h.roomId)<=safeDepth).map(h=>h.roomId));host.hazardRooms=host.hazardRooms.filter(h=>!bad.has(h.roomId));for(const id of bad){const r=world.rooms?.[id];if(r){r.dedicatedHazard=false;r.dangerous=false}}}
    for(const t of host.traps||[])if(depth(t.roomId)<=safeDepth)t.active=false;if(host.boulderTrap&&depth(host.boulderTrap.roomId)<=safeDepth)host.boulderTrap=null;for(const g of host.generators||[])if(depth(g.roomId)<=safeDepth)g.spawnCooldown=Math.max(Number(g.spawnCooldown||0),floor===1?18000:12000);
    const grouped=new Map();for(const e of host.enemies||[]){if(!e?.alive)continue;const rid=window.CCGWorld?.roomAt?.(world,e.x,e.y)??-1;if(rid<0||depth(rid)>safeDepth)continue;if(!grouped.has(rid))grouped.set(rid,[]);grouped.get(rid).push(e)}const remove=new Set();
    for(const [rid,enemies] of grouped){const limit=floor===1?(depth(rid)<=1?1:2):2,ordinary=[];for(const e of enemies){const nasty=Boolean(e.follower||e.spider||e.skeleton||e.knight||e.guardian||e.mimicEnemy||e.deathStalker||e.sigilPraetorian||e.sigilWarden||e.charger||e.firebreather);if(nasty)remove.add(e.id);else ordinary.push(e)}ordinary.sort((a,b)=>String(a.id).localeCompare(String(b.id)));for(const e of ordinary.slice(limit))remove.add(e.id)}if(remove.size)host.enemies=host.enemies.filter(e=>!remove.has(e.id));host.revision=(host.revision||0)+1;
  }
  function softenRareOpening(){if(!world||!host||!run)return;const safeDepth=Number(run.floor||1)===1?2:1;for(const c of host.chests||[]){if(!c?.mimicChest)continue;const rid=Number(c.roomId??window.CCGWorld?.roomAt?.(world,c.x,c.y)??-1);if(rid>=0&&depth(rid)<=safeDepth){c.mimicChest=false;c.mimicDormant=false}}const rare=window.CCGLostSizzlerRareEvents?.state;if(rare?.golden&&depth(rare.golden.roomId)<=safeDepth){const r=world.rooms?.[rare.golden.roomId];if(r)r.goldenRoom=false;rare.golden=null}for(const key of ["bat","taxman"]){const e=rare?.plans?.[key];if(!e)continue;const rid=Number(e.roomId??window.CCGWorld?.roomAt?.(world,e.x,e.y)??-1);if(rid>=0&&depth(rid)<=safeDepth){e._rareResolved=true;e.alive=false;delete rare.plans[key]}}}

  function ensureTutorialPanel(){if(state.panel?.isConnected)return state.panel;const rail=document.querySelector(".game-message-rail");if(!rail)return null;const p=document.createElement("section");p.id="ccg-tutorial-rail";p.className="ccg-tutorial-rail";rail.insertBefore(p,rail.firstChild);state.panel=p;return p}
  function stepReady(s){if(!s)return true;if(s[0]==="move")return state.movementDirections.size>=4;if(s[0]==="fire")return state.swingCount>=3;if(s[0]==="dash")return state.dashCount>=3;if(s[0]==="inventory")return state.inventoryOpened&&state.inventoryClosed;return true}
  function actionProgress(kind){
    if(kind==="move")return `<b>DIRECTIONS</b> ${[["up","↑ UP"],["down","↓ DOWN"],["left","← LEFT"],["right","→ RIGHT"]].map(([key,label])=>`<span class="${state.movementDirections.has(key)?"done":"todo"}">${state.movementDirections.has(key)?"✓":"○"} ${label}</span>`).join(" &nbsp; ")}`;
    if(kind==="fire")return `<b>SWORD SWINGS</b> <span class="${state.swingCount>=3?"done":"todo"}">${Math.min(3,state.swingCount)} / 3</span>`;
    if(kind==="dash")return `<b>DASHES</b> <span class="${state.dashCount>=3?"done":"todo"}">${Math.min(3,state.dashCount)} / 3</span>`;
    if(kind==="inventory"&&!state.inventoryOpened)return `<b>OPEN INVENTORY</b><br>Press <span class="control-key">TAB</span> on keyboard or tap <span class="control-key">ITEMS</span> on the touch controls.`;
    if(kind==="inventory"&&!state.inventoryClosed)return `<b>NOW CLOSE INVENTORY</b><br>Press <span class="control-key">TAB</span> again, tap <span class="control-key">ITEMS</span>, or use the close button.`;
    if(kind==="inventory")return `<b>INVENTORY COMPLETE</b> <span class="done">✓ OPENED</span> <span class="done">✓ CLOSED</span>`;
    return"";
  }
  function renderLiveProgress(kind){let panel=state.progressPanel;if(!panel?.isConnected){panel=document.createElement("div");panel.id="ccg-tutorial-live-progress";(document.querySelector(".ccg-game")||document.body).appendChild(panel);state.progressPanel=panel}panel.innerHTML=actionProgress(kind)}
  function renderStep(){
    if(!state.active)return;const s=STEPS[state.step]||STEPS[STEPS.length-1],isReady=stepReady(s),interactive=["move","fire","dash","inventory"].includes(s[0]),p=ensureTutorialPanel();if(!p)return;const pct=Math.round(((state.step+1)/STEPS.length)*100);
    const progressCopy=interactive?(isReady?'<span class="ccg-tutorial-done">DONE — LOADING NEXT STEP…</span>':'<span class="ccg-tutorial-doit">DO THIS NOW TO CONTINUE</span>'):"";
    const actionCopy=interactive?'<button type="button" data-skip>Exit Tutorial</button>':s[0]==="finish"?'<button class="primary" type="button" data-finish>Complete Tutorial</button>':'<button class="primary" type="button" data-next>Continue</button><button type="button" data-skip>Exit Tutorial</button>';
    p.innerHTML=`<span class="tutorial-kicker">TUTORIAL ZONE • ${state.step+1}/${STEPS.length}</span><h3>${s[1]}</h3><p>${s[2]}</p><p class="tutorial-detail">${s[3]}</p><div class="ccg-tutorial-progress"><span style="width:${pct}%"></span></div>${progressCopy}<div class="ccg-tutorial-actions">${actionCopy}</div>`;
    if(interactive)renderLiveProgress(s[0]);else{state.progressPanel?.remove?.();state.progressPanel=null}
    p.querySelector("[data-next]")?.addEventListener("click",advance);p.querySelector("[data-finish]")?.addEventListener("click",()=>finishTutorial(false));p.querySelector("[data-skip]")?.addEventListener("click",()=>finishTutorial(true));
    try{UI.mission.textContent=`TUTORIAL — ${s[1]}`;UI.surroundings.textContent="Training Archive — safe area. Complete the current step to continue."}catch(_){}
  }
  function advance(){clearTimeout(state.autoAdvanceTimer);state.autoAdvanceTimer=0;state.step=Math.min(STEPS.length-1,state.step+1);renderStep()}
  function completeInteractive(kind){
    if(!state.active||STEPS[state.step]?.[0]!==kind)return false;
    if(kind==="move")state.moved=state.movementDirections.size>=4;
    if(kind==="fire"){state.swingCount=Math.min(3,state.swingCount+1);state.fired=state.swingCount>=3;renderStep()}
    if(kind==="dash"){state.dashCount=Math.min(3,state.dashCount+1);state.dashed=state.dashCount>=3;renderStep()}
    if(kind==="inventory"&&!(state.inventoryOpened&&state.inventoryClosed))return false;
    if(!stepReady(STEPS[state.step]))return false;
    renderStep();
    if(state.autoAdvanceTimer)return true;
    state.autoAdvanceTimer=setTimeout(()=>{state.autoAdvanceTimer=0;if(state.active&&STEPS[state.step]?.[0]===kind&&stepReady(STEPS[state.step]))advance()},1000);return true;
  }
  function note(kind){if(!state.active||STEPS[state.step]?.[0]!==kind)return;completeInteractive(kind)}
  function resetMovementTracking(){state.movementDistance=0;state.movementDirections=new Set();state.lastMovement=new Map();for(const p of typeof localPlayers==="function"?localPlayers():[p1,p2].filter(Boolean))state.lastMovement.set(p.id||p,{x:Number(p.x||0),y:Number(p.y||0)})}
  function recordMovement(p,before){if(!state.active||STEPS[state.step]?.[0]!=="move"||!p)return;const bx=Number(before?.x??p.x??0),by=Number(before?.y??p.y??0),ax=Number(p.x||0),ay=Number(p.y||0),dx=Math.sign(ax-bx),dy=Math.sign(ay-by),d=Math.abs(ax-bx)+Math.abs(ay-by);if(d<=0)return;state.movementDistance+=d;if(dx<0)state.movementDirections.add("left");if(dx>0)state.movementDirections.add("right");if(dy<0)state.movementDirections.add("up");if(dy>0)state.movementDirections.add("down");state.lastMovement.set(p.id||p,{x:ax,y:ay});renderStep();if(state.movementDirections.size>=4)completeInteractive("move")}
  function syncInventoryTutorial(){
    if(!state.active||STEPS[state.step]?.[0]!=="inventory")return;
    try{const visible=Boolean(UI?.inventory&&!UI.inventory.classList.contains("hidden"));if(visible){if(!state.inventoryOpened){state.inventoryOpened=true;renderStep()}}else if(state.inventoryOpened&&!state.inventoryClosed){state.inventoryClosed=true;completeInteractive("inventory")}}catch(_){}
  }
  function watchTutorialProgress(){
    if(!state.active)return;
    if(STEPS[state.step]?.[0]==="move"){
      for(const p of typeof localPlayers==="function"?localPlayers():[p1,p2].filter(Boolean)){
        const key=p.id||p,prev=state.lastMovement.get(key)||{x:Number(p.x||0),y:Number(p.y||0)},now={x:Number(p.x||0),y:Number(p.y||0)};state.lastMovement.set(key,now);if(now.x!==prev.x||now.y!==prev.y){recordMovement(p,prev);break}
      }
    }
    syncInventoryTutorial();
  }
  function handleTutorialKeydown(event){
    if(!state.active||event.repeat)return;const step=STEPS[state.step]?.[0];
    if(step==="inventory"&&event.code==="Tab")setTimeout(syncInventoryTutorial,40);
  }
  function handleTutorialPointer(event){
    if(!state.active)return;const action=event.target?.closest?.("[data-action]")?.dataset?.action,step=STEPS[state.step]?.[0];if(!action)return;
    if(step==="inventory"&&["inventory","items"].includes(action))setTimeout(syncInventoryTutorial,40);
  }
  function lockDoors(){state.lockedDoors=[];for(const d of host?.doors||[]){if(Number(d.roomId)!==Number(world?.startRoomId))continue;state.lockedDoors.push([d,d.locked,d.open]);d.locked=true;d.open=false;d._tutorialLock=true}}
  function unlockDoors(){for(const [d,l,o] of state.lockedDoors){d.locked=l;d.open=o;delete d._tutorialLock}state.lockedDoors=[]}
  function activateTutorial(){if(!state.tutorialRequested||!world||!host||!p1||run?.daily||playMode==="online")return;state.active=true;state.step=0;state.moved=state.fired=state.dashed=state.inventoryOpened=state.inventoryClosed=false;state.swingCount=0;state.dashCount=0;state.start={x:p1.x,y:p1.y};clearTimeout(state.autoAdvanceTimer);state.autoAdvanceTimer=0;resetMovementTracking();document.body.dataset.tutorialActive="true";if(window.CCGWorld?.themes&&!window.CCGWorld.themes.TRAINING_ARCHIVE)window.CCGWorld.themes.TRAINING_ARCHIVE={name:"Training Archive",floor:"#101720",alt:"#17212c",wall:"#315f78",hi:"#64a8c7",accent:"#72ff9b",message:"TRAINING ARCHIVE — safe area before the dungeon.",motif:"shelves"};const r=world.rooms?.[world.startRoomId];if(r){r._tutorialTheme=r.theme;r.theme="TRAINING_ARCHIVE";r.tutorialZone=true;r.dangerous=false}host.enemies=(host.enemies||[]).filter(e=>window.CCGWorld?.roomAt?.(world,e.x,e.y)!==world.startRoomId);lockDoors();announceWelcome(false,true);renderStep()}
  function finishTutorial(skipped=false){
    if(!state.active)return;state.active=false;state.tutorialRequested=false;clearTimeout(state.autoAdvanceTimer);state.autoAdvanceTimer=0;document.body.dataset.tutorialActive="false";unlockDoors();state.panel?.remove();state.panel=null;state.progressPanel?.remove?.();state.progressPanel=null;window.CCGLostSizzlerVoice?.stop?.("tutorial-end");writeFlag(SEEN,true);if(!skipped)writeFlag(COMPLETE,true);state.welcomeForRun=false;
    setTimeout(async()=>{
      try{if(typeof quitToMenu==="function")await quitToMenu();else{if(typeof mode!=="undefined")mode="menu";document.getElementById("menu")?.classList.remove("hidden");document.body.dataset.runActive="false"}}catch(error){console.warn("[Lost Sizzler] tutorial return-to-menu failed",error);document.getElementById("menu")?.classList.remove("hidden")}
      showCompletionBanner(skipped);
      try{showToast(skipped?"TUTORIAL ENDED":"TUTORIAL COMPLETE",skipped?"Returned to the game options.":"Training complete. You are back at the game options.",skipped?"cyan":"green",7000)}catch(_){}
      try{S?.stopAll?.()}catch(_){}
    },120);
  }
  function afterRunStarted(daily=false){state.welcomeForRun=false;applyGentleOpening();setTimeout(softenRareOpening,0);if(state.tutorialRequested&&!daily)setTimeout(activateTutorial,80);else announceWelcome(daily,false)}

  function installBegin(){if(state.installed.begin||typeof beginRun!=="function")return;const original=beginRun;beginRun=function(opts={}){const daily=Boolean(opts?.daily),online=Boolean(opts?.online),split=Boolean(opts?.split);if(!state.choiceAccepted&&!daily&&!online&&!split){showChoice(Array.from(arguments));return false}const result=original.apply(this,arguments);afterRunStarted(daily);return result};state.installed.begin=true}
  function installWorld(){if(state.installed.startWorld||typeof startWorld!=="function")return;const original=startWorld;startWorld=function(){const result=original.apply(this,arguments);try{applyGentleOpening();setTimeout(softenRareOpening,0)}catch(e){console.warn("[Lost Sizzler] gentle opening pass failed",e)}return result};state.installed.startWorld=true}
  function actionChainHasMarker(fn,marker,limit=64){
    const seen=new Set();let current=fn,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth++<limit){
      try{if(current[marker])return true}catch(_){}
      seen.add(current);current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null
    }
    return false
  }
  function installActions(){
    let n=0;
    if(typeof movePlayer==="function"){
      if(!actionChainHasMarker(movePlayer,"__tutorial")){const o=movePlayer,wrapped=function movePlayerV120Tutorial(p){const before=p?{x:p.x,y:p.y}:null,r=o.apply(this,arguments);recordMovement(p,before);return r};wrapped.__tutorial=true;wrapped.__ccgOriginal=o;movePlayer=wrapped}
      if(actionChainHasMarker(movePlayer,"__tutorial"))n++
    }
    if(typeof firePlayer==="function"){
      if(!actionChainHasMarker(firePlayer,"__tutorial")){const o=firePlayer,wrapped=function firePlayerV120Tutorial(){const r=o.apply(this,arguments);if(r!==false)note("fire");return r};wrapped.__tutorial=true;wrapped.__ccgOriginal=o;firePlayer=wrapped}
      if(actionChainHasMarker(firePlayer,"__tutorial"))n++
    }
    if(typeof dashPlayer==="function"){
      if(!actionChainHasMarker(dashPlayer,"__tutorial")){const o=dashPlayer,wrapped=function dashPlayerV120Tutorial(){const r=o.apply(this,arguments);if(r!==false)note("dash");return r};wrapped.__tutorial=true;wrapped.__ccgOriginal=o;dashPlayer=wrapped}
      if(actionChainHasMarker(dashPlayer,"__tutorial"))n++
    }
    if(typeof toggleInventory==="function"){
      if(!actionChainHasMarker(toggleInventory,"__tutorial")){const o=toggleInventory,wrapped=function toggleInventoryV120Tutorial(){const r=o.apply(this,arguments);setTimeout(syncInventoryTutorial,0);return r};wrapped.__tutorial=true;wrapped.__ccgOriginal=o;toggleInventory=wrapped}
      if(actionChainHasMarker(toggleInventory,"__tutorial"))n++
    }
    if(typeof hurtPlayer==="function"){
      if(!actionChainHasMarker(hurtPlayer,"__tutorial")){const o=hurtPlayer,wrapped=function hurtPlayerV120Tutorial(){if(state.active)return false;return o.apply(this,arguments)};wrapped.__tutorial=true;wrapped.__ccgOriginal=o;hurtPlayer=wrapped}
      if(actionChainHasMarker(hurtPlayer,"__tutorial"))n++
    }
    state.installed.actions=n>=5;
  }

  function registerPlayerNameBlocks(){
    const names=playerNames();try{for(const f of C?.followerElites||[])if(names.has(norm(f?.name)))blockPlayerEnemyName(f.name)}catch(_){}
  }
  function filterIdentityEntry(){registerPlayerNameBlocks();const blocked=readBlocked(),verified=readVerified();document.querySelectorAll("#named-dossier-list .dossier-entry").forEach(e=>{const name=norm(e.querySelector("b")?.textContent);if(name&&blocked.has(name)&&!verified.has(name))e.remove()});const root=document.getElementById("named-dossier-list");if(root&&!root.querySelector(".dossier-entry")){root.querySelector(".dossier-empty")?.remove();root.insertAdjacentHTML("beforeend",'<div class="v104-credit-empty dossier-empty">No named enemies encountered yet. Your player name never counts as an enemy encounter.</div>')}}
  function installDossier(){if(state.installed.dossier||!window.CCGLostSizzlerDossierDiscovery||typeof renderNamedDossier!=="function"||typeof updateNamedEncounters!=="function")return;const render=renderNamedDossier;renderNamedDossier=function(){const r=render.apply(this,arguments);filterIdentityEntry();return r};const update=updateNamedEncounters;updateNamedEncounters=function(){try{for(const e of host?.enemies||[])if(e?.alive&&e.follower&&localPlayers().some(p=>visibleTo(p,e.x,e.y)))markVerified(e.follower.name)}catch(_){}const r=update.apply(this,arguments);filterIdentityEntry();return r};state.installed.dossier=true;setTimeout(filterIdentityEntry,0)}

  function install(){ensureStyle();ensureChoice();ensureMenuButton();installBegin();installWorld();installActions();installDossier()}
  document.addEventListener("keydown",handleTutorialKeydown,true);document.addEventListener("pointerdown",handleTutorialPointer,true);
  const installTimer=setInterval(install,500);const progressTimer=setInterval(watchTutorialProgress,80);if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();window.addEventListener("pagehide",()=>{clearInterval(installTimer);clearInterval(progressTimer);document.removeEventListener("keydown",handleTutorialKeydown,true);document.removeEventListener("pointerdown",handleTutorialPointer,true)},{once:true});
  window.CCGLostSizzlerOnboardingV120={state,replay:()=>{state.forceTutorial=true;state.tutorialRequested=true;state.choiceAccepted=true;try{return typeof startSolo==="function"?startSolo():false}finally{state.choiceAccepted=false}},isTutorialComplete:()=>readFlag(COMPLETE),markVerifiedEnemy:markVerified,stepReadyForTest:stepReady,completeInteractiveForTest:completeInteractive,actionChainHasMarker};
})();
