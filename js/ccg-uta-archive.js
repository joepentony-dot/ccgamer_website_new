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

  function loadData() {
    if (!dataPromise) {
      dataPromise = fetch(DATA_URL, { credentials: "same-origin", cache: "no-cache" })
        .then(function (response) {
          if (!response.ok) throw new Error("UTA map HTTP " + response.status);
          return response.json();
        });
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
      const data = await loadData();
      const record = data && data.games ? data.games[slug] : null;
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

  function canonicalSlugFromLocation() {
    try {
      const pathname = String(window.location.pathname || "");
      const match = pathname.match(/\/games\/([^/?#]+)\/(?:index\.html)?$/i);
      if (!match || !match[1]) return "";
      const slug = decodeURIComponent(match[1]).trim().toLowerCase();
      return /^[a-z0-9-]+$/.test(slug) ? slug : "";
    } catch (_) {
      return "";
    }
  }

  function canonicalTitle() {
    const title = document.getElementById("gameHeroTitle")?.textContent
      || document.querySelector("h1")?.textContent
      || document.title
      || "this game";
    return String(title).trim();
  }

  async function hydrateCanonicalRoute() {
    const slug = canonicalSlugFromLocation();
    if (!slug) return;

    try {
      const data = await loadData();
      const record = data && data.games ? data.games[slug] : null;
      if (!record) {
        hideSection();
        return;
      }

      // The committed UTA map is C64-only, so a canonical slug match is enough
      // to render immediately. This avoids making Tape Archive visibility depend
      // on the much larger games.json hydration path completing first.
      render({ slug: slug, title: canonicalTitle(), system: "C64" }, record);
    } catch (error) {
      console.warn("[CCG UTA] Canonical tape archive bootstrap unavailable.", error);
      hideSection();
    }
  }

  window.addEventListener("ccg:game-loaded", function (event) {
    handleGame(event && event.detail ? event.detail.game : null);
  });

  hydrateCanonicalRoute();
})();
