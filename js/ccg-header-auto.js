// ============================================================
// CCG AUTO-HIDE + SHRINK HEADER ENGINE 😇🕹️👌
// Smooth, intelligent, mobile-safe behaviour.
// ============================================================

(function () {
    const header = document.getElementById("ccgHeader");
    if (!header) return;

    let lastY = window.scrollY;
    let ticking = false;

    const HIDE_THRESHOLD = 14;   // minimum scroll to activate hide
    const SHRINK_POINT = 60;     // when header becomes smaller
    const SHOW_FORCE = 4;        // tiny upward movement instantly reveals

    let isHidden = false;
    let isShrunk = false;

    function updateHeader() {
        const currentY = window.scrollY;
        const diff = currentY - lastY;

        // 1. SHRINK behaviour
        if (currentY > SHRINK_POINT && !isShrunk) {
            header.classList.add("shrink");
            isShrunk = true;
        }
        if (currentY <= SHRINK_POINT && isShrunk) {
            header.classList.remove("shrink");
            isShrunk = false;
        }

        // 2. HIDE behaviour
        if (diff > HIDE_THRESHOLD && currentY > SHRINK_POINT) {
            // scrolling down
            if (!isHidden) {
                header.classList.add("hidden");
                isHidden = true;
            }
        } else if (diff < -SHOW_FORCE) {
            // scrolling up — reveal immediately
            if (isHidden) {
                header.classList.remove("hidden");
                isHidden = false;
            }
        }

        lastY = currentY;
        ticking = false;
    }

    function onScroll() {
        if (!ticking) {
            window.requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
})();
