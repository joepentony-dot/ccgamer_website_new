#!/usr/bin/env node

/*
 * CCG native mouse-wheel scroll contract.
 *
 * Regression blocker for the Retro Specials wheel-scrolling fix from PR #2019.
 * It protects the document scroll-root CSS contract, rejects local scripts on
 * the page that attempt to own the `wheel` event, and drives genuine Chrome
 * mouse-wheel input over the Retro Specials card grid.
 *
 * Do not replace native document scrolling with synthetic wheel handlers or
 * preventDefault()-based workarounds. Reverse document reachability is already
 * enforced by CCG Site Safety's physical-scroll audit; this contract targets
 * the historical failure mode directly: a mouse wheel over the card grid must
 * move the document.
 */

"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const HOST = "127.0.0.1";
const DRIVER_PORT = 9517;
const TARGET_PAGE = "/games/collections/retro-specials.html";
const GAME_MEDIA_PAGE = "/games/1942/index.html";
const HOME_PAGE = "/home.html";
const CSS_PATH = path.join(ROOT, "resources/css/ccg-scroll-authority.css");
const GLOBAL_JS_PATH = path.join(ROOT, "js/ccg-global.js");
const PAGE_PATH = path.join(ROOT, "games/collections/retro-specials.html");
const MIN_WHEEL_DELTA = 100;
const WHEEL_DELTA = 560;

const VIEWPORTS = [
    { width: 956, height: 900, label: "desktop-956" },
    { width: 1440, height: 1000, label: "desktop-1440" }
];

const MIME = Object.freeze({
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".pdf": "application/pdf"
});

function fail(message) {
    throw new Error(message);
}

function requireText(source, needle, label) {
    if (!source.includes(needle)) {
        fail(`Native wheel contract missing ${label}: ${needle}`);
    }
}

function wheelOwnerMatch(source) {
    return [
        /addEventListener\s*\(\s*["']wheel["']/i,
        /\.onwheel\s*=/i,
        /\bonwheel\s*=/i
    ].find((pattern) => pattern.test(source)) || null;
}

function localScriptPaths(html) {
    const found = new Set();
    const base = new URL(TARGET_PAGE, "http://ccg.local");
    const pattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = pattern.exec(html))) {
        const raw = String(match[1] || "").trim();
        if (!raw || /^https?:\/\//i.test(raw) || raw.startsWith("//")) continue;

        const relative = new URL(raw, base).pathname.replace(/^\/+/, "");
        const absolute = path.resolve(ROOT, relative);
        if (absolute !== ROOT && !absolute.startsWith(`${ROOT}${path.sep}`)) {
            fail(`Retro Specials script escaped repository root: ${raw}`);
        }
        if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
            fail(`Retro Specials local script is missing: ${raw} -> ${relative}`);
        }
        found.add(absolute);
    }

    return [...found];
}

function assertNoLocalWheelOwners(html) {
    const inline = wheelOwnerMatch(html);
    if (inline) {
        fail(`Retro Specials HTML attempts to own the native wheel event (${inline}).`);
    }

    for (const scriptPath of localScriptPaths(html)) {
        const source = fs.readFileSync(scriptPath, "utf8");
        const match = wheelOwnerMatch(source);
        if (match) {
            fail(`Retro Specials local script attempts to own the native wheel event: ${path.relative(ROOT, scriptPath)} (${match}).`);
        }
    }
}

function assertStaticContract() {
    const css = fs.readFileSync(CSS_PATH, "utf8");
    const globalJs = fs.readFileSync(GLOBAL_JS_PATH, "utf8");
    const html = fs.readFileSync(PAGE_PATH, "utf8");

    const requiredCss = [
        ["@supports (overflow: clip)", "overflow-x clip support"],
        ["overflow-x: clip !important;", "non-scrolling horizontal clipping"],
        ["html[data-ccg-page] > body.ccg-body:not(.ccg-body--locked):not(.ccg-body--nav-open)", "document/body scroll-root selector"],
        ["overflow-y: visible !important;", "body/page-shell vertical overflow release"],
        ["SITE-WIDE WHEEL PERFORMANCE CONTRACT", "wheel performance contract marker"],
        ["EMBEDDED MEDIA WHEEL PASS-THROUGH", "embedded media wheel guard marker"],
        [".ccg-wheel-guard", "embedded media wheel guard style"],
        ["@media (any-hover: hover) and (any-pointer: fine)", "mouse-capable pointer activation"],
        ["body[data-collection=\"Retro Specials\"]", "Retro Specials scope"],
        [".ccg-game-card--retro-event", "Retro Specials card scope"],
        ["transform: none;", "Retro Specials compositor reset"],
        ["will-change: auto;", "Retro Specials compositor reset ownership"],
        ["html.ccg-perf-paused[data-ccg-page]", "scroll performance pause scope"],
        ["animation-play-state: paused !important;", "scroll-time decorative animation pause"]
    ];

    for (const [needle, label] of requiredCss) requireText(css, needle, label);

    requireText(globalJs, "function setupEmbeddedFrameWheelGuards()", "embedded frame wheel guard runtime");
    requireText(globalJs, "ccg-wheel-guard-host", "embedded frame guard host class");
    requireText(globalJs, "youtube(?:-nocookie)?\\.com\\/embed\\/", "YouTube-only guard scope");

    requireText(html, "data-ccg-page=\"collection-single\"", "Retro Specials page identity");
    requireText(html, "data-collection=\"Retro Specials\"", "Retro Specials body identity");
    requireText(html, "ccg-game-card--retro-event", "Retro Specials card markup");
    assertNoLocalWheelOwners(html);
}

function commandPath(command) {
    const result = spawnSync("bash", ["-lc", `command -v ${command}`], { encoding: "utf8" });
    return result.status === 0 ? result.stdout.trim() : "";
}

function findChromeDriver() {
    const candidates = [
        commandPath("chromedriver"),
        process.env.CHROMEWEBDRIVER ? path.join(process.env.CHROMEWEBDRIVER, "chromedriver") : "",
        "/usr/local/share/chromedriver-linux64/chromedriver"
    ].filter(Boolean);

    const found = candidates.find((candidate) => fs.existsSync(candidate));
    if (!found) fail("ChromeDriver was not found on the GitHub runner.");
    return found;
}

function safeFileForRequest(urlPathname) {
    let decoded;
    try {
        decoded = decodeURIComponent(urlPathname);
    } catch {
        return null;
    }

    const relative = decoded.replace(/^\/+/, "");
    const absolute = path.resolve(ROOT, relative || "home.html");
    if (absolute !== ROOT && !absolute.startsWith(`${ROOT}${path.sep}`)) return null;

    try {
        if (fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()) {
            return path.join(absolute, "index.html");
        }
    } catch {
        return null;
    }

    return absolute;
}

function createServer() {
    return http.createServer((req, res) => {
        const requestUrl = new URL(req.url || "/", `http://${HOST}`);
        const filePath = safeFileForRequest(requestUrl.pathname);

        if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
            res.end("<!doctype html><html><head><title>CCG_WHEEL_404</title></head><body>Not found</body></html>");
            return;
        }

        try {
            const content = fs.readFileSync(filePath);
            res.writeHead(200, {
                "content-type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
                "cache-control": "no-store"
            });
            res.end(content);
        } catch (error) {
            res.writeHead(500, { "content-type": "text/html; charset=utf-8" });
            res.end(`<!doctype html><html><head><title>CCG_WHEEL_500</title></head><body>${String(error?.message || error)}</body></html>`);
        }
    });
}

async function webdriver(method, pathname, body) {
    const response = await fetch(`http://${HOST}:${DRIVER_PORT}${pathname}`, {
        method,
        headers: body === undefined ? undefined : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(20000)
    });

    const text = await response.text();
    let payload = {};
    try {
        payload = text ? JSON.parse(text) : {};
    } catch {
        fail(`ChromeDriver returned non-JSON for ${method} ${pathname}: ${text.slice(0, 500)}`);
    }

    if (!response.ok || payload.value?.error) {
        fail(`ChromeDriver ${method} ${pathname} failed: ${payload.value?.message || text || `${response.status} ${response.statusText}`}`);
    }

    return payload;
}

async function waitForDriver() {
    let lastError = null;
    for (let attempt = 0; attempt < 80; attempt += 1) {
        try {
            const response = await fetch(`http://${HOST}:${DRIVER_PORT}/status`, {
                signal: AbortSignal.timeout(1000)
            });
            if (response.ok) return;
        } catch (error) {
            lastError = error;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    fail(`ChromeDriver did not become ready: ${lastError ? lastError.message : "unknown error"}`);
}

function startDriver(driverPath) {
    return spawn(driverPath, [`--port=${DRIVER_PORT}`, `--allowed-ips=${HOST}`], {
        cwd: ROOT,
        stdio: ["ignore", "pipe", "pipe"]
    });
}

async function createSession() {
    const payload = await webdriver("POST", "/session", {
        capabilities: {
            alwaysMatch: {
                browserName: "chrome",
                pageLoadStrategy: "eager",
                "goog:chromeOptions": {
                    args: [
                        "--headless=new",
                        "--no-sandbox",
                        "--disable-gpu",
                        "--disable-dev-shm-usage",
                        "--disable-extensions",
                        "--disable-sync",
                        "--disable-default-apps",
                        "--no-first-run",
                        "--mute-audio",
                        "--disable-background-networking"
                    ]
                }
            }
        }
    });

    const sessionId = payload.value?.sessionId || payload.sessionId;
    if (!sessionId) fail("ChromeDriver created a session without returning a session id.");
    return sessionId;
}

async function execute(sessionId, script, args = []) {
    const payload = await webdriver("POST", `/session/${sessionId}/execute/sync`, { script, args });
    return payload.value;
}

async function setViewport(sessionId, viewport) {
    await webdriver("POST", `/session/${sessionId}/window/rect`, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height
    });
}

async function navigate(sessionId, url) {
    await webdriver("POST", `/session/${sessionId}/url`, { url });
    await new Promise((resolve) => setTimeout(resolve, 1400));
}

async function cdp(sessionId, cmd, params = {}) {
    const payload = await webdriver("POST", `/session/${sessionId}/goog/cdp/execute`, { cmd, params });
    return payload.value;
}

async function wheel(sessionId, x, y, deltaY) {
    await cdp(sessionId, "Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x,
        y,
        deltaX: 0,
        deltaY,
        pointerType: "mouse"
    });
    await new Promise((resolve) => setTimeout(resolve, 250));
}

async function wheelDown(sessionId, x, y) {
    await wheel(sessionId, x, y, WHEEL_DELTA);
}

async function wheelUp(sessionId, x, y) {
    await wheel(sessionId, x, y, -WHEEL_DELTA);
}

async function prepareWheelTarget(sessionId) {
    return execute(sessionId, String.raw`
return (function () {
    var root = document.documentElement;
    var body = document.body;
    var cards = Array.from(document.querySelectorAll('.ccg-game-card--retro-event'));
    if (!cards.length) return { error: 'Retro Specials cards are missing' };

    var card = cards[Math.floor(cards.length / 2)];
    root.style.setProperty('scroll-behavior', 'auto', 'important');
    if (body) body.style.setProperty('scroll-behavior', 'auto', 'important');
    card.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });

    var rect = card.getBoundingClientRect();
    var style = getComputedStyle(card);
    var nested = Array.from(document.querySelectorAll('main, .ccg-main, .ccg-page')).filter(function (el) {
        var computed = getComputedStyle(el);
        return /^(auto|scroll)$/i.test(computed.overflowY || '') && el.scrollHeight > el.clientHeight + 24;
    }).map(function (el) {
        return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + Array.from(el.classList).slice(0, 4).join('.') : '');
    });

    return {
        title: document.title,
        x: Math.max(1, Math.min(window.innerWidth - 2, Math.round(rect.left + rect.width / 2))),
        y: Math.max(1, Math.min(window.innerHeight - 2, Math.round(rect.top + rect.height / 2))),
        scrollY: Math.round(window.scrollY),
        maxScroll: Math.max(0, Math.round((document.scrollingElement || root).scrollHeight - window.innerHeight)),
        htmlOverflowY: getComputedStyle(root).overflowY,
        bodyOverflowY: body ? getComputedStyle(body).overflowY : '',
        cardTransform: style.transform,
        cardWillChange: style.willChange,
        nestedPageScrollers: nested
    };
})();`);
}

function assertPrepared(target, viewport) {
    if (target.error) fail(`${viewport.label}: ${target.error}`);
    if (target.title === "CCG_WHEEL_404" || target.title === "CCG_WHEEL_500") {
        fail(`${viewport.label}: local server returned ${target.title}`);
    }
    if (target.nestedPageScrollers?.length) {
        fail(`${viewport.label}: nested full-page scroller(s) detected: ${target.nestedPageScrollers.join(", ")}`);
    }
    if (!/^(auto|scroll|visible)$/i.test(target.htmlOverflowY || "")) {
        fail(`${viewport.label}: unexpected html overflow-y ${target.htmlOverflowY}`);
    }
    if (!/^(visible|auto)$/i.test(target.bodyOverflowY || "")) {
        fail(`${viewport.label}: unexpected body overflow-y ${target.bodyOverflowY}`);
    }
    if (target.cardTransform !== "none") {
        fail(`${viewport.label}: Retro Specials card is compositor-promoted (${target.cardTransform})`);
    }
    if (!/^(auto|)$/i.test(target.cardWillChange || "")) {
        fail(`${viewport.label}: Retro Specials card has unexpected will-change ${target.cardWillChange}`);
    }
}

async function readY(sessionId) {
    return execute(sessionId, "return Math.round(window.scrollY);");
}

async function auditViewport(sessionId, sitePort, viewport) {
    await setViewport(sessionId, viewport);
    await navigate(sessionId, `http://${HOST}:${sitePort}${TARGET_PAGE}`);

    const target = await prepareWheelTarget(sessionId);
    assertPrepared(target, viewport);

    if (target.maxScroll <= target.scrollY + MIN_WHEEL_DELTA * 2) {
        fail(`${viewport.label}: not enough scroll room below the target card to verify mouse-wheel scrolling`);
    }

    await wheelDown(sessionId, target.x, target.y);
    const afterDown = await readY(sessionId);
    const movement = afterDown - target.scrollY;

    if (movement < MIN_WHEEL_DELTA) {
        fail(`${viewport.label}: native mouse wheel stalled over Retro Specials grid (${target.scrollY}px -> ${afterDown}px)`);
    }

    console.log(`PASS ${viewport.label}: native mouse wheel moved the document ${movement}px over the Retro Specials card grid.`);
}


async function waitForGameMediaGuard(sessionId) {
    let last = null;

    for (let attempt = 0; attempt < 24; attempt += 1) {
        last = await execute(sessionId, String.raw`
return (function () {
    var frame = document.querySelector('#game-video-embed');
    if (!frame) return { ready: false, reason: 'game video iframe missing' };

    var source = frame.getAttribute('src') || '';
    var host = frame.parentElement;
    var shield = host ? host.querySelector('.ccg-wheel-guard') : null;

    return {
        ready: /youtube(?:-nocookie)?\.com\/embed\//i.test(source)
            && frame.dataset.ccgWheelGuard === 'ready'
            && !!shield,
        source: source,
        guardState: frame.dataset.ccgWheelGuard || '',
        shieldPresent: !!shield
    };
})();`);

        if (last?.ready) return last;
        await new Promise((resolve) => setTimeout(resolve, 150));
    }

    fail(`single-game media guard did not initialise: ${JSON.stringify(last)}`);
}

async function prepareGameMediaWheelTarget(sessionId) {
    return execute(sessionId, String.raw`
return (function () {
    var root = document.documentElement;
    var body = document.body;
    var frame = document.querySelector('#game-video-embed');
    if (!frame) return { error: 'game video iframe missing' };

    var host = frame.parentElement;
    var shield = host ? host.querySelector('.ccg-wheel-guard') : null;
    if (!shield) return { error: 'game video wheel shield missing' };

    // Headless Chromium exposes no physical pointer media capability. Force
    // only the already-installed shield visible here so the browser contract
    // can drive the exact desktop/fine-pointer interaction geometry.
    shield.style.setProperty('display', 'block', 'important');

    root.style.setProperty('scroll-behavior', 'auto', 'important');
    if (body) body.style.setProperty('scroll-behavior', 'auto', 'important');

    frame.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });

    var rect = frame.getBoundingClientRect();
    var shieldRect = shield.getBoundingClientRect();
    var x = Math.max(1, Math.min(window.innerWidth - 2, Math.round(rect.left + rect.width / 2)));
    var y = Math.max(1, Math.min(window.innerHeight - 2, Math.round(rect.top + rect.height / 2)));
    var hit = document.elementFromPoint(x, y);

    return {
        x: x,
        y: y,
        scrollY: Math.round(window.scrollY),
        maxScroll: Math.max(0, Math.round((document.scrollingElement || root).scrollHeight - window.innerHeight)),
        frameWidth: Math.round(rect.width),
        frameHeight: Math.round(rect.height),
        shieldWidth: Math.round(shieldRect.width),
        shieldHeight: Math.round(shieldRect.height),
        shieldHidden: !!shield.hidden,
        shieldDisplay: getComputedStyle(shield).display,
        hitIsShield: hit === shield || !!hit?.closest?.('.ccg-wheel-guard'),
        guardState: frame.dataset.ccgWheelGuard || ''
    };
})();`);
}

async function auditGameMediaWheel(sessionId, sitePort, viewport) {
    await setViewport(sessionId, viewport);
    await navigate(sessionId, `http://${HOST}:${sitePort}${GAME_MEDIA_PAGE}`);
    await waitForGameMediaGuard(sessionId);

    const target = await prepareGameMediaWheelTarget(sessionId);
    if (target.error) fail(`${viewport.label}: ${target.error}`);
    if (target.guardState !== "ready") fail(`${viewport.label}: game video guard state is ${target.guardState || "missing"}`);
    if (target.shieldHidden || target.shieldDisplay === "none") fail(`${viewport.label}: game video wheel shield is not active`);
    if (!target.hitIsShield) fail(`${viewport.label}: game video centre is not covered by the wheel shield`);
    if (Math.abs(target.frameWidth - target.shieldWidth) > 4 || Math.abs(target.frameHeight - target.shieldHeight) > 4) {
        fail(`${viewport.label}: game video wheel shield geometry does not match iframe`);
    }
    if (target.maxScroll <= target.scrollY + MIN_WHEEL_DELTA * 2) {
        fail(`${viewport.label}: not enough scroll room below the game video to verify mouse-wheel scrolling`);
    }

    await wheelDown(sessionId, target.x, target.y);
    const afterDown = await readY(sessionId);
    const movement = afterDown - target.scrollY;

    if (movement < MIN_WHEEL_DELTA) {
        fail(`${viewport.label}: native mouse wheel stalled over game video (${target.scrollY}px -> ${afterDown}px)`);
    }

    console.log(`PASS ${viewport.label}: native mouse wheel moved the document ${movement}px over the game video guard.`);
}


async function prepareHomeWheelTarget(sessionId, selector, block = "center") {
    return execute(sessionId, String.raw`
return (function (selector, block) {
    var root = document.documentElement;
    var body = document.body;
    var target = document.querySelector(selector);
    if (!target) return { error: 'home target missing: ' + selector };

    root.style.setProperty('scroll-behavior', 'auto', 'important');
    if (body) body.style.setProperty('scroll-behavior', 'auto', 'important');
    target.scrollIntoView({ block: block || 'center', inline: 'center', behavior: 'instant' });

    var rect = target.getBoundingClientRect();
    var x = Math.max(2, Math.min(window.innerWidth - 3, Math.round(rect.left + rect.width / 2)));
    var y = Math.max(2, Math.min(window.innerHeight - 3, Math.round(rect.top + Math.min(rect.height / 2, window.innerHeight * 0.35))));
    var hit = document.elementFromPoint(x, y);
    var scrolling = document.scrollingElement || root;

    return {
        selector: selector,
        x: x,
        y: y,
        scrollY: Math.round(window.scrollY),
        maxScroll: Math.max(0, Math.round(scrolling.scrollHeight - window.innerHeight)),
        hit: hit ? hit.tagName.toLowerCase() + (hit.id ? '#' + hit.id : '') + (hit.classList?.length ? '.' + Array.from(hit.classList).slice(0, 4).join('.') : '') : 'none',
        htmlOverflowY: getComputedStyle(root).overflowY,
        bodyOverflowY: body ? getComputedStyle(body).overflowY : '',
        nestedPageScrollers: Array.from(document.querySelectorAll('main, .ccg-main, .ccg-page')).filter(function (el) {
            var style = getComputedStyle(el);
            return /^(auto|scroll)$/i.test(style.overflowY || '') && el.scrollHeight > el.clientHeight + 24;
        }).map(function (el) {
            return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + Array.from(el.classList).slice(0, 4).join('.') : '');
        })
    };
})(arguments[0], arguments[1]);`, [selector, block]);
}

async function auditHomeTarget(sessionId, viewport, selector, label) {
    const target = await prepareHomeWheelTarget(sessionId, selector);
    if (target.error) fail(`${viewport.label}: ${target.error}`);
    if (target.nestedPageScrollers?.length) {
        fail(`${viewport.label}: home has nested page scroller(s) at ${label}: ${target.nestedPageScrollers.join(", ")}`);
    }

    // Ensure there is room in both directions so one page boundary cannot
    // masquerade as a wheel-input stall.
    await execute(sessionId, "window.scrollBy(0,-Math.min(240,window.scrollY)); return Math.round(window.scrollY);");
    const beforeDown = await readY(sessionId);
    const maxScroll = await execute(sessionId, "return Math.max(0,Math.round((document.scrollingElement||document.documentElement).scrollHeight-window.innerHeight));");
    if (maxScroll <= beforeDown + MIN_WHEEL_DELTA * 2) {
        await execute(sessionId, "window.scrollTo(0,Math.max(0,Math.round(((document.scrollingElement||document.documentElement).scrollHeight-window.innerHeight)*0.5)));");
    }
    const before = await readY(sessionId);

    const beforeState = await execute(sessionId, String.raw`
var e=document.elementFromPoint(arguments[0],arguments[1]);
return {
  hit:e?e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.classList?.length?'.'+Array.from(e.classList).slice(0,6).join('.'):''):'none',
  bodyClass:document.body?.className||'',
  htmlClass:document.documentElement.className||'',
  htmlOverflow:getComputedStyle(document.documentElement).overflowY,
  bodyOverflow:document.body?getComputedStyle(document.body).overflowY:'',
  bodyPosition:document.body?getComputedStyle(document.body).position:'',
  navOpen:Boolean(document.body?.classList.contains('ccg-body--nav-open')),
  bodyLocked:Boolean(document.body?.classList.contains('ccg-body--locked'))
};`, [target.x,target.y]);

    await wheelDown(sessionId, target.x, target.y);
    const afterDown = await readY(sessionId);
    if (afterDown - before < MIN_WHEEL_DELTA) {
        fail(`${viewport.label}: home mouse wheel stalled DOWN over ${label} (${beforeState.hit}, ${before}px -> ${afterDown}px) state=${JSON.stringify(beforeState)}`);
    }

    await wheelUp(sessionId, target.x, target.y);
    const afterUp = await readY(sessionId);
    if (afterDown - afterUp < MIN_WHEEL_DELTA) {
        fail(`${viewport.label}: home mouse wheel stalled UP over ${label} (${target.hit}, ${afterDown}px -> ${afterUp}px)`);
    }

    console.log(`PASS ${viewport.label}: home mouse wheel moved down/up over ${label} (hit ${target.hit}).`);
}

async function auditHomeWheel(sessionId, sitePort, viewport) {
    await setViewport(sessionId, viewport);
    await navigate(sessionId, `http://${HOST}:${sitePort}${HOME_PAGE}`);

    const targets = [
        [".home-hero__content", "hero centre"],
        [".home-hero__game-actions", "Dungeon Carnage CTA area"],
        [".home-section--highlights", "highlights section"],
        [".home-community-latest", "community section"],
        [".home-cta-upgrade", "support CTA section"],
        [".home-visitor-callout", "visitor callout"]
    ];

    for (const [selector, label] of targets) {
        await auditHomeTarget(sessionId, viewport, selector, label);
    }

    // Also exercise literal viewport-centre input at several page depths,
    // matching the reported "cursor in the middle of the screen" failure.
    for (const fraction of [0.2, 0.5, 0.8]) {
        const state = await execute(sessionId, String.raw`
var root=document.scrollingElement||document.documentElement;
var max=Math.max(0,root.scrollHeight-window.innerHeight);
window.scrollTo(0,Math.round(max*arguments[0]));
return {y:Math.round(window.scrollY),max:Math.round(max),x:Math.round(window.innerWidth/2),py:Math.round(window.innerHeight/2),hit:(function(){var e=document.elementFromPoint(Math.round(window.innerWidth/2),Math.round(window.innerHeight/2));return e?e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.classList?.length?'.'+Array.from(e.classList).slice(0,4).join('.'):''):'none'})()};`, [fraction]);
        if (state.max < MIN_WHEEL_DELTA * 4) fail(`${viewport.label}: home page is not tall enough for centre-screen wheel audit`);

        await wheelDown(sessionId, state.x, state.py);
        const down = await readY(sessionId);
        if (down - state.y < MIN_WHEEL_DELTA && state.y < state.max - MIN_WHEEL_DELTA * 2) {
            fail(`${viewport.label}: home centre-screen wheel stalled DOWN at ${Math.round(fraction*100)}% (hit ${state.hit}, ${state.y}px -> ${down}px)`);
        }
        await wheelUp(sessionId, state.x, state.py);
        const up = await readY(sessionId);
        if (down - up < MIN_WHEEL_DELTA && down > MIN_WHEEL_DELTA * 2) {
            fail(`${viewport.label}: home centre-screen wheel stalled UP at ${Math.round(fraction*100)}% (hit ${state.hit}, ${down}px -> ${up}px)`);
        }
        console.log(`PASS ${viewport.label}: home centre-screen wheel works at ${Math.round(fraction*100)}% depth (hit ${state.hit}).`);
    }
}

async function main() {
    assertStaticContract();
    console.log("PASS static native-wheel contract: scroll authority, Retro Specials scope and local script ownership are intact.");

    const driverPath = findChromeDriver();
    const server = createServer();
    const driver = startDriver(driverPath);
    let sessionId = "";

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, HOST, resolve);
    });
    const sitePort = server.address().port;

    try {
        await waitForDriver();
        sessionId = await createSession();
        for (const viewport of VIEWPORTS) {
            await auditViewport(sessionId, sitePort, viewport);
            await auditGameMediaWheel(sessionId, sitePort, viewport);
            await auditHomeWheel(sessionId, sitePort, viewport);
        }
        console.log("Native mouse-wheel scroll contract passed.");
    } finally {
        if (sessionId) {
            try {
                await webdriver("DELETE", `/session/${sessionId}`);
            } catch {}
        }
        await new Promise((resolve) => server.close(resolve));
        driver.kill("SIGTERM");
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (!driver.killed) driver.kill("SIGKILL");
    }
}

main().catch((error) => {
    console.error(`Native mouse-wheel scroll contract failed: ${error?.message || error}`);
    process.exitCode = 1;
});
