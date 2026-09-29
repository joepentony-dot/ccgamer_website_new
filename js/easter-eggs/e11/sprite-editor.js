import { cleanupBag } from "./common.js";

export function createExperience() {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--sprite";
    root.innerHTML =
        '<header class="ccg-e11__panel-header"><div><strong>C64 SPRITE EDITOR</strong><span>24 × 21 PIXELS · 63 BYTES</span></div></header>' +
        '<div class="ccg-e11__sprite-layout">' +
            '<div class="ccg-e11__sprite-grid" data-sprite-grid role="grid" aria-label="24 by 21 sprite pixel grid"></div>' +
            '<div class="ccg-e11__sprite-side">' +
                '<div class="ccg-e11__quick">' +
                    '<button type="button" class="ccg-e11-btn" data-sprite-action="CLEAR">CLEAR</button>' +
                    '<button type="button" class="ccg-e11-btn" data-sprite-action="INVERT">INVERT</button>' +
                    '<button type="button" class="ccg-e11-btn" data-sprite-action="MIRROR X">MIRROR X</button>' +
                    '<button type="button" class="ccg-e11-btn" data-sprite-action="MIRROR Y">MIRROR Y</button>' +
                    '<button type="button" class="ccg-e11-btn" data-sprite-action="RANDOM">RANDOM</button>' +
                '</div>' +
                '<label>BYTE DATA<textarea data-sprite-data readonly aria-label="C64 sprite byte data"></textarea></label>' +
            '</div>' +
        '</div>';

    const grid = root.querySelector("[data-sprite-grid]");
    const dataOutput = root.querySelector("[data-sprite-data]");
    const pixels = Array.from({ length: 21 }, () => Array(24).fill(false));
    const cleanup = cleanupBag();
    let drawing = false;
    let paint = true;

    for (let y = 0; y < 21; y += 1) {
        for (let x = 0; x < 24; x += 1) {
            const cell = document.createElement("button");
            cell.type = "button";
            cell.className = "ccg-e11__pixel";
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.setAttribute("aria-label", "Pixel " + (x + 1) + ", " + (y + 1));
            grid.appendChild(cell);
        }
    }

    const render = () => {
        grid.querySelectorAll(".ccg-e11__pixel").forEach(cell => {
            const enabled = pixels[Number(cell.dataset.y)][Number(cell.dataset.x)];
            cell.classList.toggle("is-on", enabled);
            cell.setAttribute("aria-pressed", String(enabled));
        });

        const bytes = [];
        for (let y = 0; y < 21; y += 1) {
            for (let group = 0; group < 3; group += 1) {
                let value = 0;
                for (let bit = 0; bit < 8; bit += 1) {
                    if (pixels[y][group * 8 + bit]) value |= (1 << (7 - bit));
                }
                bytes.push(value);
            }
        }
        dataOutput.value = bytes.join(",");
    };

    const applyCell = cell => {
        if (!cell?.classList.contains("ccg-e11__pixel")) return;
        pixels[Number(cell.dataset.y)][Number(cell.dataset.x)] = paint;
        render();
    };

    const onPointerDown = event => {
        const cell = event.target.closest(".ccg-e11__pixel");
        if (!cell) return;
        drawing = true;
        paint = !pixels[Number(cell.dataset.y)][Number(cell.dataset.x)];
        applyCell(cell);
        event.preventDefault();
    };
    const onPointerMove = event => {
        if (!drawing) return;
        const hit = document.elementFromPoint(event.clientX, event.clientY);
        const cell = hit?.closest?.(".ccg-e11__pixel");
        if (cell && grid.contains(cell)) applyCell(cell);
        event.preventDefault();
    };
    const onPointerUp = () => { drawing = false; };

    grid.addEventListener("pointerdown", onPointerDown);
    grid.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    cleanup.add(() => {
        grid.removeEventListener("pointerdown", onPointerDown);
        grid.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
    });

    const onAction = event => {
        const action = event.target.closest("[data-sprite-action]")?.dataset.spriteAction;
        if (!action) return;
        if (action === "CLEAR") pixels.forEach(row => row.fill(false));
        if (action === "INVERT") pixels.forEach((row, y) => row.forEach((value, x) => { pixels[y][x] = !value; }));
        if (action === "MIRROR X") pixels.forEach((row, y) => { pixels[y] = [...row].reverse(); });
        if (action === "MIRROR Y") {
            const copy = pixels.map(row => [...row]).reverse();
            copy.forEach((row, y) => { pixels[y] = row; });
        }
        if (action === "RANDOM") pixels.forEach((row, y) => row.forEach((_, x) => { pixels[y][x] = Math.random() > 0.72; }));
        render();
    };

    root.addEventListener("click", onAction);
    cleanup.add(() => root.removeEventListener("click", onAction));
    render();

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => grid.querySelector("button")?.focus({ preventScroll: true }),
    };
}
