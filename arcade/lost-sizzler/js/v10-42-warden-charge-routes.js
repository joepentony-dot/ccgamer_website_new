/* The Lost Sizzler V10.42 r3 — optional floor-specific Ward-Break Charge routes. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_WARDEN_CHARGE_ROUTES__)return;
  window.__CCG_LOST_SIZZLER_V142_WARDEN_CHARGE_ROUTES__=true;

  const C=window.CCG_CONFIG,PGR=window.CCGProgression;
  if(!C||!PGR)return;

  const ROUTES={
    1:{id:"alchemist-baseline",name:"ALCHEMIST ROUTE",objective:"Distil Banishment Essence at the sanctuary Alchemist.",reward:"The baseline route stays available for the entire run."},
    2:{id:"capacitor-core",name:"CAPACITOR CORE",objective:"Destroy any monster generator on this depth.",reward:"A ruptured generator yields one field-ready Ward-Break Charge."},
    3:{id:"arena-seal",name:"ARENA SEAL",objective:"Clear both waves of the sealed arena.",reward:"The arena seal condenses into one field-ready Ward-Break Charge."},
    4:{id:"ashen-catalyst",name:"ASHEN CATALYST",objective:"Invoke any shrine on this depth.",reward:"The spent shrine leaves enough residue for one field-ready Ward-Break Charge."},
    5:{id:"seal-forge",name:"SEAL FORGE",objective:"Reach the Sigil Sanctum with at least 6 Seal Fragments.",reward:"Ward Temper forges one field-ready Ward-Break Charge without consuming Essence."}
  };

  const baseSync=typeof sync==="function"?sync:null;
  const R=()=>{try{return typeof run!=="undefined"?run:null}catch(_){return null}},H=()=>{try{return typeof host!=="undefined"?host:null}catch(_){return null}},P=()=>{try{return typeof p1!=="undefined"?p1:null}catch(_){return null}},M=()=>{try{return typeof mode!=="undefined"?mode:"menu"}catch(_){return"menu"}};
  const floor=(r=R())=>Math.max(1,Math.min(Number(C.maxFloors)||5,Math.floor(Number(r?.floor)||1)));
  const toast=(a,b,t="gold",d=9000)=>{try{showToast(a,b,t,d)}catch(_){}},broadcast=()=>{try{broadcastWorld()}catch(_){}},syncNow=()=>{try{if(typeof sync==="function")sync()}catch(_){}},sfx=n=>{try{S?.sfx?.(n)}catch(_){} };

  function init(r=R()){
    if(!r)return null;r.v142WardChargeRoutes=r.v142WardChargeRoutes&&typeof r.v142WardChargeRoutes==="object"?r.v142WardChargeRoutes:{};return r;
  }
  function state(n=floor(),r=R()){
    r=init(r);if(!r)return null;const key=String(n),profile=ROUTES[n]||ROUTES[1];return r.v142WardChargeRoutes[key]||(r.v142WardChargeRoutes[key]={floor:n,routeId:profile.id,unlocked:n===1,delivered:false,pending:false,rewardType:null});
  }
  function hasCharge(p=P()){try{return Boolean(p&&PGR.firstInventory(p,"banishment")>=0)}catch(_){return false}}
  function sealCount(r=R()){return Math.max(0,Math.floor(Number(r?.v142SealFragments)||0))}
  function conditionMet(n=floor(),h=H(),r=R()){
    if(n===1)return true;
    if(!h||!r)return false;
    if(n===2)return (h.generators||[]).some(g=>g&&g.alive===false);
    if(n===3)return (h.arenas||[]).some(a=>a?.cleared);
    if(n===4)return (h.shrines||[]).some(s=>s&&s.active===false);
    if(n===5)return sealCount(r)>=6;
    return false;
  }
  function sourceText(n,h=H()){
    if(n===2){const g=(h?.generators||[]).find(x=>x&&x.alive===false);return g?.id?`Generator ${g.id} destroyed`:"Monster generator destroyed"}
    if(n===3)return"Sealed arena cleared";
    if(n===4)return"Shrine invoked";
    if(n===5)return`${sealCount()} Seal Fragments carried into the Sanctum`;
    return"Sanctuary Alchemist";
  }
  function wardenResolved(n=floor(),r=R()){
    const row=r?.v142WardenFloors?.[String(n)];return Boolean(row?.resolved||row?.cleansed);
  }

  function unlockRoute(n=floor(),h=H(),r=R()){
    const row=state(n,r),profile=ROUTES[n];if(!row||!profile||n===1||row.unlocked||!conditionMet(n,h,r))return false;
    row.unlocked=true;row.unlockedAt=Date.now();row.source=sourceText(n,h);row.pending=true;
    r.stats=r.stats||{};r.stats.wardChargeRoutesUnlocked=(Number(r.stats.wardChargeRoutesUnlocked)||0)+1;
    toast(`${profile.name} UNLOCKED`,`${row.source}. ${profile.reward} The Alchemist remains available if you want additional charges.`,"cyan",10000);return true;
  }

  function addReadyCharge(p){
    if(!p)return false;try{
      if(!PGR.inventoryCanAdd(p,{kind:"banishment"}))return false;
      return Boolean(PGR.inventoryAdd(p,{kind:"banishment",name:"Ward-Break Charge",short:"WARD BREAK",v142FieldRoute:true}));
    }catch(_){return false}
  }
  function deliverRoute(n=floor(),p=P(),r=R()){
    const row=state(n,r),profile=ROUTES[n];if(!row||!profile||n===1||!row.unlocked||row.delivered||!p)return false;
    if(hasCharge(p)){
      p.banishmentEssence=Math.max(0,Math.floor(Number(p.banishmentEssence)||0))+1;row.delivered=true;row.pending=false;row.rewardType="essence";row.deliveredAt=Date.now();
      toast(`${profile.name} CONVERTED`,`You already carry a Ward-Break Charge, so this route stabilises as +1 Banishment Essence instead of stockpiling a second free charge. Vessel Essence: ${p.banishmentEssence}.`,"purple",9000);sfx("pickup");broadcast();syncNow();return true;
    }
    if(addReadyCharge(p)){
      row.delivered=true;row.pending=false;row.rewardType="charge";row.deliveredAt=Date.now();
      toast("FIELD WARD-BREAK CHARGE EARNED",`${profile.name}: ${profile.reward} No Essence was spent. Press B near a sealed Warden to break its immunity, then finish it with normal weapons.`,"gold",10500);sfx("shrine");broadcast();syncNow();return true;
    }
    row.pending=true;
    if(!row.inventoryWarningShown){row.inventoryWarningShown=true;toast(`${profile.name} READY — INVENTORY FULL`,`The field charge has been earned but cannot be stored yet. Free an inventory slot; the reward will be delivered automatically once there is room.`,"red",9000)}
    if(wardenResolved(n,r)&&!row.resolvedWarningShown){row.resolvedWarningShown=true;toast("FIELD CHARGE STILL RESERVED","This floor's Warden is already cleansed, but the earned route reward is still reserved for the run. Free a slot before leaving if you want the charge carried forward.","cyan",8000)}
    return false;
  }

  function routeStatus(n=floor(),r=R()){
    const row=state(n,r),profile=ROUTES[n];if(!row||!profile)return"";
    if(n===1)return"WARD ROUTE: ALCHEMIST";
    if(row.delivered)return row.rewardType==="essence"?`WARD ROUTE: ${profile.name} → +1 ESSENCE`:`WARD ROUTE: ${profile.name} → CHARGE EARNED`;
    if(row.pending)return`WARD ROUTE: ${profile.name} READY`;
    if(n===2)return"WARD ROUTE: DESTROY GENERATOR";
    if(n===3)return"WARD ROUTE: CLEAR ARENA";
    if(n===4)return"WARD ROUTE: INVOKE SHRINE";
    return`WARD ROUTE: SEALS ${sealCount(r)}/6`;
  }
  function refreshReadout(){
    try{
      if(!UI?.quickSpecials)return;let text=String(UI.quickSpecials.textContent||"").replace(/\s*•\s*WARD ROUTE:[^•]*/g,"").trim(),status=routeStatus();if(status)text+=`${text?" • ":""}${status}`;UI.quickSpecials.textContent=text;
    }catch(_){}
  }
  function scan(){
    const r=init(),h=H(),p=P(),n=floor(r);if(!r||!h||!p||!["playing","inventory","paused"].includes(M())){refreshReadout();return}
    try{unlockRoute(n,h,r);deliverRoute(n,p,r);refreshReadout()}catch(error){console.warn("[Lost Sizzler V10.42] Warden charge route tick failed safely",error)}
  }

  if(baseSync)sync=function(...args){const result=baseSync(...args);refreshReadout();return result};
  scan();const timer=setInterval(scan,250);addEventListener("pagehide",()=>clearInterval(timer),{once:true});

  window.CCGLostSizzlerV142WardenChargeRoutes={version:"V10.42 r3",routes:ROUTES,state,conditionMet,unlockRoute,deliverRoute,routeStatus};
})();
