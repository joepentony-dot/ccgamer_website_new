import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getContentLastmod } = require("../tools/seo/git-content-lastmod.js");
const run = (root, args, env = {}) => execFileSync("git", args, {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, ...env },
}).trim();

test("sitemap lastmod follows actual changed HTML bytes, not an outdated commit", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-sitemap-lastmod-"));
  try {
    run(root, ["init", "-q"]);
    run(root, ["config", "user.name", "CCG Test"]);
    run(root, ["config", "user.email", "ccg-test@example.invalid"]);
    const oldDate = "2024-05-10T11:00:00Z";
    const page = path.join(root, "game.html");
    const other = path.join(root, "unrelated.html");
    fs.writeFileSync(page, "<p>Original editorial description</p>\n");
    fs.writeFileSync(other, "<p>Unrelated</p>\n");
    run(root, ["add", "game.html", "unrelated.html"]);
    run(root, ["commit", "-qm", "Initial archive"], {
      GIT_AUTHOR_DATE: oldDate, GIT_COMMITTER_DATE: oldDate,
    });
    const today = () => "2026-10-14";
    assert.equal(getContentLastmod(root, page, today), "2024-05-10");

    fs.writeFileSync(other, "<p>Only other page changes</p>\n");
    assert.equal(getContentLastmod(root, page, today), "2024-05-10",
      "unrelated work must not bump unchanged game dates");

    fs.writeFileSync(page, "<p>Updated factual C64 game description</p>\n");
    assert.equal(getContentLastmod(root, page, today), "2026-10-14");
    run(root, ["add", "game.html"]);
    assert.equal(getContentLastmod(root, page, today), "2026-10-14",
      "staging must not conceal a pending HTML content update");

    run(root, ["reset", "-q", "HEAD", "--", "game.html"]);
    run(root, ["checkout", "--", "game.html"]);
    assert.equal(getContentLastmod(root, page, today), "2024-05-10",
      "restored HTML must keep its real historical lastmod");

    const newPage = path.join(root, "new-page.html");
    fs.writeFileSync(newPage, "<p>New page</p>\n");
    assert.equal(getContentLastmod(root, newPage, today), "2026-10-14");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("sitemap generation runs after final HTML mutations", () => {
  const { steps } = require("../scripts/rebuild-games.js");
  const names = steps.map(([name]) => name);
  const sitemap = names.indexOf("generate-sitemaps.js");
  assert.ok(sitemap >= 0, "publishing must generate sitemaps");
  for (const mutator of [
    "apply-seo-opportunity-plan.js",
    "apply-game-video-overrides.js",
    "ensure-magazine-review-runtime.js",
    "validate-materialized-magazine-reviews.js",
  ]) {
    assert.ok(sitemap > names.indexOf(mutator),
      `sitemap must reflect final HTML after ${mutator}`);
  }
  const finalRuntimeWrite = steps.findLastIndex(([name, ...args]) =>
    name === "ensure-magazine-review-runtime.js" && !args.includes("--check"));
  assert.ok(sitemap > finalRuntimeWrite,
    "sitemap must follow the final magazine runtime write, not its later --check");
  assert.ok(sitemap < names.indexOf("validate-sitemaps.js"),
    "sitemap must be generated before its validation");
});
