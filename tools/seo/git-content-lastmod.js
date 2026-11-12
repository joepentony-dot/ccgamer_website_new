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
  // During final SEO staging, only HTML that is actually in the outgoing
  // commit may advance a sitemap date. Temporary working-tree rewrites do not.
  const stagedOnly = process.env.CCG_SITEMAP_LASTMOD_STAGED_ONLY === "1";
  const diffArgs = ["diff", ...(stagedOnly ? ["--cached"] : []), "--quiet", "HEAD", "--", relativePath];
  const difference = spawnSync("git", diffArgs, {
    cwd: repoRoot,
    stdio: "ignore",
  });
  if (difference.status === 1) return today();
  if (difference.status !== 0) {
    throw new Error(`Cannot establish sitemap lastmod for ${relativePath}: git diff failed.`);
  }

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
