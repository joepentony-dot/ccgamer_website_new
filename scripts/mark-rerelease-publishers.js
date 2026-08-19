#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { slugifyPublisher } = require("./publisher-utils");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");
const publishersDir = path.join(repoRoot, "games", "publishers");
const indexPath = path.join(publishersDir, "index.html");
const STYLE_HREF = "/resources/css/publisher-rerelease.css";
const STYLE_MARKUP = `<link rel="stylesheet" href="${STYLE_HREF}">`;

function toList(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function ensureStylesheet(html) {
  if (html.includes(`href="${STYLE_HREF}"`)) return html;
  const anchor = '<link rel="stylesheet" href="/resources/css/publishers.css">';
  if (html.includes(anchor)) return html.replace(anchor, `${anchor}\n    ${STYLE_MARKUP}`);
  return html.replace("</head>", `    ${STYLE_MARKUP}\n</head>`);
}

function collectRoles(games) {
  const primary = new Set();
  const rerelease = new Set();

  for (const game of Array.isArray(games) ? games : []) {
    const publisherValues = toList(game?.credits?.publisher).length
      ? toList(game?.credits?.publisher)
      : toList(game?.publisher);
    const rereleaseValues = toList(game?.credits?.re_releaser || game?.credits?.reReleaser);

    publisherValues.forEach((value) => {
      const slug = slugifyPublisher(value);
      if (slug) primary.add(slug);
    });
    rereleaseValues.forEach((value) => {
      const slug = slugifyPublisher(value);
      if (slug) rerelease.add(slug);
    });
  }

  return new Set(Array.from(rerelease).filter((slug) => !primary.has(slug)));
}

function markIndexCard(html, slug) {
  const href = `href="/games/publishers/${slug}/"`;
  let cursor = 0;
  let changed = false;

  while (cursor < html.length) {
    const hrefIndex = html.indexOf(href, cursor);
    if (hrefIndex === -1) break;
    const anchorStart = html.lastIndexOf("<a ", hrefIndex);
    const anchorEnd = html.indexOf("</a>", hrefIndex);
    if (anchorStart === -1 || anchorEnd === -1) break;
    const block = html.slice(anchorStart, anchorEnd + 4);
    if (!block.includes("ccg-publisher-card__link") || block.includes("ccg-publisher-role-badge")) {
      cursor = anchorEnd + 4;
      continue;
    }

    const nextBlock = block.replace(
      /(<h3 class="ccg-publisher-card__title">[\s\S]*?)(<\/h3>)/i,
      '$1<span class="ccg-publisher-role-badge">Re-Release</span>$2'
    );
    if (nextBlock !== block) {
      html = html.slice(0, anchorStart) + nextBlock + html.slice(anchorEnd + 4);
      changed = true;
      cursor = anchorStart + nextBlock.length;
    } else {
      cursor = anchorEnd + 4;
    }
  }

  return { html, changed };
}

function markPublisherPage(html) {
  if (html.includes("ccg-publisher-role-badge")) return html;
  const title = /<h1 class="ccg-publishers-hero__title">[\s\S]*?<\/h1>/i;
  return html.replace(title, (match) => `${match}\n                <span class="ccg-publisher-role-badge">Re-Release</span>`);
}

function main() {
  const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
  const rereleaseOnly = collectRoles(games);
  let indexHtml = ensureStylesheet(fs.readFileSync(indexPath, "utf8"));
  let indexChanged = false;
  let pageCount = 0;

  for (const slug of rereleaseOnly) {
    const cardResult = markIndexCard(indexHtml, slug);
    indexHtml = cardResult.html;
    indexChanged = indexChanged || cardResult.changed;

    const pagePath = path.join(publishersDir, slug, "index.html");
    if (!fs.existsSync(pagePath)) continue;
    const original = fs.readFileSync(pagePath, "utf8");
    const next = markPublisherPage(ensureStylesheet(original));
    if (next !== original) {
      fs.writeFileSync(pagePath, next, "utf8");
      pageCount += 1;
    }
  }

  if (indexChanged || !fs.readFileSync(indexPath, "utf8").includes(`href="${STYLE_HREF}"`)) {
    fs.writeFileSync(indexPath, indexHtml, "utf8");
  }

  console.log(`[publisher-rerelease] Dedicated re-release labels found: ${rereleaseOnly.size}`);
  console.log(`[publisher-rerelease] Publisher pages marked: ${pageCount}`);
  console.log(`[publisher-rerelease] Labels: ${Array.from(rereleaseOnly).sort().join(", ") || "none"}`);
}

if (require.main === module) main();

module.exports = { collectRoles, markIndexCard, markPublisherPage };
