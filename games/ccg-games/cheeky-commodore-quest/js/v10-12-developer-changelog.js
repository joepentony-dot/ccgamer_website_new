/* The Lost Sizzler — developer changelog / bug tracker. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_DEVELOPER_CHANGELOG__)return;
  window.__CCG_LOST_SIZZLER_DEVELOPER_CHANGELOG__=true;

  const days=[
    {
      date:"23 AUGUST 2026",
      iso:"2026-08-23",
      entries:[
        ["LS-0823-01","FIXED","Enemy dossier discovery","Unknown named enemies are no longer exposed. A dossier entry opens only on the first encounter with that enemy type, and later encounters do not reopen it."],
        ["LS-0823-02","FIXED","Direct-link startup freeze","Cold starts from direct and in-app links were hardened by loading browser stability protection earlier and allowing optional enhancements to fail or time out without blocking the game."],
        ["LS-0823-03","FIXED","Gameplay notification overlap","Important notices, rating prompts and status messages were moved outside the playable canvas so they cannot cover or split the action."],
        ["LS-0823-04","FIXED","Browser stability risks","Canvas allocation limits, transient render-state ceilings and bounded custom-audio retry behaviour were added to reduce runaway resource use and tab crashes."],
        ["LS-0823-05","CHANGED","Mobile gameplay layout","Phone layouts now prioritise the game view, reserve dedicated touch-control space and keep non-essential desktop panels away from active play."],
        ["LS-0823-06","CHANGED","Difficulty by dungeon depth","Early rooms are more forgiving while enemy pressure rises deeper into each generated floor. Ordinary enemies are also kept away from corridor and doorway spawn cells."],
        ["LS-0823-07","ADDED","Player activity and ratings","Actual run starts, supported device starts, play activity and the timed rating prompt are recorded for the developer insights dashboard."],
        ["LS-0823-08","ADDED","Bug-report reply workflow","Bug reports and suggestions now have their own admin area with reply support and feedback history instead of being mixed into Arcade Assets."]
      ]
    },
    {
      date:"22 AUGUST 2026",
      iso:"2026-08-22",
      entries:[
        ["LS-0822-01","FIXED","Quit Game control","The Quit Game action now leaves the game and returns to the CCG Games hub instead of failing to exit."],
        ["LS-0822-02","FIXED","Uploaded playlist playback","Admin-uploaded soundtrack playlists now receive the active game music state correctly rather than being bypassed by the cached sound object."],
        ["LS-0822-03","CHANGED","Continuous exploration music","Exploration music now continues through ordinary rooms and corridors and resumes from the same position after temporary combat, sanctuary or named-enemy themes."],
        ["LS-0822-04","ADDED","Multi-track soundtrack playlists","Exploration, Combat, Sanctuary, Named Enemy and Count Loadula categories gained multi-track playlists with random no-repeat selection and controlled transitions."],
        ["LS-0822-05","FIXED","Sealed-room respawn soft-lock","Death recovery was hardened so a player cannot respawn into a state where a sealed challenge room leaves the run blocked."],
        ["LS-0822-06","CHANGED","Persistent inventory HUD","Carried items remain visible in the tactical sidebar and numbered quick-slot activation was added for faster item use."],
        ["LS-0822-07","FIXED","Sidebar and fullscreen UI","Carried-item positioning, tactical radar overlap and fullscreen popup contrast were corrected."],
        ["LS-0822-08","CHANGED","Death Stalker economy","Stalker rewards and Banishment Flask pricing were simplified and balanced, with regression coverage added around the revised rules."]
      ]
    }
  ];

  const statusClass=status=>status.toLowerCase().replace(/[^a-z]+/g,"-");
  const entryHtml=([id,status,title,copy])=>`<article class="developer-log-entry"><code class="developer-log-id">${id}</code><span class="developer-log-status ${statusClass(status)}">${status}</span><div class="developer-log-copy"><b>${title}</b><span>${copy}</span></div></article>`;

  function mount(){
    if(document.getElementById("developer-changelog"))return;
    const menu=document.querySelector("#menu .panel");
    if(!menu)return;
    const anchor=menu.querySelector(".secondary-menu")||menu.querySelector(".join-row")||menu.querySelector(".keys-help");
    if(!anchor)return;

    const details=document.createElement("details");
    details.id="developer-changelog";
    details.className="developer-changelog";
    details.innerHTML=`
      <summary>
        <span class="developer-changelog-summary"><i class="developer-changelog-pulse" aria-hidden="true"></i><span>Developer Changelog / Bug Tracker</span></span>
        <span class="developer-changelog-latest">LATEST UPDATE · 23 AUG 2026</span>
      </summary>
      <div class="developer-changelog-body">
        <p class="developer-changelog-intro"><span><strong>LIVE DEVELOPMENT LOG.</strong> Confirmed player-facing fixes and substantial gameplay changes are recorded here so testers can see what changed and when.</span><time datetime="2026-08-23">Last updated 23 August 2026</time></p>
        ${days.map(day=>`<section class="developer-log-day"><h4><time datetime="${day.iso}">${day.date}</time></h4><div class="developer-log-list">${day.entries.map(entryHtml).join("")}</div></section>`).join("")}
        <section class="developer-log-monitoring" aria-label="Known issues and monitoring"><h4>KNOWN / MONITORING</h4><p><b>Direct launches from YouTube and other in-app browsers:</b> startup hardening was deployed on 23 August 2026. This is currently marked as monitoring; please submit a bug report if a direct launch still freezes or fails to initialise.</p></section>
        <p class="developer-changelog-foot">Statuses describe the live website build: FIXED = confirmed code correction, CHANGED = deliberate behaviour or balance revision, ADDED = new capability, MONITORING = a reported issue with a mitigation deployed but still being watched.</p>
      </div>`;

    if(anchor.classList.contains("secondary-menu"))anchor.insertAdjacentElement("afterend",details);
    else anchor.insertAdjacentElement("beforebegin",details);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();
