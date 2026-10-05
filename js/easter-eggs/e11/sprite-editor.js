import { cleanupBag } from "./common.js";

const C64_PALETTE = [
    ["BLACK", "#000000"], ["WHITE", "#ffffff"], ["RED", "#883932"], ["CYAN", "#67b6bd"],
    ["PURPLE", "#8b3f96"], ["GREEN", "#55a049"], ["BLUE", "#40318d"], ["YELLOW", "#bfce72"],
    ["ORANGE", "#8b5429"], ["BROWN", "#574200"], ["LT RED", "#b86962"], ["DK GREY", "#505050"],
    ["GREY", "#787878"], ["LT GREEN", "#94e089"], ["LT BLUE", "#7869c4"], ["LT GREY", "#9f9f9f"],
];

export function createExperience() {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--sprite";
    root.innerHTML =
        '<header class="ccg-e11__panel-header"><div><strong>C64 SPRITE EDITOR</strong><span>24 × 21 PIXELS · 63 BYTES · LIVE PREVIEW</span></div><div class="ccg-e11__sprite-count" data-sprite-count>0 PIXELS</div></header>' +
        '<div class="ccg-e11__sprite-layout">' +
            '<div class="ccg-e11__sprite-stage">' +
                '<div class="ccg-e11__sprite-grid" data-sprite-grid role="grid" aria-label="24 by 21 sprite pixel grid"></div>' +
                '<div class="ccg-e11__sprite-coords"><span>X <b data-sprite-x>--</b></span><span>Y <b data-sprite-y>--</b></span><span>BRUSH <b data-sprite-brush>DRAW</b></span></div>' +
            '</div>' +
            '<div class="ccg-e11__sprite-side">' +
                '<div class="ccg-e11__sprite-previewbox"><strong>SPRITE PREVIEW</strong><canvas width="192" height="168" data-sprite-preview aria-label="Live sprite preview"></canvas><span data-sprite-colour-name>WHITE</span></div>' +
                '<div class="ccg-e11__sprite-palette" data-sprite-palette aria-label="C64 colour palette"></div>' +
                '<div class="ccg-e11__quick ccg-e11__sprite-tools">' +
                    '<button type="button" class="ccg-e11-btn" data-sprite-action="CLEAR">CLEAR</button>' +
                    '<button type="button" class="ccg-e11-btn" data-sprite-action="INVERT">INVERT</button>' +
                    '<button type="button" class="ccg-e11-btn" data-sprite-action="MIRROR X">MIRROR X</button>' +
                    '<button type="button" class="ccg-e11-btn" data-sprite-action="MIRROR Y">MIRROR Y</button>' +
                    '<button type="button" class="ccg-e11-btn" data-sprite-action="SHIFT LEFT">← SHIFT</button>' +
                    '<button type="button" class="ccg-e11-btn" data-sprite-action="SHIFT RIGHT">SHIFT →</button>' +
                    '<button type="button" class="ccg-e11-btn" data-sprite-action="SHIFT UP">↑ SHIFT</button>' +
                    '<button type="button" class="ccg-e11-btn" data-sprite-action="SHIFT DOWN">SHIFT ↓</button>' +
                    '<button type="button" class="ccg-e11-btn" data-sprite-action="SAMPLE">CCG SAMPLE</button>' +
                    '<button type="button" class="ccg-e11-btn" data-sprite-action="RANDOM">RANDOM</button>' +
                '</div>' +
                '<div class="ccg-e11__sprite-data-tabs"><button type="button" class="is-active" data-sprite-format="DEC">DECIMAL</button><button type="button" data-sprite-format="HEX">HEX</button><button type="button" data-sprite-copy>COPY</button></div>' +
                '<label>BYTE DATA<textarea data-sprite-data readonly aria-label="C64 sprite byte data"></textarea></label>' +
                '<textarea data-sprite-hex readonly aria-label="C64 sprite hexadecimal byte data" hidden></textarea>' +
            '</div>' +
        '</div>';

    const grid = root.querySelector("[data-sprite-grid]");
    const dataOutput = root.querySelector("[data-sprite-data]");
    const hexOutput = root.querySelector("[data-sprite-hex]");
    const preview = root.querySelector("[data-sprite-preview]");
    const previewContext = preview?.getContext("2d");
    const palette = root.querySelector("[data-sprite-palette]");
    const count = root.querySelector("[data-sprite-count]");
    const xReadout = root.querySelector("[data-sprite-x]");
    const yReadout = root.querySelector("[data-sprite-y]");
    const brushReadout = root.querySelector("[data-sprite-brush]");
    const colourName = root.querySelector("[data-sprite-colour-name]");
    const pixels = Array.from({ length: 21 }, () => Array(24).fill(false));
    const cleanup = cleanupBag();
    let drawing = false;
    let paint = true;
    let colourIndex = 1;
    let format = "DEC";

    for (let y = 0; y < 21; y += 1) {
        for (let x = 0; x < 24; x += 1) {
            const cell = document.createElement("button");
            cell.type = "button";
            cell.className = "ccg-e11__pixel";
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.setAttribute("role", "gridcell");
            cell.setAttribute("aria-label", "Pixel " + (x + 1) + ", " + (y + 1));
            grid.appendChild(cell);
        }
    }

    C64_PALETTE.forEach(([name, value], index) => {
        const swatch = document.createElement("button");
        swatch.type = "button";
        swatch.className = "ccg-e11__swatch";
        swatch.dataset.spriteColour = String(index);
        swatch.style.setProperty("--swatch", value);
        swatch.title = name;
        swatch.setAttribute("aria-label", name);
        swatch.classList.toggle("is-active", index === colourIndex);
        palette.appendChild(swatch);
    });

    const bytesForSprite = () => {
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
        return bytes;
    };

    const drawPreview = () => {
        if (!previewContext) return;
        const [name, colour] = C64_PALETTE[colourIndex];
        const cellWidth = preview.width / 24;
        const cellHeight = preview.height / 21;
        previewContext.imageSmoothingEnabled = false;
        previewContext.fillStyle = "#40318d";
        previewContext.fillRect(0, 0, preview.width, preview.height);
        previewContext.fillStyle = colour;
        for (let y = 0; y < 21; y += 1) {
            for (let x = 0; x < 24; x += 1) {
                if (pixels[y][x]) previewContext.fillRect(Math.floor(x * cellWidth), Math.floor(y * cellHeight), Math.ceil(cellWidth), Math.ceil(cellHeight));
            }
        }
        colourName.textContent = name;
        root.style.setProperty("--sprite-colour", colour);
    };

    const render = () => {
        let activeCount = 0;
        grid.querySelectorAll(".ccg-e11__pixel").forEach(cell => {
            const enabled = pixels[Number(cell.dataset.y)][Number(cell.dataset.x)];
            if (enabled) activeCount += 1;
            cell.classList.toggle("is-on", enabled);
            cell.setAttribute("aria-pressed", String(enabled));
        });

        const bytes = bytesForSprite();
        dataOutput.value = bytes.join(",");
        hexOutput.value = bytes.map(value => "$" + value.toString(16).toUpperCase().padStart(2, "0")).join(",");
        count.textContent = activeCount + " PIXEL" + (activeCount === 1 ? "" : "S") + " · " + bytes.length + " BYTES";
        drawPreview();
    };

    const applyCell = cell => {
        if (!cell?.classList.contains("ccg-e11__pixel")) return;
        pixels[Number(cell.dataset.y)][Number(cell.dataset.x)] = paint;
        xReadout.textContent = String(Number(cell.dataset.x)).padStart(2, "0");
        yReadout.textContent = String(Number(cell.dataset.y)).padStart(2, "0");
        brushReadout.textContent = paint ? "DRAW" : "ERASE";
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

    const shiftHorizontal = direction => {
        pixels.forEach(row => {
            if (direction < 0) row.push(row.shift());
            else row.unshift(row.pop());
        });
    };
    const shiftVertical = direction => {
        if (direction < 0) pixels.push(pixels.shift());
        else pixels.unshift(pixels.pop());
    };

    const loadSample = () => {
        pixels.forEach(row => row.fill(false));
        const pattern = [
            "000111111111111111111000",
            "001100000000000000001100",
            "011001111011110111100110",
            "110011111111111111110011",
            "110011000111111000110011",
            "110011000111111000110011",
            "110011111111111111110011",
            "110001111111111111100011",
            "011000001111111100000110",
            "001100000111111000001100",
            "000110000011110000011000",
            "000011000001100000110000",
            "000001100000000001100000",
            "000000110000000011000000",
            "000000011000000110000000",
            "000000001100001100000000",
            "000000000110011000000000",
            "000000000011110000000000",
            "000000000001100000000000",
            "000000000001100000000000",
            "000000000011110000000000",
        ];
        pattern.forEach((row, y) => row.split("").forEach((value, x) => { pixels[y][x] = value === "1"; }));
    };

    const onAction = event => {
        const colour = event.target.closest("[data-sprite-colour]")?.dataset.spriteColour;
        if (colour !== undefined) {
            colourIndex = Number(colour);
            palette.querySelectorAll("[data-sprite-colour]").forEach(button => button.classList.toggle("is-active", Number(button.dataset.spriteColour) === colourIndex));
            drawPreview();
            return;
        }

        const requestedFormat = event.target.closest("[data-sprite-format]")?.dataset.spriteFormat;
        if (requestedFormat) {
            format = requestedFormat;
            root.querySelectorAll("[data-sprite-format]").forEach(button => button.classList.toggle("is-active", button.dataset.spriteFormat === format));
            dataOutput.hidden = format !== "DEC";
            hexOutput.hidden = format !== "HEX";
            return;
        }

        if (event.target.closest("[data-sprite-copy]")) {
            const value = format === "HEX" ? hexOutput.value : dataOutput.value;
            navigator.clipboard?.writeText?.(value).catch(() => {});
            const copyButton = root.querySelector("[data-sprite-copy]");
            copyButton.textContent = "COPIED";
            setTimeout(() => { copyButton.textContent = "COPY"; }, 800);
            return;
        }

        const action = event.target.closest("[data-sprite-action]")?.dataset.spriteAction;
        if (!action) return;
        if (action === "CLEAR") pixels.forEach(row => row.fill(false));
        if (action === "INVERT") pixels.forEach((row, y) => row.forEach((value, x) => { pixels[y][x] = !value; }));
        if (action === "MIRROR X") pixels.forEach((row, y) => { pixels[y] = [...row].reverse(); });
        if (action === "MIRROR Y") {
            const copy = pixels.map(row => [...row]).reverse();
            copy.forEach((row, y) => { pixels[y] = row; });
        }
        if (action === "SHIFT LEFT") shiftHorizontal(-1);
        if (action === "SHIFT RIGHT") shiftHorizontal(1);
        if (action === "SHIFT UP") shiftVertical(-1);
        if (action === "SHIFT DOWN") shiftVertical(1);
        if (action === "SAMPLE") loadSample();
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
