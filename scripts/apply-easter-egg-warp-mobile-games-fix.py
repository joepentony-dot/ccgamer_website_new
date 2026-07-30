#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS_PATH = ROOT / "js" / "ccg-global.js"
OVERLAYS_PATH = ROOT / "resources" / "css" / "ccg-overlays.css"
PACMAN_PATH = ROOT / "resources" / "audio" / "easter-eggs" / "pacman.html"
PACMAN_CSS_PATH = ROOT / "resources" / "css" / "pacman-touch.css"

JS_MARKER = "CCG WARP AND MOBILE EASTER EGG GAME REPAIR"
CSS_MARKER = "CCG EASTER EGG GAME-SPECIFIC LAYOUTS"
PACMAN_MARKER = "CCG PACMAN TOUCH CONTROLS"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def patch_js() -> None:
    text = JS_PATH.read_text(encoding="utf-8")
    if JS_MARKER in text:
        print("JavaScript Easter egg game repair already applied.")
        return

    text = replace_once(
        text,
        '''    function prefersReducedMotion() {\n        return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;\n    }\n\n    function createAudioElement(src) {''',
        '''    function prefersReducedMotion() {\n        return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;\n    }\n\n    /* CCG WARP AND MOBILE EASTER EGG GAME REPAIR */\n    function usesMobileEasterEggControls() {\n        const coarsePointer = typeof window.matchMedia === "function"\n            && window.matchMedia("(pointer: coarse)").matches;\n        return window.innerWidth <= 900 || (coarsePointer && window.innerWidth <= 1100);\n    }\n\n    function createAudioElement(src) {''',
        "mobile Easter egg controls helper",
    )

    old_warp = '''    function triggerWarp() {\n        document.body.classList.add("ccg-warp");\n        setTimeout(() => document.body.classList.remove("ccg-warp"), 5200);\n    }'''

    new_warp = '''    function triggerWarp() {\n        const overlay = createOverlay("ccg-warp-overlay", `\n            <canvas class="ccg-warp-overlay__canvas" aria-hidden="true"></canvas>\n            <div class="ccg-warp-overlay__label">WARP DRIVE ENGAGED</div>\n        `);\n        overlay.setAttribute("role", "dialog");\n        overlay.setAttribute("aria-modal", "true");\n        overlay.setAttribute("aria-label", "Warp drive Easter egg");\n        overlay.tabIndex = -1;\n\n        const canvas = overlay.querySelector(".ccg-warp-overlay__canvas");\n        const context = canvas?.getContext("2d");\n        const page = document.querySelector(".ccg-page");\n        const reduceMotion = prefersReducedMotion();\n        const viewportCleanup = bindOverlayToVisualViewport(overlay);\n        const stars = [];\n        let width = 1;\n        let height = 1;\n        let centreX = 0.5;\n        let centreY = 0.5;\n        let maximumDistance = 1;\n        let animationFrame = 0;\n        let closeTimer = 0;\n        let pageAnimation = null;\n        let removed = false;\n        let previousTime = performance.now();\n\n        const resetStar = (star, initial = false) => {\n            star.angle = Math.random() * Math.PI * 2;\n            star.distance = initial ? Math.random() * maximumDistance : Math.random() * 24;\n            star.speed = 0.12 + Math.random() * 0.34;\n            star.length = 10 + Math.random() * 34;\n            star.brightness = 0.42 + Math.random() * 0.58;\n        };\n\n        const resize = () => {\n            if (!canvas || !context) return;\n            const ratio = Math.min(window.devicePixelRatio || 1, 2);\n            width = Math.max(1, overlay.clientWidth || window.innerWidth);\n            height = Math.max(1, overlay.clientHeight || window.innerHeight);\n            centreX = width / 2;\n            centreY = height / 2;\n            maximumDistance = Math.hypot(width, height) * 0.62;\n            canvas.width = Math.round(width * ratio);\n            canvas.height = Math.round(height * ratio);\n            canvas.style.width = `${width}px`;\n            canvas.style.height = `${height}px`;\n            context.setTransform(ratio, 0, 0, ratio, 0, 0);\n\n            const targetCount = reduceMotion ? 64 : Math.min(180, Math.max(96, Math.round(width / 7)));\n            while (stars.length < targetCount) {\n                const star = {};\n                resetStar(star, true);\n                stars.push(star);\n            }\n            if (stars.length > targetCount) stars.length = targetCount;\n        };\n\n        const draw = (now, advance = true) => {\n            if (!context) return;\n            const elapsed = Math.min(42, Math.max(8, now - previousTime));\n            previousTime = now;\n\n            context.fillStyle = reduceMotion ? "#030611" : "rgba(3, 6, 17, 0.42)";\n            context.fillRect(0, 0, width, height);\n\n            const glow = context.createRadialGradient(centreX, centreY, 0, centreX, centreY, maximumDistance * 0.82);\n            glow.addColorStop(0, "rgba(125, 247, 255, 0.32)");\n            glow.addColorStop(0.18, "rgba(77, 131, 255, 0.12)");\n            glow.addColorStop(1, "rgba(2, 4, 12, 0)");\n            context.fillStyle = glow;\n            context.fillRect(0, 0, width, height);\n\n            stars.forEach(star => {\n                if (advance) {\n                    const acceleration = 1 + (star.distance / maximumDistance) * 5.2;\n                    star.distance += star.speed * elapsed * acceleration;\n                    if (star.distance > maximumDistance) resetStar(star, false);\n                }\n\n                const stretch = star.length * (1 + (star.distance / maximumDistance) * 5);\n                const startDistance = Math.max(0, star.distance - stretch);\n                const cosine = Math.cos(star.angle);\n                const sine = Math.sin(star.angle);\n                const startX = centreX + cosine * startDistance;\n                const startY = centreY + sine * startDistance;\n                const endX = centreX + cosine * star.distance;\n                const endY = centreY + sine * star.distance;\n                const alpha = Math.min(1, star.brightness * (0.35 + star.distance / maximumDistance));\n\n                context.beginPath();\n                context.moveTo(startX, startY);\n                context.lineTo(endX, endY);\n                context.lineWidth = 0.8 + (star.distance / maximumDistance) * 2.6;\n                context.strokeStyle = `rgba(170, 235, 255, ${alpha})`;\n                context.stroke();\n            });\n        };\n\n        const closeWarp = () => {\n            if (removed) return;\n            removed = true;\n            if (animationFrame) cancelAnimationFrame(animationFrame);\n            if (closeTimer) clearTimeout(closeTimer);\n            if (pageAnimation) pageAnimation.cancel();\n            window.removeEventListener("resize", resize);\n            document.removeEventListener("keydown", handleKeydown);\n            viewportCleanup();\n            document.body.classList.remove("ccg-warp");\n            overlay.remove();\n        };\n\n        const handleKeydown = event => {\n            if (event.key === "Escape") closeWarp();\n        };\n\n        overlay.addEventListener("pointerdown", closeWarp, { once: true });\n        document.addEventListener("keydown", handleKeydown);\n        window.addEventListener("resize", resize, { passive: true });\n        document.body.classList.add("ccg-warp");\n        resize();\n\n        if (reduceMotion) {\n            draw(performance.now(), false);\n            closeTimer = window.setTimeout(closeWarp, 1800);\n        } else {\n            requestAnimationFrame(() => {\n                const cssAnimationName = page ? getComputedStyle(page).animationName : "none";\n                if ((!cssAnimationName || cssAnimationName === "none") && page?.animate) {\n                    pageAnimation = page.animate([\n                        { transform: "scale(1) rotate(0deg)", opacity: 1 },\n                        { transform: "scale(0.28) rotate(300deg)", opacity: 0.42, offset: 0.5 },\n                        { transform: "scale(1) rotate(360deg)", opacity: 1 },\n                    ], {\n                        duration: 5000,\n                        easing: "cubic-bezier(0.45, 0, 0.2, 1)",\n                    });\n                }\n            });\n\n            const tick = now => {\n                if (removed) return;\n                draw(now, true);\n                animationFrame = requestAnimationFrame(tick);\n            };\n            animationFrame = requestAnimationFrame(tick);\n            closeTimer = window.setTimeout(closeWarp, 5200);\n        }\n\n        requestAnimationFrame(() => overlay.focus({ preventScroll: true }));\n    }'''

    text = replace_once(text, old_warp, new_warp, "WARP implementation")

    old_pacman = '''    function triggerPacman() {\n        const pacmanScreen = document.createElement("div");\n        pacmanScreen.className = "ccg-egg-overlay__screen";\n        const frame = createScreenFrame(getEasterEggAsset("pacman.html"));\n        pacmanScreen.appendChild(frame);\n        openEasterEggOverlay(pacmanScreen, { media: [frame], className: "ccg-egg-overlay--square" });\n    }'''

    new_pacman = '''    function triggerPacman() {\n        const pacmanScreen = document.createElement("div");\n        pacmanScreen.className = "ccg-egg-overlay__screen ccg-egg-overlay__screen--pacman";\n        const frame = createScreenFrame(getEasterEggAsset("pacman.html"));\n        frame.addEventListener("load", () => {\n            if (!usesMobileEasterEggControls()) {\n                frame.focus({ preventScroll: true });\n            }\n        }, { once: true });\n        pacmanScreen.appendChild(frame);\n        openEasterEggOverlay(pacmanScreen, { media: [frame], className: "ccg-egg-overlay--pacman" });\n    }'''

    text = replace_once(text, old_pacman, new_pacman, "PACMAN overlay")

    old_invaders = '''    function triggerInvaders() {\n        const invadersScreen = document.createElement("div");\n        invadersScreen.className = "ccg-egg-overlay__screen";\n        const frame = createScreenFrame("https://dwmkerr.github.io/spaceinvaders/");\n        invadersScreen.appendChild(frame);\n        openEasterEggOverlay(invadersScreen, { media: [frame], className: "ccg-egg-overlay--square" });\n    }'''

    new_invaders = '''    function triggerInvaders() {\n        if (usesMobileEasterEggControls()) {\n            const desktopOnly = document.createElement("div");\n            desktopOnly.className = "ccg-egg-overlay__desktop-only";\n            desktopOnly.innerHTML = `\n                <strong>AVAILABLE ON DESKTOP ONLY</strong>\n                <span>SPACE INVADERS REQUIRES KEYBOARD CONTROLS.</span>\n            `;\n            openEasterEggOverlay(desktopOnly, { className: "ccg-egg-overlay--desktop-only" });\n            return;\n        }\n\n        const invadersScreen = document.createElement("div");\n        invadersScreen.className = "ccg-egg-overlay__screen ccg-egg-overlay__screen--invaders";\n        const frame = createScreenFrame("https://dwmkerr.github.io/spaceinvaders/");\n        frame.addEventListener("load", () => {\n            requestAnimationFrame(() => frame.focus({ preventScroll: true }));\n        }, { once: true });\n        invadersScreen.appendChild(frame);\n        openEasterEggOverlay(invadersScreen, { media: [frame], className: "ccg-egg-overlay--invaders" });\n    }'''

    text = replace_once(text, old_invaders, new_invaders, "INVADERS overlay")
    JS_PATH.write_text(text, encoding="utf-8")
    print("Applied WARP, PACMAN and INVADERS JavaScript repairs.")


def patch_overlays_css() -> None:
    text = OVERLAYS_PATH.read_text(encoding="utf-8")
    if CSS_MARKER in text:
        print("Easter egg game layout CSS already applied.")
        return

    addition = r'''

/* ============================================================
   CCG EASTER EGG GAME-SPECIFIC LAYOUTS
   WARP canvas, PACMAN mobile controls and centred INVADERS frame.
============================================================ */
.ccg-warp-overlay {
    position: fixed;
    inset: 0;
    z-index: 100002;
    overflow: hidden;
    cursor: pointer;
    background: #030611;
    color: #d7f7ff;
    outline: none;
    touch-action: manipulation;
}

.ccg-warp-overlay__canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
}

.ccg-warp-overlay__label {
    position: absolute;
    left: 50%;
    bottom: max(28px, calc(env(safe-area-inset-bottom, 0px) + 18px));
    transform: translateX(-50%);
    width: min(90vw, 620px);
    padding: 12px 18px;
    border: 1px solid rgba(126, 252, 255, 0.65);
    border-radius: 999px;
    background: rgba(3, 8, 20, 0.72);
    box-shadow: 0 0 26px rgba(72, 212, 255, 0.38);
    color: #bffbff;
    font-family: "C64 Pro Mono", "Roboto Mono", monospace;
    font-size: clamp(0.78rem, 3vw, 1rem);
    font-weight: 700;
    letter-spacing: 0.16em;
    line-height: 1.25;
    text-align: center;
    text-transform: uppercase;
    pointer-events: none;
}

.ccg-egg-overlay--pacman .ccg-egg-overlay__frame {
    width: min(520px, 100%);
}

.ccg-egg-overlay--pacman .ccg-egg-overlay__media {
    width: min(440px, 100%);
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    min-height: 0;
    aspect-ratio: auto;
    justify-self: center;
    align-self: center;
}

.ccg-egg-overlay--pacman .ccg-egg-overlay__screen,
.ccg-egg-overlay--pacman .ccg-egg-overlay__iframe {
    width: 100%;
    height: 100%;
}

.ccg-egg-overlay--invaders .ccg-egg-overlay__frame {
    width: min(1060px, 100%);
}

.ccg-egg-overlay--invaders .ccg-egg-overlay__media {
    width: auto;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    min-height: 0;
    aspect-ratio: 4 / 3;
    justify-self: center;
    align-self: center;
}

.ccg-egg-overlay--invaders .ccg-egg-overlay__screen,
.ccg-egg-overlay--invaders .ccg-egg-overlay__iframe {
    width: 100%;
    height: 100%;
}

.ccg-egg-overlay--desktop-only .ccg-egg-overlay__frame {
    width: min(680px, 100%);
    height: auto;
    min-height: 0;
}

.ccg-egg-overlay--desktop-only .ccg-egg-overlay__media {
    width: 100%;
    height: auto;
    min-height: 240px;
    aspect-ratio: auto;
}

.ccg-egg-overlay__desktop-only {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    width: 100%;
    min-height: 220px;
    padding: clamp(22px, 6vw, 48px);
    border: 1px solid rgba(126, 252, 255, 0.4);
    border-radius: 16px;
    background: radial-gradient(circle, rgba(16, 34, 54, 0.94), rgba(4, 8, 18, 0.98));
    color: #d7f7ff;
    font-family: "C64 Pro Mono", "Roboto Mono", monospace;
    text-align: center;
    text-transform: uppercase;
}

.ccg-egg-overlay__desktop-only strong {
    color: #7efcff;
    font-size: clamp(1.05rem, 5vw, 1.6rem);
    letter-spacing: 0.12em;
}

.ccg-egg-overlay__desktop-only span {
    max-width: 42ch;
    color: #b8c8e4;
    font-size: clamp(0.76rem, 3.4vw, 0.95rem);
    line-height: 1.55;
    letter-spacing: 0.08em;
}

@media (max-width: 720px) {
    .ccg-egg-overlay--pacman .ccg-egg-overlay__frame {
        width: 100%;
        height: 100%;
    }

    .ccg-egg-overlay--pacman .ccg-egg-overlay__media {
        width: 100%;
        padding: 4px;
    }

    .ccg-egg-overlay--desktop-only .ccg-egg-overlay__media {
        min-height: 210px;
    }
}
'''

    OVERLAYS_PATH.write_text(text.rstrip() + addition + "\n", encoding="utf-8")
    print("Added Easter egg game-specific overlay CSS.")


def patch_pacman_html() -> None:
    text = PACMAN_PATH.read_text(encoding="utf-8")
    if PACMAN_MARKER in text:
        print("PACMAN touch controls already applied.")
        return

    text = replace_once(
        text,
        '''\t<title>Maintenance - Moota.co</title>''',
        '''\t<title>Maintenance - Moota.co</title>\n\t<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n\t<link rel="stylesheet" href="/resources/css/pacman-touch.css">''',
        "PACMAN viewport and stylesheet",
    )

    text = replace_once(
        text,
        '''\t<div id="pacman"></div>''',
        '''\t<div id="pacman"></div>\n\n\t<!-- CCG PACMAN TOUCH CONTROLS -->\n\t<div class="ccg-pacman-controls" data-ccg-pacman-controls hidden aria-label="Pac-Man touch controls">\n\t\t<div class="ccg-pacman-controls__label">TOUCH CONTROLS</div>\n\t\t<div class="ccg-pacman-dpad" aria-label="Directional pad">\n\t\t\t<button type="button" class="ccg-pacman-control ccg-pacman-control--up" data-pacman-key-code="38" data-pacman-key="ArrowUp" data-pacman-code="ArrowUp" aria-label="Move up">▲</button>\n\t\t\t<button type="button" class="ccg-pacman-control ccg-pacman-control--left" data-pacman-key-code="37" data-pacman-key="ArrowLeft" data-pacman-code="ArrowLeft" aria-label="Move left">◀</button>\n\t\t\t<button type="button" class="ccg-pacman-control ccg-pacman-control--centre" tabindex="-1" aria-hidden="true">●</button>\n\t\t\t<button type="button" class="ccg-pacman-control ccg-pacman-control--right" data-pacman-key-code="39" data-pacman-key="ArrowRight" data-pacman-code="ArrowRight" aria-label="Move right">▶</button>\n\t\t\t<button type="button" class="ccg-pacman-control ccg-pacman-control--down" data-pacman-key-code="40" data-pacman-key="ArrowDown" data-pacman-code="ArrowDown" aria-label="Move down">▼</button>\n\t\t</div>\n\t\t<button type="button" class="ccg-pacman-start" data-pacman-key-code="78" data-pacman-key="n" data-pacman-code="KeyN">START / NEW GAME</button>\n\t</div>''',
        "PACMAN controls markup",
    )

    touch_script = r'''

	<script>
	(function () {
		"use strict";

		var touchCapable = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
		touchCapable = touchCapable || navigator.maxTouchPoints > 0 || window.innerWidth <= 900;
		if (!touchCapable) return;

		var controls = document.querySelector("[data-ccg-pacman-controls]");
		if (!controls) return;

		document.documentElement.classList.add("ccg-pacman-touch");
		controls.hidden = false;

		function dispatchGameKey(button) {
			var keyCode = Number(button.getAttribute("data-pacman-key-code"));
			var key = button.getAttribute("data-pacman-key") || "";
			var code = button.getAttribute("data-pacman-code") || key;
			if (!keyCode) return;

			function makeEvent(type) {
				var event = new KeyboardEvent(type, {
					key: key,
					code: code,
					bubbles: true,
					cancelable: true
				});
				try {
					Object.defineProperty(event, "keyCode", { get: function () { return keyCode; } });
					Object.defineProperty(event, "which", { get: function () { return keyCode; } });
				} catch (error) {}
				return event;
			}

			document.dispatchEvent(makeEvent("keydown"));
			window.setTimeout(function () {
				document.dispatchEvent(makeEvent("keyup"));
			}, 70);
		}

		controls.addEventListener("pointerdown", function (event) {
			var button = event.target.closest("[data-pacman-key-code]");
			if (!button) return;
			event.preventDefault();
			event.stopPropagation();
			dispatchGameKey(button);
		}, { passive: false });

		controls.addEventListener("click", function (event) {
			if (event.detail !== 0) return;
			var button = event.target.closest("[data-pacman-key-code]");
			if (!button) return;
			dispatchGameKey(button);
		});
	}());
	</script>
'''

    text = replace_once(text, "\n</body>", touch_script + "\n</body>", "PACMAN touch script")
    PACMAN_PATH.write_text(text, encoding="utf-8")
    print("Added PACMAN touch controls and viewport support.")


def write_pacman_css() -> None:
    if PACMAN_CSS_PATH.exists():
        existing = PACMAN_CSS_PATH.read_text(encoding="utf-8")
        if PACMAN_MARKER in existing:
            print("PACMAN touch CSS already exists.")
            return
        raise RuntimeError("resources/css/pacman-touch.css exists without the expected marker")

    css = r'''/* ============================================================
   CCG PACMAN TOUCH CONTROLS
   Mobile-only controls for the local PACMAN Easter egg iframe.
============================================================ */

.ccg-pacman-controls {
    display: none;
}

.ccg-pacman-controls[hidden] {
    display: none !important;
}

html.ccg-pacman-touch,
html.ccg-pacman-touch body {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    min-height: 100%;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    overflow-y: auto;
    background: #000;
}

html.ccg-pacman-touch body > h1,
html.ccg-pacman-touch body > p,
html.ccg-pacman-touch #shim {
    display: none !important;
}

html.ccg-pacman-touch #pacman {
    width: min(382px, calc(100vw - 12px));
    height: auto;
    min-height: 0;
    margin: 6px auto 4px;
    border-radius: 4px;
}

html.ccg-pacman-touch #pacman canvas {
    display: block;
    width: 100%;
    max-width: 100%;
    height: auto;
    margin: 0 auto;
}

html.ccg-pacman-touch .ccg-pacman-controls:not([hidden]) {
    display: grid;
    grid-template-columns: minmax(170px, 220px) minmax(112px, 150px);
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: min(100%, 390px);
    margin: 0 auto;
    padding: 8px 8px max(10px, env(safe-area-inset-bottom, 0px));
    color: #d7f7ff;
    font-family: system-ui, sans-serif;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
}

.ccg-pacman-controls__label {
    grid-column: 1 / -1;
    color: #7efcff;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-align: center;
}

.ccg-pacman-dpad {
    display: grid;
    grid-template-columns: repeat(3, 52px);
    grid-template-rows: repeat(3, 52px);
    justify-content: center;
    gap: 4px;
}

.ccg-pacman-control,
.ccg-pacman-start {
    appearance: none;
    -webkit-appearance: none;
    border: 1px solid rgba(126, 252, 255, 0.62);
    background: linear-gradient(145deg, #14243a, #070d18);
    color: #f4fbff;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05), 0 0 12px rgba(60, 209, 255, 0.22);
    font: inherit;
    font-weight: 800;
    cursor: pointer;
    touch-action: manipulation;
}

.ccg-pacman-control {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    font-size: 1.2rem;
}

.ccg-pacman-control:active,
.ccg-pacman-start:active {
    transform: translateY(1px) scale(0.96);
    background: linear-gradient(145deg, #214466, #0a1424);
}

.ccg-pacman-control--up {
    grid-column: 2;
    grid-row: 1;
}

.ccg-pacman-control--left {
    grid-column: 1;
    grid-row: 2;
}

.ccg-pacman-control--centre {
    grid-column: 2;
    grid-row: 2;
    border-color: rgba(126, 252, 255, 0.22);
    color: rgba(126, 252, 255, 0.42);
    pointer-events: none;
}

.ccg-pacman-control--right {
    grid-column: 3;
    grid-row: 2;
}

.ccg-pacman-control--down {
    grid-column: 2;
    grid-row: 3;
}

.ccg-pacman-start {
    min-height: 54px;
    padding: 10px 12px;
    border-radius: 999px;
    color: #ffef74;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    line-height: 1.25;
}

@media (max-width: 380px) {
    html.ccg-pacman-touch .ccg-pacman-controls:not([hidden]) {
        grid-template-columns: 1fr;
        gap: 8px;
    }

    .ccg-pacman-start {
        width: min(220px, 100%);
        margin: 0 auto;
    }
}
'''
    PACMAN_CSS_PATH.write_text(css, encoding="utf-8")
    print("Created resources/css/pacman-touch.css.")


def main() -> None:
    patch_js()
    patch_overlays_css()
    patch_pacman_html()
    write_pacman_css()


if __name__ == "__main__":
    main()
