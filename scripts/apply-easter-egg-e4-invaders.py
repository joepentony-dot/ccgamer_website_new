#!/usr/bin/env python3
from pathlib import Path

path = Path('js/ccg-global.js')
text = path.read_text(encoding='utf-8')

old = '''    function triggerInvaders() {
        if (usesMobileEasterEggControls()) {
            const desktopOnly = document.createElement("div");
            desktopOnly.className = "ccg-egg-overlay__desktop-only";
            desktopOnly.innerHTML = `
                <strong>AVAILABLE ON DESKTOP ONLY</strong>
                <span>SPACE INVADERS REQUIRES KEYBOARD CONTROLS.</span>
            `;
            openEasterEggOverlay(desktopOnly, { className: "ccg-egg-overlay--desktop-only" });
            return;
        }

        const invadersScreen = document.createElement("div");
        invadersScreen.className = "ccg-egg-overlay__screen ccg-egg-overlay__screen--invaders";
        const frame = createScreenFrame("https://dwmkerr.github.io/spaceinvaders/");
        frame.addEventListener("load", () => {
            requestAnimationFrame(() => frame.focus({ preventScroll: true }));
        }, { once: true });
        invadersScreen.appendChild(frame);
        openEasterEggOverlay(invadersScreen, { media: [frame], className: "ccg-egg-overlay--invaders" });
    }
'''

new = '''    /* CCG EASTER EGG E4 LOCAL INVADERS */
    function triggerInvaders() {
        const invadersScreen = document.createElement("div");
        invadersScreen.className = "ccg-egg-overlay__screen ccg-egg-overlay__screen--invaders";
        const frame = createScreenFrame(getEasterEggAsset("invaders.html"));
        frame.addEventListener("load", () => {
            requestAnimationFrame(() => frame.focus({ preventScroll: true }));
        }, { once: true });
        invadersScreen.appendChild(frame);
        openEasterEggOverlay(invadersScreen, { media: [frame], className: "ccg-egg-overlay--invaders" });
    }
'''

if 'CCG EASTER EGG E4 LOCAL INVADERS' in text:
    print('Phase E4 local Invaders integration already applied.')
elif old not in text:
    raise SystemExit('Legacy triggerInvaders block not found')
else:
    path.write_text(text.replace(old, new, 1), encoding='utf-8')
    print('Applied Phase E4 local Invaders integration.')
