import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("js/load-single-game.js", "utf8");

function fetchGamesLibraryBlock() {
  const start = source.indexOf("async function fetchGamesLibrary()");
  const end = source.indexOf("\nfunction resolveGameDescriptionEnrichmentUrls", start);
  assert.notEqual(start, -1, "fetchGamesLibrary must exist");
  assert.notEqual(end, -1, "fetchGamesLibrary boundary must remain discoverable");
  return source.slice(start, end);
}

test("single-game library starts description enrichments before the games.json request loop", () => {
  const block = fetchGamesLibraryBlock();
  const enrichmentStart = block.indexOf("const enrichmentsPromise = fetchGameDescriptionEnrichments();");
  const requestLoop = block.indexOf("for (const url of urls)");
  assert.ok(enrichmentStart >= 0, "enrichment promise must be started once");
  assert.ok(requestLoop >= 0, "games.json fallback request loop must remain present");
  assert.ok(enrichmentStart < requestLoop, "enrichment request must start before games.json fallback fetching begins");
});

test("single-game library still waits for enrichment before merging and returning games", () => {
  const block = fetchGamesLibraryBlock();
  const payloadParse = block.indexOf("const payload = await response.json();");
  const enrichmentJoin = block.indexOf("const enrichments = await enrichmentsPromise;");
  const merge = block.indexOf("mergeGameDescriptionEnrichment(game, enrichments)");
  assert.ok(payloadParse >= 0 && enrichmentJoin > payloadParse, "enrichment join must remain after a successful games.json parse");
  assert.ok(merge > enrichmentJoin, "enriched descriptions must still be merged before return");
  assert.doesNotMatch(block, /const enrichments = await fetchGameDescriptionEnrichments\(\);/, "do not restore sequential enrichment fetching");
});

function fetchDescriptionEnrichmentBlock() {
  const start = source.indexOf("async function fetchGameDescriptionEnrichments()");
  const end = source.indexOf("\nfunction mergeGameDescriptionEnrichment", start);
  assert.notEqual(start, -1, "fetchGameDescriptionEnrichments must exist");
  assert.notEqual(end, -1, "description enrichment boundary must remain discoverable");
  return source.slice(start, end);
}

test("description enrichments revalidate instead of forcing a full no-store transfer", () => {
  const block = fetchDescriptionEnrichmentBlock();
  assert.match(block, /fetch\(url, \{ cache: "no-cache" \}\)/, "enrichment fetch must permit validated browser reuse");
  assert.doesNotMatch(block, /cache: "no-store"/, "enrichment fetch must not force a full fresh transfer on every game navigation");
});
