/* C64 Dungeon Carnage — public development log shell.
 * Historical entries were intentionally cleared on 15 September 2026.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_DEVELOPER_CHANGELOG__)return;
  window.__CCG_LOST_SIZZLER_DEVELOPER_CHANGELOG__=true;

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
        <span class="developer-changelog-latest">LOG CLEARED · 15 SEP 2026</span>
      </summary>
      <div class="developer-changelog-body">
        <p class="developer-changelog-intro"><span><strong>LIVE DEVELOPMENT LOG.</strong> No public development entries are currently listed.</span></p>
      </div>`;

    if(anchor.classList.contains("secondary-menu"))anchor.insertAdjacentElement("afterend",details);
    else anchor.insertAdjacentElement("beforebegin",details);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();
