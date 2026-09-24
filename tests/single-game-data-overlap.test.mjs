import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("js/load-single-game.js", "utf8");

function fetchGamesLibraryBlock() {
  const start = source.indexOf("async function fetchGamesLibrary(options = {})");
  const end = source.indexOf("\nfunction resolveGameDescriptionEnrichmentUrls", start);
  assert.notEqual(start, -1, "fetchGamesLibrary must exist");
  assert.notEqual(end, -1, "fetchGamesLibrary boundary must remain discoverable");
  return source.slice(start, end);
}

function hydrateSingleGameBlock() {
  const start = source.indexOf("async function hydrateSingleGamePage()");
  const end = source.indexOf("\nfunction queueSingleGameHydration", start);
  assert.notEqual(start, -1, "hydrateSingleGamePage must exist");
  assert.notEqual(end, -1, "hydrateSingleGamePage boundary must remain discoverable");
  return source.slice(start, end);
}

test("canonical generated pages are recognised as prefilled", () => {
  assert.match(
    source,
    /function isPreloadedSingleGame\(\) \{\s*return hasPrefilledSingleGameContent\(\);\s*\}/,
    "canonical prefilled pages must not be forced through the non-prefilled path"
  );
});

test("canonical prefilled pages skip duplicate description enrichment downloads", () => {
  const hydrate = hydrateSingleGameBlock();
  assert.match(hydrate, /const preloaded = isPreloadedSingleGame\(\);/);
  assert.match(
    hydrate,
    /fetchGamesLibrary\(\{\s*includeDescriptionEnrichments: !preloaded,\s*cacheMode: preloaded \? "no-cache" : "no-store"\s*\}\)/,
    "prefilled canonical pages must skip enrichment and allow validated game-library reuse"
  );

  const block = fetchGamesLibraryBlock();
  const enrichmentOption = block.indexOf("const includeDescriptionEnrichments = options.includeDescriptionEnrichments !== false;");
  const enrichmentStart = block.indexOf("const enrichmentsPromise = includeDescriptionEnrichments");
  const requestLoop = block.indexOf("for (const url of urls)");
  assert.ok(enrichmentOption >= 0, "enrichment option must remain explicit");
  assert.ok(enrichmentStart > enrichmentOption, "conditional enrichment promise must be created after option resolution");
  assert.ok(requestLoop > enrichmentStart, "when needed, enrichment must still begin before games.json fallback fetching");
  assert.match(block, /: Promise\.resolve\(\{\}\);/, "skipped enrichment must resolve without a network request");
});

test("dynamic single-game routes still merge enrichment before returning games", () => {
  const block = fetchGamesLibraryBlock();
  const payloadParse = block.indexOf("const payload = await response.json();");
  const enrichmentJoin = block.indexOf("const enrichments = await enrichmentsPromise;");
  const merge = block.indexOf("mergeGameDescriptionEnrichment(game, enrichments)");
  assert.ok(payloadParse >= 0 && enrichmentJoin > payloadParse, "enrichment join must remain after a successful games.json parse");
  assert.ok(merge > enrichmentJoin, "runtime enrichments must still be merged when enabled");
  assert.doesNotMatch(block, /const enrichments = await fetchGameDescriptionEnrichments\(\);/, "do not restore sequential enrichment fetching");
});

test("canonical routes can revalidate the library while dynamic routes stay forced-fresh", () => {
  const block = fetchGamesLibraryBlock();
  assert.match(
    block,
    /const cacheMode = options\.cacheMode === "no-cache" \? "no-cache" : "no-store";/,
    "dynamic routes must retain no-store unless canonical hydration explicitly enables revalidation"
  );
  assert.match(block, /fetch\(url, \{ cache: cacheMode \}\)/, "games.json fetch must use the route-specific cache policy");
});

function fetchDescriptionEnrichmentBlock() {
  const start = source.indexOf("async function fetchGameDescriptionEnrichments()");
  const end = source.indexOf("\nfunction mergeGameDescriptionEnrichment", start);
  assert.notEqual(start, -1, "fetchGameDescriptionEnrichments must exist");
  assert.notEqual(end, -1, "description enrichment boundary must remain discoverable");
  return source.slice(start, end);
}

test("description enrichments revalidate when runtime enrichment is required", () => {
  const block = fetchDescriptionEnrichmentBlock();
  assert.match(block, /fetch\(url, \{ cache: "no-cache" \}\)/, "enrichment fetch must permit validated browser reuse");
  assert.doesNotMatch(block, /cache: "no-store"/, "enrichment fetch must not force a full fresh transfer");
});

test("prefilled editorial video copy is preserved during canonical hydration", () => {
  assert.match(
    source,
    /const prefilledVideoDescription = preloaded && videoDescription\.textContent\.trim\(\);/
  );
  assert.match(
    source,
    /if \(!prefilledVideoDescription\) \{[\s\S]*?_ccgEnrichedDescription[\s\S]*?\}/,
    "runtime data must not overwrite generated editorial video copy"
  );
});


test("prefilled canonical routes preserve generated SEO metadata and schema", () => {
  const renderStart = source.indexOf("function renderGame(game)");
  const renderEnd = source.indexOf("\nfunction slugifyBrowseToken", renderStart);
  assert.notEqual(renderStart, -1, "renderGame must exist");
  assert.notEqual(renderEnd, -1, "renderGame boundary must remain discoverable");
  const render = source.slice(renderStart, renderEnd);

  assert.match(
    render,
    /if \(!preloaded\) \{\s*updateMeta\(game\);[\s\S]*?ccgSchemaGame[\s\S]*?ccgSchemaBreadcrumb[\s\S]*?\}/,
    "runtime metadata/schema rewriting must be limited to the non-prefilled fallback route"
  );
});
