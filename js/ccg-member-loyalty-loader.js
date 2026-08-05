/* Loads monthly loyalty badges only on the private Member Hub. */
(function () {
  "use strict";
  if (window.CCG_MEMBER_LOYALTY_LOADER_READY) return;
  window.CCG_MEMBER_LOYALTY_LOADER_READY = true;
  if (!document.getElementById("memberHub") && document.documentElement.getAttribute("data-ccg-page") !== "member-hub") return;
  import("/resources/js/auth/member-loyalty-badges.js").catch((error) => {
    console.warn("[CCG] Member loyalty badges could not be loaded:", error);
  });
})();
