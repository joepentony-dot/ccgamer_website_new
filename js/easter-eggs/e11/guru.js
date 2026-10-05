import { cleanupBag } from "./common.js";

function hex(value, width) {
    return Math.abs(value >>> 0).toString(16).toUpperCase().padStart(width || 8, "0");
}

function pseudoWord(seed) {
    let value = seed >>> 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return value >>> 0;
}

export function createExperience({ prefersReducedMotion = false, onLaunch } = {}) {
    const crashA = (Math.random() * 0xffffffff) >>> 0;
    const crashB = (Math.random() * 0xffffffff) >>> 0;
    const execBase = (Math.random() * 0xffffff) >>> 0;
    const stack = (Math.random() * 0xffffff) >>> 0;
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--guru";
    if (prefersReducedMotion) root.classList.add("is-reduced-motion");
    root.innerHTML =
        '<div class="ccg-e11__guru-scan" aria-hidden="true"></div>' +
        '<div class="ccg-e11__guru-border">' +
            '<div class="ccg-e11__guru-panel">' +
                '<div class="ccg-e11__guru-title">SOFTWARE FAILURE</div>' +
                '<p>Press left mouse button to continue.</p>' +
                '<p class="ccg-e11__guru-code">Guru Meditation #' + hex(crashA) + '.' + hex(crashB) + '</p>' +
                '<div class="ccg-e11__guru-pulse" aria-hidden="true"></div>' +
            '</div>' +
        '</div>' +
        '<div class="ccg-e11__guru-actions">' +
            '<button type="button" class="ccg-e11-btn" data-guru="details">TECHNICAL DETAILS</button>' +
            '<button type="button" class="ccg-e11-btn" data-guru="dump">MEMORY DUMP</button>' +
            '<button type="button" class="ccg-e11-btn" data-guru="reboot">RECOVER WORKBENCH</button>' +
        '</div>' +
        '<div class="ccg-e11__guru-details" data-guru-details hidden>' +
            '<div class="ccg-e11__guru-monitor-head"><strong>CCG RECOVERY MONITOR</strong><span>68000 EXCEPTION TRACE</span></div>' +
            '<div class="ccg-e11__guru-registers">' +
                '<span>D0 <b>$' + hex(pseudoWord(crashA), 8) + '</b></span>' +
                '<span>D1 <b>$' + hex(pseudoWord(crashB), 8) + '</b></span>' +
                '<span>A0 <b>$' + hex(execBase, 8) + '</b></span>' +
                '<span>A7 <b>$' + hex(stack, 8) + '</b></span>' +
                '<span>PC <b>$' + hex(crashA & 0x00ffffff, 8) + '</b></span>' +
                '<span>SR <b>$2700</b></span>' +
            '</div>' +
            '<div class="ccg-e11__guru-status">' +
                '<span>EXEC BASE: $' + hex(execBase, 6) + '</span>' +
                '<span>STACK: $' + hex(stack, 6) + '</span>' +
                '<span>EXCEPTION: ADDRESS ERROR</span>' +
                '<span>STATUS: CHEEKINESS EXCEEDED SAFE LIMITS</span>' +
            '</div>' +
            '<pre class="ccg-e11__guru-dump" data-guru-dump hidden></pre>' +
            '<div class="ccg-e11__guru-recovery" data-guru-recovery hidden>' +
                '<span data-guru-recovery-text>RECOVERY MONITOR STANDBY</span>' +
                '<div><i data-guru-progress></i></div>' +
            '</div>' +
        '</div>';

    const cleanup = cleanupBag();
    const details = root.querySelector("[data-guru-details]");
    const dump = root.querySelector("[data-guru-dump]");
    const panel = root.querySelector(".ccg-e11__guru-panel");
    const rebootButton = root.querySelector('[data-guru="reboot"]');
    const recovery = root.querySelector("[data-guru-recovery]");
    const recoveryText = root.querySelector("[data-guru-recovery-text]");
    const progress = root.querySelector("[data-guru-progress]");
    let recovered = false;
    let progressTimer = 0;

    const buildDump = () => {
        const rows = [];
        let seed = crashA ^ crashB;
        for (let row = 0; row < 7; row += 1) {
            const address = (execBase + row * 16) & 0xffffff;
            const words = [];
            for (let index = 0; index < 4; index += 1) {
                seed = pseudoWord(seed + index + row);
                words.push(hex(seed, 8));
            }
            rows.push("$" + hex(address, 6) + "  " + words.join("  "));
        }
        dump.textContent = rows.join("\n");
    };
    buildDump();

    const startRecoveryMeter = () => {
        recovery.hidden = false;
        let amount = 0;
        const steps = ["CHECKING EXEC", "RESTORING COPPER LIST", "MOUNTING CCG DISK", "RESTARTING INTUITION", "WORKBENCH READY"];
        const duration = prefersReducedMotion ? 20 : 120;
        clearInterval(progressTimer);
        progressTimer = setInterval(() => {
            amount = Math.min(100, amount + 20);
            progress.style.width = amount + "%";
            recoveryText.textContent = steps[Math.min(steps.length - 1, Math.floor(amount / 21))];
            if (amount >= 100) clearInterval(progressTimer);
        }, duration);
    };

    const onClick = event => {
        const action = event.target.closest("[data-guru]")?.dataset.guru;
        if (action === "details") details.hidden = !details.hidden;
        if (action === "dump") {
            details.hidden = false;
            dump.hidden = !dump.hidden;
        }
        if (action === "reboot") {
            if (recovered) {
                onLaunch?.("workbench");
                return;
            }
            recovered = true;
            details.hidden = false;
            startRecoveryMeter();
            root.classList.add("is-recovered");
            panel.innerHTML =
                '<div class="ccg-e11__guru-title">RECOVERY COMPLETE</div>' +
                '<p>EXEC AND INTUITION RESPONDING.</p>' +
                '<p class="ccg-e11__guru-code">CHEEKY COMMODORE GAMER IS BACK.</p>';
            rebootButton.textContent = "OPEN WORKBENCH";
        }
    };
    root.addEventListener("click", onClick);
    cleanup.add(() => root.removeEventListener("click", onClick));
    cleanup.add(() => clearInterval(progressTimer));

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => root.querySelector("button")?.focus({ preventScroll: true }),
    };
}
