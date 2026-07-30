#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS_PATH = ROOT / "js" / "ccg-global.js"
MARKER = "CCG EASTER EGG E1 DATASETTE LOADER"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def main() -> None:
    text = JS_PATH.read_text(encoding="utf-8")
    if MARKER in text:
        print("Phase E1 datasette correction already applied.")
        return

    trigger_load = '''    /* CCG EASTER EGG E1 DATASETTE LOADER */
    async function triggerLoad() {
        const returnScroll = {
            left: window.scrollX || document.documentElement.scrollLeft || 0,
            top: window.scrollY || document.documentElement.scrollTop || 0,
        };
        const restoreScroll = () => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    window.scrollTo({ left: returnScroll.left, top: returnScroll.top, behavior: "auto" });
                });
            });
        };

        const loading = document.createElement("div");
        loading.className = "ccg-egg-overlay__audio";
        loading.innerHTML = "<span>INITIALISING DATASETTE...</span>";

        const overlay = openEasterEggOverlay(loading, { className: "ccg-egg-overlay--datasette" });
        overlay.dataset.ccgDatasetteModule = "loading";
        if (secretState.activeEgg?.overlay === overlay) {
            secretState.activeEgg.cleanup = restoreScroll;
        }

        try {
            const moduleUrl = new URL(`${getSiteRoot()}js/easter-eggs/datasette-loader.js`, window.location.origin).href;
            const module = await import(moduleUrl);
            const experience = await module.createDatasetteExperience({
                siteRoot: getSiteRoot(),
                prefersReducedMotion: prefersReducedMotion(),
            });

            if (!secretState.activeEgg || secretState.activeEgg.overlay !== overlay) {
                experience.cleanup?.();
                return;
            }

            const mediaContainer = overlay.querySelector(".ccg-egg-overlay__media");
            if (!mediaContainer) throw new Error("Datasette media container was not created");
            mediaContainer.replaceChildren(experience.content);
            secretState.activeEgg.cleanup = () => {
                experience.cleanup?.();
                restoreScroll();
            };
            overlay.dataset.ccgDatasetteModule = "ready";
            requestAnimationFrame(() => experience.focus?.());
        } catch (error) {
            console.error("[CCG] Datasette Easter egg failed", error);
            if (!secretState.activeEgg || secretState.activeEgg.overlay !== overlay) return;
            loading.innerHTML = `
                <span>DATASETTE FAILED TO START.</span>
                <a class="ccg-btn ccg-btn--ghost" href="${getSiteRoot()}games/index.html">OPEN GAMES ARCHIVE</a>
            `;
            overlay.dataset.ccgDatasetteModule = "error";
        }
    }

'''

    text = replace_once(
        text,
        "    function triggerWarp() {\n",
        trigger_load + "    function triggerWarp() {\n",
        "triggerLoad insertion",
    )

    text = replace_once(
        text,
        '        "pressplay": () => triggerPressPlay(),\n',
        '        "pressplay": () => triggerPressPlay(),\n        "load": () => triggerLoad(),\n',
        "LOAD cheat registration",
    )

    text = replace_once(
        text,
        '                    <li data-ccg-secret-code="pressplay">PRESS PLAY</li>\n',
        '                    <li data-ccg-secret-code="pressplay">PRESS PLAY</li>\n                    <li data-ccg-secret-code="load">LOAD</li>\n',
        "LOAD menu registration",
    )

    JS_PATH.write_text(text, encoding="utf-8")
    print("Applied Phase E1 datasette loader to js/ccg-global.js.")


if __name__ == "__main__":
    main()
