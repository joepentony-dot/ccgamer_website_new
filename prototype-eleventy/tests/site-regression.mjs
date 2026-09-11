import fs from "node:fs";
import path from "node:path";

const outputRoot = path.resolve("_site");
const productionOrigin = "https://www.cheekycommodoregamer.co.uk";
const sitemapPath = path.join(outputRoot, "sitemap.xml");

function fail(message) {
  throw new Error(`[ccg-eleventy regression] ${message}`);
}

function htmlPathForUrl(url) {
  const parsed = new URL(url);
  if (parsed.origin !== productionOrigin) {
    fail(`Unexpected sitemap origin: ${url}`);
  }

  const pathname = decodeURIComponent(parsed.pathname);
  if (pathname === "/") return path.join(outputRoot, "index.html");
  if (pathname.endsWith("/")) {
    return path.join(outputRoot, pathname.slice(1), "index.html");
  }
  return path.join(outputRoot, pathname.slice(1));
}

function extractAttribute(tag, attribute) {
  const match = tag.match(new RegExp(`\\b${attribute}=["']([^"']+)["']`, "i"));
  return match ? match[1] : "";
}

function assertLocalAssetExists(reference, ownerPath) {
  if (!reference || !reference.startsWith("/") || reference.startsWith("//")) return;
  const clean = reference.split(/[?#]/, 1)[0];
  const assetPath = path.join(outputRoot, decodeURIComponent(clean).replace(/^\/+/, ""));
  if (!fs.existsSync(assetPath)) {
    fail(`Missing local asset ${reference} referenced by ${path.relative(outputRoot, ownerPath)}`);
  }
}

if (!fs.existsSync(sitemapPath)) fail("Missing generated sitemap.xml.");
const sitemap = fs.readFileSync(sitemapPath, "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());

if (urls.length < 100) {
  fail(`Sitemap coverage is unexpectedly small (${urls.length} URLs).`);
}

const duplicateUrls = urls.filter((url, index) => urls.indexOf(url) !== index);
if (duplicateUrls.length) {
  fail(`Duplicate sitemap URLs: ${[...new Set(duplicateUrls)].join(", ")}`);
}

let checkedAssets = 0;
for (const url of urls) {
  const filePath = htmlPathForUrl(url);
  if (!fs.existsSync(filePath)) {
    fail(`Sitemap URL has no generated output: ${url}`);
  }

  if (path.extname(filePath) && !filePath.endsWith(".html")) continue;
  const html = fs.readFileSync(filePath, "utf8");
  const relativePath = path.relative(outputRoot, filePath);

  const canonicalTag = (html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i) || [])[0] ||
    (html.match(/<link\b[^>]*href=["'][^"']+["'][^>]*rel=["']canonical["'][^>]*>/i) || [])[0];
  if (!canonicalTag) fail(`Missing canonical link in ${relativePath}.`);
  const canonical = extractAttribute(canonicalTag, "href");
  if (canonical !== url) {
    fail(`Canonical mismatch in ${relativePath}: expected ${url}, got ${canonical || "<empty>"}.`);
  }

  if (!/<meta\b[^>]*name=["']description["'][^>]*content=["'][^"']+["'][^>]*>/i.test(html) &&
      !/<meta\b[^>]*content=["'][^"']+["'][^>]*name=["']description["'][^>]*>/i.test(html)) {
    fail(`Missing non-empty meta description in ${relativePath}.`);
  }

  for (const marker of [
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    'href="#main-content"',
    'aria-label="Primary navigation"',
    'id="main-content"'
  ]) {
    if (!html.includes(marker)) fail(`Missing shell invariant ${marker} in ${relativePath}.`);
  }

  if (!/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html)) {
    fail(`Missing H1 in ${relativePath}.`);
  }

  if (/\b(?:undefined|NaN)\b/.test(html)) {
    fail(`Unresolved generated value detected in ${relativePath}.`);
  }

  const stylesheetTags = html.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi) || [];
  for (const tag of stylesheetTags) {
    assertLocalAssetExists(extractAttribute(tag, "href"), filePath);
    checkedAssets += 1;
  }

  const imageTags = html.match(/<img\b[^>]*>/gi) || [];
  for (const tag of imageTags) {
    const src = extractAttribute(tag, "src");
    assertLocalAssetExists(src, filePath);
    if (src.startsWith("/")) checkedAssets += 1;
    if (!extractAttribute(tag, "alt")) {
      fail(`Image without non-empty alt text in ${relativePath}: ${tag}`);
    }
  }
}

const homeAlias = path.join(outputRoot, "home.html");
if (!fs.existsSync(homeAlias)) fail("Established /home.html compatibility route is missing.");
const homeAliasHtml = fs.readFileSync(homeAlias, "utf8");
const homeCanonicalTag = (homeAliasHtml.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i) || [])[0] ||
  (homeAliasHtml.match(/<link\b[^>]*href=["'][^"']+["'][^>]*rel=["']canonical["'][^>]*>/i) || [])[0];
if (!homeCanonicalTag || extractAttribute(homeCanonicalTag, "href") !== `${productionOrigin}/home.html`) {
  fail("/home.html must retain the established production /home.html canonical.");
}

const redirectsPath = path.join(outputRoot, "_redirects");
if (!fs.existsSync(redirectsPath)) fail("Prototype redirect manifest is missing.");
const redirectLines = fs.readFileSync(redirectsPath, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));
if (redirectLines.length !== 7 || redirectLines.some((line) => !/\s301$/.test(line))) {
  fail(`Expected exactly seven proven 301 aliases; found ${redirectLines.length}.`);
}

console.log(`Regression validation passed for ${urls.length} canonical URLs and ${checkedAssets} local asset references.`);
