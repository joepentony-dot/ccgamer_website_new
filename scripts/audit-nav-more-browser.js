#!/usr/bin/env node

"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const HOST = "127.0.0.1";
const SITE_PORT = 4179;
const DRIVER_PORT = 9516;
const W3C_ELEMENT_KEY = "element-6066-11e4-a52e-4f735466cecf";
const LIVE_BASE_URL = String(process.env.CCG_NAV_AUDIT_BASE_URL || "").trim().replace(/\/+$/, "");
const LOCAL_BASE_URL = `http://${HOST}:${SITE_PORT}`;

const MIME = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
});

function auditBaseUrl() {
  return LIVE_BASE_URL || LOCAL_BASE_URL;
}

function normalizeText(value) {
  return String(value || "").replace(/\r\n/g, "\n");
}

function commandPath(command) {
  const result = spawnSync("bash", ["-lc", `command -v ${command}`], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

function findChromeDriver() {
  const candidates = [
    commandPath("chromedriver"),
    process.env.CHROMEWEBDRIVER ? path.join(process.env.CHROMEWEBDRIVER, "chromedriver") : "",
    "/usr/local/share/chromedriver-linux64/chromedriver"
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("ChromeDriver was not found on the GitHub runner.");
  return found;
}

function safeFileForRequest(urlPathname) {
  let decoded;
  try { decoded = decodeURIComponent(urlPathname); }
  catch { return null; }

  const relative = decoded.replace(/^\/+/, "");
  const absolute = path.resolve(ROOT, relative || "home.html");
  if (absolute !== ROOT && !absolute.startsWith(`${ROOT}${path.sep}`)) return null;

  let target = absolute;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
  return target;
}

function createServer() {
  return http.createServer((req, res) => {
    const requestUrl = new URL(req.url || "/", `http://${HOST}`);
    const filePath = safeFileForRequest(requestUrl.pathname);
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      res.end("Not found");
      return;
    }

    const contentType = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "content-type": contentType, "cache-control": "no-store" });
    res.end(fs.readFileSync(filePath));
  });
}

async function fetchLiveText(relativePath) {
  const separator = relativePath.includes("?") ? "&" : "?";
  const response = await fetch(`${LIVE_BASE_URL}${relativePath}${separator}ccg-nav-audit=${Date.now()}`, {
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`Live ${relativePath} returned ${response.status}.`);
  return response.text();
}

async function verifyLiveReleaseAssets() {
  if (!LIVE_BASE_URL) return;

  const assets = [
    ["/service-worker.js", "service-worker.js"],
    // The retired Ask CCG bootstrap must not reappear in the deployed Home script.
    ["/js/ccg-archive-pulse-randomizer.js", "js/ccg-archive-pulse-randomizer.js"],
    ["/js/music-composer-utils.js", "js/music-composer-utils.js"],
    ["/js/games-library.js", "js/games-library.js"],
    ["/js/retro-specials-loader.js", "js/retro-specials-loader.js"],
    ["/js/load-single-game.js", "js/load-single-game.js"],
    ["/resources/css/game-pages.css", "resources/css/game-pages.css"],
    ["/js/ccg-nav-fit.js", "js/ccg-nav-fit.js"],
    ["/resources/css/ccg-nav-fit.css", "resources/css/ccg-nav-fit.css"],
    ["/resources/css/ccg-mode-identity.css", "resources/css/ccg-mode-identity.css"]
  ];

  for (const [remotePath, localPath] of assets) {
    const expected = normalizeText(fs.readFileSync(path.join(ROOT, localPath), "utf8"));
    const actual = normalizeText(await fetchLiveText(remotePath));
    if (actual !== expected) {
      throw new Error(`Live ${remotePath} does not match the repository release being audited.`);
    }
  }
}

async function webdriver(method, pathname, body) {
  const response = await fetch(`http://${HOST}:${DRIVER_PORT}${pathname}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(45000)
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok || payload.value?.error) {
    throw new Error(payload.value?.message || text || `${response.status} ${response.statusText}`);
  }
  return payload.value;
}

async function waitForDriver() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      await webdriver("GET", "/status");
      return;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("ChromeDriver did not become ready.");
}

async function execute(sessionId, script, args = []) {
  return webdriver("POST", `/session/${sessionId}/execute/sync`, { script, args });
}

async function waitUntil(sessionId, expression, label, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const ready = await execute(sessionId, `return Boolean(${expression});`);
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

async function findElement(sessionId, selector) {
  const value = await webdriver("POST", `/session/${sessionId}/element`, {
    using: "css selector",
    value: selector
  });
  const id = value?.[W3C_ELEMENT_KEY] || value?.ELEMENT;
  if (!id) throw new Error(`WebDriver did not return an element id for ${selector}.`);
  return id;
}

async function clickElement(sessionId, selector) {
  const id = await findElement(sessionId, selector);
  await webdriver("POST", `/session/${sessionId}/element/${encodeURIComponent(id)}/click`, {});
}

async function openHome(sessionId, width) {
  await webdriver("POST", `/session/${sessionId}/window/rect`, { width, height: 1000 });
  await webdriver("POST", `/session/${sessionId}/url`, {
    url: `${auditBaseUrl()}/home.html?ccg-nav-audit=${Date.now()}`
  });

  const canonicalNavExpression = `
    (function () {
      const nav = document.querySelector('[data-ccg-header] .ccg-nav');
      const primary = Array.from(document.querySelectorAll('[data-ccg-nav-primary] > li > .ccg-nav__link')).map((link) => link.textContent.trim());
      const secondary = Array.from(document.querySelectorAll('[data-ccg-nav-secondary] > li > .ccg-nav__link')).map((link) => link.textContent.trim());
      if (!nav) return false;
      const style = getComputedStyle(nav);
      const rect = nav.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || 1) > 0
        && rect.width > 1
        && rect.height > 1
        && primary.join('|') === 'Home|Browse Games|Browse by Genre|Publishers|Collections|Music Hub'
        && secondary.join('|') === 'CCG Games|Find Me a Game|Zzap!64 Reviews & Awards|Quiz|Emulation|Install CCG App|About Me|Contact';
    })()
  `;

  await waitUntil(sessionId, canonicalNavExpression, `visible canonical Omega navigation at ${width}px`);
  await waitUntil(
    sessionId,
    "document.querySelector('[data-ccg-more-toggle]') && !document.querySelector('[data-ccg-more-toggle]').disabled",
    `enabled More toggle at ${width}px`
  );
}


async function assertSingleGameExploreNormalFlow(sessionId, width) {
  // The owner-approved Explore menu belongs between the hero and Video Archive.
  // Exercise the actual game page, not a synthetic DOM or source-only assertion.
  await webdriver("POST", `/session/${sessionId}/window/rect`, { width, height: 1000 });
  await webdriver("POST", `/session/${sessionId}/url`, {
    url: `${auditBaseUrl()}/games/fire-ant/?ccg-explore-flow-audit=${Date.now()}`
  });
  await waitUntil(sessionId, `(
    function () {
      const nav = document.querySelector('[data-game-section-nav]');
      return nav && !nav.hidden && nav.querySelector('a[href="#game-video-section"]')
        && document.getElementById('game-video-section');
    }
  )()`, `visible Fire Ant Explore section menu at ${width}px`, 20000);

  const initial = await execute(sessionId, `return (function () {
    const nav = document.querySelector('[data-game-section-nav]');
    const hero = document.querySelector('.game-hero');
    const video = document.getElementById('game-video-section');
    const rect = nav.getBoundingClientRect();
    return {
      position: getComputedStyle(nav).position,
      afterHero: hero?.nextElementSibling === nav,
      beforeVideo: Boolean(nav.compareDocumentPosition(video) & Node.DOCUMENT_POSITION_FOLLOWING),
      visible: rect.width > 10 && rect.height > 10,
      videoLink: Boolean(nav.querySelector('a[href="#game-video-section"]'))
    };
  })();`);
  if (initial.position !== "static" || !initial.afterHero || !initial.beforeVideo ||
      !initial.visible || !initial.videoLink) {
    throw new Error(`Single-game Explore menu placement failed at ${width}px: ${JSON.stringify(initial)}`);
  }

  // A normal-flow menu moves out of the viewport as the visitor scrolls.
  // A sticky/fixed regression remains visible and fails this real-browser check.
  const scrolled = await execute(sessionId, `return (function () {
    const nav = document.querySelector('[data-game-section-nav]');
    const maxScroll = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - innerHeight;
    const target = Math.min(maxScroll, Math.ceil(scrollY + nav.getBoundingClientRect().bottom + 180));
    window.scrollTo({ top: target, behavior: 'instant' });
    return {
      scrollY: window.scrollY,
      bottom: nav.getBoundingClientRect().bottom,
      position: getComputedStyle(nav).position
    };
  })();`);
  if (scrolled.scrollY < 100 || scrolled.bottom >= -10 || scrolled.position !== "static") {
    throw new Error(`Single-game Explore menu followed scrolling at ${width}px: ${JSON.stringify(scrolled)}`);
  }

  const restored = await execute(sessionId, `return (function () {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const nav = document.querySelector('[data-game-section-nav]');
    const rect = nav.getBoundingClientRect();
    return { scrollY: window.scrollY, top: rect.top, bottom: rect.bottom };
  })();`);
  if (restored.scrollY > 1 || restored.bottom <= 0 || restored.top < 0) {
    throw new Error(`Single-game Explore menu did not return to its original position at ${width}px: ${JSON.stringify(restored)}`);
  }
}

async function assertRetiredAskCCGAbsent(sessionId, width, visit) {
  // Use the real browser, not a source-only grep. Revisit within the same
  // Chrome profile to cover a returning session and its service-worker state.
  await webdriver("POST", `/session/${sessionId}/window/rect`, { width, height: 900 });
  await webdriver("POST", `/session/${sessionId}/url`, {
    url: `${auditBaseUrl()}/home.html?ccg-assistant-retirement-audit=${Date.now()}`
  });
  await waitUntil(sessionId, "document.readyState !== 'loading' && Boolean(document.body)",
    `Home DOM for retired assistant at ${width}px (${visit})`, 12000);
  // The old launcher was attached on DOM readiness by a deferred Home script.
  await new Promise((resolve) => setTimeout(resolve, 800));
  const evidence = await execute(sessionId, `
    return (function () {
      const retired = /(?:ccg-retro-assistant\\.js|ccg-retro-assistant\\.css)(?:[?#]|$)/i;
      return {
        viewport: window.innerWidth,
        launcher: Boolean(document.querySelector('#ccg-retro-assistant, .ccg-ra__trigger, #ccg-ra-panel')),
        bootstrapFlag: Boolean(window.__ccgRetroAssistantLoaded),
        scripts: Array.from(document.scripts).filter((script) =>
          retired.test(script.src || '') || script.hasAttribute('data-ccg-retro-assistant')).map((script) => script.src),
        styles: Array.from(document.querySelectorAll('link[href]')).filter((link) =>
          retired.test(link.href || '')).map((link) => link.href),
        fetched: performance.getEntriesByType('resource').filter((entry) =>
          retired.test(entry.name || '')).map((entry) => entry.name)
      };
    })();
  `);
  if (evidence.launcher || evidence.bootstrapFlag || evidence.scripts.length ||
      evidence.styles.length || evidence.fetched.length) {
    throw new Error(`Retired Ask CCG reappeared at ${width}px (${visit}): ${JSON.stringify(evidence)}`);
  }
}

async function assertMusicHubSearch(sessionId, width) {
  await webdriver("POST", `/session/${sessionId}/window/rect`, { width, height: 1000 });
  await webdriver("POST", `/session/${sessionId}/url`, {
    url: `${auditBaseUrl()}/music/?ccg-music-search-audit=${Date.now()}`
  });
  await waitUntil(sessionId, `(function () {
    const accordion = document.getElementById('composer-discovery-accordion');
    const input = document.getElementById('composer-discovery-search');
    return accordion?.dataset.ccgOmegaAccordionBound === 'true'
      && input?.dataset.ccgOmegaSearchBound === 'true'
      && accordion.querySelectorAll('.ccg-composer-chip').length > 0;
  })()`, `Music Hub search initialisation at ${width}px`, 20000);

  const snapshot = `(function () {
    const accordion = document.getElementById('composer-discovery-accordion');
    const input = document.getElementById('composer-discovery-search');
    const groups = Array.from(accordion.querySelectorAll('.composer-accordion__group'));
    const chips = groups.flatMap((group) =>
      Array.from(group.querySelectorAll('.ccg-composer-chip')).map((chip) => ({
        visible: !group.hidden && !chip.hidden,
        name: Array.from(chip.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent || '').join(' ').trim()
      }))
    );
    return {
      query: input.value,
      total: chips.length,
      visible: chips.filter((chip) => chip.visible).map((chip) => chip.name),
      empty: Boolean(accordion.querySelector('[data-ccg-composer-search-empty="true"]'))
    };
  })()`;
  const cases = [
    { query: "32", empty: true, zero: true },
    { query: "Hubbard", empty: false, name: "Rob Hubbard" },
    { query: "David Dunn", empty: false, name: "Julie Dunn" },
    { query: "ccg-no-such-composer-2026", empty: true, zero: true },
    { query: "", empty: false, all: true }
  ];
  for (const testCase of cases) {
    await execute(sessionId, `
      const input = document.getElementById('composer-discovery-search');
      input.value = ${JSON.stringify(testCase.query)};
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    `);
    const expectation = testCase.zero
      ? "state.visible.length === 0"
      : testCase.all
        ? "state.total > 0 && state.visible.length === state.total"
        : `state.visible.includes(${JSON.stringify(testCase.name)})`;
    await waitUntil(sessionId, `(function () {
      const state = ${snapshot};
      return state.query === ${JSON.stringify(testCase.query)}
        && state.empty === ${testCase.empty}
        && ${expectation};
    })()`, `Music Hub search ${JSON.stringify(testCase.query)} at ${width}px`, 12000);
    const state = await execute(sessionId, `return ${snapshot};`);
    if (state.query !== testCase.query || state.empty !== testCase.empty ||
        (testCase.zero && state.visible.length !== 0) ||
        (testCase.all && (state.total === 0 || state.visible.length !== state.total)) ||
        (testCase.name && !state.visible.includes(testCase.name))) {
      throw new Error(`Music Hub search mismatch at ${width}px: ${JSON.stringify({ testCase, state })}`);
    }
  }
}


async function assertGamesArchiveYearSearch(sessionId, width) {
  // Exercise the deployed archive UI; expected counts use the actual catalogue.
  const catalogue = JSON.parse(fs.readFileSync(path.join(ROOT, "games/games-search.json"), "utf8"));
  const countYear = (year) => catalogue.filter((game) => Number(game.year) === year).length;
  if (catalogue.length < 600 || !countYear(1986) || !countYear(1987)) {
    throw new Error("Games Archive search fixture is incomplete.");
  }
  await webdriver("POST", `/session/${sessionId}/window/rect`, { width, height: 1000 });
  await webdriver("POST", `/session/${sessionId}/url`, {
    url: `${auditBaseUrl()}/games/index.html?ccg-year-search-audit=${Date.now()}`
  });
  // The archive intentionally defers catalogue hydration until genuine user intent.
  // A real pointer click on search must start it before we assert results.
  await clickElement(sessionId, "#gamesSearchInput");
  await waitUntil(sessionId, `(function () {
    const input = document.getElementById('gamesSearchInput');
    const total = document.getElementById('gamesTotalCount');
    const result = document.getElementById('gamesResultsCount');
    return window.CCG_GAMES_LIBRARY_READY === true
      && input?.dataset.ccgBound === 'true'
      && total?.textContent.trim() === result?.textContent.trim()
      && Number(total?.textContent.replace(/,/g, '')) > 600;
  })()`, `Games Archive initialisation at ${width}px`, 25000);

  await execute(sessionId, `
    document.querySelector('[data-system-filter="all"]').click();
    const year = document.getElementById('gamesYearSelect');
    year.value = 'all';
    year.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  `);

  const cases = [
    { query: "1986", expected: countYear(1986) },
    { query: "1987", expected: countYear(1987) },
    { query: "1942", expected: 1 },
    { query: "1986 1942", expected: 1 },
    { query: "1987 1942", expected: 0 },
    { query: "", expected: catalogue.length }
  ];
  for (const testCase of cases) {
    await execute(sessionId, `
      const input = document.getElementById('gamesSearchInput');
      input.value = ${JSON.stringify(testCase.query)};
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    `);
    await waitUntil(sessionId, `(function () {
      const input = document.getElementById('gamesSearchInput');
      const results = document.getElementById('gamesResultsCount');
      const empty = document.getElementById('gamesEmptyState');
      return input?.value === ${JSON.stringify(testCase.query)}
        && Number(results?.textContent.replace(/,/g, '')) === ${testCase.expected}
        && empty?.hidden === ${testCase.expected !== 0};
    })()`, `year query ${JSON.stringify(testCase.query)} at ${width}px`, 15000);
    const actual = await execute(sessionId, `
      return {
        query: document.getElementById('gamesSearchInput').value,
        results: Number(document.getElementById('gamesResultsCount').textContent.replace(/,/g, '')),
        total: Number(document.getElementById('gamesTotalCount').textContent.replace(/,/g, '')),
        emptyHidden: document.getElementById('gamesEmptyState').hidden,
        system: document.querySelector('[data-system-filter="all"]').getAttribute('aria-pressed'),
        year: document.getElementById('gamesYearSelect').value,
        focus: document.getElementById('gamesFocusPanel').textContent.trim()
      };
    `);
    if (actual.query !== testCase.query || actual.results !== testCase.expected ||
        actual.total !== catalogue.length || actual.emptyHidden !== (testCase.expected !== 0) ||
        actual.system !== "true" || actual.year !== "all" ||
        (testCase.query && !actual.focus.includes(testCase.query.toUpperCase()))) {
      throw new Error(`Games Archive search mismatch at ${width}px: ${JSON.stringify({ testCase, actual })}`);
    }
  }
}

async function assertRetroSpecialsBrowser(sessionId, width) {
  await webdriver("POST", `/session/${sessionId}/window/rect`, { width, height: 1000 });
  await webdriver("POST", `/session/${sessionId}/url`, {
    url: `${auditBaseUrl()}/games/collections/retro-specials.html?ccg-retro-thumbnail-audit=${Date.now()}`
  });
  await waitUntil(sessionId, `(function () {
    const grid = document.getElementById('genreGamesGrid');
    const search = document.getElementById('ccgRetroSpecialsSearch');
    const latest = document.getElementById('ccgRetroSpecialsLatestGrid');
    return grid?.dataset.collectionState === 'ready'
      && grid.querySelectorAll('.ccg-game-card').length > 0
      && latest?.querySelectorAll('.ccg-game-card').length > 0
      && search && document.getElementById('ccgRetroSpecialsStatus');
  })()`, `Retro Specials dynamic cards at ${width}px`, 20000);

  const baseline = await execute(sessionId, `return (function () {
    const grid = document.getElementById('genreGamesGrid');
    const latest = document.getElementById('ccgRetroSpecialsLatestGrid');
    const images = Array.from(document.querySelectorAll(
      '#genreGamesGrid .ccg-game-card img, #ccgRetroSpecialsLatestGrid .ccg-game-card img'
    ));
    const input = document.getElementById('ccgRetroSpecialsSearch');
    const rect = input.getBoundingClientRect();
    return {
      viewport: innerWidth,
      gridCount: grid.querySelectorAll('.ccg-game-card').length,
      latestCount: latest.querySelectorAll('.ccg-game-card').length,
      imageCount: images.length,
      inlineHandlers: images.filter((img) => img.hasAttribute('onerror')).length,
      badDimensions: images.filter((img) => img.getAttribute('width') !== '480'
        || img.getAttribute('height') !== '270').length,
      searchVisible: rect.width > 1 && rect.height > 1
        && getComputedStyle(input).visibility !== 'hidden'
    };
  })();`);
  if (baseline.gridCount < 1 || baseline.latestCount < 1 || baseline.imageCount < 2
      || baseline.inlineHandlers !== 0 || baseline.badDimensions !== 0 || !baseline.searchVisible) {
    throw new Error(`Retro Specials dynamic thumbnail contract failed at ${width}px: ${JSON.stringify(baseline)}`);
  }

  // Exercise the real capture-phase error handler without relying on whether
  // third-party YouTube thumbnails are reachable from the CI runner.
  const fallback = await execute(sessionId, `return (function () {
    const original = document.querySelector('#genreGamesGrid .ccg-game-card img');
    const probe = original.cloneNode(false);
    const expected = 'https://img.youtube.com/vi/ccg-browser-probe/mqdefault.jpg';
    probe.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    probe.setAttribute('data-ccg-retro-fallback', expected);
    original.parentElement.appendChild(probe);
    probe.dispatchEvent(new Event('error'));
    const first = { src: probe.src, pending: probe.hasAttribute('data-ccg-retro-fallback') };
    probe.dispatchEvent(new Event('error'));
    const second = { src: probe.src, pending: probe.hasAttribute('data-ccg-retro-fallback') };
    probe.remove();
    return { expected, first, second };
  })();`);
  if (fallback.first.src !== fallback.expected || fallback.first.pending
      || fallback.second.src !== fallback.expected || fallback.second.pending) {
    throw new Error(`Retro Specials one-shot thumbnail fallback failed at ${width}px: ${JSON.stringify(fallback)}`);
  }

  for (const testCase of [
    { query: 'Zzap!64', found: true },
    { query: 'ccg-retro-unmatched-query-2026', found: false },
    { query: '', found: true, reset: true }
  ]) {
    await execute(sessionId, `
      const input = document.getElementById('ccgRetroSpecialsSearch');
      input.value = ${JSON.stringify(testCase.query)};
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    `);
    await waitUntil(sessionId, `(function () {
      const grid = document.getElementById('genreGamesGrid');
      const status = document.getElementById('ccgRetroSpecialsStatus');
      const latest = document.getElementById('ccgRetroSpecialsLatest');
      const count = grid.querySelectorAll('.ccg-game-card').length;
      const empty = Boolean(grid.querySelector('.ccg-retro-empty'));
      return document.getElementById('ccgRetroSpecialsSearch').value === ${JSON.stringify(testCase.query)}
        && ${testCase.found} === (count > 0)
        && ${testCase.found} !== empty
        && ${testCase.reset ? "!latest.hidden && latest.querySelectorAll('.ccg-game-card').length > 0" : "latest.hidden"}
        && status.textContent.includes(${JSON.stringify(testCase.reset ? "more specials in the archive" : "found")});
    })()`, `Retro Specials search ${JSON.stringify(testCase.query)} at ${width}px`, 12000);
  }
}

async function openMoreWithRealClick(sessionId, width) {
  await clickElement(sessionId, "[data-ccg-more-toggle]");
  await waitUntil(
    sessionId,
    "document.querySelector('[data-ccg-more-toggle]').getAttribute('aria-expanded') === 'true'",
    `More expanded state at ${width}px`
  );

  const state = await execute(sessionId, `
    return (function () {
      const header = document.querySelector('[data-ccg-header]');
      const nav = document.querySelector('[data-ccg-header] .ccg-nav');
      const menu = document.querySelector('[data-ccg-more-menu]');
      const rect = menu ? menu.getBoundingClientRect() : null;
      return {
        headerOpen: Boolean(header && header.classList.contains('ccg-header--more-open')),
        navOpen: Boolean(nav && nav.classList.contains('ccg-nav--more-open')),
        hidden: menu ? menu.hidden : null,
        display: menu ? getComputedStyle(menu).display : '',
        pointerEvents: menu ? getComputedStyle(menu).pointerEvents : '',
        zIndex: menu ? getComputedStyle(menu).zIndex : '',
        visible: Boolean(menu && !menu.hidden && getComputedStyle(menu).display !== 'none' && rect && rect.width > 1 && rect.height > 1)
      };
    })();
  `);

  if (!state.headerOpen || !state.navOpen || state.hidden !== false || !state.visible || state.pointerEvents === "none") {
    throw new Error(`More did not open as an interactive top-layer menu at ${width}px: ${JSON.stringify(state)}`);
  }
}

async function assertMoreLinkOrder(sessionId, width) {
  const hrefs = await execute(sessionId, `
    return Array.from(document.querySelectorAll('[data-ccg-more-menu] a[href]'))
      .map((link) => link.getAttribute('href'));
  `);
  const archive = [
    '/games/genres/',
    '/games/publishers/',
    '/games/collections/',
    '/games/discover/',
    '/music/',
    '/zzap64/',
    '/quiz/quiz.html',
    '/emulation.html'
  ];
  const support = [
    'https://cheeky-commodore-gamer-shop.fourthwall.com/en-gbp',
    '/install-app.html',
    '/games/ccg-games/',
    '/about.html',
    '/contact.html'
  ];
  /* Both /folder/ and /folder/index.html are supported existing routes.
     Compare destinations canonically without changing their actual hrefs. */
  const normalizeRoute = (href) => href.replace(/\/index\.html(?=$|[?#])/, '/');
  const prefix = hrefs.slice(0, archive.length).map(normalizeRoute);
  const suffix = hrefs.slice(-support.length).map(normalizeRoute);
  if (JSON.stringify(prefix) !== JSON.stringify(archive) || JSON.stringify(suffix) !== JSON.stringify(support)) {
    throw new Error(`Desktop More order or route preservation failed at ${width}px: ${JSON.stringify(hrefs)}`);
  }
  if (new Set(hrefs.map(normalizeRoute)).size !== hrefs.length) {
    throw new Error(`Desktop More duplicates a destination at ${width}px: ${JSON.stringify(hrefs)}`);
  }
}

async function assertLinkOwnsItsHitTarget(sessionId, label, href) {
  const probe = await execute(sessionId, `
    return (function () {
      const link = Array.from(document.querySelectorAll('[data-ccg-more-menu] a[href]'))
        .find((candidate) => candidate.textContent.trim() === ${JSON.stringify(label)} && candidate.getAttribute('href') === ${JSON.stringify(href)});
      if (!link) return { found: false };
      // More can scroll when the archive index is long. Move the target into
      // the visible menu before performing the same real pointer hit-test.
      link.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const rect = link.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const top = document.elementFromPoint(x, y);
      return {
        found: true,
        linkDisplay: getComputedStyle(link).display,
        linkPointerEvents: getComputedStyle(link).pointerEvents,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        topTag: top ? top.tagName : '',
        topClass: top ? top.className : '',
        topHref: top && top.closest ? top.closest('a')?.getAttribute('href') || '' : '',
        ownsPoint: Boolean(top && (top === link || link.contains(top)))
      };
    })();
  `);

  if (!probe.found) throw new Error(`More does not contain ${label} (${href}).`);
  if (probe.linkDisplay === "none" || probe.linkPointerEvents === "none" || probe.rect.width <= 1 || probe.rect.height <= 1) {
    throw new Error(`${label} is not interactable: ${JSON.stringify(probe)}`);
  }
  if (!probe.ownsPoint) {
    throw new Error(`${label} is covered by another element: ${JSON.stringify(probe)}`);
  }
}

async function clickMoreDestination(sessionId, width, label, href, expectedPath) {
  await openHome(sessionId, width);
  await openMoreWithRealClick(sessionId, width);
  await assertLinkOwnsItsHitTarget(sessionId, label, href);

  const escapedHref = href.replace(/"/g, '\\"');
  await clickElement(sessionId, `[data-ccg-more-menu] a[href="${escapedHref}"]`);
  await waitUntil(
    sessionId,
    `window.location.pathname === ${JSON.stringify(expectedPath)}`,
    `${label} navigation at ${width}px`
  );

  const destinationState = await execute(sessionId, `
    return {
      pathname: window.location.pathname,
      canonicalShell: Boolean(document.querySelector('[data-ccg-static-shell="2026-08-19-v1"]')),
      header: Boolean(document.querySelector('[data-ccg-header]'))
    };
  `);

  if (!destinationState.header || !destinationState.canonicalShell) {
    throw new Error(`${label} destination did not render the canonical shared header: ${JSON.stringify(destinationState)}`);
  }
}

async function assertInstallDestinationNavigation(sessionId, width) {
  // WebDriver's eager page-load mode can report /install-app.html before its
  // deferred nav-fit callback has repopulated More with hidden primary routes.
  // Require the settled real menu, not the initial secondary-only fallback.
  await waitUntil(sessionId, `(function () {
    const nav = document.querySelector('[data-ccg-header] .ccg-nav');
    const hrefs = Array.from(document.querySelectorAll('[data-ccg-more-menu] a[href]'))
      .map((link) => link.getAttribute('href'));
    return nav && nav.classList.contains('ccg-nav--ux-compact')
      && hrefs.includes('/music/')
      && hrefs.includes('/games/publishers/')
      && hrefs.includes('/emulation.html');
  })()`, `settled install destination More menu at ${width}px`, 12000);
  const state = await execute(sessionId, `
    return (function () {
      const secondaryItems = Array.from(document.querySelectorAll('[data-ccg-nav-secondary] > li'));
      const find = (href) => secondaryItems.find((item) => item.querySelector('a')?.getAttribute('href') === href);
      const visible = (item) => Boolean(item && getComputedStyle(item).display !== 'none' && item.getBoundingClientRect().width > 1);
      const menuHrefs = Array.from(document.querySelectorAll('[data-ccg-more-menu] a[href]')).map((link) => link.getAttribute('href'));
      return {
        pathname: window.location.pathname,
        emulationVisible: visible(find('/emulation.html')),
        emulationInMore: menuHrefs.includes('/emulation.html'),
        musicInMore: menuHrefs.includes('/music/'),
        publishersInMore: menuHrefs.includes('/games/publishers/'),
        ccgGamesVisibleInRow: visible(find('/games/ccg-games/')),
        installVisibleInRow: visible(find('/install-app.html')),
        ccgGamesInMore: menuHrefs.includes('/games/ccg-games/'),
        installInMore: menuHrefs.includes('/install-app.html'),
        aboutInMore: menuHrefs.includes('/about.html'),
        contactInMore: menuHrefs.includes('/contact.html')
      };
    })();
  `);

  if (state.pathname !== "/install-app.html" || state.emulationVisible || !state.emulationInMore || !state.musicInMore || !state.publishersInMore || state.ccgGamesVisibleInRow || state.installVisibleInRow || !state.ccgGamesInMore || !state.installInMore || !state.aboutInMore || !state.contactInMore) {
    throw new Error(`Install destination navigation contract failed at ${width}px: ${JSON.stringify(state)}`);
  }
}

async function main() {
  const driverPath = findChromeDriver();
  const siteServer = LIVE_BASE_URL ? null : createServer();
  if (siteServer) await new Promise((resolve) => siteServer.listen(SITE_PORT, HOST, resolve));

  await verifyLiveReleaseAssets();

  const driver = spawn(driverPath, [`--port=${DRIVER_PORT}`, "--allowed-ips="], {
    stdio: ["ignore", "ignore", "pipe"]
  });
  let driverError = "";
  driver.stderr.on("data", (chunk) => { driverError += String(chunk); });

  let sessionId = "";
  try {
    await waitForDriver();
    const session = await webdriver("POST", "/session", {
      capabilities: {
        alwaysMatch: {
          browserName: "chrome",
          pageLoadStrategy: "eager",
          "goog:chromeOptions": {
            args: [
              "--headless=new",
              "--no-sandbox",
              "--disable-dev-shm-usage",
              "--disable-gpu",
              "--window-size=1440,1000"
            ]
          }
        }
      }
    });
    sessionId = session.sessionId;

    // A fresh and a repeat visit in one browser profile must both stay free
    // of the retired Ask CCG launcher on desktop and mobile-sized viewports.
    for (const width of [1440, 390]) {
      await assertRetiredAskCCGAbsent(sessionId, width, "first visit");
      await assertRetiredAskCCGAbsent(sessionId, width, "return visit");
    }

    // Test actual composer-name search and no-results feedback on both viewport sizes.
    for (const width of [1440, 390]) {
      await assertMusicHubSearch(sessionId, width);
    }

    // Confirm real Games Archive year queries on desktop and mobile.
    for (const width of [1440, 390]) await assertGamesArchiveYearSearch(sessionId, width);

    // Verify the released Retro Specials dynamic thumbnails, one-shot fallback and search.
    for (const width of [1440, 390]) await assertRetroSpecialsBrowser(sessionId, width);

    // Confirm the owner-requested single-game Explore menu scrolls away normally.
    for (const width of [1440, 390]) await assertSingleGameExploreNormalFlow(sessionId, width);

    // Desktop regression: check the actual Fourthwall link with real pointer hit-testing.
    for (const width of [1440, 1920]) {
      await openHome(sessionId, width);
      await openMoreWithRealClick(sessionId, width);
      await assertMoreLinkOrder(sessionId, width);
      await assertLinkOwnsItsHitTarget(sessionId, "Merch Shop", "https://cheeky-commodore-gamer-shop.fourthwall.com/en-gbp");
      const merchLink = await execute(sessionId, `
        const links = Array.from(document.querySelectorAll('[data-ccg-more-menu] a[href="https://cheeky-commodore-gamer-shop.fourthwall.com/en-gbp"]'));
        const link = links[0];
        return link ? { count: links.length, label: link.textContent.trim(), target: link.target, rel: link.rel } : null;
      `);
      if (!merchLink || merchLink.count !== 1 || merchLink.label !== "Merch Shop" || merchLink.target !== "_blank" || !merchLink.rel.includes("noopener")) {
        throw new Error(`Desktop Merch Shop destination is missing or unsafe at ${width}px: ${JSON.stringify(merchLink)}`);
      }
    }

    await openHome(sessionId, 1440);
    const merchPanel = await execute(sessionId, `
      const panel = document.querySelector('.home-merch-promo');
      const hero = document.querySelector('.home-hero--streamlined');
      const archive = document.querySelector('.home-section--archive-dashboard');
      const rect = panel?.getBoundingClientRect();
      const style = panel ? getComputedStyle(panel) : null;
      const link = panel?.querySelector('a[href]');
      const linkRect = link?.getBoundingClientRect();
      const linkStyle = link ? getComputedStyle(link) : null;
      return {
        count: document.querySelectorAll('.home-merch-promo').length,
        afterHero: !!(panel && hero && (hero.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING)),
        afterArchive: !!(panel && archive && (archive.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING)),
        visible: !!(rect && rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0),
        linkVisible: !!(linkRect && linkRect.width > 1 && linkRect.height > 1 && linkStyle.display !== 'none' && linkStyle.visibility !== 'hidden' && Number(linkStyle.opacity || 1) > 0 && linkStyle.pointerEvents !== 'none'),
        destination: link?.getAttribute('href') || ''
      };
    `);
    if (merchPanel.count !== 1 || !merchPanel.afterHero || !merchPanel.afterArchive || !merchPanel.visible || !merchPanel.linkVisible || merchPanel.destination !== "https://cheeky-commodore-gamer-shop.fourthwall.com/en-gbp") {
      throw new Error(`Homepage Merch Shop panel is missing or hidden: ${JSON.stringify(merchPanel)}`);
    }

    for (const width of [1440, 1920]) {
      await clickMoreDestination(sessionId, width, "CCG Games", "/games/ccg-games/", "/games/ccg-games/");
      await clickMoreDestination(sessionId, width, "About Me", "/about.html", "/about.html");
      await clickMoreDestination(sessionId, width, "Contact", "/contact.html", "/contact.html");
      await clickMoreDestination(sessionId, width, "Emulation", "/emulation.html", "/emulation.html");
      await clickMoreDestination(sessionId, width, "Install CCG App", "/install-app.html", "/install-app.html");
      await assertInstallDestinationNavigation(sessionId, width);
    }

    await openHome(sessionId, 1440);
    const navState = await execute(sessionId, `
      return (function () {
        const nav = document.querySelector('[data-ccg-header] .ccg-nav');
        const style = nav ? getComputedStyle(nav) : null;
        const pinned = Array.from(document.querySelectorAll('[data-ccg-nav-secondary] > li')).filter((item) => {
          const href = item.querySelector('a')?.getAttribute('href');
          return href === '/games/ccg-games/' || href === '/install-app.html' || href === '/about.html' || href === '/contact.html';
        });
        return {
          syncing: document.documentElement.classList.contains('ccg-nav-syncing'),
          readyClass: document.documentElement.classList.contains('ccg-nav-ready'),
          visibility: style ? style.visibility : '',
          opacity: style ? style.opacity : '',
          display: style ? style.display : '',
          pinnedHidden: pinned.length === 4 && pinned.every((item) => getComputedStyle(item).display === 'none'),
          moreDisplay: getComputedStyle(document.querySelector('.ccg-nav__more')).display
        };
      })();
    `);

    if (navState.syncing || navState.readyClass) {
      throw new Error(`Obsolete navigation lifecycle class is still active: ${JSON.stringify(navState)}`);
    }
    if (navState.display === "none" || navState.visibility === "hidden" || Number(navState.opacity || 1) === 0) {
      throw new Error(`Canonical navigation is hidden: ${JSON.stringify(navState)}`);
    }
    if (!navState.pinnedHidden || navState.moreDisplay === "none") {
      throw new Error(`Desktop first-paint geometry contract is not stable: ${JSON.stringify(navState)}`);
    }

    const fallbackVisible = await execute(sessionId, `
      return Array.from(document.querySelectorAll('.ccg-socials-fallback')).some((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 1 && rect.height > 1;
      });
    `);
    if (fallbackVisible) throw new Error("Legacy text-social fallback is visible after navigation finalisation.");

    console.log(`${LIVE_BASE_URL ? "Live" : "Local"} Navigation More browser audit passed.`);
    if (LIVE_BASE_URL) console.log(`- Public release assets match the repository release at ${LIVE_BASE_URL}`);
    console.log("- Canonical Omega navigation remains visible without an obsolete hide/show lifecycle");
    console.log("- Desktop CCG Games, Install CCG App, About Me and Contact copies stay out of the visible row while More keeps its slot");
    console.log("- Real WebDriver pointer clicks open More at 1440px and 1920px");
    console.log("- CCG Games, Install CCG App, About Me and Contact own their hit targets and navigate successfully at both widths");
    console.log("- Official Merch Shop is visible and interactable in desktop More at 1440px and 1920px");
    console.log("- Desktop More lists archive routes first and ends with Merch Shop, Install, CCG Games, About Me and Contact in that order");
    console.log("- Homepage merchandise promotion is visible after the hero and before the discovery dashboard");
    console.log("- Emulation, Music and Publishers are reachable from More on the Install destination at both widths");
    console.log("- Destination pages retain the canonical shared header");
    console.log("- Legacy text-social fallback is not visible");
    console.log("- Retired Ask CCG launcher, scripts and resource requests are absent on first and return desktop/mobile visits");
    console.log("- Music Hub search ignores track-count badges, resolves historical aliases, announces no results and restores all composers at desktop/mobile widths");
    console.log("- Games Archive year, title and combined queries, wrong-year rejection and reset pass at desktop/mobile widths");
    console.log("- Retro Specials dynamic cards, safe thumbnail dimensions, one-shot image fallback and search pass at desktop/mobile widths");
    console.log("- Single-game Explore menu stays in document flow above Video Archive and scrolls away at desktop/mobile widths");
  } finally {
    if (sessionId) {
      try { await webdriver("DELETE", `/session/${sessionId}`); } catch (error) {}
    }
    driver.kill("SIGTERM");
    if (siteServer) await new Promise((resolve) => siteServer.close(resolve));
    if (driverError && process.env.CCG_NAV_AUDIT_DEBUG === "1") process.stderr.write(driverError);
  }
}

main().catch((error) => {
  console.error(`Navigation More browser audit failed: ${error.message}`);
  process.exit(1);
});