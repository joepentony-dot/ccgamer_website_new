/* Loads the dedicated award/platform logo layer on the Zzap!64 archive only. */
(function () {
    "use strict";

    if (document.documentElement.getAttribute("data-ccg-page") !== "zzap64-awards") return;
    const href = "/resources/css/zzap64-awards-logos.css";
    if (document.querySelector(`link[href="${href}"]`)) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
})();
