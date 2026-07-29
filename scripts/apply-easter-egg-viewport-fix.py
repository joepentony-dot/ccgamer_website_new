#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS_PATH = ROOT / "js" / "ccg-global.js"
CSS_PATHS = [
    ROOT / "resources" / "css" / "ccg-master.css",
    ROOT / "resources" / "css" / "ccg-overlays.css",
]
JS_MARKER = "CCG EASTER EGG VISUAL VIEWPORT HARDENING"
CSS_MARKER = "CCG EASTER EGG VIEWPORT CONTRACT — AUTHORITATIVE"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def patch_js() -> None:
    text = JS_PATH.read_text(encoding="utf-8")
    if JS_MARKER in text:
        return

    text = replace_once(
        text,
        '''        activeEgg: null,\n        scrollLock: null,\n    };''',
        '''        activeEgg: null,\n        scrollLock: null,\n        lastFocusedElement: null,\n        modalViewportCleanup: null,\n        backdropUnlockTimer: null,\n    };''',
        "secret state",
    )

    text = replace_once(
        text,
        '''    function createOverlay(className, html) {\n        const overlay = document.createElement("div");\n        overlay.className = className;\n        if (html) overlay.innerHTML = html;\n        document.body.appendChild(overlay);\n        return overlay;\n    }\n\n    function getEasterEggAsset(filename) {''',
        '''    function createOverlay(className, html) {\n        const overlay = document.createElement("div");\n        overlay.className = className;\n        if (html) overlay.innerHTML = html;\n        document.body.appendChild(overlay);\n        return overlay;\n    }\n\n    /* CCG EASTER EGG VISUAL VIEWPORT HARDENING */\n    function bindOverlayToVisualViewport(overlay) {\n        if (!overlay) return () => {};\n\n        let correctionFrame = 0;\n\n        const sync = () => {\n            const viewport = window.visualViewport;\n            const desiredTop = viewport ? viewport.offsetTop : 0;\n            const desiredLeft = viewport ? viewport.offsetLeft : 0;\n            const width = viewport ? viewport.width : window.innerWidth;\n            const height = viewport ? viewport.height : window.innerHeight;\n\n            overlay.style.top = `${Math.max(0, desiredTop)}px`;\n            overlay.style.left = `${Math.max(0, desiredLeft)}px`;\n            overlay.style.right = "auto";\n            overlay.style.bottom = "auto";\n            overlay.style.width = `${Math.max(1, width)}px`;\n            overlay.style.height = `${Math.max(1, height)}px`;\n\n            if (overlay.getClientRects().length) {\n                const rect = overlay.getBoundingClientRect();\n                const correctedTop = desiredTop + (desiredTop - rect.top);\n                const correctedLeft = desiredLeft + (desiredLeft - rect.left);\n\n                if (Math.abs(rect.top - desiredTop) > 0.5) {\n                    overlay.style.top = `${Math.max(0, correctedTop)}px`;\n                }\n                if (Math.abs(rect.left - desiredLeft) > 0.5) {\n                    overlay.style.left = `${Math.max(0, correctedLeft)}px`;\n                }\n            }\n        };\n\n        const scheduleVisibleSync = () => {\n            if (correctionFrame) cancelAnimationFrame(correctionFrame);\n            correctionFrame = requestAnimationFrame(() => {\n                correctionFrame = requestAnimationFrame(() => {\n                    correctionFrame = 0;\n                    sync();\n                });\n            });\n        };\n\n        const listeners = [];\n        const bind = (target, eventName) => {\n            if (!target?.addEventListener) return;\n            target.addEventListener(eventName, sync, { passive: true });\n            listeners.push([target, eventName]);\n        };\n\n        bind(window, "resize");\n        bind(window, "orientationchange");\n        bind(window, "scroll");\n        bind(window.visualViewport, "resize");\n        bind(window.visualViewport, "scroll");\n        sync();\n        scheduleVisibleSync();\n\n        return () => {\n            if (correctionFrame) cancelAnimationFrame(correctionFrame);\n            listeners.forEach(([target, eventName]) => {\n                target.removeEventListener(eventName, sync);\n            });\n            ["top", "left", "right", "bottom", "width", "height"].forEach(property => {\n                overlay.style.removeProperty(property);\n            });\n        };\n    }\n\n    function getEasterEggAsset(filename) {''',
        "visual viewport helper",
    )

    text = replace_once(
        text,
        '''        const { overlay, media, escHandler, closeHandler, exitButton, cleanup, autoCloseTimer } = secretState.activeEgg;''',
        '''        const { overlay, media, escHandler, closeHandler, exitButton, cleanup, autoCloseTimer, viewportCleanup, lastFocusedElement } = secretState.activeEgg;''',
        "active Easter egg destructure",
    )

    text = replace_once(
        text,
        '''        if (typeof cleanup === "function") {\n            cleanup();\n        }\n\n        if (overlay) {''',
        '''        if (typeof cleanup === "function") {\n            cleanup();\n        }\n\n        if (typeof viewportCleanup === "function") {\n            viewportCleanup();\n        }\n\n        if (overlay) {''',
        "active Easter egg viewport cleanup",
    )

    text = replace_once(
        text,
        '''        document.body.classList.remove("ccg-egg-open");\n        secretState.activeEgg = null;\n    }''',
        '''        document.body.classList.remove("ccg-egg-open");\n        secretState.activeEgg = null;\n\n        if (lastFocusedElement?.isConnected && typeof lastFocusedElement.focus === "function") {\n            requestAnimationFrame(() => {\n                lastFocusedElement.focus({ preventScroll: true });\n            });\n        }\n    }''',
        "active Easter egg focus restoration",
    )

    text = replace_once(
        text,
        '''        const overlay = createOverlay("ccg-egg-overlay");\n        overlay.classList.add("ccg-egg-overlay--letterbox");''',
        '''        const lastFocusedElement = secretState.lastFocusedElement\n            || (document.activeElement instanceof HTMLElement ? document.activeElement : null);\n        secretState.lastFocusedElement = null;\n\n        const overlay = createOverlay("ccg-egg-overlay");\n        overlay.classList.add("ccg-egg-overlay--letterbox");\n        overlay.setAttribute("role", "dialog");\n        overlay.setAttribute("aria-modal", "true");\n        overlay.setAttribute("aria-label", "CCG Easter egg result");''',
        "Easter egg overlay setup",
    )

    text = replace_once(
        text,
        '''            <div class="ccg-egg-overlay__frame">''',
        '''            <div class="ccg-egg-overlay__frame" tabindex="-1">''',
        "Easter egg frame focus target",
    )

    text = replace_once(
        text,
        '''        document.body.classList.add("ccg-egg-open");\n\n        secretState.activeEgg = {''',
        '''        document.body.classList.add("ccg-egg-open");\n        const viewportCleanup = bindOverlayToVisualViewport(overlay);\n\n        secretState.activeEgg = {''',
        "Easter egg viewport binding",
    )

    text = replace_once(
        text,
        '''            cleanup: options.cleanup || null,\n            autoCloseTimer: options.autoCloseTimer || null,\n        };\n\n        return overlay;''',
        '''            cleanup: options.cleanup || null,\n            autoCloseTimer: options.autoCloseTimer || null,\n            viewportCleanup,\n            lastFocusedElement,\n        };\n\n        requestAnimationFrame(() => {\n            exitButton?.focus({ preventScroll: true });\n        });\n\n        return overlay;''',
        "Easter egg active state",
    )

    text = replace_once(
        text,
        '''            <div class="ccg-secret-modal__content" role="dialog" aria-label="Secret system commands">''',
        '''            <div class="ccg-secret-modal__content" role="dialog" aria-modal="true" aria-label="Secret system commands" tabindex="-1">''',
        "secret modal accessibility attributes",
    )

    old_locking = '''    function lockSecretModalScroll() {\n        if (secretState.scrollLock) return;\n\n        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;\n        secretState.scrollLock = {\n            scrollY,\n            bodyPosition: document.body.style.position,\n            bodyTop: document.body.style.top,\n            bodyLeft: document.body.style.left,\n            bodyRight: document.body.style.right,\n            bodyWidth: document.body.style.width,\n            bodyOverflow: document.body.style.overflow,\n            htmlOverflow: document.documentElement.style.overflow,\n        };\n\n        document.documentElement.style.overflow = "hidden";\n        document.body.style.overflow = "hidden";\n        document.body.style.position = "fixed";\n        document.body.style.top = `-${scrollY}px`;\n        document.body.style.left = "0";\n        document.body.style.right = "0";\n        document.body.style.width = "100%";\n    }\n\n    function unlockSecretModalScroll() {\n        const lock = secretState.scrollLock;\n        if (!lock) return;\n\n        document.documentElement.style.overflow = lock.htmlOverflow;\n        document.body.style.overflow = lock.bodyOverflow;\n        document.body.style.position = lock.bodyPosition;\n        document.body.style.top = lock.bodyTop;\n        document.body.style.left = lock.bodyLeft;\n        document.body.style.right = lock.bodyRight;\n        document.body.style.width = lock.bodyWidth;\n        secretState.scrollLock = null;\n        window.scrollTo(0, lock.scrollY);\n    }'''

    new_locking = '''    function lockSecretModalScroll() {\n        if (secretState.scrollLock) return;\n\n        const scrollX = window.scrollX || document.documentElement.scrollLeft || 0;\n        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;\n        const scrollbarGap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);\n        const computedPaddingRight = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;\n\n        secretState.scrollLock = {\n            scrollX,\n            scrollY,\n            bodyOverflow: document.body.style.overflow,\n            bodyPaddingRight: document.body.style.paddingRight,\n            bodyOverscrollBehavior: document.body.style.overscrollBehavior,\n            htmlOverflow: document.documentElement.style.overflow,\n            htmlOverscrollBehavior: document.documentElement.style.overscrollBehavior,\n        };\n\n        document.documentElement.style.overflow = "hidden";\n        document.documentElement.style.overscrollBehavior = "none";\n        document.body.style.overflow = "hidden";\n        document.body.style.overscrollBehavior = "none";\n        if (scrollbarGap > 0) {\n            document.body.style.paddingRight = `${computedPaddingRight + scrollbarGap}px`;\n        }\n    }\n\n    function unlockSecretModalScroll() {\n        const lock = secretState.scrollLock;\n        if (!lock) return;\n\n        document.documentElement.style.overflow = lock.htmlOverflow;\n        document.documentElement.style.overscrollBehavior = lock.htmlOverscrollBehavior;\n        document.body.style.overflow = lock.bodyOverflow;\n        document.body.style.paddingRight = lock.bodyPaddingRight;\n        document.body.style.overscrollBehavior = lock.bodyOverscrollBehavior;\n        secretState.scrollLock = null;\n        window.scrollTo({ left: lock.scrollX, top: lock.scrollY, behavior: "auto" });\n    }'''
    text = replace_once(text, old_locking, new_locking, "secret modal scroll lock")

    old_open_close = '''    function openSecretModal(openEvent) {\n        const modal = buildSecretModal();\n        if (modal.classList.contains("is-open")) return;\n\n        if (openEvent?.preventDefault) openEvent.preventDefault();\n        if (openEvent?.stopPropagation) openEvent.stopPropagation();\n\n        delete modal.dataset.ccgSecretModalLocked;\n\n        requestAnimationFrame(() => {\n            if (!modal) return;\n            modal.classList.add("is-open");\n            modal.setAttribute("aria-hidden", "false");\n            document.body.classList.add("ccg-secret-modal-open");\n            lockSecretModalScroll();\n\n            requestAnimationFrame(() => {\n                modal.dataset.ccgSecretModalLocked = "true";\n            });\n        });\n    }\n\n    function closeSecretModal() {\n        if (!secretState.modal) return;\n        secretState.modal.classList.remove("is-open");\n        secretState.modal.setAttribute("aria-hidden", "true");\n        delete secretState.modal.dataset.ccgSecretModalLocked;\n        document.body.classList.remove("ccg-secret-modal-open");\n        unlockSecretModalScroll();\n        resetSecretInputState();\n    }'''

    new_open_close = '''    function openSecretModal(openEvent) {\n        const modal = buildSecretModal();\n        if (modal.classList.contains("is-open")) return;\n\n        if (openEvent?.preventDefault) openEvent.preventDefault();\n        if (openEvent?.stopPropagation) openEvent.stopPropagation();\n\n        secretState.lastFocusedElement = document.activeElement instanceof HTMLElement\n            ? document.activeElement\n            : null;\n\n        if (typeof secretState.modalViewportCleanup === "function") {\n            secretState.modalViewportCleanup();\n        }\n        secretState.modalViewportCleanup = bindOverlayToVisualViewport(modal);\n\n        const content = modal.querySelector(".ccg-secret-modal__content");\n        const closeButton = modal.querySelector("[data-ccg-secret-close]");\n        if (content) content.scrollTop = 0;\n\n        delete modal.dataset.ccgSecretModalLocked;\n        if (secretState.backdropUnlockTimer) {\n            clearTimeout(secretState.backdropUnlockTimer);\n            secretState.backdropUnlockTimer = null;\n        }\n\n        requestAnimationFrame(() => {\n            if (!modal) return;\n            modal.classList.add("is-open");\n            modal.setAttribute("aria-hidden", "false");\n            document.body.classList.add("ccg-secret-modal-open");\n            lockSecretModalScroll();\n\n            requestAnimationFrame(() => {\n                if (content) content.scrollTop = 0;\n                closeButton?.focus({ preventScroll: true });\n            });\n\n            secretState.backdropUnlockTimer = setTimeout(() => {\n                modal.dataset.ccgSecretModalLocked = "true";\n                secretState.backdropUnlockTimer = null;\n            }, 900);\n        });\n    }\n\n    function closeSecretModal() {\n        if (!secretState.modal) return;\n\n        const previousFocus = secretState.lastFocusedElement;\n        secretState.modal.classList.remove("is-open");\n        secretState.modal.setAttribute("aria-hidden", "true");\n        delete secretState.modal.dataset.ccgSecretModalLocked;\n\n        if (secretState.backdropUnlockTimer) {\n            clearTimeout(secretState.backdropUnlockTimer);\n            secretState.backdropUnlockTimer = null;\n        }\n        if (typeof secretState.modalViewportCleanup === "function") {\n            secretState.modalViewportCleanup();\n            secretState.modalViewportCleanup = null;\n        }\n\n        document.body.classList.remove("ccg-secret-modal-open");\n        unlockSecretModalScroll();\n        resetSecretInputState();\n\n        requestAnimationFrame(() => {\n            if (secretState.activeEgg) return;\n            if (previousFocus?.isConnected && typeof previousFocus.focus === "function") {\n                previousFocus.focus({ preventScroll: true });\n                secretState.lastFocusedElement = null;\n            }\n        });\n    }'''
    text = replace_once(text, old_open_close, new_open_close, "secret modal open and close")

    JS_PATH.write_text(text, encoding="utf-8")


CSS_CONTRACT = r'''

/* ============================================================
   CCG EASTER EGG VIEWPORT CONTRACT — AUTHORITATIVE
   Keeps the three-click menu and every result within the visible
   browser viewport, including short phones and landscape mode.
============================================================ */
.ccg-secret-modal,
.ccg-egg-overlay {
    position: fixed;
    inset: 0;
    box-sizing: border-box;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    max-width: none;
    max-height: none;
    overflow: hidden;
    align-items: center;
    justify-content: center;
    padding:
        calc(env(safe-area-inset-top, 0px) + clamp(8px, 2vmin, 18px))
        calc(env(safe-area-inset-right, 0px) + clamp(8px, 2vmin, 18px))
        calc(env(safe-area-inset-bottom, 0px) + clamp(8px, 2vmin, 18px))
        calc(env(safe-area-inset-left, 0px) + clamp(8px, 2vmin, 18px));
}

.ccg-secret-modal__content {
    box-sizing: border-box;
    width: min(680px, 100%);
    max-width: 100%;
    max-height: 100%;
    min-height: 0;
    margin: 0 auto;
    padding: clamp(16px, 4vw, 28px);
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    scrollbar-gutter: stable;
    scroll-padding-top: 72px;
}

.ccg-secret-modal__actions {
    position: sticky;
    top: 0;
    z-index: 6;
    margin: calc(clamp(16px, 4vw, 28px) * -1) calc(clamp(16px, 4vw, 28px) * -1) 18px;
    padding: clamp(14px, 3vw, 20px) clamp(16px, 4vw, 28px) 12px;
    background: linear-gradient(180deg, rgba(8, 14, 25, 0.99) 72%, rgba(8, 14, 25, 0));
}

.ccg-secret-btn {
    max-width: 100%;
    white-space: normal;
    text-align: center;
}

.ccg-secret-list {
    columns: auto;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 16px;
}

.ccg-secret-list li {
    min-width: 0;
    margin-bottom: 0;
    break-inside: avoid;
}

body.ccg-secret-modal-open {
    overflow: hidden;
    overscroll-behavior: none;
    touch-action: auto;
}

.ccg-egg-overlay__frame {
    box-sizing: border-box;
    width: min(1200px, 100%);
    height: min(90vh, 900px);
    height: min(90dvh, 900px);
    max-width: 100%;
    max-height: 100%;
    min-width: 0;
    min-height: 0;
    margin: 0 auto;
    overflow: hidden;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
}

.ccg-egg-overlay__exit {
    position: relative;
    z-index: 5;
    max-width: 100%;
    white-space: normal;
    text-align: center;
}

.ccg-egg-overlay__media {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    min-width: 0;
    min-height: 0;
    margin: 0 auto;
    aspect-ratio: auto;
    overflow: hidden;
}

.ccg-egg-overlay--square .ccg-egg-overlay__media {
    width: auto;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    min-height: 0;
    aspect-ratio: 1 / 1;
    justify-self: center;
}

.ccg-egg-overlay--vertical .ccg-egg-overlay__media {
    width: auto;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    min-height: 0;
    aspect-ratio: 9 / 16;
    justify-self: center;
}

.ccg-egg-overlay--party .ccg-egg-overlay__media {
    min-height: 0;
    max-height: 100%;
}

body.ccg-egg-open {
    overflow: hidden;
    overscroll-behavior: none;
}

@media (max-width: 720px) {
    .ccg-secret-list {
        grid-template-columns: 1fr;
    }

    .ccg-secret-modal__content {
        border-radius: 16px;
    }

    .ccg-egg-overlay__frame {
        gap: 10px;
        padding: 10px;
        border-radius: 16px;
    }

    .ccg-egg-overlay__exit {
        width: 100%;
        align-self: stretch;
        padding: 9px 12px;
        font-size: 0.72rem;
        letter-spacing: 0.07em;
    }

    .ccg-egg-overlay__media {
        padding: 6px;
        border-radius: 12px;
    }
}

@media (max-height: 520px) {
    .ccg-secret-modal__content {
        padding: 12px 16px 16px;
    }

    .ccg-secret-modal__actions {
        margin: -12px -16px 10px;
        padding: 8px 16px 8px;
    }

    .ccg-secret-modal__content h2 {
        margin-bottom: 4px;
        font-size: 1rem;
    }

    .ccg-secret-modal__hint {
        margin-bottom: 10px;
        font-size: 0.78rem;
    }

    .ccg-secret-list {
        gap: 5px 10px;
    }

    .ccg-secret-list li {
        padding: 6px 10px;
        font-size: 0.74rem;
    }

    .ccg-egg-overlay__frame {
        height: 100%;
    }
}
'''


def patch_css() -> None:
    for path in CSS_PATHS:
        text = path.read_text(encoding="utf-8")
        if CSS_MARKER in text:
            continue
        path.write_text(text.rstrip() + CSS_CONTRACT + "\n", encoding="utf-8")


def validate() -> None:
    js = JS_PATH.read_text(encoding="utf-8")
    if JS_MARKER not in js:
        raise RuntimeError("JavaScript viewport hardening marker missing")
    for path in CSS_PATHS:
        css = path.read_text(encoding="utf-8")
        if CSS_MARKER not in css:
            raise RuntimeError(f"CSS viewport contract missing from {path}")


if __name__ == "__main__":
    patch_js()
    patch_css()
    validate()
    print("Easter egg viewport fix applied and validated.")
