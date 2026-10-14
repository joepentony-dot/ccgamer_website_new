"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { removeVideoObjectScripts } = require("../scripts/generate-retro-video-seo.js");

test("removes indented VideoObject plus its newline without whitespace-only residue", () => {
  const markup = [
    "<head>",
    '    <script type="application/ld+json" data-ccg-schema="retro-video">',
    '{"@context":"https://schema.org","@type":"VideoObject"}',
    "    </script>",
    '    <meta name="description" content="A retro feature" />',
    "</head>"
  ].join("\n");
  const result = removeVideoObjectScripts(markup);
  assert.doesNotMatch(result, /"VideoObject"/);
  assert.doesNotMatch(result, /^[ \t]+$/m, "No orphan indentation-only lines");
  assert.match(result, /^    <meta name="description"/m);
  assert.equal(removeVideoObjectScripts(result), result, "A second generation pass is idempotent");
});

test("retains ordinary BreadcrumbList JSON-LD including its exact whitespace", () => {
  const markup = [
    "<head>",
    '    <script type="application/ld+json">',
    '{"@context":"https://schema.org","@type":"BreadcrumbList"}',
    "    </script>",
    "</head>"
  ].join("\n");
  assert.equal(removeVideoObjectScripts(markup), markup);
});

test("removes inline legacy VideoObject without deleting adjacent tags", () => {
  const markup = '<meta name="one"><script type="application/ld+json">{"@type":"VideoObject"}</script><meta name="two">';
  assert.equal(removeVideoObjectScripts(markup), '<meta name="one"><meta name="two">');
});
