/* The Lost Sizzler V10.41 — owner Developer Vault hardening/disposable-run guard. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_DEV_VAULT_HARDENING__)return;
  window.__CCG_LOST_SIZZLER_V141_DEV_VAULT_HARDENING__=true;

  const source=window.CCGLostSizzlerV141Gambler;
  if(!source)return;
  const internal=source.state;
  const verifyOwner=source.ownerAuthorized;
  const constants=Object.freeze({spawnChance:Number(source.SPAWN_CHANCE||.04),stake:Number(source.STAKE||1000),jackpot:Number(source.JACKPOT||2000)});
  const state={timer:0,authTimer:0,saveWrapped:false,extractWrapped:false,descendWrapped:false,itemWrapped:false};
  const devActive=()=>Boolean(internal?.dev?.active&&run?.developer===true&&host?.developerRoom?.ownerOnly===true);

  // Remove the mutable internal control surface. Normal game code never needs
  // direct access to developer authorization state or forced-spawn functions.
  window.CCGLostSizzlerV141Gambler=Object.freeze({constants});

  function syncFlag(){
    const active=devActive();
    if(active)document.body.dataset.ccgDeveloperVault="true";
    else{
      delete document.body.dataset.ccgDeveloperVault;
      document.getElementById("ccg-dev-status")?.remove?.();
      if(internal?.dev&&document.body?.dataset?.runActive!=="true"){
        internal.dev.active=false;internal.dev.authorized=false;internal.dev.checking=false;internal.dev.roomId=null;
        internal.dev.panel?.classList?.add("hidden");
      }
    }
  }

  function disposableMessage(){try{showToast("DEVELOPER VAULT","Developer test runs are disposable and cannot be saved, banked or extracted.","cyan",5000)}catch(_){} }

  function wrapSave(){
    if(state.saveWrapped||typeof window.saveFloorCheckpoint!=="function")return;
    const original=window.saveFloorCheckpoint;window.saveFloorCheckpoint=function saveFloorCheckpointDevGuard(){if(devActive()){disposableMessage();return false}return original.apply(this,arguments)};state.saveWrapped=true;
  }
  function wrapExtract(){
    if(state.extractWrapped||typeof window.extractRun!=="function")return;
    const original=window.extractRun;window.extractRun=function extractRunDevGuard(){if(devActive()){disposableMessage();return false}return original.apply(this,arguments)};state.extractWrapped=true;
  }
  function wrapDescend(){
    if(state.descendWrapped||typeof window.descendFloor!=="function")return;
    const original=window.descendFloor;window.descendFloor=function descendFloorDevGuard(){if(devActive()){try{showToast("DEVELOPER VAULT","Floor progression is disabled in the private asset laboratory.","cyan",4500)}catch(_){}return false}return original.apply(this,arguments)};state.descendWrapped=true;
  }
  function wrapItems(){
    if(state.itemWrapped||typeof window.applyItem!=="function")return;
    const original=window.applyItem;window.applyItem=function applyItemDevGuard(item,player){
      if(devActive()&&item?.developerSpawn&&String(item.kind||"")==="game"){
        try{S.sfx?.("pickup");showToast("DEVELOPER TEST GAME","Test collectible previewed without changing your permanent rescued-game collection.","cyan",4500)}catch(_){}
        return true;
      }
      return original.apply(this,arguments);
    };state.itemWrapped=true;
  }

  async function revalidateOwner(){
    if(!internal?.dev?.active||typeof verifyOwner!=="function")return;
    internal.dev.authorized=false;
    let ok=false;try{ok=await verifyOwner()}catch(_){}
    if(ok)return;
    internal.dev.active=false;delete document.body.dataset.ccgDeveloperVault;
    try{showToast("DEVELOPER VAULT LOCKED","Owner session is no longer valid. Returning to the main menu.","red",6500)}catch(_){}
    try{await quitToMenu?.()}catch(_){try{location.reload()}catch(__){}}
  }

  function installGuards(){wrapSave();wrapExtract();wrapDescend();wrapItems();syncFlag()}
  installGuards();state.timer=setInterval(installGuards,250);state.authTimer=setInterval(()=>{void revalidateOwner()},30000);
  window.addEventListener("pagehide",()=>{clearInterval(state.timer);clearInterval(state.authTimer)},{once:true});
  window.CCGLostSizzlerV141DeveloperVaultHardening=Object.freeze({constants});
})();