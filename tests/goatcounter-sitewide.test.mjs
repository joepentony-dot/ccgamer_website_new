import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import goatcounter from "../scripts/ensure-goatcounter-coverage.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts/ensure-goatcounter-coverage.js");
const endpoint = "https://cheekycommodoregamer.goatcounter.com/count";
const source = "https://gc.zgo.at/count.js";

function page(body = "Hello") {
  return '<!doctype html><html><head><title>Test</title></head><body>' +
    body + "</body></html>";
}

function runScript(dir, check = false) {
  return spawnSync(process.execPath, [
    script, "--root", dir, ...(check ? ["--check"] : [])
  ], { encoding: "utf8" });
}

test("adds tracking to untracked root, game, music and admin pages, with route-only paths", (t) => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-goatcounter-"));
  t.after(() => fs.rmSync(site, { recursive: true, force: true }));
  const routes = ["index.html", "games/chuckie-egg/index.html",
    "games/index.html", "music/index.html", "admin/content-publisher.html"];
  for (const route of routes) {
    const file = path.join(site, route);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, page(route));
  }
  const first = runScript(site);
  assert.equal(first.status, 0, first.stderr);
  for (const route of routes) {
    const html = fs.readFileSync(path.join(site, route), "utf8");
    assert.equal((html.match(/data-goatcounter=/g) || []).length, 1, route);
    assert.ok(html.includes(endpoint), route);
    assert.ok(html.includes(source), route);
    const canonical = goatcounter.publicPath(site, path.join(site, route));
    assert.ok(html.includes(JSON.stringify({ path: canonical })), route);
    assert.equal((html.match(/src="\/js\/ccg-visitor-metrics\.js"/g) || []).length, 1, route);
  }
  assert.equal(runScript(site, true).status, 0);
  assert.equal(runScript(site).status, 0, "idempotent second application");
});

test("preserves existing approved tracker instead of adding a duplicate", () => {
  const existing = '<script\n data-goatcounter="' + endpoint +
    '"\n async src="' + source + '"></script>';
  const html = page("Main" + existing);
  const result = goatcounter.evaluateHtml(html, "/home.html");
  assert.equal(result.status, "present");
  assert.equal(result.html, html);
});

test("removes duplicate approved script tags but no other scripts", () => {
  const existing = '<script data-goatcounter="' + endpoint +
    '" async src="' + source + '"></script>';
  const html = page('<script src="/js/ccg-global.js"></script>' + existing + existing);
  const result = goatcounter.evaluateHtml(html, "/home.html");
  assert.equal(result.status, "deduplicated");
  assert.equal((result.html.match(/data-goatcounter=/g) || []).length, 1);
  assert.ok(result.html.includes("/js/ccg-global.js"));
  assert.equal(goatcounter.evaluateHtml(result.html, "/home.html").status, "present");
});

test("rejects unrecognised GoatCounter endpoints rather than silently overwriting them", () => {
  const html = page('<script data-goatcounter="https://wrong.example/count" async src="' +
    source + '"></script>');
  assert.throws(() => goatcounter.evaluateHtml(html, "/home.html"), /Unexpected GoatCounter/);
});

test("can stage scripts in head-only HTML and ignores HTML fragments", () => {
  const html = '<html><head><title>Small</title></head></html>';
  const result = goatcounter.evaluateHtml(html, "/small.html");
  assert.equal(result.status, "added");
  assert.ok(result.html.indexOf(source) < result.html.indexOf("</head>"));
  assert.equal(goatcounter.evaluateHtml("<p>fragment</p>", "/frag.html").status, "fragment");
});

test("check mode fails closed when a generated public page has no tracker", (t) => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-goatcounter-"));
  t.after(() => fs.rmSync(site, { recursive: true, force: true }));
  fs.writeFileSync(path.join(site, "home.html"), page());
  const result = runScript(site, true);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing\/duplicate tracking/);
  assert.equal(fs.readFileSync(path.join(site, "home.html"), "utf8"), page());
});

test("admin game publication and GitHub Pages deployment enforce GoatCounter", () => {
  const template = fs.readFileSync(path.join(root, "games/game.html"), "utf8");
  const deploy = fs.readFileSync(path.join(root,
    ".github/workflows/deploy-github-pages-omega-stable.yml"), "utf8");
  const publishing = fs.readFileSync(path.join(root,
    ".github/workflows/games-publishing.yml"), "utf8");
  assert.ok(template.includes(endpoint), "new game template retains tracker");
  assert.ok(template.includes(source), "new game template retains count.js");
  assert.match(deploy, /ensure-goatcounter-coverage\.js --root _site/);
  assert.match(deploy, /ensure-goatcounter-coverage\.js --root _site --check/);
  assert.match(publishing, /tests\/goatcounter-sitewide\.test\.mjs/);
});


test("sitewide metrics runtime is injected once and never alters page SEO", () => {
  const body = '<title>Test</title><link rel="canonical" href="https://www.cheekycommodoregamer.co.uk/games/chuckie-egg/">';
  const html = '<!doctype html><html><head>' + body + '</head><body><main>Review</main></body></html>';
  const once = goatcounter.ensureMetricsRuntime(html, "/games/chuckie-egg/");
  assert.equal((once.match(/src="\/js\/ccg-visitor-metrics\.js"/g) || []).length, 1);
  assert.equal(goatcounter.ensureMetricsRuntime(once, "/games/chuckie-egg/"), once);
  assert.ok(once.includes(body));
  assert.ok(once.includes("<main>Review</main>"));
});

test("public counter runtime counts one shared session event and each canonical game separately", () => {
  const runtime = fs.readFileSync(path.join(root, "js/ccg-visitor-metrics.js"), "utf8");
  const global = fs.readFileSync(path.join(root, "js/ccg-global.js"), "utf8");
  const home = fs.readFileSync(path.join(root, "home.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "resources/css/game-pages.css"), "utf8");

  assert.match(runtime, /SESSION_EVENT\s*=\s*"ccg-archive-session"/);
  assert.match(runtime, /event:\s*true/);
  assert.doesNotMatch(runtime, /no_session:\s*true|localStorage|sessionStorage|Bearer|api\/v0/);
  assert.match(runtime, /document\.documentElement\.getAttribute\("data-ccg-page"\) !== "single-game"/);
  assert.match(runtime, /result\.count/);
  assert.match(runtime, /encodeURIComponent\(path\)\s*\+\s*"\.json"/);
  assert.match(runtime, /fetchPublicCount\(SESSION_EVENT,\s*homeCount\)/);
  assert.match(runtime, /fetchPublicCount\(path,\s*count\)/);
  assert.doesNotMatch(global, /GOATCOUNTER_API_TOKEN|api\/v0\/stats\/total|Authorization:/);
  assert.match(home, /id="ccg-visit-count"/);
  assert.match(runtime, /homeLabel\.textContent = "Archive visits"/);
  assert.match(css, /\.ccg-page--single-game \.ccg-game-views/);
});
