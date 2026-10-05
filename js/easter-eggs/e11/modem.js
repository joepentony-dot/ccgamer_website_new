import { appendLine, audioContext, button, cleanupBag, noiseBurst, safeCloseAudio, terminalShell, tone } from "./common.js";

export function createExperience({ onLaunch } = {}) {
    const root = terminalShell("CCG MODEM TERMINAL", "HAYES COMPATIBLE · V.22bis · 2400 BPS");
    root.classList.add("ccg-e11--modem");
    const titlebar = root.querySelector(".ccg-e11__titlebar");
    const output = root.querySelector("[data-terminal-output]");
    const form = root.querySelector("[data-terminal-form]");
    const input = root.querySelector("[data-terminal-input]");
    const quick = root.querySelector("[data-terminal-quick]");
    const cleanup = cleanupBag();
    const audio = audioContext();
    let connected = false;
    let dialing = false;
    let connectTimer = 0;
    let noiseTimer = 0;
    const stageTimers = [];

    const panel = document.createElement("div");
    panel.className = "ccg-e11__modem-panel";
    panel.innerHTML =
        '<div class="ccg-e11__modem-brand"><strong>CCG 2400</strong><span>DATA/FAX MODEM</span></div>' +
        '<div class="ccg-e11__modem-lights">' +
            ['AA','CD','OH','RD','SD','TR','MR'].map(label => '<span><i data-modem-led="' + label + '"></i>' + label + '</span>').join('') +
        '</div>' +
        '<div class="ccg-e11__modem-link"><span data-modem-stage>READY</span><div><i data-modem-progress></i></div><b data-modem-rate>2400</b></div>';
    titlebar.insertAdjacentElement("afterend", panel);

    const stageText = root.querySelector("[data-modem-stage]");
    const stageProgress = root.querySelector("[data-modem-progress]");
    const rate = root.querySelector("[data-modem-rate]");
    const led = name => root.querySelector('[data-modem-led="' + name + '"]');
    led("MR")?.classList.add("is-on");
    led("TR")?.classList.add("is-on");

    const clearStages = () => {
        while (stageTimers.length) clearTimeout(stageTimers.pop());
    };

    const setStage = (text, progress) => {
        stageText.textContent = text;
        stageProgress.style.width = Math.max(0, Math.min(100, progress)) + "%";
    };

    const handshake = () => {
        if (!audio) return;
        if (audio.state === "suspended") audio.resume().catch(() => {});
        [1100, 1500, 980, 1750, 1200, 2100, 1320, 1880].forEach((frequency, index) => {
            tone(audio, frequency, 0.12, index % 2 ? "sine" : "square", 0.012, index * 0.09);
        });
        clearTimeout(noiseTimer);
        noiseTimer = setTimeout(() => noiseBurst(audio, 0.55, 0.018), 360);
    };

    const disconnect = (message = "NO CARRIER") => {
        clearTimeout(connectTimer);
        connectTimer = 0;
        clearStages();
        dialing = false;
        connected = false;
        led("OH")?.classList.remove("is-on");
        led("CD")?.classList.remove("is-on");
        led("RD")?.classList.remove("is-on");
        led("SD")?.classList.remove("is-on");
        setStage("OFFLINE", 0);
        rate.textContent = "----";
        appendLine(output, message);
    };

    const connect = () => {
        clearTimeout(connectTimer);
        clearStages();
        if (connected) disconnect("NO CARRIER");
        dialing = true;
        connected = false;
        rate.textContent = "2400";
        led("OH")?.classList.add("is-on");
        led("SD")?.classList.add("is-on");
        setStage("DIALING", 12);
        appendLine(output, "DIALING 0161-64-1985...");
        handshake();

        const stages = [
            [140, "WAITING FOR CARRIER", 28, "RD"],
            [330, "ANSWER TONE", 45, "RD"],
            [520, "NEGOTIATING V.22bis", 67, "SD"],
            [710, "TRAINING", 84, "RD"],
        ];
        stages.forEach(([delay, text, progress, light]) => {
            stageTimers.push(setTimeout(() => {
                if (!dialing) return;
                setStage(text, progress);
                led(light)?.classList.add("is-on");
                setTimeout(() => led(light)?.classList.remove("is-on"), 90);
            }, delay));
        });

        connectTimer = setTimeout(() => {
            if (!dialing) return;
            dialing = false;
            connected = true;
            led("OH")?.classList.add("is-on");
            led("CD")?.classList.add("is-on");
            setStage("CARRIER LOCKED", 100);
            appendLine(output, "CONNECT 2400", "is-success");
            appendLine(output, "V.22bis · 8N1 · CARRIER DETECTED");
            appendLine(output, "TYPE BBS OR PRESS ENTER BBS.", "is-dim");
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
        if (command === "ATI" || command === "ATI0") {
            appendLine(output, "CCG 2400 DATA MODEM");
            appendLine(output, "ROM REV 1.985 · V.22bis · HAYES COMMAND SET");
            appendLine(output, "OK");
            return;
        }
        if (command === "ATI3") {
            appendLine(output, "CCG-MODEM-2400 FIRMWARE 05.10.26");
            appendLine(output, "OK");
            return;
        }
        if (command === "ATZ" || command === "AT&F") {
            disconnect("RESETTING MODEM...");
            led("MR")?.classList.add("is-on");
            led("TR")?.classList.add("is-on");
            appendLine(output, "OK", "is-success");
            setStage("READY", 0);
            rate.textContent = "2400";
            return;
        }
        if (command === "ATS0?" || command === "ATS0") {
            appendLine(output, "0");
            appendLine(output, "OK");
            return;
        }
        if (command === "ATH" || command === "ATH0") {
            disconnect();
            return;
        }
        if (command === "+++" && connected) {
            appendLine(output, "OK");
            appendLine(output, "COMMAND MODE");
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
        if (command === "AT" || command === "ATV1" || command === "ATE1") {
            appendLine(output, "OK");
            return;
        }
        if (command === "HELP") {
            appendLine(output, "AT  ATI  ATZ  AT&F  ATDT<number>  ATH  ATS0?  BBS");
            return;
        }
        appendLine(output, "ERROR", "is-error");
    };

    quick.append(
        button("DIAL", "ATDT0161641985"),
        button("ENTER BBS", "BBS"),
        button("INFO", "ATI"),
        button("RESET", "ATZ"),
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

    appendLine(output, "CCG MODEM READY.", "is-heading");
    appendLine(output, "HAYES COMPATIBLE COMMAND MODE · 2400 BPS");
    appendLine(output, "TYPE AT, ATI OR PRESS DIAL.", "is-dim");
    cleanup.add(() => {
        clearTimeout(connectTimer);
        clearTimeout(noiseTimer);
        clearStages();
        safeCloseAudio(audio);
    });

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => input.focus({ preventScroll: true }),
    };
}
