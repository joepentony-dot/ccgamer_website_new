(function () {
  const APPROVED_COMPOSERS = new Set([
    "Rob Hubbard",
    "Martin Galway",
    "Ben Daglish",
    "Matt Gray",
    "David Whittaker",
    "Jeroen Tel",
    "Fred Gray",
    "Chris Hülsbeck",
    "Tim Follin",
    "Reyn Ouwehand"
  ]);

  function readComposerName() {
    const container = document.querySelector("[data-composer-name]");
    return container ? String(container.getAttribute("data-composer-name") || "").trim() : "";
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === "") return [];
    return [value];
  }

  function includesComposer(game, composerName) {
    const musicList = toArray(game && game.music).map((entry) => String(entry || "").trim().toLowerCase());
    return musicList.includes(composerName.toLowerCase());
  }

  function gameUrl(game) {
    const slug = String(game && game.slug || "").trim();
    return slug ? `/games/${slug}/` : "/games/index.html";
  }

  function renderGames(listEl, games, composerName) {
    listEl.innerHTML = "";

    if (!games.length) {
      const empty = document.createElement("li");
      empty.textContent = `No games found where game.music includes ${composerName}.`;
      listEl.appendChild(empty);
      return;
    }

    games.forEach((game) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = gameUrl(game);
      link.textContent = String(game.title || game.slug || "Untitled game");
      li.appendChild(link);
      listEl.appendChild(li);
    });
  }

  async function init() {
    const composerName = readComposerName();
    const listEl = document.getElementById("composer-games");
    if (!listEl || !composerName || !APPROVED_COMPOSERS.has(composerName)) return;

    try {
      const response = await fetch("/games/games-search.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Unable to load games-search.json (${response.status})`);
      const data = await response.json();
      const games = Array.isArray(data) ? data.filter((game) => includesComposer(game, composerName)) : [];
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
