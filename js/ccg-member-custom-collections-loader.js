/* Loads private custom-collection management only on the Member Hub. */
(function () {
  "use strict";
  if (window.CCG_MEMBER_CUSTOM_COLLECTIONS_LOADER_READY) return;
  window.CCG_MEMBER_CUSTOM_COLLECTIONS_LOADER_READY = true;
  if (!document.getElementById("memberHub") && document.documentElement.getAttribute("data-ccg-page") !== "member-hub") return;
  import("/resources/js/auth/member-custom-collections.js").catch((error) => {
    console.warn("[CCG] Member custom collections could not be loaded:", error);
  });
})();
