import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const metaCleanup = require("../scripts/cleanup-composer-meta-descriptions.js");

test("removes dangling conjunction left by source-reference cleanup", () => {
  const result = metaCleanup.cleanupMetaDescriptionText(
    "Shahid Ahmad biography covering Jet Set Willy, Chimera, C64 and Amiga work, Sony PlayStation career, aliases and."
  );
  assert.equal(
    result,
    "Shahid Ahmad biography covering Jet Set Willy, Chimera, C64 and Amiga work, Sony PlayStation career and aliases."
  );
});

test("leaves a valid composer meta description unchanged", () => {
  const input = "Rob Hubbard is an English composer and programmer whose Commodore 64 music became a defining sound of 1980s game audio.";
  assert.equal(metaCleanup.cleanupMetaDescriptionText(input), input);
});

test("repairs standard, Open Graph and Twitter descriptions together", () => {
  const html = `<!doctype html>
<meta name="description" content="Russell Lieblich biography, Activision history, C64 credits, aliases and.">
<meta property="og:description" content="Russell Lieblich biography, Activision history, C64 credits, aliases and.">
<meta name="twitter:description" content="Russell Lieblich biography, Activision history, C64 credits, aliases and.">`;
  const result = metaCleanup.cleanupComposerHtml(html);
  assert.equal((result.match(/C64 credits and aliases\./g) || []).length, 3);
  assert.doesNotMatch(result, /aliases and\./i);
});
