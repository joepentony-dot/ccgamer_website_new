(function () {
  const DATA_URL = "/data/uta-game-matches.json";
  let dataPromise = null;

  function isC64(game) {
    const system = String(game && game.system || "").trim().toLowerCase();
    return system === "c64" || system === "commodore 64";
  }

  function getSection() {
    return document.getElementById("game-tape-archive-section");
  }

  function getMount() {
    return document.getElementById("game-tape-archive-list");
  }

  function hideSection() {
    const section = getSection();
    if (section) section.hidden = true;
  }

  function fetchData(cacheMode) {
    return fetch(DATA_URL, { credentials: "same-origin", cache: cacheMode })
      .then(function (response) {
        if (!response.ok) throw new Error("UTA map HTTP " + response.status);
        return response.json();
      });
  }

  function loadData(forceRefresh) {
    if (forceRefresh) {
      dataPromise = fetchData("reload");
      return dataPromise;
    }

    if (!dataPromise) {
      // UTA mappings are regenerated as games and re-releases are added. Always
      // revalidate the JSON instead of allowing an old browser HTTP cache entry
      // to hide a newly published Tape Archive section.
      dataPromise = fetchData("no-cache");
    }
    return dataPromise;
  }

  function makeMeta(label, value) {
    if (!value) return null;
    const span = document.createElement("span");
    span.className = "ccg-uta-release__meta";
    const strong = document.createElement("strong");
    strong.textContent = label + ": ";
    span.appendChild(strong);
    span.appendChild(document.createTextNode(String(value)));
    return span;
  }

  function render(game, record) {
    const section = getSection();
    const mount = getMount();
    if (!section || !mount || !record || !Array.isArray(record.releases) || !record.releases.length) {
      hideSection();
      return;
    }

    mount.replaceChildren();

    record.releases.forEach(function (release) {
      const card = document.createElement("article");
      card.className = "ccg-uta-release";

      const heading = document.createElement("h3");
      heading.className = "ccg-uta-release__title";
      heading.textContent = release.sourceRole === "re-release" ? "Cassette re-release" : "Cassette release";
      card.appendChild(heading);

      const meta = document.createElement("div");
      meta.className = "ccg-uta-release__details";
      [
        makeMeta("Publisher", release.publisher),
        makeMeta("Year", release.year),
        makeMeta("Tape loader", release.loader)
      ].filter(Boolean).forEach(function (item) { meta.appendChild(item); });
      card.appendChild(meta);

      const link = document.createElement("a");
      link.className = "ccg-btn ccg-btn--secondary ccg-uta-release__button";
      link.href = release.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "View Tape Archive";
      link.setAttribute("aria-label", "View " + String(game.title || "this game") + " tape archive release at Ultimate Tape Archive");
      card.appendChild(link);

      mount.appendChild(card);
    });

    section.hidden = false;
  }

  async function handleGame(game) {
    if (!game || !isC64(game)) {
      hideSection();
      return;
    }

    const slug = String(game.slug || "").trim();
    if (!slug) {
      hideSection();
      return;
    }

    try {
      let data = await loadData(false);
      let record = data && data.games ? data.games[slug] : null;

      // A visitor may still have a pre-fix mapping in the browser's HTTP cache.
      // If this slug is absent, bypass that cache once before deciding that the
      // game genuinely has no confident UTA release.
      if (!record) {
        data = await loadData(true);
        record = data && data.games ? data.games[slug] : null;
      }

      if (!record) {
        hideSection();
        return;
      }
      render(game, record);
    } catch (error) {
      console.warn("[CCG UTA] Tape archive mapping unavailable.", error);
      hideSection();
    }
  }

  window.addEventListener("ccg:game-loaded", function (event) {
    handleGame(event && event.detail ? event.detail.game : null);
  });
})();
