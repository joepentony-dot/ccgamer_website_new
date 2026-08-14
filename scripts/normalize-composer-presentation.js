#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const metadataPath = path.join(repoRoot, "music", "composers", "composers.json");
const runtimeSrc = "/js/composer-presentation-runtime.js";

function fail(message) {
  console.error(`[composer-presentation] ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
  }
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textOnly(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ0-9])/u).map((item) => item.trim()).filter(Boolean);
}

function isResearchProcessSentence(sentence) {
  const value = String(sentence || "");
  return /\bprecise public birth date\b/i.test(value)
    || /\bintentionally omitted\b/i.test(value)
    || /\bpublished sources? (?:disagree|conflict)\b/i.test(value)
    || /\breliable biographical sources?\b/i.test(value)
    || /\breliable public birth details?\b/i.test(value)
    || /\bpublic (?:personal )?biographical (?:information|material)\b/i.test(value)
    || /\bsurviving public biographical information\b/i.test(value)
    || /\bpublic personal information\b/i.test(value)
    || /\bprofile (?:is|was) (?:based|deliberately|intentionally)\b/i.test(value)
    || /\bprofile (?:concentrates|focuses|avoids)\b/i.test(value)
    || /\bpreserved game-credit records\b/i.test(value);
}

function hasBirthUncertainty(value) {
  const text = String(value || "");
  return /\bbirth(?: year| date| details?)?\b[^.!?]*(?:not (?:been )?established|not readily available|disagree|conflict|intentionally omitted|uncertain)/i.test(text)
    || /(?:disagree|conflict)[^.!?]*\bbirth(?: year| date)?\b/i.test(text)
    || /\bprecise public birth date\b/i.test(text);
}

function replaceArchiveLanguage(value) {
  let text = String(value || "");
  text = text
    .replace(/\bThe Cheeky Commodore Gamer archive links (?:him|her|them) to\b/gi, "Game credits include")
    .replace(/\bThe CCG archive links (?:him|her|them) to\b/gi, "Game credits include")
    .replace(/\bThe Cheeky Commodore Gamer archive records (?:his|her|their) music on\b/gi, "Game-music credits include")
    .replace(/\bThe CCG archive records (?:his|her|their) music on\b/gi, "Game-music credits include")
    .replace(/\bHis CCG-linked music credits include\b/gi, "His game-music credits include")
    .replace(/\bHis CCG-linked credits include\b/gi, "His game credits include")
    .replace(/\bHis CCG music credits include\b/gi, "His game-music credits include")
    .replace(/\bHis CCG credits include\b/gi, "His game credits include")
    .replace(/\bwith CCG-linked credits including\b/gi, "with game credits including")
    .replace(/\bCCG-linked credits including\b/gi, "game credits including")
    .replace(/\bCCG-linked credits include\b/gi, "game credits include")
    .replace(/\bthe CCG archive\b/gi, "the game catalogue")
    .replace(/\bthe Cheeky Commodore Gamer archive\b/gi, "the game catalogue")
    .replace(/\bin the CCG (?:C64 |Amiga )?archive\b/gi, "")
    .replace(/\bin the Cheeky Commodore Gamer (?:C64 |Amiga )?archive\b/gi, "")
    .replace(/\brepresented in the CCG (?:C64 |Amiga )?archive\b/gi, "")
    .replace(/\brepresented in the Cheeky Commodore Gamer (?:C64 |Amiga )?archive\b/gi, "")
    .replace(/\bthe CCG profile\b/gi, "this profile")
    .replace(/\bCCG archive\b/gi, "game catalogue")
    .replace(/\bCheeky Commodore Gamer archive\b/gi, "game catalogue")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  return text;
}

function sanitizeBiography(value) {
  const original = String(value || "").replace(/\s+/g, " ").trim();
  const removeBirth = hasBirthUncertainty(original);
  const replaced = replaceArchiveLanguage(original);
  const sentences = splitSentences(replaced).filter((sentence) => !isResearchProcessSentence(sentence));
  const text = sentences.join(" ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { text, removeBirth };
}

function sanitizeMetaDescription(value) {
  let text = replaceArchiveLanguage(value)
    .replace(/\bsource references\b/gi, "")
    .replace(/\bwith source references\b/gi, "")
    .replace(/\band source references\b/gi, "")
    .replace(/\s+,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();

  const cleaned = sanitizeBiography(text).text || text;
  text = cleaned.replace(/\s{2,}/g, " ").trim();
  if (text && !/[.!?…]$/.test(text)) text += ".";
  if (text.length <= 158) return text;
  return `${text.slice(0, 155).replace(/[\s,;:.!-]+$/g, "")}…`;
}

function firstGameTitle(html) {
  const match = String(html || "").match(/<span\s+class="ccg-composer-game-title">([\s\S]*?)<\/span>/i);
  return match ? textOnly(match[1]) : "";
}

function replaceMeta(html, selectorPattern, attribute, value) {
  const escaped = htmlEscape(value);
  return html.replace(selectorPattern, (tag) => {
    const attrPattern = new RegExp(`${attribute}\\s*=\\s*(["'])(.*?)\\1`, "i");
    if (attrPattern.test(tag)) return tag.replace(attrPattern, `${attribute}="${escaped}"`);
    return tag.replace(/>$/, ` ${attribute}="${escaped}">`);
  });
}

function sanitizeProfileBiographies(html) {
  let removeBirth = false;
  const next = String(html || "").replace(
    /<p\b([^>]*\bclass\s*=\s*(["'])[^"']*\bccg-composer-profile__bio\b[^"']*\2[^>]*)>([\s\S]*?)<\/p>/gi,
    (full, attrs, quote, inner) => {
      const result = sanitizeBiography(textOnly(inner));
      if (result.removeBirth) removeBirth = true;
      if (!result.text) return "";
      return `<p${attrs}>${htmlEscape(result.text)}</p>`;
    }
  );
  return { html: next, removeBirth };
}

function removeProfileFactline(html, label) {
  const pattern = new RegExp(
    `<p\\b[^>]*class\\s*=\\s*(["'])[^"']*\\bccg-composer-profile__factline\\b[^"']*\\1[^>]*>\\s*<strong>${label}:<\\/strong>[\\s\\S]*?<\\/p>`,
    "i"
  );
  return html.replace(pattern, "");
}

function normalizeJsonLd(html, name, removeBirth) {
  return String(html || "").replace(
    /<script\b([^>]*type\s*=\s*(["'])application\/ld\+json\2[^>]*)>([\s\S]*?)<\/script>/gi,
    (full, attrs, quote, jsonText) => {
      let schema;
      try {
        schema = JSON.parse(jsonText.trim());
      } catch {
        return full;
      }

      const updateEntity = (entity) => {
        if (!entity || typeof entity !== "object") return;
        if (entity["@type"] === "CollectionPage") {
          entity.name = `${name} game music`;
          entity.description = `Music, soundtrack and game-audio information for ${name}, with linked releases and playable tracks where available.`;
        }
        if (entity["@type"] === "ItemList") {
          entity.name = `${name} game music and soundtrack entries`;
        }
        if (entity["@type"] === "Person" || entity["@type"] === "MusicGroup") {
          if (typeof entity.description === "string") {
            const cleaned = sanitizeBiography(entity.description);
            if (cleaned.text) entity.description = cleaned.text;
            else delete entity.description;
            if (cleaned.removeBirth) removeBirth = true;
          }
          if (removeBirth) delete entity.birthDate;
        }
      };

      if (Array.isArray(schema?.["@graph"])) schema["@graph"].forEach(updateEntity);
      else updateEntity(schema);

      return `<script${attrs}>\n${JSON.stringify(schema, null, 2).replace(/</g, "\\u003c")}\n</script>`;
    }
  );
}

function injectRuntime(html) {
  if (String(html || "").includes(runtimeSrc)) return html;
  const script = '<script src="/js/music-composer-pages.js" defer></script>';
  if (!html.includes(script)) return html;
  return html.replace(script, `${script}\n  <script src="${runtimeSrc}" defer></script>`);
}

function normalizeComposerHtml(html, route) {
  const name = String(route?.name || "Composer").trim() || "Composer";
  let next = String(html || "");

  const bioResult = sanitizeProfileBiographies(next);
  next = bioResult.html;
  let removeBirth = bioResult.removeBirth;

  next = next
    .replace(/\s*<p\b[^>]*class\s*=\s*(["'])[^"']*\bccg-composer-profile__platform\b[^"']*\1[^>]*>[\s\S]*?<\/p>/gi, "")
    .replace(/\s*<p\b[^>]*class\s*=\s*(["'])[^"']*\bccg-composer-profile__facts\b[^"']*\1[^>]*>[\s\S]*?<\/p>/gi, "")
    .replace(/\s*<p\b[^>]*class\s*=\s*(["'])[^"']*\bccg-composer-subtitle\b[^"']*\1[^>]*>[\s\S]*?<\/p>/gi, "")
    .replace(
      /<h1\b([^>]*class\s*=\s*(["'])[^"']*\bccg-composer-title\b[^"']*\2[^>]*)>[\s\S]*?<\/h1>/i,
      `<h1$1>${htmlEscape(name)} — Game Music</h1>`
    )
    .replace(
      /<p\b([^>]*class\s*=\s*(["'])[^"']*\bccg-composer-intro\b[^"']*\2[^>]*)>[\s\S]*?<\/p>/i,
      `<p$1>Explore music, soundtracks and audio work by ${htmlEscape(name)}, with linked game pages and playable tracks where available.</p>`
    )
    .replace(
      /<h2\b([^>]*class\s*=\s*(["'])[^"']*\bccg-composer-section-title\b[^"']*\2[^>]*)>\s*(?:Games featuring|Games matching)[\s\S]*?<\/h2>/i,
      `<h2$1>${htmlEscape(name)} Music</h2>`
    )
    .replace(/No linked game credits are currently recorded for ([^.<]+)\./gi, "No music entries are currently available for $1.")
    .replace(/No linked games found for ([^.<]+) yet\./gi, "No music entries are currently available for $1 yet.");

  if (removeBirth) next = removeProfileFactline(next, "Born");

  const hasBio = /\bccg-composer-profile__bio\b/i.test(next);
  const title = hasBio
    ? `${name} — Video Game Music & Biography | Cheeky Commodore Gamer`
    : `${name} — Video Game Music & Soundtrack Credits | Cheeky Commodore Gamer`;

  next = next.replace(/<title>[\s\S]*?<\/title>/i, `<title>${htmlEscape(title)}</title>`);
  next = replaceMeta(next, /<meta\b[^>]*name\s*=\s*(["'])description\1[^>]*>/i, "content", (() => {
    const existingTag = next.match(/<meta\b[^>]*name\s*=\s*(["'])description\1[^>]*>/i)?.[0] || "";
    const existing = decodeHtml(existingTag.match(/content\s*=\s*(["'])(.*?)\1/i)?.[2] || "");
    const cleaned = sanitizeMetaDescription(existing);
    if (cleaned && !/\blinked game credits?\b/i.test(cleaned)) return cleaned;
    const game = firstGameTitle(next);
    return sanitizeMetaDescription(game
      ? `${name} video game music and soundtrack information, including ${game}, with linked game pages and playable tracks where available.`
      : `${name} video game music and soundtrack information, with linked game pages and playable tracks where available.`);
  })());

  const metaDescriptionTag = next.match(/<meta\b[^>]*name\s*=\s*(["'])description\1[^>]*>/i)?.[0] || "";
  const description = decodeHtml(metaDescriptionTag.match(/content\s*=\s*(["'])(.*?)\1/i)?.[2] || "");
  next = replaceMeta(next, /<meta\b[^>]*property\s*=\s*(["'])og:title\1[^>]*>/i, "content", title);
  next = replaceMeta(next, /<meta\b[^>]*name\s*=\s*(["'])twitter:title\1[^>]*>/i, "content", title);
  if (description) {
    next = replaceMeta(next, /<meta\b[^>]*property\s*=\s*(["'])og:description\1[^>]*>/i, "content", description);
    next = replaceMeta(next, /<meta\b[^>]*name\s*=\s*(["'])twitter:description\1[^>]*>/i, "content", description);
  }

  next = normalizeJsonLd(next, name, removeBirth);
  next = injectRuntime(next);
  return next;
}

function normalizeAllComposerPages() {
  if (!fs.existsSync(metadataPath)) fail("music/composers/composers.json is missing");
  const metadata = readJson(metadataPath);
  if (!Array.isArray(metadata)) fail("Composer metadata must be an array");

  let checked = 0;
  let changed = 0;
  for (const route of metadata) {
    if (!route || !route.slug || !route.name) continue;
    const filePath = path.join(repoRoot, "music", route.slug, "index.html");
    if (!fs.existsSync(filePath)) continue;
    checked += 1;
    const html = fs.readFileSync(filePath, "utf8");
    if (!/data-ccg-page\s*=\s*(["'])music-composer\1/i.test(html)) continue;
    const next = normalizeComposerHtml(html, route);
    if (next !== html) {
      fs.writeFileSync(filePath, next, "utf8");
      changed += 1;
    }
  }

  console.log(JSON.stringify({ composerPagesChecked: checked, composerPagesNormalized: changed }, null, 2));
  return { checked, changed };
}

if (require.main === module) normalizeAllComposerPages();

module.exports = {
  hasBirthUncertainty,
  isResearchProcessSentence,
  normalizeAllComposerPages,
  normalizeComposerHtml,
  replaceArchiveLanguage,
  sanitizeBiography,
  sanitizeMetaDescription
};
