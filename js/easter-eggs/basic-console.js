/* CCG EASTER EGG E2 BASIC CONSOLE */
export function createBasicConsoleExperience({ siteRoot = "/", prefersReducedMotion = false } = {}) {
    const root = document.createElement("section");
    root.className = "ccg-basic-console";
    root.setAttribute("aria-label", "Interactive Commodore 64 BASIC console");
    root.innerHTML = `
        <div class="ccg-basic-console__screen" data-basic-screen>
            <div class="ccg-basic-console__output" data-basic-output aria-live="polite"></div>
            <form class="ccg-basic-console__entry" data-basic-form autocomplete="off">
                <label class="ccg-basic-console__prompt" for="ccg-basic-input">READY.</label>
                <div class="ccg-basic-console__line">
                    <span aria-hidden="true">&gt;</span>
                    <input id="ccg-basic-input" data-basic-input inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="120" aria-label="BASIC command" />
                </div>
            </form>
        </div>
        <div class="ccg-basic-console__keys" aria-label="Quick BASIC commands">
            <button type="button" data-basic-command="LIST">LIST</button>
            <button type="button" data-basic-command="RUN">RUN</button>
            <button type="button" data-basic-command="MAZE">10 PRINT MAZE</button>
            <button type="button" data-basic-command="RAINBOW">RAINBOW POKE</button>
            <button type="button" data-basic-command='PRINT "HELLO CCG"'>PRINT</button>
            <button type="button" data-basic-command="PRINT RND(1)">RND</button>
            <button type="button" data-basic-command='LOAD"*",8,1'>LOAD GAME</button>
            <button type="button" data-basic-command="HELP">HELP</button>
        </div>
    `;

    const output = root.querySelector("[data-basic-output]");
    const form = root.querySelector("[data-basic-form]");
    const input = root.querySelector("[data-basic-input]");
    const screen = root.querySelector("[data-basic-screen]");
    const defaultBorder = "#6c5eb5";
    const defaultBackground = "#352879";
    const palette = ["#000000", "#ffffff", "#8b4131", "#7bbdc5", "#8b41ac", "#6aac41", "#3931a4", "#d5de73", "#945a20", "#5a4100", "#bd736a", "#525252", "#838383", "#acee8b", "#7b73de", "#acacac"];
    const colourState = { 53280: 14, 53281: 6 };
    const defaultProgram = new Map([
        [10, 'PRINT CHR$(147)'],
        [20, 'PRINT "CHEEKY COMMODORE GAMER"'],
        [30, 'PRINT "651 GAMES READY"'],
        [40, 'FOR I=1 TO 5:PRINT I:NEXT'],
        [50, 'PRINT "STAY RETRO"']
    ]);

    let program = new Map(defaultProgram);
    let destroyed = false;
    let runningTimer = 0;
    let rainbowTimer = 0;
    let audioContext = null;

    const keepOutputBounded = () => {
        while (output.childElementCount > 180) output.firstElementChild?.remove();
    };

    const scrollOutput = () => {
        requestAnimationFrame(() => {
            screen.scrollTop = screen.scrollHeight;
        });
    };

    const append = (text = "", className = "") => {
        const line = document.createElement("div");
        line.className = `ccg-basic-console__output-line ${className}`.trim();
        line.textContent = text;
        output.appendChild(line);
        keepOutputBounded();
        scrollOutput();
        return line;
    };

    const ready = () => append("READY.", "is-ready");

    const resetColours = () => {
        colourState[53280] = 14;
        colourState[53281] = 6;
        root.style.setProperty("--ccg-basic-border", defaultBorder);
        root.style.setProperty("--ccg-basic-bg", defaultBackground);
    };

    const stopEffects = () => {
        if (runningTimer) window.clearInterval(runningTimer);
        if (rainbowTimer) window.clearInterval(rainbowTimer);
        runningTimer = 0;
        rainbowTimer = 0;
        root.classList.remove("is-maze-running", "is-rainbow-running");
    };

    const getAudioContext = () => {
        try {
            audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
            return audioContext;
        } catch (_) {
            return null;
        }
    };

    const beep = (frequency = 440, duration = 0.12) => {
        const context = getAudioContext();
        if (!context) return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.02);
    };

    const setColour = (address, value, announce = true) => {
        const colour = palette[value];
        if (!colour) {
            append("?ILLEGAL QUANTITY ERROR", "is-error");
            return false;
        }
        colourState[address] = value;
        if (address === 53280) root.style.setProperty("--ccg-basic-border", colour);
        if (address === 53281) root.style.setProperty("--ccg-basic-bg", colour);
        if (announce) ready();
        return true;
    };

    const runMaze = () => {
        stopEffects();
        output.replaceChildren();
        root.classList.add("is-maze-running");
        append('10 PRINT CHR$(205.5+RND(1)); : GOTO 10', "is-command");
        append("");

        const renderLine = () => {
            if (destroyed) return;
            const width = Math.max(18, Math.min(42, Math.floor(output.clientWidth / 15)));
            let maze = "";
            for (let index = 0; index < width; index += 1) {
                maze += Math.random() < 0.5 ? "╲" : "╱";
            }
            append(maze, "is-maze");
        };

        for (let row = 0; row < 10; row += 1) renderLine();
        if (!prefersReducedMotion) runningTimer = window.setInterval(renderLine, 115);
    };

    const runRainbow = () => {
        stopEffects();
        root.classList.add("is-rainbow-running");
        append("POKE 53280,I : POKE 53281,15-I", "is-command");
        let colour = 0;
        const cycle = () => {
            setColour(53280, colour % 16, false);
            setColour(53281, 15 - (colour % 16), false);
            colour += 1;
        };
        cycle();
        if (!prefersReducedMotion) rainbowTimer = window.setInterval(cycle, 180);
        ready();
    };

    const randomGame = async () => {
        append("SEARCHING GAME ARCHIVE...");
        try {
            const response = await fetch(`${siteRoot}games/games.json`, { credentials: "same-origin" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const games = await response.json();
            const eligible = games.filter(game => game && game.slug && game.title);
            if (!eligible.length) throw new Error("No eligible games");
            const game = eligible[Math.floor(Math.random() * eligible.length)];
            append(`FOUND: ${String(game.title).toUpperCase()}`, "is-success");
            const link = document.createElement("a");
            link.className = "ccg-basic-console__launch";
            link.href = `${siteRoot}games/${game.slug}/`;
            link.textContent = "OPEN RANDOM GAME";
            output.appendChild(link);
            scrollOutput();
        } catch (_) {
            append("?LOAD ERROR", "is-error");
        }
    };

    const characterForCode = value => {
        const rounded = Math.round(Number(value));
        if (rounded === 147) return "";
        if (rounded === 205) return "╲";
        if (rounded === 206) return "╱";
        if (rounded >= 32 && rounded <= 126) return String.fromCharCode(rounded);
        return "◆";
    };

    const executePrint = expression => {
        const value = String(expression || "").trim().replace(/;$/, "");
        const quoted = value.match(/^"([\s\S]*)"$/);
        if (quoted) {
            append(quoted[1]);
            return true;
        }

        if (/^RND\s*\(\s*1\s*\)$/i.test(value)) {
            append(Math.random().toFixed(8));
            return true;
        }

        const peek = value.match(/^PEEK\s*\(\s*(\d+)\s*\)$/i);
        if (peek) {
            const address = Number(peek[1]);
            append(String(colourState[address] ?? Math.floor(Math.random() * 256)));
            return true;
        }

        const chr = value.match(/^CHR\$\s*\(\s*([\d.]+)\s*\)$/i);
        if (chr) {
            const code = Number(chr[1]);
            if (Math.round(code) === 147) output.replaceChildren();
            else append(characterForCode(code));
            return true;
        }

        if (/^[\d\s()+\-*/.]+$/.test(value)) {
            try {
                const result = Function(`"use strict"; return (${value});`)();
                if (Number.isFinite(result)) {
                    append(String(result));
                    return true;
                }
            } catch (_) {}
        }

        return false;
    };

    const executeStatement = async statement => {
        const command = String(statement || "").trim();
        const upper = command.toUpperCase().replace(/\s+/g, " ");
        if (!upper || upper === "REM") return true;

        if (upper.startsWith("PRINT ")) return executePrint(command.slice(command.search(/PRINT/i) + 5));
        if (upper === "PRINT") {
            append("");
            return true;
        }

        const poke = upper.match(/^POKE\s+(53280|53281)\s*,\s*(\d{1,2})$/);
        if (poke) return setColour(Number(poke[1]), Number(poke[2]), false);

        const loop = upper.match(/^FOR\s+([A-Z])\s*=\s*(-?\d+)\s+TO\s+(-?\d+)\s*:\s*PRINT\s+\1\s*:\s*NEXT(?:\s+\1)?$/);
        if (loop) {
            const start = Number(loop[2]);
            const end = Number(loop[3]);
            const direction = start <= end ? 1 : -1;
            const limit = Math.min(50, Math.abs(end - start) + 1);
            for (let index = 0, value = start; index < limit; index += 1, value += direction) append(String(value));
            return true;
        }

        if (/^LOAD\s*"\*"\s*,\s*8\s*,\s*1$/.test(upper)) {
            await randomGame();
            return true;
        }

        if (upper === "BEEP") {
            beep(440, 0.16);
            return true;
        }

        if (upper === "CLS" || upper === "PRINT CHR$(147)") {
            output.replaceChildren();
            return true;
        }

        return false;
    };

    const runProgram = async () => {
        stopEffects();
        const sorted = [...program.entries()].sort((a, b) => a[0] - b[0]);
        if (!sorted.length) {
            append("?NO PROGRAM ERROR", "is-error");
            return;
        }

        if (sorted.some(([, statement]) => /CHR\$\s*\(\s*205\.5\s*\+\s*RND\s*\(\s*1\s*\)\s*\)/i.test(statement))) {
            runMaze();
            return;
        }

        output.replaceChildren();
        for (const [, statement] of sorted) {
            if (destroyed) return;
            const parts = statement.split(":").map(part => part.trim()).filter(Boolean);
            for (const part of parts) {
                if (/^GOTO\b/i.test(part)) continue;
                const handled = await executeStatement(part);
                if (!handled) append(`?SYNTAX ERROR IN ${part}`, "is-error");
            }
        }
        ready();
    };

    const listProgram = () => {
        stopEffects();
        [...program.entries()]
            .sort((a, b) => a[0] - b[0])
            .forEach(([line, statement]) => append(`${line} ${statement}`));
        ready();
    };

    const showHelp = () => {
        append("C64 BASIC V2 COMMANDS", "is-title");
        append("LIST  RUN  NEW  STOP  CLS");
        append('PRINT "TEXT"   PRINT 2+2');
        append("PRINT RND(1)   PRINT PEEK(53280)");
        append("POKE 53280,N   POKE 53281,N");
        append("FOR I=1 TO 10:PRINT I:NEXT");
        append('LOAD"*",8,1   SYS 64738');
        append("BEEP  ABOUT");
        append("MAZE AND RAINBOW ARE CCG SHORTCUTS");
        ready();
    };

    const execute = async raw => {
        const command = String(raw || "").trim();
        const upper = command.toUpperCase().replace(/\s+/g, " ");
        if (!upper) return;
        append(`>${command.toUpperCase()}`, "is-command");

        const numbered = command.match(/^(\d{1,5})\s*(.*)$/);
        if (numbered) {
            stopEffects();
            const number = Number(numbered[1]);
            const statement = numbered[2].trim();
            if (statement) program.set(number, statement.toUpperCase());
            else program.delete(number);
            ready();
            return;
        }

        if (upper === "HELP") showHelp();
        else if (upper === "LIST") listProgram();
        else if (upper === "RUN") await runProgram();
        else if (upper === "MAZE") {
            program = new Map([[10, "PRINT CHR$(205.5+RND(1)); : GOTO 10"]]);
            runMaze();
        } else if (upper === "RAINBOW") runRainbow();
        else if (upper === "STOP") {
            stopEffects();
            append("BREAK IN 10");
            ready();
        } else if (upper === "NEW") {
            stopEffects();
            program = new Map();
            output.replaceChildren();
            ready();
        } else if (upper === "DEMO") {
            stopEffects();
            program = new Map(defaultProgram);
            append("CCG DEMO PROGRAM RESTORED");
            ready();
        } else if (upper === "CLS" || upper === "PRINT CHR$(147)") {
            stopEffects();
            output.replaceChildren();
        } else if (/^LOAD\s*"\*"\s*,\s*8\s*,\s*1$/.test(upper)) {
            stopEffects();
            await randomGame();
        } else if (upper === "SYS 64738" || upper === "SYS64738") {
            stopEffects();
            append("RESETTING CCG SYSTEM...");
            window.setTimeout(() => {
                if (destroyed) return;
                output.replaceChildren();
                program = new Map(defaultProgram);
                resetColours();
                append("**** COMMODORE 64 BASIC V2 ****", "is-title");
                append("64K RAM SYSTEM  38911 BASIC BYTES FREE");
                append("");
                ready();
            }, prefersReducedMotion ? 0 : 500);
        } else if (upper === "ABOUT") {
            append("CCG OMEGA EASTER EGG E2");
            append("A LOCAL C64 BASIC PLAYGROUND");
            append("TYPE HELP OR TRY 10 PRINT");
            ready();
        } else if (upper === "BEEP") {
            beep(440, 0.16);
            ready();
        } else {
            const handled = await executeStatement(command);
            if (handled) ready();
            else append("?SYNTAX ERROR", "is-error");
        }
        scrollOutput();
    };

    form.addEventListener("submit", event => {
        event.preventDefault();
        const value = input.value;
        input.value = "";
        void execute(value);
    });

    root.querySelectorAll("[data-basic-command]").forEach(button => {
        button.addEventListener("click", () => {
            void execute(button.dataset.basicCommand || "");
            input.focus({ preventScroll: true });
        });
    });

    root.addEventListener("pointerdown", () => {
        const context = getAudioContext();
        if (context?.state === "suspended") context.resume().catch(() => {});
    }, { once: true });

    resetColours();
    append("**** COMMODORE 64 BASIC V2 ****", "is-title");
    append("64K RAM SYSTEM  38911 BASIC BYTES FREE");
    append("TYPE HELP — OR PRESS 10 PRINT MAZE");
    append("");

    return {
        content: root,
        focus: () => input.focus({ preventScroll: true }),
        cleanup: () => {
            destroyed = true;
            stopEffects();
            if (audioContext && audioContext.state !== "closed") audioContext.close().catch(() => {});
        }
    };
}