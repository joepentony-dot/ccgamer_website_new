import { cleanupBag } from "./common.js";

export function createExperience({ prefersReducedMotion = false, onLaunch } = {}) {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--kickstart";
    if (prefersReducedMotion) root.classList.add("is-reduced-motion");
    root.innerHTML =
        '<div class="ccg-e11__kick-screen">' +
            '<div class="ccg-e11__kick-check" aria-hidden="true"></div>' +
            '<div class="ccg-e11__kick-disk" data-kick-disk aria-hidden="true"><div class="ccg-e11__kick-label">CCG<br>WORKBENCH</div></div>' +
            '<div class="ccg-e11__kick-hand" aria-hidden="true">☝</div>' +
            '<p data-kick-text>INSERT CCG WORKBENCH DISK</p>' +
            '<button class="ccg-e11-btn" type="button" data-kick-insert>INSERT DISK</button>' +
        '</div>';

    const cleanup = cleanupBag();
    const button = root.querySelector("[data-kick-insert]");
    const text = root.querySelector("[data-kick-text]");
    const disk = root.querySelector("[data-kick-disk]");
    let bootTimer = 0;

    const onClick = () => {
        if (button.dataset.kickOpen === "1") {
            onLaunch?.("workbench");
            return;
        }
        button.disabled = true;
        disk.classList.add("is-inserted");
        text.textContent = "BOOTING WORKBENCH...";
        bootTimer = setTimeout(() => {
            text.textContent = "WORKBENCH READY.";
            button.textContent = "OPEN WORKBENCH";
            button.disabled = false;
            button.dataset.kickOpen = "1";
        }, prefersReducedMotion ? 60 : 900);
    };

    button.addEventListener("click", onClick);
    cleanup.add(() => button.removeEventListener("click", onClick));
    cleanup.add(() => clearTimeout(bootTimer));

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => button.focus({ preventScroll: true }),
    };
}
