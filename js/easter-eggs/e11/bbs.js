import { appendLine, button, cleanupBag, terminalShell } from "./common.js";

export function createExperience({ siteRoot = "/", onLaunch } = {}) {
    const root = terminalShell("CHEEKY COMMODORE GAMER BBS", "2400 BAUD · NODE 01 · 8N1");
    root.classList.add("ccg-e11--bbs");
    const chrome = root.querySelector(".ccg-e11__chrome");
    const titlebar = root.querySelector(".ccg-e11__titlebar");
    const output = root.querySelector("[data-terminal-output]");
    const form = root.querySelector("[data-terminal-form]");
    const input = root.querySelector("[data-terminal-input]");
    const quick = root.querySelector("[data-terminal-quick]");
    const cleanup = cleanupBag();
    const history = [];
    let historyIndex = 0;
    let messagePage = 0;

    const status = document.createElement("div");
    status.className = "ccg-e11__bbs-status";
    status.innerHTML =
        '<span><i class="ccg-e11__bbs-led is-on" aria-hidden="true"></i>CARRIER</span>' +
        '<span>NODE <b>01</b></span>' +
        '<span>CALLER <b>#1985</b></span>' +
        '<span>ACCESS <b>CHEEKY</b></span>' +
        '<span data-bbs-clock></span>';
    titlebar.insertAdjacentElement("afterend", status);

    const masthead = document.createElement("div");
    masthead.className = "ccg-e11__bbs-masthead";
    masthead.innerHTML =
        '<div class="ccg-e11__bbs-logo" aria-hidden="true">' +
            '<span>CHEEKY</span><span>COMMODORE</span><span>GAMER BBS</span>' +
        '</div>' +
        '<div class="ccg-e11__bbs-nodecard">' +
            '<strong>THE CCG ARCHIVE NODE</strong>' +
            '<span>Retro games · magazines · demos · odd hardware</span>' +
            '<span>SYSOP: JOE · EST. 1985(ISH)</span>' +
        '</div>';
    chrome.insertBefore(masthead, output);

    const clock = root.querySelector("[data-bbs-clock]");
    const updateClock = () => {
        clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };
    updateClock();
    const clockTimer = setInterval(updateClock, 1000);
    cleanup.add(() => clearInterval(clockTimer));

    const link = (label, href) => {
        const anchor = document.createElement("a");
        anchor.className = "ccg-e11__terminal-link";
        anchor.href = href;
        anchor.textContent = label;
        output.appendChild(anchor);
        output.scrollTop = output.scrollHeight;
    };

    const divider = () => appendLine(output, "────────────────────────────────────────────────────────", "is-dim");

    const help = () => {
        appendLine(output, "CCG-BBS COMMAND DIRECTORY", "is-heading");
        appendLine(output, "HELP    DIR     MSG     FILES   WHO     NEWS");
        appendLine(output, "DOORS   GAMES   SYSOP   ABOUT   TIME    CLEAR");
        appendLine(output, "TIP: TRY MSG 1, FILES C64 OR DOORS.", "is-dim");
        appendLine(output, "A FEW OLD-SCHOOL WORDS STILL OPEN DOORS THE MENU DOES NOT.", "is-dim");
    };

    const messagePages = [
        [
            "01 SYSOP  05-OCT-26  WELCOME TO THE NEW CCG BBS NODE.",
            "02 GUEST  05-OCT-26  ANYONE STILL USING A DATASETTE IN 2026?",
            "03 SYSOP  05-OCT-26  YES. IT FINISHED LOADING YESTERDAY.",
            "04 ANON   04-OCT-26  FOUND A STRANGE COMMAND IN THE PRIVATE AREA...",
        ],
        [
            "05 SYSOP  04-OCT-26  PLEASE STOP TRYING TO FORMAT THE ARCHIVE DISK.",
            "06 DEMO   03-OCT-26  GREETINGS FROM THE COPPER-BAR DEPARTMENT.",
            "07 1541   03-OCT-26  00, OK,00,00",
            "08 GUEST  02-OCT-26  THE JOYSTICK WAS FINE UNTIL WORLD GAMES.",
        ],
    ];

    const showMessages = argument => {
        const requested = Number(argument);
        if (Number.isInteger(requested) && requested >= 1 && requested <= messagePages.length) messagePage = requested - 1;
        appendLine(output, "MESSAGE BOARD · PAGE " + (messagePage + 1) + "/" + messagePages.length, "is-heading");
        messagePages[messagePage].forEach(line => appendLine(output, line));
        appendLine(output, "TYPE MSG 1 OR MSG 2 TO CHANGE PAGE.", "is-dim");
    };

    const showFiles = argument => {
        const area = String(argument || "ALL").toUpperCase();
        appendLine(output, "FILE LIBRARY · " + area, "is-heading");
        const files = {
            ALL: ["C64/", "AMIGA/", "MAGAZINES/", "DEMOSCENE/", "PRIVATE/"],
            C64: ["CCG-FAVES.LST     18K", "JOYSTICK.TXT       4K", "SID-LAB.PRG       31K"],
            AMIGA: ["WORKBENCH.DRAWER  9K", "GURU.LOG           2K", "COPPER.DEMO       46K"],
            DEMOSCENE: ["CCG-INTRO.PRG    42K", "SCROLLER.TXT       8K", "GREETINGS.NFO      3K"],
            MAGAZINES: ["ZZAP-INDEX.TXT   22K", "CU-AMIGA.TXT      16K", "ARCHIVE.NFO        5K"],
        };
        (files[area] || files.ALL).forEach(line => appendLine(output, line));
        if (!files[area]) appendLine(output, "UNKNOWN AREA. SHOWING ROOT DIRECTORY.", "is-dim");
        appendLine(output, "NO ACTUAL MODEM TRANSFER REQUIRED. YOUR PHONE BILL IS SAFE.", "is-dim");
    };

    const commands = {
        HELP: help,
        DIR() {
            appendLine(output, "DIRECTORY OF CCG-BBS:", "is-heading");
            appendLine(output, "C64-GAMES/   AMIGA/   MAGAZINES/   DEMOSCENE/   PRIVATE/");
            appendLine(output, "31 PUBLIC FILE AREAS. 1 PRIVATE AREA.");
            appendLine(output, "TYPE FILES <AREA> FOR A CLOSER LOOK.", "is-dim");
        },
        MSG(argument) { showMessages(argument); },
        FILES(argument) { showFiles(argument); },
        WHO() {
            appendLine(output, "ACTIVE NODES", "is-heading");
            appendLine(output, "01  CCG1985   CHEEKY ACCESS   2400 BPS");
            appendLine(output, "02  SYSOP     LOCAL CONSOLE   BUSY");
            appendLine(output, "03  GUEST     CARRIER LOST    1200 BPS", "is-dim");
        },
        NEWS() {
            appendLine(output, "SYSTEM NEWS", "is-heading");
            appendLine(output, "• CCG ARCHIVE INDEX REBUILT.");
            appendLine(output, "• SID LAB AND SPRITE TOOLS NOW AVAILABLE THROUGH DOORS.");
            appendLine(output, "• 1541 DRIVE STILL OBJECTS TO BEING CALLED SLOW.");
        },
        DOORS() {
            appendLine(output, "BBS DOORS", "is-heading");
            appendLine(output, "SID       - THREE-VOICE SYNTH LAB");
            appendLine(output, "SPRITE    - C64 SPRITE EDITOR");
            appendLine(output, "1541      - ARCHIVE DRIVE MONITOR");
            appendLine(output, "CRACKTRO  - CCG DEMOSCENE TRANSMISSION");
            appendLine(output, "AMIGA     - CCG WORKBENCH");
            appendLine(output, "TYPE A DOOR NAME TO ENTER.", "is-dim");
        },
        GAMES() {
            appendLine(output, "OPENING THE CCG GAME ARCHIVE...", "is-success");
            link("ENTER GAME ARCHIVE", siteRoot + "games/");
        },
        SYSOP() {
            appendLine(output, "SYSOP CHANNEL OPEN.", "is-heading");
            appendLine(output, "JOE IS PROBABLY TESTING SOMETHING HE ABSOLUTELY DID NOT MEAN TO BREAK.");
            appendLine(output, "ACCESS LEVEL RAISED: CHEEKY.", "is-success");
            appendLine(output, "SYSOP STATUS: MAKING ONE LAST CHANGE.", "is-dim");
        },
        ABOUT() {
            appendLine(output, "CHEEKY COMMODORE GAMER BBS", "is-heading");
            appendLine(output, "A FICTIONAL, FULLY LOCAL RETRO BBS BUILT DIRECTLY INTO THE CCG WEBSITE.");
            appendLine(output, "NO PHONE BILL. NO BUSY SIGNAL. NO ONE PICKING UP THE EXTENSION.");
        },
        TIME() {
            appendLine(output, "NODE TIME: " + new Date().toString());
        },
        CLEAR() { output.replaceChildren(); },
        ZZAP() {
            appendLine(output, "MAGAZINE VAULT UNLOCKED.", "is-success");
            appendLine(output, "HIDDEN COMMAND FOUND: ZZAP");
            onLaunch?.("cracktro");
        },
        CRACKTRO() { onLaunch?.("cracktro"); },
        SID() { onLaunch?.("sid"); },
        SPRITE() { onLaunch?.("sprite"); },
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
        POKE() {
            appendLine(output, "POKE 53280,0 : POKE 53281,0", "is-success");
            appendLine(output, "BORDER AND BACKGROUND HAVE BEEN INFORMED.", "is-dim");
        },
    };

    quick.append(
        button("HELP", "HELP"),
        button("DIRECTORY", "DIR"),
        button("MESSAGES", "MSG"),
        button("FILES", "FILES"),
        button("DOORS", "DOORS"),
        button("GAMES", "GAMES")
    );

    const execute = raw => {
        const printable = String(raw || "").trim();
        if (!printable) return;
        const parts = printable.split(/\s+/);
        const command = String(parts.shift() || "").toUpperCase();
        const argument = parts.join(" ");
        appendLine(output, "> " + printable.toUpperCase(), "is-command");
        history.push(printable);
        historyIndex = history.length;
        const handler = commands[command];
        if (handler) handler(argument);
        else appendLine(output, "?UNKNOWN COMMAND: " + command + "  (TYPE HELP)", "is-error");
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

    appendLine(output, "CONNECT 2400 / V.22bis", "is-dim");
    divider();
    appendLine(output, "*** CHEEKY COMMODORE GAMER BBS ***", "is-heading");
    appendLine(output, "WELCOME, CALLER #1985 · ACCESS: CHEEKY");
    appendLine(output, "31 FILE AREAS · 2 MESSAGE PAGES · 5 DOORS ONLINE");
    divider();
    appendLine(output, "TYPE HELP FOR COMMANDS OR DOORS FOR THE INTERACTIVE ARCHIVE.");

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => input.focus({ preventScroll: true }),
    };
}
