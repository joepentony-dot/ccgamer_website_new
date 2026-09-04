/* The Lost Sizzler V10.41 — Stage 8 event-driven NPC dialogue foundation. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_STAGE8_NPC_DIALOGUE__)return;
  window.__CCG_LOST_SIZZLER_STAGE8_NPC_DIALOGUE__=true;

  const REPEAT_MS=7000;
  const ENVIRONMENTAL_STORY_BUDGET=3;
  const EXPLORATION_INTERACTION_BUDGET=2;
  const SPECIAL_MODES=new Set(["horde-survivor","sizzler-saboteurs"]);
  const memory=new WeakMap();
  const environmentalSeen=new WeakSet();
  const environmentalFloors=new WeakMap();
  const explorationFloors=new WeakMap();
  const state={installed:false,merchantInstalled:false,sanctuaryInstalled:false,assignmentGate:false,reAdoptions:0,presentations:0,suppressed:0,merchantTaskBriefings:0,environmentalPresentations:0,environmentalBudgetSkips:0,explorationPresentations:0,explorationBudgetSkips:0,scoutEventObserver:false,last:null,lastMerchantTask:null};
  const lines=Object.freeze({
    scout:Object.freeze({
      trapped:Object.freeze({key:"scout.trapped",title:"CCG SCOUT — FOUND",speaker:"Scout",text:"There you are. Get me to one of the permanently lit sanctuary rooms and I’ll stay close.",tone:"green",duration:7600,voiceKey:"npc.scout.found"}),
      following:Object.freeze({key:"scout.following",title:"CCG SCOUT — FOLLOWING",speaker:"Scout",text:"Still here. Keep heading for the lights; I’m right behind you.",tone:"cyan",duration:6000,voiceKey:"npc.scout.following"}),
      rescued:Object.freeze({key:"scout.rescued",title:"CCG SCOUT — SAFE",speaker:"Scout",text:"Made it. I’m staying with the lights. If you find anyone else down here, send them this way.",tone:"green",duration:7000,voiceKey:"npc.scout.safe"})
    }),
    merchant:Object.freeze({
      entrance:Object.freeze({key:"merchant.entrance",title:"DUNGEON QUARTERMASTER",speaker:"Quartermaster",text:"Stock’s on the counter. Score buys supplies; rare artefacts buy the Flask. Take what you need and keep moving.",tone:"gold",duration:7200,voiceKey:"npc.merchant.entrance"}),
      hidden:Object.freeze({key:"merchant.hidden",title:"SECRET ARTEFACT TRADER",speaker:"Trader",text:"You found me. Bring enough rare artefacts and I’ll exchange them for a Banishment Flask. Score works too.",tone:"purple",duration:7600,voiceKey:"npc.merchant.hidden"})
    }),
    sanctuary:Object.freeze({
      keeper:Object.freeze({key:"sanctuary.keeper",title:"SANCTUARY KEEPER",speaker:"Keeper",text:"You’re safe while you’re in here. Use the green square if you need patching up, then get back to it.",tone:"green",duration:9000,voiceKey:"npc.sanctuary.keeper"})
    }),
    environment:Object.freeze({
      C64_ARCHIVE:Object.freeze({key:"environment.c64-archive",title:"ARCHIVE MAINTENANCE CARD",text:"The catalogue marks cracked masonry separately from ordinary doors. Hidden routes are optional, but their shelves usually hold better supplies.",tone:"cyan",duration:8200,voiceKey:"environment.c64-archive"}),
      "1541_WORKSHOP":Object.freeze({key:"environment.1541-workshop",title:"1541 SERVICE LOG",text:"A grease-stained note warns that illuminated generators can keep producing reinforcements. Breaking the machine stops them.",tone:"green",duration:8200,voiceKey:"environment.1541-workshop"}),
      BUDGET_BIN:Object.freeze({key:"environment.budget-bin",title:"FADED PRICE CARD",text:"The old stock list mentions two currencies: score at the quartermaster, rare artefacts at the hidden trader.",tone:"gold",duration:8000,voiceKey:"environment.budget-bin"}),
      DEMO_LOUNGE:Object.freeze({key:"environment.demo-lounge",title:"SCENE NOTICE",text:"The raster display maps lit chambers in green. Permanent sanctuary light keeps monsters outside and restores health on the marked square.",tone:"purple",duration:8400,voiceKey:"environment.demo-lounge"}),
      SID_REACTOR:Object.freeze({key:"environment.sid-reactor",title:"REACTOR WARNING",text:"A low-frequency alarm repeats one instruction: watch the floor signal before crossing an active chamber.",tone:"red",duration:7800,voiceKey:"environment.sid-reactor"}),
      WARP_GALLERY:Object.freeze({key:"environment.warp-gallery",title:"TRANSIT PLAQUE",text:"Scratched arrows point toward explored rooms. Teleport spells need a known chamber to lock onto.",tone:"purple",duration:7600,voiceKey:"environment.warp-gallery"}),
      ZZAP_LIBRARY:Object.freeze({key:"environment.zzap-library",title:"REVIEWER’S MARGIN NOTE",text:"The floor objective opens the reinforced hall, but the exit still needs the Sigil carried by its Warden.",tone:"gold",duration:8400,voiceKey:"environment.zzap-library"}),
      TAPE_STORE:Object.freeze({key:"environment.tape-store",title:"LOADER INSTRUCTION CARD",text:"A handwritten warning says strong draughts extinguish an active torch. Spares in your inventory remain safe.",tone:"cyan",duration:8000,voiceKey:"environment.tape-store"}),
      CARTRIDGE_BAY:Object.freeze({key:"environment.cartridge-bay",title:"BAY INVENTORY NOTE",text:"A stamped card lists bronze keys as floor equipment. They open matching locks and are never required for secret routes.",tone:"green",duration:8200,voiceKey:"environment.cartridge-bay"}),
      PIXEL_FOUNDRY:Object.freeze({key:"environment.pixel-foundry",title:"FOUNDRY SAFETY SHEET",text:"Ordinary furniture can be broken to open a firing lane. Structural pillars and sealed mechanisms cannot.",tone:"orange",duration:8000,voiceKey:"environment.pixel-foundry"}),
      MODEM_EXCHANGE:Object.freeze({key:"environment.modem-exchange",title:"TERMINAL MESSAGE",text:"The last transmission says wandering threats can follow through open rooms. Sanctuary doors remain the reliable boundary.",tone:"cyan",duration:8000,voiceKey:"environment.modem-exchange"}),
      HIGH_SCORE_CRYPT:Object.freeze({key:"environment.high-score-crypt",title:"SCOREKEEPER’S INSCRIPTION",text:"Banked floor XP survives. Carried loot and part of the current score stay exposed in one death cache until recovered.",tone:"gold",duration:8600,voiceKey:"environment.high-score-crypt"}),
      CRT_MAZE:Object.freeze({key:"environment.crt-maze",title:"CRT CALIBRATION NOTE",text:"The radar records rooms you have reached, not every corridor beyond them. Unexplored branches remain dark.",tone:"green",duration:8000,voiceKey:"environment.crt-maze"})
    }),
    exploration:Object.freeze({
      deadEnd:Object.freeze({key:"exploration.dead-end",title:"SIDE ALCOVE SEARCHED",text:"This branch ends here. Its small cache is an exploration reward; the main floor route continues elsewhere.",tone:"gold",duration:7600,voiceKey:"exploration.dead-end"}),
      shortcut:Object.freeze({key:"exploration.shortcut",title:"DUNGEON SHORTCUT FOUND",text:"This passage reconnects two explored routes without opening or bypassing a locked objective room.",tone:"green",duration:7800,voiceKey:"exploration.shortcut"}),
      gallery:Object.freeze({key:"exploration.gallery",title:"WIDE GALLERY",text:"The corridor opens into a broader firing lane. Furniture and corners still break line of sight.",tone:"cyan",duration:7400,voiceKey:"exploration.gallery"}),
      junction:Object.freeze({key:"exploration.junction",title:"JUNCTION POCKET",text:"Several corridor lines meet here. Check the radar before committing to the darker branch.",tone:"purple",duration:7400,voiceKey:"exploration.junction"}),
      parallelLoop:Object.freeze({key:"exploration.parallel-loop",title:"PARALLEL PASSAGE",text:"This side route rejoins the same corridor farther on and leaves progression locks untouched.",tone:"cyan",duration:7600,voiceKey:"exploration.parallel-loop"})
    })
  });

  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const controllerId=()=>{try{return String(window.CCGLostSizzlerModeRuntime?.detect?.()||document.body?.dataset?.modeController||"")}catch(_){return String(document.body?.dataset?.modeController||"")}};
  function soloDungeon(){
    if(SPECIAL_MODES.has(specialType()))return false;
    const detected=controllerId();
    if(detected)return detected==="dungeon-solo";
    try{return document.body?.dataset?.runActive==="true"&&String(playMode||"solo")==="solo"&&!p2&&document.body?.dataset?.hordeSolo!=="true"}catch(_){return false}
  }
  const clockNow=()=>{try{return performance.now()}catch(_){return Date.now()}};
  function withinReach(player,entity){
    if(!player||!entity)return false;
    try{return typeof md==="function"?md(player,entity)<=1:Math.abs(Number(player.x)-Number(entity.x))+Math.abs(Number(player.y)-Number(entity.y))<=1}catch(_){return false}
  }
  function scoutState(rescue){if(rescue?.rescued)return"rescued";if(rescue?.following)return"following";return"trapped"}
  function lineForScout(rescue,stateKey=""){const key=stateKey||scoutState(rescue);return lines.scout[key]||lines.scout.trapped}
  function fieldTaskSnapshot(){
    let games=0,secrets=0,champions=0;
    try{games=Math.max(0,Number(stats?.games||0));secrets=Math.max(0,Number(stats?.secrets||0));champions=Math.max(0,Number(run?.stats?.champions||0))}catch(_){}
    const tasks=[
      {id:"games",label:"Rescue 1 C64 game",progress:Math.min(1,games),target:1},
      {id:"secrets",label:"Find 2 secret rooms",progress:Math.min(2,secrets),target:2},
      {id:"champions",label:"Defeat 2 champions",progress:Math.min(2,champions),target:2}
    ];
    return tasks.find(task=>task.progress<task.target)||{id:"complete",label:"All field commissions complete",progress:3,target:3,complete:true}
  }
  function lineForMerchant(shop,task=fieldTaskSnapshot()){
    const base=shop?.shopType==="hidden"?lines.merchant.hidden:lines.merchant.entrance;
    const briefing=task.complete
      ?"Field board: all three commissions are complete; their normal +350 score reward path remains unchanged."
      :`Field commission: ${task.label} (${task.progress}/${task.target}). The existing +350 score reward is handled automatically.`;
    return{...base,text:`${base.text} ${briefing}`}
  }
  function present(entity,line,{player=null,force=false}={}){
    if(!soloDungeon()||!entity||!line)return false;
    if(player&&!withinReach(player,entity))return false;
    const now=clockNow(),previous=memory.get(entity);
    if(!force&&previous?.key===line.key&&now-previous.at<REPEAT_MS){state.suppressed++;return false}
    try{showToast(line.title,`${line.speaker}: ${line.text}`,line.tone,line.duration)}catch(_){return false}
    memory.set(entity,{key:line.key,at:now});
    state.presentations++;
    state.last={key:line.key,title:line.title,text:line.text,voiceKey:line.voiceKey,at:now};
    return true
  }
  function presentScout(player,{force=false,stateKey=""}={}){
    let rescue=null;try{rescue=host?.rescue||null}catch(_){return false}
    if(!rescue)return false;
    return present(rescue,lineForScout(rescue,stateKey),{player,force})
  }
  function presentMerchant(shop,{force=false}={}){
    if(!shop?.active)return false;
    const task=fieldTaskSnapshot(),shown=present(shop,lineForMerchant(shop,task),{force});
    if(shown){state.merchantTaskBriefings++;state.lastMerchantTask={...task,at:clockNow()}}
    return shown
  }
  function sanctuaryRoom(){
    if(!soloDungeon())return null;
    try{
      if(typeof W?.roomAt!=="function"||!world||!p1)return null;
      const roomId=W.roomAt(world,p1.x,p1.y),room=world.rooms?.[roomId]||null;
      return room?.sanctuary?room:null
    }catch(_){return null}
  }
  function augmentSanctuaryToast(callArgs){
    const args=[...callArgs];
    if(!soloDungeon()||!String(args[0]||"").toUpperCase().startsWith("SANCTUARY —"))return args;
    const room=sanctuaryRoom(),line=lines.sanctuary.keeper;
    if(!room)return args;
    const now=clockNow(),previous=memory.get(room);
    if(previous?.key===line.key&&now-previous.at<REPEAT_MS){state.suppressed++;return args}
    args[1]=`${String(args[1]||"")} ${line.speaker}: ${line.text}`.trim();
    memory.set(room,{key:line.key,at:now});
    state.presentations++;
    state.last={key:line.key,title:line.title,text:line.text,voiceKey:line.voiceKey,at:now};
    return args
  }
  function environmentalEligible(room){
    if(!room||room.sanctuary||room.sigilRoom||room.sigilGreatHall||room.dangerous||room.spiderNest||room.skeletonHorde||room.dedicatedHazard)return false;
    if(room.arenaRoom||room.timedRoom||room.boulderRoom||room.weightBridgeRoom||room.memoryPuzzleRoom||room.sequenceTorchRoom||room.bloodClueRoom)return false;
    if(room.traderRoom||room.developerRoom||room.goldenRoom||room.rareVortexPit)return false;
    return Boolean(lines.environment[room.theme])
  }
  function environmentalFloorState(){
    let currentWorld=null;try{currentWorld=world||null}catch(_){return null}
    if(!currentWorld||typeof currentWorld!=="object")return null;
    let record=environmentalFloors.get(currentWorld);
    if(!record){record={presented:0};environmentalFloors.set(currentWorld,record)}
    return record
  }
  function presentEnvironmentalStory(player,room,{force=false}={}){
    if(force||!soloDungeon()||!room||environmentalSeen.has(room)||!environmentalEligible(room))return false;
    try{if(typeof p1!=="undefined"&&player!==p1)return false}catch(_){return false}
    const floorState=environmentalFloorState();if(!floorState)return false;
    if(floorState.presented>=ENVIRONMENTAL_STORY_BUDGET){state.environmentalBudgetSkips++;return false}
    const line=lines.environment[room.theme];
    try{showToast(line.title,line.text,line.tone,line.duration)}catch(_){return false}
    environmentalSeen.add(room);floorState.presented++;state.presentations++;state.environmentalPresentations++;
    state.last={key:line.key,title:line.title,text:line.text,voiceKey:line.voiceKey,at:clockNow()};
    return true
  }
  function onRoomEntered(player,roomId,room,{force=false}={}){
    if(!Number.isFinite(Number(roomId))||Number(roomId)<0)return false;
    return presentEnvironmentalStory(player,room,{force})
  }
  function explorationFloorState(){
    let currentWorld=null;try{currentWorld=world||null}catch(_){return null}
    if(!currentWorld||typeof currentWorld!=="object")return null;
    let record=explorationFloors.get(currentWorld);
    if(!record){record={presented:0,seen:new Set()};explorationFloors.set(currentWorld,record)}
    return record
  }
  const featureContains=(feature,x,y)=>Array.isArray(feature?.cells)&&feature.cells.some(cell=>Number(cell?.x)===x&&Number(cell?.y)===y);
  function explorationFeatureAt(player){
    if(!player)return null;
    let meta=null;try{meta=world?.dungeonVariety||null}catch(_){return null}
    if(!meta)return null;
    const x=Number(player.x),y=Number(player.y);
    const deadEnd=(meta.deadEnds||[]).findIndex(point=>Number(point?.x)===x&&Number(point?.y)===y);
    if(deadEnd>=0)return{id:`dead-end:${deadEnd}`,kind:"deadEnd"};
    const groups=[["shortcut",meta.shortcuts],["gallery",meta.galleries],["junction",meta.junctions],["parallelLoop",meta.parallelLoops]];
    for(const [kind,features] of groups){const index=(features||[]).findIndex(feature=>featureContains(feature,x,y));if(index>=0)return{id:`${kind}:${index}`,kind}}
    return null
  }
  function presentExplorationFeature(player,feature){
    if(!soloDungeon()||!player||!feature||!lines.exploration[feature.kind])return false;
    try{if(typeof p1!=="undefined"&&player!==p1)return false}catch(_){return false}
    const floorState=explorationFloorState();if(!floorState||floorState.seen.has(feature.id))return false;
    if(floorState.presented>=EXPLORATION_INTERACTION_BUDGET){state.explorationBudgetSkips++;return false}
    const line=lines.exploration[feature.kind];
    try{showToast(line.title,line.text,line.tone,line.duration)}catch(_){return false}
    floorState.seen.add(feature.id);floorState.presented++;state.presentations++;state.explorationPresentations++;
    state.last={key:line.key,title:line.title,text:line.text,voiceKey:line.voiceKey,at:clockNow()};
    return true
  }
  function onMovementBoundary(player){
    if(!soloDungeon())return false;
    return presentExplorationFeature(player,explorationFeatureAt(player))
  }
  function ancestryHasMarker(source,marker){
    const seen=new Set();
    let current=source;
    while(typeof current==="function"&&!seen.has(current)){
      if(current[marker])return true;
      seen.add(current);
      current=current.__ccgOriginal;
    }
    return false
  }
  function wrapRescueOwner(source){
    if(typeof source!=="function")return source;
    if(ancestryHasMarker(source,"__ccgStage8NpcDialogue"))return source;
    const wrapped=function triggerRescueStage8Dialogue(player){
      let before=null;
      if(soloDungeon()){
        try{const rescue=host?.rescue;if(rescue)before={rescued:Boolean(rescue.rescued),following:Boolean(rescue.following),found:Boolean(rescue.found)}}catch(_){}
      }
      const result=source.apply(this,arguments);
      if(!before||!soloDungeon())return result;
      try{
        const rescue=host?.rescue;if(!rescue)return result;
        if(!before.rescued&&!before.following&&rescue.following&&rescue.found)present(rescue,lines.scout.trapped,{player});
        else if(rescue.rescued&&withinReach(player,rescue))present(rescue,lines.scout.rescued,{player});
        else if(rescue.following&&withinReach(player,rescue))present(rescue,lines.scout.following,{player});
      }catch(_){}
      return result
    };
    wrapped.__ccgStage8NpcDialogue=true;
    wrapped.__ccgOriginal=source;
    return wrapped
  }
  function wrapShopOwner(source){
    if(typeof source!=="function")return source;
    if(ancestryHasMarker(source,"__ccgStage8MerchantDialogue"))return source;
    const wrapped=function openShopStage8MerchantDialogue(shop,player){
      if(soloDungeon()&&shop?.active&&(player||typeof p1!=="undefined"&&p1))presentMerchant(shop);
      return source.apply(this,arguments)
    };
    wrapped.__ccgStage8MerchantDialogue=true;
    wrapped.__ccgOriginal=source;
    return wrapped
  }

  let rescueAssignmentGate=null;
  function installRescueAssignmentGate(){
    if(rescueAssignmentGate)return true;
    const descriptor=Object.getOwnPropertyDescriptor(window,"triggerRescue");
    if(descriptor&&!descriptor.configurable)return false;
    if(descriptor&&(descriptor.get||descriptor.set))return false;
    let current=wrapRescueOwner(window.triggerRescue);
    try{
      Object.defineProperty(window,"triggerRescue",{
        configurable:true,
        enumerable:descriptor?.enumerable??true,
        get(){return current},
        set(next){
          if(typeof next!=="function"){current=next;state.installed=false;return}
          const alreadyOwned=ancestryHasMarker(next,"__ccgStage8NpcDialogue");
          current=alreadyOwned?next:wrapRescueOwner(next);
          if(!alreadyOwned)state.reAdoptions++;
          state.installed=ancestryHasMarker(current,"__ccgStage8NpcDialogue")
        }
      });
    }catch(_){return false}
    rescueAssignmentGate={descriptor};
    state.assignmentGate=true;
    state.installed=ancestryHasMarker(current,"__ccgStage8NpcDialogue");
    return true
  }
  function installMerchantDialogue(){
    const source=window.openShop;
    if(typeof source!=="function")return false;
    if(ancestryHasMarker(source,"__ccgStage8MerchantDialogue")){state.merchantInstalled=true;return true}
    window.openShop=wrapShopOwner(source);
    state.merchantInstalled=ancestryHasMarker(window.openShop,"__ccgStage8MerchantDialogue");
    return state.merchantInstalled
  }
  function install(){
    const source=window.triggerRescue;
    if(typeof source!=="function")return false;
    if(!rescueAssignmentGate&&installRescueAssignmentGate())return Boolean(window.triggerRescue?.__ccgStage8NpcDialogue);
    if(ancestryHasMarker(source,"__ccgStage8NpcDialogue")){state.installed=true;return true}
    window.triggerRescue=wrapRescueOwner(source);
    state.installed=ancestryHasMarker(window.triggerRescue,"__ccgStage8NpcDialogue");
    return state.installed
  }

  function handleScoutFoundBoundary(){
    if(!soloDungeon())return false;
    const hadDialogueOwner=ancestryHasMarker(window.triggerRescue,"__ccgStage8NpcDialogue");
    install();
    if(hadDialogueOwner)return true;
    try{
      const rescue=host?.rescue||null,player=typeof p1!=="undefined"?p1:null;
      if(rescue?.following&&rescue?.found&&!rescue?.rescued)present(rescue,lines.scout.trapped,{player});
    }catch(_){}
    return ancestryHasMarker(window.triggerRescue,"__ccgStage8NpcDialogue")
  }

  function installScoutToastBridge(){
    const source=window.showToast;
    if(typeof source!=="function")return false;
    if(ancestryHasMarker(source,"__ccgStage8ScoutToastBridge")){state.sanctuaryInstalled=true;return true}
    const wrapped=function stage8ScoutToastBridge(title){
      const scoutFound=String(title||"").toUpperCase()==="CCG SCOUT FOUND";
      const args=augmentSanctuaryToast(arguments);
      const result=source.apply(this,args);
      if(scoutFound)handleScoutFoundBoundary();
      return result
    };
    wrapped.__ccgStage8ScoutToastBridge=true;
    wrapped.__ccgStage8SanctuaryDialogue=true;
    wrapped.__ccgOriginal=source;
    window.showToast=wrapped;
    state.sanctuaryInstalled=true;
    return true
  }

  function mutationContainsScoutFound(records,title){
    if(String(title?.textContent||"").trim().toUpperCase()==="CCG SCOUT FOUND")return true;
    for(const record of records||[]){
      if(record.type==="characterData"&&String(record.target?.data||"").trim().toUpperCase()==="CCG SCOUT FOUND")return true;
      for(const node of record.addedNodes||[]){
        if(String(node?.textContent||node?.data||"").trim().toUpperCase()==="CCG SCOUT FOUND")return true
      }
    }
    return false
  }

  let scoutToastObserver=null;
  function ensureScoutToastObserver(){
    if(scoutToastObserver||typeof MutationObserver!=="function")return Boolean(scoutToastObserver);
    const title=document.getElementById("pickup-title");
    if(!title)return false;
    scoutToastObserver=new MutationObserver(records=>{
      if(mutationContainsScoutFound(records,title))handleScoutFoundBoundary()
    });
    scoutToastObserver.observe(title,{childList:true,characterData:true,subtree:true});
    state.scoutEventObserver=true;
    return true
  }

  let installObserver=null;
  function ensureInstallObserver(){
    if(installObserver||typeof MutationObserver!=="function"||!document.body)return false;
    installObserver=new MutationObserver(()=>{install();installMerchantDialogue();installScoutToastBridge();ensureScoutToastObserver()});
    installObserver.observe(document.body,{attributes:true,attributeFilter:["data-release-ready","data-run-active","data-mode-controller"]});
    return true
  }
  function installWhenReady(){
    const installed=install();
    installMerchantDialogue();
    installScoutToastBridge();
    ensureScoutToastObserver();
    ensureInstallObserver();
    return installed
  }

  installWhenReady();
  queueMicrotask(installWhenReady);
  if(document.readyState!=="complete")addEventListener("load",installWhenReady,{once:true});
  window.CCGLostSizzlerStage8NpcDialogue={state,lines,soloDungeon,lineForScout,lineForMerchant,fieldTaskSnapshot,present,presentScout,presentMerchant,sanctuaryRoom,augmentSanctuaryToast,environmentalEligible,presentEnvironmentalStory,onRoomEntered,explorationFeatureAt,presentExplorationFeature,onMovementBoundary,install,installMerchantDialogue,installWhenReady,installScoutToastBridge,ensureScoutToastObserver,handleScoutFoundBoundary,installRescueAssignmentGate,ancestryHasMarker};
})();
