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
  function loadSpyExitControlReset(){if(!window.CCGLostSizzlerV141R30SpyExitControlReset)loadScript("v10-41-r30-spy-exit-control-reset.js","data-ccg-r30-spy-exit-reset")}
  function loadSoloDungeonR31(){if(!window.CCGLostSizzlerV141R31SoloDungeon)loadScript("v10-41-r31-solo-dungeon-regressions.js","data-ccg-r31-solo-dungeon")}
  function loadSpyR32Loader(){if(!window.CCGLostSizzlerV141R32SpyLoader)loadScript("v10-41-r32-spy-loader.js","data-ccg-r32-spy-loader")}
  loadOwnerSeal();loadModeRuntime();loadSpyExitControlReset();loadSoloDungeonR31();loadSpyR32Loader();

  const entries=[
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
    const latest=tracker.querySelector(".developer-changelog-latest");if(latest)latest.textContent="LATEST UPDATE · 26 AUG 2026 · V10.41 · r30";
    const stamp=tracker.querySelector(".developer-changelog-intro time");if(stamp){stamp.dateTime="2026-08-26";stamp.textContent="Last updated 26 August 2026 · V10.41 · build 2026.08.26.30"}
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