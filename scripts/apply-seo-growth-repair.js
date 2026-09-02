#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");

const SITE = "https://www.cheekycommodoregamer.co.uk";
const HOME_URL = `${SITE}/home.html`;
const SHARE_IMAGE = `${SITE}/resources/images/og/ccg-og-home.jpg`;
const CHECK_ONLY = process.argv.includes("--check");

let changed = 0;
let failed = 0;

function rel(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeIfChanged(filePath, next) {
  const previous = read(filePath);
  if (previous === next) return false;
  if (CHECK_ONLY) {
    console.error(`[seo-growth] stale: ${rel(filePath)}`);
    failed += 1;
    return true;
  }
  fs.writeFileSync(filePath, next, "utf8");
  changed += 1;
  console.log(`[seo-growth] updated: ${rel(filePath)}`);
  return true;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureMeta(html, marker, tag) {
  if (html.includes(marker)) return html;
  if (html.includes("</head>")) return html.replace("</head>", `    ${tag}\n</head>`);
  return html;
}

function replaceMetaContent(html, attribute, name, value) {
  const re = new RegExp(`<meta\\b([^>]*?)${attribute}=["']${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}["']([^>]*?)content=["'][^"']*["']([^>]*)>`, "i");
  if (re.test(html)) {
    return html.replace(re, (match, before, middle, after) => {
      return `<meta${before}${attribute}="${name}"${middle}content="${escapeHtml(value)}"${after}>`;
    });
  }
  return html;
}

function repairHomepageSignals() {
  const introPath = path.join(repoRoot, "index.html");
  if (fs.existsSync(introPath)) {
    let html = read(introPath);
    const robots = '<meta name="robots" content="noindex,follow" />';
    if (/\<meta\b[^>]*name=["']robots["'][^>]*>/i.test(html)) {
      html = html.replace(/\<meta\b[^>]*name=["']robots["'][^>]*>/i, robots);
    } else {
      html = html.replace(/(<meta\s+name=["']description["'][\s\S]*?>)/i, `$1\n    ${robots}`);
    }
    writeIfChanged(introPath, html);
  }

  const homePath = path.join(repoRoot, "home.html");
  if (fs.existsSync(homePath)) {
    let html = read(homePath);
    html = html.replace(
      /<link\s+rel=["']canonical["']\s+href=["']https:\/\/www\.cheekycommodoregamer\.co\.uk\/["']\s*\/?\s*>/i,
      `<link rel="canonical" href="${HOME_URL}" />`
    );
    html = html.replace(
      /<meta\s+property=["']og:url["']\s+content=["']https:\/\/www\.cheekycommodoregamer\.co\.uk\/["']\s*\/?\s*>/i,
      `<meta property="og:url" content="${HOME_URL}">`
    );
    html = html.replace(
      /<title>Cheeky Commodore Gamer \| Home<\/title>/i,
      `<title>Commodore 64 &amp; Amiga Games, Reviews &amp; Retro Archive | Cheeky Commodore Gamer</title>`
    );
    html = html.replace(
      /<meta\s+name=["']description["'][\s\S]*?content=["'][^"']*["']\s*\/?\s*>/i,
      `<meta name="description" content="Explore Cheeky Commodore Gamer's Commodore 64 and Amiga archive: hundreds of games, reviews, videos, Zzap!64 awards, publishers, genres, quizzes, music and retro features.">`
    );
    html = ensureMeta(html, 'name="robots"', '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />');
    html = ensureMeta(html, 'name="twitter:url"', `<meta name="twitter:url" content="${HOME_URL}">`);
    writeIfChanged(homePath, html);
  }

  const sitemapPath = path.join(repoRoot, "sitemap-pages.xml");
  if (fs.existsSync(sitemapPath)) {
    let xml = read(sitemapPath);
    xml = xml.replace(
      /<loc>https:\/\/www\.cheekycommodoregamer\.co\.uk\/<\/loc>/,
      `<loc>${HOME_URL}</loc>`
    );
    writeIfChanged(sitemapPath, xml);
  }
}

function htmlFilesUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...htmlFilesUnder(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) output.push(full);
  }
  return output;
}

function repairCategorySocialCards() {
  const roots = [
    path.join(repoRoot, "games", "genres"),
    path.join(repoRoot, "games", "publishers"),
    path.join(repoRoot, "games", "developers"),
    path.join(repoRoot, "games", "collections"),
    path.join(repoRoot, "games", "platforms")
  ];

  for (const root of roots) {
    for (const filePath of htmlFilesUnder(root)) {
      let html = read(filePath);
      if (!/<meta\s+property=["']og:title["']/i.test(html)) continue;
      html = ensureMeta(html, 'property="og:image"', `<meta property="og:image" content="${SHARE_IMAGE}">`);
      html = ensureMeta(html, 'property="og:image:width"', '<meta property="og:image:width" content="1200">');
      html = ensureMeta(html, 'property="og:image:height"', '<meta property="og:image:height" content="630">');
      html = ensureMeta(html, 'name="twitter:image"', `<meta name="twitter:image" content="${SHARE_IMAGE}">`);
      writeIfChanged(filePath, html);
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
    links: [
      ["Browse the Commodore 64 archive", "/games/platforms/c64/"],
      ["Browse C64 and Amiga genres", "/games/genres/"],
      ["Explore publishers", "/games/publishers/"],
      ["Try Find Me a Game", "/games/discover/"]
    ]
  },
  "50-essential-amiga-games": {
    heading: "Explore the Essential Amiga Games",
    paragraphs: [
      "The countdown spans arcade action, strategy, adventures, simulations and other genres that gave the Amiga such a varied software library. The website version is intended to be a permanent route into that wider archive rather than simply a place to embed the video.",
      "Several games highlighted in the feature have their own CCG archive pages. Start with the examples below, then use the Amiga platform archive to continue through the collection."
    ],
    links: [
      ["Browse the Amiga games archive", "/games/platforms/amiga/"],
      ["Lotus Turbo Challenge 2", "/games/lotus-turbo-challenge-2/"],
      ["Cannon Fodder", "/games/cannon-fodder/"],
      ["Syndicate", "/games/syndicate/"],
      ["Another World", "/games/another-world/"],
      ["The Secret of Monkey Island", "/games/the-secret-of-monkey-island/"]
    ]
  },
  "c64-vs-zx-spectrum": {
    heading: "C64 vs ZX Spectrum: Explore the Games",
    paragraphs: [
      "The comparison looks beyond screenshots alone and revisits how the same games differed across two of Britain's defining 8-bit home computers. Graphics, sound, controls, pace and the overall character of each conversion can vary dramatically even when the title on the box is identical.",
      "Use the links below to continue into the CCG archive and revisit several of the games discussed in the comparison."
    ],
    links: [
      ["Browse Commodore 64 games", "/games/platforms/c64/"],
      ["Head Over Heels", "/games/head-over-heels/"],
      ["Skool Daze", "/games/skool-daze/"],
      ["Manic Miner", "/games/manic-miner/"],
      ["Explore more Retro Specials", "/games/collections/retro-specials.html"]
    ]
  },
  "zzap64-gold-medals-sizzlers-1985": {
    heading: "Explore Zzap!64's 1985 Awards",
    paragraphs: [
      "This retrospective follows Zzap!64 through its first year and revisits the games that received Sizzlers and Gold Medals. The wider CCG Zzap!64 hub connects the annual award features with individual game pages and the magazine archive.",
      "Continue through the year-by-year series or use the main Zzap!64 hub to browse the awards and reviews in more detail."
    ],
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
  return `\n    <!-- CCG SEO EDITORIAL START -->\n    <section class="retro-video-page__editorial" data-ccg-seo-editorial="${escapeHtml(slug)}">\n      <h2>${escapeHtml(config.heading)}</h2>\n${paragraphs}\n      <ul class="retro-video-page__editorial-links">\n${links}\n      </ul>\n    </section>\n    <!-- CCG SEO EDITORIAL END -->\n`;
}

function repairRetroSpecialEditorial() {
  const base = path.join(repoRoot, "retro-specials");
  for (const [slug, config] of Object.entries(editorial)) {
    const filePath = path.join(base, slug, "index.html");
    if (!fs.existsSync(filePath)) {
      console.warn(`[seo-growth] editorial target missing: ${rel(filePath)}`);
      continue;
    }
    let html = read(filePath);
    const block = editorialBlock(slug, config);
    const markerRe = /\s*<!-- CCG SEO EDITORIAL START -->[\s\S]*?<!-- CCG SEO EDITORIAL END -->\s*/i;
    if (markerRe.test(html)) {
      html = html.replace(markerRe, block);
    } else if (html.includes('<section class="retro-video-page__related">')) {
      html = html.replace('<section class="retro-video-page__related">', `${block}\n    <section class="retro-video-page__related">`);
    } else if (html.includes("</article>")) {
      html = html.replace("</article>", `${block}\n  </article>`);
    }
    writeIfChanged(filePath, html);
  }
}

function validate() {
  const intro = path.join(repoRoot, "index.html");
  const home = path.join(repoRoot, "home.html");
  const sitemap = path.join(repoRoot, "sitemap-pages.xml");

  const checks = [
    [intro, /<meta\s+name=["']robots["']\s+content=["']noindex,follow["']/i, "intro must be noindex,follow"],
    [home, new RegExp(`<link\\s+rel=["']canonical["']\\s+href=["']${HOME_URL.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}["']`, "i"), "home canonical must point to /home.html"],
    [sitemap, new RegExp(`<loc>${HOME_URL.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}<\\/loc>`), "page sitemap must contain /home.html"]
  ];

  for (const [filePath, re, message] of checks) {
    if (!fs.existsSync(filePath) || !re.test(read(filePath))) {
      console.error(`[seo-growth] validation failed: ${message}`);
      failed += 1;
    }
  }

  for (const [slug] of Object.entries(editorial)) {
    const filePath = path.join(repoRoot, "retro-specials", slug, "index.html");
    if (!fs.existsSync(filePath)) continue;
    if (!read(filePath).includes(`data-ccg-seo-editorial="${slug}"`)) {
      console.error(`[seo-growth] validation failed: editorial block missing for ${slug}`);
      failed += 1;
    }
  }

  const sampleCategory = path.join(repoRoot, "games", "genres", "platform-games.html");
  if (fs.existsSync(sampleCategory)) {
    const html = read(sampleCategory);
    if (!html.includes('property="og:image"') || !html.includes('name="twitter:image"')) {
      console.error("[seo-growth] validation failed: category social image metadata missing");
      failed += 1;
    }
  }
}

repairHomepageSignals();
repairCategorySocialCards();
repairRetroSpecialEditorial();
validate();

if (failed) {
  console.error(`[seo-growth] failed with ${failed} issue(s).`);
  process.exit(1);
}

console.log(CHECK_ONLY
  ? "[seo-growth] all growth/SEO checks passed."
  : `[seo-growth] complete; ${changed} file(s) updated.`);
