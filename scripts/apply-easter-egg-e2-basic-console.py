#!/usr/bin/env python3
from pathlib import Path

path = Path('js/ccg-global.js')
text = path.read_text(encoding='utf-8')

if 'CCG EASTER EGG E2 BASIC CONSOLE' not in text:
    marker = '    function triggerWarp() {'
    block = '''    /* CCG EASTER EGG E2 BASIC CONSOLE */
    async function triggerBasic(launchContext = null) {
        const returnScroll = {
            left: Number.isFinite(launchContext?.scrollX)
                ? launchContext.scrollX
                : (window.scrollX || document.documentElement.scrollLeft || 0),
            top: Number.isFinite(launchContext?.scrollY)
                ? launchContext.scrollY
                : (window.scrollY || document.documentElement.scrollTop || 0),
        };
        let scrollRestoreTimers = [];
        const restoreScroll = () => {
            const apply = () => window.scrollTo({
                left: returnScroll.left,
                top: returnScroll.top,
                behavior: "auto",
            });
            apply();
            requestAnimationFrame(() => requestAnimationFrame(apply));
            scrollRestoreTimers.forEach(timer => window.clearTimeout(timer));
            scrollRestoreTimers = [80, 180].map(delay => window.setTimeout(apply, delay));
        };

        const styleId = "ccg-easter-egg-basic-css";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("link");
            style.id = styleId;
            style.rel = "stylesheet";
            style.href = `${getSiteRoot()}resources/css/easter-eggs-basic.css`;
            document.head.appendChild(style);
        }

        const loading = document.createElement("div");
        loading.className = "ccg-egg-overlay__audio";
        loading.innerHTML = "<span>BOOTING C64 BASIC...</span>";
        const overlay = openEasterEggOverlay(loading, { className: "ccg-egg-overlay--basic" });
        overlay.dataset.ccgBasicModule = "loading";
        if (secretState.activeEgg?.overlay === overlay) secretState.activeEgg.cleanup = restoreScroll;

        try {
            const moduleUrl = new URL(`${getSiteRoot()}js/easter-eggs/basic-console.js`, window.location.origin).href;
            const module = await import(moduleUrl);
            const experience = module.createBasicConsoleExperience({
                siteRoot: getSiteRoot(),
                prefersReducedMotion: prefersReducedMotion(),
            });
            if (!secretState.activeEgg || secretState.activeEgg.overlay !== overlay) {
                experience.cleanup?.();
                return;
            }
            const mediaContainer = overlay.querySelector(".ccg-egg-overlay__media");
            if (!mediaContainer) throw new Error("BASIC media container was not created");
            mediaContainer.replaceChildren(experience.content);
            secretState.activeEgg.cleanup = () => {
                experience.cleanup?.();
                restoreScroll();
            };
            overlay.dataset.ccgBasicModule = "ready";
            requestAnimationFrame(() => experience.focus?.());
        } catch (error) {
            console.error("[CCG] BASIC Easter egg failed", error);
            if (!secretState.activeEgg || secretState.activeEgg.overlay !== overlay) return;
            loading.innerHTML = "<span>?BASIC LOAD ERROR</span>";
            overlay.dataset.ccgBasicModule = "error";
        }
    }

'''
    if marker not in text:
        raise SystemExit('triggerWarp marker not found')
    text = text.replace(marker, block + marker, 1)

if '"basic": launchContext => triggerBasic(launchContext),' not in text:
    marker = '        "load": () => triggerLoad(),\n'
    if marker not in text:
        raise SystemExit('LOAD cheat marker not found')
    text = text.replace(marker, marker + '        "basic": launchContext => triggerBasic(launchContext),\n', 1)

if 'data-ccg-secret-code="basic"' not in text:
    marker = '                    <li data-ccg-secret-code="load">LOAD</li>\n'
    if marker not in text:
        raise SystemExit('LOAD menu marker not found')
    text = text.replace(marker, marker + '                    <li data-ccg-secret-code="basic">BASIC</li>\n', 1)

if 'CCG BASIC PRE-CLOSE SCROLL BOOKMARK' not in text:
    old = '''    function triggerCheat(code) {
        const normalized = normalizeCode(code);
        if (cheats[normalized]) {
            closeSecretModal();
            stopActiveEasterEgg();
            cheats[normalized]();
        }
    }
'''
    new = '''    function triggerCheat(code) {
        const normalized = normalizeCode(code);
        if (cheats[normalized]) {
            /* CCG BASIC PRE-CLOSE SCROLL BOOKMARK */
            const launchContext = normalized === "basic" && secretState.scrollLock
                ? {
                    scrollX: secretState.scrollLock.scrollX,
                    scrollY: secretState.scrollLock.scrollY,
                }
                : null;
            closeSecretModal();
            stopActiveEasterEgg();
            cheats[normalized](launchContext);
        }
    }
'''
    if old not in text:
        raise SystemExit('triggerCheat block not found')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('Applied Phase E2 BASIC console integration.')
