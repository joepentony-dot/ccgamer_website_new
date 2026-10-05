"use strict";
const C=window.CCG_CONFIG,W=window.CCGWorld,A=window.CCGAI,S=window.CCGSound,PGR=window.CCGProgression,SYS=window.CCGSystems,$=id=>document.getElementById(id);
const canvas=$("game"),ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;
var UI=window.UI={
  health:$("hud-health"),p2:$("hud-p2"),mana:$("hud-mana"),keys:$("hud-keys"),bronze:$("hud-bronze"),bronzeHub:$("hud-bronze-hub"),weapon:$("hud-weapon"),score:$("hud-score"),room:$("hud-room"),
  mission:$("mission-text"),net:$("net-status"),sound:$("sound-btn"),message:$("message"),list:$("player-list"),quests:$("quest-list"),loadout:$("loadout"),surroundings:$("surroundings"),
  menu:$("menu"),pause:$("pause"),end:$("end"),endTitle:$("end-title"),endText:$("end-text"),name:$("player-name"),roomCode:$("room-code"),note:$("menu-note"),difficulty:$("difficulty"),collection:$("collection-summary"),
  toast:$("pickup-toast"),toastIcon:$("pickup-icon"),toastTitle:$("pickup-title"),toastText:$("pickup-text"),itemShortcuts:$("item-shortcuts"),eventLog:$("event-log"),levelUp:$("level-up"),levelCopy:$("level-up-copy"),levelChoices:$("level-up-choices"),levelLater:$("level-up-later"),
  floorComplete:$("floor-complete"),floorTitle:$("floor-title"),floorSummary:$("floor-summary"),descend:$("descend-btn"),stay:$("stay-floor-btn"),extract:$("extract-btn"),inventory:$("inventory-panel"),inventoryList:$("inventory-list"),inventoryClose:$("inventory-close"),inventoryObjective:$("inventory-objective"),fullscreenHint:$("fullscreen-hint"),
  rulebook:$("rulebook-panel"),support:$("support-panel"),itemInfo:$("item-info-panel"),itemInfoTitle:$("item-info-title"),itemInfoIcon:$("item-info-icon"),itemInfoText:$("item-info-text"),namedDossier:$("named-dossier-panel"),namedDossierList:$("named-dossier-list"),
  quickLevel:$("quick-level"),quickLevelUp:$("quick-level-up"),quickXpText:$("quick-xp-text"),quickXpFill:$("quick-xp-fill"),quickXpNext:$("quick-xp-next"),quickUtility:$("quick-utility"),quickPotion:$("quick-potion"),quickKeyring:$("quick-keyring"),quickSlots:$("quick-slots"),quickSpecials:$("quick-specials"),banishAlert:$("banish-alert"),banishAlertText:$("banish-alert-text"),power:$("hud-power"),kills:$("hud-kills"),time:$("hud-time"),alert:$("hud-alert"),
  shop:$("shop-panel"),shopTitle:$("shop-title"),shopCopy:$("shop-copy"),shopItems:$("shop-items"),shopScore:$("shop-score"),shopArtefacts:$("shop-artefacts"),shopNextPrice:$("shop-next-price"),savePanel:$("save-panel"),saveTitle:$("save-title"),saveCopy:$("save-copy"),saveNote:$("save-note"),saveNow:$("save-now-btn"),saveContinue:$("save-continue-btn"),saveReturn:$("save-return-btn"),artefactChoice:$("artefact-choice-panel"),artefactChoiceName:$("artefact-choice-name")
};
function focusGameplayKeyboard(){
  setTimeout(()=>{
    if(document.body.dataset.runActive!=="true")return;
    try{document.activeElement?.blur?.()}catch(_){}
    try{canvas.tabIndex=-1;canvas.focus({preventScroll:true})}catch(_){}
  },0);
}
function setRunPresentation(active){document.body.dataset.runActive=active?"true":"false";if(active)focusGameplayKeyboard()}
const OVERRIDES=window.CCG_ASSET_OVERRIDES||{},logo=new Image();logo.onerror=()=>{if(!logo.src.endsWith(C.logoFallback))logo.src=C.logoFallback};logo.src=OVERRIDES.images?.logo||C.logoAsset;document.querySelector(".brand img")?.setAttribute("src",OVERRIDES.images?.logo||C.logoAsset);
const avatarImages=new Map();for(const f of C.followerElites){const custom=OVERRIDES.images?.namedEnemies?.[f.name];if(f.avatar||custom){const im=new Image();const embedded=()=>window.CCG_AVATAR_DATA?.[f.name]||window.CCG_AVATAR_DATA?.[String(f.avatar||"").replace(/^embedded:/,"")]||"";im.onerror=()=>{const fallback=embedded();if(fallback&&im.src!==fallback)im.src=fallback};im.src=custom||(f.avatar?.startsWith("embedded:")?(embedded()||""):f.avatar);avatarImages.set(f.name,im)}}
const pickupOverrideImages=new Map();for(const [kind,src] of Object.entries(OVERRIDES.images?.items||{}))if(src){const im=new Image();im.src=src;pickupOverrideImages.set(kind,im)}
const P={purple:"#b978ff",gold:"#ffd85a",cyan:"#6cecff",green:"#72ff9b",pink:"#ff5bae",red:"#ff6868",orange:"#ff9950",white:"#faf4ff",blue:"#6aa9ff",brown:"#9b6134",black:"#030205",grey:"#9b8daa"};
const input=new Set(),remote=new Map(),bullets=[],enemyBullets=[],particles=[],rings=[],floaters=[],hazards=[],pendingItems=new Set(),enemyVisuals=new Map(),cameras=new Map(),explored=new Map(),campStates=new Map(),roomVisits=new Map(),playerTrails=new Map();
const MAX_GAMEPLAY_PARTICLES=360,MAX_GAMEPLAY_RINGS=72;
function boundedVisualPush(array,max,items){
  const rows=items.filter(Boolean);if(!rows.length)return array.length;
  if(rows.length>=max){array.splice(0,array.length,...rows.slice(-max));return array.length}
  const overflow=Math.max(0,array.length+rows.length-max);if(overflow)array.splice(0,overflow);
  return Array.prototype.push.apply(array,rows)
}
particles.push=function(...items){return boundedVisualPush(particles,MAX_GAMEPLAY_PARTICLES,items)};
rings.push=function(...items){return boundedVisualPush(rings,MAX_GAMEPLAY_RINGS,items)};
let mode="menu",playMode="solo",world=null,host=null,p1=null,p2=null,run=null,score=0,last=0,enemyCD=0,projectileCD=0,sendCD=0,worldCD=0,surroundCD=0,specialCD=0,move1=0,move2=0,fire1=0,fire2=0,fireBuffer1=0,fireBuffer2=0,won=false,shake=0,damageFlash=0,renderShake={x:0,y:0},toastTimer=0,retainedToast=false,lowHealthCD=0,inventoryReminderMs=300000,levelQueue=[],toastQueue=[],lastAmbientMessage="";
let view={x:0,y:0,w:canvas.width,h:canvas.height},focus=null,cam={x:0,y:0};
let activeShop=null,floorEntryCheckpoint=null,savePromptReason="",pendingBanishmentReward=null;
const stats={games:0,elites:0,doors:0,weapons:0,secrets:0,generators:0},questDone=new Set();
const esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(Math.max(0,Math.floor(n))).padStart(6,"0"),md=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const localPlayers=()=>[p1,p2].filter(Boolean),findLocal=id=>localPlayers().find(p=>p.id===id)||null;
const allPlayers=()=>{const a=[...localPlayers()],now=performance.now();for(const p of remote.values())if(now-p.lastSeen<2600)a.push(p);return a};
function playerName(){if(run?.daily&&window.CCGWeeklyChallenge?.state?.playerName)return String(window.CCGWeeklyChallenge.state.playerName).slice(0,18);return String(UI.name.value||"CCG Player").trim().slice(0,18)||"CCG Player"}

function itemHelp(kind){
  return {
    health:"Restores 3 HP immediately.",ammo:"Restores roughly 30 shots (more with Scavenger).",mana:"Restores ammunition.",potion:"Stored item. Stacks to 3; E restores health only. Ammunition must be found separately.",torch:`Stored item. Each torch uses one slot. Q gives ${C.player.torchRadius*2}-tile light for about ${Math.ceil(C.player.torchMs/1000)}s.`,teleport:"Stored spell. Press R or use it from inventory to warp to a safe explored room.",banishment:`Distil a Banishment Flask from Banishment Essence at a Banishment Alchemist. When a Death Stalker or Count Loadula is within ${C.stalker.banishPromptDistance||8} tiles, a flashing B prompt permanently destroys that nearby threat. Q always remains Torch.`,inventorySlot:`Permanently expands this run's inventory by one slot, up to ${C.player.inventorySlots}. Locked slots are shown in TAB and can be bought at dungeon shops.`,bronze:"Opens one optional bronze door or locked chest.",key:"Main vault key used by the floor objective.",exitSigil:"Mandatory exit key exposed only after every Sigil defender is defeated.",armour:"Absorbs incoming damage before HP.",weapon:"Equips a randomized weapon/upgrade.",rapid:"Temporary faster firing rate.",xpOrb:"Awards 10 XP unless the current floor cap has been reached.",game:"C64 rescue collectible; bank it by clearing/extracting. Any granted ability is announced above your character.",credits:"Gold score coin.",chest:"Contains randomized gear or supplies.",shrine:"One-use blessing, sometimes with a drawback.",deathCache:"Your missing half-score, lost XP and dropped carried loot. Recover it before another death erases it.",artefact:`Banishment Essence harvested from major threats and rare supernatural rewards. Current V10.42 runs store it in the Vessel rather than an inventory slot; legacy physical Artefacts are still accepted by the Alchemist.`
  }[kind]||"Dungeon item or objective object."
}
function itemIconSVG(kind,label=""){
  const k=kind==="mana"?"ammo":kind==="artefact"?"loot":kind;
  const svg={health:`<path d="M12 3v18M3 12h18"/>`,ammo:`<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 10v4M12 10v4M17 10v4"/>`,potion:`<path d="M9 3h6v4l3 4v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8l3-4z"/><path d="M8 15h8"/>`,teleport:`<path d="M12 2a10 10 0 1 1-7.1 2.9"/><path d="M3 3v6h6M8 12h8M12 8v8"/>`,banishment:`<path d="M9 3h6v4l4 5v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7l4-5z"/><path d="m8 14 3 3 6-7"/>`,torch:`<path d="M11 10h3v11h-3z"/><path d="M12.5 3c4 3 3 6 0 8-3-2-4-5 0-8z"/>`,armour:`<path d="M12 3 20 7v5c0 5-3 8-8 10-5-2-8-5-8-10V7z"/>`,bronze:`<circle cx="7" cy="10" r="4"/><path d="M11 10h10M17 10v4M20 10v3"/>`,key:`<circle cx="7" cy="10" r="4"/><path d="M11 10h10M17 10v4M20 10v3"/>`,exitSigil:`<circle cx="8" cy="12" r="6"/><circle cx="8" cy="12" r="3"/><path d="M14 12h7M18 12v4M21 12v3"/>`,weapon:`<path d="M3 9h12v5H3zM15 10h6v3h-6M7 14v6h4v-6"/>`,rapid:`<path d="M14 2 5 13h6l-2 9 10-13h-6z"/>`,xpOrb:`<circle cx="12" cy="12" r="8"/><path d="m8 8 8 8m0-8-8 8"/>`,chest:`<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M3 11h18M10 12h4v4h-4z"/>`,shrine:`<path d="M12 3 21 20H3z"/><circle cx="12" cy="13" r="2"/>`,game:`<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M6 8h12v3H6zM7 14h10v3H7z"/><circle cx="9" cy="15.5" r="1.5"/><circle cx="15" cy="15.5" r="1.5"/>`,credits:`<circle cx="12" cy="12" r="9"/><path d="M14 7c-4-1-6 1-5 4 1 2 5 1 5 4 0 2-3 3-6 1M12 5v14"/>`,loot:`<path d="m12 2 2.5 6.5L21 11l-6.5 2.5L12 22l-2.5-8.5L3 11l6.5-2.5z"/>`}[k]||`<circle cx="12" cy="12" r="8"/>`;
  const colour={health:P.green,ammo:P.cyan,potion:P.green,teleport:P.purple,banishment:P.purple,torch:P.gold,armour:P.blue,bronze:P.gold,key:P.gold,exitSigil:P.gold,weapon:P.orange,rapid:P.orange,xpOrb:P.cyan,chest:P.gold,shrine:P.purple,game:P.white,credits:P.gold,loot:P.cyan}[k]||P.white;
  return `<span class="item-svg-wrap item-${esc(k)}" title="${esc(label||k)}" style="color:${colour}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svg}</svg></span>`;
}
function guideDefinitions(){return[{kind:"health",name:"HEALTH PACK",desc:itemHelp("health")},{kind:"ammo",name:"AMMO PACK",desc:itemHelp("ammo")},{kind:"potion",name:"RESTORATION POTION",desc:itemHelp("potion")},{kind:"teleport",name:"TELEPORT SPELL",desc:itemHelp("teleport")},{kind:"banishment",name:"BANISHMENT FLASK",desc:itemHelp("banishment")},{kind:"inventorySlot",name:"INVENTORY EXPANSION",desc:itemHelp("inventorySlot")},{kind:"torch",name:"FLAMING TORCH",desc:itemHelp("torch")},{kind:"armour",name:"ARMOUR",desc:itemHelp("armour")},{kind:"credits",name:"GOLD SCORE COIN",desc:itemHelp("credits")},{kind:"xpOrb",name:"XP ORB",desc:itemHelp("xpOrb")},{kind:"bronze",name:"BRONZE KEY",desc:itemHelp("bronze")},{kind:"key",name:"MAIN KEY",desc:itemHelp("key")},{kind:"exitSigil",name:"EXIT SIGIL",desc:itemHelp("exitSigil")},{kind:"weapon",name:"WEAPON",desc:itemHelp("weapon")},{kind:"rapid",name:"RAPID FIRE",desc:itemHelp("rapid")},{kind:"chest",name:"CHEST",desc:itemHelp("chest")},{kind:"shrine",name:"SHRINE",desc:itemHelp("shrine")},{kind:"game",name:"C64 GAME",desc:itemHelp("game")},{kind:"loot",name:"BANISHMENT ESSENCE",desc:`Banishment Essence is stored in your Vessel. Distil ${C.stalker.flaskArtefacts} Essence at a Banishment Alchemist to create one Banishment Flask; legacy physical Artefacts remain compatible.`}]}
function inventoryVisualKind(it){return !it?"empty":it.kind==="artefact"?"loot":it.kind}
let pendingPlayFullscreenRequest=null;
function requestPlayFullscreen(){
  const shell=document.querySelector(".ccg-game");
  if(!shell||document.fullscreenElement)return Promise.resolve(true);
  if(pendingPlayFullscreenRequest)return pendingPlayFullscreenRequest;
  try{
    const requested=Promise.resolve(shell.requestFullscreen()).then(()=>true).catch(()=>false);
    pendingPlayFullscreenRequest=Promise.race([requested,new Promise(resolve=>setTimeout(()=>resolve(false),1000))]).finally(()=>{pendingPlayFullscreenRequest=null});
    return pendingPlayFullscreenRequest;
  }catch(_){return Promise.resolve(false)}
}
function say(s,tone="purple"){UI.message.innerHTML=s}
function logEvent(){/* The old chat-style event stream is intentionally disabled. Major information uses the coloured banner. */}
function displayToast(entry){
  UI.toast.className=`pickup-toast ${entry.tone||"gold"}`;UI.toastTitle.textContent=entry.title;UI.toastText.textContent=entry.text;
  if(UI.toastIcon){const words=`${entry.title} ${entry.text}`.toLowerCase(),kind=words.includes("torch")?"torch":words.includes("potion")||words.includes("health")?"potion":words.includes("ammo")?"ammo":words.includes("banish")||words.includes("death stalker")?"banishment":words.includes("teleport")||words.includes("warp")?"teleport":words.includes("key")||words.includes("sigil")?"exitSigil":words.includes("game")?"game":words.includes("armour")?"armour":words.includes("weapon")?"weapon":words.includes("xp")||words.includes("level")?"xpOrb":"shrine";UI.toastIcon.innerHTML=itemIconSVG(kind,entry.title)}
  UI.toast.classList.remove("show");requestAnimationFrame(()=>UI.toast.classList.add("show"));toastTimer=entry.duration||9000;retainedToast=Boolean(entry.retain);
  try{window.dispatchEvent(new CustomEvent("ccg:toast-shown",{detail:{title:entry.title,text:entry.text,tone:entry.tone||"gold",duration:entry.duration||9000,retain:Boolean(entry.retain),ccgDialogueVoiceHandled:Boolean(entry.ccgDialogueVoiceHandled)}}))}catch(_){}
}
function showToast(title,text,tone="gold",duration=9000,options={}){
  // Ordinary information is interrupt-driven; an explicitly retained confirmation owns the banner until it has been visible.
  const entry={title:String(title),text:String(text),tone,duration:Math.max(5200,duration||9000),retain:Boolean(options?.retain),ccgDialogueVoiceHandled:Boolean(options?.ccgDialogueVoiceHandled)};
  if(retainedToast&&toastTimer>0&&!entry.retain){toastQueue.push(entry);return true}
  toastQueue.length=0;displayToast(entry);return true;
}
function updateToast(dt){
  if(toastTimer<=0)return;toastTimer-=dt;if(toastTimer>0)return;UI.toast.classList.remove("show");retainedToast=false;const next=toastQueue.shift();if(next)displayToast(next);
}
function rememberTrail(p){let a=playerTrails.get(p.id);if(!a){a=[];playerTrails.set(p.id,a)}const last=a[a.length-1];if(!last||last.x!==p.x||last.y!==p.y){a.push({x:p.x,y:p.y});if(a.length>900)a.splice(0,a.length-900)}}
function baseWeapon(){return{id:"pulse",name:"Pulse Blaster",displayName:"COMMON Pulse Blaster",rarity:"COMMON",power:1,delay:1,shots:1,ammo:1,element:"energy",ttl:18,mods:[],rating:1,desc:"Reliable single-shot blaster."}}
function makePlayer(id,name,x,y){return{id,name,x,y,rx:x,ry:y,health:C.player.maxHealth,maxHealth:C.player.maxHealth,mana:C.player.maxMana,maxMana:C.player.maxMana,armor:0,bronzeKeys:0,level:1,xp:0,totalXp:0,xpDebt:0,everEarnedXp:false,pendingLevels:0,inventory:[],inventorySlots:C.player.startingInventorySlots||3,weapon:baseWeapon(),weaponLevel:1,dir:{x:1,y:0},invuln:0,hitStunMs:0,torchMs:0,rapidMs:0,lastRoom:-99,skills:[],damageBonus:0,dashDamage:0,potionBonus:0,torchBonusMs:0,moveMultiplier:1,scavenger:0,killsSinceHeal:0,hpBarMs:0,ammoFlashMs:0,emergencyRechargeMs:0}}
function preservePlayer(old,x,y){const p=makePlayer(old.id,old.name,x,y);for(const key of ["maxHealth","maxMana","health","mana","armor","level","xp","totalXp","xpDebt","everEarnedXp","pendingLevels","inventory","inventorySlots","weapon","weaponLevel","skills","damageBonus","dashDamage","potionBonus","torchBonusMs","moveMultiplier","scavenger","killsSinceHeal","hpBarMs","ammoFlashMs","emergencyRechargeMs"]){if(old[key]!==undefined)p[key]=Array.isArray(old[key])?[...old[key]]:(old[key]&&typeof old[key]==="object"?{...old[key]}:old[key])}p.x=p.rx=x;p.y=p.ry=y;p.bronzeKeys=0;p.torchMs=0;p.rapidMs=0;p.lastRoom=-99;return p}
function nearbyOpen(x,y,avoid=[]){for(let r=1;r<7;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const nx=x+dx,ny=y+dy;if(W.walkable(world.map,nx,ny,host)&&!avoid.some(p=>p.x===nx&&p.y===ny))return{x:nx,y:ny}}return{x,y}}
function clearCampHazards(playerId){for(let i=hazards.length-1;i>=0;i--)if(hazards[i].campOwner===playerId)hazards.splice(i,1)}
function resetCamp(p,clearPending=true){if(clearPending)clearCampHazards(p.id);campStates.set(p.id,{lastX:p.x,lastY:p.y,originX:p.x,originY:p.y,elapsed:0,active:false,nextBlast:0,blastCount:0})}
function effectiveSight(p){return PGR.effectiveSight(p,run)}
function permanentLightVisibleTo(p,x,y){
  const lights=world?.wallLights||[],pr=effectiveSight(p);
  for(const l of lights){
    if(W.roomAt(world,x,y)!==l.roomId||Math.hypot(x-l.x,y-l.y)>l.radius+.2)continue;
    if(W.roomAt(world,p.x,p.y)===l.roomId)return true;
    if(Math.hypot(p.x-l.x,p.y-l.y)<=pr+l.radius+1&&A.lineOfSight(world.map,p,l,pr+l.radius+1,host))return true;
  }
  return false;
}
function followerLightVisibleTo(p,x,y){
  if(!p||!world||!host)return false;
  const radius=C.enemy.followerLightRadius||5,roomId=W.roomAt(world,x,y),playerRoom=W.roomAt(world,p.x,p.y),pr=effectiveSight(p);if(roomId<0)return false;
  for(const e of host?.enemies||[]){
    if(!e.alive||!e.follower||W.roomAt(world,e.x,e.y)!==roomId)continue;
    if(Math.hypot(x-e.x,y-e.y)>radius+.2||!A.lineOfSight(world.map,e,{x,y},radius,host))continue;
    /* Named enemies illuminate their immediate room, but that light is not
     * global knowledge. The player must share the room or be close enough to
     * see the lit area through an unobstructed route. */
    if(playerRoom===roomId)return true;
    if(Math.hypot(p.x-e.x,p.y-e.y)<=pr+radius+1&&A.lineOfSight(world.map,p,e,pr+radius+1,host))return true;
  }
  return false;
}
function visibleTo(p,x,y){const r=effectiveSight(p);return permanentLightVisibleTo(p,x,y)||followerLightVisibleTo(p,x,y)||(Math.hypot(x-p.x,y-p.y)<=r+.2&&A.lineOfSight(world.map,p,{x,y},r,host))}
function reveal(p){let ex=explored.get(p.id);if(!ex){ex=new Set();explored.set(p.id,ex)}const r=effectiveSight(p),y0=Math.max(0,Math.floor(p.y-r)),y1=Math.min(C.worldHeight-1,Math.ceil(p.y+r)),x0=Math.max(0,Math.floor(p.x-r)),x1=Math.min(C.worldWidth-1,Math.ceil(p.x+r));for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(Math.hypot(x-p.x,y-p.y)<=r+.2&&A.lineOfSight(world.map,p,{x,y},r,host))ex.add(`${x},${y}`);for(const l of world.wallLights||[])if(md(p,l)<=l.radius+2)for(let y=Math.max(0,Math.floor(l.y-l.radius));y<=Math.min(C.worldHeight-1,Math.ceil(l.y+l.radius));y++)for(let x=Math.max(0,Math.floor(l.x-l.radius));x<=Math.min(C.worldWidth-1,Math.ceil(l.x+l.radius));x++)if(W.roomAt(world,x,y)===l.roomId)ex.add(`${x},${y}`)}
function markRoomVisit(p){const id=W.roomAt(world,p.x,p.y);if(id<0)return;host.enteredRoomIds=host.enteredRoomIds||[];if(!host.enteredRoomIds.includes(id))host.enteredRoomIds.push(id);let set=roomVisits.get(p.id);if(!set){set=new Set();roomVisits.set(p.id,set)}if(!set.has(id)){set.add(id);const ex=explored.get(p.id)||new Set(),room=world.rooms[id],cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2);ex.add(`${cx},${cy}`);explored.set(p.id,ex);run.stats.rooms++;checkMapRewards(p)}}
function startWorld(seed,_modePlaceholder=false,preserve=false,checkpointRestore=false){
  const old1=preserve?p1:null;if(run)run.playerLevelHint=Math.max(1,old1?.level||p1?.level||1);world=W.generate(seed);world.floor=run?.floor||1;window.__CCG_WORLD=world;host=W.createHostState(world);SYS.decorate(world,host,run||PGR.makeRun());
  try{window.CCGLostSizzlerV142R58AuthoritativeTrapCore?.reset?.()}catch(_){}
  /* Stage 6 normally owns the SYS.decorate wrapper, but later runtime owner
     adoption can replace that wrapper before a Solo run starts. Dedicated
     hazards and all three ordinary trap families are generated-floor invariants,
     so reconcile them independently at the final world-start boundary. */
  const stage6=window.CCGLostSizzlerV142Stage6ZoneGameplay||null,stage6Run=run||PGR.makeRun();
  const hasUsableHazard=()=>Boolean((host.hazardRooms||[]).some(hazard=>stage6?.usableDedicatedHazard?.(hazard)??(Array.isArray(hazard?.cells)&&hazard.cells.length>0)));
  try{
    const floor=Math.max(1,Number(stage6Run?.floor||1)),profile=stage6?.profileForFloor?.(floor),seed=String(stage6Run?.seed||"CCG");
    if(!hasUsableHazard()&&!(host.hazardRooms||[]).some(hazard=>hazard?.v142WardenCleansed===true)){
      stage6?.ensureDedicatedHazard?.(world,host,stage6Run,profile,seed);
    }
    if(profile)stage6?.reconcileTrapFamilies?.(host,seed,world,{...profile,floor});
  }catch(error){console.error("[Dungeon Carnage] final hazard/trap reconciliation failed",error)}
  try{
    const floor=Math.max(1,Number(stage6Run?.floor||1));
    if(!hasUsableHazard()&&!(host.hazardRooms||[]).some(hazard=>hazard?.v142WardenCleansed===true)){
      const rooms=[...(world?.rooms||[])],ordered=[
        ...rooms.filter(room=>room&&room.dedicatedHazardReserved&&room.id!==world.startRoomId&&room.id!==world.exitRoomId),
        ...rooms.filter(room=>room&&room.id!==world.startRoomId&&room.id!==world.exitRoomId),
        ...rooms.filter(room=>room&&room.id===world.exitRoomId),
        ...rooms.filter(room=>room&&room.id===world.startRoomId)
      ];
      let chosen=null,hazardRoomId=null,cells=[];
      for(const room of ordered){
        const found=[];
        for(let y=Number(room.y);y<=Number(room.y)+Number(room.h);y++)for(let x=Number(room.x);x<=Number(room.x)+Number(room.w);x++){
          if(world?.map?.[y]?.[x]===0)found.push({x,y,group:0})
        }
        if(found.length){chosen=room;hazardRoomId=Number(room.id);cells=found;break}
      }
      if(!cells.length){
        // Absolute map-level fallback for pathological compact seeds where room
        // bounds expose no walkable cells. Prefer ordinary room-owned cells,
        // then roomless corridor cells, and keep start/exit coordinates last.
        // A usable hazard must not disappear merely because roomAt() returns -1.
        const mapCells=[];
        for(let y=0;y<(world?.map||[]).length;y++){
          const row=world.map[y]||[];
          for(let x=0;x<row.length;x++){
            if(row[x]!==0)continue;
            const roomId=W.roomAt(world,x,y);
            const room=roomId>=0?(rooms.find(candidate=>Number(candidate?.id)===Number(roomId))||rooms[roomId]||null):null;
            const start=Number(x)===Number(world.start?.x)&&Number(y)===Number(world.start?.y);
            const exit=Number(x)===Number(world.exit?.x)&&Number(y)===Number(world.exit?.y);
            const roomless=roomId<0,edgeRoom=!roomless&&(roomId===world.startRoomId||roomId===world.exitRoomId);
            mapCells.push({x,y,room,roomId,start,exit,roomless,edgeRoom});
          }
        }
        mapCells.sort((a,b)=>
          Number(a.start)-Number(b.start)
          ||Number(a.exit)-Number(b.exit)
          ||Number(a.edgeRoom)-Number(b.edgeRoom)
          ||Number(a.roomless)-Number(b.roomless)
          ||a.roomId-b.roomId||a.y-b.y||a.x-b.x
        );
        const fallback=mapCells[0]||null;
        if(fallback){chosen=fallback.room;hazardRoomId=Number(fallback.roomId);cells=[{x:fallback.x,y:fallback.y,group:0}]}
      }
      if(cells.length&&Number.isFinite(hazardRoomId)){
        host.hazardRooms=host.hazardRooms||[];
        host.hazardRooms.push({
          id:`hazard-${floor}-startworld-fallback`,roomId:hazardRoomId,type:"embers",cells,groups:2,
          period:2550,warningMs:700,activeMs:760,phase:0,title:"EMBER-TILE VAULT",
          v142StartWorldFallback:true,v142StartWorldRoomlessFallback:!chosen
        });
        if(chosen){chosen.dedicatedHazard=true;chosen.dedicatedHazardReserved=true;chosen.hazardType="embers";chosen.dangerous=true}
      }
    }
  }catch(error){console.error("[Dungeon Carnage] final startWorld hazard invariant failed",error)}
  try{
    const representative=(host.hazardRooms||[]).find(hazard=>Array.isArray(hazard?.cells)&&hazard.cells.length>0);
    if(representative)representative.v142FinalHazardGuaranteed=true;
  }catch(error){console.error("[Dungeon Carnage] final dedicated-hazard seal failed",error)}
  // R67: ordinary procedurally generated FIRE/SPIKE/SHOCK floor traps are
  // retired. Dedicated hazard rooms are the only floor-hazard owner.
  host.traps=[];

  p1=old1?preservePlayer(old1,world.start.x,world.start.y):makePlayer("P1",playerName(),world.start.x,world.start.y);p2=null;
  remote.clear();enemyVisuals.clear();bullets.length=enemyBullets.length=particles.length=rings.length=floaters.length=hazards.length=0;pendingItems.clear();cameras.clear();explored.clear();campStates.clear();roomVisits.clear();playerTrails.clear();questDone.clear();toastQueue.length=0;toastTimer=0;retainedToast=false;UI.toast?.classList.remove("show");stats.games=stats.elites=stats.doors=stats.weapons=stats.secrets=stats.generators=0;shake=damageFlash=0;move1=move2=fire1=fire2=fireBuffer1=fireBuffer2=0;specialCD=0;inventoryReminderMs=300000;
  host.worldRef=world;host.enteredRoomIds=[];for(const p of localPlayers()){resetCamp(p);reveal(p);if(checkpointRestore){const rid=W.roomAt(world,p.x,p.y),set=new Set();if(rid>=0){set.add(rid);host.enteredRoomIds.push(rid)}roomVisits.set(p.id,set)}else markRoomVisit(p);rememberTrail(p);updateRoomMessage(p,true)}levelQueue.length=0;for(const p of localPlayers())rememberPendingLevelChoice(p);A.stageUnenteredEnemies?.(host,world);
  // R67 final playable-host invariant: no ordinary procedural floor traps
  // may be restored by late world staging or compatibility code.
  host.traps=[];

  sync();
  try{const detail={floor:Number(run?.floor||1),preserve:Boolean(preserve),checkpointRestore:Boolean(checkpointRestore)};dispatchEvent(new CustomEvent("ccg:floor-start",{detail}));document.dispatchEvent(new CustomEvent("ccg:floor-start",{detail}))}catch(_){}
  const fi=PGR.floorInfo(run);showToast(`FLOOR ${run.floor}: ${fi.name}`,`${PGR.objectiveLabel(run)}${run.modifier?` • MODIFIER: ${run.modifier.name}`:""}`,"cyan",6500);
}
function savedRunLabel(data){if(!data)return "Resume Saved Run";const when=new Date(data.savedAt||Date.now()),time=Number.isFinite(when.getTime())?when.toLocaleString():"saved checkpoint";return `Resume Floor ${data.floor||data.run?.floor||1} — ${time}`}
function updateSavedRunButton(){const b=$("continue-save-btn"),raw=PGR.loadCheckpoint(),data=Number(raw?.floor||raw?.run?.floor||1)>1?raw:null;if(!b)return;b.classList.toggle("hidden",!data);if(data)b.textContent=savedRunLabel(data)}
function captureFloorEntryCheckpoint(){if(!run||run.floor<=1){floorEntryCheckpoint=null;return null}floorEntryCheckpoint=PGR.makeCheckpoint(run,p1,null,score,playMode);return floorEntryCheckpoint}
function saveFloorCheckpoint(returnToMenu=false){const data=floorEntryCheckpoint||captureFloorEntryCheckpoint();if(!data)return false;const ok=PGR.saveCheckpointData(data);updateSavedRunButton();if(ok)showToast("FLOOR CHECKPOINT SAVED",`Floor ${data.floor} entry saved. Loading it later restarts this floor from its entrance state.`,"green",7500);if(returnToMenu)setTimeout(()=>quitToMenu(),180);return ok}
function offerFloorSave(restPrompt=false){if(!run||!UI.savePanel||run.floor<=1)return false;savePromptReason=restPrompt?"rest":"entry";UI.saveTitle.textContent=restPrompt?"FIVE DEATHS — SAVE FOR ANOTHER DAY?":`FLOOR ${run.floor} CHECKPOINT`;UI.saveCopy.textContent=restPrompt?"That was five deaths on this floor. Save the floor-entry checkpoint and return when you are feeling braver, or keep going now.":"Save this floor-entry checkpoint so you can leave the game and resume from the start of this floor later.";UI.saveNow.classList.toggle("hidden",restPrompt);UI.saveContinue.textContent=restPrompt?"Continue the Run":"Continue Without Saving";UI.saveReturn.classList.toggle("hidden",!restPrompt);UI.saveNote.textContent="Checkpoint saves deliberately return you to the floor entrance; they are not mid-battle quick saves.";mode="saveprompt";input.clear();UI.savePanel.classList.remove("hidden");return true}
function closeSavePrompt(){UI.savePanel?.classList.add("hidden");if(mode==="saveprompt")mode="playing";savePromptReason=""}
async function resumeSavedRun(){const saved=PGR.loadCheckpoint();if(!saved||Number(saved.floor||saved.run?.floor||1)<=1){updateSavedRunButton();return false}const audio=S.start(),fs=requestPlayFullscreen();await Promise.all([audio,fs]);run=saved.run;score=Math.max(0,Number(saved.score)||0);p1=saved.player;p2=null;playMode="solo";mode="playing";startWorld(PGR.floorSeed(run),false,true,true);floorEntryCheckpoint=saved;UI.menu.classList.add("hidden");setRunPresentation(true);S.startMusic();try{window.dispatchEvent(new CustomEvent("ccg:run-started",{detail:{run,playMode,restored:true}}))}catch(_){}showToast("CHECKPOINT RESTORED",`Floor ${run.floor}: ${PGR.floorInfo(run).name}. You are back at the floor entrance with the saved loadout.`,"green",9000);sync();return true}
function refreshCollection(){if(UI.collection)UI.collection.textContent=`Unique C64 titles permanently saved on this device: ${PGR.persistentCollection().length}. Duplicates count once; clearing browser data resets this list.`;updateSavedRunButton()}
function beginRun({seed=null}={}){
  const diff=UI.difficulty?.value||"ARCADE";
  run=PGR.makeRun({difficulty:diff,seed});run.modifier=PGR.chooseFloorModifier(run);score=0;won=false;playMode="solo";startWorld(PGR.floorSeed(run),false,false,false);mode="playing";UI.menu.classList.add("hidden");setRunPresentation(true);S.sfx("join");S.startMusic();floorEntryCheckpoint=null;
  try{window.dispatchEvent(new CustomEvent("ccg:run-started",{detail:{run,playMode,restored:false}}))}catch(_){}
  say(`<strong>RUN STARTED.</strong> ${run.difficulty} difficulty. Floor one is comparatively polite.`,"cyan");return true
}
async function startSolo(){const audio=S.start(),fs=requestPlayFullscreen();await Promise.all([audio,fs]);beginRun()}
function inventoryText(p){const slots=Array.from({length:PGR.inventoryCapacity(p)},(_,i)=>PGR.inventoryLabel(p.inventory?.[i]));return slots.map((x,i)=>`${i+1}:${x}`).join(" • ")}
function formatRunTime(ms){const total=Math.max(0,Math.floor((ms||0)/1000)),m=Math.floor(total/60),sec=total%60;return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`}
let quickSlotsRenderSignature="",itemShortcutsRenderSignature="";
function inventoryUiSignature(player){
  const capacity=PGR.inventoryCapacity(player),items=Array.from({length:capacity},(_,i)=>{const it=player.inventory?.[i];if(!it)return `${i}:empty`;return [i,it.kind||"",it.short||"",Math.max(1,Number(it.qty)||1),PGR.inventoryLabel(it),inventoryVisualKind(it)].join(":")});
  return `${capacity}|${items.join("|")}`;
}
function renderInventoryHudIfChanged(player,useKeys){
  if(!player)return;
  const inventorySignature=inventoryUiSignature(player);
  if(UI.quickSlots&&quickSlotsRenderSignature!==inventorySignature){
    quickSlotsRenderSignature=inventorySignature;
    UI.quickSlots.innerHTML=Array.from({length:PGR.inventoryCapacity(player)},(_,i)=>{const it=player.inventory?.[i],qty=it?Math.max(1,Number(it.qty)||1):0,code=it?({potion:"POT",torch:"TOR",teleport:"WARP",banishment:"BAN",artefact:"ART"}[it.kind]||(it.short||it.kind||"ITEM").slice(0,4).toUpperCase()):"",key=it?useKeys[it.kind]:"";return `<span class="quick-slot ${it?"filled":"empty"}" title="${esc(it?PGR.inventoryLabel(it):`Empty slot ${i+1}`)}"><b>${i+1}</b>${key?`<kbd class="quick-slot-key">${key}</kbd>`:""}${it?itemIconSVG(inventoryVisualKind(it),PGR.inventoryLabel(it)):`<i></i>`}${it?`<em class="stack-name">${esc(code)}</em>`:""}${qty>1?`<strong class="stack-count">×${qty}</strong>`:""}</span>`}).join("");
  }
  if(UI.itemShortcuts){
    const usable=(player.inventory||[]).filter(it=>useKeys[it.kind]),shortcutSignature=usable.map((it,i)=>[i,it.kind||"",Math.max(1,Number(it.qty)||1),PGR.inventoryLabel(it),inventoryVisualKind(it)].join(":")).join("|");
    if(itemShortcutsRenderSignature!==shortcutSignature){
      itemShortcutsRenderSignature=shortcutSignature;
      UI.itemShortcuts.innerHTML=usable.map(it=>`<span class="item-command item-command-${esc(it.kind)}">${itemIconSVG(inventoryVisualKind(it),PGR.inventoryLabel(it))}<kbd>${useKeys[it.kind]}</kbd><b>${esc(PGR.inventoryLabel(it))}</b><em>×${Math.max(1,Number(it.qty)||1)}</em></span>`).join("")||`<p>Collect usable items to reveal their coloured action buttons here.</p>`;
    }
  }
}
function sync(){
  if(!p1||!host||!run)return;const weapon=p1.weapon||baseWeapon(),explore=Math.round(PGR.roomCompletion(explored.get(p1.id)||new Set(),world)*100);
  UI.health.textContent=`${p1.health}/${p1.maxHealth}`;UI.p2.textContent=String(p1.armor||0);UI.mana.textContent=`${p1.mana}/${p1.maxMana}`;UI.keys.textContent=host.objective?.type==="keys"?`${host.keysCollected}/${C.keyTarget}`:`${host.objective?.complete?"DONE":"ACTIVE"}`;const weaponRaw=String(weapon.displayName||weapon.name||"Pulse"),tierMatch=weaponRaw.match(/TIER\s+(\d+)/i),weaponLevel=Math.max(1,Number(tierMatch?.[1]||p1.weaponEvolutionTier||p1.weaponLevel||weapon.evolutionTier||weapon.tier||weapon.rating||1)),weaponFamily=weaponRaw.replace(/^TIER\s+\d+\s*[·-]\s*/i,"").replace(/\s+BLASTER$/i,"").replace(/\s+[IVX]+$/i,"").trim()||"PULSE";UI.weapon.textContent=`L${weaponLevel} ${weaponFamily}`.toUpperCase().slice(0,18);UI.weapon.title=`Weapon Level ${weaponLevel} · ${weaponRaw}`;UI.score.textContent=pad(score);UI.room.textContent=`F${run.floor}`;if(UI.power)UI.power.textContent=String((weapon.power||1)+(p1.damageBonus||0));if(UI.kills)UI.kills.textContent=String(run.stats.kills||0);if(UI.time)UI.time.textContent=formatRunTime(run.elapsed);if(UI.alert)UI.alert.textContent=`${Math.round(run.alert||0)}%`;
  const root=document.documentElement;if(root?.style){root.style.setProperty("--health-pct",`${Math.max(0,Math.min(100,p1.health/Math.max(1,p1.maxHealth)*100))}%`);root.style.setProperty("--armour-pct",`${Math.max(0,Math.min(100,(p1.armor||0)/12*100))}%`);root.style.setProperty("--ammo-pct",`${Math.max(0,Math.min(100,p1.mana/Math.max(1,p1.maxMana)*100))}%`);root.style.setProperty("--alert-pct",`${Math.max(0,Math.min(100,run.alert||0))}%`)}
  const cap=PGR.floorLevelCap(run),atCap=p1.level>=cap,xpNeed=PGR.xpNeed(p1.level),xpPct=atCap?100:Math.max(0,Math.min(100,(p1.xp/Math.max(1,xpNeed))*100)),torches=PGR.inventoryKindCount(p1,"torch"),potions=PGR.inventoryKindCount(p1,"potion"),flasks=PGR.inventoryKindCount(p1,"banishment");
  if(UI.bronze)UI.bronze.textContent=`BRONZE ${p1.bronzeKeys||0}`;if(UI.bronzeHub)UI.bronzeHub.textContent=`BRONZE ×${p1.bronzeKeys||0}`;if(UI.quickPotion)UI.quickPotion.textContent=`${potions} HELD`;if(UI.quickLevel)UI.quickLevel.textContent=`LEVEL ${p1.level} / CAP ${cap}`;if(UI.quickXpText)UI.quickXpText.textContent=atCap?`FLOOR ${run.floor} CAP REACHED • XP STOPPED`:`EARNED XP ${p1.totalXp||0}`;if(UI.quickXpFill)UI.quickXpFill.style.width=`${xpPct}%`;if(UI.quickXpNext)UI.quickXpNext.textContent=atCap?`NO XP IS BANKED AT CAP — DESCEND TO RESUME`:`${Math.max(0,xpNeed-p1.xp)} TO NEXT • FLOOR CAP ${cap}`;const pendingUpgrades=pendingLevelCount(p1);if(UI.quickLevelUp){UI.quickLevelUp.classList.toggle("hidden",pendingUpgrades<=0);UI.quickLevelUp.textContent=pendingUpgrades===1?"LEVEL-UP AVAILABLE":`${pendingUpgrades} LEVEL-UPS AVAILABLE`;UI.quickLevelUp.setAttribute("aria-label",pendingUpgrades===1?"Choose your unused level-up":`Choose one of ${pendingUpgrades} unused level-ups`)};
  if(UI.quickUtility){UI.quickUtility.textContent=p1.torchMs>0?`ACTIVE ${Math.ceil(p1.torchMs/1000)}s • ${torches} SPARE`:`${torches} HELD`;UI.quickUtility.closest?.(".critical-card")?.classList.toggle("available",torches>0||p1.torchMs>0)}if(UI.quickKeyring)UI.quickKeyring.textContent=`MAIN ${host.keysCollected||0}/${C.keyTarget}${host.exitSigilCollected?" • SIGIL 1":" • SIGIL 0"}`;
  const useKeys={potion:"E",torch:"Q",teleport:"R",banishment:"B"};
  renderInventoryHudIfChanged(p1,useKeys);
  if(UI.quickSpecials){const badges=[];if(p1.torchMs>0)badges.push(`TORCH ${Math.ceil(p1.torchMs/1000)}s`);if(p1.rapidMs>0)badges.push(`RAPID ${Math.ceil(p1.rapidMs/1000)}s`);if(flasks)badges.push(`BANISH ×${flasks}`);UI.quickSpecials.textContent=badges.join(" · ")||"NO ACTIVE BUFFS"}
  const bs=typeof banishmentState==="function"?banishmentState(p1):{ready:false};document.querySelector(".ccg-game")?.classList.toggle("banish-ready",Boolean(bs.ready));if(UI.banishAlert){UI.banishAlert.classList.toggle("hidden",!bs.ready);if(bs.ready&&UI.banishAlertText){const threat=bs.nearest===host.stalker?C.stalker.name:"DEATH STALKER",dist=Math.max(0,Math.round(md(bs.nearest,p1)));UI.banishAlertText.textContent=`${threat.toUpperCase()} ${dist} TILE${dist===1?"":"S"} AWAY — PRESS B`}}
  UI.net.textContent="READY";UI.net.classList.remove("online");UI.sound.textContent=S.isEnabled()?"SOUND ON":"SOUND OFF";
  UI.mission.textContent=`${PGR.floorInfo(run).name} — ${SYS.objectiveText(host,run,explore)}${run.modifier?` • ${run.modifier.name}`:""}`;
  UI.loadout.innerHTML=`<b>${esc(weapon.displayName||weapon.name)}</b><br>LV ${p1.level}/${cap} • ARM ${p1.armor} • AMMO ${p1.mana}/${p1.maxMana}<br>${inventoryText(p1)}`;
  UI.list.innerHTML="";updateQuests();
}
function updateQuests(){
  if(!run||!host)return;const explore=Math.round(PGR.roomCompletion(explored.get(p1?.id)||new Set(),world)*100),objective=SYS.objectiveText(host,run,explore),q=[{id:"main",label:objective,v:host.objective?.complete?1:0,t:1},{id:"games",label:"Rescue 1 C64 game",v:stats.games,t:1},{id:"secrets",label:"Find 2 secret rooms",v:stats.secrets,t:2},{id:"champions",label:"Defeat 2 champions",v:run.stats.champions,t:2}];
  for(const x of q.slice(1))if(x.v>=x.t&&!questDone.has(x.id)){questDone.add(x.id);score+=350;showToast("SIDE QUEST COMPLETE",`${x.label} — +350 score. Side quests do not add pickup XP.`,"green")}
  UI.quests.innerHTML=q.map(x=>`<div class="${x.v>=x.t?"quest-done":""}">${x.v>=x.t?"✓ ":""}${esc(x.label)} ${x.t>1?`<b>${Math.min(x.v,x.t)}/${x.t}</b>`:""}</div>`).join("");
}
function awardXP(p,amount,reason){if(!p||!run)return;const r=PGR.gainXP(p,run,amount,reason);if(r.debtPaid)floatText(p.x,p.y,`-${r.debtPaid} XP DEBT`,P.purple);if(r.amount)floatText(p.x,p.y,`+${r.amount} XP`,P.cyan);if(r.discarded&&p._capNoticeFloor!==run.floor){p._capNoticeFloor=run.floor;showToast(`FLOOR ${run.floor} LEVEL CAP ${r.cap}`,"Further XP on this floor is discarded. Descend to raise the cap and continue levelling.","cyan",8000)}if(r.levels.length){const pickupAt=Number(p._ccgPickupAudioAt||0),pickupAge=performance.now()-pickupAt,levelDelay=pickupAt>0&&pickupAge>=0&&pickupAge<240?Math.ceil(260-pickupAge):0;if(levelDelay>0)setTimeout(()=>S.sfx("level"),levelDelay);else S.sfx("level");try{window.dispatchEvent(new CustomEvent("ccg:level-up",{detail:{player:p,levels:[...r.levels],level:p.level,floor:run.floor,reason:String(reason||"")}}))}catch(_){}showToast(`LEVEL ${p.level}`,p.level>=r.cap?`Upgrade earned. Floor ${run.floor} is now capped at Level ${r.cap}. Descend for further progression.`:"Choose a permanent upgrade for this run.","gold",7000);queueLevelChoice(p)}sync()}
function pendingLevelCount(p){return Math.max(0,Math.floor(Number(p?.pendingLevels)||0))}
function rememberPendingLevelChoice(p){if(!p||pendingLevelCount(p)<=0)return false;if(!levelQueue.includes(p))levelQueue.push(p);return true}
function trimLevelQueue(){while(levelQueue.length&&pendingLevelCount(levelQueue[0])<=0)levelQueue.shift();return levelQueue[0]||null}
function queueLevelChoice(p){if(!rememberPendingLevelChoice(p))return false;if(mode==="playing")showNextLevelChoice();return true}
function deferLevelChoice(){const p=trimLevelQueue();if(mode!=="levelup"||!p)return false;const pending=pendingLevelCount(p),index=levelQueue.indexOf(p);if(index>=0)levelQueue.splice(index,1);UI.levelUp.classList.add("hidden");mode="playing";input.clear();showToast("LEVEL-UP SAVED",pending===1?"Your unused upgrade is still available from the XP panel.":`${pending} unused upgrades are still available from the XP panel.`,"gold",6500);sync();return true}
function reopenPendingLevelChoice(p=p1){if(!rememberPendingLevelChoice(p))return false;if(mode==="playing"){showNextLevelChoice();return true}if(mode==="levelup"){UI.levelUp?.classList.remove("hidden");return true}return false}
function showNextLevelChoice(){const p=trimLevelQueue();if(!p||mode==="levelup")return;const pending=pendingLevelCount(p);mode="levelup";input.clear();const choices=PGR.skillChoices(p);UI.levelCopy.textContent=pending===1?`${p.name} has an unused level-up. Pick one upgrade now or choose later.`:`${p.name} has ${pending} unused level-ups. Pick one upgrade now or choose later.`;UI.levelChoices.innerHTML="";for(const s of choices){const b=document.createElement("button");b.innerHTML=`<b>${esc(s.name)}</b>${esc(s.desc)}`;b.addEventListener("click",()=>{const chosen=PGR.applySkill(p,s.id);if(!chosen)return;showToast(chosen.name,chosen.desc,"green");if(pendingLevelCount(p)<=0){const index=levelQueue.indexOf(p);if(index>=0)levelQueue.splice(index,1)}UI.levelUp.classList.add("hidden");mode="playing";sync();if(trimLevelQueue())setTimeout(showNextLevelChoice,120)});UI.levelChoices.appendChild(b)}UI.levelUp.classList.remove("hidden")}

function shopScorePrice(shop){return 1000*(2**Math.max(0,Math.floor(Number(shop?.scorePurchases)||0)))}
function renderShop(){if(!activeShop||!p1||!UI.shopItems)return;const artefacts=PGR.inventoryKindCount(p1,"artefact"),price=shopScorePrice(activeShop),sold=activeShop.sold||{},inventoryFull=PGR.inventoryCapacity(p1)>=C.player.inventorySlots,stage7=window.CCGLostSizzlerV142Stage7NpcMerchant?.describeShop?.(activeShop),isAlchemist=Boolean(activeShop.v142Alchemist||String(activeShop.title||"").includes("ALCHEMIST"));UI.shopTitle.textContent=stage7?.heading||activeShop.title||"DUNGEON SUPPLY SHOP";UI.shopCopy.textContent=stage7?.copy||(activeShop.shopType==="hidden"?"You found the hidden floor trader. Normal score stock can be bought repeatedly; this shop keeps its own doubling price ladder.":"Entrance supply desk. Normal score stock can be bought repeatedly, and this shop has a fresh doubling price ladder.");UI.shopScore.textContent=pad(score);UI.shopArtefacts.textContent=String(artefacts);UI.shopNextPrice.textContent=String(price);const defs=[
  ...(isAlchemist?[{id:"banishment",name:"BANISHMENT FLASK · ESSENCE",kind:"banishment",price:`${Math.max(1,Math.floor(Number(window.CCGLostSizzlerV142ProceduralOverhaul?.essenceCost?.(p1))||Number(C.stalker.flaskArtefacts)||3))} ESSENCE`,desc:"Distil one Flask from Banishment Essence at an Alchemist. Score and Gold are unchanged.",sold:false}]:[]),
  {id:"potion",name:"RESTORATION POTION",kind:"potion",price:`${price} SCORE`,desc:"Adds one Health Potion to the Potion stack. Buy again whenever the stack has room.",sold:false},
  {id:"torch",name:"FLAMING TORCH",kind:"torch",price:`${price} SCORE`,desc:"Adds one Torch to the Torch stack. Buy again whenever an inventory slot is available.",sold:false},
  {id:"teleport",name:"TELEPORT SPELL",kind:"teleport",price:`${price} SCORE`,desc:"Adds one safe-room Teleport Spell. Press R to cast. Repeat purchases are allowed.",sold:false},
  {id:"inventorySlot",name:"INVENTORY SLOT",kind:"inventorySlot",price:`${price} SCORE`,desc:`Expands this run's inventory by one slot. Repeat purchases are allowed until all ${C.player.inventorySlots} slots are open.`,sold:inventoryFull,maxed:inventoryFull},
  {id:"ammo",name:"AMMO CRATE",kind:"ammo",price:`${price} SCORE`,desc:"Restores 50 ammunition immediately. Repeat purchases are allowed.",sold:false},
  {id:"armour",name:"ARMOUR REPAIR",kind:"armour",price:`${price} SCORE`,desc:"Adds 3 armour immediately, up to the normal armour limit. Repeat purchases are allowed.",sold:false},
  {id:"weapon",name:"WEAPON CACHE",kind:"weapon",price:`${price} SCORE`,desc:"Rolls a fresh weapon scaled to this floor. Repeat purchases are allowed.",sold:false}];
  UI.shopItems.innerHTML=defs.map(d=>`<article class="shop-item ${d.sold?"sold":""}"><div class="shop-item-icon">${itemIconSVG(d.kind,d.name)}</div><div><h3>${esc(d.name)}</h3><span class="price">${esc(d.price)}</span><p>${esc(d.desc)}</p><button data-shop-buy="${d.id}" ${d.sold?"disabled":""}>${d.maxed?"MAXIMUM REACHED":d.sold?"SOLD / TRADED":"BUY / TRADE"}</button></div></article>`).join("");UI.shopItems.querySelectorAll?.("[data-shop-buy]").forEach(b=>b.addEventListener("click",()=>buyShopItem(b.dataset.shopBuy)))}
function openShop(shop,p=p1){if(!shop?.active||!p||!UI.shop)return false;activeShop=shop;try{const stage7=window.CCGLostSizzlerV142Stage7NpcMerchant;stage7?.enterShop?.(shop,stage7.contextFor?.(world,run,shop)||{})}catch(_){}mode="shop";input.clear();renderShop();UI.shop.classList.remove("hidden");requestAnimationFrame(()=>{const first=UI.shopItems?.querySelector?.("[data-shop-buy]:not([disabled])")||$("shop-close");first?.focus?.({preventScroll:true})});S.sfx("shrine");return true}
function closeShop(){UI.shop?.classList.add("hidden");activeShop=null;if(mode==="shop")mode="playing";try{focusGameplayKeyboard()}catch(_){}sync()}
function buyShopItem(id){
  if(!activeShop||!p1)return false;activeShop.sold=activeShop.sold||{};
  if(id==="banishmentScore"){showToast("ESSENCE ONLY","Banishment Flasks are distilled from Essence. Score cannot buy them.","cyan",5200);return false}
  if(id==="banishment"){
    const isAlchemist=Boolean(activeShop?.v142Alchemist||String(activeShop?.title||"").includes("ALCHEMIST"));
    if(!isAlchemist){showToast("ALCHEMIST REQUIRED","Banishment Flasks can only be distilled from Essence at a Banishment Alchemist.","cyan",5200);return false}
    const bridge=window.CCGLostSizzlerV142ArtefactShopStability;
    if(typeof bridge?.tradeArtefactsForFlask==="function")return bridge.tradeArtefactsForFlask();
    const need=Math.max(1,Math.floor(Number(window.CCGLostSizzlerV142ProceduralOverhaul?.essenceCost?.(p1))||Number(C.stalker.flaskArtefacts)||3));
    const have=Math.max(0,Math.floor(Number(p1.banishmentEssence)||0));
    if(have<need){showToast("NOT ENOUGH BANISHMENT ESSENCE",`The Alchemist requires ${need} Essence. Your Vessel currently holds ${have}.`,"red",6500);return false}
    if(!PGR.inventoryCanAdd(p1,{kind:"banishment"})){showToast("INVENTORY FULL","Free a slot or make room in an existing Banishment stack before distilling a Flask.","red",6500);return false}
    p1.banishmentEssence=have-need;PGR.inventoryAdd(p1,{kind:"banishment",name:"Banishment Flask",short:"BANISH"});
    S.sfx("shrine");showToast("BANISHMENT FLASK DISTILLED",`${need} Essence consumed. Exactly one Banishment Flask has been added; Score is unchanged.`,"gold",8000);
    host.revision++;renderShop();sync();return true
  }
  {const price=shopScorePrice(activeShop);if(id==="inventorySlot"&&PGR.inventoryCapacity(p1)>=C.player.inventorySlots){showToast("INVENTORY FULLY EXPANDED",`All ${C.player.inventorySlots} inventory slots are already open.`,"cyan",5200);return false}if(score<price){showToast("NOT ENOUGH SCORE",`${id.toUpperCase()} costs ${price.toLocaleString()} score at this shop. You currently have ${score.toLocaleString()}.`,"red",6000);return false}if(["potion","torch","teleport"].includes(id)&&!PGR.inventoryCanAdd(p1,{kind:id})){showToast("INVENTORY FULL",`The ${id} cannot fit under its stack rule. Free or expand a slot.`,"red",6000);return false}score-=price;let boughtName=id.toUpperCase();if(id==="potion"){PGR.inventoryAdd(p1,{kind:"potion",name:"Restoration Potion",short:"POTION"});boughtName="Restoration Potion"}else if(id==="torch"){PGR.inventoryAdd(p1,{kind:"torch",name:"Flaming Torch",short:"TORCH"});boughtName="Flaming Torch"}else if(id==="teleport"){PGR.inventoryAdd(p1,{kind:"teleport",name:"Teleport Spell",short:"WARP"});boughtName="Teleport Spell"}else if(id==="inventorySlot"){p1.inventorySlots=Math.min(C.player.inventorySlots,PGR.inventoryCapacity(p1)+1);boughtName=`Inventory Expansion (${p1.inventorySlots} slots)`}else if(id==="ammo"){const before=p1.mana;p1.mana=Math.min(p1.maxMana,p1.mana+50);p1.ammoFlashMs=C.player.ammoFlashMs;boughtName=`Ammo Crate (+${p1.mana-before})`}else if(id==="armour"){const before=p1.armor||0;p1.armor=Math.min(12,before+3);boughtName=`Armour Repair (+${p1.armor-before})`}else if(id==="weapon"){const w=PGR.generateWeapon(6+(run.floor||1)*2,run.floor||1,Math.random,.08);equipWeapon(p1,w);boughtName="Weapon Cache"}else return false;activeShop.scorePurchases=(activeShop.scorePurchases||0)+1;S.sfx("pickup");showToast("SHOP PURCHASE",`${boughtName} purchased for ${price.toLocaleString()} score. The next score item at this shop costs ${shopScorePrice(activeShop).toLocaleString()}.`,"green",7500)}host.revision++;try{window.CCGLostSizzlerV142Stage7NpcMerchant?.noteTransaction?.(activeShop,id)}catch(_){}renderShop();sync();return true}

function itemInfoDetails(it){
  if(!it)return{name:"EMPTY SLOT",kind:"empty",desc:"Free inventory slot.",why:"Nothing is being carried here."};const name=PGR.inventoryLabel(it),kind=inventoryVisualKind(it),desc=itemHelp(it.kind),why=it.kind==="artefact"?`BANISHMENT ESSENCE: current runs store this in the Vessel instead of a slot. Distil the current Essence cost at a Banishment Alchemist for one Flask; Score cannot buy it.`:it.kind==="torch"?"TORCHES MATTER: Q is always Torch. Every torch occupies its own inventory slot.":it.kind==="banishment"?`BANISHMENT MATTERS: Q never consumes it. Move within ${C.stalker.banishPromptDistance||8} tiles of a Death Stalker or Count Loadula and use the flashing B prompt.`:it.kind==="potion"?"POTIONS MATTER: each stack holds at most three. Press E for a fast heal without opening this screen.":`This item occupies one of ${PGR.inventoryCapacity(p1)} current slots. The late-game weight bridge still requires the entire inventory to be empty.`;return{name,kind,desc,why}
}
function showItemInfo(index){const it=p1?.inventory?.[index];if(!it||!UI.itemInfo)return;const d=itemInfoDetails(it);UI.itemInfoTitle.textContent=d.name;UI.itemInfoIcon.innerHTML=itemIconSVG(d.kind,d.name);UI.itemInfoText.innerHTML=`<p>${esc(d.desc)}</p><h3>WHY IT MATTERS</h3><p>${esc(d.why)}</p>`;UI.itemInfo.classList.remove("hidden")}
function hideItemInfo(){UI.itemInfo?.classList.add("hidden")}
let dossierFocusName="";
function renderNamedDossier(){if(!UI.namedDossierList)return;const dossier=PGR.readDossier();UI.namedDossierList.innerHTML=C.followerElites.map(f=>{const row=dossier[f.name]||{encounters:0,defeats:0},freed=(row.defeats||0)>0,seen=(row.encounters||0)>0||freed,state=freed?"FREED FROM THE DUNGEON":seen?"ENCOUNTERED":"NOT ENCOUNTERED",focus=dossierFocusName===f.name?" focused":"",portrait=OVERRIDES.images?.namedEnemies?.[f.name]||f.avatar||C.logoFallback;return `<article class="dossier-entry ${freed?"freed":seen?"encountered":"unknown"}${focus}"><img src="${esc(portrait)}" alt="${esc(f.name)}"><div><b>${esc(f.name)}</b><span class="dossier-type">${esc(f.kind.toUpperCase())} • ARM ${f.armor||0} • TORCH CARRIER</span><span class="dossier-state">${state}</span><div class="dossier-stats"><span class="dossier-stat"><span>ENCOUNTERS</span><strong>${row.encounters||0}</strong></span><span class="dossier-stat"><span>FREED</span><strong>${row.defeats||0}</strong></span></div><p class="dossier-trait"><strong>STRENGTH:</strong> ${esc(f.strength||"Adaptive combat behaviour.")}</p><p class="dossier-trait weakness"><strong>WEAKNESS:</strong> ${esc(f.weakness||"No confirmed weakness.")}</p>${freed?`<p class="dossier-lore">You did not kill ${esc(f.name)}. Breaking the dungeon corruption freed them from its control.</p>`:""}</div></article>`}).join("");if(dossierFocusName)setTimeout(()=>UI.namedDossierList?.querySelector?.(".focused")?.scrollIntoView?.({block:"center"}),40)}
function showNamedDossier(name="",pauseRun=true){dossierFocusName=typeof name==="string"?name:"";renderNamedDossier();UI.namedDossier?.classList.remove("hidden");if(pauseRun&&mode==="playing"){mode="dossier";input.clear()}}
function hideNamedDossier(){UI.namedDossier?.classList.add("hidden");dossierFocusName="";if(mode==="dossier")mode="playing"}
function inventoryUnavailableNotice(title,text,tone="cyan"){const notice=$("inventory-mobile-notice");if(notice){notice.textContent=`${title}: ${text}`;notice.className=`inventory-mobile-notice ${tone}`}showToast(title,text,tone,6000)}
function renderInventoryPanel(){if(!p1)return;
  const explore=Math.round(PGR.roomCompletion(explored.get(p1.id)||new Set(),world)*100),weapon=p1.weapon||baseWeapon(),clue=run.torchClueSeen&&Array.isArray(run.torchSequence)?`<small class="clue-log">CLUE LOG • FADED BLOOD: ${run.torchSequence.join(" → ")}</small>`:"";
  if(UI.inventoryObjective)UI.inventoryObjective.innerHTML=`<b>CURRENT OBJECTIVE</b><span>${esc(SYS.objectiveText(host,run,explore))}</span><small>${esc(PGR.floorInfo(run).name)}${run.modifier?` • ${esc(run.modifier.name)}`:""}</small>${clue}`;
  const cap=PGR.floorLevelCap(run),atCap=p1.level>=cap,load=document.getElementById("inventory-loadout");if(load)load.innerHTML=`<b>PLAYER STATUS</b><span>LV ${p1.level}/${cap} FLOOR CAP • HP ${p1.health}/${p1.maxHealth} • ARM ${p1.armor} • AMMO ${p1.mana}/${p1.maxMana} • EARNED XP ${p1.totalXp||0} • ${atCap?"XP STOPPED AT CAP":`LEVEL XP ${p1.xp}/${PGR.xpNeed(p1.level)}`}</span><small>${esc(weapon.displayName||weapon.name)} • MAP ${explore}% • ${p1.torchMs>0?`TORCH ${Math.ceil(p1.torchMs/1000)}s`:"NO ACTIVE TORCH"}</small>`;
  const currentSlots=PGR.inventoryCapacity(p1);UI.inventoryList.innerHTML=Array.from({length:C.player.inventorySlots},(_,i)=>{const locked=i>=currentSlots,it=locked?null:p1.inventory?.[i],kind=inventoryVisualKind(it),usable=it&&["potion","torch","teleport","banishment"].includes(it.kind);return `<div class="inventory-slot ${locked?"locked":it?"filled":"empty"}"${locked?' aria-disabled="true"':""}><div class="inventory-slot-icon">${locked?`<span class="locked-slot-mark" aria-hidden="true">×</span>`:it?itemIconSVG(kind,PGR.inventoryLabel(it)):`<span class="empty-slot-mark">${i+1}</span>`}</div><div class="inventory-slot-copy"><b>SLOT ${i+1}${locked?" · LOCKED":""}</b><span>${locked?"BUY AT SHOPS":esc(it?PGR.inventoryLabel(it):"EMPTY")}</span>${locked?"<small>Purchase an Inventory Slot expansion at a dungeon shop to unlock this position.</small>":it?`<small>${esc(itemHelp(it.kind))}</small><div class="slot-actions">${usable?`<button data-use="${i}">USE</button>`:""}<button data-info="${i}">INFO</button><button data-drop="${i}">DROP</button></div>`:"<small>Free inventory slot.</small>"}</div></div>`}).join("");
  const guide=document.getElementById("inventory-guide");if(guide)guide.innerHTML=guideDefinitions().map(r=>`<div class="inventory-guide-entry"><div class="inventory-guide-icon">${itemIconSVG(r.kind,r.name)}</div><div><b>${esc(r.name)}</b><span>${esc(r.desc)}</span></div></div>`).join("");
  UI.inventoryList.querySelectorAll?.("[data-use]").forEach(b=>b.addEventListener("click",()=>useInventorySlot(p1,Number(b.dataset.use))));UI.inventoryList.querySelectorAll?.("[data-info]").forEach(b=>b.addEventListener("click",()=>showItemInfo(Number(b.dataset.info))));UI.inventoryList.querySelectorAll?.("[data-drop]").forEach(b=>b.addEventListener("click",()=>dropInventorySlot(p1,Number(b.dataset.drop))));UI.inventoryList.querySelectorAll?.(".inventory-slot.locked").forEach(slot=>slot.addEventListener("click",()=>inventoryUnavailableNotice("INVENTORY SLOT LOCKED","Buy an Inventory Slot expansion at a dungeon shop to unlock this position.","red")));UI.inventoryList.querySelectorAll?.(".inventory-slot.empty").forEach(slot=>slot.addEventListener("click",()=>inventoryUnavailableNotice("EMPTY INVENTORY SLOT","You do not currently have an item stored in this slot.","cyan")))
}
function toggleInventory(){if(!p1)return;if(!UI.inventory.classList.contains("hidden")){UI.inventory.classList.add("hidden");if(mode==="inventory")mode="playing";return}renderInventoryPanel();UI.inventory.classList.remove("hidden");if(mode==="playing")mode="inventory"}
function checkMapRewards(p){if(!host?.mapRewards)return;const pct=PGR.roomCompletion(explored.get(p.id)||new Set(),world);for(const [mark,key,bonus] of [[.75,"r75",180],[.90,"r90",280],[1,"r100",500]])if(pct>=mark&&!host.mapRewards[key]){host.mapRewards[key]=true;score+=bonus;showToast(`${Math.round(mark*100)}% FLOOR MAPPED`,`${mark===1?"Every ordinary room has been charted. Excellent nosiness.":"Exploration milestone reached."} +${bonus} score; entering rooms grants no XP.`,"cyan")}}
function bankClearedFloorProgress(){
  const floorNo=Number(run?.floor||1),firstBank=Number(run?.v142BankedFloor||0)!==floorNo;
  if(firstBank){const collection=PGR.bankFloor(run);run.v142BankedFloor=floorNo;return collection}
  const hasNewProgress=Number(run?.floorXP||0)>0||(Array.isArray(run?.floorGames)&&run.floorGames.length>0);
  if(!hasNewProgress)return PGR.persistentCollection();
  const countedFloors=Number(run?.stats?.floors||0),collection=PGR.bankFloor(run);
  if(run?.stats)run.stats.floors=countedFloors;
  return collection
}
function floorComplete(by){if(run.floorComplete||mode!=="playing")return;run.floorComplete=true;mode="floorcomplete";input.clear();const collection=bankClearedFloorProgress();PGR.checkAchievements(run,p1);UI.floorTitle.textContent=`FLOOR ${run.floor} CLEARED`;UI.floorSummary.innerHTML=`${esc(PGR.floorInfo(run).name)} cleared by ${esc(by)}.<br><br>XP safely kept from cleared floors: ${run.bankedXP}<br>Unique C64 titles permanently saved on this device: ${collection.length}<br><small>Duplicates count once.</small><br>Kills: ${run.stats.kills} • Secrets: ${run.stats.secrets} • Chests: ${run.stats.chests}<br><br>${run.floor<C.maxFloors?"Descend when ready, stay on this floor to finish optional business, or bank your loot and exit.":"The Citadel is finished. You can still stay on this floor before ending the run."}`;UI.descend.style.display=run.floor<C.maxFloors?"":"none";if(UI.stay)UI.stay.style.display="";UI.extract.textContent=run.floor<C.maxFloors?"Save Loot & Exit":"Finish Run";UI.floorComplete.classList.remove("hidden");S.sfx("win")}
function stayOnFloor(){if(!run||mode!=="floorcomplete")return false;UI.floorComplete.classList.add("hidden");run.floorComplete=false;mode="playing";input.clear();S.startMusic();focusGameplayKeyboard();showToast("FLOOR CLEARED — EXPLORATION CONTINUES","Optional rooms, caches and unresolved objectives remain available. Return to the exit when you are ready to descend.","cyan",7600);sync();return true}
function descendFloor(){if(!run||run.floor>=C.maxFloors)return endRun("Citadel cleared");UI.floorComplete.classList.add("hidden");run.floor++;run.deepest=Math.max(run.deepest,run.floor);run.floorComplete=false;run.consecutiveDeaths=0;run.modifier=PGR.chooseFloorModifier(run);startWorld(PGR.floorSeed(run),false,true);mode="playing";S.startMusic();try{window.CCGLostSizzlerVoice?.say?.("descending",{cooldown:0})}catch(_){}const enteredFloor=run.floor;if(enteredFloor>=3)setTimeout(()=>{if(mode!=="playing"||run?.floor!==enteredFloor)return;try{window.CCGLostSizzlerVoice?.say?.(enteredFloor>=5?"buriedWarning":"deepeningDungeon",{cooldown:0})}catch(_){}},3300);captureFloorEntryCheckpoint();setTimeout(()=>offerFloorSave(false),120);PGR.checkAchievements(run,p1)}
function extractRun(){UI.floorComplete.classList.add("hidden");endRun(run.floor>=C.maxFloors?"Citadel cleared":"Loot banked and run extracted")}
function weeklyResultPayload(){return{score:Math.floor(score),deepestFloor:run?.deepest||run?.floor||1,durationMs:Math.floor(run?.elapsed||0),level:p1?.level||1,completed:Boolean(run?.runComplete&&run?.deepest>=C.maxFloors),kills:run?.stats?.kills||0,secrets:run?.stats?.secrets||0}}
async function submitWeeklyResultOnce(){if(!run?.daily||run.weeklySubmitted)return null;run.weeklySubmitted=true;return window.CCGWeeklyChallenge?.finish?.(weeklyResultPayload())||null}
function endRun(reason){
  if(!run)return;mode="ended";run.runComplete=!run.dailyFailed&&!run.xpGameOver;S.setStalkerNear(false);S.setNamedEnemy?.(null);S.stopMusic();if(!run.daily)PGR.clearCheckpoint();updateSavedRunButton();
  const dailyBest=run.daily?PGR.recordDailyResult(run,score,p1):null;if(run.daily)submitWeeklyResultOnce();
  UI.endTitle.textContent=run.xpGameOver?"GAME OVER — XP DEPLETED":run.floor>=C.maxFloors&&!run.dailyFailed?"CITADEL CLEARED":run.daily?(run.dailyFailed?"WEEKLY VAULT ATTEMPT ENDED":"WEEKLY VAULT COMPLETE"):"RUN EXTRACTED";
  UI.endText.innerHTML=`${esc(reason)}.<br><br><strong>FINAL SCORE ${pad(score)}</strong><br>Deepest floor: ${run.deepest}/${C.maxFloors}<br>XP safely kept from cleared floors: ${run.bankedXP}<br>Kills: ${run.stats.kills}<br>Champions: ${run.stats.champions}<br>Secrets: ${run.stats.secrets}<br>Damage taken: ${run.stats.damageTaken}<br>Unique C64 titles permanently saved on this device: ${PGR.persistentCollection().length}<br><small>Duplicates count once. Clearing this website's browser data resets the saved collection.</small>${run.daily&&dailyBest?`<br><br><strong>WEEKLY RESULT</strong>: ${dailyBest.score} points • floor ${dailyBest.deepest} • level ${dailyBest.level}<br>Try again after the next Monday 00:00 UTC reset.`:""}`;
  UI.end.classList.remove("hidden");refreshCollection()
}
