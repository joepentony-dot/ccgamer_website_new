#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const SITE = "https://www.cheekycommodoregamer.co.uk";
const SOCIAL_IMAGE = `${SITE}/resources/images/og/c64_neon.png`;
const TODAY = "2026-09-02";

function file(rel) {
  return path.join(repoRoot, rel);
}

function read(rel) {
  return fs.readFileSync(file(rel), "utf8");
}

function write(rel, contents) {
  fs.writeFileSync(file(rel), contents, "utf8");
  console.log(`[public-growth-seo] updated ${rel}`);
}

function replaceRequired(contents, from, to, rel) {
  if (!contents.includes(from)) {
    if (contents.includes(to)) return contents;
    throw new Error(`${rel}: expected source text not found: ${from.slice(0, 100)}`);
  }
  return contents.replace(from, to);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function patchHomepageSignals() {
  {
    const rel = "index.html";
    let html = read(rel);
    html = replaceRequired(
      html,
      '<meta property="og:url" content="https://www.cheekycommodoregamer.co.uk/index.html" />',
      '<meta property="og:url" content="https://www.cheekycommodoregamer.co.uk/" />',
      rel
    );
    write(rel, html);
  }

  {
    const rel = "home.html";
    let html = read(rel);
    html = replaceRequired(
      html,
      "<title>Cheeky Commodore Gamer | Home</title>",
      "<title>Cheeky Commodore Gamer | C64 &amp; Amiga Retro Gaming Archive</title>",
      rel
    );
    html = replaceRequired(
      html,
      '<meta property="og:url" content="https://www.cheekycommodoregamer.co.uk/">',
      '<meta property="og:url" content="https://www.cheekycommodoregamer.co.uk/home.html">',
      rel
    );
    html = replaceRequired(
      html,
      '<link rel="canonical" href="https://www.cheekycommodoregamer.co.uk/" />',
      '<link rel="canonical" href="https://www.cheekycommodoregamer.co.uk/home.html" />',
      rel
    );
    if (!html.includes('<meta name="robots"')) {
      html = html.replace(
        '<meta name="description"\n      content="Cheeky Commodore Gamer — epic Commodore 64 and Amiga coverage: reviews, trivia, curated collections and more. Stay a while, stay forever!">',
        '<meta name="description"\n      content="Cheeky Commodore Gamer — epic Commodore 64 and Amiga coverage: reviews, trivia, curated collections and more. Stay a while, stay forever!">\n    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />'
      );
    }
    write(rel, html);
  }
}

function patchSitemapGenerator() {
  const rel = "tools/seo/generate-sitemap.js";
  let js = read(rel);

  js = replaceRequired(
    js,
    "  if (normalized === `${siteUrl}/index.html` || normalized === `${siteUrl}/home.html`) {\n    return `${siteUrl}/`;\n  }",
    "  if (normalized === `${siteUrl}/index.html`) {\n    return `${siteUrl}/`;\n  }",
    rel
  );

  js = replaceRequired(
    js,
    "  if (normalized === 'home.html') {\n    return {\n      locPath: '',\n      filePath: path.join(repoRoot, normalized),\n    };\n  }",
    "  if (normalized === 'home.html') {\n    return {\n      // The cinematic intro owns `/`; the content-rich homepage is intentionally\n      // indexable at /home.html so the two different documents do not compete\n      // for the same canonical URL.\n      locPath: 'home.html',\n      filePath: path.join(repoRoot, normalized),\n    };\n  }",
    rel
  );

  write(rel, js);
}

function patchCurrentSitemap() {
  const rel = "sitemap-pages.xml";
  let xml = read(rel);
  const loc = `${SITE}/home.html`;
  if (xml.includes(`<loc>${loc}</loc>`)) return;

  const rootBlock = /<url>\s*<loc>https:\/\/www\.cheekycommodoregamer\.co\.uk\/<\/loc>[\s\S]*?<\/url>/;
  const match = xml.match(rootBlock);
  if (!match) throw new Error(`${rel}: root URL block not found`);
  const homeBlock = `\n  <url>\n    <loc>${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n  </url>`;
  xml = xml.replace(match[0], `${match[0]}${homeBlock}`);
  write(rel, xml);
}

function walkHtml(rootRel) {
  const root = file(rootRel);
  if (!fs.existsSync(root)) return [];
  const results = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && entry.name.endsWith(".html")) results.push(full);
    }
  };
  visit(root);
  return results;
}

function patchSocialCards() {
  const roots = [
    "games/genres",
    "games/collections",
    "games/publishers",
    "games/developers",
    "games/platforms",
    "games/years",
  ];

  let changed = 0;
  for (const root of roots) {
    for (const full of walkHtml(root)) {
      let html = fs.readFileSync(full, "utf8");
      if (!html.includes('property="og:title"')) continue;
      const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
      if (!canonical || !canonical[1].startsWith(SITE)) continue;
      const url = canonical[1];
      const before = html;

      if (!html.includes('property="og:site_name"')) {
        html = html.replace(
          /(<meta property="og:type"[^>]*>)/i,
          `$1\n  <meta property="og:site_name" content="Cheeky Commodore Gamer">`
        );
      }
      if (!html.includes('property="og:url"')) {
        html = html.replace(
          /(<meta property="og:site_name"[^>]*>)/i,
          `$1\n  <meta property="og:url" content="${url}">`
        );
      }
      if (!html.includes('property="og:image"')) {
        html = html.replace(
          /(<meta property="og:url"[^>]*>)/i,
          `$1\n  <meta property="og:image" content="${SOCIAL_IMAGE}">`
        );
      }
      if (!html.includes('name="twitter:image"')) {
        html = html.replace(
          /(<meta name="twitter:description"[^>]*>)/i,
          `$1\n  <meta name="twitter:image" content="${SOCIAL_IMAGE}">`
        );
      }

      if (html !== before) {
        fs.writeFileSync(full, html, "utf8");
        changed += 1;
      }
    }
  }
  console.log(`[public-growth-seo] added persistent social-card metadata to ${changed} browse pages`);
}

function extractRetroVideo(html, rel) {
  const match = html.match(/<script type="application\/ld\+json" data-ccg-schema="retro-video">\s*([\s\S]*?)\s*<\/script>/i);
  if (!match) throw new Error(`${rel}: retro-video JSON-LD not found`);
  return JSON.parse(match[1]);
}

function retroDiscoverySection(slug, video) {
  const clips = Array.isArray(video.hasPart) ? video.hasPart : [];
  let selected = clips.filter((clip) => /^#\d+\s/.test(String(clip.name || "")));
  if (!selected.length) {
    selected = clips.filter((clip) => !/^(intro|final|outro)/i.test(String(clip.name || "")));
  }

  const isAmiga = slug === "50-essential-amiga-games";
  const heading = isAmiga
    ? "The complete 50 Essential Amiga Games countdown"
    : "C64 vs ZX Spectrum: comparison chapters";
  const intro = isAmiga
    ? "Use the complete ranked list below to jump straight to any game in the video. This page is the permanent companion to the CCG countdown, with the wider Amiga archive available for further browsing."
    : "Jump directly to the individual comparisons from the video. This permanent companion page keeps the full feature together and links back into the wider Commodore 64 archive.";
  const archiveHref = isAmiga ? "/games/platforms/amiga/" : "/games/platforms/c64/";
  const archiveLabel = isAmiga ? "Browse the Amiga games archive" : "Browse the Commodore 64 games archive";

  const list = selected.map((clip) => {
    const name = escapeHtml(clip.name || "Chapter");
    const offset = Number.isFinite(Number(clip.startOffset)) ? Number(clip.startOffset) : 0;
    return `        <li><a href="?t=${offset}" data-ccg-video-seek="${offset}">${name}</a></li>`;
  }).join("\n");

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": heading,
    "itemListElement": selected.map((clip, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": String(clip.name || `Chapter ${index + 1}`),
      "url": `${SITE}/retro-specials/${slug}/?t=${Number(clip.startOffset) || 0}`,
    })),
  };

  return `\n<section class="ccg-growth-feature" data-ccg-public-growth="true" aria-labelledby="ccg-growth-heading">\n  <div class="ccg-growth-feature__inner">\n    <p class="ccg-growth-feature__eyebrow">CCG RETRO SPECIAL</p>\n    <h2 id="ccg-growth-heading">${heading}</h2>\n    <p>${intro}</p>\n    <ol class="ccg-growth-feature__list">\n${list}\n    </ol>\n    <nav class="ccg-growth-feature__links" aria-label="Explore more retro gaming">\n      <a href="${archiveHref}">${archiveLabel}</a>\n      <a href="/games/">Explore all C64 &amp; Amiga games</a>\n      <a href="/games/collections/retro-specials.html">More CCG Retro Specials</a>\n    </nav>\n  </div>\n</section>\n<script type="application/ld+json" data-ccg-schema="public-growth-item-list">${JSON.stringify(itemList)}</script>\n`;
}

function patchRetroSpecial(rel, slug) {
  let html = read(rel);
  if (html.includes('data-ccg-public-growth="true"')) return;
  const video = extractRetroVideo(html, rel);

  if (!html.includes('/resources/css/public-growth-seo.css')) {
    const marker = '<link rel="stylesheet" href="/resources/css/retro-video-discovery.css" />';
    html = replaceRequired(
      html,
      marker,
      `${marker}\n    <link rel="stylesheet" href="/resources/css/public-growth-seo.css" />`,
      rel
    );
  }

  if (!html.includes("</main>")) throw new Error(`${rel}: </main> marker not found`);
  html = html.replace("</main>", `${retroDiscoverySection(slug, video)}\n</main>`);
  write(rel, html);
}

function main() {
  patchHomepageSignals();
  patchSitemapGenerator();
  patchCurrentSitemap();
  patchSocialCards();
  patchRetroSpecial(
    "retro-specials/50-essential-amiga-games/index.html",
    "50-essential-amiga-games"
  );
  patchRetroSpecial(
    "retro-specials/c64-vs-zx-spectrum/index.html",
    "c64-vs-zx-spectrum"
  );
  console.log("[public-growth-seo] materialization complete");
}

main();
