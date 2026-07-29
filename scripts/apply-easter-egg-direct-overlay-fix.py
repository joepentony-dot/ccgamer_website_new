#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS_PATH = ROOT / "js" / "ccg-global.js"
MARKER = "CCG DIRECT EASTER EGG VIEWPORT BINDING"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def main() -> None:
    text = JS_PATH.read_text(encoding="utf-8")
    if MARKER in text:
        print("Direct Easter egg overlays are already viewport-bound.")
        return

    text = replace_once(
        text,
        '''    function triggerC64Reset() {\n        const reset = createOverlay("ccg-c64-reset", `\n            <div class="ccg-c64-reset__screen">\n                <p>**** COMMODORE 64 BASIC V2 ****</p>\n                <p>64K RAM SYSTEM  38911 BASIC BYTES FREE</p>\n                <p class="ccg-c64-reset__ready">READY<span class="ccg-c64-reset__cursor"></span></p>\n            </div>\n        `);\n        setTimeout(() => reset.classList.add("is-active"), 30);\n        setTimeout(() => reset.remove(), 3200);\n    }''',
        '''    /* CCG DIRECT EASTER EGG VIEWPORT BINDING */\n    function triggerC64Reset() {\n        const reset = createOverlay("ccg-c64-reset", `\n            <div class="ccg-c64-reset__screen">\n                <p>**** COMMODORE 64 BASIC V2 ****</p>\n                <p>64K RAM SYSTEM  38911 BASIC BYTES FREE</p>\n                <p class="ccg-c64-reset__ready">READY<span class="ccg-c64-reset__cursor"></span></p>\n            </div>\n        `);\n        const viewportCleanup = bindOverlayToVisualViewport(reset);\n        setTimeout(() => reset.classList.add("is-active"), 30);\n        setTimeout(() => {\n            viewportCleanup();\n            reset.remove();\n        }, 3200);\n    }''',
        "C64 reset viewport binding",
    )

    text = replace_once(
        text,
        '''    function triggerBSOD() {\n        const bsod = createOverlay("ccg-bsod", `\n            <p>A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) + 00010E36.</p>\n            <p>Press any key to continue...</p>\n        `);\n        const remove = (event) => {''',
        '''    function triggerBSOD() {\n        const bsod = createOverlay("ccg-bsod", `\n            <p>A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) + 00010E36.</p>\n            <p>Press any key to continue...</p>\n        `);\n        const viewportCleanup = bindOverlayToVisualViewport(bsod);\n        let isRemoved = false;\n        const remove = (event) => {''',
        "BSOD viewport binding",
    )

    text = replace_once(
        text,
        '''            if (event && event.target && event.target.closest && event.target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable]')) {\n                return;\n            }\n            bsod.remove();\n        };''',
        '''            if (event && event.target && event.target.closest && event.target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable]')) {\n                return;\n            }\n            if (isRemoved) return;\n            isRemoved = true;\n            viewportCleanup();\n            bsod.remove();\n        };''',
        "BSOD viewport cleanup",
    )

    JS_PATH.write_text(text, encoding="utf-8")
    print("Direct Easter egg overlays are viewport-bound.")


if __name__ == "__main__":
    main()
