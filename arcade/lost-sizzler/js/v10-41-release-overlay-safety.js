/* The Lost Sizzler V10.41 — release overlay gameplay-input safety.
 *
 * V10.36 owns the release/loading presentation. This compatibility guard may
 * retire the loader only after authoritative V10.42 startup has completed and
 * gameplay/tutorial has actually begun. Premature active-state flags must not
 * bypass the loader while the ordered bootstrap is still unfinished.
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
      body[data-v142-bootstrap-ready="true"][data-release-ready="true"][data-run-active="true"] #ccg-release-loading:not(.is-error),
      body[data-v142-bootstrap-ready="true"][data-release-ready="true"][data-tutorial-active="true"] #ccg-release-loading:not(.is-error){
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
