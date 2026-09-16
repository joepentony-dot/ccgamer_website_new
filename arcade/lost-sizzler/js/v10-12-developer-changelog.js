/* C64 Dungeon Carnage — developer changelog / active work tracker. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_DEVELOPER_CHANGELOG__)return;
  window.__CCG_LOST_SIZZLER_DEVELOPER_CHANGELOG__=true;

  /*
    This public tracker intentionally contains active work only.
    Completed historical entries were removed on 16 September 2026 so the
    panel cannot imply that old fixes are still part of the current backlog.
  */
  const days=[
    {
      date:"16 SEPTEMBER 2026",
      iso:"2026-09-16",
      entries:[
        ["DC-0916-01","OPEN","Live firing / attack regression","PR #2009 is merged, but manual testing on the current live build still reproduces the firing problem. Treat attack liveness as unresolved until the current-main input path is repaired and re-tested."],
        ["DC-0916-02","OPEN","Artefact Flask exchange","Ordinary shop stock correctly uses the current Gold economy. The outstanding defect is the alternate 3-Artefact exchange for the Banishment Flask, which still fails in live conditions and must work independently of the intended 10 Gold Flask purchase."],
        ["DC-0916-03","OPEN","C64 Dungeon Carnage runtime identity","The static page carries the current game name, but the ordered V10.42 bootstrap still contains a late subtitle restamp to THE LOST SIZZLER. The final runtime identity must remain C64 Dungeon Carnage throughout startup."],
        ["DC-0916-04","PARTIAL","Retired multiplayer runtime removal","Dungeon Multiplayer, Horde and Spy entry surfaces have been retired and the online lobby markup is gone. Mixed legacy networking code still needs active Solo/local Split Screen helpers separated before the remaining online transport can be deleted safely."],
        ["DC-0916-05","PARTIAL","Five-depth biome and room identity","All five campaign depths already have distinct biome presentation. The stronger deterministic room-grammar pass remains unmerged and must be refreshed onto current main before qualification."],
        ["DC-0916-06","OPEN","Four elemental portal architecture","The requested Water, Fire, Earth and Air portal structure with distinct zone identities has not yet been implemented in the current release runtime."],
        ["DC-0916-07","OPEN","Larger procedural dungeon topology","Current biome and room-grammar layers decorate or describe the existing generated dungeon. The requested larger, grander zone topology remains a separate implementation task."],
        ["DC-0916-08","PARTIAL","NPC and merchant expansion","The deterministic NPC dialogue, rumour, rescue and quest foundation is present. Deeper merchant transactions, world integration and finished NPC content still require implementation and live qualification."],
        ["DC-0916-09","PARTIAL","Startup and menu simplification","The old unified-UI candidate never merged and is stale against current main. Its useful presentation changes need to be split into fresh, current-main stages rather than merged wholesale."],
        ["DC-0916-10","OPEN","itch.io release handoff","itch.io is the intended purchase and download route. The old PayPal-specific release path is superseded; the reusable offline package work still needs a current itch.io release handoff and end-to-end release check."],
        ["DC-0916-11","VERIFYING","Final supported-mode release qualification","After the open firing, Artefact exchange, identity and cleanup work is corrected, Solo, Tutorial, local 2P Split Screen, saves, floor transitions, progression and the Weekly Vault need a final current-production regression and hands-on acceptance pass."]
      ]
    }
  ];

  const statusClass=status=>status.toLowerCase().replace(/[^a-z]+/g,"-");
  const entryHtml=([id,status,title,copy])=>`<article class="developer-log-entry"><code class="developer-log-id">${id}</code><span class="developer-log-status ${statusClass(status)}">${status}</span><div class="developer-log-copy"><b>${title}</b><span>${copy}</span></div></article>`;

  function mount(){
    if(document.getElementById("developer-changelog"))return;
    const menu=document.querySelector("#menu .panel");
    if(!menu)return;
    const anchor=menu.querySelector(".secondary-menu")||menu.querySelector(".keys-help");
    if(!anchor)return;

    const details=document.createElement("details");
    details.id="developer-changelog";
    details.className="developer-changelog";
    details.innerHTML=`
      <summary>
        <span class="developer-changelog-summary"><i class="developer-changelog-pulse" aria-hidden="true"></i><span>Developer Changelog / Active Work</span></span>
        <span class="developer-changelog-latest">LATEST AUDIT · 16 SEP 2026 · OUTSTANDING WORK ONLY</span>
      </summary>
      <div class="developer-changelog-body">
        <p class="developer-changelog-intro"><span><strong>ACTIVE DEVELOPMENT LOG.</strong> This panel now lists unresolved or partially completed work only. Completed historical jobs are deliberately omitted.</span><time datetime="2026-09-16">Audited against current main on 16 September 2026</time></p>
        ${days.map(day=>`<section class="developer-log-day"><h4><time datetime="${day.iso}">${day.date}</time></h4><div class="developer-log-list">${day.entries.map(entryHtml).join("")}</div></section>`).join("")}
        <section class="developer-log-monitoring" aria-label="Tracker rules"><h4>TRACKER RULE</h4><p><b>Merged does not automatically mean closed.</b> A reported defect remains OPEN when it can still be reproduced on the current live build. PARTIAL means a foundation is present but requested follow-on work remains.</p></section>
        <p class="developer-changelog-foot">OPEN = requested work not yet complete. PARTIAL = some layers are live but the requested outcome is unfinished. VERIFYING = implementation exists but current-production acceptance is still required.</p>
      </div>`;

    if(anchor.classList.contains("secondary-menu"))anchor.insertAdjacentElement("afterend",details);
    else anchor.insertAdjacentElement("beforebegin",details);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();
