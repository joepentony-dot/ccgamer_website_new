/* The Lost Sizzler V10.42 — campaign-aware Tutorial presentation without rewriting the stabilized training runtime. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_TUTORIAL_CAMPAIGN__)return;
  window.__CCG_LOST_SIZZLER_V142_TUTORIAL_CAMPAIGN__=true;

  const STEP_COPY=new Map([
    ["OBJECTIVES, MAP & DISCOVERY",{
      title:"READ THE DUNGEON AS YOU DISCOVER IT",
      copy:"The campaign is built around exploration rather than a fully revealed map. Follow the current objective, learn each floor's colour and room language, and let discovered markers build a useful picture of where you have actually been.",
      detail:"Sanctuary, shops, Warden Corruption and other important symbols belong in the legend once they are relevant. The full campaign now spans fifteen floors, so the tutorial teaches the systems you carry through the entire run rather than asking you to memorise a fixed route."
    }],
    ["SURVIVAL, DEATH & RECOVERY",{
      title:"SURVIVAL & RPG GROWTH",
      copy:"Health and armour keep you alive, while Might, Vitality, Agility, Endurance, Luck and Arcana shape the character you carry deeper into the dungeon.",
      detail:"Death can remove XP, levels and their stat benefits. One recoverable death cache owns the intended lost XP/items; recovering it before another death restores what that cache still owns."
    }],
    ["DOORS, CHESTS, CACHES & SOLID SCENERY",{
      title:"LOOT, LOCKS & THE EVOLVING FIREARM",
      copy:"Bronze locks reward exploration, chests carry loot and equipment, and weapon caches improve the single Field Pulse weapon rather than spawning a collection of unrelated guns.",
      detail:"WEAPON UPGRADED must mean a real gameplay improvement. Smashable furniture blocks movement until destroyed; decorative background scenery should never mislead you into treating it as a usable object."
    }],
    ["NAMED THREATS, WARDENS & THE STALKER",{
      title:"THREATS, WARDENS & BANISHMENT",
      copy:"Named champions, Wardens and supernatural threats have different jobs in the dungeon. Warden Corruption marks a protected domain threat; the Death Stalker requires Banishment progression rather than ordinary firepower alone.",
      detail:"Major enemies should have rewards worth the risk. Their name, sprite, behaviour and reward identity must agree so you can learn them through play instead of memorising exceptions."
    }],
    ["SHOPS, SANCTUARY & SPECIAL OPPORTUNITIES",{
      title:"BUILD YOUR RUN",
      copy:"Shops, Sanctuary, gambling, relics, equipment and rare events strengthen a longer RPG run. The tutorial gives you the foundation; deeper services are explained when you first meet them.",
      detail:"Sanctuary is challenge-free, cannot be sealed by arena or timed-room logic, and can receive rescued Lost Adventurers. Shops and other services should be useful choices rather than menu clutter."
    }],
    ["TUTORIAL COMPLETE",{
      title:"FOUNDATION COMPLETE",
      copy:"You have learned the controls and the dungeon's core language without being given the whole game in advance.",
      detail:"The full campaign introduces weapon evolution, equipment, shops, Sanctuary, death recovery, Wardens and deeper RPG choices in context. Replay Tutorial at any time if you want a refresher."
    }]
  ]);

  const TOUR_COPY=new Map([
    ["READ THE MAP, NOT A SPOILER SHEET",{
      title:"FOLLOW THE CURRENT OBJECTIVE",
      copy:"Use the objective and discovered map together. The map should become more useful as you explore, not reveal rooms, Sanctuary or services you have never found.",
      items:[["◎","OBJECTIVE","What matters on this floor"],["⌖","DISCOVERED MAP","Traversed geometry and known markers"],["+","SANCTUARY","Appears after discovery"],["W","WARDEN CORRUPTION","Protected domain threat"]]
    }],
    ["READ SOLIDITY, LOOT & UPGRADES",{
      title:"UNDERSTAND LOOT & WEAPON EVOLUTION",
      copy:"Optional locks reward exploration. Chests provide loot and gear, while a weapon cache evolves your existing Field Pulse and reports whether it upgraded, evolved or reached its cap.",
      items:[["BK","BRONZE","Optional locks"],["▣","CHEST","Loot and equipment"],["UP","WEAPON CACHE","Improves the evolving firearm"],["▥","SOLID SCENERY","Blocks until smashed"]]
    }],
    ["READ THE THREAT, NOT JUST THE HEALTH BAR",{
      title:"UNDERSTAND THREAT & BANISHMENT",
      copy:"Standard enemies, named champions, Wardens and the Death Stalker are deliberately different problems. Learn their role from their introduction, behaviour and reward.",
      items:[["♟","STANDARD THREAT","Normal combat pressure"],["★","NAMED CHAMPION","Stronger identity and reward"],["W","WARDEN","Protected domain threat"],["S","DEATH STALKER","Requires Banishment progression"]]
    }],
    ["USE SERVICES WHEN YOU FIND THEM",{
      title:"BUILD YOUR RUN THROUGH DISCOVERY",
      copy:"Shops, Sanctuary, gambling, equipment, relics and rare events should appear as useful discoveries. The game explains each service when it matters rather than making you study a manual first.",
      items:[["$","SHOP","Supplies and upgrades"],["+","SANCTUARY","Challenge-free refuge"],["EQ","EQUIPMENT","Wearable gameplay modifiers"],["?","SPECIAL EVENT","Contextual opportunity"]]
    }]
  ]);

  function replaceParagraphs(card,data){
    const paragraphs=[...card.querySelectorAll("p")];
    if(paragraphs[0])paragraphs[0].textContent=data.copy;
    const detail=paragraphs.find(node=>node.classList.contains("tutorial-detail"))||paragraphs[1];
    if(detail)detail.textContent=data.detail;
  }
  function patchStageModal(){
    const card=document.querySelector("#ccg-tutorial-stage-modal .ccg-tutorial-modal-card");if(!card)return false;
    const heading=card.querySelector("h2");if(!heading)return false;
    const data=STEP_COPY.get(String(heading.textContent||"").trim().toUpperCase());if(!data)return false;
    heading.textContent=data.title;replaceParagraphs(card,data);card.dataset.v142CampaignCopy="true";return true;
  }
  function patchRail(){
    const rail=document.getElementById("ccg-tutorial-rail");if(!rail)return false;
    const heading=rail.querySelector("h3");if(!heading)return false;
    const data=STEP_COPY.get(String(heading.textContent||"").trim().toUpperCase());if(!data)return false;
    heading.textContent=data.title;replaceParagraphs(rail,data);rail.dataset.v142CampaignCopy="true";return true;
  }
  function patchTour(){
    const tour=document.getElementById("ccg-tutorial-info-tour");if(!tour||tour.classList.contains("hidden"))return false;
    const heading=tour.querySelector("h3");if(!heading)return false;
    const data=TOUR_COPY.get(String(heading.textContent||"").trim().toUpperCase());if(!data)return false;
    heading.textContent=data.title;
    const p=tour.querySelector(".tour-head p");if(p)p.textContent=data.copy;
    /*
      Do not replace .tour-grid or any of its children here. The stabilized
      Tutorial runtime owns those live nodes and associates them with the HUD,
      mission strip and Dungeon Radar targets highlighted during lesson 5.
      Rebuilding the grid with innerHTML destroys that identity and leaves the
      information tour with fewer live highlights. V10.42 therefore changes
      campaign explanation copy only and leaves the interactive tour DOM intact.
    */
    tour.dataset.v142CampaignCopy="true";return true;
  }
  function patchCompletionBanner(){
    const banner=document.getElementById("ccg-tutorial-complete-banner");if(!banner)return false;
    const title=String(banner.querySelector("b")?.textContent||"").trim().toUpperCase();if(title!=="TUTORIAL COMPLETE")return false;
    if(banner.dataset.v142CampaignCopy==="true")return true;
    const copy=banner.querySelector("span");
    if(copy)copy.textContent="You have finished the free Tutorial. The full campaign continues with evolving weapons, RPG progression, equipment, discovered services, Sanctuary, Wardens, death recovery and deeper dungeon objectives.";
    banner.dataset.v142CampaignCopy="true";return true;
  }
  function patchAll(){patchStageModal();patchRail();patchTour();patchCompletionBanner()}

  patchAll();
  const observer=new MutationObserver(patchAll);observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  addEventListener("pagehide",()=>observer.disconnect(),{once:true});
  window.CCGLostSizzlerV142TutorialCampaign=Object.freeze({stepCopy:STEP_COPY,tourCopy:TOUR_COPY,patchAll});
})();
