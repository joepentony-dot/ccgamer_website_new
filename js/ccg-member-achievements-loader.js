/* Loads private activity achievements only on the CCG Member Hub. */
(function () {
  "use strict";
  if (window.CCG_MEMBER_ACHIEVEMENTS_LOADER_READY) return;
  window.CCG_MEMBER_ACHIEVEMENTS_LOADER_READY = true;

  const isMemberHub = document.getElementById("memberHub")
    || document.documentElement.getAttribute("data-ccg-page") === "member-hub";
  if (!isMemberHub) return;

  import("/resources/js/auth/member-achievement-badges.js").catch((error) => {
    console.warn("[CCG] Member achievements could not be loaded:", error);
  });
})();
