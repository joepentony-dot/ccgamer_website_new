#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const failures = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireText(source, token, label) {
  if (!source.includes(token)) failures.push(`${label} is missing: ${token}`);
}

function rejectText(source, token, label) {
  if (source.includes(token)) failures.push(`${label} must not contain: ${token}`);
}

const collectionCss = read("resources/css/retro-events.css");
const detailCss = read("resources/css/retro-video-pages.css");
const template = read("admin/templates/retro-video-template.html");
const generator = read("scripts/generate-retro-pages.js");
const rebuildWorkflow = read(".github/workflows/rebuild-retro-on-data-change.yml");
const deployWorkflow = read(".github/workflows/deploy-github-pages-omega-stable.yml");
const quizCss = read("resources/css/quiz-experience.css");
const quizUx = read("resources/js/quiz-ui-fixes.js");
const loaders = {
  "Retro Specials": read("js/retro-specials-loader.js"),
  "Retro Events": read("js/retro-events-loader.js"),
  "Amiga Demo Music": read("js/amiga-demo-music-loader.js")
};

[
  'data-collection="Retro Specials"',
  'data-collection="Retro Events"',
  'data-collection="Amiga Demo Music"',
  "aspect-ratio: 16 / 9",
  ".ccg-collection-skeleton",
  "grid-template-columns: repeat(3",
  ".ccg-game-card__btn::after"
].forEach((token) => requireText(collectionCss, token, "Shared retro collection styling"));

for (const [label, source] of Object.entries(loaders)) {
  requireText(source, "ccgBuildCollectionSkeletons", `${label} loader`);
  requireText(source, "aria-busy", `${label} loader`);
  requireText(source, "cache: 'default'", `${label} loader`);
  requireText(source, "ccg-card ccg-game-card", `${label} card contract`);
  requireText(source, 'width="480" height="270"', `${label} 16:9 thumbnail contract`);
  rejectText(source, "cache: 'no-store'", `${label} collection data fetch`);
}

[
  'class="ccg-header"',
  'class="ccg-mode-toggle"',
  "retro-video-page__breadcrumbs",
  "retro-video-page__hero-media",
  "retro-video-page__watch",
  "retro-video-page__description-block",
  "{{RELATED_ITEMS}}",
  "/js/ccg-nav-core.js",
  "/js/ccg-mode-engine.js"
].forEach((token) => requireText(template, token, "Retro video template"));

[
  ".retro-video-page__hero",
  "grid-template-columns: minmax(0, 1.16fr)",
  ".retro-video-page__hero-media",
  ".retro-video-page__watch",
  ".retro-video-page__related-media",
  "grid-template-columns: repeat(4",
  "@media (max-width: 780px)"
].forEach((token) => requireText(detailCss, token, "Retro detail styling"));

[
  "resolveRootArgument",
  "process.argv.indexOf('--root')",
  "Retro output root does not exist",
  "Retro video template is missing from target root",
  "resolveThumbnail",
  "retro-video-page__related-media",
  "generated HTML missing the shared site header",
  "generated HTML missing the visual feature hero",
  "generated HTML missing the dedicated watch panel"
].forEach((token) => requireText(generator, token, "Retro page generator"));

[
  "node scripts/generate-retro-pages.js",
  "node scripts/generate-sitemaps.js",
  "node scripts/validate-sitemaps.js",
  "admin/templates/retro-video-template.html",
  "resources/css/retro-video-pages.css",
  "git push origin HEAD:main",
  "Verify generated commit reached main"
].forEach((token) => requireText(rebuildWorkflow, token, "Retro rebuild workflow"));
rejectText(rebuildWorkflow, "node scripts/rebuild-games.js", "Retro rebuild workflow");
rejectText(rebuildWorkflow, 'git push || echo "No generated retro changes to push"', "Retro rebuild workflow");

[
  "node scripts/generate-retro-pages.js --root _site",
  "Build and validate canonical game, retro, genre and sitemap SEO",
  "_site/amiga-demo-music/red-sector-folow-me/index.html",
  "_site/retro-specials/50-essential-amiga-games/index.html",
  "retro-video-page__hero-media",
  "retro-video-page__watch",
  "retro-video-page__related-media",
  "_site/resources/css/quiz-experience.css",
  "retro_targets=(",
  "retro_assets_ok",
  "quiz_ok"
].forEach((token) => requireText(deployWorkflow, token, "Pages retro deployment contract"));

[
  ".quiz-ux-flow",
  ".quiz-pack-btn__name",
  ".quiz-pack-btn__meta",
  ".quiz-pack-btn__desc",
  "--quiz-progress",
  ".quiz-answer-btn:nth-child(1)::before",
  ".quiz-answer-btn:nth-child(4)::before",
  "grid-template-columns: repeat(2"
].forEach((token) => requireText(quizCss, token, "Quiz experience styling"));

[
  "/resources/css/quiz-experience.css",
  "ensureFlowIndicator",
  "registerPacks",
  "decoratePackButtons",
  "Choose a Pack First",
  "Start ${name}",
  "updateQuestionProgress",
  "--quiz-progress",
  "wrapQuizDataLoaders",
  "wrapQuizTracking",
  "init();"
].forEach((token) => requireText(quizUx, token, "Quiz experience controller"));

if (failures.length) {
  console.error("Retro collection and quiz experience audit failed:");
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}

console.log("Retro collection and quiz experience audit passed.");
console.log("- Three editorial collections share one responsive card and hero system");
console.log("- Collection loaders provide immediate skeleton feedback and cached JSON reads");
console.log("- Generated retro detail pages include full site navigation, visual hero, watch and related panels");
console.log("- Retro generator supports isolated deployment roots without changing canonical URLs");
console.log("- Repository rebuild workflow regenerates detail pages and verifies its main-branch push");
console.log("- Pages staging regenerates and verifies retro detail pages before upload and after deployment");
console.log("- Quiz guidance exposes Choose → Start → Play, richer pack cards and question progress");
