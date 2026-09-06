/* The Lost Sizzler V10.41 r30 — developer changelog additions. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R30_BUGLOG__)return;
  window.__CCG_LOST_SIZZLER_V141_R30_BUGLOG__=true;

  function revision(){return String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"latest").trim()}
  function loadScript(path,marker){
    if(document.querySelector(`script[${marker}="true"]`))return;
    const script=document.createElement("script");script.src=`js/${path}?v=${encodeURIComponent(revision())}`;script.setAttribute(marker,"true");document.head.appendChild(script);
  }
  function loadOwnerSeal(){if(!window.CCGLostSizzlerV141R30OwnerSeal)loadScript("v10-41-r30-owner-seal.js","data-ccg-r30-owner-seal")}
  function loadModeRuntime(){if(!window.CCGLostSizzlerModeRuntime)loadScript("v10-41-mode-runtime.js","data-ccg-mode-runtime")}
  function loadSoloDiagnostics(){if(!window.CCGLostSizzlerSoloDiagnostics)loadScript("v10-41-solo-stability-diagnostics.js","data-ccg-solo-stability-diagnostics")}
  function loadSpyExitControlReset(){if(!window.CCGLostSizzlerV141R30SpyExitControlReset)loadScript("v10-41-r30-spy-exit-control-reset.js","data-ccg-r30-spy-exit-reset")}
  function loadSoloDungeonR31(){if(!window.CCGLostSizzlerV141R31SoloDungeon)loadScript("v10-41-r31-solo-dungeon-regressions.js","data-ccg-r31-solo-dungeon")}
  function loadSpyR32WorldOwner(){if(!window.CCGLostSizzlerV141R32SpyWorldOwner)loadScript("v10-41-r32-spy-world-owner.js","data-ccg-r32-spy-world-owner")}
  function loadSpyR32Loader(){if(!window.CCGLostSizzlerV141R32SpyLoader)loadScript("v10-41-r32-spy-loader.js","data-ccg-r32-spy-loader")}
  function loadHordeOwnerComposition(){if(!window.CCGLostSizzlerV141R60HordeOwnerComposition)loadScript("v10-41-r60-horde-owner-composition.js","data-ccg-r60-horde-owner-composition")}
  function loadStage8NpcDialogue(){if(!window.CCGLostSizzlerStage8NpcDialogue)loadScript("v10-41-stage8-npc-dialogue.js","data-ccg-stage8-npc-dialogue")}
  function loadV142ProceduralOverhaul(){if(!window.CCGLostSizzlerV142ProceduralOverhaul)loadScript("v10-42-procedural-overhaul.js","data-ccg-v142-procedural-overhaul")}
  function loadV142FiveDepthCampaign(){if(!window.CCGLostSizzlerV142FiveDepthCampaign)loadScript("v10-42-five-depth-campaign.js","data-ccg-v142-five-depth-campaign")}
  function loadV142FloorBalance(){if(!window.CCGLostSizzlerV142FloorBalance)loadScript("v10-42-floor-balance.js","data-ccg-v142-floor-balance")}
  function loadV142TutorialCampaign(){if(!window.CCGLostSizzlerV142TutorialCampaign)loadScript("v10-42-tutorial-campaign.js","data-ccg-v142-tutorial-campaign")}
  function loadV142DemoPaywall(){if(!window.CCGLostSizzlerV142DemoPaywall)loadScript("v10-42-demo-paywall.js","data-ccg-v142-demo-paywall")}
  function loadV142MultiplayerState(){if(!window.CCGLostSizzlerV142MultiplayerState)loadScript("v10-42-multiplayer-state.js","data-ccg-v142-multiplayer-state")}
  function loadV142MultiplayerCollectAuthority(){if(!window.CCGLostSizzlerV142MultiplayerCollectAuthority)loadScript("v10-42-multiplayer-collect-authority.js","data-ccg-v142-multiplayer-collect-authority")}
  function loadStage8AfterInitialRuntime(){
    const loadV142=()=>{loadV142ProceduralOverhaul();loadV142FiveDepthCampaign();loadV142FloorBalance();loadV142TutorialCampaign();loadV142DemoPaywall();loadV142MultiplayerState();loadV142MultiplayerCollectAuthority()};
    if(document.readyState==="complete"){queueMicrotask(loadStage8NpcDialogue);setTimeout(loadV142,0);return}
    addEventListener("load",()=>{loadStage8NpcDialogue();setTimeout(loadV142,0)},{once:true})
  }
  loadOwnerSeal();loadModeRuntime();loadSoloDiagnostics();loadSpyExitControlReset();loadSoloDungeonR31();loadSpyR32WorldOwner();loadSpyR32Loader();loadHordeOwnerComposition();loadStage8AfterInitialRuntime();

  const entries=[
    ["LS-0906-09","ADDED","V10.42 multiplayer campaign authority","Dungeon Multiplayer now carries V10.42 RPG attributes, relics, Banishment Essence, Sigil powers and global Key progress through the stabilized host-authoritative network path. Remote Key recovery is bridged into the host campaign state without opening the remote player's relic chooser on the host, while each local or online character receives the campaign reward on the correct machine."],
    ["LS-0906-08","ADDED","Campaign-aware Tutorial language","The stabilized Tutorial runtime is preserved, but its V10.42 presentation now teaches the five-depth campaign, persistent RPG attributes, global Iron/Bone/Ash Keys, the Vessel and Banishment Essence system, relic choices and the campaign-wide A–Z C64 rescue deck instead of explaining retired artefact-for-Flask progression."],
    ["LS-0906-07","ADDED","Tutorial-completion permanent unlock screen","Completing the free Tutorial can now present the V10.42 permanent-unlock screen. The screen explains the one-off £1.99 launch target, account-tied ownership, cross-device restore, continued-development support and free future game updates. The browser cannot self-authorize payment; final unlock requires a verified CCG commerce entitlement and PayPal server bridge."],
    ["LS-0906-06","ADDED","Progressive combat damage curve","Enemy damage now scales alongside durability and pursuit tempo: the opening floor is deliberately gentler, mid-campaign reaches the stabilized baseline, and Floors 4–5 apply progressively stronger damage. Named threats receive a modest extra late-game multiplier so four floors of RPG growth do not make the final depth trivial."],
    ["LS-0906-05","ADDED","Five-depth campaign and floor balance","V10.42 now targets a roughly 55–75 minute successful run across The Threshold, Iron Keep, Moss Crypt, Ember Depths and the Sigil Sanctum. Enemy durability, pursuit tempo, Stalker pressure and ammunition availability ramp by floor while RPG stats, relics, Banishment Essence and global Key progress persist downward."],
    ["LS-0906-01","ADDED","Procedural RPG campaign overhaul","The stabilized five-floor structure is being rebuilt as five substantially richer generated depths. The Keys of Iron, Bone and Ash are global campaign objectives, followed by the completed Sigil and a final escape phase."],
    ["LS-0906-02","ADDED","RPG character attributes","Levelling now develops Might, Vitality, Agility, Endurance, Luck and Arcana. Attributes change combat power, health, movement, ammunition, loot quality, Sigil behaviour and Banishment alchemy rather than relying only on generic upgrade cards."],
    ["LS-0906-03","ADDED","A–Z randomized C64 collectible deck","Every campaign builds one shuffled collectible deck with one randomly selected C64 title for each available letter A through Z, then distributes that 26-game deck across all five depths."],
    ["LS-0906-04","ADDED","Banishment Essence and relic builds","Rare artefact trading is replaced by a Vessel and Banishment Essence economy. Major threats and cleansed dungeon events provide Essence, Alchemists distil charges, and each Key domain offers a relic choice that changes the character build."],
    ["LS-0826-09","FIXED","Global movement freeze after Spy mode","A Spy runtime ownership race could leave ordinary movement routed through the isolated Spy owner after the mode ended. Because the Spy owner had already released its saved base function, later Solo or Horde movement could return false forever. r30 restores the pre-Spy update, movement and damage owners unconditionally when Spy exits."],
    ["LS-0826-10","FIXED","Cross-mode runtime wrapper contention","The r29 background installer no longer competes with the isolated Spy engine while Spy is active. Its maintenance timer is replaced by a cooperative r30 owner that preserves the stable animation loop without repeatedly wrapping Spy movement, damage or packet ownership."],
    ["LS-0826-11","ADDED","Gameplay key-capture resilience","Movement keys are mirrored at capture phase while gameplay is active and are reasserted if another layer accidentally drops the shared held-key set. Hidden menu or lobby inputs can no longer leave a live run unable to receive movement controls."],
    ["LS-0826-12","FIXED","Spy host/joiner ownership jitter","The dedicated Spy network and rules engines now keep exclusive ownership during the mode instead of alternating with Horde/Dungeon compatibility wrappers on background timers. This removes a major source of host/joiner position jitter and protects the normal engines when Spy ends."],
    ["LS-0826-13","ADDED","Golden runtime ownership snapshot","After the release gate completes, r30 locks a known-good normal update, movement and damage ownership set. Later mode wrappers cannot silently replace this recovery baseline, giving the game a stable route back to ordinary Solo, Horde and multiplayer controls."],
    ["LS-0826-14","ADDED","Held-key movement watchdog","If a movement key remains held on a genuinely free tile but the player does not move for 700 ms, r30 restores the known-good movement owner and retries the step. The watchdog also discards a poisoned movement cooldown after the stall threshold, catching wrappers that repeatedly re-arm the cooldown without changing player coordinates."],
    ["LS-0826-15","ADDED","Runtime ownership invariant","Outside Spy Vs Spy, update, movement and damage ownership are checked continuously. Missing functions or isolated Spy owners are repaired automatically, and every Spy exit triggers an additional post-mode ownership check before normal play continues."],
    ["LS-0826-16","ADDED","Movement fault-injection regression tests","Chromium release tests now deliberately clear held input, install a silent dead movement wrapper, inject an isolated Spy owner, cycle Spy ownership repeatedly and then require a fresh Solo run to move. These tests are designed to prevent the recurring control-freeze class from passing CI again."],
    ["LS-0826-17","FIXED","Notification ownership race under stability monitoring","r30 now keeps the final notification rail and priority toast owner inside the same runtime invariant loop as movement. Legacy timed wrappers can no longer briefly displace notification ownership and create intermittent hidden-toast or release-test failures."],
    ["LS-0826-18","FIXED","Post-Spy transient control lock","Spy teardown now normalises movement cooldown, hit-stun and retained control-lock state at the same boundary that restores normal movement ownership. Repeated Spy exits can no longer leave a later Solo run with a valid movement function but blocked player controls."],
    ["LS-0826-19","FIXED","Intermittent late movement-owner replacement","Once r30 has locked the known-good normal movement owner, a dedicated non-Spy ownership seal now restores that exact owner if any late wrapper replaces it. Spy retains exclusive movement ownership while active, and the seal resumes only after Spy isolation has ended."]
  ];
  const statusClass=status=>String(status).toLowerCase().replace(/[^a-z]+/g,"-");
  const entryHtml=([id,status,title,copy])=>`<article class="developer-log-entry" data-r30-entry="${id}"><code class="developer-log-id">${id}</code><span class="developer-log-status ${statusClass(status)}">${status}</span><div class="developer-log-copy"><b>${title}</b><span>${copy}</span></div></article>`;
  function mount(){
    const tracker=document.getElementById("developer-changelog");if(!tracker)return false;
    const latest=tracker.querySelector(".developer-changelog-latest");if(latest)latest.textContent="LATEST UPDATE · 6 SEP 2026 · V10.42 OVERHAUL BRANCH";
    const stamp=tracker.querySelector(".developer-changelog-intro time");if(stamp){stamp.dateTime="2026-09-06";stamp.textContent="Last updated 6 September 2026 · V10.42 overhaul branch"}
    const firstList=tracker.querySelector(".developer-log-day .developer-log-list");if(!firstList)return false;
    for(const entry of [...entries].reverse()){
      if(tracker.querySelector(`[data-r30-entry="${entry[0]}"]`))continue;
      firstList.insertAdjacentHTML("afterbegin",entryHtml(entry));
    }
    return true;
  }
  let timer=setInterval(()=>{if(mount()){clearInterval(timer);timer=0}},80);mount();
  addEventListener("pagehide",()=>{if(timer)clearInterval(timer)},{once:true});
  window.CCGLostSizzlerV141R30BugLog={entries,mount};
})();