#!/usr/bin/env node

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");
const NETWORK_CONCURRENCY = 20;

function flattenLinks(value) {
  if (Array.isArray(value)) return value.flatMap(flattenLinks);
  const text = String(value || "").trim();
  return text ? [text] : [];
}

function driveFileId(url) {
  return String(url || "").match(/drive\.google\.com\/file\/d\/([^/]+)/i)?.[1]
    || String(url || "").match(/[?&]id=([^&]+)/i)?.[1]
    || "";
}

function directAuditUrl(url) {
  const id = driveFileId(url);
  return id
    ? `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`
    : url;
}

function structuralErrors(games) {
  const errors = [];
  for (const game of games) {
    const slug = String(game?.slug || "missing-slug");
    const manual = String(game?.pdf || "").trim();
    if (!manual) continue;

    if ((manual.match(/https?:\/\//gi) || []).length !== 1) {
      errors.push(`${slug}: manual field contains more than one URL`);
    }
    if (!/^https:\/\//i.test(manual)) {
      errors.push(`${slug}: manual URL is not HTTPS`);
    }
    if (!driveFileId(manual) && !/\.pdf(?:[?#].*)?$/i.test(manual)) {
      errors.push(`${slug}: manual URL is neither a PDF path nor a Google Drive file`);
    }

    const disks = flattenLinks(game?.disk);
    if (disks.includes(manual)) {
      errors.push(`${slug}: manual and game-media URL are identical`);
    }
  }
  return errors;
}

function auditRemoteManual(game, tempRoot, index) {
  return new Promise((resolve) => {
    const url = String(game.pdf || "").trim();
    const bodyPath = path.join(tempRoot, `${index}.bin`);
    const headerPath = path.join(tempRoot, `${index}.headers`);
    const child = spawn("curl", [
      "--location",
      "--fail",
      "--silent",
      "--show-error",
      "--max-time",
      "60",
      "--range",
      "0-31",
      "--dump-header",
      headerPath,
      "--output",
      bodyPath,
      directAuditUrl(url),
    ]);
    let errorText = "";
    child.stderr.on("data", (chunk) => { errorText += chunk; });
    child.on("close", (code) => {
      let signature = "";
      let headers = "";
      try {
        signature = fs.readFileSync(bodyPath).subarray(0, 8).toString("latin1");
      } catch (error) {
        // Reported below as an inaccessible manual.
      }
      try {
        headers = fs.readFileSync(headerPath, "utf8");
      } catch (error) {
        // Header details are optional diagnostic context.
      }
      const filename = headers.match(/content-disposition:\s*attachment;\s*filename="([^"]+)"/i)?.[1] || "";
      resolve({
        slug: game.slug,
        valid: code === 0 && signature.startsWith("%PDF-"),
        filename,
        error: errorText.trim(),
      });
    });
  });
}

async function auditNetwork(games) {
  const records = games.filter((game) => String(game?.pdf || "").trim());
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-manual-audit-"));
  const results = new Array(records.length);
  let cursor = 0;

  async function worker() {
    while (cursor < records.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await auditRemoteManual(records[index], tempRoot, index);
    }
  }

  try {
    await Promise.all(Array.from(
      { length: Math.min(NETWORK_CONCURRENCY, records.length) },
      worker
    ));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  return results;
}

async function main() {
  const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
  const errors = structuralErrors(games);
  const manuals = games.filter((game) => String(game?.pdf || "").trim());

  if (process.argv.includes("--network")) {
    const results = await auditNetwork(games);
    results.filter((result) => !result.valid).forEach((result) => {
      errors.push(`${result.slug}: remote file is not a readable PDF${result.filename ? ` (${result.filename})` : ""}${result.error ? ` — ${result.error}` : ""}`);
    });
    console.log(`[game-manual-audit] Remote PDF signatures verified: ${results.filter((result) => result.valid).length}/${results.length}`);
  }

  console.log(`[game-manual-audit] Games checked: ${games.length}`);
  console.log(`[game-manual-audit] Manual links present: ${manuals.length}`);
  if (errors.length) {
    errors.forEach((error) => console.error(`  - ${error}`));
    throw new Error(`${errors.length} manual audit failure(s).`);
  }
  console.log("[game-manual-audit] PASS");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[game-manual-audit] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  auditNetwork,
  directAuditUrl,
  driveFileId,
  structuralErrors,
};
