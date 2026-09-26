import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const home = fs.readFileSync("home.html", "utf8");

test("Home keeps footer CSS off the render-blocking path", () => {
  assert.match(
    home,
    /rel="preload" href="resources\/css\/ccg-footer\.css" as="style" onload="this\.onload=null;this\.rel='stylesheet'"/
  );
  assert.match(
    home,
    /<noscript><link rel="stylesheet" href="resources\/css\/ccg-footer\.css" \/><\/noscript>/
  );
  assert.doesNotMatch(
    home,
    /^\s*<link rel="stylesheet" href="resources\/css\/ccg-footer\.css" \/>\s*$/m
  );
});
