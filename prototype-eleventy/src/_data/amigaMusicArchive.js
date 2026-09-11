import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import collectionArchive from "./collectionArchive.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const eventSourcePath = path.resolve(here, "../../../games/collections/retro-events.json");
const eventSource = JSON.parse(fs.readFileSync(eventSourcePath, "utf8"));

if (!Array.isArray(eventSource)) {
  throw new Error("[ccg-eleventy] Amiga Demo Music source must be an array.");
}

const gatewayEntries = collectionArchive.amigaDemoMusic?.entries || [];
const musicRecords = eventSource
  .filter((entry) => entry && typeof entry === "object" && entry.type === "demo_music")
  .map((entry) => ({
    id: typeof entry.id === "string" ? entry.id.trim() : "",
    youtubeId: typeof entry.youtubeId === "string" ? entry.youtubeId.trim() : "",
    youtubeUrl: typeof entry.url === "string" ? entry.url.trim() : "",
    membersOnly: entry.membersOnly === true,
    order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : null
  }))
  .filter((entry) => entry.id && entry.youtubeId && entry.youtubeUrl)
  .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

if (!gatewayEntries.length || gatewayEntries.length !== musicRecords.length) {
  throw new Error(
    `[ccg-eleventy] Amiga Demo Music route/video source mismatch: ${gatewayEntries.length} gateway routes and ${musicRecords.length} demo records.`
  );
}

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractTitle(html, sourceFile) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!match) throw new Error(`[ccg-eleventy] Missing <title> in ${sourceFile}.`);
  return decodeHtml(match[1].trim());
}

function extractMeta(html, attribute, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrMatch = tag.match(new RegExp(`\\b${attribute}=["']([^"']+)["']`, "i"));
    if (!attrMatch || attrMatch[1] !== key) continue;
    const contentMatch = tag.match(/\bcontent=["']([^"']*)["']/i);
    return contentMatch ? decodeHtml(contentMatch[1].trim()) : "";
  }
  return "";
}

function extractCanonical(html) {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of links) {
    if (!/\brel=["']canonical["']/i.test(tag)) continue;
    const match = tag.match(/\bhref=["']([^"']+)["']/i);
    if (match) return decodeHtml(match[1].trim());
  }
  return "";
}

function extractSchemas(html, sourceFile) {
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const schemas = scripts.map((match) => {
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      throw new Error(`[ccg-eleventy] Invalid JSON-LD in ${sourceFile}: ${error.message}`);
    }
  });

  const video = schemas.find((schema) => schema && schema["@type"] === "VideoObject");
  const breadcrumb = schemas.find((schema) => schema && schema["@type"] === "BreadcrumbList");

  if (!video || !breadcrumb) {
    throw new Error(`[ccg-eleventy] ${sourceFile} must contain VideoObject and BreadcrumbList JSON-LD.`);
  }

  return { video, breadcrumb };
}

function assertSourceSeo(entry, sourceFile) {
  const required = [
    ["page title", entry.pageTitle],
    ["description", entry.description],
    ["canonical", entry.canonical],
    ["Open Graph image", entry.ogImage],
    ["Open Graph video", entry.ogVideo],
    ["VideoObject name", entry.videoSchema?.name],
    ["VideoObject uploadDate", entry.videoSchema?.uploadDate],
    ["VideoObject duration", entry.videoSchema?.duration]
  ];

  const missing = required.filter(([, value]) => !value).map(([label]) => label);
  if (missing.length) {
    throw new Error(`[ccg-eleventy] ${sourceFile} is missing required SEO fields: ${missing.join(", ")}.`);
  }
}

const entries = gatewayEntries.map((entry, index) => {
  const record = musicRecords[index];
  const routeMatch = entry.url.match(/^\/amiga-demo-music\/([^/]+)\/$/);

  if (!routeMatch) {
    throw new Error(`[ccg-eleventy] Invalid Amiga Demo Music route: ${entry.url}`);
  }

  const slug = routeMatch[1];
  const sourceFile = path.resolve(here, `../../../amiga-demo-music/${slug}/index.html`);
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`[ccg-eleventy] Missing Amiga Demo Music source detail page: ${sourceFile}`);
  }

  const html = fs.readFileSync(sourceFile, "utf8");
  const { video, breadcrumb } = extractSchemas(html, sourceFile);

  if (video.embedUrl && !video.embedUrl.includes(record.youtubeId)) {
    throw new Error(
      `[ccg-eleventy] YouTube ID mismatch for ${slug}: archive has ${record.youtubeId}, source schema has ${video.embedUrl}.`
    );
  }

  const detail = {
    title: entry.title,
    url: entry.url,
    slug,
    youtubeId: record.youtubeId,
    youtubeUrl: record.youtubeUrl,
    membersOnly: record.membersOnly,
    order: record.order,
    pageTitle: extractTitle(html, sourceFile),
    description: extractMeta(html, "name", "description"),
    robots: extractMeta(html, "name", "robots") || "index,follow,max-video-preview:-1,max-image-preview:large,max-snippet:-1",
    canonical: extractCanonical(html),
    ogType: extractMeta(html, "property", "og:type") || "video.other",
    ogImage: extractMeta(html, "property", "og:image"),
    ogVideo: extractMeta(html, "property", "og:video"),
    twitterCard: extractMeta(html, "name", "twitter:card") || "summary_large_image",
    twitterSite: extractMeta(html, "name", "twitter:site") || "@CheekyC64Gamer",
    videoSchema: video,
    breadcrumbSchema: breadcrumb,
    videoSchemaJson: JSON.stringify(video),
    breadcrumbSchemaJson: JSON.stringify(breadcrumb)
  };

  assertSourceSeo(detail, sourceFile);

  const expectedCanonical = `https://www.cheekycommodoregamer.co.uk${entry.url}`;
  if (detail.canonical !== expectedCanonical) {
    throw new Error(
      `[ccg-eleventy] Canonical mismatch for ${slug}: expected ${expectedCanonical}, got ${detail.canonical}.`
    );
  }

  return detail;
});

function assertUnique(label, values) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) {
    throw new Error(`[ccg-eleventy] Amiga Demo Music duplicate ${label}: ${[...new Set(duplicates)].join(", ")}`);
  }
}

assertUnique("routes", entries.map((entry) => entry.url));
assertUnique("canonicals", entries.map((entry) => entry.canonical));
assertUnique("YouTube IDs", entries.map((entry) => entry.youtubeId));

export default {
  name: "Amiga Demo Music",
  description: "Classic Commodore Amiga demoscene music features preserved through the established Cheeky Commodore Gamer archive routes.",
  count: entries.length,
  entries
};
