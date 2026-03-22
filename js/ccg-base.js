(() => {
  "use strict";

  const SITE_BASE_URL = "https://www.cheekycommodoregamer.co.uk";
  const ROMAN_TO_DIGIT = Object.freeze({
    i: "1",
    ii: "2",
    iii: "3",
    iv: "4",
    v: "5",
    vi: "6",
    vii: "7",
    viii: "8",
    ix: "9",
    x: "10"
  });
  const ROMAN_TOKEN_REGEX = /(^|[-\s])(i{1,3}|iv|v|vi{0,3}|ix|x)(?=$|[-\s])/g;

  const stubScript = Array.from(document.querySelectorAll("script:not([src])")).find(
    (script) => script.textContent.includes("history.replaceState") && script.textContent.includes("/games/")
  );

  if (!stubScript) {
    return;
  }

  const replaceStateMatch = stubScript.textContent.match(/history\.replaceState\([^)]*"\/games\/([^/]+)\/"\)/);
  const slugFromReplaceState = replaceStateMatch ? replaceStateMatch[1] : "";
  const slugFromPath = window.location.pathname.match(/^\/games\/([^/]+)\/?$/)?.[1] ?? "";
  const slug = slugFromPath || slugFromReplaceState;

  if (!slug) {
    return;
  }

  const prettyUrl = `${SITE_BASE_URL}/games/${slug}/`;

  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) {
    canonicalLink.setAttribute("href", prettyUrl);
  }

  const ogUrlMeta = document.querySelector('meta[property="og:url"]');
  if (ogUrlMeta) {
    ogUrlMeta.setAttribute("content", prettyUrl);
  }

  const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
  let jsonLdData = null;
  if (jsonLdScript?.textContent) {
    try {
      jsonLdData = JSON.parse(jsonLdScript.textContent);
      if (jsonLdData && typeof jsonLdData === "object") {
        jsonLdData.url = prettyUrl;
        jsonLdScript.textContent = JSON.stringify(jsonLdData, null, 2);
      }
    } catch (error) {
      jsonLdData = null;
    }
  }

  const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const romanizeTokens = (value) =>
    value
      .toLowerCase()
      .replace(ROMAN_TOKEN_REGEX, (match, prefix, token) => `${prefix}${ROMAN_TO_DIGIT[token] ?? token}`);
  const normalizeRomanized = (value) => normalize(romanizeTokens(value));

  const stubName = typeof jsonLdData?.name === "string" ? jsonLdData.name : "";
  const stubPlatform = typeof jsonLdData?.gamePlatform === "string" ? jsonLdData.gamePlatform : "";
  const stubYear = jsonLdData?.datePublished ? String(jsonLdData.datePublished) : "";
  const stubPublisher = typeof jsonLdData?.publisher === "string" ? jsonLdData.publisher : "";

  const bodyMode = document.body?.dataset?.mode ?? document.body?.dataset?.ccgMode ?? "";
  const stubSystem = (stubPlatform || bodyMode || "").toUpperCase();

  const ogImagePath = (() => {
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? "";
    if (!ogImage) {
      return "";
    }
    try {
      return new URL(ogImage, SITE_BASE_URL).pathname.replace(/^\//, "");
    } catch (error) {
      return ogImage.replace(/^https?:\/\/[^/]+\//, "");
    }
  })();

  const normaliseLegacyGameHref = (href) => {
    const value = String(href || "").trim();
    if (!value) {
      return "";
    }

    try {
      const parsed = new URL(value, window.location.origin);
      if (!/\/games\/game\.html$/i.test(parsed.pathname)) {
        return value;
      }

      const candidate = String(parsed.searchParams.get("id") || parsed.searchParams.get("slug") || "")
        .trim()
        .toLowerCase()
        .replace(/_+/g, "-")
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      return candidate ? `/games/${candidate}/` : value;
    } catch (error) {
      return value;
    }
  };

  const primaryCta = document.querySelector('.game-downloads a[href^="/games/"]');
  if (!primaryCta) {
    return;
  }

  const buildAliasKeys = (value) => {
    if (!value) {
      return [];
    }
    const lower = value.toLowerCase();
    const romanized = romanizeTokens(value);
    return Array.from(new Set([lower, romanized, normalize(value), normalizeRomanized(value)])).filter(Boolean);
  };

  const matchesPublisher = (game) => {
    if (!stubPublisher) {
      return true;
    }
    const publishers = Array.isArray(game?.credits?.publisher) ? game.credits.publisher : [];
    if (!publishers.length) {
      return false;
    }
    const publisherNorm = stubPublisher.toLowerCase();
    return publishers.some((publisher) => String(publisher).toLowerCase() === publisherNorm);
  };

  const matchesYear = (game) => {
    if (!stubYear) {
      return true;
    }
    return String(game?.year ?? "") === stubYear;
  };

  const root = window.ccgGetSiteRoot ? window.ccgGetSiteRoot() : "/";
  const url = `${root}games/games.json`;

  fetch(url)
    .then((response) => (response.ok ? response.json() : []))
    .then((games) => {
      if (!Array.isArray(games) || games.length === 0) {
        return;
      }

      const gameEntries = games
        .filter((game) => game && typeof game === "object")
        .map((game) => ({
          game,
          aliases: new Set([
            (game.slug ?? "").toLowerCase(),
            romanizeTokens(game.slug ?? ""),
            normalize(game.slug ?? ""),
            normalizeRomanized(game.slug ?? ""),
            normalize(game.title ?? ""),
            normalizeRomanized(game.title ?? "")
          ])
        }));
      const candidates = [];
      const seenIds = new Set();
      const aliasKeys = [...buildAliasKeys(slug), ...buildAliasKeys(stubName)];

      for (const key of aliasKeys) {
        for (const entry of gameEntries) {
          if (!entry.aliases.has(key)) {
            continue;
          }
          const gameId = entry.game.id;
          if (!seenIds.has(gameId)) {
            seenIds.add(gameId);
            candidates.push(entry.game);
          }
        }
      }

      let resolved = candidates;

      if (stubSystem) {
        const systemMatches = resolved.filter((game) => String(game.system ?? "").toUpperCase() === stubSystem);
        if (systemMatches.length) {
          resolved = systemMatches;
        }
      }

      const exactSlugMatch = resolved.find((game) => String(game.slug ?? "").toLowerCase() === slug.toLowerCase());
      if (exactSlugMatch) {
        resolved = [exactSlugMatch];
      }

      if (resolved.length > 1 && ogImagePath) {
        const imageMatches = resolved.filter(
          (game) => String(game.thumbnail ?? "").replace(/^\//, "") === ogImagePath
        );
        if (imageMatches.length) {
          resolved = imageMatches;
        }
      }

      if (resolved.length > 1) {
        const yearMatches = resolved.filter(matchesYear);
        if (yearMatches.length) {
          resolved = yearMatches;
        }
      }

      if (resolved.length > 1) {
        const publisherMatches = resolved.filter(matchesPublisher);
        if (publisherMatches.length) {
          resolved = publisherMatches;
        }
      }

      const selectedGame = resolved[0];
      if (!selectedGame?.id) {
        return;
      }

      const selectedSlug = String(selectedGame.slug || "").trim();
      if (selectedSlug) {
        primaryCta.setAttribute("href", `/games/${selectedSlug}/`);
        return;
      }

      const existingHref = primaryCta.getAttribute("href");
      if (existingHref) {
        primaryCta.setAttribute("href", normaliseLegacyGameHref(existingHref));
      }
    })
    .catch(() => {
      /* No-op: keep existing link if games.json cannot be loaded. */
    });
})();
