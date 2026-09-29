import { appendLine, button, cleanupBag, terminalShell } from "./common.js";

export function createExperience({ siteRoot = "/", onLaunch } = {}) {
    const root = terminalShell("CHEEKY COMMODORE GAMER BBS", "2400 BAUD · CALLER #1985");
    root.classList.add("ccg-e11--bbs");
    const output = root.querySelector("[data-terminal-output]");
    const form = root.querySelector("[data-terminal-form]");
    const input = root.querySelector("[data-terminal-input]");
    const quick = root.querySelector("[data-terminal-quick]");
    const cleanup = cleanupBag();
    const history = [];
    let historyIndex = 0;

    const link = (label, href) => {
        const anchor = document.createElement("a");
        anchor.className = "ccg-e11__terminal-link";
        anchor.href = href;
        anchor.textContent = label;
        output.appendChild(anchor);
        output.scrollTop = output.scrollHeight;
    };

    const help = () => {
        appendLine(output, "AVAILABLE COMMANDS", "is-heading");
        appendLine(output, "HELP  DIR  MSG  GAMES  SYSOP  ABOUT  CLEAR");
        appendLine(output, "A FEW OLD-SCHOOL WORDS MAY OPEN DOORS THE MENU DOES NOT.", "is-dim");
    };

    const commands = {
        HELP: help,
        DIR() {
            appendLine(output, "DIRECTORY OF CCG-BBS:", "is-heading");
            appendLine(output, "C64-GAMES/   AMIGA/   MAGAZINES/   DEMOSCENE/   PRIVATE/");
            appendLine(output, "31 PUBLIC FILE AREAS. 1 PRIVATE AREA.");
        },
        MSG() {
            appendLine(output, "MESSAGE BOARD", "is-heading");
            appendLine(output, "01 SYSOP: Welcome to the Cheeky Commodore Gamer BBS.");
            appendLine(output, "02 GUEST: Anyone still using a datasette in 2026?");
            appendLine(output, "03 SYSOP: Yes. It finished loading yesterday.");
        },
        GAMES() {
            appendLine(output, "OPENING THE CCG GAME ARCHIVE...", "is-success");
            link("ENTER GAME ARCHIVE", siteRoot + "games/");
        },
        SYSOP() {
            appendLine(output, "SYSOP CHANNEL OPEN.", "is-heading");
            appendLine(output, "JOE IS PROBABLY TESTING SOMETHING HE ABSOLUTELY DID NOT MEAN TO BREAK.");
            appendLine(output, "ACCESS LEVEL RAISED: CHEEKY.", "is-success");
        },
        ABOUT() {
            appendLine(output, "CHEEKY COMMODORE GAMER BBS", "is-heading");
            appendLine(output, "A FICTIONAL RETRO BBS BUILT DIRECTLY INTO THE CCG WEBSITE.");
            appendLine(output, "NO PHONE BILL. NO BUSY SIGNAL. NO ONE PICKING UP THE EXTENSION.");
        },
        CLEAR() { output.replaceChildren(); },
        ZZAP() {
            appendLine(output, "MAGAZINE VAULT UNLOCKED.", "is-success");
            appendLine(output, "HIDDEN COMMAND FOUND: ZZAP");
            onLaunch?.("cracktro");
        },
        COMMODORE() {
            appendLine(output, "COMMODORE ACCESS ACCEPTED.", "is-success");
            onLaunch?.("1541");
        },
        "1541"() {
            appendLine(output, "PRIVATE HARDWARE CHANNEL UNLOCKED.", "is-success");
            appendLine(output, "MOUNTING CCG ARCHIVE DISK...");
            onLaunch?.("1541");
        },
        AMIGA() {
            appendLine(output, "AMIGA ACCESS ACCEPTED.", "is-success");
            onLaunch?.("workbench");
        },
        ELITE() {
            appendLine(output, "STATUS: ELITE COMMANDER.", "is-success");
            appendLine(output, "RIGHT ON, COMMANDER.");
        },
        "42"() {
            appendLine(output, "THE ANSWER IS 42. THE QUESTION IS STILL LOADING FROM TAPE.", "is-success");
        },
        WAREZ() {
            appendLine(output, "NICE TRY. THIS BBS RUNS A TIGHT SHIP.", "is-error");
        },
        PRIVATE() {
            appendLine(output, "PRIVATE AREA REQUIRES LEVEL 1541.", "is-error");
            appendLine(output, "HINT: HARDWARE SOMETIMES MAKES A GOOD PASSWORD.", "is-dim");
        },
    };

    quick.append(
        button("HELP", "HELP"),
        button("DIR", "DIR"),
        button("MESSAGES", "MSG"),
        button("GAMES", "GAMES"),
        button("SYSOP", "SYSOP")
    );

    const execute = raw => {
        const command = String(raw || "").trim().toUpperCase();
        if (!command) return;
        appendLine(output, "> " + command, "is-command");
        history.push(command);
        historyIndex = history.length;
        const handler = commands[command];
        if (handler) handler();
        else appendLine(output, "?UNKNOWN COMMAND: " + command, "is-error");
    };

    const onSubmit = event => {
        event.preventDefault();
        const value = input.value;
        input.value = "";
        execute(value);
    };
    form.addEventListener("submit", onSubmit);
    cleanup.add(() => form.removeEventListener("submit", onSubmit));

    const onInputKey = event => {
        if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!history.length) return;
            historyIndex = Math.max(0, historyIndex - 1);
            input.value = history[historyIndex] || "";
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            historyIndex = Math.min(history.length, historyIndex + 1);
            input.value = history[historyIndex] || "";
        }
    };
    input.addEventListener("keydown", onInputKey);
    cleanup.add(() => input.removeEventListener("keydown", onInputKey));

    const onQuick = event => {
        const target = event.target.closest("[data-e11-action]");
        if (target) execute(target.dataset.e11Action);
    };
    quick.addEventListener("click", onQuick);
    cleanup.add(() => quick.removeEventListener("click", onQuick));

    appendLine(output, "CONNECT 2400", "is-dim");
    appendLine(output, "*** CHEEKY COMMODORE GAMER BBS ***", "is-heading");
    appendLine(output, "WELCOME, CALLER #1985");
    appendLine(output, "TYPE HELP FOR COMMANDS.");

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => input.focus({ preventScroll: true }),
    };
}
