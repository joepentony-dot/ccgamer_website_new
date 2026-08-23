/* The Lost Sizzler V10.18 — append rare-event/hint/voice changes to the developer log. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_EXPANSION_CHANGELOG_V118__)return;
  window.__CCG_LOST_SIZZLER_EXPANSION_CHANGELOG_V118__=true;

  const entries=[
    ["LS-0823-15","ADDED","Rare dungeon events","Added Mimic Chests, Cursed Cartridges, Wandering Merchants, Golden Rooms, Lost Adventurers, dungeon tremors, Possessed Arcade Cabinets, Treasure Bats, the Taxman, Mystery Potions, secret Developer Rooms, floor bounties, Treasure Map caches and rare floor mutations."],
    ["LS-0823-16","ADDED","Adaptive objective hint system","If objective progress stalls, the game now escalates from a gentle reminder to a directional clue and finally a temporary radar marker for the next meaningful objective."],
    ["LS-0823-17","ADDED","Weekly Ghost replay","Completed ranked Weekly Vault attempts can now store a compact movement trail. Later signed-in players can see a translucent replay of another real completed run from the same weekly challenge."],
    ["LS-0823-18","ADDED","Contextual voice director","Added optional spoken prompts with priority, cooldown and interruption rules for welcomes, damage, health, objectives, major enemies, rare events, Weekly Vault alerts and other useful game-state calls. Recorded MP3/WAV clips can override individual spoken lines."],
    ["LS-0823-19","CHANGED","Rare-event scoring safeguards","Double Gold, No Shopping and Elite Bounty mutations now affect real gameplay interactions, with safeguards around special payouts so rare events do not accidentally duplicate score rewards."],
    ["LS-0823-20","FIXED","Ctrl dash compatibility","Two-player dash input now accepts Left Ctrl as well as the existing Right Ctrl mapping, while Ctrl input is prevented from being swallowed by browser behaviour during active split-screen play."],
    ["LS-0823-21","FIXED","Inventory mouse-wheel bounce","The Inventory & Objective panel now owns its scrolling instead of competing with the fullscreen overlay. Mouse-wheel and touch scrolling stay at the user's chosen position instead of snapping back down."],
    ["LS-0823-22","FIXED","Reinforced door screen jumping","Repeated attempts to enter a locked reinforced Sigil door are now rate-limited to one stable warning instead of repeatedly reopening the notification lane and making the gameplay view jump up and down."]
  ];

  const html=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function mount(){
    const firstList=document.querySelector("#developer-changelog .developer-log-day .developer-log-list");
    if(!firstList)return false;
    for(const [id,status,title,copy] of entries){
      if(firstList.querySelector(`[data-expansion-log-id="${id}"]`))continue;
      const article=document.createElement("article");
      article.className="developer-log-entry";
      article.dataset.expansionLogId=id;
      article.innerHTML=`<code class="developer-log-id">${html(id)}</code><span class="developer-log-status ${html(status.toLowerCase())}">${html(status)}</span><div class="developer-log-copy"><b>${html(title)}</b><span>${html(copy)}</span></div>`;
      firstList.appendChild(article);
    }
    return true;
  }

  if(!mount()){
    let tries=0;
    const timer=setInterval(()=>{tries++;if(mount()||tries>=40)clearInterval(timer)},125);
  }
})();
