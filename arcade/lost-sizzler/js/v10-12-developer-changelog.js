/* C64 Dungeon Carnage — developer changelog / active work tracker. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_DEVELOPER_CHANGELOG__)return;
  window.__CCG_LOST_SIZZLER_DEVELOPER_CHANGELOG__=true;

  /*
    This public tracker intentionally contains active work only.
    Completed historical entries are omitted so old fixes and retired product
    modes are not presented as the current Dungeon Carnage backlog.
  */
  const days=[
    {
      date:"16 SEPTEMBER 2026",
      iso:"2026-09-16",
      entries:[
        ["DC-0916-01","VERIFYING","Live firing / attack liveness","#2090 is merged and exact-head automated qualification passed for held Space, F and Numpad0 firing, including pause/resume coverage. The user-reproduced defect remains in verification until sustained firing is manually checked on the deployed/current build and no longer reproduces."],
        ["DC-0916-02","VERIFYING","3-Artefact Banishment Flask exchange","#2090 is merged and automated coverage passed for both legacy physical Artefacts and the current V10.42 Essence representation without spending Gold or Score. Manual deployed/current-build acceptance is still required. Artefact, Essence, Vessel and Ward-Break wording will be reconciled against the demonstrated behaviour after that check."],
        ["DC-0916-03","PARTIAL","Retired multiplayer runtime removal","Online entry/lobby surfaces are retired and #2096 now guards the exact active local-runtime suffix inside game-network.js. The retained hostEnemyStep-to-dropInventorySlot helper block still needs guarded extraction before obsolete online transport can be removed. Solo, local 2P Split Screen and Weekly Vault/account services must remain intact."],
        ["DC-0916-04","OPEN","Four elemental portal architecture","The requested Water, Fire, Earth and Air portal structure with distinct zone identities and content direction has not yet been implemented."],
        ["DC-0916-05","OPEN","Larger procedural zone topology","#2098 is merged and adds qualified five-depth semantic room grammar, but it intentionally does not alter topology. Materially larger and more distinctive portal/zone spaces remain a separate implementation task."],
        ["DC-0916-06","OPEN","Deeper zone-specific content","Enemies, bosses/elites, Artefacts, events, secrets and encounter patterns still need a deeper zone-specific pass so the planned portal regions differ mechanically as well as thematically."],
        ["DC-0916-07","PARTIAL","NPC and merchant expansion","Deterministic NPC dialogue, rumours, rescue and quest foundations are present. Deeper world integration, merchant/service behaviour and finished reward/content flows still require implementation and live qualification."],
        ["DC-0916-08","PARTIAL","Startup and menu simplification","The old #2055 unified-UI candidate never merged and is stale. Useful presentation work must be rebuilt as small current-main stages without restoring retired online product modes."],
        ["DC-0916-09","OPEN","itch.io release handoff","itch.io is the intended purchase and download route. The PayPal-specific release path is superseded; reusable provider-neutral package work still needs an itch.io handoff and end-to-end release/package check."],
        ["DC-0916-10","VERIFYING","Final supported-mode release qualification","After live acceptance, retired-network extraction, remaining content work and release packaging are complete, Solo, Tutorial, local 2P Split Screen, saves, floor transitions, progression and Weekly Vault/account surfaces need a final current-production regression and hands-on acceptance pass."]
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
        <span class="developer-changelog-summary"><i class="developer-changelog-pulse" aria-hidden="true"></i><span>Developer Changelog / Active Work</span></span>
        <span class="developer-changelog-latest">LATEST AUDIT · 16 SEP 2026 · OUTSTANDING WORK ONLY</span>
      </summary>
      <div class="developer-changelog-body">
        <p class="developer-changelog-intro"><span><strong>ACTIVE DEVELOPMENT LOG.</strong> This panel lists unresolved, partially completed or verification-stage work only. Completed historical jobs are deliberately omitted.</span><time datetime="2026-09-16">Audited against current main on 16 September 2026</time></p>
        ${days.map(day=>`<section class="developer-log-day"><h4><time datetime="${day.iso}">${day.date}</time></h4><div class="developer-log-list">${day.entries.map(entryHtml).join("")}</div></section>`).join("")}
        <section class="developer-log-monitoring" aria-label="Tracker rules"><h4>TRACKER RULE</h4><p><b>Merged does not automatically mean closed.</b> A user-reproduced defect remains VERIFYING until its regression coverage passes and the deployed/current behaviour is manually accepted. PARTIAL means a foundation is present but requested follow-on work remains.</p></section>
        <p class="developer-changelog-foot">OPEN = requested work not yet complete. PARTIAL = some layers are present but the requested outcome is unfinished. VERIFYING = implementation exists and automated checks pass, but required live/manual acceptance is still outstanding.</p>
      </div>`;

    if(anchor.classList.contains("secondary-menu"))anchor.insertAdjacentElement("afterend",details);
    else anchor.insertAdjacentElement("beforebegin",details);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();
