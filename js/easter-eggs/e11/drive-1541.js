import { appendLine, audioContext, button, cleanupBag, noiseBurst, safeCloseAudio, tone } from "./common.js";

export function createExperience({ siteRoot = "/", prefersReducedMotion = false } = {}) {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--1541";
    root.innerHTML =
        '<div class="ccg-e11__drive">' +
            '<div class="ccg-e11__drive-face">' +
                '<div class="ccg-e11__drive-badge">commodore 1541</div>' +
                '<div class="ccg-e11__drive-slot"><div class="ccg-e11__disk-label">CCG ARCHIVE DISK</div></div>' +
                '<div class="ccg-e11__drive-led" data-drive-led aria-label="Drive activity light"></div>' +
                '<div class="ccg-e11__drive-head" data-drive-head></div>' +
            '</div>' +
            '<div class="ccg-e11__drive-terminal">' +
                '<div data-drive-output class="ccg-e11__drive-output" aria-live="polite"></div>' +
                '<form data-drive-form class="ccg-e11__command"><span>&gt;</span><input data-drive-input spellcheck="false" value="LOAD&quot;$&quot;,8" aria-label="1541 command"></form>' +
            '</div>' +
            '<div class="ccg-e11__quick" data-drive-quick></div>' +
        '</div>';

    const output = root.querySelector("[data-drive-output]");
    const form = root.querySelector("[data-drive-form]");
    const input = root.querySelector("[data-drive-input]");
    const quick = root.querySelector("[data-drive-quick]");
    const led = root.querySelector("[data-drive-led]");
    const head = root.querySelector("[data-drive-head]");
    const cleanup = cleanupBag();
    const audio = audioContext();
    let activityTimer = 0;
    let delayedLine = 0;

    const activity = (milliseconds = 650) => {
        led.classList.add("is-on");
        if (!prefersReducedMotion) head.classList.add("is-seeking");
        if (audio) {
            if (audio.state === "suspended") audio.resume().catch(() => {});
            noiseBurst(audio, 0.18, 0.012);
            tone(audio, 92, 0.08, "square", 0.015, 0.02);
            tone(audio, 74, 0.08, "square", 0.012, 0.13);
        }
        clearTimeout(activityTimer);
        activityTimer = setTimeout(() => {
            led.classList.remove("is-on");
            head.classList.remove("is-seeking");
        }, milliseconds);
    };

    const directory = () => {
        activity();
        [
            '0 "CCG ARCHIVE     " 85 2A',
            '12   "GAMES"             PRG',
            '8    "MAGAZINES"         PRG',
            '6    "DEMOSCENE"         PRG',
            '4    "BBS"               PRG',
            '1    "CHEEKY"            PRG',
            "664 BLOCKS FREE.",
            "READY.",
        ].forEach(line => appendLine(output, line));
    };

    const execute = raw => {
        const printable = String(raw || "").trim();
        const command = printable.toUpperCase().replace(/\s+/g, "");
        if (!command) return;
        appendLine(output, ">" + printable, "is-command");

        if (command === 'LOAD"$",8' || command === "DIRECTORY" || command === "DIR" || command === "LIST") {
            directory();
            return;
        }
        if (command === 'LOAD"*",8,1' || command === "RUN") {
            activity(950);
            appendLine(output, "SEARCHING FOR *");
            appendLine(output, "LOADING");
            clearTimeout(delayedLine);
            delayedLine = setTimeout(() => {
                appendLine(output, "READY.");
                appendLine(output, "CCG ARCHIVE PROGRAM LOADED.", "is-success");
            }, 450);
            return;
        }
        if (command === "OPEN15,8,15" || command === "STATUS") {
            activity(380);
            appendLine(output, "00, OK,00,00");
            return;
        }
        if (command === "GAMES") {
            appendLine(output, "OPENING GAME ARCHIVE...", "is-success");
            const link = document.createElement("a");
            link.href = siteRoot + "games/";
            link.textContent = "OPEN CCG GAMES";
            link.className = "ccg-e11__terminal-link";
            output.appendChild(link);
            return;
        }
        if (command === "FORMAT") {
            appendLine(output, "ABSOLUTELY NOT. THAT DISK HAS HISTORY.", "is-error");
            return;
        }
        activity(320);
        appendLine(output, "30,SYNTAX ERROR,00,00", "is-error");
    };

    quick.append(
        button("DIRECTORY", "DIRECTORY"),
        button("LOAD", 'LOAD"*",8,1'),
        button("STATUS", "STATUS"),
        button("GAMES", "GAMES")
    );

    const onSubmit = event => {
        event.preventDefault();
        const value = input.value;
        input.value = "";
        execute(value);
    };
    form.addEventListener("submit", onSubmit);
    cleanup.add(() => form.removeEventListener("submit", onSubmit));

    const onQuick = event => {
        const target = event.target.closest("[data-e11-action]");
        if (target) execute(target.dataset.e11Action);
    };
    quick.addEventListener("click", onQuick);
    cleanup.add(() => quick.removeEventListener("click", onQuick));

    appendLine(output, "1541-II DOS V2.6");
    appendLine(output, "READY.");

    cleanup.add(() => {
        clearTimeout(activityTimer);
        clearTimeout(delayedLine);
        safeCloseAudio(audio);
    });

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => input.focus({ preventScroll: true }),
    };
}
