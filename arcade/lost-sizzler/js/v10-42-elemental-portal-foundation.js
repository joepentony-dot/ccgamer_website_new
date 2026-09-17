/* C64 Dungeon Carnage V10.42 — elemental portal campaign foundation. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_ELEMENTAL_PORTAL_FOUNDATION__)return;
  window.__CCG_LOST_SIZZLER_V142_ELEMENTAL_PORTAL_FOUNDATION__=true;

  const PGR=window.CCGProgression;
  const CFG=window.CCG_CONFIG;
  if(!PGR||!CFG){
    console.warn("[C64 Dungeon Carnage] elemental portal foundation skipped: progression/config unavailable");
    return;
  }

  const PORTALS=Object.freeze([
    Object.freeze({id:"water",name:"WATER PORTAL",element:"water",sourceFloor:1,targetFloor:2,zoneId:"drowned-ways",accent:"#6cecff"}),
    Object.freeze({id:"fire",name:"FIRE PORTAL",element:"fire",sourceFloor:2,targetFloor:3,zoneId:"ember-vaults",accent:"#ff7848"}),
    Object.freeze({id:"earth",name:"EARTH PORTAL",element:"earth",sourceFloor:3,targetFloor:4,zoneId:"rooted-depths",accent:"#a8d56b"}),
    Object.freeze({id:"air",name:"AIR PORTAL",element:"air",sourceFloor:4,targetFloor:5,zoneId:"storm-spires",accent:"#d7e9ff"})
  ]);
  const IDS=new Set(PORTALS.map(portal=>portal.id));
  const state={normalisedRuns:0,checkpointNormalisations:0,unlocks:0};

  const boundedFloor=value=>Math.max(1,Math.min(Number(CFG.maxFloors)||5,Math.floor(Number(value)||1)));
  const uniquePortalIds=value=>[...new Set((Array.isArray(value)?value:[]).map(id=>String(id||"").toLowerCase()).filter(id=>IDS.has(id)))];
  const portalById=id=>PORTALS.find(portal=>portal.id===String(id||"").toLowerCase())||null;
  const routeForFloor=floor=>PORTALS.find(portal=>portal.sourceFloor===boundedFloor(floor))||null;
  const routeSeed=(runState,id)=>{
    const portal=portalById(id);if(!portal)return"";
    return `${String(runState?.seed||"CCG")}-PORTAL-${portal.id.toUpperCase()}-F${portal.sourceFloor}-F${portal.targetFloor}`;
  };

  function ensurePortalState(runState){
    if(!runState||typeof runState!=="object")return null;
    const existing=runState.v142ElementalPortals&&typeof runState.v142ElementalPortals==="object"?runState.v142ElementalPortals:{};
    const floor=boundedFloor(runState.floor),deepest=boundedFloor(runState.deepest||floor);
    const inferredCleared=Math.max(0,Math.min((Number(CFG.maxFloors)||5)-1,Math.max(floor,deepest)-1));
    const inferred=PORTALS.filter(portal=>portal.sourceFloor<=inferredCleared).map(portal=>portal.id);
    const unlocked=uniquePortalIds([...(existing.unlocked||[]),...inferred]);
    const discovered=uniquePortalIds([...(existing.discovered||[]),...unlocked]);
    const traversed=uniquePortalIds(existing.traversed);
    const active=existing.active&&portalById(existing.active.id)?{
      id:String(existing.active.id).toLowerCase(),
      fromFloor:boundedFloor(existing.active.fromFloor),
      toFloor:boundedFloor(existing.active.toFloor),
      routeSeed:String(existing.active.routeSeed||routeSeed(runState,existing.active.id)),
      returnToken:existing.active.returnToken==null?null:String(existing.active.returnToken)
    }:null;
    const lastUnlocked=portalById(existing.lastUnlocked)?.id||null;
    runState.v142ElementalPortals={version:1,unlocked,discovered,traversed,active,lastUnlocked};
    state.normalisedRuns++;
    return runState.v142ElementalPortals;
  }

  function isUnlocked(runState,id){const portalState=ensurePortalState(runState);return Boolean(portalState&&portalState.unlocked.includes(String(id||"").toLowerCase()))}
  function availableRoutes(runState){const portalState=ensurePortalState(runState);if(!portalState)return[];return PORTALS.filter(portal=>portalState.unlocked.includes(portal.id))}

  function unlockForClearedFloor(runState,floor=runState?.floor){
    const portal=routeForFloor(floor),portalState=ensurePortalState(runState);
    if(!portal||!portalState)return null;
    if(!portalState.unlocked.includes(portal.id)){portalState.unlocked.push(portal.id);state.unlocks++}
    if(!portalState.discovered.includes(portal.id))portalState.discovered.push(portal.id);
    portalState.lastUnlocked=portal.id;
    return portal;
  }

  function prepareTransit(runState,id,{returnToken=null}={}){
    const portal=portalById(id),portalState=ensurePortalState(runState);if(!portal||!portalState)return null;
    if(!portalState.unlocked.includes(portal.id))return null;
    if(boundedFloor(runState.floor)!==portal.sourceFloor)return null;
    portalState.active={id:portal.id,fromFloor:portal.sourceFloor,toFloor:portal.targetFloor,routeSeed:routeSeed(runState,portal.id),returnToken:returnToken==null?null:String(returnToken)};
    return {...portalState.active};
  }

  function confirmArrival(runState){
    const portalState=ensurePortalState(runState),active=portalState?.active;if(!active)return null;
    if(boundedFloor(runState.floor)!==active.toFloor)return null;
    if(!portalState.traversed.includes(active.id))portalState.traversed.push(active.id);
    const arrival={...active};portalState.active=null;return arrival;
  }

  function cancelTransit(runState){const portalState=ensurePortalState(runState);if(!portalState)return false;portalState.active=null;return true}

  function installProgressionPersistence(){
    if(typeof PGR.makeRun==="function"&&!PGR.makeRun.__ccgElementalPortalFoundation){
      const base=PGR.makeRun;
      const wrapped=function(...args){const made=base.apply(this,args);ensurePortalState(made);return made};
      wrapped.__ccgElementalPortalFoundation=true;wrapped.__ccgOriginal=base;PGR.makeRun=wrapped;
    }
    if(typeof PGR.bankFloor==="function"&&!PGR.bankFloor.__ccgElementalPortalFoundation){
      const base=PGR.bankFloor;
      const wrapped=function(runState,...args){const result=base.call(this,runState,...args);unlockForClearedFloor(runState,runState?.floor);return result};
      wrapped.__ccgElementalPortalFoundation=true;wrapped.__ccgOriginal=base;PGR.bankFloor=wrapped;
    }
    if(typeof PGR.makeCheckpoint==="function"&&!PGR.makeCheckpoint.__ccgElementalPortalFoundation){
      const base=PGR.makeCheckpoint;
      const wrapped=function(runState,...args){ensurePortalState(runState);return base.call(this,runState,...args)};
      wrapped.__ccgElementalPortalFoundation=true;wrapped.__ccgOriginal=base;PGR.makeCheckpoint=wrapped;
    }
    if(typeof PGR.loadCheckpoint==="function"&&!PGR.loadCheckpoint.__ccgElementalPortalFoundation){
      const base=PGR.loadCheckpoint;
      const wrapped=function(...args){const data=base.apply(this,args);if(data?.run){ensurePortalState(data.run);state.checkpointNormalisations++}return data};
      wrapped.__ccgElementalPortalFoundation=true;wrapped.__ccgOriginal=base;PGR.loadCheckpoint=wrapped;
    }
  }

  installProgressionPersistence();

  window.CCGLostSizzlerV142ElementalPortalFoundation={
    version:"V10.42",
    schemaVersion:1,
    portals:PORTALS,
    state,
    portalById,
    routeForFloor,
    routeSeed,
    ensurePortalState,
    isUnlocked,
    availableRoutes,
    unlockForClearedFloor,
    prepareTransit,
    confirmArrival,
    cancelTransit
  };
})();
