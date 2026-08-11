#!/usr/bin/env node

/*
 * CCG rendered responsive browser audit.
 *
 * Uses ChromeDriver + the Chrome already installed on GitHub's Ubuntu runner.
 * One persistent headless browser session is resized through representative
 * phone, tablet, the historically problematic ~956px width, and wide desktop.
 *
 * Checks rendered pages for:
 *   - document-level horizontal overflow
 *   - unexpected body scroll locking
 *   - excessive shared-header height
 *   - physical overlap between top-level header controls
 */

"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const HOST = "127.0.0.1";
const DRIVER_PORT = 9515;

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

const DIAGNOSTIC_SCRIPT = String.raw`
return (function () {
    function visible(el) {
        if (!el) return false;
        var style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
        var rect = el.getBoundingClientRect();
        return rect.width > 1 && rect.height > 1;
    }

    function describe(el) {
        if (!el) return "";
        var out = el.tagName.toLowerCase();
        if (el.id) out += "#" + el.id;
        if (el.classList && el.classList.length) out += "." + Array.from(el.classList).slice(0, 4).join(".");
        return out;
    }

    function overlap(a, b) {
        var ar = a.getBoundingClientRect();
        var br = b.getBoundingClientRect();
        var width = Math.min(ar.right, br.right) - Math.max(ar.left, br.left);
        var height = Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top);
        return width > 4 && height > 4 ? Math.round(width * height) : 0;
    }

    var root = document.documentElement;
    var body = document.body;
    var viewportWidth = root.clientWidth;
    var viewportHeight = window.innerHeight;
    var header = document.querySelector(".ccg-header");
    var headerRect = header ? header.getBoundingClientRect() : null;
    var bodyStyle = body ? getComputedStyle(body) : null;
    var locked = body && (
        body.classList.contains("ccg-body--locked") ||
        body.classList.contains("ccg-body--nav-open") ||
        body.classList.contains("modal-open")
    );

    var overflowOffenders = [];
    if (body) {
        Array.from(body.querySelectorAll("*")).forEach(function (el) {
            if (overflowOffenders.length >= 16 || !visible(el)) return;
            if (el.closest('.ccg-nav-drawer[aria-hidden="true"]')) return;
            var style = getComputedStyle(el);
            if (style.position === "fixed" && /ccg-bg|backdrop|overlay/.test(String(el.className || ""))) return;
            var rect = el.getBoundingClientRect();
            if (rect.right > viewportWidth + 4 || rect.left < -4) {
                overflowOffenders.push({
                    element: describe(el),
                    left: Math.round(rect.left),
                    right: Math.round(rect.right),
                    width: Math.round(rect.width)
                });
            }
        });
    }

    var controlSelectors = [
        ".ccg-brand",
        ".ccg-nav-toggle",
        ".ccg-mode-toggle",
        ".ccg-auth-slot",
        ".ccg-header-socials"
    ];
    var controls = controlSelectors
        .map(function (selector) { return document.querySelector(selector); })
        .filter(visible);
    var headerOverlaps = [];

    for (var i = 0; i < controls.length; i += 1) {
        for (var j = i + 1; j < controls.length; j += 1) {
            var area = overlap(controls[i], controls[j]);
            if (area > 0) {
                headerOverlaps.push({
                    a: describe(controls[i]),
                    b: describe(controls[j]),
                    area: area
                });
            }
        }
    }

    return {
        pageTitle: document.title,
        path: location.pathname + location.search,
        viewportWidth: viewportWidth,
        viewportHeight: viewportHeight,
        scrollWidth: root.scrollWidth,
        horizontalOverflow: Math.max(0, Math.round(root.scrollWidth - viewportWidth)),
        overflowOffenders: overflowOffenders,
        bodyOverflowY: bodyStyle ? bodyStyle.overflowY : "",
        bodyLocked: Boolean(locked),
        headerHeight: headerRect ? Math.round(headerRect.height) : 0,
        headerOverlaps: headerOverlaps
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

async function executeDiagnostics(sessionId) {
    const payload = await webdriver("POST", `/session/${sessionId}/execute/sync`, {
        script: DIAGNOSTIC_SCRIPT,
        args: []
    });
    return payload.value;
}

function validateResult(result, page, viewport) {
    const failures = [];
    const maxHeaderHeight = Math.min(300, Math.round(viewport.height * 0.34));

    if (!result || typeof result !== "object") {
        throw new Error(`${page} @ ${viewport.label}: no diagnostics object was returned`);
    }

    if (result.pageTitle === "CCG_AUDIT_404" || result.pageTitle === "CCG_AUDIT_500") {
        failures.push(`local test server returned ${result.pageTitle}`);
    }

    if (result.horizontalOverflow > 4) {
        failures.push(`horizontal overflow ${result.horizontalOverflow}px`);
    }

    if (!result.bodyLocked && /hidden/i.test(result.bodyOverflowY || "")) {
        failures.push(`body unexpectedly has overflow-y:${result.bodyOverflowY}`);
    }

    if (result.headerHeight > maxHeaderHeight) {
        failures.push(`header ${result.headerHeight}px exceeds ${maxHeaderHeight}px budget`);
    }

    if (Array.isArray(result.headerOverlaps) && result.headerOverlaps.length) {
        failures.push(`header controls overlap: ${result.headerOverlaps.map((item) => `${item.a} ↔ ${item.b}`).join(", ")}`);
    }

    if (failures.length) {
        const offenderText = result.overflowOffenders && result.overflowOffenders.length
            ? ` | overflow candidates: ${result.overflowOffenders.map((item) => `${item.element}[${item.left},${item.right}]`).join(", ")}`
            : "";
        throw new Error(`${page} @ ${viewport.label} (${viewport.width}x${viewport.height}): ${failures.join("; ")}${offenderText}`);
    }
}

async function main() {
    PAGES.forEach((pageUrl) => {
        const pathname = new URL(pageUrl, "http://local").pathname;
        const filePath = safeFileForRequest(pathname);
        if (!filePath || !fs.existsSync(filePath)) {
            throw new Error(`Rendered audit page does not exist in the repository: ${pageUrl}`);
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
    let widestHeader = 0;

    try {
        await waitForDriver();
        sessionId = await createSession();

        console.log(`CCG rendered responsive audit using ChromeDriver: ${driverPath}`);
        console.log(`Pages: ${PAGES.length} | Viewports: ${VIEWPORTS.length}`);

        for (const viewport of VIEWPORTS) {
            await setViewport(sessionId, viewport);

            for (const page of PAGES) {
                checks += 1;
                const url = `http://${HOST}:${sitePort}${page}`;
                try {
                    await navigate(sessionId, url);
                    const result = await executeDiagnostics(sessionId);
                    validateResult(result, page, viewport);
                    widestHeader = Math.max(widestHeader, result.headerHeight || 0);
                    console.log(`PASS ${viewport.label.padEnd(17)} ${page} | overflow ${result.horizontalOverflow}px | header ${result.headerHeight}px`);
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

    console.log("\nCCG rendered responsive summary");
    console.log(`Rendered viewport checks: ${checks}`);
    console.log(`Largest measured header: ${widestHeader}px`);
    console.log(`Errors: ${failures.length}`);

    if (failures.length) {
        const driverTail = driver.auditLogTail ? driver.auditLogTail() : "";
        if (driverTail) console.error(`\nChromeDriver tail:\n${driverTail}`);
        process.exit(1);
    }

    console.log("Rendered responsive browser checks passed.");
}

main().catch((error) => {
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
});
