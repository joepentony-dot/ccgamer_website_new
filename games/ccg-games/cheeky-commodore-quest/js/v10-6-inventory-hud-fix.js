/* The Lost Sizzler — V10.6 persistent carried-item/key HUD correction.
 * Uses the otherwise empty lower half of the tactical sidebar for live inventory
 * information, while keeping the compact bottom bar for quick stack recognition.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_INVENTORY_HUD_V106__)return;
  window.__CCG_LOST_SIZZLER_INVENTORY_HUD_V106__=true;

  const html=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const icon=(kind,label)=>typeof itemIconSVG==="function"?itemIconSVG(kind,label):"";

  function count(kind){
    try{return Math.max(0,Number(PGR.inventoryKindCount(p1,kind)||0))}catch(_){return 0}
  }

  function section(title){return `<div class="carried-section-label">${html(title)}</div>`}

  function row({kind,name,qty,action="",desc,tone=""}){
    return `<div class="carried-item ${tone?`carried-${html(tone)}`:""}">${icon(kind,name)}<div class="carried-copy"><b>${html(name)}</b><span>${html(desc)}</span></div><div class="carried-meta">${action?`<kbd>${html(action)}</kbd>`:""}<strong>${html(qty)}</strong></div></div>`;
  }

  function renderSidebarInventory(){
    const target=document.getElementById("item-shortcuts");
    if(!target||typeof p1==="undefined"||!p1||typeof host==="undefined"||!host)return;

    const potions=count("potion"),torches=count("torch"),teleports=count("teleport"),flasks=count("banishment"),artefacts=count("artefact");
    const rows=[section("QUICK-USE ITEMS")];
    let usable=0;

    if(potions){usable++;rows.push(row({kind:"potion",name:"RESTORATION POTION",qty:`×${potions}`,action:"E",desc:"Restore health and 8 ammo.",tone:"green"}))}
    if(torches||Number(p1.torchMs||0)>0){usable++;rows.push(row({kind:"torch",name:"FLAMING TORCH",qty:Number(p1.torchMs||0)>0?`${Math.ceil(Number(p1.torchMs)/1000)}s · ×${torches}`:`×${torches}`,action:"Q",desc:"Light the dungeon temporarily.",tone:"gold"}))}
    if(teleports){usable++;rows.push(row({kind:"teleport",name:"TELEPORT SPELL",qty:`×${teleports}`,action:"R",desc:"Warp to a safe explored room.",tone:"purple"}))}
    if(flasks){usable++;rows.push(row({kind:"banishment",name:"BANISHMENT FLASK",qty:`×${flasks}`,action:"B",desc:"Destroy a nearby Death Stalker when in range.",tone:"purple"}))}
    if(artefacts){rows.push(row({kind:"loot",name:"RARE ARTEFACT",qty:`×${artefacts}`,action:"TRADE",desc:"Trade 3 at a shop for a Banishment Flask.",tone:"cyan"}))}
    if(!usable&&!artefacts)rows.push(`<div class="carried-empty"><b>NO QUICK-USE ITEMS HELD</b><span>Potions, torches, teleport spells and flasks appear here when collected.</span></div>`);

    rows.push(section("KEYS & QUEST ITEMS"));
    const keyObjective=host.objective?.type==="keys";
    if(keyObjective||Number(host.keysCollected||0)>0)rows.push(row({kind:"key",name:"MAIN VAULT KEYS",qty:`${Number(host.keysCollected||0)}/${C.keyTarget}`,action:"AUTO",desc:"Floor objective. Collected automatically.",tone:"gold"}));
    if(Number(p1.bronzeKeys||0)>0)rows.push(row({kind:"bronze",name:"BRONZE KEY",qty:`×${Number(p1.bronzeKeys||0)}`,action:"AUTO",desc:"Automatically used on a bronze door or locked chest.",tone:"gold"}));
    if(host.exitSigilCollected)rows.push(row({kind:"exitSigil",name:"EXIT SIGIL",qty:"HELD",action:"AUTO",desc:"Automatically unlocks the floor exit when required.",tone:"gold"}));
    if(!keyObjective&&!Number(host.keysCollected||0)&&!Number(p1.bronzeKeys||0)&&!host.exitSigilCollected)rows.push(`<div class="carried-empty compact"><span>No keys or quest items currently held.</span></div>`);

    target.innerHTML=rows.join("");
  }

  function quickKeyChip(kind,label,value){
    return `<span class="quick-key-chip">${icon(kind,label)}<b>${html(label)}</b><strong>${html(value)}</strong></span>`;
  }

  function renderBottomKeyring(){
    if(typeof p1==="undefined"||!p1||typeof host==="undefined"||!host)return;
    const slots=document.getElementById("quick-slots");
    if(!slots?.parentNode)return;
    let strip=document.getElementById("quick-keyring-icons");
    if(!strip){
      strip=document.createElement("div");
      strip.id="quick-keyring-icons";
      strip.className="quick-keyring-icons";
      strip.setAttribute("aria-label","Keyring and quest items");
      slots.parentNode.insertBefore(strip,slots.nextSibling);
    }

    const chips=[],keyObjective=host.objective?.type==="keys";
    if(keyObjective||Number(host.keysCollected||0)>0)chips.push(quickKeyChip("key","MAIN",`${Number(host.keysCollected||0)}/${C.keyTarget}`));
    if(Number(p1.bronzeKeys||0)>0)chips.push(quickKeyChip("bronze","BRONZE",`×${Number(p1.bronzeKeys||0)}`));
    if(host.exitSigilCollected)chips.push(quickKeyChip("exitSigil","SIGIL","HELD"));
    strip.innerHTML=chips.join("");
    strip.classList.toggle("hidden",chips.length===0);

    const head=document.querySelector(".hub-inventory-head b");
    if(head)head.textContent="QUICK INVENTORY — ITEMS";
  }

  function prepareSidebar(){
    const dock=document.querySelector(".shortcut-dock"),head=dock?.querySelector(".shortcut-dock-head"),commands=dock?.querySelector(".command-grid");
    if(!dock)return;
    dock.classList.add("inventory-live-dock");
    const title=head?.querySelector("h3"),tag=head?.querySelector("span");
    if(title)title.textContent="INVENTORY & KEYS";
    if(tag)tag.textContent="LIVE";
    if(commands){
      commands.classList.add("base-controls","inventory-dock-controls");
      commands.innerHTML='<span><kbd>TAB</kbd><b>FULL INVENTORY</b></span><span><kbd>C</kbd><b>CLOSE DOOR</b></span>';
    }
  }

  function correctControlCopy(){
    const controls=document.querySelector("#menu .keys-help");
    if(!controls||controls.dataset.v106InventoryControls==="true")return;
    controls.dataset.v106InventoryControls="true";
    controls.innerHTML='<kbd>P1: WASD / ARROWS MOVE · SPACE FIRE · L-SHIFT DASH</kbd><kbd>P1 ITEMS: E POTION · Q TORCH · R TELEPORT · B BANISH · TAB INVENTORY</kbd><kbd>2P ONLY: IJKL MOVE · ENTER FIRE · R-CTRL DASH · O = PLAYER 2 POTION</kbd>';
  }

  function render(){
    prepareSidebar();
    renderSidebarInventory();
    renderBottomKeyring();
    correctControlCopy();
  }

  const originalSync=typeof sync==="function"?sync:null;
  if(originalSync){
    try{sync=function(){const result=originalSync.apply(this,arguments);render();return result}}catch(error){console.warn("[Lost Sizzler] persistent inventory HUD hook unavailable",error)}
  }

  render();
  window.CCGLostSizzlerInventoryHudV106={render};
})();
