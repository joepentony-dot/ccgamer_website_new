#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const HTML_PATH = path.join(ROOT, "games/collections/index.html");
const CSS_PATH = path.join(ROOT, "resources/css/collections-seo-layout.css");
const REDIRECTS_PATH = path.join(ROOT, "_redirects");
const problems = [];

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    problems.push(`Missing required file: ${path.relative(ROOT, filePath)}.`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

const html = read(HTML_PATH);
const css = read(CSS_PATH);
const redirects = read(REDIRECTS_PATH);

const requiredHtml = [
  ["<title>C64 &amp; Amiga Game Collections | Cheeky Commodore Gamer</title>", "Focused collections title is missing."],
  ['<meta name="robots" content="index,follow"', "Collections robots directive is missing."],
  ['href="https://www.cheekycommodoregamer.co.uk/games/collections/"', "Collections canonical URL is missing."],
  ['"@type": "CollectionPage"', "CollectionPage structured data is missing."],
  ['"@type": "BreadcrumbList"', "BreadcrumbList structured data is missing."],
  ['"@type": "ItemList"', "ItemList structured data is missing."],
  ['class="ccg-collections-breadcrumbs"', "Visible collections breadcrumbs are missing."],
  ['data-ccg-drawer-secondary', "Mobile drawer secondary hook is missing."],
  ['resources/css/collections-seo-layout.css', "Collections layout stylesheet is not loaded."],
  ['<h1 class="ccg-hero-title">Commodore 64 &amp; Amiga Game Collections</h1>', "Keyword-focused H1 is missing."]
];

requiredHtml.forEach(([needle, message]) => {
  if (!html.includes(needle)) problems.push(message);
});

const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
if (!titleMatch || titleMatch[1].replace(/&amp;/g, "&").length > 60) {
  problems.push("Collections title should remain at or below 60 characters.");
}

const descriptionMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
if (!descriptionMatch || descriptionMatch[1].length < 120 || descriptionMatch[1].length > 165) {
  problems.push("Collections meta description should remain between 120 and 165 characters.");
}

const jsonLdBlocks = Array.from(html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi));
if (!jsonLdBlocks.length) {
  problems.push("Collections JSON-LD block is missing.");
} else {
  jsonLdBlocks.forEach((match, index) => {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      problems.push(`Collections JSON-LD block ${index + 1} is invalid: ${error.message}`);
    }
  });
}

const cardMatches = Array.from(html.matchAll(/<a\s+href="([^"]+)"\s+class="ccg-card ccg-genre-card ccg-collection-card">([\s\S]*?)<\/a>/gi));
if (cardMatches.length !== 7) {
  problems.push(`Expected 7 collection cards, found ${cardMatches.length}.`);
}

cardMatches.forEach((match, index) => {
  const card = match[2];
  if (!/ccg-collection-card__title/.test(card)) problems.push(`Collection card ${index + 1} has no title element.`);
  if (!/ccg-collection-card__description/.test(card)) problems.push(`Collection card ${index + 1} has no descriptive text.`);
  if (!/<img[^>]+width="\d+"[^>]+height="\d+"[^>]+loading="(?:eager|lazy)"[^>]+decoding="async"/i.test(card)) {
    problems.push(`Collection card ${index + 1} image is missing stable dimensions or loading attributes.`);
  }
});

const requiredCss = [
  ".ccg-collections-breadcrumbs",
  ".ccg-collection-card__description",
  "grid-template-columns: repeat(12",
  ".ccg-collection-card:nth-child(n + 5)",
  "@media (max-width: 699px)"
];
requiredCss.forEach((needle) => {
  if (!css.includes(needle)) problems.push(`Missing collections layout rule: ${needle}.`);
});

if (!redirects.includes("/games/collections/index.html /games/collections/ 301!")) {
  problems.push("The collections index.html redirect to the canonical folder URL is missing.");
}

if (problems.length) {
  console.error("Collections index audit failed:");
  problems.forEach((problem) => console.error(` - ${problem}`));
  process.exit(1);
}

console.log("Collections index SEO and layout audit passed: 7 descriptive cards, structured data and canonical redirect verified.");
