#!/usr/bin/env node

/*
 * CCG physical scroll reachability audit.
 *
 * Complements audit-responsive-browser.js by physically driving the document
 * from top -> middle -> bottom -> top in a real headless Chrome session.
 * This catches accidental body locks, nested full-page scrollers and layouts
 * whose final content cannot actually be reached even though the CSS parses.
 */

"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const HOST = "127.0.0.1";
const DRIVER_PORT = 9516;

const PAGES = [
    "/home.html",
    "/games/index.html",
    "/games/game.html?id=1942",
    "/games/genres/index.html",
    "/games/publishers/index.html",
    "/videos/index.html",
    "/zzap64/index.html",
    "/about.html",
    "/emulation.html",
    "/quiz/quiz.html",
    "/community/profile.html",
    "/contact.html",
    "/support.html"
];

const VIEWPORTS = [
    { width: 360, height: 800, label: "phone-360" },
    { width: 768, height: 1024, label: "tablet-768" },
    { width: 956, height: 900, label: "problem-width-956" },
    { width: 1440, height: 1000, label: "desktop-1440" }
];

const MIME = Object.freeze({
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
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

const PREPARE_SCROLL_SCRIPT = String.raw`
return (function () {
    var root = document.documentElement;
    var body = document.body;
    var scroller = document.scrollingElement || root;

    root.style.setProperty("scroll-behavior", "auto", "important");
    if (body) body.style.setProperty("scroll-behavior", "auto", "important");

    var nested = [];
    Array.from(document.querySelectorAll("main, .ccg-main, .ccg-page")).forEach(function (el) {
        var style = getComputedStyle(el);
        var scrollable = /^(auto|scroll)$/i.test(style.overflowY || "") && el.scrollHeight > el.clientHeight + 24;
        if (!scrollable) return;
        nested.push({
            element: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.classList.length ? "." + Array.from(el.classList).slice(0, 4).join(".") : ""),
            clientHeight: Math.round(el.clientHeight),
            scrollHeight: Math.round(el.scrollHeight),
            overflowY: style.overflowY
        });
    });

    window.scrollTo(0, 0);

    return {
        pageTitle: document.title,
        scrollHeight: Math.round(scroller.scrollHeight),
        clientHeight: Math.round(window.innerHeight),
        maxScroll: Math.max(0, Math.round(scroller.scrollHeight - window.innerHeight)),
        bodyOverflowY: body ? getComputedStyle(body).overflowY : "",
        htmlOverflowY: getComputedStyle(root).overflowY,
        nestedPageScrollers: nested,
        startY: Math.round(window.scrollY)
    };
})();`;

const READ_SCROLL_SCRIPT = String.raw`
return (function () {
    var scroller = document.scrollingElement || document.documentElement;
    return {
        y: Math.round(window.scrollY),
        scrollHeight: Math.round(scroller.scrollHeight),
        clientHeight: Math.round(window.innerHeight),
        maxScroll: Math.max(0, Math.round(scroller.scrollHeight - window.innerHeight))
    };
})();`;

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
    if (!found) throw new Error("ChromeDriver was not found on the GitHub runner.");
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

    let target = absolute;
    try {
        if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
            target = path.join(target, "index.html");
        }
    } catch {
        return null;
    }

    return target;
}

function createServer() {
    return http.createServer((req, res) => {
        const requestUrl = new URL(req.url || "/", `http://${HOST}`);
        const filePath = safeFileForRequest(requestUrl.pathname);

        if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
            res.end("<!doctype html><html><head><title>CCG_AUDIT_404</title></head><body>Not found</body></html>");
            return;
        }

        const extension = path.extname(filePath).toLowerCase();
        const contentType = MIME[extension] || "application/octet-stream";

        try {
            const content = fs.readFileSync(filePath);
            res.writeHead(200, { "content-type": contentType, "cache-control": "no-store" });
            res.end(content);
        } catch (error) {
            res.writeHead(500, { "content-type": "text/html; charset=utf-8" });
            res.end(`<!doctype html><html><head><title>CCG_AUDIT_500</title></head><body>${String(error && error.message ? error.message : error)}</body></html>`);
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
        throw new Error(`ChromeDriver returned non-JSON for ${method} ${pathname}: ${text.slice(0, 500)}`);
    }

    if (!response.ok || payload.value?.error) {
        const message = payload.value?.message || text || `${response.status} ${response.statusText}`;
        throw new Error(`ChromeDriver ${method} ${pathname} failed: ${message}`);
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
    throw new Error(`ChromeDriver did not become ready: ${lastError ? lastError.message : "unknown error"}`);
}

function startDriver(driverPath) {
    const child = spawn(driverPath, [`--port=${DRIVER_PORT}`, `--allowed-ips=${HOST}`], {
        cwd: ROOT,
        stdio: ["ignore", "pipe", "pipe"]
    });

    let tail = "";
    const remember = (chunk) => {
        tail = (tail + chunk.toString("utf8")).slice(-6000);
    };
    child.stdout.on("data", remember);
    child.stderr.on("data", remember);
    child.auditLogTail = () => tail;
    return child;
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
    if (!sessionId) throw new Error("ChromeDriver created a session without returning a session id.");
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
    await new Promise((resolve) => setTimeout(resolve, 1300));
}

async function scrollToY(sessionId, target) {
    await execute(sessionId, "window.scrollTo({ top: arguments[0], left: 0, behavior: 'instant' }); return Math.round(window.scrollY);", [target]);
    await new Promise((resolve) => setTimeout(resolve, 80));
    return execute(sessionId, READ_SCROLL_SCRIPT);
}

async function auditScroll(sessionId, page, viewport) {
    const prepared = await execute(sessionId, PREPARE_SCROLL_SCRIPT);
    const failures = [];

    if (prepared.pageTitle === "CCG_AUDIT_404" || prepared.pageTitle === "CCG_AUDIT_500") {
        failures.push(`local test server returned ${prepared.pageTitle}`);
    }

    if (prepared.nestedPageScrollers?.length) {
        failures.push(`nested full-page scroller(s): ${prepared.nestedPageScrollers.map((item) => item.element).join(", ")}`);
    }

    if (prepared.maxScroll <= 20) {
        return { ...prepared, middleY: 0, bottomY: 0, returnedTopY: 0, failures };
    }

    const middle = await scrollToY(sessionId, Math.round(prepared.maxScroll * 0.5));
    const bottom = await scrollToY(sessionId, prepared.scrollHeight + viewport.height);
    const top = await scrollToY(sessionId, 0);

    const middleTolerance = Math.max(24, Math.round(prepared.maxScroll * 0.08));
    const expectedMiddle = Math.round(prepared.maxScroll * 0.5);
    if (Math.abs(middle.y - expectedMiddle) > middleTolerance) {
        failures.push(`mid-page scroll stalled at ${middle.y}px; expected about ${expectedMiddle}px`);
    }

    const bottomTolerance = 24;
    if (bottom.maxScroll > 20 && bottom.y < bottom.maxScroll - bottomTolerance) {
        failures.push(`bottom unreachable: stopped at ${bottom.y}px of ${bottom.maxScroll}px`);
    }

    if (top.y > 4) {
        failures.push(`could not return to top: stopped at ${top.y}px`);
    }

    return {
        ...prepared,
        middleY: middle.y,
        bottomY: bottom.y,
        bottomMaxScroll: bottom.maxScroll,
        returnedTopY: top.y,
        failures
    };
}

async function main() {
    PAGES.forEach((pageUrl) => {
        const pathname = new URL(pageUrl, "http://local").pathname;
        const filePath = safeFileForRequest(pathname);
        if (!filePath || !fs.existsSync(filePath)) {
            throw new Error(`Scroll audit page does not exist in the repository: ${pageUrl}`);
        }
    });

    const driverPath = findChromeDriver();
    const server = createServer();
    const driver = startDriver(driverPath);
    let sessionId = "";

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, HOST, resolve);
    });

    const address = server.address();
    const sitePort = address && typeof address === "object" ? address.port : 0;
    const failures = [];
    let checks = 0;

    try {
        await waitForDriver();
        sessionId = await createSession();

        console.log(`CCG physical scroll audit using ChromeDriver: ${driverPath}`);
        console.log(`Pages: ${PAGES.length} | Viewports: ${VIEWPORTS.length}`);

        for (const viewport of VIEWPORTS) {
            await setViewport(sessionId, viewport);

            for (const page of PAGES) {
                checks += 1;
                const url = `http://${HOST}:${sitePort}${page}`;
                try {
                    await navigate(sessionId, url);
                    const result = await auditScroll(sessionId, page, viewport);
                    if (result.failures.length) {
                        throw new Error(`${page} @ ${viewport.label}: ${result.failures.join("; ")}`);
                    }
                    console.log(`PASS ${viewport.label.padEnd(17)} ${page} | bottom ${result.bottomY || 0}/${result.bottomMaxScroll || result.maxScroll || 0}px | top ${result.returnedTopY}px`);
                } catch (error) {
                    failures.push(error.message);
                    console.error(`FAIL ${error.message}`);
                }
            }
        }
    } finally {
        if (sessionId) {
            try {
                await webdriver("DELETE", `/session/${sessionId}`);
            } catch {}
        }
        driver.kill("SIGTERM");
        await new Promise((resolve) => server.close(resolve));
    }

    console.log("\nCCG physical scroll summary");
    console.log(`Physical scroll checks: ${checks}`);
    console.log(`Errors: ${failures.length}`);

    if (failures.length) {
        const driverTail = driver.auditLogTail ? driver.auditLogTail() : "";
        if (driverTail) console.error(`\nChromeDriver tail:\n${driverTail}`);
        process.exit(1);
    }

    console.log("Physical page scrolling checks passed.");
}

main().catch((error) => {
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
});
