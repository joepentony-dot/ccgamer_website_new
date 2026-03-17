(function () {
  const MIN_ARCHIVE_CREDITS = 5;
  const APPROVED_COMPOSERS = [
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

  const APPROVED_BY_NAME = new Map(APPROVED_COMPOSERS.map((entry) => [normalizeComposerKey(entry.name), entry]));

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
    const approved = APPROVED_BY_NAME.get(normalizeComposerKey(name));
    if (approved) return approved.slug;
    return encodeURIComponent(normalizeComposerKey(name).replace(/\s+/g, "-"));
  }

  function readComposerName() {
    const container = document.querySelector("[data-composer-name]");
    return container ? String(container.getAttribute("data-composer-name") || "").trim() : "";
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === "") return [];
    return [value];
  }

  function getComposerValues(game) {
    return [
      ...toArray(game && game.composer),
      ...toArray(game && game?.credits?.musician),
      ...toArray(game && game.music)
    ]
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
      .filter((entry) => !/\.mp3$/i.test(entry))
      .map(canonicalizeComposerName)
      .filter(Boolean);
  }

  function buildComposerIndex(games) {
    const index = new Map();
    (games || []).forEach((game) => {
      getComposerValues(game).forEach((name) => {
        if (!index.has(name)) {
          index.set(name, []);
        }
        const list = index.get(name);
        if (!list.some((entry) => entry?.id === game?.id)) {
          list.push(game);
        }
      });
    });
    return index;
  }

  function resolveComposerFromPage(index) {
    const urlComposer = new URLSearchParams(window.location.search).get("composer");
    const pageComposer = readComposerName();
    const rawComposer = urlComposer ? String(urlComposer).replace(/[-_]+/g, " ") : pageComposer;
    const candidate = canonicalizeComposerName(rawComposer);
    if (!candidate || !index.has(candidate)) return "";
    const creditCount = index.get(candidate).length;
    if (APPROVED_BY_NAME.has(normalizeComposerKey(candidate)) || creditCount >= MIN_ARCHIVE_CREDITS) {
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
    games.forEach((game) => {
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

      const title = document.createElement("span");
      title.textContent = String(game.title || game.slug || "Untitled game");

      link.appendChild(thumbnail);
      link.appendChild(title);

      const cue = document.createElement("span");
      cue.className = "ccg-composer-games__cue";
      cue.textContent = "Listen on game page";

      li.appendChild(link);
      li.appendChild(cue);
      fragment.appendChild(li);
    });

    listEl.appendChild(fragment);
  }

  function renderFeaturedComposers(currentName) {
    const root = getSiteRoot();
    const container = document.getElementById("composer-featured-list");
    if (!container) return;

    container.innerHTML = "";
    APPROVED_COMPOSERS.filter((composer) => composer.name !== currentName).forEach((composer) => {
      const link = document.createElement("a");
      link.href = `${root}music/${composer.slug}.html`;
      link.className = "ccg-composer-chip";
      link.textContent = composer.name;
      container.appendChild(link);
    });
  }

  function renderComposerMeta(composerName, count) {
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
  }

  function renderHub(index) {
    const featuredEl = document.getElementById("music-featured-composers");
    const extraEl = document.getElementById("music-additional-composers");
    if (!featuredEl && !extraEl) return;

    const root = getSiteRoot();
    const featuredKeys = new Set(APPROVED_COMPOSERS.map((entry) => normalizeComposerKey(entry.name)));
    if (featuredEl) {
      featuredEl.innerHTML = "";
      APPROVED_COMPOSERS.forEach((composer) => {
        const link = document.createElement("a");
        link.className = "ccg-music-hub__composer";
        link.href = `${root}music/${composer.slug}.html`;
        link.textContent = composer.name;
        featuredEl.appendChild(link);
      });
    }

    if (extraEl) {
      extraEl.innerHTML = "";
      Array.from(index.entries())
        .filter(([name, games]) => !featuredKeys.has(normalizeComposerKey(name)) && games.length >= MIN_ARCHIVE_CREDITS)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([name, games]) => {
          const link = document.createElement("a");
          link.className = "ccg-music-hub__composer";
          link.href = `${root}music/composer.html?composer=${composerSlug(name)}`;
          link.textContent = `${name} (${games.length})`;
          extraEl.appendChild(link);
        });
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

      renderFeaturedComposers(composerName);
      const games = composerIndex.get(composerName) || [];
      renderComposerMeta(composerName, games.length);
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
