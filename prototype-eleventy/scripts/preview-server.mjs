import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(here, "../_site");
const port = Number(process.env.PORT || 10000);
const host = process.env.HOST || "0.0.0.0";
const deployedCommit = process.env.RENDER_GIT_COMMIT || process.env.GITHUB_SHA || "unknown";

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".xml", "application/xml; charset=utf-8"]
]);

function safeRelativePath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }

  const normalized = path.posix.normalize(decoded).replace(/^\/+/, "");
  if (normalized.startsWith("..") || normalized.includes("/../")) return null;
  return normalized;
}

function resolveCandidate(urlPath) {
  const relative = safeRelativePath(urlPath);
  if (relative === null) return null;

  const direct = path.resolve(siteRoot, relative || "index.html");
  if (!direct.startsWith(`${siteRoot}${path.sep}`) && direct !== siteRoot) return null;

  const candidates = [];
  if (relative) candidates.push(direct);
  if (!relative || urlPath.endsWith("/")) candidates.push(path.resolve(siteRoot, relative, "index.html"));
  if (relative && !path.extname(relative) && !urlPath.endsWith("/")) {
    candidates.push(path.resolve(siteRoot, relative, "index.html"));
    candidates.push(path.resolve(siteRoot, `${relative}.html`));
  }

  return candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  }) || null;
}

function send(res, status, body, contentType = "text/plain; charset=utf-8", extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    ...extraHeaders
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const method = req.method || "GET";
  if (method !== "GET" && method !== "HEAD") {
    send(res, 405, "Method Not Allowed", "text/plain; charset=utf-8", { Allow: "GET, HEAD" });
    return;
  }

  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (requestUrl.pathname === "/__preview-health") {
    const body = JSON.stringify({ ok: true, siteRoot: path.basename(siteRoot), commit: deployedCommit });
    if (method === "HEAD") {
      send(res, 200, "", "application/json; charset=utf-8", { "Cache-Control": "no-store" });
    } else {
      send(res, 200, body, "application/json; charset=utf-8", { "Cache-Control": "no-store" });
    }
    return;
  }

  const candidate = resolveCandidate(requestUrl.pathname);
  if (!candidate) {
    send(res, 404, "Not Found", "text/plain; charset=utf-8", { "Cache-Control": "no-store" });
    return;
  }

  const ext = path.extname(candidate).toLowerCase();
  const contentType = mimeTypes.get(ext) || "application/octet-stream";
  const cacheControl = ext === ".html" ? "no-cache" : "public, max-age=3600";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive"
  });

  if (method === "HEAD") {
    res.end();
    return;
  }

  fs.createReadStream(candidate)
    .on("error", () => send(res, 500, "Internal Server Error"))
    .pipe(res);
});

server.listen(port, host, () => {
  console.log(`[ccg-eleventy-preview] serving ${siteRoot} on http://${host}:${port} at ${deployedCommit}`);
});
