#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    problems.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, expected, message) {
  if (!source.includes(expected)) problems.push(message);
}

function requirePattern(source, pattern, message) {
  if (!pattern.test(source)) problems.push(message);
}

function forbidText(source, forbidden, message) {
  if (source.includes(forbidden)) problems.push(message);
}

function requireManualValidationOnly(relativePath, description) {
  const source = read(relativePath);
  requireText(source, "workflow_dispatch:", `${description} is missing its manual recovery trigger.`);
  requirePattern(source, /permissions:\s*\n\s*contents:\s*read\b/, `${description} still has write permissions.`);
  if (/^\s{2}push:\s*$/m.test(source)) {
    problems.push(`${description} still has an automatic push trigger.`);
  }
  if (/\bgit\s+push\b|\bgh\s+pr\s+(?:create|merge)\b/.test(source)) {
    problems.push(`${description} can still publish generated output.`);
  }
}

const gamesPublishing = read(".github/workflows/games-publishing.yml");
requireText(gamesPublishing, '"games/games.json"', "Reliable Games Publishing does not trigger from games/games.json.");
requireText(gamesPublishing, "node scripts/rebuild-games.js", "Reliable Games Publishing does not run the authoritative rebuild command.");
requireText(gamesPublishing, "sitemap.xml", "Reliable Games Publishing does not stage the root sitemap index.");
requireText(gamesPublishing, "sitemap-*.xml", "Reliable Games Publishing does not stage child sitemaps.");
requireText(gamesPublishing, "gh pr merge", "Reliable Games Publishing does not merge its generated-output PR.");

const rebuildGames = read("scripts/rebuild-games.js");
requireText(rebuildGames, '["integrate-year-platform-discovery.js"]', "The authoritative game rebuild no longer integrates year/platform discovery.");
requireText(rebuildGames, '["generate-sitemaps.js"]', "The authoritative game rebuild no longer regenerates sitemaps.");
requireText(rebuildGames, '["validate-sitemaps.js"]', "The authoritative game rebuild no longer validates sitemaps.");

const seoWorkflow = read(".github/workflows/seo.yml");
requirePattern(seoWorkflow, /^\s{2}push:\s*$/m, "SEO Automation no longer runs on main pushes.");
requireText(seoWorkflow, "node scripts/generate-retro-pages.js", "SEO Automation does not regenerate retro feature pages.");
requireText(seoWorkflow, "npm run generate:video-seo", "SEO Automation does not regenerate game video SEO.");
requireText(seoWorkflow, "npm run generate:retro-video-seo", "SEO Automation does not regenerate retro video SEO.");
requireText(seoWorkflow, "npm run generate:video-library", "SEO Automation does not regenerate the video library.");
requireText(seoWorkflow, "npm run generate:sitemaps", "SEO Automation does not regenerate sitemaps.");
requireText(seoWorkflow, "authoritative_game_publish", "SEO Automation is missing its game-publishing ownership guard.");
requireText(seoWorkflow, "gh pr merge", "SEO Automation does not merge generated SEO/video output.");

requireManualValidationOnly(
  ".github/workflows/build-games-on-games-json-change.yml",
  "Legacy lightweight game builder"
);
requireManualValidationOnly(
  ".github/workflows/generate-collection-stubs.yml",
  "Legacy retro collection stub builder"
);

const priorityWorkflow = read(".github/workflows/priority-genre-navigation-publisher-logos.yml");
requirePattern(priorityWorkflow, /permissions:\s*\n\s*contents:\s*read\b/, "Priority discovery PR validation has write permissions.");
forbidText(priorityWorkflow, "Commit validated output", "Priority discovery PR validation can still commit generated output.");
if (/\bgit\s+push\b|\bgh\s+pr\s+(?:create|merge)\b/.test(priorityWorkflow)) {
  problems.push("Priority discovery PR validation can still push or publish generated output.");
}
requireText(priorityWorkflow, "node scripts/rebuild-games.js", "Priority discovery validation no longer tests the authoritative game rebuild.");

const manualRetro = read(".github/workflows/rebuild-retro-on-data-change.yml");
requireText(manualRetro, "workflow_dispatch:", "Manual retro recovery workflow is missing workflow_dispatch.");
if (/^\s{2}push:\s*$/m.test(manualRetro)) {
  problems.push("Manual retro recovery workflow unexpectedly has an automatic push trigger.");
}
requireText(manualRetro, "node scripts/generate-retro-pages.js", "Manual retro recovery no longer regenerates retro pages.");
requireText(manualRetro, "node scripts/generate-sitemaps.js", "Manual retro recovery no longer regenerates sitemaps.");

const zzapWorkflow = read(".github/workflows/zzap64-review-links-refresh.yml");
requireText(zzapWorkflow, '"data/zzap64-awards/**"', "Zzap review refresh does not trigger when award-year source data changes.");
requireText(zzapWorkflow, "node scripts/audit-zzap64-awards.js", "Zzap review refresh no longer audits award data.");
requireText(zzapWorkflow, "node scripts/audit-game-badges.js", "Zzap review refresh no longer validates game award badges.");
requireText(zzapWorkflow, "gh pr merge", "Zzap review refresh does not merge generated review-data output.");

const deploy = read(".github/workflows/deploy-github-pages-omega-stable.yml");
requirePattern(deploy, /^\s{2}push:\s*$/m, "GitHub Pages deployment no longer runs on main pushes.");
requireText(deploy, "prepare-seo-game-routes.js --output-root _site", "Deployment does not materialize canonical game routes in the public artifact.");
requireText(deploy, "generate-retro-pages.js --root _site", "Deployment does not materialize retro pages in the public artifact.");
requireText(deploy, "validate-sitemaps.js", "Deployment does not validate sitemap structure before publishing.");

const robots = read("robots.txt");
requireText(robots, "User-agent: *", "robots.txt is missing the default crawler group.");
requirePattern(robots, /^Allow:\s*\/$/m, "robots.txt does not explicitly allow the public site.");
requirePattern(robots, /^Disallow:\s*\/admin\/?$/m, "robots.txt does not keep the admin area out of crawling.");
requireText(robots, "Sitemap: https://www.cheekycommodoregamer.co.uk/sitemap.xml", "robots.txt does not advertise the canonical sitemap index.");
[
  "/games",
  "/retro-specials",
  "/retro-events",
  "/amiga-demo-music",
  "/videos",
  "/music",
  "/quiz",
].forEach((publicPath) => {
  if (new RegExp(`^Disallow:\\s*${publicPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/|$)`, "m").test(robots)) {
    problems.push(`robots.txt blocks public discovery content: ${publicPath}`);
  }
});

const headers = read("_headers");
forbidText(headers, "/games/*\n  X-Robots-Tag: index, follow", "_headers applies an unnecessary blanket index directive to all game routes.");
requireText(headers, "/games/game.html\n  X-Robots-Tag: noindex, follow", "_headers is missing the dynamic game-shell noindex safeguard.");
requireText(headers, "/404.html\n  X-Robots-Tag: noindex, follow", "_headers is missing the 404 noindex safeguard.");

const sitemapGenerator = read("tools/seo/generate-sitemap.js");
requireText(sitemapGenerator, "if (/noindex/i.test(seoMeta.robots))", "Sitemap generation no longer excludes noindex pages.");
requireText(sitemapGenerator, "if (seoMeta.isRedirect)", "Sitemap generation no longer excludes redirect pages.");

const sitemapCoordinator = read("scripts/generate-sitemaps.js");
requireText(sitemapCoordinator, "pruneUnmaterializedRetroHubUrls()", "Sitemap generation no longer removes unmaterialized retro hub roots.");
requireText(sitemapCoordinator, 'runNodeScript("audit-sitemap-indexability.js")', "Sitemap generation does not run the noindex/redirect eligibility audit.");

const sitemapAudit = read("scripts/audit-sitemap-indexability.js");
requireText(sitemapAudit, "includes a ${directive.name}=noindex page", "Sitemap indexability audit is missing its noindex failure guard.");
requireText(sitemapAudit, "includes a meta-refresh redirect page", "Sitemap indexability audit is missing its redirect failure guard.");

const publisherDocs = read("admin/CONTENT_PUBLISHER.md");
requireText(publisherDocs, "Reliable Games Publishing", "Content Publisher documentation no longer identifies the authoritative game workflow.");
requireText(publisherDocs, "SEO Automation", "Content Publisher documentation no longer identifies the authoritative video/SEO workflow.");
requireText(publisherDocs, "data/retro-specials.json", "Content Publisher documentation is missing Retro Specials source ownership.");
requireText(publisherDocs, "data/retro-events.json", "Content Publisher documentation is missing Retro Events source ownership.");
requireText(publisherDocs, "data/amiga-demo-music.json", "Content Publisher documentation is missing Amiga Demo Music source ownership.");

const publisherJs = read("admin/js/content-publisher.js");
requireText(publisherJs, "games-publishing.yml", "Content Publisher no longer monitors Reliable Games Publishing.");
requireText(publisherJs, "seo.yml", "Content Publisher no longer monitors SEO Automation.");
requireText(publisherJs, "data/zzap64-awards/", "Content Publisher no longer writes Zzap award-year source data to the expected directory.");

const reconciler = read("admin/js/content-publisher-status-reconciler.js");
requireText(reconciler, "actions/workflows/games-publishing.yml/runs", "Content Publisher status reconciler no longer targets Reliable Games Publishing.");
requireText(reconciler, "Run authoritative publishing command", "Content Publisher status reconciler is out of sync with the game workflow step names.");

if (problems.length) {
  console.error("Publishing automation and indexing audit failed:");
  problems.forEach((problem) => console.error(` - ${problem}`));
  process.exit(1);
}

console.log("Publishing automation ownership, game/retro/Zzap pipelines, robots, sitemap eligibility and admin workflow contracts passed.");
