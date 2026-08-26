/* The Lost Sizzler V10.41 r30 — developer changelog additions. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R30_BUGLOG__)return;
  window.__CCG_LOST_SIZZLER_V141_R30_BUGLOG__=true;
  const entries=[
    ["LS-0826-09","FIXED","Global movement freeze after Spy mode","A Spy runtime ownership race could leave ordinary movement routed through the isolated Spy owner after the mode ended. Because the Spy owner had already released its saved base function, later Solo or Horde movement could return false forever. r30 restores the pre-Spy update, movement and damage owners unconditionally when Spy exits."],
    ["LS-0826-10","FIXED","Cross-mode runtime wrapper contention","The r29 background installer no longer competes with the isolated Spy engine while Spy is active. Its maintenance timer is replaced by a cooperative r30 owner that preserves the stable animation loop without repeatedly wrapping Spy movement, damage or packet ownership."],
    ["LS-0826-11","ADDED","Gameplay key-capture resilience","Movement keys are mirrored at capture phase while gameplay is active and are reasserted if another layer accidentally drops the shared held-key set. Hidden menu or lobby inputs can no longer leave a live run unable to receive movement controls."],
    ["LS-0826-12","FIXED","Spy host/joiner ownership jitter","The dedicated Spy network and rules engines now keep exclusive ownership during the mode instead of alternating with Horde/Dungeon compatibility wrappers on background timers. This removes a major source of host/joiner position jitter and protects the normal engines when Spy ends."],
    ["LS-0826-13","ADDED","Golden runtime ownership snapshot","After the release gate completes, r30 locks a known-good normal update, movement and damage ownership set. Later mode wrappers cannot silently replace this recovery baseline, giving the game a stable route back to ordinary Solo, Horde and multiplayer controls."],
    ["LS-0826-14","ADDED","Held-key movement watchdog","If a movement key remains held on a genuinely free tile but the player does not move for 700 ms, r30 restores the known-good movement owner and retries the step. This catches silent false-return wrappers even when they carry no recognisable Spy marker."],
    ["LS-0826-15","ADDED","Runtime ownership invariant","Outside Spy Vs Spy, update, movement and damage ownership are checked continuously. Missing functions or isolated Spy owners are repaired automatically, and every Spy exit triggers an additional post-mode ownership check before normal play continues."],
    ["LS-0826-16","ADDED","Movement fault-injection regression tests","Chromium release tests now deliberately clear held input, install a silent dead movement wrapper, inject an isolated Spy owner, cycle Spy ownership repeatedly and then require a fresh Solo run to move. These tests are designed to prevent the recurring control-freeze class from passing CI again."]
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
