/* ============================================================
   CCG GLOBAL HEADER / AUTO FIXES
   Safe, non-destructive version for OMEGA build
   ============================================================ */

/* ------------------------------------------------------------
   1) FIXED LOGO HANDLING (ABSOLUTE PATH — FINAL SOLUTION)
   ------------------------------------------------------------ */

// ALWAYS correct logo path regardless of directory depth
// This avoids the dynamic prefix issues that broke the homepage logo.
//
// NOTE: Do not change this unless your repo name changes.
//
const ABSOLUTE_LOGO = "/ccgamer_website_new/resources/images/CCGAMER LOGO.png";

// Apply corrected logo to every element using the logo class
document.querySelectorAll(".ccg-brand__logo").forEach(img => {
    img.src = ABSOLUTE_LOGO;
});


/* ------------------------------------------------------------
   2) AUTO YEAR IN FOOTER
   ------------------------------------------------------------ */
const yearSpan = document.querySelector("[data-ccg-year]");
if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
}


/* ------------------------------------------------------------
   3) HEADER BEHAVIOUR (SAFE & UNCHANGED)
   ------------------------------------------------------------ */
const header = document.querySelector(".ccg-header");
let lastScroll = 0;

window.addEventListener("scroll", () => {
    const currentScroll = window.scrollY;

    if (!header) return;

    if (currentScroll > lastScroll && currentScroll > 60) {
        header.classList.add("ccg-header--hidden");
    } else {
        header.classList.remove("ccg-header--hidden");
    }

    lastScroll = currentScroll;
});
