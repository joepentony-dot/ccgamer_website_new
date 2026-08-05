/* Loads read-only private collection insights on the CCG Member Hub. */
(function () {
  "use strict";
  if (window.CCG_MEMBER_COLLECTION_INSIGHTS_LOADER_READY) return;
  window.CCG_MEMBER_COLLECTION_INSIGHTS_LOADER_READY = true;

  const isMemberHub = document.getElementById("memberHub")
    || document.documentElement.getAttribute("data-ccg-page") === "member-hub";
  if (!isMemberHub) return;

  import("/resources/js/auth/member-collection-insights.js").catch((error) => {
    console.warn("[CCG] Private collection insights could not be loaded:", error);
  });
})();
