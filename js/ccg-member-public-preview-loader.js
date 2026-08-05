/* Loads the owner-only public-profile privacy preview on the Member Hub. */
(function () {
  "use strict";
  if (window.CCG_MEMBER_PUBLIC_PREVIEW_LOADER_READY) return;
  window.CCG_MEMBER_PUBLIC_PREVIEW_LOADER_READY = true;

  const isMemberHub = document.getElementById("memberHub")
    || document.documentElement.getAttribute("data-ccg-page") === "member-hub";
  if (!isMemberHub) return;

  import("/resources/js/auth/member-public-profile-preview.js").catch((error) => {
    console.warn("[CCG] Public-profile privacy preview could not be loaded:", error);
  });
})();
