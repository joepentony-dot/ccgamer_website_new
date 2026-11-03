"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { removeVideoObjectScripts, enhancePage } = require("../scripts/generate-retro-video-seo.js");
const fs = require("node:fs");
const path = require("node:path");

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

test("Pages staging restores retro VideoObject and validates it before sitemap generation", () => {
  const deploy = fs.readFileSync(
    path.join(__dirname, "../.github/workflows/deploy-github-pages-omega-stable.yml"),
    "utf8"
  );
  const start = deploy.indexOf("node scripts/generate-retro-pages.js --root _site");
  const enrich = deploy.indexOf('CCG_REPO_ROOT="$PWD/_site" node scripts/generate-retro-video-seo.js');
  const validate = deploy.indexOf('CCG_REPO_ROOT="$PWD/_site" node scripts/validate-retro-video-seo.js');
  const index = deploy.indexOf("(cd _site && node scripts/generate-sitemaps.js)");
  const removeTools = deploy.indexOf("rm -rf _site/scripts", start);
  assert.ok(start >= 0, "Pages must rebuild authoritative retro watch pages");
  assert.ok(enrich > start, "Rebuild must be followed by VideoObject/sitemap enrichment");
  assert.ok(validate > enrich, "Published retro video markup must be validated");
  assert.ok(index > validate, "Video sitemap must exist before producing the sitemap index");
  assert.ok(removeTools > validate, "The staged validation must run before staging tools are removed");
  assert.equal(
    deploy.split('CCG_REPO_ROOT="$PWD/_site" node scripts/generate-retro-video-seo.js').length - 1,
    1,
    "Do not duplicate enrichment"
  );
});

test("retro video enrichment restores verified JSON-LD after template regeneration without unverified dates", () => {
  const canonicalUrl = "https://www.cheekycommodoregamer.co.uk/amiga-demo-music/state-of-the-art/";
  const entry = {
    title: "State of the Art",
    seo: { description: "Spaceballs released State of the Art in 1992." },
    thumbnail: "https://img.youtube.com/vi/USTUwD_eH2c/hqdefault.jpg"
  };
  const source = [
    '<html lang="en"><head>',
    '<meta name="description" content="Spaceballs" />',
    "<!-- CCG_VIDEO_SCHEMA -->",
    "</head><body></body></html>"
  ].join("\n");
  const context = {
    entry,
    videoId: "USTUwD_eH2c",
    canonicalUrl,
    metadata: { verifiedBy: "youtube-data-api-v3", uploadDate: "2024-01-20", title: "State of the Art" },
    videoIndexable: true
  };
  const restored = enhancePage(source, context);
  const match = restored.match(/<script type="application\/ld\+json" data-ccg-schema="retro-video">\s*([\s\S]*?)<\/script>/);
  assert.ok(match, "Verified YouTube data must produce a VideoObject in regenerated HTML");
  const schema = JSON.parse(match[1]);
  assert.equal(schema["@type"], "VideoObject");
  assert.equal(schema.url, canonicalUrl);
  assert.equal(schema.description, entry.seo.description);
  assert.equal(schema.uploadDate, "2024-01-20");
  assert.equal((restored.match(/"@type": "VideoObject"/g) || []).length, 1);
  const unverified = enhancePage(source, { ...context, metadata: {}, videoIndexable: true });
  assert.doesNotMatch(unverified, /"@type": "VideoObject"/, "Do not invent YouTube upload dates");
  const membersOnly = enhancePage(source, { ...context, videoIndexable: false });
  assert.doesNotMatch(membersOnly, /"@type": "VideoObject"/, "Members-only metadata must not be exposed");
});
