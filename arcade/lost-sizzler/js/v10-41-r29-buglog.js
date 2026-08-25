/* The Lost Sizzler V10.41 r29 — developer changelog additions. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R29_BUGLOG__)return;
  window.__CCG_LOST_SIZZLER_V141_R29_BUGLOG__=true;

  const entries=[
    ["LS-0825-23","FIXED","Global flicker and slowdown recovery","Recoverable update/render faults no longer clear held controls, recreate the canvas backing store or throttle the animation loop to 90 ms steps. This removes the fault-recovery feedback that could produce flashing, severe slowdown and apparent movement lockups in ordinary Dungeon and multiplayer modes."],
    ["LS-0825-24","FIXED","Horde multiplayer movement resilience","Horde clients retain held movement through recoverable frame faults instead of having their input erased by the browser recovery layer. This addresses the reported second-player movement lock while keeping multiplayer non-pausing."],
    ["LS-0825-25","ADDED","Horde enemies-remaining HUD","Horde Multiplayer now shows a persistent WAVE / ENEMIES LEFT / ACTIVE NOW line in the existing Horde roster instead of restoring the removed top-of-screen Horde banner."],
    ["LS-0825-26","CHANGED","Horde friendly fire disabled","Player projectiles cannot damage team-mates in Horde. Host-authoritative enemy melee packets remain hostile damage and are no longer confused with friendly-fire damage on the receiving client."],
    ["LS-0825-27","FIXED","Spy Vs Spy single movement owner","Spy movement is now owned by one final r29 movement path after the older fallback/finalizer stack has installed. Door activation, collision and active-player occupancy are handled there without allowing competing fallback movement systems to move the same agent."],
    ["LS-0825-28","FIXED","Silent return to main menu","Quitting any active run now disposes special-mode audio and stops gameplay music before and after the menu transition. Horde, Spy Vs Spy, Dungeon, split-screen and Solo gameplay music cannot continue playing on the title menu."],
    ["LS-0825-29","CHANGED","r29 cache-safe delivery","Build 2026.08.25.29 uses cache generation 20260825r29 so browsers cannot mix the runtime, audio, movement and Horde fixes with r28 assets."],
    ["LS-0825-30","CHANGED","Melee contact combat balance","Walking into an enemy no longer inflicts separate collision damage or throws the player away from sword range. Contact blocks movement at the adjacent tile; hostile damage now comes from the enemy's actual melee attack, charge, projectile or environmental hazard."],
    ["LS-0825-31","FIXED","Room-door bypass sealing","Procedural Dungeon rooms now seal stray unregistered wall openings immediately beside a real room-door group. Legitimate door leaves and separate corridors remain intact, so a closed door can no longer be bypassed through a one-tile gap beside it."],
    ["LS-0825-32","ADDED","Enter-to-continue popup controls","Keyboard players can press Enter on visible Continue, Resume, Close, Back to Game, Complete Tutorial and equivalent acknowledgement actions. The key event is consumed before gameplay input so advancing a popup cannot also trigger Player 2 attack."],
    ["LS-0825-33","CHANGED","Pickup naming and readability","Misleading generic labels such as Hidden Health Pack are normalised to relevant item names. Common health, ammo, potion, torch, armour, teleport and key pickups receive larger, more distinctive in-dungeon glyphs while custom pickup artwork remains authoritative."]
  ];
  const statusClass=status=>String(status).toLowerCase().replace(/[^a-z]+/g,"-");
  const entryHtml=([id,status,title,copy])=>`<article class="developer-log-entry" data-r29-entry="${id}"><code class="developer-log-id">${id}</code><span class="developer-log-status ${statusClass(status)}">${status}</span><div class="developer-log-copy"><b>${title}</b><span>${copy}</span></div></article>`;

  function mount(){
    const tracker=document.getElementById("developer-changelog");if(!tracker)return false;
    const latest=tracker.querySelector(".developer-changelog-latest");if(latest)latest.textContent="LATEST UPDATE · 25 AUG 2026 · V10.41 · r29";
    const stamp=tracker.querySelector(".developer-changelog-intro time");if(stamp){stamp.dateTime="2026-08-25";stamp.textContent="Last updated 25 August 2026 · V10.41 · build 2026.08.25.29"}
    const firstList=tracker.querySelector(".developer-log-day .developer-log-list");if(!firstList)return false;
    for(const entry of [...entries].reverse()){
      if(tracker.querySelector(`[data-r29-entry="${entry[0]}"]`))continue;
      firstList.insertAdjacentHTML("afterbegin",entryHtml(entry));
    }
    return true;
  }

  let timer=setInterval(()=>{if(mount()){clearInterval(timer);timer=0}},80);mount();
  addEventListener("pagehide",()=>{if(timer)clearInterval(timer)},{once:true});
  window.CCGLostSizzlerV141R29BugLog={entries,mount};
})();
