// ==========================
// BASIC ENGINE + BOOT CONTROL
// ==========================

// Detect if current page is a GENRE page
const isGenrePage = window.location.pathname.includes("/games/genres/");

// ========== BOOT SCREEN CONTROL ==========
function runBoot() {
    if (isGenrePage) {
        console.log("Boot disabled on genre pages.");
        return; // STOP HERE
    }

    console.log("Boot sequence would run here.");
    // (Your original boot logic goes here)
}

// Run boot AFTER load
window.addEventListener("DOMContentLoaded", runBoot);
