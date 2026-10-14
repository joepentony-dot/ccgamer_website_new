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

  // Validate the editorial opening's platform before extracting any
  // platform-neutral gameplay sentence from later in a description.
  function wrongPlatformEditorial(description, game) {
    const lead = normalize(description).slice(0, 300);
    const saysC64 = /\b(?:Commodore 64|C64)\b/i.test(lead);
    const saysAmiga = /\bAmiga\b/i.test(lead);
    return platformLabel(game) === "Amiga"
      ? saysC64 && !saysAmiga
      : saysAmiga && !saysC64;
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

  function firstSentenceEnd(text, minLength = 0) {
    const endings = /[.!?](?:[”"']?)(?=\s|$)/g;
    let match;
    while ((match = endings.exec(text)) !== null) {
      const end = endings.lastIndex;
      // A single letter is an initial only when it belongs to a genuine
      // sequence (U. S. Gold, U.S. Gold, J. R. R. Tolkien), not when a
      // sentence really ends in "mode A." or in the title "H.E.R.O.".
      if (text.slice(Math.max(0, end - 3), end) === "...") continue;
      if (match[0][0] === ".") {
        const before = text.slice(0, end);
        const next = text.slice(end).trimStart();
        const run = before.match(/(?:^|\s)((?:[A-Z]\.\s*)+)[”"']?$/);
        const initials = run ? (run[1].match(/[A-Z]\./g) || []).length : 0;
        // Do not join a completed "mode A." to a new "B. Smith" sentence.
        // Protect only documented multi-initial publisher/author sequences.
        const moreInitials =
          (/(?:^|\s)U\.$/.test(before) && /^S\.\s*Gold\b/.test(next)) ||
          (/(?:^|\s)J\.$/.test(before) && /^R\.\s*R\.\s*Tolkien\b/.test(next)) ||
          (/(?:^|\s)J\.\s*R\.$/.test(before) && /^R\.\s*Tolkien\b/.test(next));
        // A capitalised word after "U.S." might begin a NEW sentence.
        // Retain only source-observed complete names, not arbitrary proper
        // nouns after a two-letter acronym (e.g. "U.S. Players...").
        const publisher = /(?:^|\s)U\.\s*S\.$/.test(before) && /^Gold\b/.test(next);
        const author = /(?:^|\s)J\.\s*R\.\s*R\.$/.test(before) && /^Tolkien\b/.test(next);
        // Keep initials within sourced names and spaced game acronyms together.
        // Terminal difficulty labels and finished acronym titles remain endings.
        const terminalLabel = /\b(?:mode|difficulty|level|setting|grade|option|type)\s+[A-Z]\.$/i.test(before);
        const terminalAcronym =
          /(?:H\.E\.R\.O\.|Chase\s+H\.Q\.|\bU\.S\.)$/.test(before) ||
          (/\bH\.\s*E\.\s*R\.\s*O\.$/.test(before) && !/^\(/.test(next));
        const anotherInitial = /^[A-Z]\.(?:\s|$)/.test(next);
        const namedContinuation = /^[A-Z][a-z][\p{L}'’\-]*/u.test(next);
        const possessiveOrRoman = /^['’]s\b|^[IVX]{1,3}(?:\b|:)|^\(/.test(next);
        const knownUS = /(?:^|\s)U\.\s*S\.$/.test(before) && /^(?:Army|Gold)\b/.test(next);
        if (initials && !terminalLabel && !terminalAcronym &&
            (anotherInitial || namedContinuation || possessiveOrRoman || knownUS)) continue;
        if (initials && (moreInitials || publisher || author ||
          (initials >= 2 && /^[a-z]/.test(next)))) continue;
      }
      if (end >= minLength) return end;
    }
    return -1;
  }

  function firstCompleteSentence(value, maxLength) {
    const text = normalize(value);
    const end = firstSentenceEnd(text, MIN_SENTENCE_LENGTH);
    if (end > maxLength) return "";
    if (end >= 0) return text.slice(0, end).trim();
    return text.length >= MIN_SENTENCE_LENGTH && text.length <= maxLength && /[.!?]$/.test(text) && !/(?:…|\.\.\.)$/.test(text)
      ? text
      : "";
  }

  /**
   * If an editorial opening is too long for a complete search snippet,
   * preserve the factual main clause after an introductory comma.
   * Example: "Released in 1986 by Publisher, Game is a puzzle adventure."
   * becomes "Game is a puzzle adventure." without inventing content.
   *
   * Restrict to the game title as the grammatical subject, so we never
   * publish a dangling clause or imply facts from unrelated text.
   */
  function conciseSubjectSentence(value, title, maxLength) {
    const text = normalize(value);
    const end = firstSentenceEnd(text);
    if (end < 0) return "";
    const sentence = text.slice(0, end).trim();
    const comma = sentence.indexOf(",");
    if (comma < 0 || comma > 190) return "";
    const candidate = sentence.slice(comma + 1).trim();
    const subject = normalize(title).toLowerCase();
    if (!subject || !candidate.toLowerCase().startsWith(subject)) return "";
    const remainder = candidate.slice(subject.length);
    if (!/\b(?:is|was|are|were|has|have|features|combines|takes|offers|delivers|arrived|stars)\b/i.test(remainder)) return "";
    if (candidate.length < MIN_SENTENCE_LENGTH || candidate.length > maxLength) return "";
    return candidate;
  }

  /**
   * Recover a self-contained, sourced gameplay detail when the long editorial
   * introduction cannot fit a complete snippet. Never manufacture a mechanic,
   * change a release year or slice an unfinished sentence. A title prefix
   * gives a later sentence context without rewriting its factual wording.
   */
  function editorialFollowupSentence(value, title, maxLength) {
    const text = normalize(value);
    const firstEnd = firstSentenceEnd(text);
    if (firstEnd < 0) return "";
    let tail = text.slice(firstEnd).trimStart();
    const candidates = [];
    const independentReplacements = [];
    let rejectedIncompleteSnippet = false;

    // Limit processing to nearby authored sentences, not unrelated material.
    for (let index = 1; index <= 10 && tail; index += 1) {
      const end = firstSentenceEnd(tail);
      if (end < 0) break;
      const sentence = tail.slice(0, end).trim();
      tail = tail.slice(end).trimStart();

      // Source copy may discuss older arcade originals, other computer
      // versions or contradictory regional years: do not promote those facts
      // automatically into this game's C64/Amiga search description.
      if (!/^[A-Z]/.test(sentence) ||
          sentence.length < 44 || sentence.length > maxLength ||
          /\b(?:18|19|20)\d{2}\b/.test(sentence) ||
          /\b(?:ZX Spectrum|Atari ST|Amstrad CPC|NES|PlayStation)\b/i.test(sentence) ||
          /https?:\/\/|www\./i.test(sentence) ||
          /…|\.\.\./.test(sentence)) continue;

      // Reject mismatched-person player-action claims without excluding
      // grammatical third-person objects such as "your crew ... their roles".
      const incoherentAction = /\byou\b[^.!?]*\b(?:fight\s+their\s+way|time\s+their\s+(?:movements|landings)|outgun\s+their\s+enemy)\b/i.test(sentence);
      if (incoherentAction) continue;

      // A title prefix cannot supply an omitted antecedent or turn the
      // author's review narration into a description of the game.
      const reviewNarration = /\b(?:in this (?:review|video)|I['’](?:m|ve|d)|we['’](?:re|ve|d)|(?:I|we) (?:am|are|was|were|revisit|review|compare|grew)|(?:my|our) (?:review|video|childhood))\b/i.test(sentence);
      const missingContext = /^(?:However|Nevertheless|Therefore|Consequently|These|Those|Such|They|This (?:means|also|makes|allows)|It (?:also|then))\b/i.test(sentence);
      if (reviewNarration || missingContext) {
        const prefixed = sentence.toLowerCase().includes(title.toLowerCase())
          ? sentence : title + ": " + sentence;
        if (prefixed.length <= maxLength) rejectedIncompleteSnippet = true;
        continue;
      }

      const titledCandidate = sentence.toLowerCase().includes(title.toLowerCase())
        ? sentence
        : title + ": " + sentence;
      // Replacing a rejected contextual snippet can use an independent fact
      // without a title prefix, as the opening-sentence path already does.
      // Keep the established title requirement for all other follow-ups.
      const titleFits = titledCandidate.length <= maxLength;
      const candidate = titleFits ? titledCandidate : sentence;
      if (!/[.!?]$/.test(candidate)) continue;

      const usefulSubject = /^(?:You|Players|Gameplay|Progress|Combat|Battles|Levels|The player|The game|The gameplay|Your|Each|Controls|Objectives|The objective|A standout|Its|The action|Using|Moving|There|The main)\b/i.test(sentence);
      const weakOpening = /^(?:The|This|It|A|An|Each|In|On|For|Between|As|While|When|After)\b/i.test(sentence);
      // A short sentence praising the game's style, or saying it demands
      // "careful planning", can crowd out a later sourced gameplay detail.
      // Penalise only those short generalisations; retain substantial
      // mechanics descriptions even when they start with "Gameplay".
      const shortVagueLead = sentence.length < 108 &&
        (/^(?:Its\b.*\b(?:theme|mechanics|appeal)|Progress (?:requires|depends on|relies on)|Gameplay (?:focuses on|is split between|alternates between|blends))\b/i.test(sentence) ||
         /\b(?:sets? it apart|couldn.t accuse|thoughtful strategy)\b/i.test(sentence));
      const nonPlayOpinion = /^(?:Its|The)\b.*\b(?:soundtrack|music|audio|visuals|presentation)\b/i.test(sentence);
      // A player action is stronger than a brief genre summary, but broad
      // mood/atmosphere statements must not displace mechanical details.
      const thematicOnly = /\b(?:atmosphere, mystery|horror themes|leans? heavily into atmosphere|shadowy realm)\b/i.test(sentence);
      const concreteMotion = /\b(?:hops?|levitates?|rescues?|fires?|bounces?|shoots?|jumps?)\b/i.test(sentence);
      const actionable = /\b(?:you (?:must|can)|players (?:must|can)|collect(?:s|ed|ing)?|rescue(?:s|d|ing)?|manipulat(?:e|es|ed|ing)|repair(?:s|ed|ing)?|unlock(?:s|ed|ing)?)\b/i.test(sentence);
      const score = (usefulSubject ? 10 : 0) - (weakOpening ? 2 : 0) - index / 10
        - (shortVagueLead ? 10 : 0) - (nonPlayOpinion ? 7 : 0) - (thematicOnly ? 8 : 0) + (concreteMotion ? 4 : 0) + (actionable ? 2 : 0);
      (titleFits ? candidates : independentReplacements).push({ text: candidate, score });
    }

    if (rejectedIncompleteSnippet) candidates.push(...independentReplacements);
    candidates.sort((a, b) => b.score - a.score);
    return candidates.length ? candidates[0].text : "";
  }

  function sourceFallback(game, title, maxLength) {
    const year = /^\d{4}$/.test(String(game && game.year || "").trim())
      ? String(game.year).trim()
      : "";
    const platform = platformLabel(game);
    const article = platform === "Amiga" ? "an" : "a";
    const publisher = firstPublisher(game).replace(/\.+$/, "");
    const label = normalize(title) || "This game";
    const intro = label + (year ? " (" + year + ")" : "");
    const candidates = [
      intro + " is " + article + " " + platform + " game" + (publisher ? " published by " + publisher : "") + ".",
      intro + " on " + platform + "."
    ];
    return candidates.find((item) => item.length <= maxLength) || normalize(intro).slice(0, maxLength);
  }

  function buildSnippet(game, suppliedTitle, maxLength = DEFAULT_MAX_LENGTH) {
    const title = normalize(suppliedTitle || (game && game.title) || "Game");
    const limit = Math.max(80, Math.min(160, Number(maxLength) || DEFAULT_MAX_LENGTH));
    const raw = normalize(game && (game.description || game.desc));
    if (wrongPlatformEditorial(raw, game)) return sourceFallback(game, title, limit);
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

    const concise = conciseSubjectSentence(editorial, title, limit);
    if (concise) return concise;

    // Prefer a complete, specific statement from the author's existing
    // description to the generic title/year/publisher-only fallback.
    const followup = editorialFollowupSentence(editorial, title, limit);
    if (followup) return followup;

    return sourceFallback(game, title, limit);
  }

  return Object.freeze({
    buildSnippet,
    firstCompleteSentence,
    platformLabel,
    skipRedundantEditorialHeader
  });
});
