/* The Lost Sizzler V10.42 — campaign-aware Tutorial presentation without rewriting the stabilized training runtime. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_TUTORIAL_CAMPAIGN__)return;
  window.__CCG_LOST_SIZZLER_V142_TUTORIAL_CAMPAIGN__=true;

  const configuredFloors=Array.isArray(window.CCG_CONFIG?.proceduralDungeon?.campaignFloors)
    ?window.CCG_CONFIG.proceduralDungeon.campaignFloors:[];
  const campaignDepth=Math.max(1,Number(window.CCG_CONFIG?.maxFloors||configuredFloors.length||5));
  const finalFloorLabel=`F${campaignDepth}`;

  const STEP_COPY=new Map([
    ["OBJECTIVES, RADAR & HINTS",{
      title:`THE ${campaignDepth}-FLOOR CAMPAIGN`,
      copy:`The adventure spans ${campaignDepth} procedural floors. Objectives change as you descend, so read the mission, use the map and build for the next floor instead of treating each level as a fresh run.`,
      detail:"RPG attributes, wearable equipment, relics, major Keys, Banishment Essence and rescued C64 games persist through the campaign. Floor themes and threat pressure become more dangerous as you go."
    }],
    ["HEALTH, ARMOUR & QUICK ITEMS",{
      title:"SURVIVAL, DEATH & RPG GROWTH",
      copy:"Health and armour keep you alive, while Might, Vitality, Agility, Endurance, Luck and Arcana change how the character performs. Your equipment and current weapon tier are part of that build.",
      detail:"A normal death pauses on YOU DIED until you confirm it, then leaves recoverable XP/items behind. If lost XP drops a level, the matching stat benefit is lost too; recover that death cache before dying again to reclaim what the cache still owns."
    }],
    ["KEYS, DOORS & CHESTS",{
      title:"LOCKS, LOOT & THE EVOLVING FIREARM",
      copy:"Bronze keys and objective locks gate optional routes and rewards. Chests, weapon caches and equipment pickups should tell you exactly what they contain instead of pretending every reward is a separate gun.",
      detail:"Your firearm evolves as one weapon. WEAPON UPGRADED means its real tier/stats improve; once a floor cap is reached, later weapon-cache rewards fall back to useful ammunition, XP or score instead of creating obsolete standalone weapons."
    }],
    ["ENEMIES, NAMED ENEMIES & THE STALKER",{
      title:"THREATS, WARDENS & BANISHMENT",
      copy:`Ordinary enemies, named champions, Wardens and supernatural threats become more demanding as you descend toward Floor ${campaignDepth}. Their name, sprite and special rules should always agree.`,
      detail:"Warden Corruption is called out on the map legend when discovered. Death Stalker/Count-style threats use their own warnings and Banishment rules; ordinary weapon fire is not the permanent solution."
    }],
    ["RARE EVENTS, SHOPS, HAZARDS & SCORE",{
      title:"SHOPS, SANCTUARY & DISCOVERY",
      copy:"Explore for shops, Sanctuary rooms, rare events, secrets and equipment rather than sprinting straight to the exit. The minimap reveals useful information only as the dungeon is actually discovered.",
      detail:"Sanctuary appears as a green cross only after discovery. Shops are where supplies, capacity and other services belong; contextual first-encounter prompts explain new services when you meet them instead of front-loading a manual."
    }],
    ["TUTORIAL COMPLETE",{
      title:"TRAINING COMPLETE",
      copy:"You have the controls and the dungeon language. The main run will introduce deeper systems when they become relevant rather than asking you to memorise everything before Floor 1.",
      detail:`The campaign currently reads ${campaignDepth} floors from the live game configuration. The Tutorial remains available from the main menu whenever you want another practice run.`
    }]
  ]);

  const TOUR_COPY=new Map([
    ["FOLLOW THE FLOOR OBJECTIVE",{
      title:"READ THE OBJECTIVE, MAP & FLOOR",
      copy:`The mission tells you what matters now, while the explored map shows where you have actually been. The campaign runs to Floor ${campaignDepth}; deeper floors change colour, pressure and encounter mix instead of resetting your character.`,
      items:[["F1","FOUNDATION","Learn the dungeon language and establish your build"],["MAP","EXPLORED ROUTES","Only discovered rooms and services belong on your tactical map"],[finalFloorLabel,"FINAL DESCENT","The last floor is a substantial finale, not a plain stats screen"]]
    }],
    ["UNDERSTAND LOCKS AND REWARDS",{
      title:"UNDERSTAND LOOT & WEAPON PROGRESSION",
      copy:"Keys open the right locks; chests and caches reward exploration. The firearm is one evolving weapon, while wearable equipment and carried items build around it.",
      items:[["KEY","LOCKS","Objective and Bronze keys have different jobs"],["UP","WEAPON UPGRADE","Raises the existing firearm tier/stats"],["GEAR","EQUIPMENT","Wearable items alter the build"],["CACHE","FALLBACK REWARD","Ammo, XP or score when the weapon cannot evolve here"]]
    }],
    ["KNOW THE DUNGEON THREATS",{
      title:"READ THREAT IDENTITY",
      copy:"Standard enemies, named champions, Wardens and supernatural threats use distinct names, sprites and rules. Warden Corruption is a map state; Banishment is reserved for threats that explicitly require it.",
      items:[["♟","STANDARD THREAT","Ordinary enemy rules"],["★","NAMED CHAMPION","Stronger identity and reward"],["W","WARDEN","Corruption/domain encounter"],["B","BANISHMENT","Special solution for supernatural threats"]]
    }],
    ["SPOT SPECIAL OPPORTUNITIES",{
      title:"USE SERVICES & SAFE ROOMS",
      copy:"Shops, Sanctuary, rare events and secrets are discovered in the dungeon rather than granted from the start. First-encounter guidance explains a new service when it becomes useful.",
      items:[["$","SHOP","Supplies, upgrades and discovered services"],["+","SANCTUARY","Green cross only after discovery"],["?","SECRET","Exploration can reveal hidden routes and rooms"],["▲","HAZARD","Environmental threats remain dangerous on every floor"]]
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
    if(copy)copy.textContent="You have finished the Tutorial. The ${campaignDepth}-floor campaign continues with persistent RPG growth, equipment, the evolving firearm, discovered services and deeper dungeon objectives.";
    banner.dataset.v142CampaignCopy="true";return true;
  }
  function patchAll(){patchStageModal();patchRail();patchTour();patchCompletionBanner()}

  patchAll();
  const observer=new MutationObserver(patchAll);observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  addEventListener("pagehide",()=>observer.disconnect(),{once:true});
  window.CCGLostSizzlerV142TutorialCampaign=Object.freeze({stepCopy:STEP_COPY,tourCopy:TOUR_COPY,patchAll});
})();
