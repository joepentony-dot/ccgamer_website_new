/* Loads privacy-first Member Hub community tools only on the private dashboard. */
(function () {
  "use strict";
  if (window.CCG_MEMBER_COMMUNITY_LOADER_READY) return;
  window.CCG_MEMBER_COMMUNITY_LOADER_READY = true;
  if (!document.getElementById("memberHub") && document.documentElement.getAttribute("data-ccg-page") !== "member-hub") return;
  import("/resources/js/auth/member-community.js").catch((error) => {
    console.warn("[CCG] Member community tools could not be loaded:", error);
  });
})();
