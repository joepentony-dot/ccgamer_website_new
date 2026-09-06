/* The Lost Sizzler V10.42 — campaign-aware Tutorial presentation without rewriting the stabilized training runtime. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_TUTORIAL_CAMPAIGN__)return;
  window.__CCG_LOST_SIZZLER_V142_TUTORIAL_CAMPAIGN__=true;

  const STEP_COPY=new Map([
    ["OBJECTIVES, RADAR & HINTS",{
      title:"THE FIVE-DEPTH CAMPAIGN",
      copy:"The full adventure spans five procedural depths. The Threshold teaches exploration, Iron Keep, Moss Crypt and Ember Depths each guard one permanent Key, and the Sigil Sanctum is the final descent.",
      detail:"Iron, Bone and Ash are global run Keys. Once recovered they remain with you between floors, alongside RPG attributes, relics, Banishment Essence and rescued C64 games."
    }],
    ["HEALTH, ARMOUR & QUICK ITEMS",{
      title:"SURVIVAL & RPG GROWTH",
      copy:"Health and armour still keep you alive, but the full campaign also develops Might, Vitality, Agility, Endurance, Luck and Arcana as you descend.",
      detail:"Those attributes affect combat, durability, movement, ammunition, loot and Banishment alchemy. The later floors are balanced around the character you have built, not a fresh hero every depth."
    }],
    ["KEYS, DOORS & CHESTS",{
      title:"IRON, BONE & ASH",
      copy:"The full campaign has three major Keys rather than three fresh objective keys on every floor. Iron, Bone and Ash are guarded by domain champions and remain bound to the run once recovered.",
      detail:"Optional locks and chests still reward exploration. The three major Keys awaken the Sigil on the fifth depth and are never discarded during normal floor descent."
    }],
    ["ENEMIES, NAMED ENEMIES & THE STALKER",{
      title:"THREATS & BANISHMENT",
      copy:"Ordinary enemies, named threats and the Death Stalker become more dangerous as the campaign descends. Floor 1 gives you more reaction time; Floor 5 expects a developed character and better decisions.",
      detail:"The old artefact-for-Flask loop is replaced in V10.42. Banishment Essence is collected into a persistent Vessel, and Alchemists distil that Essence into the power needed to permanently banish major supernatural threats."
    }],
    ["RARE EVENTS, SHOPS, HAZARDS & SCORE",{
      title:"RELICS, RESCUES & RARE EVENTS",
      copy:"Each campaign also builds one shuffled A–Z rescue deck, selecting one C64 title for every available letter and distributing those rescues across all five depths.",
      detail:"Key-domain clears can offer relic choices, while shops, hazards and rare events remain part of the dungeon. Score still matters, but artefact trading is no longer the route to Banishment power."
    }],
    ["TUTORIAL COMPLETE",{
      title:"FREE INTRODUCTION COMPLETE",
      copy:"You Are Ready To Take On The Adventure! You have completed the free introduction and learned the controls and core dungeon language.",
      detail:"The full game continues across five procedural depths with persistent RPG growth, Iron, Bone and Ash, the awakened Sigil, A–Z C64 rescues and the final escape."
    }]
  ]);

  const TOUR_COPY=new Map([
    ["FOLLOW THE FLOOR OBJECTIVE",{
      title:"FOLLOW THE CAMPAIGN OBJECTIVE",
      copy:"Objectives change by depth: explore and survive the Threshold, defeat the three Key guardians across the middle campaign, then awaken the Sigil and escape the Sanctum.",
      items:[["F1","THRESHOLD","Explore, learn and clear the opening guardian"],["F2–4","KEY DOMAINS","Recover Iron, Bone and Ash from their champions"],["F5","SIGIL SANCTUM","Bring all three Keys, awaken the Sigil and escape"]]
    }],
    ["UNDERSTAND LOCKS AND REWARDS",{
      title:"UNDERSTAND GLOBAL KEYS",
      copy:"Optional locks reward exploration, but the major campaign progression is global. Iron, Bone and Ash persist between depths and are required together at the Sigil Sanctum.",
      items:[["IRON","KEY OF IRON","Recovered in Iron Keep"],["BONE","KEY OF BONE","Recovered in Moss Crypt"],["ASH","KEY OF ASH","Recovered in Ember Depths"],["SIG","AWAKENED SIGIL","Final-depth objective after all three Keys"]]
    }],
    ["KNOW THE DUNGEON THREATS",{
      title:"UNDERSTAND THREAT & BANISHMENT",
      copy:"Enemy health, damage and decision tempo rise by floor. The Death Stalker cannot be solved by normal weapons; V10.42 uses a persistent Banishment Vessel and Essence economy instead of artefact-traded Flasks.",
      items:[["♟","STANDARD THREATS","Progressively stronger by depth"],["★","NAMED THREATS","Tougher enemies with controlled elite scaling"],["S","DEATH STALKER","Supernatural threat requiring Banishment"],["V","VESSEL + ESSENCE","Persistent Banishment resource distilled by Alchemists"]]
    }],
    ["SPOT SPECIAL OPPORTUNITIES",{
      title:"BUILD YOUR RUN",
      copy:"The dungeon now feeds a longer RPG run. Rescue C64 games from the campaign-wide A–Z deck, choose relics after major clears and use discovered services to strengthen the character you carry into later depths.",
      items:[["A–Z","C64 RESCUES","One selected title per available letter across the campaign"],["R","RELICS","Build-defining rewards after Key-domain clears"],["$","SHOPS","Supplies and discovered services"],["▲","HAZARDS","Environmental threats that remain dangerous on every floor"]]
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
  function tourItemHtml([symbol,title,copy]){return `<article class="tour-item"><span class="tour-symbol">${symbol}</span><span><b>${title}</b><span>${copy}</span></span></article>`}
  function patchTour(){
    const tour=document.getElementById("ccg-tutorial-info-tour");if(!tour||tour.classList.contains("hidden"))return false;
    const heading=tour.querySelector("h3");if(!heading)return false;
    const data=TOUR_COPY.get(String(heading.textContent||"").trim().toUpperCase());if(!data)return false;
    heading.textContent=data.title;const p=tour.querySelector(".tour-head p");if(p)p.textContent=data.copy;
    const grid=tour.querySelector(".tour-grid");if(grid)grid.innerHTML=data.items.map(tourItemHtml).join("");tour.dataset.v142CampaignCopy="true";return true;
  }
  function patchCompletionBanner(){
    const banner=document.getElementById("ccg-tutorial-complete-banner");if(!banner)return false;
    const title=String(banner.querySelector("b")?.textContent||"").trim().toUpperCase();if(title!=="TUTORIAL COMPLETE")return false;
    if(banner.dataset.v142CampaignCopy==="true")return true;
    const copy=banner.querySelector("span");
    if(copy)copy.textContent="You have finished the free Tutorial. The full five-depth campaign continues with RPG progression, global Keys, relics, Banishment Essence, A–Z C64 rescues and the final Sigil escape.";
    banner.dataset.v142CampaignCopy="true";return true;
  }
  function patchAll(){patchStageModal();patchRail();patchTour();patchCompletionBanner()}

  patchAll();
  const observer=new MutationObserver(patchAll);observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  addEventListener("pagehide",()=>observer.disconnect(),{once:true});
  window.CCGLostSizzlerV142TutorialCampaign=Object.freeze({stepCopy:STEP_COPY,tourCopy:TOUR_COPY,patchAll});
})();
