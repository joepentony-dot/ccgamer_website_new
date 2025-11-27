/* ======================================================
   C64 BOOT SCREEN LOGIC
====================================================== */

document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("keydown", dismissBoot);
    document.addEventListener("click", dismissBoot);
});

function dismissBoot() {
    const startScreen = document.getElementById("start-screen");
    if (startScreen) {
        startScreen.style.opacity = "0";
        setTimeout(() => startScreen.remove(), 600);
    }
}

/* ======================================================
   THEME TOGGLE (C64 / DARK)
====================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
        document.body.classList.toggle("amiga-theme");
        toggle.textContent = document.body.classList.contains("amiga-theme")
            ? "AMIGA MODE"
            : "C64 MODE";
    });
});
