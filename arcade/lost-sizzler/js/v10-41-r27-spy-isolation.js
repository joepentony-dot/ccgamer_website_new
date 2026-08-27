/* The Lost Sizzler V10.41 r27 — isolated Spy Vs Spy controls, field kit and world rules.
 *
 * Spy Vs Spy must not inherit ordinary Dungeon inventory controls or presentation.
 * This layer activates only for `sizzler-saboteurs` and deliberately leaves Solo,
 * Dungeon Multiplayer, Horde and Split Screen behaviour untouched.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R27_SPY_ISOLATION__)return;
  window.__CCG_LOST_SIZZLER_V141_R27_SPY_ISOLATION__=true;

  const BLOCKED_DUNGEON_KEYS=new Set(["KeyQ","KeyR","KeyB","Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Numpad1","Numpad2","Numpad3","Numpad4","Numpad5","Numpad6"]);
  const state={
    timer:0,moveSource:null,moveInstalled:false,damageSource:null,damageInstalled:false,
    wasSpy:false,rendering:false,protectedFurniture:0,doorsPrimed:0,doorsRecovered:0,
    fieldKitToggles:0,blockedDungeonActions:0,searchBridges:0,snapshots:new Map(),textSnapshots:new Map()
  };

  function specialModeType(){
    try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"").trim()}catch(_){return""}
  }
  const spyActive=()=>specialModeType()==="sizzler-saboteurs";
  const actorId=()=>{try{return String(net?.sessionId||p1?.id||"P1")}catch(_){return"P1"}};
  const activeMatch=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.state||null}catch(_){return null}};
  const localSpy=()=>{const match=activeMatch(),id=actorId();return match?.players?.find(player=>String(player?.id||"")===id)||match?.players?.[0]||null};
  const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const editable=target=>{try{return Boolean(target?.closest?.("input,textarea,select,[contenteditable='true'],[contenteditable='']"))}catch(_){return false}};
  const perfNow=()=>{try{return Number(performance.now())||0}catch(_){return Date.now()}};

  function remember(key,node){
    if(!node||state.snapshots.has(key))return;
    state.snapshots.set(key,{node,html:node.innerHTML,className:node.className,ariaLabel:node.getAttribute?.("aria-label"),inventoryOwner:node.dataset?.inventoryHudOwner});
  }
  function rememberText(key,node){
    if(!node||state.textSnapshots.has(key))return;
    state.textSnapshots.set(key,{node,text:node.textContent});
  }
  function rememberUi(){
    const dock=document.querySelector(".shortcut-dock"),hub=document.querySelector(".hub-inventory"),panel=document.querySelector("#inventory-panel>.inventory-panel");
    rememberText("dock-title",dock?.querySelector(".shortcut-dock-head h3"));rememberText("dock-tag",dock?.querySelector(".shortcut-dock-head span"));
    remember("dock-commands",dock?.querySelector(".command-grid"));remember("item-shortcuts",document.getElementById("item-shortcuts"));
    remember("fullscreen-hint",document.getElementById("fullscreen-hint"));
    rememberText("hub-title",hub?.querySelector(".hub-inventory-head b"));rememberText("hub-special",hub?.querySelector("#quick-specials"));remember("quick-slots",hub?.querySelector("#quick-slots"));
    rememberText("inventory-title",panel?.querySelector(".mobile-panel-head h2"));rememberText("inventory-notice",document.getElementById("inventory-mobile-notice"));remember("inventory-guide",document.getElementById("inventory-guide"));
    const potion=document.querySelector(".critical-card.potion-card"),torch=document.querySelector(".critical-card.torch-card"),keys=document.querySelector(".critical-card.keys-card"),inventory=document.querySelector(".critical-card.inventory-card");
    rememberText("potion-key",potion?.querySelector("kbd"));rememberText("potion-label",potion?.querySelector("b"));rememberText("potion-value",potion?.querySelector("strong"));rememberText("potion-note",potion?.querySelector("span"));
    rememberText("torch-key",torch?.querySelector("kbd"));rememberText("torch-label",torch?.querySelector("b"));rememberText("torch-value",torch?.querySelector("strong"));rememberText("torch-note",torch?.querySelector("span"));
    rememberText("keys-label",keys?.querySelector("b"));rememberText("keys-value",keys?.querySelector("strong"));rememberText("keys-note",keys?.querySelector("span"));
    rememberText("inventory-key",inventory?.querySelector("kbd"));rememberText("inventory-label",inventory?.querySelector("b"));rememberText("inventory-value",inventory?.querySelector("strong"));rememberText("inventory-note",inventory?.querySelector("span"));
  }
  function restoreUi(){
    for(const saved of state.snapshots.values()){
      const node=saved.node;if(!node?.isConnected)continue;
      node.innerHTML=saved.html;node.className=saved.className;
      if(saved.ariaLabel==null)node.removeAttribute?.("aria-label");else node.setAttribute?.("aria-label",saved.ariaLabel);
      if(node.dataset){if(saved.inventoryOwner==null)delete node.dataset.inventoryHudOwner;else node.dataset.inventoryHudOwner=saved.inventoryOwner;}
    }
    for(const saved of state.textSnapshots.values())if(saved.node?.isConnected)saved.node.textContent=saved.text;
    state.snapshots.clear();state.textSnapshots.clear();
    try{if(run?.specialMode==="sizzler-saboteurs")run.specialMode=null}catch(_){}
    try{window.CCGLostSizzlerInventoryHudV106?.render?.()}catch(_){}
  }

  function objectiveHeld(player,id){
    if(!player)return false;
    if(id==="case")return Boolean(player.hasCase);
    return Boolean(player.objectives?.includes?.(id)||player.looseItem===id);
  }
  const statusWord=held=>held?"HELD":"MISSING";
  const section=title=>`<div class="carried-section-label">${esc(title)}</div>`;
  function sidebarRow(key,label,value,description,tone=""){
    return `<div class="carried-item ${tone?`carried-${esc(tone)}`:""} ${value==="MISSING"?"carried-zero":""}"><div class="carried-copy"><b>${esc(label)}</b><span>${esc(description)}</span></div><div class="carried-meta">${key?`<div class="carried-action-keys"><kbd class="primary-item-key">${esc(key)}</kbd></div>`:""}<strong>${esc(value)}</strong></div></div>`;
  }
  function weaponName(player){
    const SAB=window.CCGLostSizzlerSaboteurs,weapon=player?.weapon;
    if(!weapon)return"ROLLED-UP RULEBOOK";
    if(typeof weapon==="string")return String(SAB?.WEAPONS?.[weapon]?.name||weapon).toUpperCase();
    return String(weapon.name||weapon.displayName||SAB?.WEAPONS?.[weapon.id]?.name||weapon.id||"ROLLED-UP RULEBOOK").toUpperCase();
  }
  function counterName(player){const id=player?.counter;return id?String(window.CCGLostSizzlerSaboteurs?.COUNTERS?.[id]?.name||id).toUpperCase():"NONE"}
  function trapLoadoutText(match){
    const SAB=window.CCGLostSizzlerSaboteurs,ids=Array.isArray(match?.trapLoadout)?match.trapLoadout:[];
    return ids.length?ids.map(id=>SAB?.TRAPS?.[id]?.name||id).join(" · ").toUpperCase():"NONE";
  }

  function renderSidebar(){
    const dock=document.querySelector(".shortcut-dock");if(!dock)return false;
    const head=dock.querySelector(".shortcut-dock-head"),title=head?.querySelector("h3"),tag=head?.querySelector("span"),commands=dock.querySelector(".command-grid"),items=document.getElementById("item-shortcuts");
    if(title)title.textContent="SPY VS SPY — CONTROLS & KIT";
    if(tag)tag.textContent="SPY ONLY";
    if(commands){
      commands.classList.add("base-controls","inventory-dock-controls");
      commands.innerHTML='<span><kbd>WASD</kbd><b>MOVE</b></span><span><kbd>SPACE</kbd><b>ATTACK</b></span><span><kbd>E</kbd><b>SEARCH</b></span><span><kbd>T</kbd><b>ARM TRAP</b></span><span><kbd>X</kbd><b>EXTRACT</b></span><span><kbd>C</kbd><b>CLOSE DOOR</b></span><span><kbd>SHIFT</kbd><b>DASH</b></span><span><kbd>F</kbd><b>FIELD KIT</b></span>';
    }
    if(!items)return true;
    const match=activeMatch(),player=localSpy(),rows=[section("SPY OBJECTIVE ITEMS")];
    rows.push(sidebarRow("E","SIZZLER CASE",statusWord(objectiveHeld(player,"case")),"Search furniture until you find the extraction case.","gold"));
    rows.push(sidebarRow("E","GOLDEN JOYSTICK",statusWord(objectiveHeld(player,"joystick")),"Required inside the completed Sizzler Case.","gold"));
    rows.push(sidebarRow("E","SECRET LOADING TAPE",statusWord(objectiveHeld(player,"tape")),"Required inside the completed Sizzler Case.","gold"));
    rows.push(sidebarRow("E","DUNGEON KEY",statusWord(objectiveHeld(player,"key")),"Spy objective key — not a normal Dungeon key.","gold"));
    rows.push(section("CURRENT SPY LOADOUT"));
    rows.push(sidebarRow("SPACE","WEAPON",weaponName(player),"Attack with the current Spy novelty weapon.","cyan"));
    rows.push(sidebarRow("AUTO","TRAP COUNTER",counterName(player),"Matching counters are consumed automatically when required.","purple"));
    rows.push(sidebarRow("T","TRAPS",trapLoadoutText(match),"Arm the first valid trap remaining in this round's Spy loadout.","purple"));
    rows.push(sidebarRow("F","FIELD KIT","OPEN / CLOSE","Full Spy manual, equipment and objective readout. Fullscreen remains available from the top button.","cyan"));
    items.innerHTML=rows.join("");items.dataset.inventoryHudOwner="spy-r27";
    return true;
  }

  function setText(node,value){if(node)node.textContent=value}
  function renderCriticalStrip(){
    const potion=document.querySelector(".critical-card.potion-card"),torch=document.querySelector(".critical-card.torch-card"),keys=document.querySelector(".critical-card.keys-card"),inventory=document.querySelector(".critical-card.inventory-card"),hint=document.getElementById("fullscreen-hint");
    setText(potion?.querySelector("kbd"),"E");setText(potion?.querySelector("b"),"SEARCH");setText(potion?.querySelector("strong"),"FURNITURE");setText(potion?.querySelector("span"),"FIND SPY ITEMS");
    setText(torch?.querySelector("kbd"),"T");setText(torch?.querySelector("b"),"ARM TRAP");setText(torch?.querySelector("strong"),"SPY SABOTAGE");setText(torch?.querySelector("span"),"ROUND LOADOUT");
    setText(keys?.querySelector("b"),"EXTRACT");setText(keys?.querySelector("strong"),"X");setText(keys?.querySelector("span"),"COMPLETE CASE · REACH EXTRACTION");
    setText(inventory?.querySelector("kbd"),"F");setText(inventory?.querySelector("b"),"FIELD KIT");setText(inventory?.querySelector("strong"),"SPY ITEMS & KEYS");setText(inventory?.querySelector("span"),"FULL SPY MANUAL");
    if(hint)hint.innerHTML='<b>SPY VS SPY CONTROLS</b> — <kbd>E</kbd> SEARCH · <kbd>F</kbd> FIELD KIT · USE THE FULLSCREEN BUTTON ABOVE FOR FULLSCREEN';
  }

  function renderHubKit(){
    const hub=document.querySelector(".hub-inventory");if(!hub)return;
    const player=localSpy(),match=activeMatch(),opponent=match?.players?.find(row=>row!==player),head=hub.querySelector(".hub-inventory-head b"),special=hub.querySelector("#quick-specials"),slots=hub.querySelector("#quick-slots");
    if(head)head.textContent="SPY VS SPY — OBJECTIVE CASE";
    if(special)special.textContent=`F FIELD KIT · SCORE ${Number(match?.wins?.[player?.id]||0)}-${Number(match?.wins?.[opponent?.id]||0)}`;
    if(slots){
      const chip=(label,held)=>`<div class="quick-slot ${held?"number-usable":""}"><b>${held?"✓":"—"}</b><span>${esc(label)}</span></div>`;
      slots.innerHTML=chip("CASE",objectiveHeld(player,"case"))+chip("JOYSTICK",objectiveHeld(player,"joystick"))+chip("TAPE",objectiveHeld(player,"tape"))+chip("KEY",objectiveHeld(player,"key"));
      slots.setAttribute("aria-label","Spy Vs Spy objective case");
    }
  }

  function renderFieldManualKeys(){
    const panel=document.querySelector("#inventory-panel>.inventory-panel"),guide=document.getElementById("inventory-guide"),notice=document.getElementById("inventory-mobile-notice"),title=panel?.querySelector(".mobile-panel-head h2");
    if(title)title.textContent="SPY VS SPY FIELD KIT";
    if(notice)notice.textContent="Spy-only controls and equipment. Dungeon potions, torches, teleports, quick slots and ordinary keys are disabled in this mode.";
    if(guide)guide.innerHTML='<div class="spy-controls-grid"><div><kbd>WASD / ARROWS</kbd><b>MOVE</b><span>Move around the Spy arena.</span></div><div><kbd>SPACE</kbd><b>ATTACK</b><span>Use the current Spy weapon.</span></div><div><kbd>E</kbd><b>SEARCH</b><span>Search furniture for Spy objectives and equipment.</span></div><div><kbd>T</kbd><b>ARM TRAP</b><span>Place a trap from the current round loadout.</span></div><div><kbd>X</kbd><b>EXTRACT</b><span>Extract after completing the case.</span></div><div><kbd>C</kbd><b>CLOSE DOOR</b><span>Close an open Spy room door.</span></div><div><kbd>SHIFT</kbd><b>DASH</b><span>Short movement burst.</span></div><div><kbd>F</kbd><b>FIELD KIT</b><span>Open or close this Spy-only field kit.</span></div><div><kbd>ESC</kbd><b>LEAVE MATCH</b><span>Return to the game options.</span></div></div>';
  }

  function renderSpyUi(){
    if(!spyActive()||state.rendering)return false;state.rendering=true;
    try{rememberUi();renderSidebar();renderCriticalStrip();renderHubKit();renderFieldManualKeys();state.wasSpy=true;return true}finally{state.rendering=false}
  }

  function hardenFurniture(blocker){
    if(!blocker?.spyFurniture)return false;
    const changed=blocker.structural!==true||Number(blocker.hp)!==999999||Number(blocker.maxHp)!==999999;
    blocker.structural=true;blocker.hp=999999;blocker.maxHp=999999;blocker.spyUnbreakable=true;return changed;
  }
  function protectSpyWorld(){
    if(!spyActive())return 0;let changed=0;
    try{
      for(const blocker of host?.blockingDecor||[])if(hardenFurniture(blocker))changed++;
      for(const decor of world?.decor||[])if(decor?.spyFurniture){decor.structural=true;decor.hp=999999;decor.maxHp=999999;decor.spyUnbreakable=true;decor.destroyed=false;}
      const t=perfNow();
      for(const door of host?.doors||[]){
        if(!door?.spyDoor)continue;
        if(door.locked){door.locked=false;changed++;}
        if(door.opening&&!door.open&&Number(door.openingStart||0)>0&&t-Number(door.openingStart)>1800){door.opening=false;door.open=true;door.openAt=0;door.openingStart=0;door.openSoundDone=true;state.doorsRecovered++;changed++;}
      }
      if(changed&&host)host.revision=(host.revision||0)+1;
    }catch(_){}
    state.protectedFurniture+=changed;return changed;
  }

  function primeSpyDoor(player,dx,dy){
    if(!spyActive()||!player||(!dx&&!dy))return false;
    try{
      const nx=Number(player.x)+Number(dx),ny=Number(player.y)+Number(dy),door=window.CCGWorld?.doorAt?.(host,nx,ny);
      if(!door?.spyDoor)return false;
      if(door.locked)door.locked=false;
      if(door.open)return true;
      if(!door.opening){
        if(typeof beginDoorOpening==="function")beginDoorOpening(door,420);
        else{door.opening=false;door.open=true;door.openAt=0;door.openingStart=0;if(host)host.revision=(host.revision||0)+1;}
        state.doorsPrimed++;
      }
      return true;
    }catch(_){return false}
  }
  function primeSpyDoorsForStep(player,dx,dy){
    let found=primeSpyDoor(player,dx,dy);
    if(dx&&dy){found=primeSpyDoor(player,dx,0)||found;found=primeSpyDoor(player,0,dy)||found;}
    return found;
  }

  function inheritMarkers(wrapped,current){try{Object.assign(wrapped,current)}catch(_){}return wrapped}
  function installMoveGuard(){
    const current=window.movePlayer;if(typeof current!=="function")return false;
    if(current.__ccgV141R27SpyDoorIsolation){state.moveSource=current;state.moveInstalled=true;return true}
    if(current===state.moveSource)return true;
    const wrapped=inheritMarkers(function movePlayerV141R27SpyDoorIsolation(player,dx,dy){if(spyActive())primeSpyDoorsForStep(player,Number(dx)||0,Number(dy)||0);return current.apply(this,arguments)},current);
    wrapped.__ccgV141R27SpyDoorIsolation=true;wrapped.__ccgV141R27Original=current;window.movePlayer=wrapped;state.moveSource=wrapped;state.moveInstalled=true;return true;
  }
  function installFurnitureGuard(){
    const current=window.damageFurnitureAt;if(typeof current!=="function")return false;
    if(current.__ccgV141R27SpyFurnitureIsolation){state.damageSource=current;state.damageInstalled=true;return true}
    if(current===state.damageSource)return true;
    const wrapped=inheritMarkers(function damageFurnitureAtV141R27SpyIsolation(x,y){
      if(spyActive()){
        try{const blocker=(host?.blockingDecor||[]).find(item=>item?.spyFurniture&&item.x===Math.round(Number(x))&&item.y===Math.round(Number(y)));if(blocker){hardenFurniture(blocker);return true}}catch(_){}
      }
      return current.apply(this,arguments);
    },current);
    wrapped.__ccgV141R27SpyFurnitureIsolation=true;wrapped.__ccgV141R27Original=current;window.damageFurnitureAt=wrapped;state.damageSource=wrapped;state.damageInstalled=true;return true;
  }

  function stopDungeonPropagation(event){event.preventDefault?.();event.stopPropagation?.()}
  function toggleSpyFieldKit(){
    try{
      if(typeof mode!=="undefined"&&!['playing','inventory'].includes(mode))return false;
      if(typeof toggleInventory==="function"){toggleInventory();state.fieldKitToggles++;setTimeout(renderSpyUi,0);return true}
    }catch(_){}
    return false;
  }
  function onSpyKeyDown(event){
    if(!spyActive()||editable(event?.target))return false;const code=String(event?.code||"");
    if(code==="KeyE"){
      const loader=window.CCGLostSizzlerV141R32SpyLoader;
      if(!event.repeat&&typeof loader?.dispatchSearchAction==="function"){
        stopDungeonPropagation(event);state.searchBridges++;loader.dispatchSearchAction();return true;
      }
      stopDungeonPropagation(event);return true;
    }
    if(code==="KeyF"){
      stopDungeonPropagation(event);if(!event.repeat)toggleSpyFieldKit();return true;
    }
    if(code==="Tab"){
      stopDungeonPropagation(event);if(!event.repeat)try{showToast?.("SPY FIELD KIT","Press F to open or close the Spy Vs Spy field kit.","cyan",2600)}catch(_){}return true;
    }
    if(BLOCKED_DUNGEON_KEYS.has(code)){
      stopDungeonPropagation(event);state.blockedDungeonActions++;
      if(!event.repeat)try{showToast?.("SPY CONTROLS ACTIVE","Dungeon inventory hotkeys are disabled in Spy Vs Spy. Press F for the Spy field kit.","cyan",2400)}catch(_){}
      return true;
    }
    return false;
  }

  function tick(){
    if(spyActive()){
      installMoveGuard();installFurnitureGuard();protectSpyWorld();renderSpyUi();return;
    }
    if(state.wasSpy){state.wasSpy=false;restoreUi();}
  }

  addEventListener("keydown",onSpyKeyDown,true);
  installMoveGuard();installFurnitureGuard();tick();state.timer=setInterval(tick,80);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerV141R27SpyIsolation={
    installMoveGuard,installFurnitureGuard,protectSpyWorld,primeSpyDoor,primeSpyDoorsForStep,renderSpyUi,restoreUi,onSpyKeyDown,toggleSpyFieldKit,
    specialModeType,spyActive,constants:{BLOCKED_DUNGEON_KEYS},get state(){return state}
  };
})();