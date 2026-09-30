/* C64 Dungeon Carnage V10.42 R71 — compact RPG equipment and inventory screen. */
(()=>{
  "use strict";
  if(window.__CCG_DUNGEON_R71_EQUIPMENT_INVENTORY__)return;
  window.__CCG_DUNGEON_R71_EQUIPMENT_INVENTORY__=true;

  const PGR=window.CCGProgression;
  const RPG=window.CCGLostSizzlerV142ProceduralOverhaul;
  if(!PGR||typeof renderInventoryPanel!=="function")return;

  const escHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const currentPlayer=()=>{try{return p1||null}catch(_){return null}};
  const currentRun=()=>{try{return run||null}catch(_){return null}};
  const currentHost=()=>{try{return host||null}catch(_){return null}};
  const currentWorld=()=>{try{return world||null}catch(_){return null}};
  const icon=(kind,label)=>{try{return typeof itemIconSVG==="function"?itemIconSVG(kind,label):""}catch(_){return""}};
  const statValue=(player,id)=>Math.max(5,Math.floor(Number(player?.rpgStats?.[id])||5));
  const armourTier=value=>value>=10?4:value>=7?3:value>=4?2:value>0?1:0;
  const armourName=tier=>["UNARMOURED","PATCHED ARMOUR","PLATED ARMOUR","REINFORCED PLATE","WARDEN PLATE"][Math.max(0,Math.min(4,tier))];
  const playerSheetSource=()=>String(window.CCG_ASSET_OVERRIDES?.images?.visuals?.playerSheet||"../assets/pixel/explorer-sheet-v10-34.png");

  function ensureLayout(){
    const panel=document.querySelector("#inventory-panel .inventory-panel");if(!panel)return null;
    panel.classList.add("r71-inventory-panel");
    const title=panel.querySelector(".mobile-panel-head h2");if(title)title.textContent="Equipment & Inventory";
    const notice=document.getElementById("inventory-mobile-notice");if(notice)notice.textContent="TAB closes inventory · USE activates a carried item · INFO shows full details";
    let layout=panel.querySelector(".r71-inventory-layout");
    if(!layout){
      layout=document.createElement("section");layout.className="r71-inventory-layout";
      const objective=document.getElementById("inventory-objective"),loadout=document.getElementById("inventory-loadout"),list=document.getElementById("inventory-list");
      const anchor=notice?.nextSibling||panel.firstChild;panel.insertBefore(layout,anchor);
      if(objective)layout.appendChild(objective);
      if(loadout)layout.appendChild(loadout);
      if(list)layout.appendChild(list);
    }
    const guide=document.getElementById("inventory-guide");if(guide)guide.setAttribute("aria-hidden","true");
    const rpgSheet=document.getElementById("v142-rpg-sheet");if(rpgSheet)rpgSheet.setAttribute("aria-hidden","true");
    return panel;
  }

  function weaponInfo(player){
    const weapon=player?.weapon;
    const unlocked=player?.firearmUnlocked!==false&&weapon;
    if(!unlocked)return{name:"ARCHIVE SWORD",sub:"MELEE · NO AMMO REQUIRED",tier:0};
    let tier=Math.max(1,Number(player?.weaponLevel||weapon?.rating||1));
    try{tier=Math.max(tier,Number(window.CCGLostSizzlerV142R47FirearmEvolution?.deriveTier?.(player)||0))}catch(_){}
    return{name:String(weapon.displayName||weapon.name||"FIELD PULSE").toUpperCase(),sub:`TIER ${tier} · POWER ${Math.max(1,Number(weapon.power||1)+Number(player.damageBonus||0))}`,tier};
  }

  function sigilPowers(player){
    return[
      player?.sigilReveal&&"REVEAL",
      player?.sigilWard&&"WARD",
      player?.sigilBind&&"BIND",
      player?.sigilBanish&&"BANISH"
    ].filter(Boolean);
  }

  function questSummary(player,hostState,runState){
    const claimedDomains=Array.isArray(runState?.v142ClaimedDomains)?runState.v142ClaimedDomains:[];
    const campaignKeys=new Set(claimedDomains.map(id=>String(id||"").trim()).filter(Boolean)).size;
    const keys=Math.max(campaignKeys,Math.max(0,Number(hostState?.keysCollected||0))),target=Math.max(1,Number(typeof C!=="undefined"?C.keyTarget:3)||3);
    return[
      ["DOMAIN KEYS",`${keys}/${target}`,"key"],
      ["BRONZE",`×${Math.max(0,Number(player?.bronzeKeys||0))}`,"bronze"],
      ["EXIT SIGIL",hostState?.exitSigilCollected?"HELD":"NOT HELD","exitSigil"],
      ["ARTEFACTS",`×${Math.max(0,Number(PGR.inventoryKindCount?.(player,"artefact")||0))}`,"loot"]
    ];
  }

  function renderLoadout(player){
    const target=document.getElementById("inventory-loadout");if(!target)return;
    const runState=currentRun(),hostState=currentHost(),worldState=currentWorld();
    const weapon=weaponInfo(player),armour=Math.max(0,Math.min(12,Number(player.armor||0))),tier=armourTier(armour);
    const powers=sigilPowers(player),rpgStats=Array.isArray(RPG?.rpgStats)?RPG.rpgStats:[],relicDefs=Array.isArray(RPG?.relics)?RPG.relics:[],ownedRelics=Array.isArray(player.relics)?player.relics:[];
    const relicRows=ownedRelics.map(id=>relicDefs.find(row=>row.id===id)||{id,name:String(id).replace(/-/g," ").toUpperCase(),desc:"Passive run relic."});
    const cap=runState?PGR.floorLevelCap(runState):player.level||1,atCap=(player.level||1)>=cap;
    let explore=0;try{explore=Math.round(PGR.roomCompletion(explored.get(player.id)||new Set(),worldState)*100)}catch(_){}
    const essenceCost=Math.max(1,Number(RPG?.essenceCost?.(player)||player.banishmentEssenceCost||3));
    const statHtml=rpgStats.map(row=>`<div class="r71-stat"><span>${escHtml(row.short||row.name)}</span><b>${statValue(player,row.id)}</b></div>`).join("");
    const relicHtml=(relicRows.length?relicRows:[{name:"NO RELICS YET",desc:"Defeat Key-domain guardians to awaken passive relics."}]).map(row=>`<div class="r71-relic" title="${escHtml(row.desc||"")}"><i>◆</i><span>${escHtml(row.name)}</span></div>`).join("");
    const utility=player.torchMs>0?`TORCH ${Math.ceil(Number(player.torchMs)/1000)}s`:"NO ACTIVE TORCH";
    const powersText=powers.length?powers.join(" · "):"DORMANT";
    target.innerHTML=`
      <div class="r71-loadout-head"><div><span>CHARACTER LOADOUT</span><b>LEVEL ${Number(player.level||1)} <em>/ CAP ${cap}</em></b></div><div class="r71-xp-mini"><span>${atCap?"FLOOR CAP":"LEVEL XP"}</span><b>${atCap?"CAPPED":`${Number(player.xp||0)}/${PGR.xpNeed(player.level||1)}`}</b></div></div>
      <div class="r71-equipment-board">
        <div class="r71-equip-card r71-equip-weapon"><span class="r71-slot-label">WEAPON</span><div class="r71-slot-icon">${icon("weapon",weapon.name)}</div><b>${escHtml(weapon.name)}</b><small>${escHtml(weapon.sub)}</small></div>
        <div class="r71-character-stage armour-tier-${tier}" aria-label="Current CCG character and equipped gear">
          <div class="r71-character-frame">
            <span class="r71-character-sprite-window"><span class="r71-character-sprite" style="--r71-player-sheet:url(\'${escHtml(playerSheetSource())}\')"></span></span>
            <span class="r71-preview-shoulder left"></span><span class="r71-preview-shoulder right"></span>
            <span class="r71-preview-chest"></span><span class="r71-preview-helm"></span>
            <span class="r71-preview-sigil ${powers.length?"active":""}" title="${powers.length?`SIGIL: ${escHtml(powersText)}`:"Sigil dormant"}">✦</span>
            <span class="r71-preview-relic ${relicRows.length?"active":""}" title="${relicRows.length?`${relicRows.length} equipped relic${relicRows.length===1?"":"s"}`:"No equipped relics"}">◆${relicRows.length?` ${relicRows.length}`:""}</span>
          </div>
          <strong>CHEEKY COMMODORE GAMER</strong>
          <small>${escHtml(armourName(tier))} · ${escHtml(weapon.name)}</small>
        </div>
        <div class="r71-equip-card r71-equip-armour"><span class="r71-slot-label">BODY ARMOUR</span><div class="r71-slot-icon">${icon("armour",armourName(tier))}</div><b>${armourName(tier)}</b><small>ARMOUR ${armour}/12</small></div>
        <div class="r71-equip-card r71-equip-sigil"><span class="r71-slot-label">SIGIL</span><div class="r71-slot-rune">✦</div><b>${escHtml(powersText)}</b><small>ESSENCE ${Math.max(0,Number(player.banishmentEssence||0))}/${essenceCost}</small></div>
        <div class="r71-equip-card r71-equip-utility"><span class="r71-slot-label">ACTIVE UTILITY</span><div class="r71-slot-icon">${icon("torch",utility)}</div><b>${escHtml(utility)}</b><small>MAP ${explore}%</small></div>
      </div>
      <div class="r71-stat-strip">${statHtml}</div>
      <div class="r71-relic-strip"><span class="r71-strip-title">EQUIPPED RELICS</span><div class="r71-relics">${relicHtml}</div></div>
    `;
  }

  function renderObjective(player){
    const target=document.getElementById("inventory-objective"),hostState=currentHost(),runState=currentRun(),worldState=currentWorld();if(!target||!hostState||!runState)return;
    let explore=0,objective="CURRENT OBJECTIVE";try{explore=Math.round(PGR.roomCompletion(explored.get(player.id)||new Set(),worldState)*100);objective=SYS.objectiveText(hostState,runState,explore)}catch(_){}
    const quest=questSummary(player,hostState,runState).map(([name,value,kind])=>`<div class="r71-quest-chip"><span class="r71-quest-icon">${icon(kind,name)}</span><span><small>${escHtml(name)}</small><b>${escHtml(value)}</b></span></div>`).join("");
    target.innerHTML=`<div class="r71-objective-copy"><small>CURRENT OBJECTIVE</small><b>${escHtml(objective)}</b></div><div class="r71-quest-strip">${quest}</div>`;
  }

  function compactInventoryList(){
    const list=document.getElementById("inventory-list");if(!list)return;
    list.setAttribute("aria-label","Carried inventory slots");
    list.querySelectorAll(".inventory-slot").forEach((slot,index)=>{
      slot.dataset.r71Slot=String(index+1);
      const copy=slot.querySelector(".inventory-slot-copy>b");if(copy)copy.textContent=slot.classList.contains("locked")?`SLOT ${index+1} · LOCKED`:`SLOT ${index+1}`;
      slot.querySelectorAll(".inventory-slot-copy>small").forEach(node=>node.classList.add("r71-long-copy"));
    });
  }

  function renderR71(){
    const player=currentPlayer();if(!player)return;
    const panel=ensureLayout();if(!panel)return;
    renderObjective(player);renderLoadout(player);compactInventoryList();
  }

  const baseRenderInventoryPanel=renderInventoryPanel;
  renderInventoryPanel=function r71RenderInventoryPanel(...args){
    const result=baseRenderInventoryPanel.apply(this,args);
    renderR71();
    return result;
  };

  const observer=new MutationObserver(()=>{const panel=document.getElementById("inventory-panel");if(panel&&!panel.classList.contains("hidden"))renderR71()});
  const inventory=document.getElementById("inventory-panel");if(inventory)observer.observe(inventory,{attributes:true,attributeFilter:["class"]});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",renderR71,{once:true});else renderR71();

  window.CCGLostSizzlerV142R71EquipmentInventory=Object.freeze({version:"V10.42-r71",render:renderR71,armourTier,armourName});
})();
