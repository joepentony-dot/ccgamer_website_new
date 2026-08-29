/* The Lost Sizzler V10.41 — release overlay gameplay-input safety.
 *
 * V10.36 owns the release/loading presentation. A late release-gate callback
 * can occasionally lag behind a page that has already become playable, leaving
 * the full-screen loading layer above otherwise usable controls. The body
 * already exposes authoritative lifecycle flags, so this guard is deliberately
 * CSS-only: no polling, no MutationObservers and no extra work in the game loop.
 * Genuine fatal-load presentation remains visible via the .is-error exemption.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_RELEASE_OVERLAY_SAFETY__)return;
  window.__CCG_LOST_SIZZLER_V141_RELEASE_OVERLAY_SAFETY__=true;

  const STYLE_ID="ccg-v141-release-overlay-safety-style";

  function install(){
    if(document.getElementById(STYLE_ID))return false;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      body[data-release-ready="true"] #ccg-release-loading:not(.is-error),
      body[data-run-active="true"] #ccg-release-loading:not(.is-error),
      body[data-tutorial-active="true"] #ccg-release-loading:not(.is-error){
        display:none!important;
        visibility:hidden!important;
        pointer-events:none!important;
      }
    `;
    (document.head||document.documentElement).appendChild(style);
    return true;
  }

  install();
  window.CCGLostSizzlerV141ReleaseOverlaySafety={STYLE_ID,install};
})();
