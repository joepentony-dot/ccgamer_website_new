/* The Lost Sizzler V10.42 r3 — Warden hunt guidance, optional quest visibility, floor briefings and safe exit confirmation. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_WARDEN_HUNT_GUIDANCE__)return;
  window.__CCG_LOST_SIZZLER_V142_WARDEN_HUNT_GUIDANCE__=true;

  const C=window.CCG_CONFIG,PGR=window.CCGProgression;
  if(!C||!PGR)return;

  const EXIT_CONFIRM_MS=12000;
  const PROFILES={
    1:{name:"STATIC VEIL",threat:"Sight is reduced inside the corrupted chamber.",cleanse:"Restore a lit refuge, neutralise local traps and remove this floor's corruption."},
    2:{name:"IRON SURGE",threat:"The Warden's bound generator cycles faster while the domain survives.",cleanse:"Cut the reinforcement link, restore ammunition and establish a refuge."},
    3:{name:"GRAVE CALL",threat:"Ordinary enemies inside the domain are repeatedly dragged back into pursuit.",cleanse:"Silence the Grave Call, break local pursuit and establish a refuge."},
    4:{name:"EMBER DRAIN",threat:"Remaining in the corrupted chamber strips armour or drives alert upward.",cleanse:"Extinguish chamber hazards, restore armour and establish a refuge."},
    5:{name:"SIGIL PRESSURE",threat:"The domain holds alert high and adds a live corruption stack to the final encounter.",cleanse:"Drop ambient alert, remove the live corruption stack and weaken the final approach."}
  };

  const baseUpdateQuests=typeof updateQuests==="function"?updateQuests:null;
  const baseStartWorld=typeof startWorld==="function"?startWorld:null;
  const baseFloorComplete=typeof floorComplete==="function"?floorComplete:null;
  const R=()=>{try{return typeof run!=="undefined"?run:null}catch(_){return null}},H=()=>{try{return typeof host!=="undefined"?host:null}catch(_){return null}},P=()=>{try{return typeof p1!=="undefined"?p1:null}catch(_){return null}},M=()=>{try{return typeof mode!=="undefined"?mode:"menu"}catch(_){return"menu"}};
  const floor=(r=R())=>Math.max(1,Math.min(Number(C.maxFloors)||5,Math.floor(Number(r?.floor)||1)));
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const toast=(title,text,tone="cyan",duration=11500)=>{try{showToast(title,text,tone,duration)}catch(_){} };
  const sfx=name=>{try{S?.sfx?.(name)}catch(_){} };

  function record(n=floor(),r=R()){return r?.v142WardenFloors?.[String(n)]||null}
  function routeApi(){return window.CCGLostSizzlerV142WardenChargeRoutes||null}
  function routeProfile(n=floor()){return routeApi()?.routes?.[n]||null}
  function routeRecord(n=floor(),r=R()){return r?.v142WardChargeRoutes?.[String(n)]||null}
  function hasCharge(p=P()){try{return Boolean(p&&PGR.firstInventory(p,"banishment")>=0)}catch(_){return false}}
  function fragmentsOnFloor(row){return Number(Boolean(row?.killFragmentAwarded||row?.fragmentAwarded))+Number(Boolean(row?.cacheFragmentAwarded))}
  function pendingRouteRows(r=R()){
    return Object.values(r?.v142WardChargeRoutes||{}).filter(row=>row&&Number(row.floor)>1&&row.unlocked&&row.pending&&!row.delivered).sort((a,b)=>Number(a.floor)-Number(b.floor));
  }

  function routeInstruction(n=floor(),r=R(),p=P()){
    const profile=routeProfile(n),row=routeRecord(n,r);
    if(hasCharge(p))return"Ward-Break Charge ready — find the sealed Warden, press B in range, then finish the fight with normal weapons.";
    if(row?.pending&&!row.delivered)return`The ${profile?.name||"field route"} reward is reserved. Free an inventory slot and it will be delivered automatically, even on a later floor.`;
    if(row?.delivered&&row.rewardType==="essence")return`${profile?.name||"Field route"} converted to +1 Essence because a charge was already carried. Distil another charge at the Alchemist if required.`;
    if(n===1)return"Baseline route: collect Banishment Essence and distil a Ward-Break Charge at the sanctuary Alchemist.";
    return`Field route: ${profile?.objective||"complete this floor's optional Ward-Break challenge"} The Alchemist remains the fallback route.`;
  }

  function huntState(n=floor(),r=R(),p=P()){
    const row=record(n,r);
    if(row?.noWarden||row?.available===false)return{done:true,title:"NO WARDEN GENERATED",detail:"No Warden Debt can be created from this floor."};
    if(row?.resolved||row?.cleansed){
      if(row.cacheFragmentAwarded)return{done:true,title:"WARDEN LEGACY COMPLETE",detail:`Warden cleansed and both Seal Fragments secured (${fragmentsOnFloor(row)}/2). The refuge remains active for this floor.`};
      return{done:false,title:"WARDEN CLEANSED — CACHE FRAGMENT UNCLAIMED",detail:"The dangerous part is over, but the Warden Cache still holds this floor's second Seal Fragment."};
    }
    if(hasCharge(p))return{done:false,title:"WARD BREAK READY",detail:"Find the Warden, break its immunity with B, then kill it normally to cleanse the domain and spawn its cache."};
    const rr=routeRecord(n,r);
    if(rr?.pending&&!rr.delivered)return{done:false,title:"FIELD CHARGE RESERVED",detail:"Free an inventory slot to receive the earned Ward-Break Charge. The reward is safe in run state and can deliver automatically on a later floor."};
    return{done:false,title:"PREPARE WARD BREAK",detail:routeInstruction(n,r,p)};
  }

  function rewardText(n=floor(),r=R()){
    const profile=PROFILES[n]||PROFILES[5],row=record(n,r),fragments=fragmentsOnFloor(row);
    return`Threat: ${profile.threat} Cleansing: ${profile.cleanse} Floor legacy: ${fragments}/2 Seal Fragments. Leaving an available Warden alive adds Warden Debt: later major guardians gain +10% maximum HP and +1 armour per skipped floor.`;
  }

  function questHtml(n=floor(),r=R(),p=P()){
    const profile=PROFILES[n]||PROFILES[5],state=huntState(n,r,p),done=state.done?" quest-done":"",tick=state.done?"✓ ":"";
    return`<div class="v142-warden-contract${done}" data-v142-warden-contract="true">${tick}<b>OPTIONAL WARDEN — ${esc(profile.name)}</b><br>${esc(state.title)} · ${esc(state.detail)}<br><small>${esc(rewardText(n,r))}</small></div>`;
  }
  function renderWardenQuest(){
    const r=R(),p=P();if(!r||!p||!UI?.quests)return false;
    const base=String(UI.quests.innerHTML||"").replace(/<div class="v142-warden-contract[\s\S]*?<\/div>/g,"");UI.quests.innerHTML=base+questHtml(floor(r),r,p);return true;
  }

  function floorBriefText(n=floor(),r=R(),p=P()){
    const profile=PROFILES[n]||PROFILES[5];
    return`${profile.threat} ${profile.cleanse} Kill the Warden and claim its cache for up to 2 Seal Fragments on this floor. ${routeInstruction(n,r,p)} If you leave an available Warden alive, Warden Debt permanently gives later major guardians +10% maximum HP and +1 armour for this run.`;
  }
  function briefFloor(force=false){
    const r=R(),p=P(),n=floor(r),row=record(n,r);if(!r||!p||!["playing","inventory","paused"].includes(M()))return false;if(row?.noWarden||row?.available===false)return false;
    r.v142WardenBriefedFloors=Array.isArray(r.v142WardenBriefedFloors)?r.v142WardenBriefedFloors:[];if(!force&&r.v142WardenBriefedFloors.includes(n))return false;
    if(!r.v142WardenBriefedFloors.includes(n))r.v142WardenBriefedFloors.push(n);
    const profile=PROFILES[n]||PROFILES[5];toast(`OPTIONAL WARDEN CONTRACT — ${profile.name}`,floorBriefText(n,r,p),"cyan",14000);return true;
  }

  function exitIssues(n=floor(),r=R(),h=H()){
    if(!r)return[];const row=record(n,r),domain=h?.v142WardenDomain,issues=[],resolved=Boolean(row?.resolved||row?.cleansed||domain?.cleansed),available=!row?.noWarden&&row?.available!==false&&Boolean(row?.available===true||domain?.active||domain?.cleansed||resolved);
    if(available&&!resolved){
      issues.push({kind:"warden-debt",blocking:true,text:"WARDEN UNRESOLVED — leaving now adds Warden Debt, giving later major guardians +10% maximum HP and +1 armour for this skipped floor."});
    }else if(resolved&&!row?.cacheFragmentAwarded&&Boolean(row?.killFragmentAwarded||row?.fragmentAwarded)){
      issues.push({kind:"cache-fragment",blocking:true,text:"WARDEN CACHE UNCLAIMED — the second Seal Fragment for this floor will be left behind if you finish the floor now."});
    }
    const pending=pendingRouteRows(r);if(pending.length){const floors=pending.map(x=>Number(x.floor)).join("/");issues.push({kind:"reserved-charge",blocking:false,text:`WARD-BREAK REWARD RESERVED (F${floors}) — this is safe in run state and will carry forward until an inventory slot is free.`})}
    return issues;
  }
  function exitIssueKey(issues){return issues.filter(issue=>issue.blocking).map(issue=>issue.kind).sort().join("|")}
  function appendReservationSummary(r=R()){
    const pending=pendingRouteRows(r);if(!pending.length||!UI?.floorSummary)return false;const floors=pending.map(x=>`F${Number(x.floor)}`).join(", ");
    if(String(UI.floorSummary.innerHTML||"").includes("data-v142-reserved-ward-route"))return false;
    UI.floorSummary.innerHTML+=`<br><br><strong data-v142-reserved-ward-route="true">WARD-BREAK REWARD RESERVED</strong><br>${esc(floors)} field-route reward${pending.length===1?" is":"s are"} safe in run state and will auto-deliver on a later floor when an inventory slot is free.`;return true;
  }
  function guardedFloorComplete(by){
    if(!baseFloorComplete)return false;const r=R(),h=H(),n=floor(r);if(!r||!h||r.floorComplete||M()!=="playing")return baseFloorComplete(by);
    const issues=exitIssues(n,r,h),blocking=issues.filter(issue=>issue.blocking),key=exitIssueKey(issues),now=Date.now(),armed=h.v142WardenExitConfirm;
    if(blocking.length&&(!armed||Number(armed.floor)!==n||armed.key!==key||now>Number(armed.until||0))){
      h.v142WardenExitConfirm={floor:n,key,until:now+EXIT_CONFIRM_MS};sfx("locked");
      const safe=issues.filter(issue=>!issue.blocking).map(issue=>issue.text);toast("WARDEN BUSINESS REMAINS",`${blocking.map(issue=>issue.text).join(" ")}${safe.length?` ${safe.join(" ")}`:""} Step off the floor exit and enter it again within ${Math.round(EXIT_CONFIRM_MS/1000)} seconds if you still want to leave.`,"red",EXIT_CONFIRM_MS);return false;
    }
    if(h.v142WardenExitConfirm)delete h.v142WardenExitConfirm;const result=baseFloorComplete(by);appendReservationSummary(r);return result;
  }

  if(baseUpdateQuests)updateQuests=function(...args){const result=baseUpdateQuests(...args);try{renderWardenQuest()}catch(error){console.warn("[Lost Sizzler V10.42] Warden quest guidance failed safely",error)}return result};
  if(baseStartWorld)startWorld=function(...args){const result=baseStartWorld(...args);try{briefFloor(false);renderWardenQuest()}catch(error){console.warn("[Lost Sizzler V10.42] Warden floor briefing failed safely",error)}return result};
  if(baseFloorComplete)floorComplete=function(by){try{return guardedFloorComplete(by)}catch(error){console.warn("[Lost Sizzler V10.42] Warden exit guard failed safely",error);return baseFloorComplete(by)}};

  try{renderWardenQuest();briefFloor(false)}catch(_){}
  window.CCGLostSizzlerV142WardenHuntGuidance={version:"V10.42 r3",profiles:PROFILES,huntState,routeInstruction,rewardText,questHtml,renderWardenQuest,floorBriefText,briefFloor,exitIssues,guardedFloorComplete,appendReservationSummary};
})();
