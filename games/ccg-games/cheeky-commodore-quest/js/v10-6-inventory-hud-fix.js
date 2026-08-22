/* The Lost Sizzler — authoritative V10.6 inventory/key HUD + numbered quick slots.
 * Rebuilds only when the carried state actually changes; no permanent polling.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_INVENTORY_HUD_V106__)return;
  window.__CCG_LOST_SIZZLER_INVENTORY_HUD_V106__=true;

  const html=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const icon=(kind,label)=>typeof itemIconSVG==="function"?itemIconSVG(kind,label):"";
  const QUICK_USE=new Set(["potion","torch","teleport","banishment"]);
  const PRIMARY={potion:"E",torch:"Q",teleport:"R",banishment:"B"};
  let lastSignature="";

  function count(kind){try{return Math.max(0,Number(PGR.inventoryKindCount(p1,kind)||0))}catch(_){return 0}}
  function slotsFor(kind){return (p1?.inventory||[]).map((item,index)=>item?.kind===kind?index+1:null).filter(Boolean)}
  function signature(){
    if(!p1||!host)return"empty";
    return JSON.stringify({inventory:(p1.inventory||[]).map(x=>[x?.kind,Number(x?.qty||1),x?.name||""]),slots:Number(p1.inventorySlots||0),bronze:Number(p1.bronzeKeys||0),torch:Math.ceil(Number(p1.torchMs||0)/1000),keys:Number(host.keysCollected||0),sigil:Boolean(host.exitSigilCollected),objective:host.objective?.type||""});
  }
  function section(title){return `<div class="carried-section-label">${html(title)}</div>`}
  function actionKeys(primary="",slots=[]){const parts=[];if(primary)parts.push(`<kbd class="primary-item-key">${html(primary)}</kbd>`);if(slots.length){if(primary)parts.push('<span class="key-or">OR</span>');for(const slot of slots)parts.push(`<kbd class="number-item-key" title="Press ${slot} to use Quick Inventory slot ${slot}">${slot}</kbd>`)}return parts.length?`<div class="carried-action-keys">${parts.join("")}</div>`:""}
  function row({kind,name,qty,primary="",slots=[],desc,tone="",empty=false,auto=false}){return `<div class="carried-item ${tone?`carried-${html(tone)}`:""} ${empty?"carried-zero":""}">${icon(kind,name)}<div class="carried-copy"><b>${html(name)}</b><span>${html(desc)}</span></div><div class="carried-meta">${actionKeys(auto?"AUTO":primary,auto?[]:slots)}<strong>${html(qty)}</strong></div></div>`}

  function renderSidebar(){
    const target=document.getElementById("item-shortcuts");if(!target||!p1||!host)return;
    const potions=count("potion"),torches=count("torch"),teleports=count("teleport"),flasks=count("banishment"),artefacts=count("artefact"),main=Math.max(0,Number(host.keysCollected||0)),bronze=Math.max(0,Number(p1.bronzeKeys||0)),sigil=Boolean(host.exitSigilCollected);
    target.innerHTML=[
      section("STORED ITEMS · NUMBER KEYS USE THE MATCHING QUICK SLOT"),
      row({kind:"potion",name:"RESTORATION POTION",qty:`×${potions}`,primary:"E",slots:slotsFor("potion"),desc:"Restore health and 8 ammo.",tone:"green",empty:!potions}),
      row({kind:"torch",name:"FLAMING TORCH",qty:Number(p1.torchMs||0)>0?`ACTIVE ${Math.ceil(Number(p1.torchMs)/1000)}s · ×${torches}`:`×${torches}`,primary:"Q",slots:slotsFor("torch"),desc:"Light the dungeon temporarily.",tone:"gold",empty:!torches&&Number(p1.torchMs||0)<=0}),
      row({kind:"teleport",name:"TELEPORT SPELL",qty:`×${teleports}`,primary:"R",slots:slotsFor("teleport"),desc:"Warp to a safe explored room.",tone:"purple",empty:!teleports}),
      row({kind:"banishment",name:"BANISHMENT FLASK",qty:`×${flasks}`,primary:"B",slots:slotsFor("banishment"),desc:"Destroy a nearby Death Stalker when in range.",tone:"purple",empty:!flasks}),
      row({kind:"loot",name:"RARE ARTEFACT",qty:`×${artefacts}`,primary:"TRADE",desc:"Trade 3 at a shop for a Banishment Flask.",tone:"cyan",empty:!artefacts}),
      section("KEYS & QUEST ITEMS · USED AUTOMATICALLY"),
      row({kind:"key",name:"MAIN VAULT KEYS",qty:`${main}/${C.keyTarget}`,desc:"Floor key objective; collected automatically.",tone:"gold",empty:!main,auto:true}),
      row({kind:"bronze",name:"BRONZE KEY",qty:`×${bronze}`,desc:"Automatically opens a bronze door or locked chest.",tone:"gold",empty:!bronze,auto:true}),
      row({kind:"exitSigil",name:"EXIT SIGIL",qty:sigil?"HELD":"NOT HELD",desc:"Automatically unlocks the floor exit when required.",tone:"gold",empty:!sigil,auto:true})
    ].join("");
    target.dataset.inventoryHudOwner="v106-live";
  }

  function quickKeyChip(kind,label,value){return `<span class="quick-key-chip">${icon(kind,label)}<b>${html(label)}</b><strong>${html(value)}</strong></span>`}
  function renderKeyring(){
    if(!p1||!host)return;const slots=document.getElementById("quick-slots");if(!slots?.parentNode)return;let strip=document.getElementById("quick-keyring-icons");
    if(!strip){strip=document.createElement("div");strip.id="quick-keyring-icons";strip.className="quick-keyring-icons";strip.setAttribute("aria-label","Keyring and quest items");slots.parentNode.insertBefore(strip,slots.nextSibling)}
    const chips=[],main=Math.max(0,Number(host.keysCollected||0)),bronze=Math.max(0,Number(p1.bronzeKeys||0));if(host.objective?.type==="keys"||main)chips.push(quickKeyChip("key","MAIN",`${main}/${C.keyTarget}`));if(bronze)chips.push(quickKeyChip("bronze","BRONZE",`×${bronze}`));if(host.exitSigilCollected)chips.push(quickKeyChip("exitSigil","SIGIL","HELD"));strip.innerHTML=chips.join("");strip.classList.toggle("hidden",!chips.length);
  }
  function annotateSlots(){
    if(!p1)return;const slots=document.querySelectorAll?.("#quick-slots .quick-slot")||[],capacity=Math.max(1,Number(PGR.inventoryCapacity(p1)||3)),head=document.querySelector(".hub-inventory-head b");if(head)head.textContent=`QUICK INVENTORY · PRESS 1–${capacity} TO USE SLOT`;
    slots.forEach((slot,index)=>{const n=index+1,item=p1.inventory?.[index],usable=Boolean(item&&QUICK_USE.has(item.kind)),number=slot.querySelector("b"),label=item?PGR.inventoryLabel(item):`Empty slot ${n}`;if(number){number.classList.add("quick-slot-number");number.textContent=String(n)}slot.classList.toggle("number-usable",usable);slot.dataset.slotHotkey=String(n);slot.setAttribute("aria-keyshortcuts",String(n));slot.title=usable?`${label} — press ${n} to use this exact slot${PRIMARY[item.kind]?` (or ${PRIMARY[item.kind]})`:""}`:item?`${label} — slot ${n} is carried but not directly usable`:`Empty slot ${n}`})
  }
  function prepareSidebar(){
    const dock=document.querySelector(".shortcut-dock"),head=dock?.querySelector(".shortcut-dock-head"),commands=dock?.querySelector(".command-grid");if(!dock)return;dock.classList.add("inventory-live-dock");const title=head?.querySelector("h3"),tag=head?.querySelector("span");if(title)title.textContent="INVENTORY & KEYS";if(tag)tag.textContent="LIVE";
    if(commands){commands.classList.add("base-controls","inventory-dock-controls");commands.innerHTML='<span><kbd>TAB</kbd><b>FULL INVENTORY</b></span><span><kbd>1–6</kbd><b>USE MATCHING SLOT</b></span>'}
    const controls=document.querySelector("#menu .keys-help");if(controls){controls.dataset.v106InventoryControls="true";controls.innerHTML='<kbd>P1: WASD / ARROWS MOVE · SPACE FIRE · L-SHIFT DASH</kbd><kbd>P1 ITEMS: E POTION · Q TORCH · R TELEPORT · B BANISH · 1–6 QUICK SLOT · TAB INVENTORY</kbd><kbd>2P ONLY: IJKL MOVE · ENTER FIRE · R-CTRL DASH · O = PLAYER 2 POTION</kbd>'}
  }
  function render(force=false){prepareSidebar();const next=signature();if(!force&&next===lastSignature)return;lastSignature=next;renderSidebar();renderKeyring();annotateSlots()}

  function activateInventorySlot(index){
    if(!p1||mode!=="playing")return false;const capacity=Math.max(0,Number(PGR.inventoryCapacity(p1)||0)),slotNumber=index+1;if(index<0||index>=capacity){showToast?.("QUICK SLOT LOCKED",`Slot ${slotNumber} is not unlocked yet.`,"red",5200);return false}const item=p1.inventory?.[index];if(!item){showToast?.(`QUICK SLOT ${slotNumber} EMPTY`,`There is nothing in inventory slot ${slotNumber}.`,"cyan",4200);return false}if(!QUICK_USE.has(item.kind)){showToast?.(`SLOT ${slotNumber} — ${PGR.inventoryLabel(item)}`,item.kind==="artefact"?"Artefacts are trade items and cannot be activated. Take 3 to a shop for a Banishment Flask.":"This carried item is not directly activated.","cyan",5600);return false}if(typeof useInventorySlot==="function")useInventorySlot(p1,index);lastSignature="";render(true);return true;
  }
  function onKey(event){const match=String(event?.code||"").match(/^(?:Digit|Numpad)([1-6])$/),tag=String(event?.target?.tagName||"").toUpperCase();if(!match||event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||event.target?.isContentEditable||["INPUT","TEXTAREA","SELECT","BUTTON"].includes(tag)||mode!=="playing"||!p1)return;event.preventDefault?.();event.stopImmediatePropagation?.();activateInventorySlot(Number(match[1])-1)}

  const originalSync=typeof sync==="function"?sync:null;if(originalSync)sync=function(){const result=originalSync.apply(this,arguments);render(false);return result};
  addEventListener?.("keydown",onKey,true);
  window.addEventListener?.("ccg:inventory-refresh",()=>{lastSignature="";render(true)});
  render(true);
  window.CCGLostSizzlerInventoryHudV106={render:()=>render(true),activateInventorySlot};
})();
