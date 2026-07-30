#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS_PATH = ROOT / "js" / "ccg-global.js"
TEST_PATH = ROOT / "scripts" / "test-easter-egg-viewport.mjs"
JS_MARKER = "CCG EASTER EGG THIRD CLICK STABILITY"
TEST_MARKER = "CCG EASTER EGG DISMISSAL ARM TEST COMPATIBILITY"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def patch_js() -> None:
    text = JS_PATH.read_text(encoding="utf-8")
    if JS_MARKER in text:
        print("Third-click JavaScript correction already applied.")
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


def patch_viewport_test() -> None:
    text = TEST_PATH.read_text(encoding="utf-8")

    if "async function waitForSecretModalUnlock(page)" in text:
        changed = False
        wrong = "modal.getAttribute('data-ccg-secret-modal-locked') !== 'true'"
        right = "modal.getAttribute('data-ccg-secret-modal-locked') === 'true'"
        if wrong in text:
            text = text.replace(wrong, right, 1)
            changed = True

        if TEST_MARKER not in text:
            text = text.replace(
                "async function waitForSecretModalUnlock(page) {",
                f"/* {TEST_MARKER} */\nasync function waitForSecretModalUnlock(page) {{",
                1,
            )
            changed = True

        pacman_anchor = '''  await triggerTripleClick(page);\n  const reopenedScrollTop = await page.evaluate(() => document.querySelector('.ccg-secret-modal__content')?.scrollTop ?? null);\n\n  await page.evaluate(() => {\n    const pacman = document.querySelector('[data-ccg-secret-code="pacman"]');'''
        pacman_replacement = '''  await triggerTripleClick(page);\n  const reopenedScrollTop = await page.evaluate(() => document.querySelector('.ccg-secret-modal__content')?.scrollTop ?? null);\n  await waitForSecretModalUnlock(page);\n\n  await page.evaluate(() => {\n    const pacman = document.querySelector('[data-ccg-secret-code="pacman"]');'''
        if pacman_anchor in text:
            text = text.replace(pacman_anchor, pacman_replacement, 1)
            changed = True

        bsod_anchor = '''  await page.waitForTimeout(800);\n\n  await triggerTripleClick(page);\n  await page.evaluate(() => {\n    const bsod = document.querySelector('[data-ccg-secret-code="bsod"]');'''
        bsod_replacement = '''  await page.waitForTimeout(800);\n\n  await triggerTripleClick(page);\n  await waitForSecretModalUnlock(page);\n  await page.evaluate(() => {\n    const bsod = document.querySelector('[data-ccg-secret-code="bsod"]');'''
        if bsod_anchor in text:
            text = text.replace(bsod_anchor, bsod_replacement, 1)
            changed = True

        if changed:
            TEST_PATH.write_text(text, encoding="utf-8")
            print("Updated existing viewport dismissal helper and activation waits.")
        else:
            print("Viewport test dismissal-arm compatibility already applied.")
        return

    if TEST_MARKER in text:
        print("Viewport test dismissal-arm compatibility already applied.")
        return

    text = replace_once(
        text,
        '''  await page.locator('.ccg-secret-modal.is-open').waitFor({ state: 'visible', timeout: 5000 });\n}\n\nasync function viewportMetrics(page, selector) {''',
        '''  await page.locator('.ccg-secret-modal.is-open').waitFor({ state: 'visible', timeout: 5000 });\n}\n\n/* CCG EASTER EGG DISMISSAL ARM TEST COMPATIBILITY */\nasync function waitForSecretModalUnlock(page) {\n  await page.waitForFunction(\n    () => document.querySelector('.ccg-secret-modal')?.dataset.ccgSecretModalLocked === 'true',\n    null,\n    { timeout: 5000 },\n  );\n}\n\nasync function viewportMetrics(page, selector) {''',
        "viewport test dismissal helper",
    )

    text = replace_once(
        text,
        '''  await page.locator('[data-ccg-secret-close]').click();\n  await page.locator('.ccg-secret-modal.is-open').waitFor({ state: 'hidden', timeout: 5000 });''',
        '''  await waitForSecretModalUnlock(page);\n  await page.locator('[data-ccg-secret-close]').click();\n  await page.locator('.ccg-secret-modal.is-open').waitFor({ state: 'hidden', timeout: 5000 });''',
        "viewport test initial close",
    )

    text = replace_once(
        text,
        '''  await triggerTripleClick(page);\n  const reopenedScrollTop = await page.evaluate(() => document.querySelector('.ccg-secret-modal__content')?.scrollTop ?? null);\n\n  await page.evaluate(() => {\n    const pacman = document.querySelector('[data-ccg-secret-code="pacman"]');''',
        '''  await triggerTripleClick(page);\n  const reopenedScrollTop = await page.evaluate(() => document.querySelector('.ccg-secret-modal__content')?.scrollTop ?? null);\n  await waitForSecretModalUnlock(page);\n\n  await page.evaluate(() => {\n    const pacman = document.querySelector('[data-ccg-secret-code="pacman"]');''',
        "viewport test PACMAN activation",
    )

    text = replace_once(
        text,
        '''  await page.waitForTimeout(800);\n\n  await triggerTripleClick(page);\n  await page.evaluate(() => {\n    const bsod = document.querySelector('[data-ccg-secret-code="bsod"]');''',
        '''  await page.waitForTimeout(800);\n\n  await triggerTripleClick(page);\n  await waitForSecretModalUnlock(page);\n  await page.evaluate(() => {\n    const bsod = document.querySelector('[data-ccg-secret-code="bsod"]');''',
        "viewport test BSOD activation",
    )

    TEST_PATH.write_text(text, encoding="utf-8")
    print("Updated viewport test for the one-second dismissal shield.")


def main() -> None:
    patch_js()
    patch_viewport_test()


if __name__ == "__main__":
    main()
