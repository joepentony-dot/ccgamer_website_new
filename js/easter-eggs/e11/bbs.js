import { appendLine, button, cleanupBag, terminalShell } from "./common.js";

const BOARD_ORDER = ["GENERAL", "C64", "AMIGA", "DEMOSCENE", "HARDWARE", "EVENTS"];

const BASE_MESSAGES = Object.freeze({
    GENERAL: [
        {
            id: 1,
            from: "SYSOP",
            date: "05-OCT-26",
            subject: "WELCOME TO THE CCG SUPER-NODE",
            body: [
                "The BBS has had a substantial rebuild.",
                "Message bases, mail, file transfers, doors, chat, trivia and system tools are now online.",
                "Type MAIN for the menu or HELP for the full command directory.",
            ],
        },
        {
            id: 2,
            from: "GUEST",
            date: "05-OCT-26",
            subject: "DATASETTE OWNERS SUPPORT GROUP",
            body: [
                "Anyone else still using a datasette in 2026?",
                "I started loading a game yesterday. I remain optimistic.",
            ],
        },
        {
            id: 3,
            from: "ANON",
            date: "04-OCT-26",
            subject: "PRIVATE AREA",
            body: [
                "There is definitely something behind PRIVATE.",
                "The sysop has left the password hint lying around in the hardware section again.",
            ],
        },
    ],
    C64: [
        {
            id: 1,
            from: "SIDFAN",
            date: "05-OCT-26",
            subject: "6581 OR 8580?",
            body: [
                "Both have their character.",
                "The important bit is turning the volume up far enough to annoy the rest of the house.",
            ],
        },
        {
            id: 2,
            from: "JOY2",
            date: "03-OCT-26",
            subject: "PORT TWO FIRST",
            body: [
                "A reminder to anyone returning to the C64 after thirty years:",
                "if nothing moves, try the other joystick port before blaming the game.",
            ],
        },
        {
            id: 3,
            from: "SYSOP",
            date: "02-OCT-26",
            subject: "SID LAB DOOR",
            body: [
                "The SID LAB door is online.",
                "Type SID from any prompt to launch it.",
            ],
        },
    ],
    AMIGA: [
        {
            id: 1,
            from: "DF0",
            date: "05-OCT-26",
            subject: "WORKBENCH DISK READY",
            body: [
                "CCG Workbench is mounted.",
                "Type AMIGA to boot straight into the desktop.",
            ],
        },
        {
            id: 2,
            from: "GURU",
            date: "04-OCT-26",
            subject: "SOFTWARE FAILURE",
            body: [
                "If you see a Guru Meditation, do not panic.",
                "There is now a recovery monitor. Whether it helps is another matter.",
            ],
        },
    ],
    DEMOSCENE: [
        {
            id: 1,
            from: "COPPER",
            date: "05-OCT-26",
            subject: "NEW CCG INTRO",
            body: [
                "Starfield, copper bars, plasma and vector modes are now in the demo door.",
                "Type CRACKTRO. Sound is optional.",
            ],
        },
        {
            id: 2,
            from: "SCROLLER",
            date: "03-OCT-26",
            subject: "GREETINGS",
            body: [
                "Greetings to everyone still keeping old hardware alive.",
                "Extra respect if your joystick has survived more than one Decathlon session.",
            ],
        },
    ],
    HARDWARE: [
        {
            id: 1,
            from: "1541",
            date: "05-OCT-26",
            subject: "DEVICE 8 ONLINE",
            body: [
                "00, OK,00,00",
                "Default device number: 8.",
                "Someone keeps trying FORMAT. Write protect remains on for a reason.",
            ],
        },
        {
            id: 2,
            from: "MODEM",
            date: "04-OCT-26",
            subject: "V.22bis CARRIER",
            body: [
                "2400 baud is not fast.",
                "It does, however, give you enough time to reconsider every file you decided to download.",
            ],
        },
    ],
    EVENTS: [
        {
            id: 1,
            from: "SYSOP",
            date: "05-OCT-26",
            subject: "RETRO EVENTS ARCHIVE",
            body: [
                "The main CCG site has a retro events archive.",
                "Type EVENTS to open it directly.",
            ],
        },
        {
            id: 2,
            from: "GUEST",
            date: "03-OCT-26",
            subject: "ARCADES STILL WIN",
            body: [
                "Modern hardware is impressive.",
                "A room full of noisy arcade cabinets still wins.",
            ],
        },
    ],
});

const FILE_CATALOGUE = Object.freeze([
    { id: "C64-001", area: "C64", name: "SID-LAB.PRG", size: "31K", desc: "Three-voice C64-style synth laboratory.", door: "sid" },
    { id: "C64-002", area: "C64", name: "SPRITE-EDITOR.PRG", size: "22K", desc: "24x21 sprite editor with live preview.", door: "sprite" },
    { id: "C64-003", area: "C64", name: "CCG-FAVES.LST", size: "18K", desc: "A fictional BBS favourites list." },
    { id: "C64-004", area: "C64", name: "JOYSTICK.TXT", size: "4K", desc: "Port-two survival notes." },
    { id: "AMI-001", area: "AMIGA", name: "WORKBENCH.DRAWER", size: "9K", desc: "CCG Workbench launcher.", door: "workbench" },
    { id: "AMI-002", area: "AMIGA", name: "GURU.LOG", size: "2K", desc: "Recovered Guru Meditation trace.", door: "guru" },
    { id: "AMI-003", area: "AMIGA", name: "COPPER.DEMO", size: "46K", desc: "Demoscene transmission package.", door: "cracktro" },
    { id: "DEM-001", area: "DEMOSCENE", name: "CCG-INTRO.PRG", size: "42K", desc: "CCG cracktro door.", door: "cracktro" },
    { id: "DEM-002", area: "DEMOSCENE", name: "SCROLLER.TXT", size: "8K", desc: "Greetings and questionable joystick references." },
    { id: "DEM-003", area: "DEMOSCENE", name: "GREETINGS.NFO", size: "3K", desc: "A small pile of scene greetings." },
    { id: "MAG-001", area: "MAGAZINES", name: "ZZAP-INDEX.TXT", size: "22K", desc: "Magazine vault index." },
    { id: "MAG-002", area: "MAGAZINES", name: "CU-AMIGA.TXT", size: "16K", desc: "Amiga magazine notes." },
    { id: "MAG-003", area: "MAGAZINES", name: "ARCHIVE.NFO", size: "5K", desc: "Archive information and access notes." },
    { id: "HWD-001", area: "HARDWARE", name: "1541-MONITOR.PRG", size: "28K", desc: "Interactive 1541 drive monitor.", door: "1541" },
    { id: "HWD-002", area: "HARDWARE", name: "MODEM2400.PRG", size: "19K", desc: "Hayes-compatible modem terminal.", door: "modem" },
]);

const TRIVIA = Object.freeze([
    {
        question: "WHICH CHIP IS MOST ASSOCIATED WITH ORIGINAL C64 SOUND?",
        answers: ["A) VIC-II", "B) SID 6581", "C) CIA 6526", "D) TED"],
        correct: "B",
        note: "SID 6581. The later C64C commonly used the 8580.",
    },
    {
        question: "WHAT IS THE DEFAULT DEVICE NUMBER FOR A COMMODORE 1541 DRIVE?",
        answers: ["A) 1", "B) 4", "C) 8", "D) 16"],
        correct: "C",
        note: "Device 8.",
    },
    {
        question: "WHICH AMIGA CUSTOM CHIP IS BEST KNOWN FOR AUDIO?",
        answers: ["A) PAULA", "B) AGNUS", "C) DENISE", "D) GARY"],
        correct: "A",
        note: "Paula handles the Amiga's four-channel sampled audio.",
    },
    {
        question: "WHICH C64 JOYSTICK PORT DID MANY GAMES EXPECT FOR PLAYER ONE?",
        answers: ["A) PORT 1", "B) PORT 2", "C) USER PORT", "D) CARTRIDGE PORT"],
        correct: "B",
        note: "Port 2 was the common default for many C64 games.",
    },
    {
        question: "WHAT DOES BBS STAND FOR?",
        answers: ["A) BASIC BOOT SYSTEM", "B) BULLETIN BOARD SYSTEM", "C) BINARY BROADCAST SERVICE", "D) BAUD BUFFER SWITCH"],
        correct: "B",
        note: "Bulletin Board System.",
    },
]);

const SAFE_HANDLE = /^[A-Z0-9 _.-]{1,16}$/i;

export function createExperience({ siteRoot = "/", onLaunch } = {}) {
    const root = terminalShell("CHEEKY COMMODORE GAMER BBS", "SUPER-NODE · 2400 BAUD · NODE 01 · 8N1");
    root.classList.add("ccg-e11--bbs");
    root.dataset.bbsTheme = "green";
    root.dataset.bbsWidth = "80";

    const chrome = root.querySelector(".ccg-e11__chrome");
    const titlebar = root.querySelector(".ccg-e11__titlebar");
    const output = root.querySelector("[data-terminal-output]");
    const form = root.querySelector("[data-terminal-form]");
    const input = root.querySelector("[data-terminal-input]");
    const quick = root.querySelector("[data-terminal-quick]");
    const cleanup = cleanupBag();

    const history = [];
    const localPosts = [];
    const inbox = [
        {
            id: 1,
            from: "SYSOP",
            subject: "WELCOME",
            date: "05-OCT-26",
            body: "Welcome to the expanded CCG BBS. Type MAIN, then have a nose around.",
            unread: true,
        },
        {
            id: 2,
            from: "1541",
            subject: "STATUS CHANNEL",
            date: "05-OCT-26",
            body: "00, OK,00,00. Please stop sending FORMAT.",
            unread: true,
        },
    ];

    let handle = "CCG1985";
    let access = "CHEEKY";
    let currentBoard = "GENERAL";
    let currentMessageIndex = -1;
    let historyIndex = 0;
    let points = 0;
    let calls = 1;
    let uploadCount = 0;
    let downloadCount = 0;
    let sentMail = 0;
    let composing = null;
    let triviaState = null;
    let transferTimer = 0;
    let transferPercent = 0;
    let transferFile = null;
    let chatReplyTimer = 0;
    const replyTimers = [];
    const connectedAt = Date.now();

    const status = document.createElement("div");
    status.className = "ccg-e11__bbs-status";
    status.innerHTML =
        '<span><i class="ccg-e11__bbs-led is-on" aria-hidden="true"></i>CARRIER</span>' +
        '<span>NODE <b>01</b></span>' +
        '<span>CALLER <b>#1985</b></span>' +
        '<span>USER <b data-bbs-status-handle>CCG1985</b></span>' +
        '<span>ACCESS <b data-bbs-status-access>CHEEKY</b></span>' +
        '<span data-bbs-clock></span>';
    titlebar.insertAdjacentElement("afterend", status);

    const masthead = document.createElement("div");
    masthead.className = "ccg-e11__bbs-masthead";
    masthead.innerHTML =
        '<div class="ccg-e11__bbs-logo" aria-hidden="true">' +
            '<span>CHEEKY</span><span>COMMODORE</span><span>GAMER BBS</span>' +
        '</div>' +
        '<div class="ccg-e11__bbs-nodecard">' +
            '<strong>THE CCG SUPER-NODE</strong>' +
            '<span>Messages · files · mail · doors · chat · games · tools</span>' +
            '<span>SYSOP: JOE · NODE 01 · V.22bis · EST. 1985(ISH)</span>' +
        '</div>';
    chrome.insertBefore(masthead, output);

    const workspace = document.createElement("div");
    workspace.className = "ccg-e11__bbs-workspace";
    const consolePanel = document.createElement("div");
    consolePanel.className = "ccg-e11__bbs-console";
    const sidebar = document.createElement("aside");
    sidebar.className = "ccg-e11__bbs-sidebar";
    sidebar.setAttribute("aria-label", "BBS session status");
    sidebar.innerHTML =
        '<section class="ccg-e11__bbs-card">' +
            '<strong>SESSION</strong>' +
            '<span>HANDLE <b data-bbs-handle>CCG1985</b></span>' +
            '<span>ACCESS <b data-bbs-access>CHEEKY</b></span>' +
            '<span>BOARD <b data-bbs-area>GENERAL</b></span>' +
            '<span>MAIL <b data-bbs-mail>2 NEW</b></span>' +
            '<span>POINTS <b data-bbs-points>0</b></span>' +
            '<span>ONLINE <b data-bbs-online>00:00</b></span>' +
        '</section>' +
        '<section class="ccg-e11__bbs-card">' +
            '<strong>TRANSFER QUEUE</strong>' +
            '<span data-bbs-transfer-name>IDLE</span>' +
            '<div class="ccg-e11__bbs-transfer"><i data-bbs-transfer-bar></i></div>' +
            '<span data-bbs-transfer-status>0 CPS · 0%</span>' +
        '</section>' +
        '<section class="ccg-e11__bbs-card ccg-e11__bbs-shortcuts">' +
            '<strong>HOT KEYS</strong>' +
            '<button type="button" data-bbs-shortcut="MAIN">MAIN MENU</button>' +
            '<button type="button" data-bbs-shortcut="BOARDS">MESSAGE BASES</button>' +
            '<button type="button" data-bbs-shortcut="MAIL LIST">MAILBOX</button>' +
            '<button type="button" data-bbs-shortcut="DOORS">DOORS</button>' +
            '<button type="button" data-bbs-shortcut="TRIVIA">TRIVIA</button>' +
            '<button type="button" data-bbs-shortcut="STATUS">SYSTEM STATUS</button>' +
        '</section>';
    chrome.insertBefore(workspace, quick);
    workspace.append(consolePanel, sidebar);
    consolePanel.append(output, form);

    const clock = root.querySelector("[data-bbs-clock]");
    const handleDisplay = root.querySelector("[data-bbs-handle]");
    const accessDisplay = root.querySelector("[data-bbs-access]");
    const areaDisplay = root.querySelector("[data-bbs-area]");
    const mailDisplay = root.querySelector("[data-bbs-mail]");
    const pointsDisplay = root.querySelector("[data-bbs-points]");
    const onlineDisplay = root.querySelector("[data-bbs-online]");
    const statusHandle = root.querySelector("[data-bbs-status-handle]");
    const statusAccess = root.querySelector("[data-bbs-status-access]");
    const transferName = root.querySelector("[data-bbs-transfer-name]");
    const transferBar = root.querySelector("[data-bbs-transfer-bar]");
    const transferStatus = root.querySelector("[data-bbs-transfer-status]");

    const unreadCount = () => inbox.filter(message => message.unread).length;
    const elapsed = () => Math.max(0, Math.floor((Date.now() - connectedAt) / 1000));
    const formatElapsed = totalSeconds => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return (hours ? String(hours).padStart(2, "0") + ":" : "") +
            String(minutes).padStart(2, "0") + ":" +
            String(seconds).padStart(2, "0");
    };

    const refreshDashboard = () => {
        const unread = unreadCount();
        handleDisplay.textContent = handle;
        accessDisplay.textContent = access;
        areaDisplay.textContent = currentBoard;
        mailDisplay.textContent = unread ? unread + " NEW" : "NONE";
        pointsDisplay.textContent = String(points);
        onlineDisplay.textContent = formatElapsed(elapsed());
        statusHandle.textContent = handle;
        statusAccess.textContent = access;
    };

    const updateClock = () => {
        clock.textContent = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        refreshDashboard();
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

    const printLines = (lines, className) => lines.forEach(line => appendLine(output, line, className));

    const showBanner = () => {
        appendLine(output, "╔══════════════════════════════════════════════════════╗", "is-heading");
        appendLine(output, "║       CHEEKY COMMODORE GAMER BBS SUPER-NODE        ║", "is-heading");
        appendLine(output, "║    MESSAGE BASES · FILES · DOORS · MAIL · CHAT      ║", "is-heading");
        appendLine(output, "╚══════════════════════════════════════════════════════╝", "is-heading");
    };

    const showMain = () => {
        appendLine(output, "CCG SUPER-NODE MAIN MENU", "is-heading");
        divider();
        appendLine(output, "[1] MESSAGE BASES        [2] FILE LIBRARY");
        appendLine(output, "[3] BBS DOORS            [4] ELECTRONIC MAIL");
        appendLine(output, "[5] CHAT / PAGER         [6] CCG SITE LINKS");
        appendLine(output, "[7] USER / SYSTEM        [8] COMMAND HELP");
        divider();
        appendLine(output, "You can type menu numbers or commands directly.", "is-dim");
        appendLine(output, "Try BOARDS, SEARCH SID, TRIVIA, CHAT, STATUS or HELP.", "is-dim");
    };

    const help = argument => {
        const topic = String(argument || "").trim().toUpperCase();
        appendLine(output, "CCG-BBS COMMAND DIRECTORY" + (topic ? " · " + topic : ""), "is-heading");

        if (topic === "BOARDS" || topic === "MESSAGES") {
            printLines([
                "BOARDS                  List message bases",
                "BOARD <name>            Change current message base",
                "SCAN [board]            Scan message headers",
                "READ [board] <id>       Read a message",
                "NEXT / PREV             Move through current board",
                "POST <board> <subject>  Compose a local session post",
                "REPLY <id>              Reply to a message",
                "NEW                     Show newest messages",
            ]);
            return;
        }
        if (topic === "FILES") {
            printLines([
                "AREAS                   List file areas",
                "FILES [area]            List files",
                "SEARCH <term>           Search filename/descriptions",
                "FILE <id|name>          View file information",
                "GET <id|name>           Simulate an XMODEM transfer",
                "RUN <id|name>           Run interactive door files",
                "TRANSFER                Show current transfer",
                "ABORT                   Cancel a transfer",
            ]);
            return;
        }
        if (topic === "MAIL") {
            printLines([
                "MAIL LIST               List mailbox",
                "MAIL READ <id>          Read mail",
                "SEND SYSOP <message>    Send a local message to the sysop",
                "PAGE SYSOP              Page the sysop",
            ]);
            return;
        }
        if (topic === "SYSTEM") {
            printLines([
                "STATUS / PROFILE        Session information",
                "HANDLE <name>           Change session handle",
                "WHO / NODES             Active callers",
                "LASTCALLERS             Recent callers",
                "UPTIME / TIME / VER     System information",
                "THEME GREEN|AMBER|CYAN  Change terminal colour",
                "WIDTH 40|80             Change terminal text width",
                "ANSI ON|OFF             Toggle enhanced presentation",
                "HISTORY                 Command history",
                "CLS / CLEAR             Clear terminal",
                "LOGOFF                  Disconnect from the BBS",
            ]);
            return;
        }

        printLines([
            "MAIN MENU ? HELP   BOARDS BOARD SCAN READ NEXT PREV POST REPLY NEW",
            "AREAS FILES SEARCH FILE GET RUN TRANSFER ABORT",
            "MAIL SEND PAGE CHAT SAY WHO NODES LASTCALLERS",
            "DOORS SID SPRITE 1541 CRACKTRO AMIGA MODEM TRIVIA",
            "GAMES EVENTS SITE HOME COLLECTIONS MUSIC QUIZ",
            "STATUS PROFILE HANDLE UPTIME TIME DATE VER MOTD NEWS POLL VOTE",
            "THEME WIDTH ANSI HISTORY CALC HEX DEC ECHO ART FORTUNE CLS LOGOFF",
        ]);
        appendLine(output, "HELP BOARDS · HELP FILES · HELP MAIL · HELP SYSTEM give focused help.", "is-dim");
        appendLine(output, "A few old-school commands and hidden words still do something extra.", "is-dim");
    };

    const messagesFor = board => [
        ...(BASE_MESSAGES[board] || []),
        ...localPosts.filter(post => post.board === board),
    ];

    const showBoards = () => {
        appendLine(output, "MESSAGE BASES", "is-heading");
        BOARD_ORDER.forEach(board => {
            const count = messagesFor(board).length;
            appendLine(
                output,
                (board === currentBoard ? "> " : "  ") +
                board.padEnd(12) +
                String(count).padStart(3, " ") +
                " MSG" +
                (count === 1 ? "" : "S")
            );
        });
        appendLine(output, "BOARD <name> changes base. SCAN lists headers.", "is-dim");
    };

    const scanBoard = requestedBoard => {
        const board = String(requestedBoard || currentBoard).trim().toUpperCase();
        if (!BOARD_ORDER.includes(board)) {
            appendLine(output, "UNKNOWN MESSAGE BASE. TYPE BOARDS.", "is-error");
            return;
        }
        currentBoard = board;
        currentMessageIndex = -1;
        refreshDashboard();
        appendLine(output, board + " MESSAGE HEADERS", "is-heading");
        const messages = messagesFor(board);
        messages.forEach(message => {
            appendLine(
                output,
                String(message.id).padStart(3, "0") + " " +
                String(message.date || "").padEnd(9) + " " +
                String(message.from || "").slice(0, 10).padEnd(10) + " " +
                String(message.subject || "")
            );
        });
        appendLine(output, "READ " + board + " <id> to open a message.", "is-dim");
    };

    const parseMessageTarget = argument => {
        const parts = String(argument || "").trim().split(/\s+/).filter(Boolean);
        let board = currentBoard;
        let id = null;
        if (parts.length >= 2 && BOARD_ORDER.includes(parts[0].toUpperCase())) {
            board = parts[0].toUpperCase();
            id = Number(parts[1]);
        } else if (parts.length >= 1) {
            id = Number(parts[0]);
        }
        return { board, id };
    };

    const readMessage = argument => {
        const { board, id } = parseMessageTarget(argument);
        if (!Number.isInteger(id)) {
            appendLine(output, "READ REQUIRES A MESSAGE NUMBER. TRY SCAN.", "is-error");
            return;
        }
        const messages = messagesFor(board);
        const index = messages.findIndex(message => Number(message.id) === id);
        if (index < 0) {
            appendLine(output, "MESSAGE NOT FOUND IN " + board + ".", "is-error");
            return;
        }
        currentBoard = board;
        currentMessageIndex = index;
        refreshDashboard();
        const message = messages[index];
        divider();
        appendLine(output, board + " #" + String(message.id).padStart(3, "0"), "is-heading");
        appendLine(output, "FROM: " + message.from + "   DATE: " + message.date);
        appendLine(output, "SUBJ: " + message.subject);
        divider();
        const bodyLines = Array.isArray(message.body) ? message.body : [String(message.body || "")];
        bodyLines.forEach(line => appendLine(output, line));
        divider();
        appendLine(output, "NEXT · PREV · REPLY " + message.id, "is-dim");
    };

    const moveMessage = direction => {
        const messages = messagesFor(currentBoard);
        if (!messages.length) return;
        let nextIndex = currentMessageIndex;
        if (nextIndex < 0) nextIndex = direction > 0 ? 0 : messages.length - 1;
        else nextIndex = Math.max(0, Math.min(messages.length - 1, nextIndex + direction));
        readMessage(String(messages[nextIndex].id));
    };

    const startPost = (board, subject, replyTo = null) => {
        const normalizedBoard = String(board || currentBoard).toUpperCase();
        if (!BOARD_ORDER.includes(normalizedBoard)) {
            appendLine(output, "UNKNOWN BOARD. TYPE BOARDS.", "is-error");
            return;
        }
        const cleanSubject = String(subject || "").trim().slice(0, 54) || (replyTo ? "RE: MESSAGE " + replyTo : "UNTITLED");
        composing = {
            board: normalizedBoard,
            subject: cleanSubject,
            lines: [],
            replyTo,
        };
        appendLine(output, "COMPOSING MESSAGE TO " + normalizedBoard, "is-heading");
        appendLine(output, "SUBJECT: " + cleanSubject);
        appendLine(output, "Enter message text. A single . saves. CANCEL aborts.", "is-dim");
        input.placeholder = "Message text, . to save";
    };

    const finishPost = () => {
        if (!composing) return;
        if (!composing.lines.length) {
            appendLine(output, "EMPTY MESSAGE DISCARDED.", "is-error");
            composing = null;
            input.placeholder = "";
            return;
        }
        const existing = messagesFor(composing.board);
        const id = Math.max(0, ...existing.map(message => Number(message.id) || 0)) + 1;
        const now = new Date();
        const date = now.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
        }).replace(/ /g, "-").toUpperCase();
        localPosts.push({
            id,
            board: composing.board,
            from: handle,
            date,
            subject: composing.subject,
            body: [...composing.lines],
        });
        currentBoard = composing.board;
        points += 5;
        appendLine(output, "MESSAGE #" + id + " POSTED TO " + composing.board + ".", "is-success");
        composing = null;
        input.placeholder = "";
        refreshDashboard();
    };

    const showAreas = () => {
        appendLine(output, "FILE AREAS", "is-heading");
        const areas = [...new Set(FILE_CATALOGUE.map(file => file.area))];
        areas.forEach(area => {
            const count = FILE_CATALOGUE.filter(file => file.area === area).length;
            appendLine(output, area.padEnd(12) + String(count).padStart(2, " ") + " FILES");
        });
        appendLine(output, "FILES <area> · SEARCH <term> · FILE <id> · GET <id>", "is-dim");
    };

    const showFiles = argument => {
        const area = String(argument || "ALL").trim().toUpperCase();
        const files = area === "ALL"
            ? FILE_CATALOGUE
            : FILE_CATALOGUE.filter(file => file.area === area);
        if (!files.length) {
            appendLine(output, "UNKNOWN OR EMPTY FILE AREA. TYPE AREAS.", "is-error");
            return;
        }
        appendLine(output, "FILE LIBRARY · " + area, "is-heading");
        files.forEach(file => {
            appendLine(
                output,
                file.id.padEnd(8) + " " +
                file.name.padEnd(22) + " " +
                file.size.padStart(5)
            );
        });
        appendLine(output, "FILE <id> for details. GET <id> starts XMODEM.", "is-dim");
    };

    const findFiles = term => {
        const needle = String(term || "").trim().toUpperCase();
        if (!needle) {
            appendLine(output, "SEARCH REQUIRES A WORD OR FILE ID.", "is-error");
            return [];
        }
        const matches = FILE_CATALOGUE.filter(file =>
            file.id.includes(needle) ||
            file.area.includes(needle) ||
            file.name.includes(needle) ||
            file.desc.toUpperCase().includes(needle)
        );
        appendLine(output, "FILE SEARCH · " + needle, "is-heading");
        if (!matches.length) {
            appendLine(output, "NO MATCHES.");
            return matches;
        }
        matches.forEach(file => appendLine(output, file.id + "  " + file.name + "  " + file.size));
        return matches;
    };

    const resolveFile = token => {
        const needle = String(token || "").trim().toUpperCase();
        if (!needle) return null;
        return FILE_CATALOGUE.find(file =>
            file.id === needle ||
            file.name === needle ||
            file.name.replace(/\.[^.]+$/, "") === needle
        ) || null;
    };

    const showFileInfo = token => {
        const file = resolveFile(token);
        if (!file) {
            appendLine(output, "FILE NOT FOUND. TRY SEARCH <term>.", "is-error");
            return;
        }
        appendLine(output, file.name + " · " + file.id, "is-heading");
        appendLine(output, "AREA: " + file.area + "   SIZE: " + file.size);
        appendLine(output, file.desc);
        appendLine(output, "CRC: $" + (file.id + file.name).split("").reduce((value, char) => ((value * 31) + char.charCodeAt(0)) & 0xffff, 0).toString(16).toUpperCase().padStart(4, "0"));
        appendLine(output, file.door ? "RUN " + file.id + " launches the interactive file." : "GET " + file.id + " simulates an XMODEM transfer.", "is-dim");
    };

    const stopTransfer = (announce = false) => {
        if (transferTimer) clearInterval(transferTimer);
        transferTimer = 0;
        if (announce && transferFile) appendLine(output, "TRANSFER ABORTED: " + transferFile.name, "is-error");
        transferFile = null;
        transferPercent = 0;
        transferName.textContent = "IDLE";
        transferBar.style.width = "0%";
        transferStatus.textContent = "0 CPS · 0%";
    };

    const startTransfer = token => {
        const file = resolveFile(token);
        if (!file) {
            appendLine(output, "FILE NOT FOUND. TRY SEARCH <term>.", "is-error");
            return;
        }
        stopTransfer(false);
        transferFile = file;
        transferPercent = 0;
        transferName.textContent = file.name;
        appendLine(output, "XMODEM-CRC RECEIVE: " + file.name, "is-heading");
        appendLine(output, "NAK · SOH · BLOCK 001");
        appendLine(output, "Transfer simulation started. No external file is written.", "is-dim");

        transferTimer = setInterval(() => {
            transferPercent = Math.min(100, transferPercent + 8 + Math.floor(Math.random() * 8));
            const cps = 205 + Math.floor(Math.random() * 95);
            transferBar.style.width = transferPercent + "%";
            transferStatus.textContent = cps + " CPS · " + transferPercent + "%";
            if (transferPercent >= 100) {
                clearInterval(transferTimer);
                transferTimer = 0;
                downloadCount += 1;
                points += 2;
                appendLine(output, "EOT · ACK", "is-success");
                appendLine(output, file.name + " RECEIVED INTO LOCAL BBS BUFFER.", "is-success");
                if (file.door) appendLine(output, "TYPE RUN " + file.id + " TO EXECUTE.", "is-dim");
                transferStatus.textContent = "COMPLETE · 100%";
                refreshDashboard();
            }
        }, 170);
    };

    const showTransfer = () => {
        if (!transferFile) {
            appendLine(output, "TRANSFER QUEUE IS IDLE.");
            return;
        }
        appendLine(output, "TRANSFER: " + transferFile.name + " · " + transferPercent + "%");
    };

    const runFile = token => {
        const file = resolveFile(token);
        if (!file) {
            appendLine(output, "RUN: FILE NOT FOUND.", "is-error");
            return;
        }
        if (!file.door) {
            appendLine(output, file.name + " IS DATA, NOT AN EXECUTABLE DOOR.", "is-error");
            return;
        }
        appendLine(output, "EXECUTING " + file.name + "...", "is-success");
        onLaunch?.(file.door);
    };

    const showMail = () => {
        appendLine(output, "ELECTRONIC MAILBOX", "is-heading");
        if (!inbox.length) {
            appendLine(output, "NO MESSAGES.");
            return;
        }
        inbox.forEach(message => {
            appendLine(
                output,
                (message.unread ? "*" : " ") +
                String(message.id).padStart(3, "0") + " " +
                String(message.from).slice(0, 10).padEnd(10) + " " +
                message.subject
            );
        });
        appendLine(output, "* = unread · MAIL READ <id>", "is-dim");
    };

    const readMail = idValue => {
        const id = Number(idValue);
        const message = inbox.find(item => item.id === id);
        if (!message) {
            appendLine(output, "MAIL MESSAGE NOT FOUND.", "is-error");
            return;
        }
        message.unread = false;
        divider();
        appendLine(output, "MAIL #" + String(message.id).padStart(3, "0"), "is-heading");
        appendLine(output, "FROM: " + message.from + "   DATE: " + message.date);
        appendLine(output, "SUBJ: " + message.subject);
        divider();
        appendLine(output, message.body);
        divider();
        refreshDashboard();
    };

    const sendSysop = messageText => {
        const text = String(messageText || "").trim();
        if (!text) {
            appendLine(output, "SEND SYSOP <message>", "is-error");
            return;
        }
        sentMail += 1;
        points += 1;
        appendLine(output, "MAIL SENT TO SYSOP.", "is-success");
        refreshDashboard();

        const timer = setTimeout(() => {
            const id = Math.max(0, ...inbox.map(message => message.id)) + 1;
            inbox.push({
                id,
                from: "SYSOP",
                subject: "RE: YOUR MESSAGE",
                date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/ /g, "-").toUpperCase(),
                body: "Received. I was definitely not changing one last thing when this arrived.",
                unread: true,
            });
            appendLine(output, "*** NEW MAIL FROM SYSOP ***", "is-success");
            refreshDashboard();
        }, 900);
        replyTimers.push(timer);
    };

    const showWho = () => {
        appendLine(output, "ACTIVE NODES", "is-heading");
        appendLine(output, "01  " + handle.padEnd(10) + " " + access.padEnd(10) + " 2400 BPS  " + formatElapsed(elapsed()));
        appendLine(output, "02  SYSOP      LOCAL       CONSOLE    BUSY");
        appendLine(output, "03  DEMOFAN    VISITOR     1200 BPS   00:18");
        appendLine(output, "04  DRIVE8     HARDWARE    IEC BUS    00:00");
    };

    const showLastCallers = () => {
        appendLine(output, "LAST CALLERS", "is-heading");
        appendLine(output, "22:04  JOY2       C64 / JOYSTICKS");
        appendLine(output, "21:48  SIDFAN     MUSIC / SOUND");
        appendLine(output, "21:19  GURU       AMIGA / RECOVERY");
        appendLine(output, "20:55  ANON       PRIVATE / DENIED");
        appendLine(output, "20:31  DEMOFAN    DEMOSCENE");
    };

    const showDoors = () => {
        appendLine(output, "BBS DOORS", "is-heading");
        appendLine(output, "SID       Three-voice SID Lab");
        appendLine(output, "SPRITE    C64 Sprite Editor");
        appendLine(output, "1541      Archive Drive Monitor");
        appendLine(output, "CRACKTRO  CCG Demoscene Transmission");
        appendLine(output, "AMIGA     CCG Workbench");
        appendLine(output, "MODEM     Hayes Modem Terminal");
        appendLine(output, "TRIVIA    Five-question retro quiz");
        appendLine(output, "Type a door name to enter.", "is-dim");
    };

    const showSiteLinks = () => {
        appendLine(output, "CCG SITE LINKS", "is-heading");
        link("HOME", siteRoot + "home.html");
        link("GAMES ARCHIVE", siteRoot + "games/");
        link("COLLECTIONS", siteRoot + "games/collections/");
        link("MUSIC", siteRoot + "music/");
        link("QUIZ", siteRoot + "quiz/quiz.html");
        link("RETRO EVENTS", siteRoot + "games/collections/retro-events.html");
    };

    const startTrivia = () => {
        triviaState = { index: 0, score: 0 };
        appendLine(output, "CCG BBS TRIVIA DOOR", "is-heading");
        appendLine(output, "Five questions. Answer A, B, C or D. TRIVIA QUIT exits.", "is-dim");
        showTriviaQuestion();
    };

    const showTriviaQuestion = () => {
        if (!triviaState) return;
        if (triviaState.index >= TRIVIA.length) {
            points += triviaState.score * 2;
            appendLine(output, "TRIVIA COMPLETE: " + triviaState.score + "/" + TRIVIA.length, "is-success");
            appendLine(output, "BBS POINTS AWARDED: " + (triviaState.score * 2), "is-success");
            triviaState = null;
            refreshDashboard();
            return;
        }
        const item = TRIVIA[triviaState.index];
        divider();
        appendLine(output, "QUESTION " + (triviaState.index + 1) + "/" + TRIVIA.length, "is-heading");
        appendLine(output, item.question);
        item.answers.forEach(answer => appendLine(output, answer));
    };

    const answerTrivia = answer => {
        if (!triviaState) return false;
        const normalized = String(answer || "").trim().toUpperCase();
        if (normalized === "TRIVIA QUIT" || normalized === "QUIT") {
            appendLine(output, "TRIVIA DOOR CLOSED.");
            triviaState = null;
            return true;
        }
        if (!["A", "B", "C", "D"].includes(normalized)) return false;
        const item = TRIVIA[triviaState.index];
        if (normalized === item.correct) {
            triviaState.score += 1;
            appendLine(output, "CORRECT. " + item.note, "is-success");
        } else {
            appendLine(output, "NOPE. " + item.note, "is-error");
        }
        triviaState.index += 1;
        showTriviaQuestion();
        return true;
    };

    const showChat = () => {
        appendLine(output, "CCG MULTI-NODE CHAT", "is-heading");
        appendLine(output, "ONLINE: SYSOP, SIDFAN, DEMOFAN, " + handle);
        appendLine(output, "Use SAY <message> to talk. PAGE SYSOP sends a pager alert.", "is-dim");
    };

    const say = textValue => {
        const text = String(textValue || "").trim();
        if (!text) {
            appendLine(output, "SAY <message>", "is-error");
            return;
        }
        appendLine(output, "<" + handle + "> " + text, "is-command");
        clearTimeout(chatReplyTimer);
        chatReplyTimer = setTimeout(() => {
            const lower = text.toLowerCase();
            let reply = "Still here. Still connected. Still 2400 baud.";
            let from = "DEMOFAN";
            if (lower.includes("sid") || lower.includes("music")) {
                from = "SIDFAN";
                reply = "SID LAB is online. Type SID if you fancy making some noise.";
            } else if (lower.includes("amiga")) {
                from = "GURU";
                reply = "Workbench is behaving at the moment. I have probably jinxed it.";
            } else if (lower.includes("1541") || lower.includes("drive")) {
                from = "DRIVE8";
                reply = "00, OK,00,00";
            } else if (lower.includes("hello") || lower.includes("hi")) {
                from = "SYSOP";
                reply = "Evening. Welcome to the CCG node.";
            }
            appendLine(output, "<" + from + "> " + reply, "is-success");
        }, 650);
    };

    const showStatus = () => {
        appendLine(output, "CCG SUPER-NODE SESSION STATUS", "is-heading");
        appendLine(output, "HANDLE:    " + handle);
        appendLine(output, "ACCESS:    " + access);
        appendLine(output, "NODE:      01 / 04");
        appendLine(output, "BAUD:      2400 V.22bis");
        appendLine(output, "BOARD:     " + currentBoard);
        appendLine(output, "MAIL:      " + unreadCount() + " UNREAD");
        appendLine(output, "CALLS:     " + calls);
        appendLine(output, "DOWNLOADS: " + downloadCount + "   UPLOADS: " + uploadCount);
        appendLine(output, "SENT MAIL: " + sentMail + "   POINTS: " + points);
        appendLine(output, "ONLINE:    " + formatElapsed(elapsed()));
        appendLine(output, "TERMINAL:  " + root.dataset.bbsWidth + " COL · " + root.dataset.bbsTheme.toUpperCase());
    };

    const showNews = () => {
        appendLine(output, "SYSTEM NEWS", "is-heading");
        appendLine(output, "• CCG BBS upgraded to SUPER-NODE status.");
        appendLine(output, "• Six message bases and local posting are online.");
        appendLine(output, "• XMODEM simulation and interactive RUN files are online.");
        appendLine(output, "• Electronic mail, pager, chat and trivia doors are online.");
        appendLine(output, "• SID Lab, Sprite Editor, 1541, Cracktro, Workbench and Modem remain available.");
    };

    const showPoll = () => {
        appendLine(output, "QUICK POLL · BEST WAY TO LOAD A GAME?", "is-heading");
        appendLine(output, "1) CARTRIDGE  [2 votes]");
        appendLine(output, "2) DISK       [5 votes]");
        appendLine(output, "3) TAPE       [4 votes]");
        appendLine(output, "4) MAGIC      [99 votes]");
        appendLine(output, "VOTE 1..4 records a session vote.", "is-dim");
    };

    const vote = value => {
        const option = Number(value);
        if (![1, 2, 3, 4].includes(option)) {
            appendLine(output, "VOTE 1, 2, 3 OR 4.", "is-error");
            return;
        }
        points += 1;
        appendLine(output, "VOTE RECORDED FOR OPTION " + option + ".", "is-success");
        refreshDashboard();
    };

    const setTheme = value => {
        const theme = String(value || "").trim().toLowerCase();
        if (!["green", "amber", "cyan"].includes(theme)) {
            appendLine(output, "THEME GREEN | AMBER | CYAN", "is-error");
            return;
        }
        root.dataset.bbsTheme = theme;
        appendLine(output, "TERMINAL THEME: " + theme.toUpperCase(), "is-success");
    };

    const setWidth = value => {
        const width = String(value || "").trim();
        if (!["40", "80"].includes(width)) {
            appendLine(output, "WIDTH 40 | 80", "is-error");
            return;
        }
        root.dataset.bbsWidth = width;
        appendLine(output, width + " COLUMN MODE SELECTED.", "is-success");
    };

    const setAnsi = value => {
        const mode = String(value || "ON").trim().toUpperCase();
        if (!["ON", "OFF"].includes(mode)) {
            appendLine(output, "ANSI ON | OFF", "is-error");
            return;
        }
        root.classList.toggle("is-ansi-off", mode === "OFF");
        appendLine(output, "ANSI PRESENTATION " + mode + ".", "is-success");
    };

    const calculate = expression => {
        const match = String(expression || "").trim().match(/^(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)$/);
        if (!match) {
            appendLine(output, "CALC EXAMPLE: CALC 64*8", "is-error");
            return;
        }
        const left = Number(match[1]);
        const right = Number(match[3]);
        const operator = match[2];
        let result = 0;
        if (operator === "+") result = left + right;
        if (operator === "-") result = left - right;
        if (operator === "*") result = left * right;
        if (operator === "/") result = right === 0 ? NaN : left / right;
        appendLine(output, Number.isFinite(result) ? "= " + result : "?DIVISION BY ZERO ERROR", Number.isFinite(result) ? "is-success" : "is-error");
    };

    const toHex = value => {
        const number = Number(String(value || "").trim());
        if (!Number.isFinite(number)) {
            appendLine(output, "HEX REQUIRES A DECIMAL NUMBER.", "is-error");
            return;
        }
        appendLine(output, String(Math.trunc(number)) + " = $" + (Math.trunc(number) >>> 0).toString(16).toUpperCase(), "is-success");
    };

    const toDec = value => {
        const source = String(value || "").trim().replace(/^\$/, "");
        if (!/^[0-9A-F]+$/i.test(source)) {
            appendLine(output, "DEC REQUIRES A HEX VALUE, E.G. DEC FF.", "is-error");
            return;
        }
        appendLine(output, "$" + source.toUpperCase() + " = " + parseInt(source, 16), "is-success");
    };

    const changeHandle = value => {
        const next = String(value || "").trim().slice(0, 16);
        if (!SAFE_HANDLE.test(next)) {
            appendLine(output, "HANDLE: 1-16 LETTERS, NUMBERS, SPACE, _ . OR -", "is-error");
            return;
        }
        handle = next.toUpperCase();
        appendLine(output, "SESSION HANDLE CHANGED TO " + handle + ".", "is-success");
        refreshDashboard();
    };

    const logoff = () => {
        appendLine(output, "NO CARRIER", "is-error");
        appendLine(output, "THANKS FOR CALLING THE CCG SUPER-NODE.");
        setTimeout(() => {
            root.closest(".ccg-egg-overlay")?.querySelector(".ccg-egg-overlay__exit")?.click();
        }, 450);
    };

    const commands = {
        MAIN: showMain,
        MENU: showMain,
        HELP: help,
        "?": help,
        "1"() { showBoards(); },
        "2"() { showAreas(); },
        "3"() { showDoors(); },
        "4"() { showMail(); },
        "5"() { showChat(); },
        "6"() { showSiteLinks(); },
        "7"() { showStatus(); },
        "8"() { help(); },

        BOARDS: showBoards,
        BOARD(argument) {
            const board = String(argument || "").trim().toUpperCase();
            if (!BOARD_ORDER.includes(board)) {
                appendLine(output, "UNKNOWN BOARD. TYPE BOARDS.", "is-error");
                return;
            }
            currentBoard = board;
            currentMessageIndex = -1;
            refreshDashboard();
            appendLine(output, "MESSAGE BASE CHANGED TO " + board + ".", "is-success");
            scanBoard(board);
        },
        SCAN: scanBoard,
        MSG: scanBoard,
        READ: readMessage,
        NEXT() { moveMessage(1); },
        PREV() { moveMessage(-1); },
        NEW() {
            BOARD_ORDER.forEach(board => {
                const messages = messagesFor(board);
                const latest = messages[messages.length - 1];
                if (latest) appendLine(output, board.padEnd(11) + " #" + latest.id + " " + latest.subject);
            });
        },
        POST(argument) {
            const parts = String(argument || "").trim().split(/\s+/).filter(Boolean);
            let board = currentBoard;
            if (parts.length && BOARD_ORDER.includes(parts[0].toUpperCase())) board = parts.shift().toUpperCase();
            startPost(board, parts.join(" "));
        },
        REPLY(argument) {
            const id = Number(String(argument || "").trim());
            if (!Number.isInteger(id)) {
                appendLine(output, "REPLY <message number>", "is-error");
                return;
            }
            const message = messagesFor(currentBoard).find(item => Number(item.id) === id);
            if (!message) {
                appendLine(output, "MESSAGE NOT FOUND IN " + currentBoard + ".", "is-error");
                return;
            }
            startPost(currentBoard, "RE: " + message.subject, id);
        },

        DIR: showAreas,
        LS: showAreas,
        AREAS: showAreas,
        FILES: showFiles,
        SEARCH: findFiles,
        FIND: findFiles,
        FILE: showFileInfo,
        GET: startTransfer,
        DOWNLOAD: startTransfer,
        TRANSFER: showTransfer,
        ABORT() { stopTransfer(true); },
        RUN: runFile,

        MAIL(argument) {
            const parts = String(argument || "LIST").trim().split(/\s+/);
            const sub = String(parts.shift() || "LIST").toUpperCase();
            if (sub === "LIST" || sub === "DIR") showMail();
            else if (sub === "READ") readMail(parts[0]);
            else appendLine(output, "MAIL LIST | MAIL READ <id>", "is-error");
        },
        SEND(argument) {
            const match = String(argument || "").trim().match(/^SYSOP\s+(.+)$/i);
            if (!match) {
                appendLine(output, "SEND SYSOP <message>", "is-error");
                return;
            }
            sendSysop(match[1]);
        },
        PAGE(argument) {
            if (String(argument || "SYSOP").trim().toUpperCase() !== "SYSOP") {
                appendLine(output, "ONLY SYSOP PAGER IS ONLINE.", "is-error");
                return;
            }
            appendLine(output, "PAGING SYSOP... BEEP BEEP.", "is-success");
            const timer = setTimeout(() => appendLine(output, "SYSOP: I'M HERE. TYPE SAY <MESSAGE>.", "is-success"), 700);
            replyTimers.push(timer);
        },

        CHAT: showChat,
        SAY: say,
        WHO: showWho,
        NODES: showWho,
        LASTCALLERS: showLastCallers,
        LAST: showLastCallers,

        DOORS: showDoors,
        SID() { onLaunch?.("sid"); },
        SPRITE() { onLaunch?.("sprite"); },
        "1541"() {
            appendLine(output, "PRIVATE HARDWARE CHANNEL UNLOCKED.", "is-success");
            appendLine(output, "MOUNTING CCG ARCHIVE DISK...");
            onLaunch?.("1541");
        },
        COMMODORE() { onLaunch?.("1541"); },
        CRACKTRO() { onLaunch?.("cracktro"); },
        DEMO() { onLaunch?.("cracktro"); },
        AMIGA() { onLaunch?.("workbench"); },
        WORKBENCH() { onLaunch?.("workbench"); },
        MODEM() { onLaunch?.("modem"); },
        TRIVIA(argument) {
            if (String(argument || "").trim().toUpperCase() === "QUIT") {
                triviaState = null;
                appendLine(output, "TRIVIA DOOR CLOSED.");
                return;
            }
            startTrivia();
        },

        SITE: showSiteLinks,
        HOME() { link("OPEN CCG HOME", siteRoot + "home.html"); },
        GAMES() { link("OPEN CCG GAMES", siteRoot + "games/"); },
        COLLECTIONS() { link("OPEN COLLECTIONS", siteRoot + "games/collections/"); },
        MUSIC() { link("OPEN CCG MUSIC", siteRoot + "music/"); },
        QUIZ() { link("OPEN CCG QUIZ", siteRoot + "quiz/quiz.html"); },
        EVENTS() { link("OPEN RETRO EVENTS", siteRoot + "games/collections/retro-events.html"); },

        STATUS: showStatus,
        PROFILE: showStatus,
        HANDLE: changeHandle,
        UPTIME() { appendLine(output, "SYSTEM UPTIME: 41 YEARS, GIVE OR TAKE A REBOOT."); },
        TIME() { appendLine(output, "NODE TIME: " + new Date().toLocaleTimeString()); },
        DATE() { appendLine(output, "NODE DATE: " + new Date().toLocaleDateString("en-GB")); },
        VER() {
            appendLine(output, "CCG-BBS SUPER-NODE 2.0", "is-heading");
            appendLine(output, "NODE 01 · V.22bis · 2400 BPS · LOCAL BROWSER BUILD");
        },
        MOTD() {
            appendLine(output, "MESSAGE OF THE DAY", "is-heading");
            appendLine(output, "If it says PRESS PLAY ON TAPE, it is already too late to make a cup of tea.");
        },
        NEWS: showNews,
        BULLETINS: showNews,
        POLL: showPoll,
        VOTE: vote,
        THEME: setTheme,
        WIDTH: setWidth,
        ANSI: setAnsi,
        HISTORY() {
            appendLine(output, "COMMAND HISTORY", "is-heading");
            history.slice(-20).forEach((item, index) => appendLine(output, String(index + 1).padStart(2, "0") + " " + item));
        },
        CALC: calculate,
        HEX: toHex,
        DEC: toDec,
        ECHO(argument) { appendLine(output, String(argument || "")); },
        ART() { showBanner(); },
        FORTUNE() {
            const fortunes = [
                "YOUR NEXT LOAD WILL SUCCEED FIRST TIME. THIS IS ALMOST CERTAINLY FALSE.",
                "A JOYSTICK MICROSWITCH WILL CLICK. YOU WILL PRETEND NOT TO NOTICE.",
                "00, OK,00,00",
                "THE SYSOP WILL MAKE ONE LAST CHANGE.",
            ];
            appendLine(output, fortunes[Math.floor(Math.random() * fortunes.length)], "is-success");
        },
        CLS() { output.replaceChildren(); },
        CLEAR() { output.replaceChildren(); },
        LOGOFF: logoff,
        BYE: logoff,
        GOODBYE: logoff,

        SYSOP() {
            appendLine(output, "SYSOP CHANNEL OPEN.", "is-heading");
            appendLine(output, "JOE IS CURRENTLY MAKING ONE LAST CHANGE.");
            appendLine(output, "USE SEND SYSOP <MESSAGE> OR PAGE SYSOP.");
        },
        ABOUT() {
            appendLine(output, "CHEEKY COMMODORE GAMER BBS SUPER-NODE", "is-heading");
            appendLine(output, "A LOCAL, BROWSER-BUILT TRIBUTE TO DIAL-UP BULLETIN BOARD SYSTEMS.");
            appendLine(output, "NOT A REAL REMOTE BBS. NO PHONE BILL. NO EXTERNAL TRANSFERS.");
        },
        PRIVATE(argument) {
            const password = String(argument || "").trim().toUpperCase();
            if (password === "1541") {
                access = "ARCHIVE";
                appendLine(output, "PRIVATE AREA ACCESS GRANTED.", "is-success");
                appendLine(output, "HIDDEN FILE: HWD-001 1541-MONITOR.PRG");
                refreshDashboard();
                return;
            }
            appendLine(output, "PRIVATE AREA REQUIRES LEVEL 1541.", "is-error");
            appendLine(output, "HINT: HARDWARE SOMETIMES MAKES A GOOD PASSWORD.", "is-dim");
        },
        ZZAP() {
            appendLine(output, "MAGAZINE VAULT UNLOCKED.", "is-success");
            appendLine(output, "HIDDEN COMMAND FOUND: ZZAP");
            onLaunch?.("cracktro");
        },
        ELITE() {
            points += 8;
            appendLine(output, "STATUS: ELITE COMMANDER.", "is-success");
            appendLine(output, "RIGHT ON, COMMANDER.");
            refreshDashboard();
        },
        "42"() {
            appendLine(output, "THE ANSWER IS 42. THE QUESTION IS STILL LOADING FROM TAPE.", "is-success");
        },
        WAREZ() {
            appendLine(output, "NICE TRY. THIS BBS RUNS A TIGHT SHIP.", "is-error");
        },
        POKE(argument) {
            if (String(argument || "").replace(/\s+/g, "") === "53280,0") {
                root.dataset.bbsTheme = "green";
                appendLine(output, "BORDER REGISTER NOTIFIED.", "is-success");
            } else {
                appendLine(output, "POKE 53280,0 : POKE 53281,0", "is-success");
                appendLine(output, "BORDER AND BACKGROUND HAVE BEEN INFORMED.", "is-dim");
            }
        },
        SYS(argument) {
            if (String(argument || "").trim() === "64738") {
                appendLine(output, "SYS 64738", "is-success");
                appendLine(output, "RESET VECTOR CALLED. THE BBS REFUSES TO GO AWAY.");
            } else {
                appendLine(output, "?UNDEFINED STATEMENT ERROR", "is-error");
            }
        },
        LOAD(argument) {
            const compact = String(argument || "").toUpperCase().replace(/\s+/g, "");
            if (compact === '"*",8,1' || compact === '"$",8') {
                appendLine(output, "SEARCHING FOR *", "is-success");
                onLaunch?.("1541");
            } else {
                appendLine(output, "?FILE NOT FOUND ERROR", "is-error");
            }
        },
    };

    quick.replaceChildren(
        button("MAIN", "MAIN"),
        button("BOARDS", "BOARDS"),
        button("FILES", "FILES"),
        button("MAIL", "MAIL LIST"),
        button("DOORS", "DOORS"),
        button("WHO", "WHO"),
        button("HELP", "HELP")
    );

    const execute = raw => {
        const printable = String(raw || "").trim();
        if (!printable) return;

        if (composing) {
            history.push(printable);
            historyIndex = history.length;
            if (printable === ".") {
                finishPost();
                return;
            }
            if (printable.toUpperCase() === "CANCEL") {
                composing = null;
                input.placeholder = "";
                appendLine(output, "MESSAGE CANCELLED.", "is-error");
                return;
            }
            composing.lines.push(printable.slice(0, 78));
            appendLine(output, "] " + printable, "is-command");
            return;
        }

        if (triviaState && answerTrivia(printable)) {
            history.push(printable);
            historyIndex = history.length;
            return;
        }

        const parts = printable.split(/\s+/);
        const command = String(parts.shift() || "").toUpperCase();
        const argument = parts.join(" ");

        appendLine(output, "> " + printable, "is-command");
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

    const commandNames = Object.keys(commands).filter(name => /^[A-Z?]+$/.test(name)).sort();

    const onInputKey = event => {
        if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!history.length) return;
            historyIndex = Math.max(0, historyIndex - 1);
            input.value = history[historyIndex] || "";
            input.setSelectionRange?.(input.value.length, input.value.length);
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            historyIndex = Math.min(history.length, historyIndex + 1);
            input.value = history[historyIndex] || "";
            input.setSelectionRange?.(input.value.length, input.value.length);
        }
        if (event.key === "Tab" && !composing) {
            const value = input.value.trim().toUpperCase();
            if (!value || value.includes(" ")) return;
            const matches = commandNames.filter(name => name.startsWith(value));
            if (matches.length === 1) {
                event.preventDefault();
                input.value = matches[0] + " ";
                input.setSelectionRange?.(input.value.length, input.value.length);
            }
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

    const onShortcut = event => {
        const shortcut = event.target.closest("[data-bbs-shortcut]")?.dataset.bbsShortcut;
        if (shortcut) execute(shortcut);
    };
    sidebar.addEventListener("click", onShortcut);
    cleanup.add(() => sidebar.removeEventListener("click", onShortcut));

    showBanner();
    appendLine(output, "CONNECT 2400 / V.22bis", "is-dim");
    appendLine(output, "WELCOME, " + handle + " · CALLER #1985 · ACCESS: " + access);
    appendLine(output, "6 MESSAGE BASES · " + FILE_CATALOGUE.length + " FILES · 7 DOORS · 2 NEW MAIL");
    appendLine(output, "Type MAIN for the menu, HELP for commands or use the hot keys.");
    appendLine(output, "Arrow keys recall commands. TAB completes unique command names.", "is-dim");

    cleanup.add(() => {
        stopTransfer(false);
        clearTimeout(chatReplyTimer);
        replyTimers.forEach(timer => clearTimeout(timer));
    });

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => input.focus({ preventScroll: true }),
    };
}
