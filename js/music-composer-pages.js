(function () {
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

  const APPROVED_BY_NAME = new Map(APPROVED_COMPOSERS.map((entry) => [normalizeName(entry.name), entry]));

  function getSiteRoot() {
    if (typeof window !== "undefined" && typeof window.ccgGetSiteRoot === "function") {
      return window.ccgGetSiteRoot();
    }
    return "/";
  }

  function normalizeName(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
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
    ].map((entry) => String(entry || "").trim()).filter(Boolean);
  }

  function includesComposer(game, composerName) {
    const key = normalizeName(composerName);
    return getComposerValues(game).some((value) => normalizeName(value) === key);
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
      link.textContent = String(game.title || game.slug || "Untitled game");

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

  async function init() {
    const composerName = readComposerName();
    const listEl = document.getElementById("composer-games");
    if (!listEl || !composerName || !APPROVED_BY_NAME.has(normalizeName(composerName))) return;

    renderFeaturedComposers(composerName);

    try {
      const root = getSiteRoot();
      const response = await fetch(`${root}games/games-search.json`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Unable to load games-search.json (${response.status})`);
      const data = await response.json();
      const games = Array.isArray(data)
        ? data.filter((game) => includesComposer(game, composerName))
        : [];
      renderGames(listEl, games, composerName);
    } catch (error) {
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
