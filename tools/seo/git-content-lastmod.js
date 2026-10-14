"use strict";

const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

// Report the date of genuinely changed outgoing HTML, even before the
// authoritative publisher commits it. Never bump unchanged pages to today.
function getContentLastmod(repoRoot, filePath, today = () => new Date().toISOString().slice(0, 10)) {
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join("/");
  if (!relativePath || relativePath.startsWith("../") || path.isAbsolute(relativePath)) {
    return today();
  }

  // Compare bytes to HEAD (both staged and unstaged changes), not to the
  // index, so a publisher-generated page receives its real publication date.
  const difference = spawnSync("git", ["diff", "--quiet", "HEAD", "--", relativePath], {
    cwd: repoRoot,
    stdio: "ignore",
  });
  if (difference.status === 1) return today();

  try {
    const recorded = execFileSync("git", ["log", "-1", "--format=%cI", "--", relativePath], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (recorded) return recorded.slice(0, 10);
  } catch {
    // New or otherwise untracked content has no previous committed date.
  }
  return today();
}

module.exports = { getContentLastmod };
