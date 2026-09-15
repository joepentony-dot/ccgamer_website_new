#!/usr/bin/env node

/*
 * CCG native mouse-wheel scroll contract.
 *
 * Regression blocker for the Retro Specials wheel-scrolling fix from PR #2019.
 * It protects the document scroll-root CSS contract, rejects local scripts on
 * the page that attempt to own the `wheel` event, and drives genuine Chrome
 * mouse-wheel input over the Retro Specials card grid in both directions.
 *
 * Do not replace native document scrolling with synthetic wheel handlers or
 * preventDefault()-based workarounds. If the architecture genuinely changes,
 * update this contract only with matching browser evidence.
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
const CSS_PATH = path.join(ROOT, "resources/css/ccg-scroll-authority.css");
const PAGE_PATH = path.join(ROOT, "games/collections/retro-specials.html");
const MIN_WHEEL_DELTA = 100;

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
    if (!source.includes(needle)) fail(`Native wheel contract missing ${label}: ${needle}`);
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
    if (inline) fail(`Retro Specials HTML attempts to own the native wheel event (${inline}).`);

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
    const html = fs.readFileSync(PAGE_PATH, "utf8");

    const requiredCss = [
        ["@supports (overflow: clip)", "overflow-x clip support"],
        ["overflow-x: clip !important;", "non-scrolling horizontal clipping"],
        ["html[data-ccg-page] > body.ccg-body:not(.ccg-body--locked):not(.ccg-body--nav-open)", "document/body scroll-root selector"],
        ["overflow-y: visible !important;", "body/page-shell vertical overflow release"],
        ["SITE-WIDE WHEEL PERFORMANCE CONTRACT", "wheel performance contract marker"],
        ["body[data-collection=\"Retro Specials\"]", "Retro Specials scope"],
        [".ccg-game-card--retro-event", "Retro Specials card scope"],
        ["transform: none;", "Retro Specials compositor reset"],
        ["will-change: auto;", "Retro Specials compositor reset ownership"],
        ["html.ccg-perf-paused[data-ccg-page]", "scroll performance pause scope"],
        ["animation-play-state: paused !important;", "scroll-time decorative animation pause"]
    ];

    for (const [needle, label] of requiredCss) requireText(css, needle, label);

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
            const response = await fetch(`http://${HOST}:${DRIVER_PORT}/status`, { signal: AbortSignal.timeout(1000) });
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

    const downTarget = await prepareWheelTarget(sessionId);
    assertPrepared(downTarget, viewport);
    if (downTarget.maxScroll <= downTarget.scrollY + MIN_WHEEL_DELTA * 2) {
        fail(`${viewport.label}: not enough scroll room below the target card to verify wheel-down`);
    }

    await wheel(sessionId, downTarget.x, downTarget.y, 560);
    const afterDown = await readY(sessionId);
    if (afterDown - downTarget.scrollY < MIN_WHEEL_DELTA) {
        fail(`${viewport.label}: native wheel-down stalled over Retro Specials grid (${downTarget.scrollY}px -> ${afterDown}px)`);
    }

    const upTarget = await prepareWheelTarget(sessionId);
    assertPrepared(upTarget, viewport);
    if (upTarget.scrollY < MIN_WHEEL_DELTA * 2) {
        fail(`${viewport.label}: not enough scroll room above the target card to verify wheel-up`);
    }

    await wheel(sessionId, upTarget.x, upTarget.y, -560);
    const afterUp = await readY(sessionId);
    if (upTarget.scrollY - afterUp < MIN_WHEEL_DELTA) {
        fail(`${viewport.label}: native wheel-up stalled over Retro Specials grid (${upTarget.scrollY}px -> ${afterUp}px)`);
    }

    console.log(`PASS ${viewport.label}: native wheel moved ${afterDown - downTarget.scrollY}px down and ${upTarget.scrollY - afterUp}px up over Retro Specials cards.`);
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
        for (const viewport of VIEWPORTS) await auditViewport(sessionId, sitePort, viewport);
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
