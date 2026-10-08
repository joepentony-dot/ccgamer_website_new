#!/usr/bin/env node
// Fire King (C64) one-time upload bridge. Never contacts Supabase.
// Reads an owner-attached ZIP from this pull request, verifies each supplied
// binary against immutable hashes, then stages exactly three approved assets.
// PR #2597 remains draft until all normal publishing tests pass.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";

const expected = Object.freeze({
  "resources/images/thumbnails/all/fire-king.webp": {
    size: 34398,
    sha256: "2d202830ab46e4c99ece001ff51c5af1400c1a04b38bcb799d75abe818eb1ba7"
  },
  "resources/images/games/boxes-3d/fire-king.webp": {
    size: 65538,
    sha256: "3354b895b91b8fd0d181fdbb2c5c5af758488373306c6ac2b535755be26dc2d3"
  },
  "resources/manuals/fireking-manual.pdf": {
    size: 4345060,
    sha256: "52f398b668b78b475879e6ddec5add341fc5e00ecadb672c33d90027b2b99573"
  }
});
const repo = path.resolve(process.cwd());
const owner = "joepentony-dot";
const repository = "ccgamer_website_new";
const prNumber = 2597;
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
assert.ok(token, "GitHub Actions access token is needed to read the PR discussion.");
assert.equal(process.env.GITHUB_REPOSITORY, owner + "/" + repository, "Wrong repository.");
assert.equal(process.env.GITHUB_HEAD_REF, "content/fire-king-1989-c64", "Wrong game upload branch.");

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function getComments() {
  const response = await fetch("https://api.github.com/repos/" + owner + "/" + repository + "/issues/" + prNumber + "/comments?per_page=100", {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ccg-fire-king-asset-import"
    },
    signal: AbortSignal.timeout(20000)
  });
  assert.equal(response.status, 200, "Cannot read approved PR comments; status " + response.status);
  return response.json();
}

function trustedZipUrl(comments) {
  for (const comment of [...comments].reverse()) {
    if (comment?.user?.login !== owner) continue;
    const matches = String(comment.body || "").match(/https:\/\/github\.com\/user-attachments\/files\/[0-9]+\/fire-king-website-assets\.zip/g);
    if (matches?.length) return matches.at(-1);
  }
  return "";
}

async function downloadBundle(url) {
  const input = new URL(url);
  assert.equal(input.hostname, "github.com");
  assert.ok(/^\/user-attachments\/files\/[0-9]+\/fire-king-website-assets\.zip$/.test(input.pathname));
  const response = await fetch(url, {redirect: "follow", signal: AbortSignal.timeout(60000)});
  assert.equal(response.status, 200, "Original owner ZIP could not be downloaded: HTTP " + response.status);
  const final = new URL(response.url);
  assert.ok(final.hostname === "github.com" || final.hostname.endsWith(".githubusercontent.com"), "Untrusted redirect host");
  const cap = 7000000;
  let bytes = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    bytes += chunk.byteLength;
    assert.ok(bytes <= cap, "Unexpectedly large archive");
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

const comments = await getComments();
const url = trustedZipUrl(comments);
if (!url) {
  console.log("Fire King asset import is waiting for an owner-uploaded ZIP attached to PR #2597.");
  process.exit(0);
}
const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-fire-king-"));
try {
  const archive = path.join(root, "bundle.zip");
  fs.writeFileSync(archive, await downloadBundle(url));
  const list = execFileSync("unzip", ["-Z1", archive], {encoding: "utf8", maxBuffer: 2048}).trim().split(/\r?\n/);
  const allowed = new Set([...Object.keys(expected), "README-FIRE-KING-ASSETS.txt"]);
  assert.equal(list.length, 4, "Unexpected ZIP entry count");
  assert.ok(list.every(name => allowed.has(name)), "Archive contains an unexpected file/path");
  for (const [relative, check] of Object.entries(expected)) {
    const bytes = execFileSync("unzip", ["-p", archive, relative], {maxBuffer: 5500000});
    assert.equal(bytes.byteLength, check.size, "Wrong original asset size: " + relative);
    assert.equal(sha256(bytes), check.sha256, "Original asset hash mismatch: " + relative);
    if (relative.endsWith(".webp")) assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
    if (relative.endsWith(".pdf")) assert.equal(bytes.subarray(0, 4).toString("ascii"), "%PDF");
    const dest = path.join(repo, relative);
    fs.mkdirSync(path.dirname(dest), {recursive: true});
    if (fs.existsSync(dest)) {
      const existing = fs.readFileSync(dest);
      assert.equal(sha256(existing), check.sha256, "Existing asset differs: " + relative);
      console.log("Original asset already exists: " + relative);
      continue;
    }
    fs.writeFileSync(dest, bytes, {flag: "wx"});
    console.log("Verified and staged " + relative + " (" + bytes.length + " bytes)");
  }
  console.log("PASS: exact original Fire King artwork and manual validated; no unrelated files changed.");
} finally {
  fs.rmSync(root, {recursive: true, force: true});
}
