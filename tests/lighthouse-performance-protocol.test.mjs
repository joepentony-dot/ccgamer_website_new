import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");

const protocol = read("docs/LIGHTHOUSE-PERFORMANCE-PROTOCOL.md");
const agents = read("AGENTS.md");
const publisher = read("admin/js/content-publisher.js");
const optimiser = read("admin/js/content-publisher-image-optimizer.js");
const budget = read("scripts/image-performance-budget.py");
const rebuild = read("scripts/rebuild-games.js");
const publishingWorkflow = read(".github/workflows/games-publishing.yml");
const validator = read("scripts/validate-game-performance-contract.mjs");

test("repository continuation rules make the Lighthouse protocol mandatory", () => {
  assert.match(agents, /docs\/LIGHTHOUSE-PERFORMANCE-PROTOCOL\.md/);
  assert.match(agents, /All new website development must preserve or improve the Lighthouse performance contract/);
  assert.match(protocol, /Lighthouse Performance:\s*\*\*90\+/);
  assert.match(protocol, /LCP:\s*\*\*2\.5 s or better/);
  assert.match(protocol, /CLS:\s*\*\*0\.10 or better/);
  assert.match(protocol, /TBT:\s*\*\*200 ms or better/);
  assert.match(protocol, /must not be obtained by stripping the site's established Omega identity/i);
});

test("new game publisher uses the permanent image-performance budget", () => {
  assert.match(optimiser, /const TARGET_BYTES = 350 \* 1024;/);
  assert.match(optimiser, /const HARD_BYTES = 500 \* 1024;/);
  assert.match(optimiser, /const BOX3D_HARD_BYTES = 500 \* 1024;/);
  assert.match(publisher, /NEW_GAME_THUMBNAIL_MAX_BYTES = 500 \* 1024/);
  assert.match(publisher, /New game thumbnails must use WebP/);
  assert.match(budget, /THUMBNAIL_MAX_BYTES = 500 \* 1024/);
  assert.match(budget, /THUMBNAIL_WARN_BYTES = 350 \* 1024/);
});

test("authoritative game publishing cannot bypass the Lighthouse contract", () => {
  assert.match(rebuild, /validate-game-performance-contract\.mjs/);
  assert.match(publishingWorkflow, /validate-game-performance-contract\.mjs --base HEAD\^ --require-generated/);
  assert.match(publishingWorkflow, /scripts\/validate-game-performance-contract\.mjs/);
  assert.match(validator, /video iframe must remain lazy/);
  assert.match(validator, /generated HTML must not eagerly load a video iframe src/);
  assert.match(validator, /video iframe must reserve width and height/);
  assert.match(validator, /hero must retain high fetch priority/);
  assert.match(validator, /new-game thumbnail must be WebP under the Lighthouse protocol/);
});

test("protocol retains presentation while prohibiting common regressions", () => {
  assert.match(protocol, /Do not silently downgrade the experience/);
  assert.match(protocol, /Do not introduce new eager YouTube or other heavy third-party embeds/);
  assert.match(protocol, /Avoid duplicate fetches/);
  assert.match(protocol, /Reserve width\/height or aspect ratio/);
  assert.match(protocol, /Generated output is repaired through its owning generator\/workflow/);
});
