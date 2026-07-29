#!/usr/bin/env node

"use strict";

const http = require("http");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const HOST = process.env.CCG_ADMIN_API_HOST || "127.0.0.1";
const PORT = Number(process.env.CCG_ADMIN_API_PORT || 3131);
const repoRoot = path.resolve(__dirname, "..");
const rebuildScript = path.join(repoRoot, "scripts", "rebuild-games.js");
const MAX_LOG_CHARS = 24000;

const SECTION_TO_FILE = {
  "retro-events": path.join(repoRoot, "data", "retro-events.json"),
  "retro-specials": path.join(repoRoot, "data", "retro-specials.json"),
  "amiga-demo-music": path.join(repoRoot, "data", "amiga-demo-music.json"),
};

let rebuildInProgress = false;

function log(message) {
  console.log(`[admin-api] ${message}`);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractYoutubeId(value) {
  const input = String(value || "").trim();
  if (!input) return "";
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/i,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/i,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/i,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/i,
    /[?&]v=([A-Za-z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

function normalizeItem(item) {
  const title = String(item?.title || "").trim();
  const youtubeUrl = String(item?.youtube_url || item?.url || "").trim();
  const youtubeId = String(item?.youtube_video_id || item?.youtubeId || item?.youtube || "").trim() || extractYoutubeId(youtubeUrl);
  const slug = slugify(item?.slug || item?.id || title || youtubeId);

  return {
    ...item,
    title,
    slug,
    youtube_video_id: youtubeId,
    youtubeId,
    youtube: youtubeId,
    youtube_url: youtubeUrl || (youtubeId ? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}` : ""),
    url: youtubeUrl || (youtubeId ? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}` : ""),
  };
}

function validateItems(items) {
  const errors = [];
  items.forEach((raw, index) => {
    const item = normalizeItem(raw);
    const label = item.id || item.title || `item-${index + 1}`;
    if (!item.title) errors.push(`${label}: title is required`);
    if (!item.slug) errors.push(`${label}: slug is required`);
    if (!item.youtube_video_id) errors.push(`${label}: youtubeId is required`);
    if (item.youtube_video_id && !/^[A-Za-z0-9_-]{6,20}$/.test(item.youtube_video_id)) {
      errors.push(`${label}: youtubeId format is invalid`);
    }
  });
  return errors;
}

function requestOrigin(request) {
  return String(request.headers.origin || "").trim();
}

function isLocalOrigin(origin) {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function isLoopbackRequest(request) {
  const remote = String(request.socket.remoteAddress || "").toLowerCase();
  return remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1";
}

function sendJson(request, response, statusCode, payload) {
  const origin = requestOrigin(request);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": isLocalOrigin(origin) && origin ? origin : "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-CCG-Local-Rebuild",
    Vary: "Origin",
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request, response, callback) {
  const chunks = [];
  let size = 0;
  request.on("data", (chunk) => {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) {
      sendJson(request, response, 413, { ok: false, error: "payload_too_large" });
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });
  request.on("end", () => {
    try {
      callback(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    } catch (error) {
      sendJson(request, response, 400, { ok: false, error: "invalid_json", message: error.message });
    }
  });
}

function handleRetroSave(request, response) {
  readJsonBody(request, response, (parsed) => {
    const section = String(parsed?.section || "").trim();
    const outputPath = SECTION_TO_FILE[section];
    if (!outputPath) {
      sendJson(request, response, 400, { ok: false, error: "invalid_section" });
      return;
    }
    if (!Array.isArray(parsed?.items)) {
      sendJson(request, response, 400, { ok: false, error: "items_must_be_array" });
      return;
    }

    const normalizedItems = parsed.items.map((item) => normalizeItem(item));
    const validationErrors = validateItems(normalizedItems);
    if (validationErrors.length) {
      sendJson(request, response, 400, { ok: false, error: "validation_failed", validationErrors });
      return;
    }

    try {
      fs.writeFileSync(outputPath, `${JSON.stringify(normalizedItems, null, 2)}\n`, "utf8");
      log(`Saved ${section}: ${outputPath} (${normalizedItems.length} items)`);
    } catch (error) {
      sendJson(request, response, 500, { ok: false, error: "write_failed", message: error.message });
      return;
    }

    sendJson(request, response, 200, {
      ok: true,
      section,
      path: outputPath,
      count: normalizedItems.length,
      rebuild: { triggered: false, note: "Run npm run rebuild:games after source-data changes." },
    });
  });
}

function appendBoundedLog(current, chunk) {
  const next = `${current}${String(chunk || "")}`;
  return next.length <= MAX_LOG_CHARS ? next : next.slice(-MAX_LOG_CHARS);
}

function handleGameRebuild(request, response) {
  const origin = requestOrigin(request);
  const header = String(request.headers["x-ccg-local-rebuild"] || "");
  if (!isLoopbackRequest(request) || !isLocalOrigin(origin) || header !== "1") {
    sendJson(request, response, 403, {
      ok: false,
      error: "local_rebuild_forbidden",
      message: "The game rebuild endpoint accepts only explicit loopback requests from the local editor.",
    });
    return;
  }
  if (rebuildInProgress) {
    sendJson(request, response, 409, {
      ok: false,
      error: "rebuild_in_progress",
      message: "A game rebuild is already running.",
    });
    return;
  }

  rebuildInProgress = true;
  let output = "";
  log("Starting authoritative game rebuild: npm run rebuild:games");
  const child = spawn(process.execPath, [rebuildScript], {
    cwd: repoRoot,
    env: { ...process.env, CCG_ADMIN_REBUILD: "1" },
    windowsHide: true,
  });
  child.stdout.on("data", (chunk) => {
    output = appendBoundedLog(output, chunk);
    process.stdout.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    output = appendBoundedLog(output, chunk);
    process.stderr.write(chunk);
  });
  child.on("error", (error) => {
    rebuildInProgress = false;
    sendJson(request, response, 500, { ok: false, error: "rebuild_start_failed", message: error.message, output });
  });
  child.on("close", (code) => {
    rebuildInProgress = false;
    const ok = code === 0;
    log(`Authoritative game rebuild ${ok ? "completed" : "failed"} with status ${code}.`);
    sendJson(request, response, ok ? 200 : 500, {
      ok,
      error: ok ? null : "rebuild_failed",
      message: ok ? "Full game publishing pipeline completed successfully." : `Game publishing pipeline failed with status ${code}.`,
      status: code,
      output,
    });
  });
}

const server = http.createServer((request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(request, response, 200, { ok: true });
    return;
  }
  if (request.method !== "POST") {
    sendJson(request, response, 404, { ok: false, error: "not_found" });
    return;
  }
  if (request.url === "/admin/api/retro-json/save") {
    handleRetroSave(request, response);
    return;
  }
  if (request.url === "/admin/api/rebuild-games") {
    handleGameRebuild(request, response);
    return;
  }
  sendJson(request, response, 404, { ok: false, error: "not_found" });
});

server.listen(PORT, HOST, () => {
  log(`Listening on http://${HOST}:${PORT}`);
  log("Ready endpoints:");
  log("POST /admin/api/retro-json/save");
  log("POST /admin/api/rebuild-games (loopback-only, X-CCG-Local-Rebuild: 1)");
});
