import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const workflowPath = path.join(root, ".github", "workflows", "games-publishing.yml");

test("changed, discovered and pending Lemon sources are resolved before magazine import", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const migrationIndex = workflow.indexOf("node scripts/migrate-speed-king-release.js");
  const changedRefreshIndex = workflow.indexOf("node scripts/refresh-lemon-game-cache.js --base HEAD^ --refresh");
  const discoveryIndex = workflow.indexOf("node scripts/discover-new-lemon-source.js --base HEAD^");
  const missingRefreshIndex = workflow.indexOf("node scripts/refresh-lemon-game-cache.js --all-missing");
  const importIndex = workflow.indexOf("node scripts/import-amiga-magazine-reviews.js");
  const changedRefreshStep = workflow.match(/- name: Refresh changed Lemon reference pages \(best effort\)[\s\S]*?continue-on-error:\s*true[\s\S]*?node scripts\/refresh-lemon-game-cache\.js --base HEAD\^ --refresh/);
  const discoveryStep = workflow.match(/- name: Discover or retry automatic Lemon sources \(best effort\)[\s\S]*?continue-on-error:\s*true[\s\S]*?node scripts\/discover-new-lemon-source\.js --base HEAD\^/);

  assert.ok(migrationIndex >= 0, "Speed King migration is missing");
  assert.ok(changedRefreshIndex >= 0, "new or changed Lemon sources are not force-refreshed");
  assert.ok(discoveryIndex >= 0, "automatic source discovery/retry for games is missing");
  assert.ok(missingRefreshIndex >= 0, "all-missing Lemon retry is missing");
  assert.ok(importIndex >= 0, "magazine importer is missing");
  assert.ok(migrationIndex < changedRefreshIndex, "release/source migrations must run before forced source refresh");
  assert.ok(changedRefreshIndex < discoveryIndex, "explicit changed sources must retain priority over automatic discovery");
  assert.ok(discoveryIndex < missingRefreshIndex, "automatic discovery and pending retries must complete before fallback cache retry");
  assert.ok(missingRefreshIndex < importIndex, "all Lemon refresh attempts must finish before magazine import");
  assert.ok(changedRefreshStep, "changed-source refresh must remain best-effort so an external Lemon outage cannot block publishing");
  assert.ok(discoveryStep, "automatic source discovery and pending retries must remain best-effort so an external Lemon outage cannot block publishing");
  assert.match(workflow, /retrying only previously unresolved games/);
});
