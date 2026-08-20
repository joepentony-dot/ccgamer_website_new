import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const seo = require("../scripts/apply-seo-opportunity-plan.js");
const plan = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "seo-opportunity-targets.json"), "utf8")
);

test("opportunity plan represents all 72 exported non-legacy opportunities without metrics", () => {
  assert.equal(plan.targets.length, 72);
  assert.deepEqual(seo.validatePlan(plan), []);

  const serialized = JSON.stringify(plan).toLowerCase();
  for (const forbidden of ['"clicks"', '"impressions"', '"position"', '"ctr"', '"estimatedextraclicks"']) {
    assert.equal(serialized.includes(forbidden), false, `plan must not store ${forbidden}`);
  }
});

test("legacy composer handlers map to canonical composer pages and are not strengthened in place", () => {
  const legacy = plan.targets.filter((target) => target.observedRoute.includes("/music/composer.html?"));
  assert.equal(legacy.length, 4);
  for (const target of legacy) {
    assert.ok(target.canonicalTarget?.startsWith("/music/"));
    assert.ok(target.canonicalTarget?.endsWith("/"));
    assert.ok(target.actions.includes("retireLegacy"));
    assert.equal(target.seoTitle, undefined);
    assert.equal(target.seoDescription, undefined);
  }
});

test("protected root growth signal cannot rewrite index.html", () => {
  const root = plan.targets.find((target) => target.observedRoute === "/");
  assert.ok(root);
  assert.equal(root.protected, true);
  assert.equal(seo.routeToFile("/tmp/example", "/"), null);
  assert.equal(root.seoTitle, undefined);
});

test("high intent pages receive focused titles and synchronized social descriptions", () => {
  const target = plan.targets.find((item) => item.observedRoute === "/games/the-last-v8/");
  const html = `<!doctype html><html><head>
<title>Old title</title>
<meta name="description" content="The Last V8 (1985) from Mastertronic — A post-apocalyptic driving game with screenshots and game information.">
<meta property="og:title" content="Old title">
<meta property="og:description" content="Old description">
<meta name="twitter:title" content="Old title">
<meta name="twitter:description" content="Old description">
</head><body></body></html>`;

  const updated = seo.applyMetadata(html, target);
  assert.match(updated, /<title>The Last V8 C64 – Review, Manual &amp; Gameplay \| CCG<\/title>/);
  assert.match(updated, /property="og:title" content="The Last V8 C64 – Review, Manual &amp; Gameplay \| CCG"/);
  assert.match(updated, /name="twitter:title" content="The Last V8 C64 – Review, Manual &amp; Gameplay \| CCG"/);
  assert.match(updated, /The Last V8 on Commodore 64 — review, screenshots, manual and gameplay video\./);
});

test("growth-only routes score below intervention routes so successful intent is preserved", () => {
  const growth = plan.targets.find((item) => item.observedRoute === "/games/laser-squad/");
  const ctr = plan.targets.find((item) => item.observedRoute === "/games/the-last-v8/");
  const decline = plan.targets.find((item) => item.observedRoute === "/games/dynablaster/");

  assert.ok(seo.scoreTarget(ctr) > seo.scoreTarget(decline));
  assert.ok(seo.scoreTarget(decline) > seo.scoreTarget(growth));
  assert.equal(growth.seoTitle, undefined);
});

test("static emulation and quiz routes use restrained query-aligned snippets", () => {
  const emulation = plan.targets.find((item) => item.observedRoute === "/emulation.html");
  const quiz = plan.targets.find((item) => item.observedRoute === "/quiz/quiz.html");

  assert.match(emulation.seoTitle, /Commodore 64 Emulator/);
  assert.match(emulation.seoDescription, /play Commodore 64 and Amiga games/i);
  assert.match(quiz.seoTitle, /Commodore 64 Quiz/);
  assert.match(quiz.seoDescription, /C64 quiz packs/i);
});

test("opportunity application preserves the established genre fallback ordering contract", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "scripts", "apply-seo-opportunity-plan.js"),
    "utf8"
  );

  assert.match(source, /Genre fallback ordering preserved by existing publishing contract/);
  assert.doesNotMatch(
    source,
    /const genreResult = scope === "all"\s*\?\s*prioritizeGenreFallbacks/
  );
});
