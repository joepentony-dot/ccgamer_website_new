import { clamp, cleanupBag } from "./common.js";

export function createExperience({ siteRoot = "/", onLaunch } = {}) {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--workbench";
    root.innerHTML =
        '<div class="ccg-e11__wb-bar">' +
            '<button type="button" data-wb-menu-button="workbench">Workbench</button>' +
            '<button type="button" data-wb-menu-button="window">Window</button>' +
            '<button type="button" data-wb-menu-button="tools">Tools</button>' +
            '<span class="ccg-e11__wb-version">CCG Workbench 1.3-ish</span>' +
            '<span data-wb-clock></span>' +
        '</div>' +
        '<div class="ccg-e11__wb-menupanel" data-wb-menu-panel hidden></div>' +
        '<div class="ccg-e11__wb-desktop" data-wb-desktop>' +
            '<div class="ccg-e11__wb-icons">' +
                '<button class="ccg-e11__wb-icon" data-wb-open="games"><span class="ccg-e11__wb-glyph ccg-e11__wb-glyph--disk" aria-hidden="true"></span>Games</button>' +
                '<button class="ccg-e11__wb-icon" data-wb-open="tools"><span class="ccg-e11__wb-glyph ccg-e11__wb-glyph--tools" aria-hidden="true"></span>Tools</button>' +
                '<button class="ccg-e11__wb-icon" data-wb-open="ccg"><span class="ccg-e11__wb-glyph ccg-e11__wb-glyph--ccg" aria-hidden="true"></span>CCG Disk</button>' +
                '<button class="ccg-e11__wb-icon" data-wb-open="about"><span class="ccg-e11__wb-glyph ccg-e11__wb-glyph--doc" aria-hidden="true"></span>ReadMe</button>' +
                '<button class="ccg-e11__wb-icon" data-wb-open="prefs"><span class="ccg-e11__wb-glyph ccg-e11__wb-glyph--prefs" aria-hidden="true"></span>Prefs</button>' +
                '<button class="ccg-e11__wb-icon" data-wb-open="trash"><span class="ccg-e11__wb-glyph ccg-e11__wb-glyph--trash" aria-hidden="true"></span>Trashcan</button>' +
            '</div>' +
            '<div class="ccg-e11__wb-window" data-wb-window hidden>' +
                '<div class="ccg-e11__wb-windowbar" data-wb-drag>' +
                    '<button type="button" data-wb-close aria-label="Close">×</button>' +
                    '<strong data-wb-title>Drawer</strong>' +
                    '<button type="button" data-wb-depth aria-label="Send window to back">◇</button>' +
                '</div>' +
                '<div class="ccg-e11__wb-content" data-wb-content></div>' +
                '<div class="ccg-e11__wb-resize" aria-hidden="true"></div>' +
            '</div>' +
            '<div class="ccg-e11__wb-statusbar">' +
                '<span>CHIP <b>512K</b></span><i><b style="width:62%"></b></i>' +
                '<span>FAST <b>4096K</b></span><i><b style="width:84%"></b></i>' +
                '<span>DF0: <b data-wb-disk>READY</b></span>' +
            '</div>' +
        '</div>';

    const desktop = root.querySelector("[data-wb-desktop]");
    const windowEl = root.querySelector("[data-wb-window]");
    const title = root.querySelector("[data-wb-title]");
    const content = root.querySelector("[data-wb-content]");
    const drag = root.querySelector("[data-wb-drag]");
    const menuPanel = root.querySelector("[data-wb-menu-panel]");
    const diskStatus = root.querySelector("[data-wb-disk]");
    const cleanup = cleanupBag();
    let dragState = null;
    let palette = "classic";
    let diskTimer = 0;

    const views = {
        games: '<div class="ccg-e11__wb-drawer-head"><h3>Games</h3><span>31 objects · CCG:</span></div><div class="ccg-e11__wb-files"><button data-wb-file="archive">Game Archive</button><button data-wb-tool="1541">1541 Monitor</button><button data-wb-tool="bbs">CCG BBS</button></div><p>The CCG archive is mounted and ready.</p><a class="ccg-e11-btn" href="' + siteRoot + 'games/">OPEN GAME ARCHIVE</a>',
        tools: '<div class="ccg-e11__wb-drawer-head"><h3>Tools</h3><span>6 objects · SYS:</span></div><p>Interactive system tools are mounted and ready.</p><div class="ccg-e11__wb-toolgrid"><button type="button" class="ccg-e11-btn" data-wb-tool="sid">SID LAB</button><button type="button" class="ccg-e11-btn" data-wb-tool="sprite">SPRITE EDITOR</button><button type="button" class="ccg-e11-btn" data-wb-tool="1541">1541 MONITOR</button><button type="button" class="ccg-e11-btn" data-wb-tool="modem">MODEM</button><button type="button" class="ccg-e11-btn" data-wb-tool="bbs">CCG BBS</button><button type="button" class="ccg-e11-btn" data-wb-tool="cracktro">CCG DEMO</button></div>',
        ccg: '<div class="ccg-e11__wb-drawer-head"><h3>CCG Disk</h3><span>2.8MB free</span></div><div class="ccg-e11__wb-files"><button data-wb-tool="cracktro">CCG-Demo</button><button data-wb-tool="sid">SID-Lab</button><button data-wb-tool="sprite">SpriteEd</button><button data-wb-tool="modem">Terminal</button><button data-wb-open="about">ReadMe</button></div><p>Volume: CCG_ARCHIVE · Boot block: intact · Cheekiness: enabled.</p>',
        about: '<div class="ccg-e11__wb-drawer-head"><h3>CCG Workbench Disk</h3><span>ReadMe 1.0</span></div><p>An original browser-built Amiga-style Easter egg with a working desktop, draggable window, launchable archive tools and local preferences.</p><p>Memory: plenty. Disk space: somehow still not enough.</p><p>Tip: the Tools menu and Tools drawer both reach the deeper CCG archive.</p>',
        prefs: '<div class="ccg-e11__wb-drawer-head"><h3>Prefs</h3><span>ScreenMode</span></div><p>Desktop palette</p><div class="ccg-e11__wb-palettes"><button type="button" data-wb-palette="classic">CLASSIC BLUE</button><button type="button" data-wb-palette="dark">DARK</button><button type="button" data-wb-palette="copper">COPPER</button></div><p class="ccg-e11__wb-pref-note">Changes only affect this Easter egg and reset when it closes.</p>',
        trash: '<div class="ccg-e11__wb-drawer-head"><h3>Trashcan</h3><span>0 objects</span></div><div class="ccg-e11__wb-trashart" aria-hidden="true"></div><p>Empty.</p><p>Unlike the average Downloads folder.</p>',
    };

    const pulseDisk = () => {
        clearTimeout(diskTimer);
        diskStatus.textContent = "READING";
        root.classList.add("is-disk-active");
        diskTimer = setTimeout(() => {
            diskStatus.textContent = "READY";
            root.classList.remove("is-disk-active");
        }, 520);
    };

    const open = name => {
        title.textContent = name === "ccg" ? "CCG Disk" : name.charAt(0).toUpperCase() + name.slice(1);
        content.innerHTML = views[name] || "<p>Drawer unavailable.</p>";
        windowEl.hidden = false;
        windowEl.classList.remove("is-behind");
        const bounds = desktop.getBoundingClientRect();
        if (!windowEl.style.left || parseFloat(windowEl.style.left) > bounds.width - 80) {
            windowEl.style.left = "17%";
            windowEl.style.top = "14%";
        }
        pulseDisk();
    };

    const menus = {
        workbench: '<button data-wb-open="about">About CCG Workbench…</button><button data-wb-open="prefs">Preferences…</button><button data-wb-menu-action="redraw">Redraw Desktop</button>',
        window: '<button data-wb-menu-action="front">Window to Front</button><button data-wb-menu-action="back">Window to Back</button><button data-wb-menu-action="close">Close Window</button>',
        tools: '<button data-wb-tool="sid">SID Lab</button><button data-wb-tool="sprite">Sprite Editor</button><button data-wb-tool="1541">1541 Monitor</button><button data-wb-tool="modem">Modem Terminal</button><button data-wb-tool="cracktro">CCG Demo</button>',
    };

    const showMenu = (name, anchor) => {
        if (!menus[name]) return;
        menuPanel.innerHTML = menus[name];
        menuPanel.hidden = false;
        const rect = anchor.getBoundingClientRect();
        const rootRect = root.getBoundingClientRect();
        menuPanel.style.left = Math.max(0, rect.left - rootRect.left) + "px";
        menuPanel.style.top = "32px";
    };

    const closeMenu = () => { menuPanel.hidden = true; };

    const onClick = event => {
        const menuButton = event.target.closest("[data-wb-menu-button]");
        if (menuButton) {
            showMenu(menuButton.dataset.wbMenuButton, menuButton);
            return;
        }

        const opener = event.target.closest("[data-wb-open]");
        if (opener) {
            open(opener.dataset.wbOpen);
            closeMenu();
        }

        const tool = event.target.closest("[data-wb-tool]")?.dataset.wbTool;
        if (tool) {
            pulseDisk();
            closeMenu();
            onLaunch?.(tool);
        }

        const paletteButton = event.target.closest("[data-wb-palette]");
        if (paletteButton) {
            palette = paletteButton.dataset.wbPalette;
            root.dataset.wbPalette = palette;
            root.querySelectorAll("[data-wb-palette]").forEach(button => button.classList.toggle("is-active", button.dataset.wbPalette === palette));
        }

        const action = event.target.closest("[data-wb-menu-action]")?.dataset.wbMenuAction;
        if (action === "redraw") desktop.classList.add("is-redrawing");
        if (action === "redraw") setTimeout(() => desktop.classList.remove("is-redrawing"), 120);
        if (action === "front") windowEl.classList.remove("is-behind");
        if (action === "back") windowEl.classList.add("is-behind");
        if (action === "close") windowEl.hidden = true;
        if (action) closeMenu();

        if (event.target.closest("[data-wb-depth]")) windowEl.classList.toggle("is-behind");
        if (event.target.closest("[data-wb-close]")) windowEl.hidden = true;

        if (!event.target.closest("[data-wb-menu-button],[data-wb-menu-panel]")) closeMenu();
    };
    root.addEventListener("click", onClick);
    cleanup.add(() => root.removeEventListener("click", onClick));

    const onPointerDown = event => {
        if (event.target.closest("button")) return;
        const rect = windowEl.getBoundingClientRect();
        dragState = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        drag.setPointerCapture?.(event.pointerId);
        windowEl.classList.remove("is-behind");
    };

    const onPointerMove = event => {
        if (!dragState) return;
        const bounds = desktop.getBoundingClientRect();
        const left = clamp(event.clientX - bounds.left - dragState.x, 0, Math.max(0, bounds.width - windowEl.offsetWidth));
        const top = clamp(event.clientY - bounds.top - dragState.y, 0, Math.max(0, bounds.height - windowEl.offsetHeight - 28));
        windowEl.style.left = left + "px";
        windowEl.style.top = top + "px";
    };

    const onPointerUp = () => { dragState = null; };
    drag.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    cleanup.add(() => {
        drag.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
    });

    const clock = root.querySelector("[data-wb-clock]");
    const tick = () => {
        clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };
    tick();
    const clockTimer = setInterval(tick, 30000);
    cleanup.add(() => clearInterval(clockTimer));
    cleanup.add(() => clearTimeout(diskTimer));

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => root.querySelector("[data-wb-open]")?.focus({ preventScroll: true }),
    };
}
