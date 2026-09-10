#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.env.CCG_REPO_ROOT ? path.resolve(process.env.CCG_REPO_ROOT) : path.resolve(__dirname, "..");
const SITE = "https://www.cheekycommodoregamer.co.uk";
const HOME_URL = `${SITE}/home.html`;
const SHARE_IMAGE = `${SITE}/resources/images/og/ccg-og-home.jpg`;
const CHECK_ONLY = process.argv.includes("--check");
let changes = 0;
let failures = 0;

function read(file) { return fs.readFileSync(file, "utf8"); }
function relative(file) { return path.relative(ROOT, file).replace(/\\/g, "/"); }
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function write(file, next) {
  const previous = read(file);
  if (previous === next) return;
  if (CHECK_ONLY) {
    console.error(`[seo-growth] stale: ${relative(file)}`);
    failures += 1;
    return;
  }
  fs.writeFileSync(file, next, "utf8");
  changes += 1;
  console.log(`[seo-growth] updated: ${relative(file)}`);
}
function replaceOrInsertHeadTag(html, matcher, exactTag, anchorMatcher) {
  if (matcher.test(html)) return html.replace(matcher, exactTag);
  if (anchorMatcher && anchorMatcher.test(html)) {
    return html.replace(anchorMatcher, (anchor) => `${anchor}\n    ${exactTag}`);
  }
  return html.replace("</head>", `    ${exactTag}\n</head>`);
}
function insertHeadTagIfMissing(html, matcher, exactTag, anchorMatcher) {
  if (matcher.test(html)) return html;
  if (anchorMatcher && anchorMatcher.test(html)) {
    return html.replace(anchorMatcher, (anchor) => `${anchor}\n    ${exactTag}`);
  }
  return html.replace("</head>", `    ${exactTag}\n</head>`);
}

function repairHomepage() {
  const intro = path.join(ROOT, "index.html");
  if (fs.existsSync(intro)) {
    let html = read(intro);
    html = replaceOrInsertHeadTag(
      html,
      /<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i,
      '<meta name="robots" content="noindex,follow" />',
      /<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i
    );
    write(intro, html);
  }

  const home = path.join(ROOT, "home.html");
  if (fs.existsSync(home)) {
    let html = read(home);
    html = html.replace(/<title>[\s\S]*?<\/title>/i,
      "<title>Commodore 64 &amp; Amiga Games, Reviews &amp; Retro Archive | Cheeky Commodore Gamer</title>");
    html = replaceOrInsertHeadTag(
      html,
      /<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i,
      '<meta name="description" content="Explore Cheeky Commodore Gamer\'s Commodore 64 and Amiga archive: hundreds of games, reviews, videos, Zzap!64 awards, publishers, genres, quizzes, music and retro features.">'
    );
    html = replaceOrInsertHeadTag(html, /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i, `<link rel="canonical" href="${HOME_URL}" />`);
    html = replaceOrInsertHeadTag(html, /<meta\b(?=[^>]*\bproperty=["']og:url["'])[^>]*>/i, `<meta property="og:url" content="${HOME_URL}">`);
    html = replaceOrInsertHeadTag(
      html,
      /<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i,
      '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />',
      /<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i
    );
    html = replaceOrInsertHeadTag(
      html,
      /<meta\b(?=[^>]*\bname=["']twitter:url["'])[^>]*>/i,
      `<meta name="twitter:url" content="${HOME_URL}">`,
      /<meta\b(?=[^>]*\bname=["']twitter:card["'])[^>]*>/i
    );
    write(home, html);
  }

  const sitemap = path.join(ROOT, "sitemap-pages.xml");
  if (fs.existsSync(sitemap)) {
    let xml = read(sitemap);
    xml = xml.replace(/<loc>https:\/\/www\.cheekycommodoregamer\.co\.uk\/(?:home\.html)?<\/loc>/, `<loc>${HOME_URL}</loc>`);
    write(sitemap, xml);
  }
}

function htmlFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...htmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}
function ensureSocialMeta(html) {
  const anchor = /<meta\b(?=[^>]*\bproperty=["']og:title["'])[^>]*>/i;
  const tags = [
    [/<meta\b(?=[^>]*\bproperty=["']og:image["'])[^>]*>/i, `<meta property="og:image" content="${SHARE_IMAGE}">`],
    [/<meta\b(?=[^>]*\bproperty=["']og:image:width["'])[^>]*>/i, '<meta property="og:image:width" content="1200">'],
    [/<meta\b(?=[^>]*\bproperty=["']og:image:height["'])[^>]*>/i, '<meta property="og:image:height" content="630">'],
    [/<meta\b(?=[^>]*\bname=["']twitter:image["'])[^>]*>/i, `<meta name="twitter:image" content="${SHARE_IMAGE}">`]
  ];
  for (const [matcher, tag] of tags) html = insertHeadTagIfMissing(html, matcher, tag, anchor);
  return html;
}
function repairCategorySocialCards() {
  const roots = ["genres", "publishers", "developers", "collections", "platforms"].map((name) => path.join(ROOT, "games", name));
  for (const root of roots) {
    for (const file of htmlFiles(root)) {
      let html = read(file);
      if (!/<meta\b(?=[^>]*\bproperty=["']og:title["'])[^>]*>/i.test(html)) continue;
      html = ensureSocialMeta(html);
      write(file, html);
    }
  }
}

const editorial = {
  "50-essential-commodore-64-games": {
    heading: "Explore the 50 Essential C64 Games",
    paragraphs: [
      "This feature is designed as more than a video watch page. Use it as a starting point for exploring the games, publishers and genres that helped define Commodore 64 gaming.",
      "The CCG archive links individual game pages with reviews, videos, screenshots, manuals and historical details, so the countdown can lead directly into a deeper look at the machine's best-known releases."
    ],
    links: [["Browse the Commodore 64 archive", "/games/platforms/c64/"], ["Browse C64 and Amiga genres", "/games/genres/"], ["Explore publishers", "/games/publishers/"], ["Try Find Me a Game", "/games/discover/"]]
  },
  "50-essential-amiga-games": {
    heading: "Explore the Essential Amiga Games",
    paragraphs: [
      "The countdown spans arcade action, strategy, adventures, simulations and other genres that gave the Amiga such a varied software library. The website version is intended to be a permanent route into that wider archive rather than simply a place to embed the video.",
      "Several games highlighted in the feature have their own CCG archive pages. Start with the examples below, then use the Amiga platform archive to continue through the collection."
    ],
    links: [["Browse the Amiga games archive", "/games/platforms/amiga/"], ["Lotus Turbo Challenge 2", "/games/lotus-turbo-challenge-2/"], ["Cannon Fodder", "/games/cannon-fodder/"], ["Syndicate", "/games/syndicate/"], ["Another World", "/games/another-world/"], ["The Secret of Monkey Island", "/games/the-secret-of-monkey-island/"]]
  },
  "c64-vs-zx-spectrum": {
    heading: "C64 vs ZX Spectrum: Explore the Games",
    paragraphs: [
      "The comparison looks beyond screenshots alone and revisits how the same games differed across two of Britain's defining 8-bit home computers. Graphics, sound, controls, pace and the overall character of each conversion can vary dramatically even when the title on the box is identical.",
      "Use the links below to continue into the CCG archive and revisit several of the games discussed in the comparison."
    ],
    links: [["Browse Commodore 64 games", "/games/platforms/c64/"], ["Head Over Heels", "/games/head-over-heels/"], ["Skool Daze", "/games/skool-daze/"], ["Manic Miner", "/games/manic-miner/"], ["Explore more Retro Specials", "/games/collections/retro-specials.html"]]
  },
  "zzap64-gold-medals-sizzlers-1985": {
    heading: "Explore Zzap!64's 1985 Awards",
    paragraphs: ["This retrospective follows Zzap!64 through its first year and revisits the games that received Sizzlers and Gold Medals. The wider CCG Zzap!64 hub connects the annual award features with individual game pages and the magazine archive.", "Continue through the year-by-year series or use the main Zzap!64 hub to browse the awards and reviews in more detail."],
    links: [["Open the Zzap!64 hub", "/zzap64/"], ["Browse the C64 archive", "/games/platforms/c64/"], ["Explore Retro Specials", "/games/collections/retro-specials.html"]]
  },
  "zzap64-gold-medals-sizzlers-1986": {
    heading: "Explore Zzap!64's 1986 Awards",
    paragraphs: ["Revisit the Sizzlers and Gold Medals awarded during 1986, then follow the individual games into the wider CCG archive for videos, reviews and supporting material."],
    links: [["Open the Zzap!64 hub", "/zzap64/"], ["Browse the C64 archive", "/games/platforms/c64/"], ["1985 awards", "/retro-specials/zzap64-gold-medals-sizzlers-1985/"]]
  },
  "zzap64-gold-medals-sizzlers-1987": {
    heading: "Explore Zzap!64's 1987 Awards",
    paragraphs: ["This year-by-year retrospective is part of CCG's growing Zzap!64 reference area. Use the website to move from the award discussion into the games, publishers and archive material behind it."],
    links: [["Open the Zzap!64 hub", "/zzap64/"], ["Browse the C64 archive", "/games/platforms/c64/"], ["1986 awards", "/retro-specials/zzap64-gold-medals-sizzlers-1986/"]]
  },
  "zzap64-gold-medals-sizzlers-1988": {
    heading: "Explore Zzap!64's 1988 Awards",
    paragraphs: ["The 1988 feature covers a period when Zzap!64 was increasingly reviewing C64 and Amiga releases side by side. The CCG archive provides routes into both platforms as well as the main Zzap!64 awards hub."],
    links: [["Open the Zzap!64 hub", "/zzap64/"], ["Browse C64 games", "/games/platforms/c64/"], ["Browse Amiga games", "/games/platforms/amiga/"]]
  },
  "zzap64-gold-medals-sizzlers-1989": {
    heading: "Explore Zzap!64's 1989 Awards",
    paragraphs: ["The 1989 retrospective brings the C64 and Amiga award coverage together in one of the largest years in the series. Continue into the platform archives or use the Zzap!64 hub to explore the magazine coverage by game and award."],
    links: [["Open the Zzap!64 hub", "/zzap64/"], ["Browse C64 games", "/games/platforms/c64/"], ["Browse Amiga games", "/games/platforms/amiga/"]]
  }
};
function editorialBlock(slug, config) {
  const paragraphs = config.paragraphs.map((text) => `      <p>${escapeHtml(text)}</p>`).join("\n");
  const links = config.links.map(([label, href]) => `        <li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`).join("\n");
  return `<!-- CCG SEO EDITORIAL START -->\n    <section class="retro-video-page__editorial" data-ccg-seo-editorial="${escapeHtml(slug)}">\n      <h2>${escapeHtml(config.heading)}</h2>\n${paragraphs}\n      <ul class="retro-video-page__editorial-links">\n${links}\n      </ul>\n    </section>\n    <!-- CCG SEO EDITORIAL END -->`;
}
function repairRetroEditorial() {
  const base = path.join(ROOT, "retro-specials");
  for (const [slug, config] of Object.entries(editorial)) {
    const file = path.join(base, slug, "index.html");
    if (!fs.existsSync(file)) {
      console.warn(`[seo-growth] editorial target missing: ${relative(file)}`);
      continue;
    }
    let html = read(file);
    const block = editorialBlock(slug, config);
    const existing = /<!-- CCG SEO EDITORIAL START -->[\s\S]*?<!-- CCG SEO EDITORIAL END -->/i;
    if (existing.test(html)) html = html.replace(existing, block);
    else if (html.includes('<section class="retro-video-page__related">')) html = html.replace('<section class="retro-video-page__related">', `${block}\n\n    <section class="retro-video-page__related">`);
    else if (html.includes("</article>")) html = html.replace("</article>", `${block}\n  </article>`);
    write(file, html);
  }
}

function validate() {
  const intro = path.join(ROOT, "index.html");
  const home = path.join(ROOT, "home.html");
  const sitemap = path.join(ROOT, "sitemap-pages.xml");
  const required = [
    [intro, /<meta name="robots" content="noindex,follow" \/>/, "intro noindex"],
    [home, new RegExp(`<link rel="canonical" href="${HOME_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" \/>`), "home canonical"],
    [home, /<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" \/>/, "home robots"],
    [sitemap, new RegExp(`<loc>${HOME_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/loc>`), "home sitemap entry"]
  ];
  for (const [file, matcher, label] of required) {
    if (!fs.existsSync(file) || !matcher.test(read(file))) {
      console.error(`[seo-growth] validation failed: ${label}`);
      failures += 1;
    }
  }
  for (const slug of Object.keys(editorial)) {
    const file = path.join(ROOT, "retro-specials", slug, "index.html");
    if (fs.existsSync(file) && !read(file).includes(`data-ccg-seo-editorial="${slug}"`)) {
      console.error(`[seo-growth] validation failed: editorial missing for ${slug}`);
      failures += 1;
    }
  }
  const sample = path.join(ROOT, "games", "genres", "platform-games.html");
  if (fs.existsSync(sample)) {
    const html = read(sample);
    if (!/<meta\b(?=[^>]*\bproperty=["']og:image["'])[^>]*>/i.test(html) || !/<meta\b(?=[^>]*\bname=["']twitter:image["'])[^>]*>/i.test(html)) {
      console.error("[seo-growth] validation failed: category social preview metadata");
      failures += 1;
    }
  }
}

repairHomepage();
repairCategorySocialCards();
repairRetroEditorial();
validate();

if (failures) {
  console.error(`[seo-growth] failed with ${failures} issue(s).`);
  process.exit(1);
}
console.log(CHECK_ONLY ? "[seo-growth] all growth/SEO checks passed." : `[seo-growth] complete; ${changes} file(s) updated.`);
