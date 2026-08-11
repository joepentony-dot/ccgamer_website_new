#!/usr/bin/env node

/*
 * CCG rendered responsive browser audit.
 *
 * Uses the Chrome/Chromium already installed on GitHub's Ubuntu runner.
 * A tiny local static server injects a diagnostics probe into representative
 * public pages; nothing is added to production HTML.
 *
 * Checks at phone, tablet, the historically problematic ~956px width and
 * wide desktop:
 *   - document-level horizontal overflow
 *   - unexpected body scroll locking
 *   - excessive shared-header height
 *   - physical overlap between top-level header controls
 */

"use strict";

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const HOST = "127.0.0.1";
const MAX_BUFFER = 24 * 1024 * 1024;

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

const AUDIT_PROBE = String.raw`
<script>
(function () {
    "use strict";

    function visible(el) {
        if (!el) return false;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
        const rect = el.getBoundingClientRect();
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

    function collect() {
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
                if (style.position === "fixed" && /ccg-bg|backdrop|overlay/.test(el.className || "")) return;
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

        var result = {
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

        var node = document.createElement("script");
        node.id = "ccg-responsive-audit-result";
        node.type = "application/json";
        node.textContent = JSON.stringify(result);
        body.appendChild(node);
    }

    function queue() {
        window.setTimeout(collect, 900);
    }

    if (document.readyState === "complete") queue();
    else window.addEventListener("load", queue, { once: true });
})();
</script>`;

function findChrome() {
    const candidates = [
        process.env.CHROME_BIN,
        "google-chrome",
        "google-chrome-stable",
        "chromium",
        "chromium-browser"
    ].filter(Boolean);

    for (const candidate of candidates) {
        if (candidate.includes(path.sep) && fs.existsSync(candidate)) return candidate;
        const found = spawnSync("bash", ["-lc", `command -v ${candidate}`], { encoding: "utf8" });
        if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
    }

    throw new Error("Chrome/Chromium was not found on the runner.");
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

function injectProbe(html) {
    if (/<\/body\s*>/i.test(html)) {
        return html.replace(/<\/body\s*>/i, `${AUDIT_PROBE}\n</body>`);
    }
    return `${html}\n${AUDIT_PROBE}`;
}

function createServer() {
    return http.createServer((req, res) => {
        const requestUrl = new URL(req.url || "/", `http://${HOST}`);
        const filePath = safeFileForRequest(requestUrl.pathname);

        if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
            res.end("Not found");
            return;
        }

        const extension = path.extname(filePath).toLowerCase();
        const contentType = MIME[extension] || "application/octet-stream";

        try {
            if (extension === ".html") {
                const html = fs.readFileSync(filePath, "utf8");
                res.writeHead(200, { "content-type": contentType, "cache-control": "no-store" });
                res.end(injectProbe(html));
                return;
            }

            const content = fs.readFileSync(filePath);
            res.writeHead(200, { "content-type": contentType, "cache-control": "no-store" });
            res.end(content);
        } catch (error) {
            res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
            res.end(String(error && error.message ? error.message : error));
        }
    });
}

function extractResult(html) {
    const match = html.match(/<script\s+id="ccg-responsive-audit-result"\s+type="application\/json">([\s\S]*?)<\/script>/i);
    if (!match) return null;
    try {
        return JSON.parse(match[1]);
    } catch {
        return null;
    }
}

function validateResult(result, page, viewport) {
    const failures = [];
    const maxHeaderHeight = Math.min(300, Math.round(viewport.height * 0.34));

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

function runChromeAudit(chrome, port, page, viewport, index) {
    const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), `ccg-responsive-chrome-${index}-`));
    const url = `http://${HOST}:${port}${page}${page.includes("?") ? "&" : "?"}ccg-responsive-audit=1`;
    const args = [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-sync",
        "--disable-default-apps",
        "--no-first-run",
        "--mute-audio",
        "--disable-background-networking",
        `--user-data-dir=${profileDir}`,
        `--window-size=${viewport.width},${viewport.height}`,
        "--virtual-time-budget=2600",
        "--dump-dom",
        url
    ];

    return new Promise((resolve, reject) => {
        const child = spawn(chrome, args, {
            cwd: ROOT,
            stdio: ["ignore", "pipe", "pipe"]
        });

        let stdout = "";
        let stderr = "";
        let finished = false;

        const finish = (error, result) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            fs.rmSync(profileDir, { recursive: true, force: true });
            if (error) reject(error);
            else resolve(result);
        };

        const append = (current, chunk) => {
            const next = current + chunk.toString("utf8");
            if (Buffer.byteLength(next, "utf8") > MAX_BUFFER) {
                throw new Error("Chrome responsive audit output exceeded the safety buffer.");
            }
            return next;
        };

        const timer = setTimeout(() => {
            child.kill("SIGKILL");
            finish(new Error(`${page} @ ${viewport.label}: Chrome timed out after 20 seconds`));
        }, 20000);

        child.stdout.on("data", (chunk) => {
            try {
                stdout = append(stdout, chunk);
            } catch (error) {
                child.kill("SIGKILL");
                finish(error);
            }
        });

        child.stderr.on("data", (chunk) => {
            try {
                stderr = append(stderr, chunk);
            } catch (error) {
                child.kill("SIGKILL");
                finish(error);
            }
        });

        child.once("error", (error) => finish(error));
        child.once("close", (code) => {
            if (finished) return;
            if (code !== 0 && !stdout) {
                finish(new Error(`Chrome exited ${code}: ${stderr.trim().slice(-1000)}`));
                return;
            }

            const result = extractResult(stdout);
            if (!result) {
                finish(new Error(`No responsive audit result was emitted. Chrome stderr: ${stderr.trim().slice(-1000)}`));
                return;
            }

            try {
                validateResult(result, page, viewport);
                finish(null, result);
            } catch (error) {
                finish(error);
            }
        });
    });
}

async function main() {
    const chrome = findChrome();
    const server = createServer();

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, HOST, resolve);
    });

    const address = server.address();
    const port = address && typeof address === "object" ? address.port : 0;
    const failures = [];
    let checks = 0;
    let widestHeader = 0;

    console.log(`CCG rendered responsive audit using: ${chrome}`);
    console.log(`Pages: ${PAGES.length} | Viewports: ${VIEWPORTS.length}`);

    try {
        for (const viewport of VIEWPORTS) {
            for (const page of PAGES) {
                checks += 1;
                try {
                    const result = await runChromeAudit(chrome, port, page, viewport, checks);
                    widestHeader = Math.max(widestHeader, result.headerHeight || 0);
                    console.log(`PASS ${viewport.label.padEnd(17)} ${page} | overflow ${result.horizontalOverflow}px | header ${result.headerHeight}px`);
                } catch (error) {
                    failures.push(error.message);
                    console.error(`FAIL ${error.message}`);
                }
            }
        }
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }

    console.log("\nCCG rendered responsive summary");
    console.log(`Rendered viewport checks: ${checks}`);
    console.log(`Largest measured header: ${widestHeader}px`);
    console.log(`Errors: ${failures.length}`);

    if (failures.length) process.exit(1);
    console.log("Rendered responsive browser checks passed.");
}

main().catch((error) => {
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
});
