/*
 * CCG game SEO snippets.
 * Shared by the canonical game-page generator and the admin publisher preview.
 * Copy only supplied editorial facts: do not invent mechanics, scores, release
 * history or video availability. Keep meta descriptions sentence-complete.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof window !== "undefined") root.CCGGameSeoSnippet = api;
})(typeof globalThis !== "undefined" ? globalThis : null, function () {
  "use strict";

  const DEFAULT_MAX_LENGTH = 155;
  const MIN_SENTENCE_LENGTH = 48;

  function normalize(value) {
    return String(value || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#(?:39|x27);|&apos;/gi, "'")
      .replace(/\s+/g, " ")
      .replace(/^[^\p{L}\p{N}]+/u, "")
      .trim();
  }

  function firstPublisher(game) {
    const raw = game && game.credits && game.credits.publisher || game && game.publisher || "";
    const value = Array.isArray(raw) ? raw[0] : raw;
    return normalize(String(value || "").split(",")[0]);
  }

  function platformLabel(game) {
    const raw = normalize(game && (game.system || game.platform)).toLowerCase();
    return raw.includes("amiga") ? "Amiga" : "Commodore 64";
  }

  function skipRedundantEditorialHeader(description, title) {
    if (!description || !title) return description;
    const opening = description.slice(0, title.length).toLowerCase();
    if (opening !== title.toLowerCase()) return description;
    const afterTitle = description.slice(title.length);
    if (!/^\s*(?:\(\d{4}\))?\s*[–—:-]/.test(afterTitle)) return description;

    const match = /\b(?:Originally\s+)?(?:Released|Published|Developed|Created)\s+(?:in|by|for)\b/i.exec(description);
    if (!match || match.index < title.length || match.index > 145) return description;
    const before = description.slice(0, match.index);
    if (/[.!?](?=\s|$)/.test(before)) return description;
    return description.slice(match.index);
  }

  function firstCompleteSentence(value, maxLength) {
    const text = normalize(value);
    const endings = /[.!?](?:[”"']?)(?=\s|$)/g;
    let match;
    while ((match = endings.exec(text)) !== null) {
      const end = endings.lastIndex;
      if (end < MIN_SENTENCE_LENGTH) continue;
      if (end > maxLength) return "";
      return text.slice(0, end).trim();
    }
    return text.length >= MIN_SENTENCE_LENGTH && text.length <= maxLength && /[.!?]$/.test(text)
      ? text
      : "";
  }

  function sourceFallback(game, title, maxLength) {
    const year = /^\d{4}$/.test(String(game && game.year || "").trim())
      ? String(game.year).trim()
      : "";
    const platform = platformLabel(game);
    const publisher = firstPublisher(game);
    const label = normalize(title) || "This game";
    const intro = label + (year ? " (" + year + ")" : "");
    const candidates = [
      intro + " is a " + platform + " game" + (publisher ? " published by " + publisher : "") + ".",
      intro + " on " + platform + "."
    ];
    return candidates.find((item) => item.length <= maxLength) || normalize(intro).slice(0, maxLength);
  }

  function buildSnippet(game, suppliedTitle, maxLength = DEFAULT_MAX_LENGTH) {
    const title = normalize(suppliedTitle || (game && game.title) || "Game");
    const limit = Math.max(80, Math.min(160, Number(maxLength) || DEFAULT_MAX_LENGTH));
    const raw = normalize(game && (game.description || game.desc));
    const editorial = skipRedundantEditorialHeader(raw, title);

    // The existing editorial review can supply an individual, complete fact.
    // Never truncate a clause and append an ellipsis as a substitute for copy.
    const sentence = firstCompleteSentence(editorial, limit);
    if (sentence) {
      if (sentence.toLowerCase().includes(title.toLowerCase())) return sentence;
      const withTitle = title + ": " + sentence;
      if (withTitle.length <= limit) return withTitle;
      return sentence;
    }

    return sourceFallback(game, title, limit);
  }

  return Object.freeze({
    buildSnippet,
    firstCompleteSentence,
    platformLabel,
    skipRedundantEditorialHeader
  });
});
