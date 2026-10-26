import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import vm from "node:vm";

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
  const firstSitemap = steps.findIndex(([name, ...args]) =>
    name === "generate-sitemaps.js" && !args.includes("--final-pass"));
  const sitemap = steps.findIndex(([name, ...args]) =>
    name === "generate-sitemaps.js" && args.includes("--final-pass"));
  assert.ok(firstSitemap >= 0 && sitemap > firstSitemap,
    "publishing must generate the initial SEO growth sitemap and a final lastmod pass");
  assert.ok(firstSitemap < names.indexOf("apply-seo-opportunity-plan.js"),
    "initial SEO growth generation must precede the opportunity metadata pass");
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

test("final sitemap pass preserves SEO opportunity metadata without composer synchronization", () => {
  const script = fs.readFileSync(new URL("../scripts/generate-sitemaps.js", import.meta.url), "utf8");
  const origin = "https://www.cheekycommodoregamer.co.uk";
  const root = path.join(os.tmpdir(), "ccg-sitemap-final-pass-fixture");
  const homePath = path.join(root, "home.html");
  const pagesPath = path.join(root, "sitemap-pages.xml");
  const indexPath = path.join(root, "sitemap.xml");
  const composerPath = path.join(root, "music", "composers", "composers.json");
  const homeHtml = '<link rel="canonical" href="' + origin + '/home.html">';
  const pageHtml = "<title>Preserve existing SEO opportunity metadata</title>";

  function execute(finalPass) {
    const files = new Map([
      [homePath, homeHtml],
      [pagesPath, "<urlset></urlset>"],
      [indexPath, "<sitemapindex></sitemapindex>"],
      [composerPath, JSON.stringify([{ generated: true, slug: "fixture-composer" }])],
      [path.join(root, "music", "fixture-composer", "index.html"), pageHtml],
    ]);
    const invoked = [];
    const mockFs = {
      existsSync: (filename) => files.has(filename),
      readFileSync: (filename) => {
        assert.ok(files.has(filename), "unexpected file read: " + filename);
        return files.get(filename);
      },
      writeFileSync: (filename, value) => files.set(filename, value),
      readdirSync: () => ["sitemap.xml", "sitemap-pages.xml", "sitemap-games.xml"],
    };
    const mockRequire = (id) => {
      if (id === "fs") return mockFs;
      if (id === "path") return path;
      if (id === "child_process") return {
        spawnSync: (_node, args) => {
          invoked.push(path.basename(args[0]));
          return { status: 0 };
        },
      };
      if (id === "../tools/seo/generate-sitemap.js") {
        files.set(pagesPath, "<urlset><url><loc>" + origin + "/</loc></url></urlset>");
        return {};
      }
      throw new Error("Unexpected dependency: " + id);
    };
    vm.runInNewContext(script.replace(/^#!.*$/, ""), {
      require: mockRequire,
      __dirname: path.join(root, "scripts"),
      process: {
        argv: ["node", "generate-sitemaps.js", ...(finalPass ? ["--final-pass"] : [])],
        execPath: "node",
        env: {},
      },
      console: { log() {}, warn() {}, error() {} },
    });
    assert.equal(files.get(path.join(root, "music", "fixture-composer", "index.html")), pageHtml,
      "sitemap generation must not change existing composer HTML");
    return { files, invoked };
  }

  const final = execute(true);
  assert.deepEqual(final.invoked, ["audit-sitemap-indexability.js"],
    "final pass must not invoke composer sync, enrichment or SEO growth rewriting");
  assert.ok(final.files.get(pagesPath).includes("<loc>" + origin + "/home.html</loc>"),
    "final pass must retain the established homepage canonical sitemap entry");

  const initial = execute(false);
  assert.ok(initial.invoked.includes("validate-composer-count-sync.js"),
    "initial sitemap pass must retain composer synchronization");
  assert.ok(initial.invoked.includes("apply-seo-growth-repair-v4.js"),
    "initial sitemap pass must retain the SEO growth repair");
});
