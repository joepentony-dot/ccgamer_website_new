import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const css = fs.readFileSync("resources/css/game-pages.css", "utf8");
const runtime = fs.readFileSync("js/load-single-game.js", "utf8");
const template = fs.readFileSync("games/game.html", "utf8");
const seoRoutes = fs.readFileSync("scripts/prepare-seo-game-routes.js", "utf8");
const slugGenerator = fs.readFileSync("scripts/generate-slug-pages.js", "utf8");

test("single-game layout keeps one compact responsive content frame", () => {
  assert.match(css, /OMEGA SINGLE-GAME PREMIUM COMPACT ARCHIVE/);
  assert.match(css, /max-width:\s*min\(1240px, 94vw\)/);
  assert.match(css, /grid-template-areas:\s*"content content"\s*"media box"/);
  assert.match(css, /\.ccg-game-section-nav__links/);
});

test("single-game runtime builds available-section navigation without replacing the mobile scroll owner", () => {
  assert.match(runtime, /function initGameSectionNav\(state\)/);
  assert.match(runtime, /function buildGameSectionNav\(state\)/);
  assert.match(runtime, /Jump to game page section/);
  assert.match(runtime, /smoothScrollTo\(item\.target\)/);
  assert.doesNotMatch(runtime, /heroThumb\.width\s*=\s*320/);
  assert.doesNotMatch(runtime, /heroThumb\.height\s*=\s*180/);
});

test("canonical game routes reserve the real hero artwork dimensions", () => {
  assert.match(seoRoutes, /function prefillStaticContent\(html, game, title, imagePath, imageMetadata\)/);
  assert.match(seoRoutes, /width="\$\{Number\(imageMetadata\?\.width \|\| 300\)\}"/);
  assert.match(seoRoutes, /height="\$\{Number\(imageMetadata\?\.height \|\| 400\)\}"/);
  assert.match(seoRoutes, /prefillStaticContent\(html, game, title, imagePath, imageMetadata\)/);
});

test("single-game SEO titles include the release year and normalized platform label", () => {
  assert.match(seoRoutes, /const platformLabel = schemaPlatform\(game\) === "Commodore 64" \? "C64" : "Amiga"/);
  assert.match(seoRoutes, /\$\{title\}\$\{year \? ` \(\$\{year\}\)` : ""\} – \$\{platformLabel\} \| Review, Screens & History/);
  assert.match(slugGenerator, /\$\{title\}\$\{year \? ` \(\$\{year\}\)` : ""\} – \$\{normalizePlatformShort\(game\)\} \| Review, Screens & History/);
});

test("single-game template preconnects font origins and uses a cover-shaped fallback ratio", () => {
  assert.match(template, /rel="preconnect" href="https:\/\/fonts\.googleapis\.com"/);
  assert.match(template, /rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin/);
  assert.match(template, /id="gameHeroThumb"[\s\S]*width="300" height="400"/);
});
