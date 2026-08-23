/* The Lost Sizzler V10.18 — append rare-event/hint/voice/onboarding changes to the developer log. */
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
    ["LS-0823-22","FIXED","Reinforced door screen jumping","Repeated attempts to enter a locked reinforced Sigil door are now rate-limited to one stable warning instead of repeatedly reopening the notification lane and making the gameplay view jump up and down."],
    ["LS-0823-23","ADDED","Voice Override admin","Added a dedicated admin page for uploading, previewing, enabling, disabling and deleting recorded voice clips for individual Lost Sizzler cues. Multiple enabled takes rotate without immediate repeats, and the browser voice remains the fallback if a custom clip is missing or fails."],
    ["LS-0823-24","CHANGED","Dungeon structural variety","Dungeon traversal now breaks up the repeated room-corridor rhythm with broad galleries, junction pockets, side alcoves, parallel loops, occasional shortcuts, broad room thresholds and large interstitial halls. Locked and optional rooms retain protected buffers so new routes cannot bypass progression gates, and selected dead-end alcoves contain small exploration rewards."],
    ["LS-0823-25","CHANGED","Gentler dungeon opening","Floor one no longer creates Dustweb spider nests or skeleton hordes. Early-depth traps and heavy special enemies are suppressed, ordinary enemy counts are capped near the entrance and shallow monster generators receive a longer opening cooldown."],
    ["LS-0823-26","FIXED","Reliable welcome message","Starting a normal or Weekly run now produces a visible welcome in the report rail and retries the contextual welcome voice after the game's audio system is unlocked, preventing fast starts from missing the introduction."],
    ["LS-0823-27","ADDED","Skippable Tutorial Zone","First-time solo and split-screen players are offered a safe Training Archive before the real floor. It teaches movement, firing, dash, inventory, objectives, radar, survival items, keys, doors, secrets, named enemies, the Death Stalker, shops and rare events. Returning players can skip it or replay it from the main menu, and the real floor is rebuilt fresh afterwards so training never consumes run resources or scoring time."],
    ["LS-0823-28","FIXED","Player/enemy dossier identity separation","Using the same name as a named enemy no longer causes that enemy to appear in the dossier. Matching player-name entries remain hidden until the actual named enemy is physically encountered in the dungeon, including the Cheeky Commodore Gamer/CCG enemy case."],
    ["LS-0823-29","FIXED","Door geometry anchoring","Door groups now receive structural wall-frame support where procedural carving left a door standing beside open floor. Any repair that would disconnect the playable route is automatically rolled back."],
    ["LS-0823-30","ADDED","Rare vortex pits","Added an exceptionally rare vortex-pit event: only four percent of complete run seeds can contain one, at most one pit appears in that run, and it can only be assigned to Floors 3–5. Pits stay away from the opening route, doors and objective-critical rooms, warn nearby players and are demonstrated harmlessly in the Tutorial Zone."],
    ["LS-0823-31","CHANGED","Environmental knockback combat","Enemies now path around normal traps and vortex pits under their own movement AI, but forced movement from player gunfire can knock them onto active traps or into a vortex. Environmental defeats use normal kill handling; Death Stalkers remain protected by their special Banishment-Flask rule."],
    ["LS-0823-32","CHANGED","Environmental sound and graphics","Vortex pits now use an animated black-purple-cyan gravitational swirl with warning and impact effects. Hazard knock-ins gain stronger particles, rings and layered sound, while major reinforced, bronze and mechanical doors gain restrained dust, shake and stone-weight feedback when opening."]
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