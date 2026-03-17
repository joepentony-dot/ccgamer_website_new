(function () {
  const PROFILE_DATA = {
    "allister-brimble": { name: "Allister Brimble", slug: "allister-brimble", bio: "Allister Brimble is a British game composer known for work on home computers and 16-bit platforms, including projects on Commodore systems and beyond." },
    "barry-leitch": { name: "Barry Leitch", slug: "barry-leitch", bio: "Barry Leitch is a game composer associated with Amiga-era releases and later soundtrack work across multiple platforms." },
    "ben-daglish": { name: "Ben Daglish", slug: "ben-daglish", born: "1966-07-31", birthplace: "London, England", bio: "Ben Daglish was an English composer and musician whose work became a major part of 1980s home-computer gaming. He is best known for C64 scores including The Last Ninja, Krakout and Deflektor, and he also wrote music for Amiga releases." },
    "chris-huelsbeck": { name: "Chris Hülsbeck", slug: "chris-huelsbeck", aliases: ["Chris Hulsbeck"], born: "1968-03-02", birthplace: "Kassel, Germany", bio: "Chris Hülsbeck is a German game composer known for European home-computer soundtracks including The Great Giana Sisters and the Turrican series across C64 and Amiga eras." },
    "dave-thomas": { name: "Dave Thomas", slug: "dave-thomas", bio: "Dave Thomas is credited on Commodore 64 game soundtracks in the archive catalogue." },
    "david-dunn": { name: "David Dunn", slug: "david-dunn", bio: "David Dunn is credited on Commodore-era game music releases represented in this archive." },
    "david-whittaker": { name: "David Whittaker", slug: "david-whittaker", born: "1957-04-24", birthplace: "Bury, Lancashire, England", bio: "David Whittaker is an English video-game composer whose music spans major home-computer formats from the 1980s and early 1990s, including notable C64 and Amiga work." },
    "fred-gray": { name: "Fred Gray", slug: "fred-gray", bio: "Fred Gray is an English game composer known for Commodore 64 and Amiga-era music, with credits including Shadowfire and Mutants." },
    "jeroen-tel": { name: "Jeroen Tel", slug: "jeroen-tel", born: "1972-05-19", birthplace: "Eindhoven, Netherlands", bio: "Jeroen Tel is a Dutch composer known for late-1980s and early-1990s computer game music, including C64 and Amiga releases and his work with Maniacs of Noise." },
    "jonathan-dunn": { name: "Jonathan Dunn", slug: "jonathan-dunn", bio: "Jonathan Dunn is known for distinctive Commodore 64 music and sound design, including well-known Ocean Software-era credits." },
    "keith-tinman": { name: "Keith Tinman", slug: "keith-tinman", bio: "Keith Tinman is credited on classic C64 game music releases in this archive." },
    "mark-cooksey": { name: "Mark Cooksey", slug: "mark-cooksey", bio: "Mark Cooksey is a British composer known for C64 and Amiga game themes in the late 1980s and early 1990s." },
    "martin-galway": { name: "Martin Galway", slug: "martin-galway", born: "1966-01-03", birthplace: "Belfast, Northern Ireland", bio: "Martin Galway is a British composer strongly associated with Commodore 64 game music, particularly Ocean-era scores and loader tracks." },
    "matt-furniss": { name: "Matt Furniss", slug: "matt-furniss", bio: "Matt Furniss is an English composer known for prolific game music work spanning C64, Amiga, and later console generations." },
    "matt-gray": { name: "Matt Gray", slug: "matt-gray", born: "1970-05", birthplace: "Kent, England", bio: "Matt Gray is a British producer and composer known for Commodore 64 music, especially his soundtrack work on Last Ninja 2." },
    "neil-brennan": { name: "Neil Brennan", slug: "neil-brennan", bio: "Neil Brennan is credited on Commodore 64 game music releases represented in the archive." },
    "paul-hodgson": { name: "Paul Hodgson", slug: "paul-hodgson", bio: "Paul Hodgson is credited on C64-era game soundtracks in this collection." },
    "richard-joseph": { name: "Richard Joseph", slug: "richard-joseph", bio: "Richard Joseph was a British game composer and audio director known for C64 and Amiga-era scores." },
    "rob-hubbard": { name: "Rob Hubbard", slug: "rob-hubbard", born: "1955", birthplace: "Kingston upon Hull, England", bio: "Rob Hubbard is a British composer and programmer best known for influential Commodore 64 game music in the 1980s, including Commando, Monty on the Run, and International Karate." },
    "russell-lieblich": { name: "Russell Lieblich", slug: "russell-lieblich", bio: "Russell Lieblich is known for SID music work on the Commodore 64, including his score for Mutants." }
  };


  const ASSET_EXISTS_CACHE = new Map();
  const COMPOSER_IMAGE_CACHE = new Map();
  const FEATURED_PRIORITY = [
    "rob hubbard",
    "martin galway",
    "jeroen tel",
    "jonathan dunn",
    "matt gray",
    "mark cooksey",
    "neil brennan",
    "richard joseph",
    "russell lieblich"
  ];

  function slugifyName(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normaliseName(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function getComposerNamesFromGame(game) {
    if (!game || typeof game !== "object") {
      return [];
    }

    const credits = game.credits && typeof game.credits === "object" ? game.credits : null;
    const fromCredits = credits && Array.isArray(credits.musician) ? credits.musician : [];
    const fromMusicBy = Array.isArray(game.musicBy) ? game.musicBy : [];
    const fromComposers = Array.isArray(game.composers) ? game.composers : [];
    const fromComposer = typeof game.composer === "string" ? [game.composer] : [];
    const fromLegacyMusicNames = Array.isArray(game.music)
      ? game.music.filter((item) => typeof item === "string" && /[a-zA-Z]/.test(item) && !/\.(mp3|ogg|wav|flac)$/i.test(item))
      : [];

    return [...fromCredits, ...fromMusicBy, ...fromComposers, ...fromComposer, ...fromLegacyMusicNames]
      .map((name) => String(name || "").trim())
      .filter(Boolean);
  }

  function createComposerRegistry() {
    const composers = Object.values(PROFILE_DATA).map((profile) => ({
      ...profile,
      slug: profile.slug || slugifyName(profile.name),
      aliases: Array.isArray(profile.aliases) ? profile.aliases : []
    }));

    const byKey = new Map();
    const bySlug = new Map();

    composers.forEach((composer) => {
      bySlug.set(composer.slug, composer);
      byKey.set(normaliseName(composer.name), composer);
      composer.aliases.forEach((alias) => byKey.set(normaliseName(alias), composer));
    });

    return { composers, byKey, bySlug };
  }

  function resolveSiteRoot() {
    const root = (typeof window !== "undefined" && typeof window.ccgGetSiteRoot === "function")
      ? window.ccgGetSiteRoot()
      : "/";
    return root.endsWith("/") ? root : `${root}/`;
  }

  function getGameUrl(slug) {
    return `${resolveSiteRoot()}games/${slug}/`;
  }

  function getComposerUrl(slug) {
    return `${resolveSiteRoot()}music/${slug}.html`;
  }

  function getComposerImageCandidates(slug) {
    const base = `/resources/images/composers/${slug}`;
    return [`${base}.jpg`, `${base}.jpeg`, `${base}.png`, `${base}.webp`];
  }

  function resolveThumbnailPath(game) {
    const raw = String(game?.thumbnail || game?.thumb || game?.cover || "").trim();
    if (!raw) {
      return "";
    }

    const cleaned = raw
      .replace(/^\/+/, "")
      .replace(/^resources\/images\/thumbnails\/all\//, "")
      .replace(/^resources\/images\/thumbnails\//, "")
      .replace(/^resources\/images\//, "");

    if (!cleaned) {
      return "";
    }

    return `/resources/images/thumbnails/all/${cleaned}`;
  }

  function getGameMusicPath(game) {
    const slug = String(game?.slug || "").trim();
    if (!slug) {
      return "";
    }
    return `${resolveSiteRoot()}resources/audio/games/${encodeURIComponent(slug)}.mp3`;
  }

  function getPlatformLabel(systems) {
    const values = Array.from(systems || [])
      .map((value) => String(value || "").trim().toUpperCase())
      .filter(Boolean);

    const hasC64 = values.some((value) => value.includes("C64") || value.includes("COMMODORE 64"));
    const hasAmiga = values.some((value) => value.includes("AMIGA"));

    const labels = [];
    if (hasAmiga) labels.push("AMIGA");
    if (hasC64) labels.push("C64");

    return labels.length ? labels.join(" / ") : "";
  }

  async function assetExists(path) {
    if (!path) {
      return false;
    }
    if (ASSET_EXISTS_CACHE.has(path)) {
      return ASSET_EXISTS_CACHE.get(path);
    }

    const request = fetch(path, { method: "HEAD", cache: "force-cache" })
      .then((response) => response.ok)
      .catch(() => false);

    ASSET_EXISTS_CACHE.set(path, request);
    const exists = await request;
    ASSET_EXISTS_CACHE.set(path, exists);
    return exists;
  }

  async function getComposerImagePath(slug) {
    if (COMPOSER_IMAGE_CACHE.has(slug)) {
      return COMPOSER_IMAGE_CACHE.get(slug);
    }

    for (const candidate of getComposerImageCandidates(slug)) {
      if (await assetExists(candidate)) {
        COMPOSER_IMAGE_CACHE.set(slug, candidate);
        return candidate;
      }
    }

    COMPOSER_IMAGE_CACHE.set(slug, "");
    return "";
  }

  function collectComposerStats(games, registry) {
    const stats = new Map();

    registry.composers.forEach((composer) => {
      stats.set(composer.slug, {
        games: [],
        systems: new Set()
      });
    });

    games.forEach((game) => {
      const names = getComposerNamesFromGame(game);
      const matched = new Set();

      names.forEach((name) => {
        const key = normaliseName(name);
        if (!key) {
          return;
        }

        let composer = registry.byKey.get(key);
        if (!composer) {
          const slugGuess = slugifyName(name);
          composer = registry.bySlug.get(slugGuess);
        }

        if (!composer || matched.has(composer.slug)) {
          return;
        }

        matched.add(composer.slug);

        const bucket = stats.get(composer.slug);
        if (!bucket) {
          return;
        }

        bucket.games.push(game);
        const systemLabel = String(game.system || "").trim().toUpperCase();
        if (systemLabel) {
          bucket.systems.add(systemLabel);
        }
      });
    });

    return stats;
  }

  function buildFeaturedSet(imageLookups, stats) {
    const existingFeatured = imageLookups.filter((item) => Boolean(item.imagePath)).slice(0, 6);
    const priorityFeatured = FEATURED_PRIORITY
      .map((priorityName) => imageLookups.find((item) => normaliseName(item.composer.name) === priorityName))
      .filter(Boolean);

    const featuredMap = new Map();
    [...existingFeatured, ...priorityFeatured].forEach((item) => {
      featuredMap.set(normaliseName(item.composer.name), item);
    });

    const extendedFeatured = imageLookups.filter((item) => {
      const bucket = stats.get(item.composer.slug);
      const trackCount = bucket ? bucket.games.length : 0;
      return Boolean(item.imagePath) && trackCount >= 5;
    });

    extendedFeatured.forEach((item) => {
      const key = normaliseName(item.composer.name);
      if (!featuredMap.has(key)) {
        featuredMap.set(key, item);
      }
    });

    return Array.from(featuredMap.values());
  }

  function getSortedComposers(registry) {
    return [...registry.composers].sort((a, b) => a.name.localeCompare(b.name));
  }

  function cardMarkup(composer, imagePath, stats, compact) {
    const bucket = stats.get(composer.slug);
    const trackCount = bucket ? bucket.games.length : 0;
    const systemLabel = getPlatformLabel(bucket && bucket.systems);
    const cardClass = compact ? "composer-card composer-card--compact" : "composer-card composer-card--featured";

    return `
      <a href="${getComposerUrl(composer.slug)}" class="${cardClass}" data-slug="${composer.slug}">
        ${compact ? "" : `<div class="composer-thumb"><img src="${imagePath}" alt="${composer.name}" loading="lazy"></div>`}
        <div class="composer-info">
          <h3>${composer.name}</h3>
          <p class="composer-platform">${systemLabel}</p>
          <p class="composer-count">${trackCount} Tracks</p>
        </div>
      </a>
    `;
  }

  function renderHubAccordion(allComposers, stats) {
    const searchInput = document.getElementById("composer-discovery-search");
    const accordion = document.getElementById("composer-discovery-accordion");
    if (!searchInput || !accordion) {
      return;
    }

    const groups = new Map();
    allComposers.forEach((composer) => {
      const letter = composer.name.charAt(0).toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : "#";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(composer);
    });

    const orderedLetters = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")]
      .filter((letter) => groups.has(letter));

    let openSet = new Set();

    const draw = () => {
      const query = normaliseName(searchInput.value);
      const hasQuery = query.length > 0;

      const sections = orderedLetters.map((letter) => {
        const matches = groups.get(letter).filter((composer) => normaliseName(composer.name).includes(query));
        if (!matches.length) {
          return "";
        }

        const shouldOpen = hasQuery || openSet.has(letter);
        const chips = matches
          .map((composer) => `<a class="ccg-btn ccg-btn--secondary ccg-composer-chip" href="${getComposerUrl(composer.slug)}">${composer.name}<span>${stats.get(composer.slug)?.games.length || 0}</span></a>`)
          .join("");

        return `
          <section class="composer-accordion__group ${shouldOpen ? "is-open" : ""}" data-letter="${letter}">
            <button class="composer-accordion__header" type="button" aria-expanded="${shouldOpen ? "true" : "false"}">
              <span class="composer-accordion__letter">${letter}</span>
              <span class="composer-accordion__count">${matches.length}</span>
            </button>
            <div class="composer-accordion__body" ${shouldOpen ? "" : "hidden"}>
              <div class="ccg-composer-chip-list">${chips}</div>
            </div>
          </section>
        `;
      });

      accordion.innerHTML = sections.filter(Boolean).join("") || "<p class='composer-accordion__empty'>No composers match this search.</p>";

      accordion.querySelectorAll(".composer-accordion__header").forEach((button) => {
        button.addEventListener("click", () => {
          const group = button.closest(".composer-accordion__group");
          if (!group) {
            return;
          }
          const letter = group.getAttribute("data-letter") || "";
          if (openSet.has(letter)) {
            openSet.delete(letter);
          } else {
            openSet.add(letter);
          }
          draw();
        });
      });
    };

    searchInput.addEventListener("input", draw);
    draw();
  }

  async function renderHubCards(composers, stats) {
    const containerFeatured = document.querySelector(".composer-grid-featured");
    if (!containerFeatured) {
      return;
    }

    const sorted = [...composers].sort((a, b) => a.name.localeCompare(b.name));
    const imageLookups = await Promise.all(
      sorted.map(async (composer) => ({ composer, imagePath: await getComposerImagePath(composer.slug) }))
    );

    const featured = buildFeaturedSet(imageLookups, stats);
    containerFeatured.innerHTML = featured.map(({ composer, imagePath }) => cardMarkup(composer, imagePath, stats, false)).join("");

    renderHubAccordion(sorted, stats);

    const totalsLabel = document.getElementById("music-hub-stats");
    if (totalsLabel) {
      const totalTracks = Array.from(stats.values()).reduce((sum, bucket) => sum + bucket.games.length, 0);
      totalsLabel.textContent = `${sorted.length} composers • ${totalTracks} linked game credits`;
    }
  }

  async function renderComposerProfile(composer, bucket) {
    const content = document.getElementById("composer-content");
    if (!content) {
      return;
    }

    const systemLabel = getPlatformLabel(bucket.systems);
    const gameCount = bucket.games.length;
    const imagePath = await getComposerImagePath(composer.slug);

    content.innerHTML = `
      <article class="ccg-composer-profile ${imagePath ? "" : "ccg-composer-profile--text-only"}">
        ${imagePath ? `<img src="${imagePath}" alt="${composer.name}" class="ccg-composer-profile__image" loading="lazy">` : ""}
        <div>
          <h2 class="ccg-composer-profile__title">${composer.name}</h2>
          ${systemLabel ? `<p class="ccg-composer-profile__platform">${systemLabel}</p>` : ""}
          <p class="ccg-composer-profile__facts">${gameCount} linked game credits</p>
          ${composer.born ? `<p class="ccg-composer-profile__factline"><strong>Born:</strong> ${composer.born}</p>` : ""}
          ${composer.birthplace ? `<p class="ccg-composer-profile__factline"><strong>Birthplace:</strong> ${composer.birthplace}</p>` : ""}
          ${composer.bio ? `<p class="ccg-composer-profile__bio">${composer.bio}</p>` : ""}
        </div>
      </article>
    `;

    const subtitle = document.querySelector(".ccg-composer-subtitle");
    if (subtitle) {
      subtitle.textContent = systemLabel
        ? `${gameCount} linked game credits across ${systemLabel}`
        : `${gameCount} linked game credits`;
    }
  }

  async function renderComposerGames(bucket) {
    const gamesList = document.getElementById("composer-games");
    if (!gamesList) {
      return;
    }

    const sortedGames = [...bucket.games].sort((a, b) => (a.title || "").localeCompare(b.title || ""));

    if (!sortedGames.length) {
      gamesList.innerHTML = "<li class='ccg-composer-games__item'>No linked games found for this composer yet.</li>";
      return;
    }

    const rows = await Promise.all(sortedGames.map(async (game) => {
      const thumbSrc = resolveThumbnailPath(game);
      const hasThumb = thumbSrc ? await assetExists(thumbSrc) : false;
      const card = document.createElement("li");
      card.className = `ccg-composer-games__item ${hasThumb ? "" : "ccg-composer-games__item--no-thumb"}`.trim();

      const gameLink = document.createElement("a");
      gameLink.className = "ccg-composer-game-link";
      gameLink.href = getGameUrl(game.slug);

      if (hasThumb) {
        const image = document.createElement("img");
        image.className = "ccg-composer-game-thumb";
        image.loading = "lazy";
        image.src = thumbSrc;
        image.alt = game.title || "Game thumbnail";
        gameLink.appendChild(image);
      }

      const meta = document.createElement("span");
      meta.className = "ccg-composer-game-meta";

      const title = document.createElement("span");
      title.className = "ccg-composer-game-title";
      title.textContent = game.title || "Untitled game";

      const minor = document.createElement("span");
      minor.className = "ccg-composer-game-minor";
      minor.textContent = `${game.year || ""}${game.system ? ` • ${String(game.system).toUpperCase()}` : ""}`;

      meta.appendChild(title);
      meta.appendChild(minor);
      gameLink.appendChild(meta);

      const action = document.createElement("span");
      action.className = "ccg-composer-game-action";
      action.textContent = "Open game page";
      gameLink.appendChild(action);

      card.appendChild(gameLink);

      const musicPath = getGameMusicPath(game);
      if (musicPath && await assetExists(musicPath)) {
        const playerWrap = document.createElement("div");
        playerWrap.className = "ccg-composer-game-utility composer-player-row";

        const playerSlot = document.createElement("div");
        playerSlot.className = "ccg-composer-game-player-slot";

        const audio = document.createElement("audio");
        audio.controls = true;
        audio.preload = "none";
        audio.className = "ccg-composer-mini-player";
        const source = document.createElement("source");
        source.src = musicPath;
        source.type = "audio/mpeg";
        audio.appendChild(source);

        playerSlot.appendChild(audio);
        playerWrap.appendChild(playerSlot);
        card.appendChild(playerWrap);
      }

      return card;
    }));

    gamesList.innerHTML = "";
    rows.forEach((row) => gamesList.appendChild(row));
  }

  function renderComposerChips(registry, stats, currentSlug) {
    const featured = document.getElementById("composer-featured-list");
    if (!featured) {
      return;
    }

    const sorted = getSortedComposers(registry);
    const featuredPriority = FEATURED_PRIORITY
      .map((name) => sorted.find((composer) => normaliseName(composer.name) === name))
      .filter(Boolean);

    const fallback = sorted
      .filter((composer) => !featuredPriority.some((item) => item.slug === composer.slug))
      .sort((a, b) => (stats.get(b.slug)?.games.length || 0) - (stats.get(a.slug)?.games.length || 0));

    const featuredSet = [...featuredPriority, ...fallback]
      .filter((composer) => composer.slug !== currentSlug)
      .slice(0, 8);

    featured.innerHTML = featuredSet
      .map((composer) => `<a class="ccg-btn ccg-btn--secondary ccg-composer-chip" href="${getComposerUrl(composer.slug)}">${composer.name}</a>`)
      .join("");
  }

  async function loadGames() {
    const response = await fetch("/games/games.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load games.json (${response.status})`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("games.json returned a non-array payload");
    }

    return data;
  }

  function getCurrentComposerSlug(registry) {
    const pageRoot = document.querySelector("[data-composer-slug], [data-composer-name]");
    if (!pageRoot) {
      return "";
    }

    const slugFromAttr = pageRoot.getAttribute("data-composer-slug");
    const nameFromAttr = pageRoot.getAttribute("data-composer-name");

    if (slugFromAttr && registry.bySlug.has(slugFromAttr)) {
      return slugFromAttr;
    }

    const key = normaliseName(nameFromAttr || "");
    const composer = registry.byKey.get(key);
    return composer ? composer.slug : slugifyName(nameFromAttr || "");
  }

  function initBackToTop() {
    const wrap = document.querySelector("[data-ccg-back-to-top-wrap]");
    const button = document.querySelector("[data-ccg-back-to-top]");
    if (!wrap || !button) {
      return;
    }

    wrap.hidden = false;
    const toggle = () => {
      const visible = window.scrollY > 220;
      wrap.classList.toggle("is-visible", visible);
    };

    button.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", toggle, { passive: true });
    toggle();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const registry = createComposerRegistry();
    initBackToTop();

    try {
      const games = await loadGames();
      const stats = collectComposerStats(games, registry);

      if (document.querySelector(".composer-grid-featured") && document.getElementById("composer-discovery-accordion")) {
        await renderHubCards(registry.composers, stats);
      }

      const currentSlug = getCurrentComposerSlug(registry);
      if (currentSlug) {
        const composer = registry.bySlug.get(currentSlug);
        const bucket = stats.get(currentSlug) || { games: [], systems: new Set() };

        if (!composer) {
          console.error(`[music-composer] Unknown composer slug: ${currentSlug}`);
        } else {
          await renderComposerProfile(composer, bucket);
          await renderComposerGames(bucket);
          renderComposerChips(registry, stats, currentSlug);
        }
      }

      console.info(`[music] Loaded ${registry.composers.length} composers and ${games.length} games.`);
    } catch (error) {
      console.error("[music] Unable to load composer archive", error);

      const hubStats = document.getElementById("music-hub-stats");
      if (hubStats) {
        hubStats.textContent = "Unable to load archive data right now.";
      }

      const gamesList = document.getElementById("composer-games");
      if (gamesList) {
        gamesList.innerHTML = "<li class='ccg-composer-games__item'>Unable to load game archive data. Please try again later.</li>";
      }
    }
  });
})();
