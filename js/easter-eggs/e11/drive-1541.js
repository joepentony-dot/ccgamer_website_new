import { appendLine, audioContext, button, cleanupBag, noiseBurst, safeCloseAudio, tone } from "./common.js";

export function createExperience({ siteRoot = "/", prefersReducedMotion = false } = {}) {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--1541";
    root.innerHTML =
        '<div class="ccg-e11__drive">' +
            '<div class="ccg-e11__drive-face">' +
                '<div class="ccg-e11__drive-topline"><div class="ccg-e11__drive-badge">commodore 1541</div><span>single drive floppy disk</span></div>' +
                '<div class="ccg-e11__drive-slot"><div class="ccg-e11__disk-label"><b>CCG ARCHIVE</b><span>5¼″ FLOPPY · SIDE A</span></div><i class="ccg-e11__drive-spindle" data-drive-spindle></i></div>' +
                '<div class="ccg-e11__drive-controls">' +
                    '<span><i class="ccg-e11__power-led is-on"></i>POWER</span>' +
                    '<span><i class="ccg-e11__drive-led" data-drive-led aria-label="Drive activity light"></i>DRIVE</span>' +
                '</div>' +
                '<div class="ccg-e11__drive-head" data-drive-head></div>' +
                '<div class="ccg-e11__drive-telemetry">' +
                    '<span>TRACK <b data-drive-track>18</b></span>' +
                    '<span>SECTOR <b data-drive-sector>00</b></span>' +
                    '<span>MOTOR <b data-drive-motor>OFF</b></span>' +
                    '<span>STATUS <b data-drive-status>00 OK</b></span>' +
                '</div>' +
                '<div class="ccg-e11__drive-map" data-drive-map aria-label="Disk block usage map"></div>' +
            '</div>' +
            '<div class="ccg-e11__drive-terminal">' +
                '<div class="ccg-e11__drive-terminal-head"><span>IEC DEVICE #8</span><span>DOS 2.6 · 664 BLOCKS FREE</span></div>' +
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
    const spindle = root.querySelector("[data-drive-spindle]");
    const trackReadout = root.querySelector("[data-drive-track]");
    const sectorReadout = root.querySelector("[data-drive-sector]");
    const motorReadout = root.querySelector("[data-drive-motor]");
    const statusReadout = root.querySelector("[data-drive-status]");
    const map = root.querySelector("[data-drive-map]");
    const cleanup = cleanupBag();
    const audio = audioContext();
    let activityTimer = 0;
    let delayedLine = 0;
    let track = 18;
    let sector = 0;

    for (let index = 0; index < 84; index += 1) {
        const block = document.createElement("i");
        block.className = "ccg-e11__drive-block";
        if (index < 31 || [42, 43, 55, 68].includes(index)) block.classList.add("is-used");
        map.appendChild(block);
    }

    const setStatus = (text, bad = false) => {
        statusReadout.textContent = text;
        statusReadout.classList.toggle("is-bad", bad);
    };

    const activity = (milliseconds = 650, targetTrack) => {
        track = Number.isInteger(targetTrack) ? targetTrack : Math.max(1, Math.min(35, track + (track % 2 ? 5 : -3)));
        sector = (sector + 7) % 21;
        trackReadout.textContent = String(track).padStart(2, "0");
        sectorReadout.textContent = String(sector).padStart(2, "0");
        motorReadout.textContent = "ON";
        led.classList.add("is-on");
        spindle.classList.add("is-spinning");
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
            spindle.classList.remove("is-spinning");
            motorReadout.textContent = "OFF";
        }, milliseconds);
    };

    const directory = () => {
        activity(780, 18);
        setStatus("00 OK");
        [
            '0 "CCG ARCHIVE     " 85 2A',
            '12   "GAMES"             PRG',
            '8    "MAGAZINES"         PRG',
            '6    "DEMOSCENE"         PRG',
            '4    "BBS"               PRG',
            '3    "SID LAB"           PRG',
            '2    "SPRITE EDITOR"     PRG',
            '1    "CHEEKY"            PRG',
            "664 BLOCKS FREE.",
            "READY.",
        ].forEach(line => appendLine(output, line));
    };

    const showStatus = () => {
        activity(320, 18);
        setStatus("00 OK");
        appendLine(output, "00, OK,00,00");
        appendLine(output, "DEVICE 8 · TRACK " + track + " · SECTOR " + sector + " · WRITE PROTECT ON", "is-dim");
    };

    const validate = () => {
        activity(1150, 35);
        appendLine(output, "VALIDATING BAM...");
        appendLine(output, "31 FILE ENTRIES CHECKED.");
        appendLine(output, "0 ORPHANED BLOCKS.", "is-success");
        appendLine(output, "00, OK,00,00");
        setStatus("00 OK");
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
            activity(1050, 1);
            setStatus("00 OK");
            appendLine(output, "SEARCHING FOR *");
            appendLine(output, "LOADING");
            clearTimeout(delayedLine);
            delayedLine = setTimeout(() => {
                appendLine(output, "READY.");
                appendLine(output, "CCG ARCHIVE PROGRAM LOADED.", "is-success");
                appendLine(output, "SYS 2061", "is-dim");
            }, 450);
            return;
        }
        if (command === "OPEN15,8,15" || command === "STATUS" || command === "M-R") {
            showStatus();
            return;
        }
        if (command === "VALIDATE" || command === "V0") {
            validate();
            return;
        }
        if (command === "INITIALIZE" || command === "I0" || command === "RESET") {
            activity(800, 18);
            setStatus("00 OK");
            appendLine(output, "DRIVE INITIALIZED.", "is-success");
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
        if (command === "FORMAT" || /^N0:/.test(command)) {
            setStatus("26 WRITE PROTECT", true);
            appendLine(output, "26,WRITE PROTECT ON,00,00", "is-error");
            appendLine(output, "THE ARCHIVE DISK HAS SURVIVED THIS LONG. LEAVE IT ALONE.", "is-dim");
            return;
        }
        if (command === "SCRATCH" || /^S0:/.test(command)) {
            setStatus("26 WRITE PROTECT", true);
            appendLine(output, "26,WRITE PROTECT ON,00,00", "is-error");
            return;
        }
        activity(320);
        setStatus("30 SYNTAX ERROR", true);
        appendLine(output, "30,SYNTAX ERROR,00,00", "is-error");
        appendLine(output, "TRY DIRECTORY, LOAD, STATUS, VALIDATE OR INITIALIZE.", "is-dim");
    };

    quick.append(
        button("DIRECTORY", "DIRECTORY"),
        button("LOAD", 'LOAD"*",8,1'),
        button("STATUS", "STATUS"),
        button("VALIDATE", "VALIDATE"),
        button("INITIALIZE", "INITIALIZE"),
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

    appendLine(output, "**** COMMODORE 64 BASIC V2 ****", "is-heading");
    appendLine(output, " 64K RAM SYSTEM  38911 BASIC BYTES FREE");
    appendLine(output, "");
    appendLine(output, "1541 DOS V2.6 · DEVICE 8 READY.");
    appendLine(output, "TYPE DIRECTORY, STATUS, VALIDATE OR LOAD.", "is-dim");
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
