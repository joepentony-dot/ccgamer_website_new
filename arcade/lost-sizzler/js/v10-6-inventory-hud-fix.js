/* The Lost Sizzler — V10.6 persistent inventory/key HUD + numbered quick slots.
 *
 * The tactical sidebar is the permanent at-a-glance inventory. Every carriable
 * item type stays visible there, including zero counts, so a newly collected
 * potion/key can never disappear into an apparently empty HUD. The bottom Quick
 * Inventory keeps the actual slot order and number keys 1–6 activate the exact
 * matching slot as an alternative to E/Q/R/B.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_INVENTORY_HUD_V106__)return;
  window.__CCG_LOST_SIZZLER_INVENTORY_HUD_V106__=true;

  const html=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const icon=(kind,label)=>typeof itemIconSVG==="function"?itemIconSVG(kind,label):"";
  const QUICK_USE=new Set(["potion","torch","teleport","banishment"]);
  const PRIMARY_KEYS={potion:"E",torch:"Q",teleport:"R",banishment:"B"};

  function count(kind){
    try{return Math.max(0,Number(PGR.inventoryKindCount(p1,kind)||0))}catch(_){return 0}
  }

  function slotsFor(kind){
    if(typeof p1==="undefined"||!p1)return[];
    return (p1.inventory||[]).map((item,index)=>item?.kind===kind?index+1:null).filter(Boolean);
  }

  function section(title){return `<div class="carried-section-label">${html(title)}</div>`}

  function actionKeys(primary="",slots=[]){
    const parts=[];
    if(primary)parts.push(`<kbd class="primary-item-key">${html(primary)}</kbd>`);
    if(slots.length){
      if(primary)parts.push('<span class="key-or">OR</span>');
      for(const slot of slots)parts.push(`<kbd class="number-item-key" title="Press ${slot} to use Quick Inventory slot ${slot}">${slot}</kbd>`);
    }
    return parts.length?`<div class="carried-action-keys">${parts.join("")}</div>`:"";
  }

  function row({kind,name,qty,primary="",slots=[],desc,tone="",empty=false,auto=false}){
    const actions=auto?actionKeys("AUTO",[]):actionKeys(primary,slots);
    return `<div class="carried-item ${tone?`carried-${html(tone)}`:""} ${empty?"carried-zero":""}">${icon(kind,name)}<div class="carried-copy"><b>${html(name)}</b><span>${html(desc)}</span></div><div class="carried-meta">${actions}<strong>${html(qty)}</strong></div></div>`;
  }

  function renderSidebarInventory(){
    const target=document.getElementById("item-shortcuts");
    if(!target||typeof p1==="undefined"||!p1||typeof host==="undefined"||!host)return;

    const potions=count("potion"),torches=count("torch"),teleports=count("teleport"),flasks=count("banishment"),artefacts=count("artefact");
    const rows=[section("STORED ITEMS · NUMBER KEYS USE THE MATCHING QUICK SLOT")];

    rows.push(row({kind:"potion",name:"RESTORATION POTION",qty:`×${potions}`,primary:"E",slots:slotsFor("potion"),desc:"Restore health and 8 ammo.",tone:"green",empty:potions===0}));
    rows.push(row({kind:"torch",name:"FLAMING TORCH",qty:Number(p1.torchMs||0)>0?`ACTIVE ${Math.ceil(Number(p1.torchMs)/1000)}s · ×${torches}`:`×${torches}`,primary:"Q",slots:slotsFor("torch"),desc:"Light the dungeon temporarily.",tone:"gold",empty:torches===0&&Number(p1.torchMs||0)<=0}));
    rows.push(row({kind:"teleport",name:"TELEPORT SPELL",qty:`×${teleports}`,primary:"R",slots:slotsFor("teleport"),desc:"Warp to a safe explored room.",tone:"purple",empty:teleports===0}));
    rows.push(row({kind:"banishment",name:"BANISHMENT FLASK",qty:`×${flasks}`,primary:"B",slots:slotsFor("banishment"),desc:"Destroy a nearby Death Stalker when in range.",tone:"purple",empty:flasks===0}));
    rows.push(row({kind:"loot",name:"RARE ARTEFACT",qty:`×${artefacts}`,primary:"TRADE",desc:"Trade 3 at a shop for a Banishment Flask.",tone:"cyan",empty:artefacts===0}));

    rows.push(section("KEYS & QUEST ITEMS · USED AUTOMATICALLY"));
    const mainKeys=Math.max(0,Number(host.keysCollected||0)),bronze=Math.max(0,Number(p1.bronzeKeys||0)),sigil=Boolean(host.exitSigilCollected);
    rows.push(row({kind:"key",name:"MAIN VAULT KEYS",qty:`${mainKeys}/${C.keyTarget}`,desc:"Floor key objective; collected automatically.",tone:"gold",empty:mainKeys===0,auto:true}));
    rows.push(row({kind:"bronze",name:"BRONZE KEY",qty:`×${bronze}`,desc:"Automatically opens a bronze door or locked chest.",tone:"gold",empty:bronze===0,auto:true}));
    rows.push(row({kind:"exitSigil",name:"EXIT SIGIL",qty:sigil?"HELD":"NOT HELD",desc:"Automatically unlocks the floor exit when required.",tone:"gold",empty:!sigil,auto:true}));

    target.innerHTML=rows.join("");
    target.dataset.inventoryHudOwner="v106-live";
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

    const chips=[],mainKeys=Math.max(0,Number(host.keysCollected||0)),bronze=Math.max(0,Number(p1.bronzeKeys||0));
    if(host.objective?.type==="keys"||mainKeys>0)chips.push(quickKeyChip("key","MAIN",`${mainKeys}/${C.keyTarget}`));
    if(bronze>0)chips.push(quickKeyChip("bronze","BRONZE",`×${bronze}`));
    if(host.exitSigilCollected)chips.push(quickKeyChip("exitSigil","SIGIL","HELD"));
    strip.innerHTML=chips.join("");
    strip.classList.toggle("hidden",chips.length===0);
  }

  function annotateQuickSlots(){
    if(typeof p1==="undefined"||!p1)return;
    const slots=document.querySelectorAll?.("#quick-slots .quick-slot")||[];
    const capacity=Math.max(1,Number(PGR.inventoryCapacity(p1)||3));
    const head=document.querySelector(".hub-inventory-head b");
    if(head)head.textContent=`QUICK INVENTORY · PRESS 1–${capacity} TO USE SLOT`;

    slots.forEach((slot,index)=>{
      const slotNumber=index+1,item=p1.inventory?.[index],usable=Boolean(item&&QUICK_USE.has(item.kind)),number=slot.querySelector("b");
      if(number){number.classList.add("quick-slot-number");number.textContent=String(slotNumber)}
      slot.classList.toggle("number-usable",usable);
      slot.dataset.slotHotkey=String(slotNumber);
      slot.setAttribute("aria-keyshortcuts",String(slotNumber));
      const nativeKey=item?PRIMARY_KEYS[item.kind]:"";
      const label=item?PGR.inventoryLabel(item):`Empty slot ${slotNumber}`;
      slot.title=usable?`${label} — press ${slotNumber} to use this exact slot${nativeKey?` (or ${nativeKey})`:""}`:item?`${label} — slot ${slotNumber} is carried but not directly usable`:`Empty slot ${slotNumber}`;
    });
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
      commands.innerHTML='<span><kbd>TAB</kbd><b>FULL INVENTORY</b></span><span><kbd>1–6</kbd><b>USE MATCHING SLOT</b></span>';
    }
  }

  function correctControlCopy(){
    const controls=document.querySelector("#menu .keys-help");
    if(!controls)return;
    controls.dataset.v106InventoryControls="true";
    controls.innerHTML='<kbd>P1: WASD / ARROWS MOVE · SPACE FIRE · L-SHIFT DASH</kbd><kbd>P1 ITEMS: E POTION · Q TORCH · R TELEPORT · B BANISH · 1–6 QUICK SLOT · TAB INVENTORY</kbd><kbd>2P ONLY: IJKL MOVE · ENTER FIRE · R-CTRL DASH · O = PLAYER 2 POTION</kbd>';
  }

  function fallbackUse(item){
    if(!item)return false;
    if(item.kind==="potion"&&typeof usePotion==="function"){usePotion(p1);return true}
    if(item.kind==="torch"&&typeof useUtility==="function"){useUtility(p1);return true}
    if(item.kind==="teleport"&&typeof useTeleport==="function"){useTeleport(p1);return true}
    if(item.kind==="banishment"&&typeof useBanishment==="function"){useBanishment(p1);return true}
    return false;
  }

  function activateInventorySlot(index){
    if(typeof p1==="undefined"||!p1||typeof mode==="undefined"||mode!=="playing")return false;
    const capacity=Math.max(0,Number(PGR.inventoryCapacity(p1)||0)),slotNumber=index+1;
    if(index<0||index>=capacity){showToast?.("QUICK SLOT LOCKED",`Slot ${slotNumber} is not unlocked yet.`,"red",5200);return false}
    const item=p1.inventory?.[index];
    if(!item){showToast?.(`QUICK SLOT ${slotNumber} EMPTY`,`There is nothing in inventory slot ${slotNumber}.`,"cyan",4200);return false}
    if(!QUICK_USE.has(item.kind)){
      const label=PGR.inventoryLabel(item);
      showToast?.(`SLOT ${slotNumber} — ${label}`,item.kind==="artefact"?"Artefacts are trade items and cannot be activated. Take 3 to a shop for a Banishment Flask.":"This carried item is not directly activated.","cyan",5600);
      return false;
    }

    if(typeof useInventorySlot==="function")useInventorySlot(p1,index);
    else fallbackUse(item);
    renderLiveHud();
    return true;
  }

  function slotIndexFromEvent(event){
    const match=String(event?.code||"").match(/^(?:Digit|Numpad)([1-6])$/);
    return match?Number(match[1])-1:-1;
  }

  function isTypingTarget(target){
    if(!target)return false;
    const tag=String(target.tagName||"").toUpperCase();
    return target.isContentEditable||["INPUT","TEXTAREA","SELECT","BUTTON"].includes(tag);
  }

  function onQuickSlotKey(event){
    const index=slotIndexFromEvent(event);
    if(index<0||event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||isTypingTarget(event.target))return;
    if(typeof mode==="undefined"||mode!=="playing"||typeof p1==="undefined"||!p1)return;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    activateInventorySlot(index);
  }

  function renderLiveHud(){
    prepareSidebar();
    renderSidebarInventory();
    renderBottomKeyring();
    annotateQuickSlots();
    correctControlCopy();
  }

  const originalSync=typeof sync==="function"?sync:null;
  if(originalSync){
    try{sync=function(){const result=originalSync.apply(this,arguments);renderLiveHud();return result}}catch(error){console.warn("[Lost Sizzler] persistent inventory HUD hook unavailable",error)}
  }

  if(typeof addEventListener==="function")addEventListener("keydown",onQuickSlotKey,true);

  // Independent safety refresh. The game normally calls sync every frame, but
  // this keeps the tactical inventory alive even if a later optional layer wraps
  // or replaces sync. It never changes game state.
  if(typeof setInterval==="function")setInterval(()=>{
    if(document.body?.dataset?.runActive==="true")renderLiveHud();
  },250);

  renderLiveHud();
  window.CCGLostSizzlerInventoryHudV106={render:renderLiveHud,activateInventorySlot};
})();
