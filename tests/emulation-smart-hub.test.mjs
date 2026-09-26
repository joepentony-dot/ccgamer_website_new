import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync("emulation.html", "utf8");
const css = fs.readFileSync("resources/css/emulation.css", "utf8");
const hub = fs.readFileSync("js/emulation-hub.js", "utf8");
const community = fs.readFileSync("js/emulation-community.js", "utf8");
const serviceWorker = fs.readFileSync("service-worker.js", "utf8");

test("emulation hub exposes all five requested tutorial destinations without embeds", () => {
  for (const id of ["jROUvc5eyF8", "pbTsA7whRig", "SvcnVgpYuFA", "ZNvkngqtNpQ", "HYK4gCWkJds"]) {
    assert.match(html, new RegExp("youtube\\.com/watch\\?v=" + id));
  }
  assert.doesNotMatch(html, /<iframe/i);
  assert.doesNotMatch(html, /youtube\.com\/embed/i);
  assert.match(html, /Cheeky Commodore Gamer sent me!/);
  assert.match(html, /JustJamie1983/);
});

test("smart picker provides recognisable emulator choices and route actions", () => {
  assert.match(html, /id="smart-picker"/);
  for (const key of ["vice", "ccs64", "fsuae", "winuae", "amiberry"]) {
    assert.match(html, new RegExp('data-emu-recommend="' + key + '"'));
    assert.match(hub, new RegExp(key + ":"));
  }
  for (const icon of ["🕹️", "💾", "🖥️", "🪟", "🍓"]) {
    assert.ok(html.includes(icon), "missing visual icon " + icon);
  }
  assert.match(hub, /REFERRAL_LINE = "Cheeky Commodore Gamer sent me!"/);
});

test("emulation community reuses the existing authenticated comments model", () => {
  assert.match(html, /id="ccg-emulation-community"/);
  assert.match(html, /js\/emulation-community\.js/);
  assert.match(community, /PAGE_KEY = "emulation-guide"/);
  assert.match(community, /PAGE_TYPE = "emulation"/);
  assert.match(community, /from\("comments"\)/);
  assert.match(community, /from\("profiles"\)/);
  assert.match(community, /permissions\.canComment/);
});

test("support action remains small and page-owned", () => {
  assert.match(html, /hosted_button_id=LGG86ZV9P4YKL/);
  assert.match(html, /emu-support-button/);
  assert.match(css, /\.emu-support-button[\s\S]*width:\s*fit-content/);
});

test("smart hub public code ships in a fresh cache namespace", () => {
  assert.match(serviceWorker, /CODE_CACHE_VERSION = "20\d{2}-\d{2}-\d{2}-public-code-v[0-9]+"/);
});
