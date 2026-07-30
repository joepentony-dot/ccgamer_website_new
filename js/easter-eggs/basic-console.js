/* CCG EASTER EGG E2 BASIC CONSOLE */
export function createBasicConsoleExperience({ siteRoot = "/", prefersReducedMotion = false } = {}) {
    const root = document.createElement("section");
    root.className = "ccg-basic-console";
    root.setAttribute("aria-label", "Commodore 64 BASIC console");
    root.innerHTML = `
        <div class="ccg-basic-console__screen" data-basic-screen>
            <div class="ccg-basic-console__output" data-basic-output aria-live="polite"></div>
            <form class="ccg-basic-console__entry" data-basic-form autocomplete="off">
                <label class="ccg-basic-console__prompt" for="ccg-basic-input">READY.</label>
                <div class="ccg-basic-console__line">
                    <span aria-hidden="true">&gt;</span>
                    <input id="ccg-basic-input" data-basic-input inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="80" aria-label="BASIC command" />
                </div>
            </form>
        </div>
        <div class="ccg-basic-console__keys" aria-label="Quick BASIC commands">
            <button type="button" data-basic-command="LIST">LIST</button>
            <button type="button" data-basic-command="RUN">RUN</button>
            <button type="button" data-basic-command='LOAD"*",8,1'>LOAD"*",8,1</button>
            <button type="button" data-basic-command="SYS 64738">SYS 64738</button>
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
    let destroyed = false;
    let runningTimer = 0;

    const lines = [
        "10 PRINT CHR$(147)",
        "20 PRINT \"CHEEKY COMMODORE GAMER\"",
        "30 PRINT \"651 GAMES READY\"",
        "40 PRINT \"STAY RETRO\"",
        "50 GOTO 20"
    ];

    const append = (text = "", className = "") => {
        const line = document.createElement("div");
        line.className = `ccg-basic-console__output-line ${className}`.trim();
        line.textContent = text;
        output.appendChild(line);
        screen.scrollTop = screen.scrollHeight;
    };

    const resetColours = () => {
        root.style.setProperty("--ccg-basic-border", defaultBorder);
        root.style.setProperty("--ccg-basic-bg", defaultBackground);
    };

    const stopRun = () => {
        if (runningTimer) window.clearInterval(runningTimer);
        runningTimer = 0;
    };

    const runProgram = () => {
        stopRun();
        output.replaceChildren();
        let pass = 0;
        const render = () => {
            if (destroyed) return;
            output.replaceChildren();
            append("CHEEKY COMMODORE GAMER", "is-title");
            append("651 GAMES READY");
            append("STAY RETRO");
            append("");
            append(`RUN ${String(++pass).padStart(2, "0")}`);
        };
        render();
        if (!prefersReducedMotion) runningTimer = window.setInterval(render, 900);
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
            screen.scrollTop = screen.scrollHeight;
        } catch (error) {
            append("?LOAD ERROR", "is-error");
        }
    };

    const setColour = (address, value) => {
        const colour = palette[value];
        if (!colour) {
            append("?ILLEGAL QUANTITY ERROR", "is-error");
            return;
        }
        if (address === 53280) root.style.setProperty("--ccg-basic-border", colour);
        if (address === 53281) root.style.setProperty("--ccg-basic-bg", colour);
        append("READY.");
    };

    const execute = async raw => {
        stopRun();
        const command = String(raw || "").trim();
        const upper = command.toUpperCase().replace(/\s+/g, " ");
        if (!upper) return;
        append(`>${command.toUpperCase()}`, "is-command");

        if (upper === "HELP") {
            append("LIST  RUN  NEW");
            append('LOAD"*",8,1');
            append("SYS 64738");
            append("POKE 53280,N  POKE 53281,N");
            append("CLS  ABOUT");
        } else if (upper === "LIST") {
            lines.forEach(line => append(line));
        } else if (upper === "RUN") {
            runProgram();
        } else if (upper === "NEW") {
            output.replaceChildren();
            append("READY.");
        } else if (upper === "CLS" || upper === "PRINT CHR$(147)") {
            output.replaceChildren();
        } else if (/^LOAD\s*"\*"\s*,\s*8\s*,\s*1$/.test(upper)) {
            await randomGame();
        } else if (upper === "SYS 64738" || upper === "SYS64738") {
            append("RESETTING CCG SYSTEM...");
            window.setTimeout(() => {
                if (destroyed) return;
                output.replaceChildren();
                append("**** COMMODORE 64 BASIC V2 ****", "is-title");
                append("64K RAM SYSTEM  38911 BASIC BYTES FREE");
                append("");
                append("READY.");
                resetColours();
            }, prefersReducedMotion ? 0 : 650);
        } else if (upper === "ABOUT") {
            append("CCG OMEGA EASTER EGG E2");
            append("LOCAL. MOBILE SAFE. NO EXTERNAL RUNTIME.");
        } else {
            const poke = upper.match(/^POKE\s+(53280|53281)\s*,\s*(\d{1,2})$/);
            if (poke) setColour(Number(poke[1]), Number(poke[2]));
            else append("?SYNTAX ERROR", "is-error");
        }
        screen.scrollTop = screen.scrollHeight;
    };

    form.addEventListener("submit", event => {
        event.preventDefault();
        const value = input.value;
        input.value = "";
        execute(value);
    });

    root.querySelectorAll("[data-basic-command]").forEach(button => {
        button.addEventListener("click", () => execute(button.dataset.basicCommand || ""));
    });

    resetColours();
    append("**** COMMODORE 64 BASIC V2 ****", "is-title");
    append("64K RAM SYSTEM  38911 BASIC BYTES FREE");
    append("");
    append("TYPE HELP FOR COMMANDS");
    append("");

    return {
        content: root,
        focus: () => input.focus({ preventScroll: true }),
        cleanup: () => {
            destroyed = true;
            stopRun();
        }
    };
}
