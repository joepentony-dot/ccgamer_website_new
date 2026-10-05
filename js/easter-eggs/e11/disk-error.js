import { appendLine, cleanupBag } from "./common.js";

export function createExperience({ onLaunch } = {}) {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--diskerror";
    root.innerHTML =
        '<div class="ccg-e11__error-screen">' +
            '<header class="ccg-e11__error-head"><strong>1541 RECOVERY MONITOR</strong><span data-error-status>74 DRIVE NOT READY</span></header>' +
            '<div class="ccg-e11__error-layout">' +
                '<div class="ccg-e11__error-terminal-wrap">' +
                    '<div class="ccg-e11__error-terminal" data-error-output aria-live="polite">' +
                        '<div>SEARCHING FOR CHEEKY</div><div>LOADING</div><div class="is-error">74,DRIVE NOT READY,00,00</div><div>READY.</div>' +
                    '</div>' +
                    '<form class="ccg-e11__command" data-error-form><span>&gt;</span><input data-error-input spellcheck="false" autocomplete="off" aria-label="Recovery command"></form>' +
                '</div>' +
                '<aside class="ccg-e11__error-diagnostics">' +
                    '<div class="ccg-e11__error-drive"><span>DEVICE 8</span><i data-error-led></i><b data-error-track>TR 18</b></div>' +
                    '<strong>SECTOR MAP</strong>' +
                    '<div class="ccg-e11__error-map" data-error-map></div>' +
                    '<div class="ccg-e11__error-readout">' +
                        '<span>ATTEMPTS <b data-error-attempts>0</b></span>' +
                        '<span>CHANNEL <b>15</b></span>' +
                        '<span>STATE <b data-error-state>FAULT</b></span>' +
                    '</div>' +
                    '<div class="ccg-e11__quick">' +
                        '<button type="button" class="ccg-e11-btn" data-error-quick="STATUS">STATUS</button>' +
                        '<button type="button" class="ccg-e11-btn" data-error-quick="RETRY">RETRY</button>' +
                        '<button type="button" class="ccg-e11-btn" data-error-quick="INITIALIZE">INITIALIZE</button>' +
                        '<button type="button" class="ccg-e11-btn" data-error-quick="HELP">HELP</button>' +
                    '</div>' +
                '</aside>' +
            '</div>' +
            '<p class="ccg-e11__hint">The archive disk has dropped off the bus. Inspect the status channel, retry the read, or initialise the drive.</p>' +
        '</div>';

    const output = root.querySelector("[data-error-output]");
    const form = root.querySelector("[data-error-form]");
    const input = root.querySelector("[data-error-input]");
    const status = root.querySelector("[data-error-status]");
    const attemptsDisplay = root.querySelector("[data-error-attempts]");
    const stateDisplay = root.querySelector("[data-error-state]");
    const led = root.querySelector("[data-error-led]");
    const track = root.querySelector("[data-error-track]");
    const map = root.querySelector("[data-error-map]");
    const cleanup = cleanupBag();
    let recovered = false;
    let attempts = 0;
    let ledTimer = 0;

    const badSectors = new Set([7, 8, 21, 22, 37, 54]);
    for (let index = 0; index < 70; index += 1) {
        const sector = document.createElement("i");
        sector.className = "ccg-e11__error-sector";
        sector.dataset.sector = String(index);
        if (badSectors.has(index)) sector.classList.add("is-bad");
        map.appendChild(sector);
    }

    const pulse = (fault = false) => {
        clearTimeout(ledTimer);
        led.classList.add("is-on");
        led.classList.toggle("is-fault", fault);
        track.textContent = "TR " + String(18 + (attempts % 5)).padStart(2, "0");
        ledTimer = setTimeout(() => led.classList.remove("is-on"), 320);
    };

    const setFault = () => {
        status.textContent = "74 DRIVE NOT READY";
        stateDisplay.textContent = "FAULT";
        root.classList.remove("is-recovered");
        pulse(true);
    };

    const recover = () => {
        recovered = true;
        status.textContent = "00 OK";
        stateDisplay.textContent = "READY";
        root.classList.add("is-recovered");
        map.querySelectorAll(".is-bad").forEach((sector, index) => {
            setTimeout(() => sector.classList.add("is-fixed"), index * 45);
        });
        pulse(false);
        appendLine(output, "00, OK,00,00", "is-success");
        appendLine(output, "DRIVE RECOVERED. TYPE RUN.", "is-success");
    };

    const execute = raw => {
        const printable = String(raw || "").trim();
        const command = printable.toUpperCase().replace(/\s+/g, "");
        if (!command) return;
        attempts += 1;
        attemptsDisplay.textContent = String(attempts);
        appendLine(output, ">" + printable, "is-command");

        if (command === "OPEN15,8,15" || command === "INITIALIZE" || command === "I0") {
            appendLine(output, "OPENING ERROR CHANNEL 15...");
            appendLine(output, "INITIALIZING DEVICE 8...");
            recover();
            return;
        }
        if (command === "RUN" && recovered) {
            appendLine(output, "LOADING CCG RECOVERY PROGRAM...", "is-success");
            appendLine(output, "HANDING CONTROL TO DEVICE 8.", "is-dim");
            onLaunch?.("1541");
            return;
        }
        if (command === "RUN") {
            appendLine(output, "?FILE NOT FOUND ERROR", "is-error");
            setFault();
            return;
        }
        if (command === "STATUS" || command === "OPEN15,8,15:INPUT#15") {
            pulse(!recovered);
            appendLine(output, recovered ? "00, OK,00,00" : "74,DRIVE NOT READY,00,00", recovered ? "is-success" : "is-error");
            return;
        }
        if (command === "RETRY" || command === "LOAD" || command === 'LOAD"CHEEKY",8,1') {
            if (recovered) {
                appendLine(output, "SEARCHING FOR CHEEKY");
                appendLine(output, "LOADING", "is-success");
                appendLine(output, "READY.");
                return;
            }
            appendLine(output, "SEARCHING FOR CHEEKY");
            appendLine(output, attempts < 3 ? "21,READ ERROR,18,00" : "74,DRIVE NOT READY,00,00", "is-error");
            setFault();
            return;
        }
        if (command === "DIRECTORY" || command === 'LOAD"$",8' || command === "DIR") {
            if (recovered) {
                appendLine(output, '0 "CCG ARCHIVE     " 85 2A');
                appendLine(output, '12   "GAMES"             PRG');
                appendLine(output, '4    "RECOVERY"          PRG');
                appendLine(output, "664 BLOCKS FREE.");
            } else {
                appendLine(output, "21,READ ERROR,18,00", "is-error");
                setFault();
            }
            return;
        }
        if (command === "VALIDATE" || command === "V0") {
            appendLine(output, recovered ? "BAM VALID. 00, OK,00,00" : "74,DRIVE NOT READY,00,00", recovered ? "is-success" : "is-error");
            if (!recovered) setFault();
            return;
        }
        if (command === "HELP") {
            appendLine(output, "RECOVERY COMMANDS", "is-heading");
            appendLine(output, "STATUS · RETRY · OPEN15,8,15 · INITIALIZE · I0 · RUN");
            appendLine(output, "HINT: INITIALIZE RESETS THE DRIVE MECHANISM WITHOUT FORMATTING THE DISK.", "is-dim");
            return;
        }
        appendLine(
            output,
            attempts < 3 ? "74,DRIVE NOT READY,00,00" : "THE DRIVE WOULD LIKE YOU TO TYPE HELP.",
            "is-error"
        );
        setFault();
    };

    const onSubmit = event => {
        event.preventDefault();
        const value = input.value;
        input.value = "";
        execute(value);
    };
    form.addEventListener("submit", onSubmit);
    cleanup.add(() => form.removeEventListener("submit", onSubmit));

    const onQuick = event => {
        const command = event.target.closest("[data-error-quick]")?.dataset.errorQuick;
        if (command) execute(command);
    };
    root.addEventListener("click", onQuick);
    cleanup.add(() => root.removeEventListener("click", onQuick));
    cleanup.add(() => clearTimeout(ledTimer));

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => input.focus({ preventScroll: true }),
    };
}
