/* Loads the account-backed personal library only on the private Member Hub. */
(function () {
  "use strict";
  if (window.CCG_MEMBER_LIBRARY_SYNC_LOADER_READY) return;
  window.CCG_MEMBER_LIBRARY_SYNC_LOADER_READY = true;
  if (!document.getElementById("memberHub") && document.documentElement.getAttribute("data-ccg-page") !== "member-hub") return;
  import("/resources/js/auth/member-library-sync.js").catch((error) => {
    console.warn("[CCG] Member library sync could not be loaded:", error);
  });
})();
