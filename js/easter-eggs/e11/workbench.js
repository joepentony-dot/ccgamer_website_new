import { clamp, cleanupBag } from "./common.js";

export function createExperience({ siteRoot = "/", onLaunch } = {}) {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--workbench";
    root.innerHTML =
        '<div class="ccg-e11__wb-bar"><strong>Workbench</strong><span>CCG Expansion</span><span data-wb-clock></span></div>' +
        '<div class="ccg-e11__wb-desktop">' +
            '<button class="ccg-e11__wb-icon" data-wb-open="games"><span class="ccg-e11__wb-glyph ccg-e11__wb-glyph--disk" aria-hidden="true"></span>Games</button>' +
            '<button class="ccg-e11__wb-icon" data-wb-open="tools"><span class="ccg-e11__wb-glyph ccg-e11__wb-glyph--tools" aria-hidden="true"></span>Tools</button>' +
            '<button class="ccg-e11__wb-icon" data-wb-open="about"><span class="ccg-e11__wb-glyph ccg-e11__wb-glyph--doc" aria-hidden="true"></span>ReadMe</button>' +
            '<button class="ccg-e11__wb-icon" data-wb-open="trash"><span class="ccg-e11__wb-glyph ccg-e11__wb-glyph--trash" aria-hidden="true"></span>Trashcan</button>' +
            '<div class="ccg-e11__wb-window" data-wb-window hidden>' +
                '<div class="ccg-e11__wb-windowbar" data-wb-drag><button type="button" data-wb-close aria-label="Close">×</button><strong data-wb-title>Drawer</strong></div>' +
                '<div class="ccg-e11__wb-content" data-wb-content></div>' +
            '</div>' +
        '</div>';

    const windowEl = root.querySelector("[data-wb-window]");
    const title = root.querySelector("[data-wb-title]");
    const content = root.querySelector("[data-wb-content]");
    const drag = root.querySelector("[data-wb-drag]");
    const cleanup = cleanupBag();
    let dragState = null;

    const views = {
        games: '<h3>Games</h3><p>The CCG archive is mounted and ready.</p><a class="ccg-e11-btn" href="' + siteRoot + 'games/">OPEN GAME ARCHIVE</a>',
        tools: '<h3>Tools</h3><p>CCG system tools are mounted and ready.</p><div class="ccg-e11__quick"><button type="button" class="ccg-e11-btn" data-wb-tool="sid">SID LAB</button><button type="button" class="ccg-e11-btn" data-wb-tool="sprite">SPRITE EDITOR</button><button type="button" class="ccg-e11-btn" data-wb-tool="1541">1541 MONITOR</button><button type="button" class="ccg-e11-btn" data-wb-tool="cracktro">CCG DEMO</button></div>',
        about: '<h3>CCG Workbench Disk</h3><p>An original browser-built Amiga-style Easter egg. No emulator required.</p><p>Memory: plenty. Disk space: somehow still not enough.</p>',
        trash: '<h3>Trashcan</h3><p>Empty.</p><p>Unlike the average Downloads folder.</p>',
    };

    const open = name => {
        title.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        content.innerHTML = views[name] || "<p>Drawer unavailable.</p>";
        windowEl.hidden = false;
        windowEl.style.left = "18%";
        windowEl.style.top = "18%";
    };

    const onClick = event => {
        const opener = event.target.closest("[data-wb-open]");
        if (opener) open(opener.dataset.wbOpen);
        const tool = event.target.closest("[data-wb-tool]")?.dataset.wbTool;
        if (tool) onLaunch?.(tool);
        if (event.target.closest("[data-wb-close]")) windowEl.hidden = true;
    };
    root.addEventListener("click", onClick);
    cleanup.add(() => root.removeEventListener("click", onClick));

    const onPointerDown = event => {
        if (event.target.closest("button")) return;
        const rect = windowEl.getBoundingClientRect();
        dragState = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        drag.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = event => {
        if (!dragState) return;
        const desktop = root.querySelector(".ccg-e11__wb-desktop").getBoundingClientRect();
        const left = clamp(event.clientX - desktop.left - dragState.x, 0, Math.max(0, desktop.width - windowEl.offsetWidth));
        const top = clamp(event.clientY - desktop.top - dragState.y, 0, Math.max(0, desktop.height - windowEl.offsetHeight));
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

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => root.querySelector("[data-wb-open]")?.focus({ preventScroll: true }),
    };
}
