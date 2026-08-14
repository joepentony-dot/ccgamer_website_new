import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const presentation = require("../scripts/normalize-composer-presentation.js");

const route = {
  name: "Example Composer",
  slug: "example-composer",
  count: 1,
  c64Count: 0,
  amigaCount: 1
};

test("research-process commentary is removed instead of published", () => {
  const result = presentation.sanitizeBiography(
    "Example Composer wrote music for several games. Reliable biographical sources give his birth year as 1956; a precise public birth date has not been established."
  );
  assert.equal(result.text, "Example Composer wrote music for several games.");
  assert.equal(result.removeBirth, true);
});

test("CCG catalogue wording is rewritten as neutral career copy", () => {
  const result = presentation.sanitizeBiography(
    "Example Composer worked across several platforms. The CCG archive links him to Game One and Game Two."
  );
  assert.doesNotMatch(result.text, /CCG|archive/i);
  assert.match(result.text, /Game credits include Game One and Game Two/);
});

test("composer page presentation removes catalogue counts and platform identity labels", () => {
  const html = `<!doctype html>
<html data-ccg-page="music-composer">
<head>
<title>Example Composer — Amiga Game Music | Cheeky Commodore Gamer</title>
<meta name="description" content="Example Composer biography and source references.">
<meta property="og:title" content="old">
<meta property="og:description" content="old">
<meta name="twitter:title" content="old">
<meta name="twitter:description" content="old">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Person","name":"Example Composer","birthDate":"1956","description":"Example Composer wrote music. Reliable biographical sources give his birth year as 1956; a precise public birth date has not been established."}]}</script>
</head>
<body>
<main class="ccg-composer-page" data-composer-name="Example Composer">
<h1 class="ccg-composer-title">Example Composer — Amiga Music</h1>
<p class="ccg-composer-subtitle">1 linked game credit across Amiga</p>
<p class="ccg-composer-intro">old intro</p>
<div id="composer-content"><article class="ccg-composer-profile"><div>
<h2 class="ccg-composer-profile__title">Example Composer</h2>
<p class="ccg-composer-profile__platform">Amiga</p>
<p class="ccg-composer-profile__facts">1 linked game credit</p>
<p class="ccg-composer-profile__factline"><strong>Born:</strong> 1956</p>
<p class="ccg-composer-profile__bio">Example Composer wrote music. Reliable biographical sources give his birth year as 1956; a precise public birth date has not been established.</p>
</div></article></div>
<h2 class="ccg-composer-section-title">Games featuring Example Composer</h2>
<ul id="composer-games"><li><span class="ccg-composer-game-title">Example Game</span></li></ul>
<script src="/js/music-composer-pages.js" defer></script>
</main>
</body></html>`;

  const result = presentation.normalizeComposerHtml(html, route);
  assert.match(result, /Example Composer — Game Music/);
  assert.match(result, /Example Composer Music/);
  assert.doesNotMatch(result, /ccg-composer-profile__platform/);
  assert.doesNotMatch(result, /ccg-composer-profile__facts/);
  assert.doesNotMatch(result, /ccg-composer-subtitle/);
  assert.doesNotMatch(result, /<strong>Born:<\/strong>/);
  assert.doesNotMatch(result, /precise public birth date/i);
  assert.doesNotMatch(result, /source references/i);
  assert.match(result, /composer-presentation-runtime\.js/);
  assert.doesNotMatch(result, /"birthDate": "1956"/);
});

test("meta descriptions keep useful SEO wording but remove research notes", () => {
  const result = presentation.sanitizeMetaDescription(
    "Shahid Ahmad biography covering Jet Set Willy, Chimera, C64 and Amiga work, Sony PlayStation career, aliases and source references."
  );
  assert.match(result, /Shahid Ahmad/);
  assert.match(result, /Jet Set Willy/);
  assert.doesNotMatch(result, /source references/i);
});
