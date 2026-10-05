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


test("consented analytics is scheduled away from first paint", () => {
  const source = read("js/analytics.js");
  assert.match(source, /requestIdleCallback/);
  assert.match(source, /ccgAnalyticsScheduled/);
  assert.match(source, /setTimeout\(start, 1800\)/);
});
