/* C64 Dungeon Carnage V10.42 — owned firearm comparison clarity. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142OwnedFirearmClarity)return;

  const state={installs:0,decorations:0};

  function number(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
  function compactNumber(value){const n=number(value);return Number.isInteger(n)?String(n):String(Math.round(n*100)/100)}
  function weaponSummary(weapon){
    if(!weapon)return"NO STATS";
    const parts=[
      `RATING ${compactNumber(weapon.rating)}`,
      `PWR ${compactNumber(weapon.power||1)}`,
      `DELAY ${compactNumber(weapon.delay||1)}`,
      `SHOTS ${Math.max(1,Math.floor(number(weapon.shots,1)))}`,
      `AMMO ${Math.max(1,Math.floor(number(weapon.ammo,1)))}`
    ];
    const pierce=Math.max(0,Math.floor(number(weapon.pierce)));
    if(pierce)parts.push(`PIERCE ${pierce}`);
    if(weapon.element)parts.push(String(weapon.element).toUpperCase());
    const mods=Array.isArray(weapon.mods)?weapon.mods.filter(Boolean).map(String):[];
    if(mods.length)parts.push(`MODS ${mods.join(" + ")}`);
    return parts.join(" · ");
  }

  function currentPlayer(){try{return typeof p1!=="undefined"?p1:null}catch(_){return null}}
  function decorateOwnedFirearms(){
    const player=currentPlayer(),panel=document.querySelector(".ccg-owned-weapons");
    if(!player||!panel)return false;
    const owned=Array.isArray(player.ownedWeapons)?player.ownedWeapons:[];
    panel.querySelectorAll("[data-ccg-equip-weapon]").forEach(button=>{
      const index=Number(button.dataset.ccgEquipWeapon),weapon=owned[index];
      if(!weapon)return;
      const active=index===Number(player.activeWeaponIndex),name=weapon.displayName||weapon.name||`WEAPON ${index+1}`,stats=weaponSummary(weapon);
      button.textContent=`${active?"EQUIPPED":"EQUIP"} · ${name} — ${stats}`;
      button.title=`${name}: ${stats}`;
      button.setAttribute("aria-label",`${active?"Equipped":"Equip"} ${name}. ${stats}`);
    });
    state.decorations++;
    return true;
  }

  function install(){
    try{
      if(typeof renderInventoryPanel!=="function")return false;
      if(renderInventoryPanel.__ccgOwnedFirearmClarity){decorateOwnedFirearms();return true}
      const base=renderInventoryPanel;
      const wrapped=function(...args){const result=base.apply(this,args);decorateOwnedFirearms();return result};
      wrapped.__ccgOwnedFirearmClarity=true;wrapped.__ccgOriginal=base;
      renderInventoryPanel=wrapped;
      state.installs++;
      decorateOwnedFirearms();
      return true;
    }catch(_){return false}
  }

  install();
  addEventListener("ccg:v142-ready",()=>{install();decorateOwnedFirearms()},{once:true});

  window.CCGLostSizzlerV142OwnedFirearmClarity=Object.freeze({
    version:"V10.42-owned-firearm-clarity",
    state,
    weaponSummary,
    decorateOwnedFirearms,
    install,
    isInstalled:()=>{try{return typeof renderInventoryPanel==="function"&&Boolean(renderInventoryPanel.__ccgOwnedFirearmClarity)}catch(_){return false}}
  });
})();
