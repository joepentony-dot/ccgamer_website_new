import { cleanupBag } from "./common.js";

function hex(value, width) {
    return Math.abs(value >>> 0).toString(16).toUpperCase().padStart(width || 8, "0");
}

export function createExperience({ prefersReducedMotion = false, onLaunch } = {}) {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--guru";
    if (prefersReducedMotion) root.classList.add("is-reduced-motion");
    root.innerHTML =
        '<div class="ccg-e11__guru-border">' +
            '<div class="ccg-e11__guru-panel">' +
                '<p>Software Failure. Press left mouse button to continue.</p>' +
                '<p>Guru Meditation #' + hex(Math.random() * 0xffffffff) + '.' + hex(Math.random() * 0xffffffff) + '</p>' +
            '</div>' +
        '</div>' +
        '<div class="ccg-e11__guru-actions">' +
            '<button type="button" class="ccg-e11-btn" data-guru="details">TECHNICAL DETAILS</button>' +
            '<button type="button" class="ccg-e11-btn" data-guru="reboot">RECOVER WORKBENCH</button>' +
        '</div>' +
        '<div class="ccg-e11__guru-details" data-guru-details hidden>' +
            '<strong>CCG RECOVERY MONITOR</strong>' +
            '<span>EXEC BASE: $' + hex(Math.random() * 0xffffff, 6) + '</span>' +
            '<span>STACK: $' + hex(Math.random() * 0xffffff, 6) + '</span>' +
            '<span>STATUS: CHEEKINESS EXCEEDED SAFE LIMITS</span>' +
        '</div>';

    const cleanup = cleanupBag();
    const details = root.querySelector("[data-guru-details]");
    const panel = root.querySelector(".ccg-e11__guru-panel");
    const rebootButton = root.querySelector('[data-guru="reboot"]');
    let recovered = false;

    const onClick = event => {
        const action = event.target.closest("[data-guru]")?.dataset.guru;
        if (action === "details") details.hidden = !details.hidden;
        if (action === "reboot") {
            if (recovered) {
                onLaunch?.("workbench");
                return;
            }
            recovered = true;
            root.classList.add("is-recovered");
            panel.innerHTML = "<p>RECOVERY COMPLETE.</p><p>CHEEKY COMMODORE GAMER IS BACK.</p>";
            rebootButton.textContent = "OPEN WORKBENCH";
        }
    };
    root.addEventListener("click", onClick);
    cleanup.add(() => root.removeEventListener("click", onClick));

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => root.querySelector("button")?.focus({ preventScroll: true }),
    };
}
