/* The Lost Sizzler V10.41 — release overlay gameplay-input safety.
 *
 * V10.36 owns the release/loading presentation. This compatibility guard may
 * retire the loader only after gameplay has actually begun. It must not use the
 * legacy data-release-ready pulse as a visibility owner because V10.42 can
 * temporarily receive that value before its ordered bootstrap is complete.
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
