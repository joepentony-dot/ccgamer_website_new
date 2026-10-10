#!/usr/bin/env node

"use strict";

const fs = require("fs");
const { execFileSync } = require("child_process");

const HOME_PATH = "home.html";
const EXPECTED = {
  title: "Commodore 64 &amp; Amiga Games, Reviews &amp; Retro Archive | Cheeky Commodore Gamer",
  description: "Explore Cheeky Commodore Gamer's Commodore 64 and Amiga archive: hundreds of games, reviews, videos, Zzap!64 awards, publishers, genres, quizzes, music and retro features.",
  canonical: "https://www.cheekycommodoregamer.co.uk/home.html",
  robots: "index,follow,max-image-preview:large,max-snippet:-1",
  ogUrl: "https://www.cheekycommodoregamer.co.uk/home.html",
  twitterUrl: "https://www.cheekycommodoregamer.co.uk/home.html"
};

function fail(message) {
  console.error(`[search-home-contract] ${message}`);
  process.exit(1);
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match ? match[2] : "";
}

function findTag(html, type, name) {
  if (type === "title") {
    const match = html.match(/<title>([\s\S]*?)<\/title>/i);
    return match ? match[1].trim() : "";
  }

  const tags = type === "link"
    ? [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0])
    : [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);

  if (type === "link") {
    return tags.find((tag) => getAttribute(tag, "rel").toLowerCase() === name.toLowerCase()) || "";
  }

  const separatorIndex = name.indexOf(":");
  if (separatorIndex < 1 || separatorIndex === name.length - 1) return "";
  const attribute = name.slice(0, separatorIndex);
  const value = name.slice(separatorIndex + 1);
  return tags.find((tag) => getAttribute(tag, attribute).toLowerCase() === value.toLowerCase()) || "";
}

function assertExactHead(html) {
  const title = findTag(html, "title", "");
  if (title !== EXPECTED.title) fail(`Unexpected title: ${title || "(missing)"}`);

  const descriptionTag = findTag(html, "meta", "name:description");
  if (getAttribute(descriptionTag, "content") !== EXPECTED.description) {
    fail("Meta description does not match the approved search-home copy.");
  }

  const robotsTag = findTag(html, "meta", "name:robots");
  if (getAttribute(robotsTag, "content") !== EXPECTED.robots) {
    fail("Robots directive does not match the approved search-home contract.");
  }

  const canonicalTag = findTag(html, "link", "canonical");
  if (getAttribute(canonicalTag, "href") !== EXPECTED.canonical) {
    fail("Canonical URL does not point to /home.html.");
  }

  const ogUrlTag = findTag(html, "meta", "property:og:url");
  if (getAttribute(ogUrlTag, "content") !== EXPECTED.ogUrl) {
    fail("og:url does not point to /home.html.");
  }

  const twitterUrlTag = findTag(html, "meta", "name:twitter:url");
  if (getAttribute(twitterUrlTag, "content") !== EXPECTED.twitterUrl) {
    fail("twitter:url does not point to /home.html.");
  }
}

function stripApprovedRetiredWeeklyVaultCta(html) {
  return String(html).replace(
    /\s*<a\s+href=["']\/arcade\/lost-sizzler\/#weekly-vault["'][\s\S]*?class=["'][^"']*home-hero__leaderboard-cta[^"']*["'][\s\S]*?<\/a>/i,
    ""
  );
}

function stripApprovedDungeonCarnageHomeCta(html) {
  return String(html).replace(
    /\s*<a\s+href=["']\/arcade\/(?:lost-sizzler|c64-dungeon-carnage)\/["'][\s\S]*?class=["'][^"']*home-hero__beta-cta[^"']*["'][\s\S]*?<\/a>/i,
    ""
  );
}

function stripApprovedDungeonCarnageCssCacheBust(html) {
  return String(html).replace(
    /home-lost-sizzler-cta\.css(?:\?v=[^"']+)?/i,
    "home-lost-sizzler-cta.css"
  );
}

const HOME_DISCOVERY_ROUTES = Object.freeze([
  "/games/",
  "/games/discover/",
  "/games/genres/",
  "/games/publishers/",
  "/games/collections/",
  "/music/",
  "/zzap64/",
  "/games/collections/retro-specials.html"
]);

function extractHomeHighlightsSection(html) {
  const match = String(html).match(
    /<section\b[^>]*aria-labelledby=["']home-highlights-title["'][^>]*>[\s\S]*?<\/section>/i
  );
  return match ? match[0] : "";
}

function hasApprovedHomeDiscoveryDashboard(section) {
  const source = String(section || "");
  if (!source.includes("<!-- PRIMARY ARCHIVE DISCOVERY DASHBOARD -->")
      && !source.includes("home-section--archive-dashboard")) {
    return false;
  }

  if (!source.includes('class="home-archive-launchpad"')) return false;
  if (!source.includes('id="home-highlights-title">Find Your Way Around CCG</')) return false;

  const routeMatches = [...source.matchAll(/<a\b[^>]*class=["'][^"']*\bhome-archive-route\b[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>|<a\b[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*\bhome-archive-route\b[^"']*["'][^>]*>/gi)];
  const routes = routeMatches.map((match) => match[1] || match[2]).filter(Boolean);

  if (routes.length !== HOME_DISCOVERY_ROUTES.length) return false;
  if (routes.some((route, index) => route !== HOME_DISCOVERY_ROUTES[index])) return false;

  if (/<(?:script|iframe|form|audio|video)\b/i.test(source)) return false;
  return true;
}

function isLegacyHomeHighlightsSection(section) {
  const source = String(section || "");
  return source.includes("home-explore-grid")
    && source.includes("Choose How to Explore");
}

function stripApprovedHomeDiscoveryTransformation(html, role) {
  const source = String(html);
  const section = extractHomeHighlightsSection(source);
  if (!section) return source;

  if (role === "current") {
    if (!hasApprovedHomeDiscoveryDashboard(section)) {
      fail("The Home highlights section changed without matching the approved archive dashboard contract.");
    }
  } else if (!isLegacyHomeHighlightsSection(section) && !hasApprovedHomeDiscoveryDashboard(section)) {
    fail("The baseline Home highlights section is not a recognized archive-navigation layout.");
  }

  return source
    .replace(section, "<section data-ccg-approved-home-discovery-placeholder></section>")
    .replace(
      /<!--\s*(?:PRIMARY ARCHIVE DISCOVERY DASHBOARD|THREE STABLE SECONDARY ROUTES: NO DUPLICATE SITE MAP)\s*-->/gi,
      ""
    );
}

function stripApprovedHomeSearchStability(html) {
  return String(html).replace(
    /\s*<!--\s*PERFORMANCE-STABLE GLOBAL SEARCH SLOT\s*-->\s*<div\b(?=[^>]*\bdata-ccg-home-search-static=["']true["'])[^>]*>[\s\S]*?<\/button>\s*<\/div>/i,
    ""
  );
}

function stripApprovedHomeFooterCssDeferral(html) {
  return String(html)
    .replace(
      /\s*<link\s+rel=["']preload["']\s+href=["']resources\/css\/ccg-footer\.css["']\s+as=["']style["']\s+onload=["']this\.onload=null;this\.rel='stylesheet'["']\s*>\s*<noscript>\s*<link\s+rel=["']stylesheet["']\s+href=["']resources\/css\/ccg-footer\.css["']\s*\/?\s*>\s*<\/noscript>/i,
      "\n    <link data-ccg-approved-home-footer-css>"
    )
    .replace(
      /\s*<link\s+rel=["']stylesheet["']\s+href=["']resources\/css\/ccg-footer\.css["']\s*\/?\s*>/i,
      "\n    <link data-ccg-approved-home-footer-css>"
    );
}

// Explicitly scoped allowance for the optional homepage support-art replacement.
// Validate the exact approved graphic in both the current and baseline pages.
// The rest of home.html is still byte-for-byte checked against origin/main.
function stripApprovedHomeSupportArt(html, role) {
  let source = String(html);
  const newPanel = source.match(/<section\b[^>]*class=["'][^"']*\bhome-support-art\b[^"']*["'][^>]*>[\s\S]*?<\/section>/i);
  const oldPanel = source.match(/<section\b[^>]*class=["'][^"']*\bhome-cta-upgrade--streamlined\b[^"']*["'][^>]*>[\s\S]*?<\/section>/i);
  const panel = newPanel || oldPanel;
  if (!panel) fail("The homepage optional support section is missing.");

  if (newPanel) {
    if (role !== "current" && role !== "baseline") fail("Unexpected homepage support validation role.");
    const s = panel[0];
    const expected = [
      '/resources/images/ccg-home-support-neon.webp',
      'home-support-art__image',
      'home-support-art__hotspot--paypal',
      'home-support-art__hotspot--patreon',
      'home-support-art__hotspot--youtube',
      'home-support-art__hotspot--more',
      'home-support-art__mobile',
      'https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL',
      'https://www.patreon.com/CheekyCommodoreGamer',
      'https://www.youtube.com/@CheekyCommodoreGamer',
      'href="/support.html"'
    ];
    if (expected.some((item) => !s.includes(item))) {
      fail("The optional homepage support graphic is missing an approved image, destination, or accessible link.");
    }
    if ((s.match(/<img\b/gi) || []).length !== 1
        || (s.match(/<a\b/gi) || []).length !== 8
        || /<(?:script|iframe|form|audio|video)\b/i.test(s)
        || /\son[a-z]+\s*=/i.test(s)
        || /javascript:|src=["']https?:/i.test(s)) {
      fail("The optional homepage support graphic contains unapproved or interactive markup.");
    }
    const links = [...s.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
    const allowed = new Set([
      'https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL',
      'https://www.patreon.com/CheekyCommodoreGamer',
      'https://www.youtube.com/@CheekyCommodoreGamer',
      '/support.html'
    ]);
    if (links.length !== 8 || links.some((href) => !allowed.has(href))) {
      fail("The optional homepage support graphic has an unapproved link destination.");
    }
  } else {
    if (!panel[0].includes('https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL')
        || !panel[0].includes('https://www.youtube.com/@CheekyCommodoreGamer')) {
      fail("The baseline support section differs from the expected two-link strip.");
    }
  }

  source = source.replace(panel[0], '<section data-ccg-approved-home-support-art></section>');
  source = source.replace(/<!--\s*(?:COMPACT SUPPORT STRIP|OPTIONAL HOME SUPPORT: EXACT ARTWORK WITH ACCESSIBLE LINK HOTSPOTS)\s*-->/gi, '');
  source = source.replace(/\s*<link\s+rel=["']stylesheet["']\s+href=["']\/resources\/css\/home-support-panel\.css["']\s*\/?>/gi, '');
  return source;
}

function stripApprovedSeoHead(html) {
  return stripApprovedDungeonCarnageCssCacheBust(
    stripApprovedDungeonCarnageHomeCta(
      stripApprovedRetiredWeeklyVaultCta(
        stripApprovedHomeFooterCssDeferral(
          stripApprovedHomeSearchStability(String(html))
        )
      )
    )
  )
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i, "")
    .replace(/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i, "")
    .replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i, "")
    .replace(/<meta\b(?=[^>]*\bproperty=["']og:url["'])[^>]*>/i, "")
    .replace(/<meta\b(?=[^>]*\bname=["']twitter:url["'])[^>]*>/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readBaseline() {
  const baselineFileArg = process.argv.find((arg) => arg.startsWith("--baseline-file="));
  if (baselineFileArg) {
    const baselineFile = baselineFileArg.slice("--baseline-file=".length);
    return fs.readFileSync(baselineFile, "utf8");
  }

  const baselineRefArg = process.argv.find((arg) => arg.startsWith("--baseline-ref="));
  const baselineRef = baselineRefArg ? baselineRefArg.slice("--baseline-ref=".length) : "origin/main";
  try {
    return execFileSync("git", ["show", `${baselineRef}:${HOME_PATH}`], { encoding: "utf8" });
  } catch (error) {
    fail(`Could not read baseline ${baselineRef}:${HOME_PATH}.`);
  }
}

if (!fs.existsSync(HOME_PATH)) fail(`${HOME_PATH} is missing.`);

const current = fs.readFileSync(HOME_PATH, "utf8");
const baseline = readBaseline();
assertExactHead(current);

const normalizedCurrent = stripApprovedHomeSupportArt(stripApprovedSeoHead(
  stripApprovedHomeDiscoveryTransformation(current, "current")
), "current").replace(/\s+/g, " ").trim();
const normalizedBaseline = stripApprovedHomeSupportArt(stripApprovedSeoHead(
  stripApprovedHomeDiscoveryTransformation(baseline, "baseline")
), "baseline").replace(/\s+/g, " ").trim();

if (normalizedCurrent !== normalizedBaseline) {
  fail("home.html changed outside the approved SEO-head, Dungeon Carnage CTA, first-paint search slot, footer CSS deferral and archive-dashboard fields.");
}

console.log("[search-home-contract] home.html differs from baseline only by the approved SEO-head / Dungeon Carnage CTA / first-paint search slot / footer CSS deferral / archive-dashboard changes.");