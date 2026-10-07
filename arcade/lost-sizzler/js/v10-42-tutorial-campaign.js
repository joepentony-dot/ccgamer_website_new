/* C64 Dungeon Carnage V10.42 — concise campaign-aware Tutorial presentation. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_TUTORIAL_CAMPAIGN__)return;
  window.__CCG_LOST_SIZZLER_V142_TUTORIAL_CAMPAIGN__=true;

  const STEP_COPY=new Map([
    ["OBJECTIVES, MAP & DISCOVERY",{
      title:"FOLLOW THE FLOOR OBJECTIVE",
      copy:"Check the HUD for the current goal, then use the map and radar to keep your bearings as rooms are discovered.",
      detail:"Important places such as Sanctuary, shops and special threats become easier to track once you find them."
    }],
    ["SURVIVAL, DEATH & RECOVERY",{
      title:"STAY ALIVE & BUILD YOUR CHARACTER",
      copy:"Health, armour and equipment keep you alive. Levelling lets you shape Might, Vitality, Agility, Endurance, Luck and Arcana.",
      detail:"If you die, look for your death cache. It can contain lost items, armour protection and equipped gear."
    }],
    ["DOORS, CHESTS, CACHES & SOLID SCENERY",{
      title:"LOOT, LOCKS & WEAPONS",
      copy:"Bronze keys open optional locks. Chests hold loot and equipment, while weapon caches improve or alter your current firearm.",
      detail:"Solid furniture blocks movement until smashed. Rare named weapons stay meaningful even when your current firearm is already at the floor limit."
    }],
    ["NAMED THREATS, WARDENS & THE STALKER",{
      title:"KNOW THE BIG THREATS",
      copy:"Named champions, Wardens and the Death Stalker need different tactics. Watch their introductions and learn how each threat behaves.",
      detail:"The Death Stalker cannot be killed with normal attacks. A lit torch drives it away; Banishment can destroy it permanently."
    }],
    ["SHOPS, SANCTUARY & SPECIAL OPPORTUNITIES",{
      title:"USE WHAT THE DUNGEON OFFERS",
      copy:"Shops, Sanctuary, equipment and rare events can strengthen a run. Explore first, then decide where your Gold and supplies matter most.",
      detail:"Sanctuary gives you a safe place to recover. Other services explain themselves when you discover them."
    }],
    ["TUTORIAL COMPLETE",{
      title:"READY FOR THE DUNGEON",
      copy:"You have learned the essentials. The full fifteen-floor campaign will introduce tougher enemies, new challenges and deeper progression as you descend.",
      detail:"Replay the Tutorial whenever you want a refresher."
    }]
  ]);

  const TOUR_COPY=new Map([
    ["READ THE MAP, NOT A SPOILER SHEET",{
      title:"FOLLOW THE CURRENT OBJECTIVE",
      copy:"Use the HUD, map and radar together. Explore to reveal routes and useful markers.",
      items:[["◎","OBJECTIVE","Current floor goal"],["⌖","MAP","Rooms you have discovered"],["+","SANCTUARY","Safe recovery"],["W","WARDEN","Major floor threat"]]
    }],
    ["READ SOLIDITY, LOOT & UPGRADES",{
      title:"UNDERSTAND LOOT & WEAPONS",
      copy:"Open chests, search optional rooms and improve your equipment. Weapon caches strengthen or change your current firearm.",
      items:[["BK","BRONZE KEY","Optional locks"],["▣","CHEST","Loot and equipment"],["UP","WEAPON CACHE","Improves your firearm"],["▥","SOLID SCENERY","Smash to clear"]]
    }],
    ["READ THE THREAT, NOT JUST THE HEALTH BAR",{
      title:"LEARN EACH THREAT",
      copy:"Ordinary enemies, named champions, Wardens and the Death Stalker behave differently. Watch how they move and attack.",
      items:[["♟","ENEMY","Standard threat"],["★","CHAMPION","Stronger enemy"],["W","WARDEN","Major threat"],["S","DEATH STALKER","Torch or Banishment"]]
    }],
    ["USE SERVICES WHEN YOU FIND THEM",{
      title:"BUILD YOUR RUN",
      copy:"Shops, Sanctuary, equipment and rare events can give you an edge. Use them when they suit your run.",
      items:[["$","SHOP","Supplies and upgrades"],["+","SANCTUARY","Safe recovery"],["EQ","EQUIPMENT","Wearable bonuses"],["?","EVENT","Something unusual"]]
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
    tour.dataset.v142CampaignCopy="true";return true;
  }
  function patchCompletionBanner(){
    const banner=document.getElementById("ccg-tutorial-complete-banner");if(!banner)return false;
    const title=String(banner.querySelector("b")?.textContent||"").trim().toUpperCase();if(title!=="TUTORIAL COMPLETE")return false;
    if(banner.dataset.v142CampaignCopy==="true")return true;
    const copy=banner.querySelector("span");
    if(copy)copy.textContent="Tutorial complete. The full campaign adds tougher enemies, evolving weapons, equipment, shops, Sanctuary, Wardens, death recovery and deeper floor challenges.";
    banner.dataset.v142CampaignCopy="true";return true;
  }
  function patchAll(){patchStageModal();patchRail();patchTour();patchCompletionBanner()}

  patchAll();
  const observer=new MutationObserver(patchAll);observer.observe(document.documentElement,{childList:true,subtree:true});
  addEventListener("pagehide",()=>observer.disconnect(),{once:true});
  window.CCGLostSizzlerV142TutorialCampaign=Object.freeze({stepCopy:STEP_COPY,tourCopy:TOUR_COPY,patchAll});
})();
