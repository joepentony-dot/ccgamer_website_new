#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function patchFile(relativePath, mutator) {
  const target = path.join(ROOT, relativePath);
  let source = fs.readFileSync(target, "utf8");
  const next = mutator(source);
  if (next !== source) {
    fs.writeFileSync(target, next, "utf8");
    console.log(`Patched ${relativePath}`);
  } else {
    console.log(`No change needed for ${relativePath}`);
  }
}

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Could not find ${label}`);
  return source.replace(before, after);
}

patchFile("js/load-single-game.js", (input) => {
  let source = input;

  source = replaceOnce(
    source,
    '        lemon: Array.isArray(entry.lemon) ? entry.lemon : (entry.lemon ? [entry.lemon] : []),\n        music: Array.isArray(entry.music) ? entry.music : (entry.music ? [entry.music] : []),',
    '        lemon: Array.isArray(entry.lemon) ? entry.lemon : (entry.lemon ? [entry.lemon] : []),\n        zzap: Array.isArray(entry.zzap) ? entry.zzap : (entry.zzap ? [entry.zzap] : []),\n        music: Array.isArray(entry.music) ? entry.music : (entry.music ? [entry.music] : []),',
    "game normalisation Zzap field"
  );

  const lemonHelper = `function resolveLemonLinks(game) {
    const raw = game.lemon || game.lemonlink || game.lemonlinks;
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map(link => String(link || "").trim()).filter(Boolean);
    }
    const link = String(raw || "").trim();
    return link ? [link] : [];
}
`;

  const zzapHelpers = `function resolveLemonLinks(game) {
    const raw = game.lemon || game.lemonlink || game.lemonlinks;
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map(link => String(link || "").trim()).filter(Boolean);
    }
    const link = String(raw || "").trim();
    return link ? [link] : [];
}

const CCG_ZZAP_REVIEW_INDEX_URL = "/data/zzap64-review-links.json";
let CCG_ZZAP_REVIEW_DATA_PROMISE = null;
let CCG_ZZAP_MATCHER_PROMISE = null;

function normaliseZzapReviewUrl(value, metadata = {}) {
    const raw = String(value || "").trim();
    if (!raw) return null;

    try {
        const url = new URL(raw);
        const host = url.hostname.replace(/^www\\./i, "").toLowerCase();
        const issue = Number(url.searchParams.get("issue"));
        const page = Number(url.searchParams.get("page"));
        if (url.protocol !== "https:" || host !== "zzap64.co.uk") return null;
        if (url.pathname.toLowerCase() !== "/cgi-bin/displaypage.pl") return null;
        if (!Number.isInteger(issue) || issue < 1 || !Number.isInteger(page) || page < 1) return null;

        return {
            ...metadata,
            issue,
            page,
            precision: "page",
            url: \`https://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=\${issue}&page=\${page}\`
        };
    } catch {
        return null;
    }
}

function resolveZzapLinks(game) {
    const raw = game?.zzap || game?.zzap64 || game?.zzapReviewUrl || game?.zzapReviewUrls;
    if (!raw) return [];
    const values = Array.isArray(raw) ? raw : [raw];
    return values
        .map((item) => {
            if (item && typeof item === "object") {
                return normaliseZzapReviewUrl(item.url || item.href, item);
            }
            return normaliseZzapReviewUrl(item, { source: "game-data" });
        })
        .filter(Boolean);
}

function ensureZzapMatcher() {
    if (window.CCGZzap64Matcher) return Promise.resolve(window.CCGZzap64Matcher);
    if (CCG_ZZAP_MATCHER_PROMISE) return CCG_ZZAP_MATCHER_PROMISE;

    CCG_ZZAP_MATCHER_PROMISE = new Promise((resolve, reject) => {
        const src = "/js/ccg-zzap64-matcher.js";
        const existing = document.querySelector('script[src="/js/ccg-zzap64-matcher.js"], script[src$="/js/ccg-zzap64-matcher.js"]');
        const finish = () => {
            if (window.CCGZzap64Matcher) resolve(window.CCGZzap64Matcher);
            else reject(new Error("Zzap title matcher did not initialise"));
        };

        if (existing) {
            existing.addEventListener("load", finish, { once: true });
            existing.addEventListener("error", () => reject(new Error("Zzap title matcher failed to load")), { once: true });
            window.setTimeout(() => {
                if (window.CCGZzap64Matcher) resolve(window.CCGZzap64Matcher);
            }, 0);
            return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.defer = true;
        script.addEventListener("load", finish, { once: true });
        script.addEventListener("error", () => reject(new Error("Zzap title matcher failed to load")), { once: true });
        document.head.appendChild(script);
    });

    return CCG_ZZAP_MATCHER_PROMISE;
}

function zzapEntryFromIndex(key, row) {
    const parts = String(key || "").split("|");
    if (parts.length < 4 || !row || typeof row !== "object") return null;
    const [year, month, system, ...titleParts] = parts;
    const title = titleParts.join("|").trim();
    if (!title) return null;
    return {
        year: Number(year),
        month,
        system: system === "amiga" ? "Amiga" : "C64",
        title,
        ...row
    };
}

function loadZzapReviewData() {
    if (CCG_ZZAP_REVIEW_DATA_PROMISE) return CCG_ZZAP_REVIEW_DATA_PROMISE;

    CCG_ZZAP_REVIEW_DATA_PROMISE = Promise.all([
        ensureZzapMatcher(),
        fetch(CCG_ZZAP_REVIEW_INDEX_URL, { cache: "default" }).then((response) => {
            if (!response.ok) throw new Error(\`Zzap review index HTTP \${response.status}\`);
            return response.json();
        })
    ]).then(([matcher, data]) => {
        const entries = Object.entries(data?.entries || {})
            .map(([key, row]) => zzapEntryFromIndex(key, row))
            .filter(Boolean);
        return { matcher, entries };
    }).catch((error) => {
        console.warn("[CCG] Zzap review links are unavailable on this visit.", error);
        return { matcher: null, entries: [] };
    });

    return CCG_ZZAP_REVIEW_DATA_PROMISE;
}

async function resolveAutomaticZzapLinks(game) {
    const { matcher, entries } = await loadZzapReviewData();
    if (!matcher || !entries.length || !game) return [];

    const matches = matcher.findAwardsForGame(game, entries, CCG_SINGLE_ALL_GAMES);
    return matches
        .map((entry) => normaliseZzapReviewUrl(entry.url, entry))
        .filter(Boolean);
}

function dedupeZzapReviewRecords(records) {
    const seen = new Set();
    return records.filter((record) => {
        const key = String(record?.url || "").trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    }).sort((a, b) => Number(a.issue || 0) - Number(b.issue || 0) || Number(a.page || 0) - Number(b.page || 0));
}

function appendFurtherReadingButton(container, href, label, title) {
    if (!container || !href) return;
    const anchor = document.createElement("a");
    anchor.className = "game-pill";
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer external";
    anchor.textContent = label;
    if (title) anchor.title = title;
    container.appendChild(anchor);
}

function renderFurtherReadingLinks({ game, readingCard, container, utilityHubSection }) {
    if (!readingCard || !container) return false;

    const lemonLinks = resolveLemonLinks(game);
    const explicitZzapLinks = resolveZzapLinks(game);

    const render = (zzapLinks) => {
        container.innerHTML = "";
        const system = String(game?.system || "").trim().toUpperCase();
        const baseLabel = system === "AMIGA" ? "LEMON AMIGA" : "LEMON 64";

        Array.from(new Set(lemonLinks)).forEach((link, index, all) => {
            appendFurtherReadingButton(
                container,
                link,
                all.length > 1 ? \`\${baseLabel} LINK \${index + 1}\` : baseLabel,
                "Open the matching Lemon game database page"
            );
        });

        dedupeZzapReviewRecords(zzapLinks).forEach((record) => {
            const label = record.issue && record.page
                ? \`ZZAP!64 REVIEW · ISSUE \${record.issue} · P\${record.page}\`
                : "ZZAP!64 REVIEW";
            appendFurtherReadingButton(
                container,
                record.url,
                label,
                "Open the original Zzap!64 magazine review scan"
            );
        });

        const hasReading = container.children.length > 0;
        readingCard.hidden = !hasReading;
        if (utilityHubSection && hasReading) utilityHubSection.hidden = false;
        return hasReading;
    };

    const initialReading = render(explicitZzapLinks);

    void resolveAutomaticZzapLinks(game).then((automaticLinks) => {
        render([...explicitZzapLinks, ...automaticLinks]);
    });

    return initialReading;
}
`;

  source = replaceOnce(source, lemonHelper, zzapHelpers, "Zzap further-reading helpers");

  const oldMusicVisibility = `    const finalizeMusicVisibility = () => {
        const hasPlayer = !!musicTracksEl.querySelector("audio");
        const hasMetadata = !!musicMetaEl.querySelector(".ccg-music-composer, .ccg-music-related, .ccg-music-composer__hint");
        musicSection.style.display = hasPlayer || hasMetadata ? "" : "none";
        musicCard.hidden = !(hasPlayer || hasMetadata);
        if (utilityHubSection) {
            utilityHubSection.hidden = !(hasManual || hasDisk || hasReading || hasPlayer || hasMetadata);
        }
    };`;

  const newMusicVisibility = `    const finalizeMusicVisibility = () => {
        const hasPlayer = !!musicTracksEl.querySelector("audio");
        const hasMetadata = !!musicMetaEl.querySelector(".ccg-music-composer, .ccg-music-related, .ccg-music-composer__hint");
        const currentReadingCard = document.getElementById("game-reading-card");
        const hasCurrentReading = !!(currentReadingCard && !currentReadingCard.hidden);
        musicSection.style.display = hasPlayer || hasMetadata ? "" : "none";
        musicCard.hidden = !(hasPlayer || hasMetadata);
        if (utilityHubSection) {
            utilityHubSection.hidden = !(hasManual || hasDisk || hasReading || hasCurrentReading || hasPlayer || hasMetadata);
        }
    };`;

  source = replaceOnce(source, oldMusicVisibility, newMusicVisibility, "utility hub reading visibility");

  const oldReadingBlock = `    const lemonLinks = resolveLemonLinks(game);
    const lemonLinksEl = document.getElementById("gameLemonLinks");
    if (readingCard && lemonLinksEl) {
        lemonLinksEl.innerHTML = "";
        if (lemonLinks.length) {
            const system = String(game?.system || "").trim().toUpperCase();
            const baseLabel = system === "AMIGA" ? "LEMON AMIGA" : "LEMON 64";

            Array.from(new Set(lemonLinks)).forEach((link, index, all) => {
                const anchor = document.createElement("a");
                anchor.className = "game-pill";
                anchor.href = link;
                anchor.target = "_blank";
                anchor.rel = "noopener";
                anchor.textContent = all.length > 1
                    ? \`\${baseLabel} LINK \${index + 1}\`
                    : baseLabel;
                lemonLinksEl.appendChild(anchor);
            });
            readingCard.hidden = false;
        } else {
            readingCard.hidden = true;
        }
    }

    const hasReading = lemonLinks.length > 0;`;

  const newReadingBlock = `    const lemonLinksEl = document.getElementById("gameLemonLinks");
    const hasReading = renderFurtherReadingLinks({
        game,
        readingCard,
        container: lemonLinksEl,
        utilityHubSection
    });`;

  source = replaceOnce(source, oldReadingBlock, newReadingBlock, "game further-reading render block");

  return source;
});

patchFile("admin/content-publisher.html", (input) => {
  let source = input;
  const before = `          <label>Lemon64 URL
            <input type="url" data-game-field="lemonUrl" />
          </label>
          <label>Disk/download URLs`;
  const after = `          <label>Lemon64 URL
            <input type="url" data-game-field="lemonUrl" />
          </label>
          <label>Zzap!64 review URL (optional)
            <input type="url" data-game-field="zzapUrl" placeholder="https://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=43&amp;page=24" />
            <small>Leave blank if Zzap!64 did not review the game. Use the direct original review scan URL when one is available; games already covered by the Zzap awards archive can also be linked automatically.</small>
          </label>
          <label>Disk/download URLs`;
  source = replaceOnce(source, before, after, "optional Zzap publisher field");
  return source;
});

patchFile("admin/js/content-publisher.js", (input) => {
  let source = input;

  source = replaceOnce(
    source,
    "    lemon: gameValue('lemonUrl') ? [gameValue('lemonUrl')] : [],\n    description: gameValue('description'),",
    "    lemon: gameValue('lemonUrl') ? [gameValue('lemonUrl')] : [],\n    zzap: gameValue('zzapUrl') ? [gameValue('zzapUrl')] : [],\n    description: gameValue('description'),",
    "game entry Zzap field"
  );

  source = replaceOnce(
    source,
    "  entry.lemon.forEach((url) => { if (!isHttpUrl(url)) errors.push(`Invalid Lemon64 URL: ${url}`); });\n\n  if (state.games.some",
    "  entry.lemon.forEach((url) => { if (!isHttpUrl(url)) errors.push(`Invalid Lemon64 URL: ${url}`); });\n  entry.zzap.forEach((url) => { if (!isValidZzapReviewUrl(url)) errors.push(`Zzap!64 review URL must be a direct zzap64.co.uk displaypage link: ${url}`); });\n\n  if (state.games.some",
    "Zzap game-entry validation"
  );

  const oldUrlHelper = `function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_error) {
    return false;
  }
}
`;
  const newUrlHelper = `function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_error) {
    return false;
  }
}

function isValidZzapReviewUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\\./i, '').toLowerCase();
    const issue = Number(url.searchParams.get('issue'));
    const page = Number(url.searchParams.get('page'));
    return url.protocol === 'https:'
      && host === 'zzap64.co.uk'
      && url.pathname.toLowerCase() === '/cgi-bin/displaypage.pl'
      && Number.isInteger(issue)
      && issue > 0
      && Number.isInteger(page)
      && page > 0;
  } catch (_error) {
    return false;
  }
}
`;
  source = replaceOnce(source, oldUrlHelper, newUrlHelper, "Zzap direct URL validator");

  return source;
});

console.log("Prepared optional and automatic Zzap!64 review links on game pages.");
