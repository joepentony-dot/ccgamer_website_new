/* The Lost Sizzler V10.39 — current-wave loadout for every Horde client, including late joiners. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V139_HORDE_LIVE_LOADOUT__)return;
  window.__CCG_LOST_SIZZLER_V139_HORDE_LIVE_LOADOUT__=true;
  const state={installed:false,wrapped:false,controllerOwned:true,timer:0,lastWave:0};
  const active=()=>window.CCGLostSizzlerSpecialModes?.active||null;
  const H=()=>window.CCGLostSizzlerHorde||null;
  const isHorde=()=>active()?.type==="horde-survivor";

  function waveWeapon(level){
    const horde=H(),wave=Math.max(1,Math.min(10,Number(level)||1)),definition=horde?.WEAPONS?.[wave-1],power=1+Math.floor(Math.max(0,wave-1)/2),name=definition?.name||"Archive Sidearm";
    return{id:`horde-wave-${wave}`,name,displayName:name,rarity:wave>=9?"ZZAP! 97%":wave>=6?"GOLD MEDAL":"SIZZLER",power,delay:Math.max(.42,1-wave*.045),shots:wave>=8?3:wave>=3?2:1,ammo:1,element:wave>=5?"shock":"energy",ttl:18,mods:[],rating:power}
  }

  function syncLocalLoadout(){
    const runState=active()?.state;if(!isHorde()||!runState||!p1)return false;const wave=Math.max(0,Number(runState.wave||0));if(!wave)return false;
    const weapon=waveWeapon(wave);p1.firearmUnlocked=true;if(p1.weapon?.id!==weapon.id)p1.weapon={...weapon};p1.maxMana=Math.max(60,Number(p1.maxMana||60));p1.mana=p1.maxMana;
    const model=runState.players?.find(player=>String(player.id)===String(net?.sessionId||p1.id));if(model){model.currentWeapon=H()?.WEAPONS?.[wave-1]?.id||model.currentWeapon;model.weapons=Array.from(new Set([...(model.weapons||[]),...(H()?.WEAPONS||[]).slice(0,wave).map(row=>row.id)]))}
    state.lastWave=wave;return true
  }

  function install(){
    if(state.installed)return true;const gate=window.CCGLostSizzlerReleaseGate;if(gate&&!gate.state?.ready)return false;if(!window.CCGLostSizzlerV138?.state?.installed)return false;
    // Phase 3: the authoritative mode controller calls syncLocalLoadout only while
    // Horde owns the frame. This legacy layer no longer wraps the shared update().
    state.wrapped=false;state.installed=true;document.body.dataset.v139HordeLoadout="true";return true
  }

  state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},90);install();window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV139={waveWeapon,syncLocalLoadout,get state(){return state}};
})();
