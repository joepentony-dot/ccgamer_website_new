import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");
}

test("mobile scripted navigation starts in its settled drawer layout", () => {
  const css = read("resources/css/ccg-master.css");

  assert.match(css, /FIRST-FRAME MOBILE NAV STABILITY/);
  assert.match(
    css,
    /\.ccg-nav:not\(\.ccg-nav--hydrated\) \.ccg-nav__bar,[\s\S]*?display:\s*none;/
  );
  assert.match(css, /@media \(scripting: none\)[\s\S]*?display:\s*flex;/);
});

test("core generated page templates avoid late webfont swaps", () => {
  const files = [
    "templates/base-omega.html",
    "templates/game-template.html",
    "games/index.html",
    "games/collections/index.html",
    "games/collections/retro-events.html",
    "games/summer-games/index.html"
  ];

  for (const path of files) {
    const source = read(path);
    assert.doesNotMatch(source, /fonts\.googleapis\.com[^"'\n]*display=swap/, path);
    if (source.includes("fonts.googleapis.com")) {
      assert.match(source, /display=optional/, path);
    }
  }

  assert.match(read("resources/css/ccg-master.css"), /display=optional/);
});

test("consented analytics is scheduled away from first paint", () => {
  const source = read("js/analytics.js");
  assert.match(source, /requestIdleCallback/);
  assert.match(source, /ccgAnalyticsScheduled/);
  assert.match(source, /setTimeout\(start, 1800\)/);
});
