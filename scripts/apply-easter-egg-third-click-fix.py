#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS_PATH = ROOT / "js" / "ccg-global.js"
MARKER = "CCG EASTER EGG THIRD CLICK STABILITY"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def main() -> None:
    text = JS_PATH.read_text(encoding="utf-8")
    if MARKER in text:
        print("Third-click stability correction already applied.")
        return

    text = replace_once(
        text,
        '''        modalViewportCleanup: null,\n        backdropUnlockTimer: null,\n    };''',
        '''        modalViewportCleanup: null,\n        backdropUnlockTimer: null,\n        dismissLockUntil: 0,\n    };''',
        "secret dismissal state",
    )

    old_modal_binding = '''        document.body.appendChild(modal);\n        secretState.modal = modal;\n        modal.addEventListener("pointerdown", event => {\n            if (event.target !== modal) return;\n            if (!modal.dataset.ccgSecretModalLocked) return;\n            closeSecretModal();\n        }, { passive: false });\n\n        modal.querySelectorAll("[data-ccg-secret-code]").forEach(item => {\n            item.addEventListener("click", () => {\n                triggerCheat(item.dataset.ccgSecretCode || "");\n            });\n        });\n\n        modal.querySelector("[data-ccg-secret-close]").addEventListener("click", closeSecretModal);'''

    new_modal_binding = '''        document.body.appendChild(modal);\n        secretState.modal = modal;\n\n        /* CCG EASTER EGG THIRD CLICK STABILITY */\n        const blockOpeningGesture = event => {\n            if (!modal.classList.contains("is-open")) return false;\n            if (Date.now() >= secretState.dismissLockUntil) return false;\n\n            if (event?.preventDefault) event.preventDefault();\n            if (event?.stopImmediatePropagation) event.stopImmediatePropagation();\n            return true;\n        };\n\n        ["pointerdown", "pointerup", "mousedown", "mouseup", "touchend", "click"].forEach(eventName => {\n            modal.addEventListener(eventName, event => {\n                blockOpeningGesture(event);\n            }, { capture: true, passive: false });\n        });\n\n        modal.addEventListener("pointerdown", event => {\n            if (event.target !== modal) return;\n            if (!modal.dataset.ccgSecretModalLocked) return;\n            closeSecretModal();\n        }, { passive: false });\n\n        modal.querySelectorAll("[data-ccg-secret-code]").forEach(item => {\n            item.addEventListener("click", () => {\n                triggerCheat(item.dataset.ccgSecretCode || "");\n            });\n        });\n\n        modal.querySelector("[data-ccg-secret-close]").addEventListener("click", closeSecretModal);'''

    text = replace_once(text, old_modal_binding, new_modal_binding, "modal gesture shield")

    text = replace_once(
        text,
        '''        delete modal.dataset.ccgSecretModalLocked;\n        if (secretState.backdropUnlockTimer) {''',
        '''        delete modal.dataset.ccgSecretModalLocked;\n        secretState.dismissLockUntil = Date.now() + 1000;\n        if (secretState.backdropUnlockTimer) {''',
        "opening dismissal lock",
    )

    text = replace_once(
        text,
        '''            secretState.backdropUnlockTimer = setTimeout(() => {\n                modal.dataset.ccgSecretModalLocked = "true";\n                secretState.backdropUnlockTimer = null;\n            }, 900);''',
        '''            secretState.backdropUnlockTimer = setTimeout(() => {\n                modal.dataset.ccgSecretModalLocked = "true";\n                secretState.dismissLockUntil = 0;\n                secretState.backdropUnlockTimer = null;\n            }, 1000);''',
        "dismissal arming timer",
    )

    text = replace_once(
        text,
        '''        secretState.modal.setAttribute("aria-hidden", "true");\n        delete secretState.modal.dataset.ccgSecretModalLocked;\n\n        if (secretState.backdropUnlockTimer) {''',
        '''        secretState.modal.setAttribute("aria-hidden", "true");\n        delete secretState.modal.dataset.ccgSecretModalLocked;\n        secretState.dismissLockUntil = 0;\n\n        if (secretState.backdropUnlockTimer) {''',
        "dismissal lock cleanup",
    )

    JS_PATH.write_text(text, encoding="utf-8")
    print("Applied third-click stability correction to js/ccg-global.js.")


if __name__ == "__main__":
    main()
