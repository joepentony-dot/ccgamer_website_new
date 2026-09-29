import { appendLine, audioContext, button, cleanupBag, noiseBurst, safeCloseAudio, terminalShell, tone } from "./common.js";

export function createExperience({ onLaunch } = {}) {
    const root = terminalShell("CCG MODEM TERMINAL", "HAYES COMPATIBLE · 2400 BPS");
    root.classList.add("ccg-e11--modem");
    const output = root.querySelector("[data-terminal-output]");
    const form = root.querySelector("[data-terminal-form]");
    const input = root.querySelector("[data-terminal-input]");
    const quick = root.querySelector("[data-terminal-quick]");
    const cleanup = cleanupBag();
    const audio = audioContext();
    let connected = false;
    let connectTimer = 0;
    let noiseTimer = 0;

    const handshake = () => {
        if (!audio) return;
        if (audio.state === "suspended") audio.resume().catch(() => {});
        [1100,1500,980,1750,1200,2100].forEach((frequency, index) => {
            tone(audio, frequency, 0.16, index % 2 ? "sine" : "square", 0.015, index * 0.12);
        });
        clearTimeout(noiseTimer);
        noiseTimer = setTimeout(() => noiseBurst(audio, 0.6, 0.018), 420);
    };

    const connect = () => {
        clearTimeout(connectTimer);
        appendLine(output, "DIALING 0161-64-1985...");
        handshake();
        connectTimer = setTimeout(() => {
            connected = true;
            appendLine(output, "CONNECT 2400", "is-success");
            appendLine(output, "CARRIER DETECTED. TYPE BBS OR PRESS ENTER BBS.");
        }, 950);
    };

    const execute = raw => {
        const command = String(raw || "").trim().toUpperCase();
        if (!command) return;
        appendLine(output, "> " + command, "is-command");

        if (/^ATDT/.test(command) || command === "DIAL") {
            connect();
            return;
        }
        if (command === "ATI") {
            appendLine(output, "CCG MODEM EMULATOR REV 1985");
            return;
        }
        if (command === "ATH") {
            clearTimeout(connectTimer);
            connectTimer = 0;
            connected = false;
            appendLine(output, "NO CARRIER");
            return;
        }
        if (command === "BBS" && connected) {
            appendLine(output, "HANDING OFF TO CCG BBS...", "is-success");
            onLaunch?.("bbs");
            return;
        }
        if (command === "BBS") {
            appendLine(output, "NO CARRIER. DIAL FIRST.", "is-error");
            return;
        }
        if (command === "AT") {
            appendLine(output, "OK");
            return;
        }
        appendLine(output, "ERROR", "is-error");
    };

    quick.append(
        button("DIAL", "ATDT0161641985"),
        button("ENTER BBS", "BBS"),
        button("HANG UP", "ATH")
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

    appendLine(output, "CCG MODEM READY.");
    appendLine(output, "TYPE AT OR PRESS DIAL.");
    cleanup.add(() => {
        clearTimeout(connectTimer);
        clearTimeout(noiseTimer);
        safeCloseAudio(audio);
    });

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => input.focus({ preventScroll: true }),
    };
}
