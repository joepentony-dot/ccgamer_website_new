/* C64 Dungeon Carnage V10.42 r80 — genuine wearable equipment. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R80WearableEquipment)return;

  const PGR=window.CCGProgression;
  if(!PGR)return;

  const STYLE="css/v10-42-r80-wearable-equipment.css";
  const SLOT_ORDER=["head","hands","feet"];
  const SLOT_LABELS={head:"HEAD",hands:"HANDS",feet:"FEET"};
  const GEAR_NAMES={
    head:["SCOUT HOOD","ARCHIVE HOOD","TORCHFINDER HELM","WARDEN CIRCLET","LEGENDARY VISOR"],
    hands:["UTILITY GLOVES","SCAVENGER GLOVES","VAULTGRIP GLOVES","WARDEN GAUNTLETS","LEGENDARY GAUNTLETS"],
    feet:["EXPLORER BOOTS","RUNNER BOOTS","VAULT RUNNER BOOTS","WARDEN BOOTS","LEGENDARY BOOTS"]
  };
  const state={drops:0,equips:0,unequips:0};

  function ensureStyle(){
    if(document.querySelector('link[data-ccg-r80-wearables="true"]'))return;
    const cache=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||"latest");
    const link=document.createElement("link");
    link.rel="stylesheet";link.href=`${STYLE}?v=${encodeURIComponent(cache)}`;link.dataset.ccgR80Wearables="true";
    document.head.appendChild(link)
  }
  function rarityIndex(rarity){return Math.max(0,PGR.RARITY.indexOf(String(rarity||"COMMON")))}
  function escHtml(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
  function hashText(value){let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h>>>0}
  function currentPlayer(){try{return typeof p1!=="undefined"?p1:null}catch(_){return null}}
  function luckPoints(player=currentPlayer()){return Math.max(0,Math.floor(Number(player?.rpgStats?.luck)||5)-5)}
  function wearables(player){if(!player)return{head:null,hands:null,feet:null};if(!player.wearables||typeof player.wearables!=="object"||Array.isArray(player.wearables))player.wearables={head:null,hands:null,feet:null};for(const slot of SLOT_ORDER)if(!(slot in player.wearables))player.wearables[slot]=null;return player.wearables}
  function effectValues(slot,rarity){
    const idx=rarityIndex(rarity);
    if(slot==="head")return{sightBonus:idx>=3?2:1};
    if(slot==="hands")return{scavengerBonus:Number((.08+idx*.04).toFixed(2))};
    if(slot==="feet")return{moveFactor:Number((.97-idx*.01).toFixed(2))};
    return{}
  }
  function effectText(item){
    if(!item)return"EMPTY";
    if(item.slot==="head")return `+${Number(item.sightBonus||1)} SIGHT`;
    if(item.slot==="hands")return `+${Math.round(Number(item.scavengerBonus||0)*100)}% AMMO PICKUPS`;
    if(item.slot==="feet")return `${Math.round((1-Number(item.moveFactor||1))*100)}% FASTER MOVEMENT`;
    return"PASSIVE BONUS"
  }
  function makeWearable(chest,player=currentPlayer()){
    const floor=Math.max(1,Number(run?.floor||1)),depth=Math.max(0,Number(chest?.depth||0)),luck=luckPoints(player);
    const seed=hashText(`${chest?.id||"chest"}|${floor}|${depth}`);
    const slot=SLOT_ORDER[(seed>>>5)%SLOT_ORDER.length];
    const promotionChance=Math.min(70,8+depth*3+luck*4);
    const power=Math.min(4,Math.max(0,Math.floor((floor-1)/2)+(((seed>>>11)%100)<promotionChance?1:0)));
    const rarity=PGR.RARITY[power]||"COMMON",values=effectValues(slot,rarity),name=GEAR_NAMES[slot][power]||`${rarity} ${SLOT_LABELS[slot]}`;
    return{kind:"wearable",slot,rarity,name,short:name,...values,desc:`${SLOT_LABELS[slot]} wearable. ${effectText({slot,...values})}. Equipped clothing is retained through normal deaths and floor transitions.`}
  }
  function qualifiesForDrop(chest,player=currentPlayer()){
    if(!chest||chest.v142R80WearableProcessed)return false;
    const floor=Math.max(1,Number(run?.floor||1)),luck=luckPoints(player),seed=hashText(`${chest.id||"chest"}|${floor}|${chest.depth||0}|wearable`);
    const special=Boolean(chest.v142WardenCache)||/arena-chest|warden-cache|memory/i.test(String(chest.id||""));
    const chance=Math.min(36,14+floor*2+luck*2);
    return special||((seed>>>7)%100)<chance
  }
  function floorDrop(player,chest,item){
    try{
      host.items=host.items||[];
      host.items.push({id:`wearable-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,x:Number(chest?.x??player?.x??0),y:Number(chest?.y??player?.y??0),kind:"armour",active:true,title:item.name,carriedItem:{...item}});
      host.revision=(Number(host.revision)||0)+1;
      if(typeof broadcastWorld==="function")broadcastWorld()
    }catch(_){}
  }
  function deliverWearable(player,chest,item){
    if(PGR.inventoryAdd(player,{...item})){
      state.drops++;
      try{S?.sfx?.("armour")}catch(_){}
      try{showToast("WEARABLE GEAR FOUND",`${item.name} added to inventory. Open TAB and choose EQUIP. ${effectText(item)}.`,"gold",8500)}catch(_){}
      try{if(typeof sync==="function")sync()}catch(_){}
      return true
    }
    floorDrop(player,chest,item);
    try{showToast("WEARABLE GEAR — INVENTORY FULL",`${item.name} has dropped beside the chest. Free a slot and collect it when ready.`,"red",9000)}catch(_){}
    return false
  }

  function setHandsBonus(player,value){
    const old=Math.max(0,Number(player?.v142R80HandsBonus)||0),next=Math.max(0,Number(value)||0);
    player.scavenger=Math.max(0,Number(player.scavenger||0)-old+next);player.v142R80HandsBonus=next
  }
  function setFeetFactor(player,value){
    const old=Math.min(1,Math.max(.5,Number(player?.v142R80FeetFactor)||1)),next=Math.min(1,Math.max(.5,Number(value)||1));
    const current=Math.max(.1,Number(player?.moveMultiplier||1));
    const activeBase=Number(player?._v105Base?.moveMultiplier);
    if(Number.isFinite(activeBase)&&activeBase>0){
      const baseWithoutFeet=Math.max(.1,activeBase/old),nextBase=Math.max(.1,baseWithoutFeet*next);
      const activeScale=Math.max(.05,current/activeBase);
      player._v105Base.moveMultiplier=nextBase;
      player.moveMultiplier=Math.max(.1,nextBase*activeScale)
    }else{
      const base=Math.max(.1,current/old);
      player.moveMultiplier=Math.max(.1,base*next)
    }
    player.v142R80FeetFactor=next
  }
  function applySlotEffect(player,slot,item){
    if(slot==="hands")setHandsBonus(player,Number(item?.scavengerBonus)||0);
    else if(slot==="feet")setFeetFactor(player,Number(item?.moveFactor)||1)
  }
  function clearSlotEffect(player,slot){
    if(slot==="hands")setHandsBonus(player,0);
    else if(slot==="feet")setFeetFactor(player,1)
  }
  function equipWearable(player,index){
    const item=player?.inventory?.[index];
    if(!item||item.kind!=="wearable"||!SLOT_ORDER.includes(item.slot))return false;
    const slots=wearables(player),slot=item.slot,old=slots[slot]?{...slots[slot]}:null;
    const removed=PGR.inventoryRemove(player,index);if(!removed)return false;
    clearSlotEffect(player,slot);
    if(old&&!PGR.inventoryAdd(player,old)){
      PGR.inventoryAdd(player,removed);applySlotEffect(player,slot,old);slots[slot]=old;
      try{showToast("EQUIPMENT SWAP FAILED","There is no inventory space to return the currently equipped item.","red",6500)}catch(_){}
      return false
    }
    slots[slot]={...removed};applySlotEffect(player,slot,removed);state.equips++;
    try{S?.sfx?.("armour")}catch(_){}
    try{showToast(`${SLOT_LABELS[slot]} EQUIPPED`,`${removed.name}. ${effectText(removed)}.`,"green",7000)}catch(_){}
    try{if(typeof sync==="function")sync()}catch(_){}
    try{renderInventoryPanel?.()}catch(_){}
    return true
  }
  function unequipWearable(player,slot){
    if(!player||!SLOT_ORDER.includes(slot))return false;
    const slots=wearables(player),old=slots[slot];if(!old)return false;
    if(!PGR.inventoryCanAdd(player,old)){try{showToast("INVENTORY FULL","Free a carried slot before removing this equipped item.","red",6500)}catch(_){}return false}
    clearSlotEffect(player,slot);slots[slot]=null;PGR.inventoryAdd(player,{...old});state.unequips++;
    try{showToast(`${SLOT_LABELS[slot]} UNEQUIPPED`,`${old.name} returned to inventory.`,"cyan",6000)}catch(_){}
    try{if(typeof sync==="function")sync()}catch(_){}
    try{renderInventoryPanel?.()}catch(_){}
    return true
  }

  const baseSight=PGR.effectiveSight.bind(PGR);
  PGR.effectiveSight=function r80WearableSight(player,...args){
    const result=Number(baseSight(player,...args))||2,head=wearables(player).head;
    return result+Math.max(0,Number(head?.sightBonus)||0)
  };
  PGR.effectiveSight.__ccgV142R80Wearables=true;
  PGR.effectiveSight.__ccgOriginal=baseSight;

  if(typeof preservePlayer==="function"){
    const basePreserve=preservePlayer;
    preservePlayer=function r80PreserveWearables(old,...args){
      const result=basePreserve(old,...args);
      if(old?.wearables&&typeof old.wearables==="object")result.wearables={head:old.wearables.head?{...old.wearables.head}:null,hands:old.wearables.hands?{...old.wearables.hands}:null,feet:old.wearables.feet?{...old.wearables.feet}:null};
      if(old?.v142R80HandsBonus!=null)result.v142R80HandsBonus=Number(old.v142R80HandsBonus)||0;
      if(old?.v142R80FeetFactor!=null)result.v142R80FeetFactor=Number(old.v142R80FeetFactor)||1;
      return result
    };
    preservePlayer.__ccgV142R80Wearables=true;preservePlayer.__ccgOriginal=basePreserve;
  }

  if(typeof openChest==="function"){
    const baseOpenChest=openChest;
    openChest=function r80OpenChestWearableBonus(player,chest,...args){
      const wasActive=Boolean(chest?.active),qualified=wasActive&&qualifiesForDrop(chest,player),result=baseOpenChest(player,chest,...args);
      if(qualified&&chest?.active===false&&!chest.v142R80WearableProcessed){
        chest.v142R80WearableProcessed=true;
        const item=makeWearable(chest,player);deliverWearable(player,chest,item)
      }
      return result
    };
    openChest.__ccgV142R80Wearables=true;openChest.__ccgOriginal=baseOpenChest;
  }

  if(typeof itemHelp==="function"){
    const baseItemHelp=itemHelp;
    itemHelp=function r80ItemHelp(kind,...args){return kind==="wearable"?"Wearable equipment. Use EQUIP in TAB to place it in its matching Head, Hands or Feet slot. Equipped gear stays with you through normal deaths.":baseItemHelp(kind,...args)};
  }
  if(typeof collectedName==="function"){
    const baseCollectedName=collectedName;
    collectedName=function r80CollectedName(item,...args){
      if(item?.carriedItem?.kind==="wearable")return item.carriedItem.name||"WEARABLE GEAR";
      return baseCollectedName(item,...args)
    };
    collectedName.__ccgV142R80Wearables=true;collectedName.__ccgOriginal=baseCollectedName;
  }
  if(typeof inventoryVisualKind==="function"){
    const baseInventoryVisualKind=inventoryVisualKind;
    inventoryVisualKind=function r80InventoryVisualKind(item){return item?.kind==="wearable"?"armour":baseInventoryVisualKind(item)};
  }
  function wearableComparison(player,item){
    if(!item?.slot)return"";
    const current=wearables(player)[item.slot];
    return `CURRENT: ${current?current.name+" · "+effectText(current):"EMPTY"} · NEW: ${item.name||"WEARABLE GEAR"} · ${effectText(item)}`
  }
  if(typeof itemInfoDetails==="function"){
    const baseInfo=itemInfoDetails;
    itemInfoDetails=function r80WearableInfo(item){
      if(item?.kind==="wearable"){const player=currentPlayer();return{name:item.name||"WEARABLE GEAR",kind:"armour",desc:item.desc||effectText(item),why:`${SLOT_LABELS[item.slot]||"GEAR"} SLOT · ${wearableComparison(player,item)}. Equip it from TAB; swapping returns the old item to your carried inventory.`}}
      return baseInfo(item)
    };
  }
  if(typeof useInventorySlot==="function"){
    const baseUse=useInventorySlot;
    useInventorySlot=function r80UseInventorySlot(player,index,...args){
      if(player?.inventory?.[index]?.kind==="wearable")return equipWearable(player,index);
      return baseUse(player,index,...args)
    };
  }

  function renderLoadout(){
    const player=currentPlayer(),loadout=document.getElementById("inventory-loadout");if(!player||!loadout)return;
    const board=loadout.querySelector(".r71-equipment-board");if(!board)return;
    let strip=loadout.querySelector("#r80-wearable-strip");
    if(!strip){strip=document.createElement("div");strip.id="r80-wearable-strip";strip.className="r80-wearable-strip";board.insertAdjacentElement("afterend",strip)}
    const slots=wearables(player);
    strip.innerHTML=SLOT_ORDER.map(slot=>{const item=slots[slot];return `<article class="r80-wearable-card ${item?"equipped":"empty"}" data-r80-slot="${slot}"><span>${SLOT_LABELS[slot]}</span><b>${escHtml(item?.name||"EMPTY")}</b><small>${escHtml(item?effectText(item):"FIND WEARABLE GEAR IN DUNGEON CHESTS")}</small>${item?`<button type="button" data-r80-unequip="${slot}">UNEQUIP</button>`:""}</article>`}).join("");
    strip.querySelectorAll("[data-r80-unequip]").forEach(button=>button.addEventListener("click",()=>unequipWearable(player,String(button.dataset.r80Unequip||""))));
    const frame=loadout.querySelector(".r71-character-frame");
    if(frame){
      frame.querySelectorAll(".r80-preview-gear").forEach(node=>node.remove());
      for(const slot of SLOT_ORDER){const item=slots[slot];if(!item)continue;const mark=document.createElement("span");mark.className=`r80-preview-gear r80-preview-${slot}`;mark.title=`${item.name}: ${effectText(item)}`;frame.appendChild(mark)}
    }
  }
  function decorateInventory(){
    const player=currentPlayer(),list=document.getElementById("inventory-list");if(!player||!list)return;
    list.querySelectorAll(".inventory-slot").forEach((slot,index)=>{
      const item=player.inventory?.[index];if(item?.kind!=="wearable")return;
      const actions=slot.querySelector(".slot-actions");if(!actions||actions.querySelector("[data-r80-equip]"))return;
      const button=document.createElement("button");button.type="button";button.textContent="EQUIP";button.dataset.r80Equip=String(index);button.addEventListener("click",()=>equipWearable(player,index));actions.prepend(button)
    })
  }
  if(typeof renderInventoryPanel==="function"){
    const baseRender=renderInventoryPanel;
    renderInventoryPanel=function r80RenderInventory(...args){const result=baseRender.apply(this,args);renderLoadout();decorateInventory();return result};
    renderInventoryPanel.__ccgV142R80Wearables=true;renderInventoryPanel.__ccgOriginal=baseRender;
  }
  if(typeof MutationObserver==="function"){
    const inventoryPanel=document.getElementById("inventory-panel");
    if(inventoryPanel){
      const visibilityObserver=new MutationObserver(()=>{
        if(inventoryPanel.classList.contains("hidden"))return;
        const refresh=()=>{try{renderLoadout();decorateInventory()}catch(_){}};
        if(typeof queueMicrotask==="function")queueMicrotask(refresh);else Promise.resolve().then(refresh)
      });
      visibilityObserver.observe(inventoryPanel,{attributes:true,attributeFilter:["class"]})
    }
  }

  function wearableColour(item){
    return({"COMMON":"#9aa3ad","UNCOMMON":"#72ff9b","SIZZLER":"#6cecff","GOLD MEDAL":"#ffd85a","ZZAP! 97%":"#ff5bae"})[String(item?.rarity||"COMMON")]||"#9aa3ad"
  }
  function drawLiveWearables(player,cx,cy,d){
    const slots=wearables(player),head=slots.head,hands=slots.hands,feet=slots.feet;
    if(!head&&!hands&&!feet)return;
    try{
      ctx.save();ctx.imageSmoothingEnabled=false;
      if(head){
        const colour=wearableColour(head);
        ctx.fillStyle="#242a31";ctx.fillRect(cx-7,cy-14,14,2);
        ctx.fillStyle=colour;ctx.globalAlpha=.92;ctx.fillRect(cx-6,cy-15,12,2);ctx.fillRect(cx-8,cy-12,2,4);ctx.fillRect(cx+6,cy-12,2,4);
        if(Number(head.sightBonus||0)>=2){ctx.fillStyle="#eafcff";ctx.fillRect(cx-4,cy-11,3,1);ctx.fillRect(cx+1,cy-11,3,1)}
        ctx.globalAlpha=1
      }
      if(hands){
        const colour=wearableColour(hands),fx=Math.sign(Number(d?.x)||0),fy=Math.sign(Number(d?.y)||0);
        ctx.fillStyle=colour;ctx.globalAlpha=.9;
        if(fx){ctx.fillRect(cx+(fx>0?9:-12),cy-3,3,5);ctx.fillRect(cx+(fx>0?-11:8),cy-2,3,4)}
        else{ctx.fillRect(cx-11,cy-3+(fy>0?2:0),3,4);ctx.fillRect(cx+8,cy-3+(fy>0?2:0),3,4)}
        ctx.globalAlpha=1
      }
      if(feet){
        const colour=wearableColour(feet);
        ctx.fillStyle="#171b20";ctx.fillRect(cx-8,cy+13,6,3);ctx.fillRect(cx+2,cy+13,6,3);
        ctx.fillStyle=colour;ctx.globalAlpha=.88;ctx.fillRect(cx-8,cy+14,7,2);ctx.fillRect(cx+1,cy+14,7,2);ctx.globalAlpha=1
      }
      ctx.restore()
    }catch(_){try{ctx.restore()}catch(__){}}
  }
  if(typeof drawPlayerEquipmentOverlay==="function"){
    const baseDrawEquipment=drawPlayerEquipmentOverlay;
    drawPlayerEquipmentOverlay=function r80DrawPlayerEquipmentOverlay(player,cx,cy,d,...args){
      const result=baseDrawEquipment(player,cx,cy,d,...args);drawLiveWearables(player,cx,cy,d);return result
    };
    drawPlayerEquipmentOverlay.__ccgV142R80Wearables=true;drawPlayerEquipmentOverlay.__ccgOriginal=baseDrawEquipment;
  }

  ensureStyle();
  try{renderLoadout();decorateInventory()}catch(_){}
  window.CCGLostSizzlerV142R80WearableEquipment=Object.freeze({
    version:"V10.42-r80",state,slots:[...SLOT_ORDER],makeWearable,effectText,equipWearable,unequipWearable,qualifiesForDrop,wearables
  });
})();