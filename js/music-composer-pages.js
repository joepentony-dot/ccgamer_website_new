(function () {
  const MIN_ARCHIVE_CREDITS = 5;
  const FEATURED_COMPOSERS = [
    { name: "Rob Hubbard", slug: "rob-hubbard" },
    { name: "Martin Galway", slug: "martin-galway" },
    { name: "Ben Daglish", slug: "ben-daglish" },
    { name: "Matt Gray", slug: "matt-gray" },
    { name: "David Whittaker", slug: "david-whittaker" },
    { name: "Jeroen Tel", slug: "jeroen-tel" },
    { name: "Fred Gray", slug: "fred-gray" },
    { name: "Chris Hülsbeck", slug: "chris-huelsbeck" },
    { name: "Tim Follin", slug: "tim-follin" },
    { name: "Reyn Ouwehand", slug: "reyn-ouwehand" }
  ];

  const CANONICAL_NAME_MAP = {
    "rob hubbard": "Rob Hubbard",
    "r hubbard": "Rob Hubbard",
    "r. hubbard": "Rob Hubbard",
    "martin galway": "Martin Galway",
    "ben daglish": "Ben Daglish",
    "matt gray": "Matt Gray",
    "david whittaker": "David Whittaker",
    "jeroen tel": "Jeroen Tel",
    "fred gray": "Fred Gray",
    "chris huelsbeck": "Chris Hülsbeck",
    "chris hülsbeck": "Chris Hülsbeck",
    "tim follin": "Tim Follin",
    "reyn ouwehand": "Reyn Ouwehand"
  };

  const FEATURED_BY_NAME = new Map(FEATURED_COMPOSERS.map((entry) => [normalizeComposerKey(entry.name), entry]));

  function getSiteRoot() {
    if (typeof window !== "undefined" && typeof window.ccgGetSiteRoot === "function") {
      return window.ccgGetSiteRoot();
    }
    return "/";
  }

  function normalizeComposerKey(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function canonicalizeComposerName(value) {
    const key = normalizeComposerKey(value);
    if (!key) return "";
    if (CANONICAL_NAME_MAP[key]) return CANONICAL_NAME_MAP[key];
    return key.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function composerSlug(name) {
    const featured = FEATURED_BY_NAME.get(normalizeComposerKey(name));
    if (featured) return featured.slug;
    return normalizeComposerKey(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function readComposerName() {
    const container = document.querySelector("[data-composer-name]");
    return container ? String(container.getAttribute("data-composer-name") || "").trim() : "";
  }

  function composerFromPath() {
    const pathname = String(window.location.pathname || "").split("/").filter(Boolean);
    const last = pathname[pathname.length - 1] || "";
    const slug = last.replace(/\.html$/i, "");
    if (!slug || slug === "index" || slug === "composer") return "";
    return slug.replace(/[-_]+/g, " ");
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === "") return [];
    return [value];
  }

  function getComposerValues(game) {
    const seen = new Set();
    return [
      ...toArray(game && game.composer),
      ...toArray(game && game?.credits?.musician),
      ...toArray(game && game.music)
    ]
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
      .filter((entry) => !/\.mp3$/i.test(entry))
      .map(canonicalizeComposerName)
      .filter(Boolean)
      .filter((entry) => {
        const key = normalizeComposerKey(entry);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function buildComposerIndex(games) {
    const index = new Map();
    (games || []).forEach((game) => {
      getComposerValues(game).forEach((name) => {
        if (!index.has(name)) {
          index.set(name, []);
        }
        const list = index.get(name);
        if (!list.some((entry) => entry?.id === game?.id || entry?.slug === game?.slug)) {
          list.push(game);
        }
      });
    });
    return index;
  }

  function getEligibleComposerNames(index) {
    const featured = FEATURED_COMPOSERS.map((entry) => entry.name);
    const extras = Array.from(index.entries())
      .filter(([name, games]) => !FEATURED_BY_NAME.has(normalizeComposerKey(name)) && games.length >= MIN_ARCHIVE_CREDITS)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name]) => name);
    return [...featured, ...extras];
  }

  function resolveComposerFromPage(index) {
    const urlComposer = new URLSearchParams(window.location.search).get("composer");
    const pageComposer = readComposerName();
    const pathComposer = composerFromPath();
    const rawComposer = urlComposer ? String(urlComposer).replace(/[-_]+/g, " ") : (pageComposer || pathComposer);
    const candidate = canonicalizeComposerName(rawComposer);
    if (!candidate || !index.has(candidate)) return "";
    const creditCount = index.get(candidate).length;
    if (FEATURED_BY_NAME.has(normalizeComposerKey(candidate)) || creditCount >= MIN_ARCHIVE_CREDITS) {
      return candidate;
    }
    return "";
  }


  function resolveThumbnailUrl(game) {
    const raw = String(game && game.thumbnail || "").trim();
    const fallback = "/resources/images/thumbnails/placeholder.png";
    if (!raw) return `${getSiteRoot()}${fallback.replace(/^\/+/, "")}`;
    if (/^(https?:)?\/\//i.test(raw)) return raw;
    return `${getSiteRoot()}${raw.replace(/^\/+/, "")}`;
  }

  function gameUrl(game) {
    const slug = String(game && game.slug || "").trim();
    const root = getSiteRoot();
    return slug ? `${root}games/${slug}.html` : `${root}games/index.html`;
  }

  function renderGames(listEl, games, composerName) {
    listEl.innerHTML = "";

    if (!games.length) {
      const empty = document.createElement("li");
      empty.textContent = `No games found for ${composerName} yet.`;
      listEl.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    games
      .slice()
      .sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")))
      .forEach((game) => {
      const li = document.createElement("li");
      li.className = "ccg-composer-games__item";

      const link = document.createElement("a");
      link.href = gameUrl(game);
      link.className = "ccg-composer-game-link";
      const thumbnail = document.createElement("img");
      thumbnail.className = "ccg-composer-game-thumb";
      thumbnail.src = resolveThumbnailUrl(game);
      thumbnail.alt = `${String(game.title || "Game")} thumbnail`;
      thumbnail.loading = "lazy";

      const content = document.createElement("span");
      content.className = "ccg-composer-game-meta";
      const title = document.createElement("span");
      title.className = "ccg-composer-game-title";
      title.textContent = String(game.title || game.slug || "Untitled game");
      const minor = document.createElement("span");
      minor.className = "ccg-composer-game-minor";
      const year = String(game.year || "").trim();
      const publisher = Array.isArray(game.publisher) ? String(game.publisher[0] || "").trim() : String(game.publisher || "").trim();
      minor.textContent = [year, publisher].filter(Boolean).join(" • ");

      content.appendChild(title);
      if (minor.textContent) {
        content.appendChild(minor);
      }

      link.appendChild(thumbnail);
      link.appendChild(content);

      const cue = document.createElement("span");
      cue.className = "ccg-composer-games__cue";
      cue.textContent = "Open game page";

      li.appendChild(link);
      li.appendChild(cue);
      fragment.appendChild(li);
    });

    listEl.appendChild(fragment);
  }

  function renderComposerChips(id, names, currentName) {
    const root = getSiteRoot();
    const container = document.getElementById(id);
    if (!container) return;

    container.innerHTML = "";
    names.filter((name) => name !== currentName).forEach((name) => {
      const link = document.createElement("a");
      link.href = `${root}music/${composerSlug(name)}.html`;
      link.className = "ccg-composer-chip";
      link.textContent = name;
      container.appendChild(link);
    });
  }

  function renderComposerMeta(composerName, count, eligibleNames) {
    const titleEl = document.querySelector(".ccg-composer-title");
    const subEl = document.querySelector(".ccg-composer-subtitle");
    if (titleEl) {
      titleEl.textContent = `${composerName} — Commodore 64 Music`;
    }
    if (subEl) {
      subEl.textContent = `${count} games on Cheeky Commodore Gamer`;
    }
    document.title = `${composerName} — Commodore 64 Music & Games | Cheeky Commodore Gamer`;

    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute("content", `Explore the legendary Commodore 64 music of ${composerName}, including every C64 game featuring their iconic SID soundtracks.`);
    }

    const nav = document.getElementById("composer-nav-row");
    if (nav) {
      const root = getSiteRoot();
      nav.innerHTML = "";
      [
        ["Back to Music Hub", `${root}music/index.html`],
        ["Browse All Composers", `${root}music/index.html#all-composers`],
        ["Featured Composers", `${root}music/index.html#featured-composers`]
      ].forEach(([label, href]) => {
        const link = document.createElement("a");
        link.className = "ccg-composer-nav__button";
        link.href = href;
        link.textContent = label;
        nav.appendChild(link);
      });
      eligibleNames
        .filter((name) => name !== composerName)
        .slice(0, 4)
        .forEach((name) => {
          const link = document.createElement("a");
          link.className = "ccg-composer-nav__button ccg-composer-nav__button--secondary";
          link.href = `${root}music/${composerSlug(name)}.html`;
          link.textContent = name;
          nav.appendChild(link);
        });
    }
  }

  function renderHub(index) {
    const featuredEl = document.getElementById("music-featured-composers");
    const extraEl = document.getElementById("music-additional-composers");
    if (!featuredEl && !extraEl) return;

    const root = getSiteRoot();
    const eligibleNames = getEligibleComposerNames(index);
    const featuredKeys = new Set(FEATURED_COMPOSERS.map((entry) => normalizeComposerKey(entry.name)));
    if (featuredEl) {
      featuredEl.innerHTML = "";
      FEATURED_COMPOSERS.forEach((composer) => {
        const link = document.createElement("a");
        link.className = "ccg-music-hub__composer";
        link.href = `${root}music/${composer.slug}.html`;
        const count = (index.get(composer.name) || []).length;
        link.innerHTML = `<strong>${composer.name}</strong><span>${count} games</span>`;
        featuredEl.appendChild(link);
      });
    }

    if (extraEl) {
      extraEl.innerHTML = "";
      eligibleNames.forEach((name) => {
        const link = document.createElement("a");
        link.className = "ccg-music-hub__composer";
        link.href = `${root}music/${composerSlug(name)}.html`;
        const games = index.get(name) || [];
        const isFeatured = featuredKeys.has(normalizeComposerKey(name));
        link.innerHTML = `<strong>${name}</strong><span>${games.length} games${isFeatured ? " • Featured" : ""}</span>`;
        extraEl.appendChild(link);
      });
      extraEl.id = "all-composers";
    }

    if (featuredEl) {
      featuredEl.id = "featured-composers";
    }

    const stats = document.getElementById("music-hub-stats");
    if (stats) {
      stats.textContent = `${eligibleNames.length} composers currently featured in the Cheeky Commodore Gamer music archive.`;
    }
  }

  async function init() {
    const listEl = document.getElementById("composer-games");

    try {
      const root = getSiteRoot();
      const response = await fetch(`${root}games/games.json`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Unable to load games.json (${response.status})`);
      const data = await response.json();
      const allGames = Array.isArray(data) ? data : [];
      const composerIndex = buildComposerIndex(allGames);
      const eligibleNames = getEligibleComposerNames(composerIndex);

      renderHub(composerIndex);

      if (!listEl) return;

      const composerName = resolveComposerFromPage(composerIndex);
      if (!composerName) {
        listEl.innerHTML = "";
        const empty = document.createElement("li");
        empty.textContent = "Composer archive unavailable.";
        listEl.appendChild(empty);
        return;
      }

      renderComposerChips("composer-featured-list", FEATURED_COMPOSERS.map((entry) => entry.name), composerName);
      renderComposerChips("composer-all-list", eligibleNames, composerName);
      const games = composerIndex.get(composerName) || [];
      renderComposerMeta(composerName, games.length, eligibleNames);
      renderGames(listEl, games, composerName);
    } catch (error) {
      renderHub(new Map());
      if (!listEl) return;
      listEl.innerHTML = "";
      const errorItem = document.createElement("li");
      errorItem.textContent = "Unable to load composer games right now.";
      listEl.appendChild(errorItem);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
