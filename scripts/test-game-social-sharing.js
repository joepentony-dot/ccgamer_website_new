#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
    buildCanonicalHtml,
    getImageMetadata
} = require("./generate-slug-pages");
const { buildCanonicalPage } = require("./prepare-seo-game-routes");

const canonicalUrl = "https://www.cheekycommodoregamer.co.uk/games/entombed/";
const ogImage = "https://www.cheekycommodoregamer.co.uk/resources/images/thumbnails/all/entombed.jpg";
const original = `<!DOCTYPE html>
<html lang="en">
<head>
<title>Entombed – C64 | Review, Screens &amp; History</title>
<meta property="og:title" content="Old title">
<meta property="og:image" content="${ogImage}">
<script type="application/ld+json" data-ccg-schema="game-graph">{}</script>
</head>
<body><main id="protected-visible-page"><h1>Entombed</h1></main></body>
</html>`;

const args = {
    slug: "entombed",
    game: {
        id: "entombed",
        title: "Entombed",
        year: 1985,
        system: "C64",
        thumbnail: "entombed.jpg",
        publisher: "Ultimate",
        genres: ["action-adventure"]
    },
    title: "Entombed",
    schemaDescription: "Entombed is a Commodore 64 action-adventure game.",
    canonicalUrl,
    ogImage,
    platformLong: "Commodore 64",
    imageMetadata: {
        mimeType: "image/jpeg",
        width: 460,
        height: 215
    },
    existingHtml: original
};

const updated = buildCanonicalHtml(args);
const originalBody = original.match(/<body>[\s\S]*<\/body>/)[0];
const updatedBody = updated.match(/<body>[\s\S]*<\/body>/)[0];

assert.strictEqual(updatedBody, originalBody, "Visible page HTML must remain byte-for-byte unchanged");
assert.match(updated, /property="og:image:type" content="image\/jpeg"/);
assert.match(updated, /property="og:image:width" content="460"/);
assert.match(updated, /property="og:image:height" content="215"/);
assert.match(updated, /property="og:image:secure_url"/);
assert.match(updated, /property="og:image:alt"/);
assert.match(updated, /name="twitter:image:alt"/);
assert.match(updated, /name="twitter:card" content="summary_large_image"/);
assert.strictEqual((updated.match(/property="og:image"/g) || []).length, 1, "og:image must not be duplicated");

const repeated = buildCanonicalHtml({ ...args, existingHtml: updated });
assert.strictEqual(repeated, updated, "Metadata generation must be deterministic");

const gameShell = fs.readFileSync(path.join(__dirname, "..", "games", "game.html"), "utf8");
const finalPage = buildCanonicalPage(gameShell, args.game);
assert.ok(finalPage.includes('property="og:image:type" content="image/jpeg"'));
assert.match(finalPage, /property="og:image:width" content="460"/);
assert.match(finalPage, /property="og:image:height" content="215"/);
assert.match(finalPage, /property="og:image:secure_url"/);
assert.match(finalPage, /property="og:image:alt"/);
assert.match(finalPage, /name="twitter:image:alt"/);
assert.strictEqual(
    (finalPage.match(/property="og:image"/g) || []).length,
    1,
    "The authoritative route builder must emit one og:image"
);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-social-meta-"));
const pngPath = path.join(tempDir, "test.png");
const png = Buffer.alloc(24);
png.write("\x89PNG\r\n\x1a\n", 0, "binary");
png.writeUInt32BE(1200, 16);
png.writeUInt32BE(630, 20);
fs.writeFileSync(pngPath, png);
assert.deepStrictEqual(getImageMetadata(pngPath), {
    mimeType: "image/png",
    width: 1200,
    height: 630
});
const misnamedPngPath = path.join(tempDir, "legacy-thumbnail.jpg");
fs.writeFileSync(misnamedPngPath, png);
assert.deepStrictEqual(getImageMetadata(misnamedPngPath), {
    mimeType: "image/jpeg",
    width: 1200,
    height: 630
}, "Legacy thumbnails with mismatched bytes must remain publishable");
fs.rmSync(tempDir, { recursive: true, force: true });

const shareScript = fs.readFileSync(path.join(__dirname, "..", "resources", "js", "ccg-share.js"), "utf8");
for (const required of [
    "emailSubject",
    "whatsappText",
    "xText",
    "#Commodore64 #C64",
    "#Amiga #RetroGaming",
    "twitter.com/intent/tweet",
    "facebook.com/sharer/sharer.php",
    "setFallbackOpen"
]) {
    assert.ok(shareScript.includes(required), `Sharing script is missing ${required}`);
}

console.log("Game social-sharing regression checks passed.");
