(function () {
  const COMPOSER_METADATA = {
    "allister-brimble": {
      name: "Allister Brimble",
      slug: "allister-brimble",
      platform: "C64 / Amiga",
      born: "1970",
      birthplace: "Westminster, London, England, UK",
      bio: "Allister Brimble is an English video-game composer known for 16-bit era soundtracks and home-computer game music.",
      aliases: []
    },
    "barry-leitch": {
      name: "Barry Leitch",
      slug: "barry-leitch",
      platform: "Amiga",
      born: "27 April 1970",
      birthplace: "Strathaven, Scotland",
      bio: "Barry Leitch is a Scottish video game composer known for late-1980s and early-1990s work, including Lotus Turbo Challenge 2.",
      aliases: []
    },
    "ben-daglish": {
      name: "Ben Daglish",
      slug: "ben-daglish",
      platform: "C64 / Amiga",
      born: "1966-07-31",
      birthplace: "London, England, UK",
      bio: "Ben Daglish was an English composer and musician whose work became a major part of 1980s home-computer gaming.",
      aliases: []
    },
    "chris-huelsbeck": {
      name: "Chris Hülsbeck",
      slug: "chris-huelsbeck",
      platform: "C64 / Amiga",
      born: "1968-03-02",
      birthplace: "Kassel, Germany",
      bio: "Chris Hülsbeck is a German game-music composer widely known for European home computer soundtracks including The Great Giana Sisters and the Turrican series.",
      aliases: ["Chris Hulsbeck"]
    },
    "dave-thomas": {
      name: "Dave Thomas",
      slug: "dave-thomas",
      platform: "C64",
      bio: "Dave Thomas is credited as a composer on multiple home computer titles from the 1980s and early 1990s.",
      aliases: []
    },
    "david-dunn": {
      name: "David Dunn",
      slug: "david-dunn",
      platform: "C64",
      bio: "David Dunn, now known as Julie Dunn, is an early Commodore 64 composer credited on titles such as Flight Path 737, The Fourth Protocol and Nonterraqueous.",
      aliases: []
    },
    "david-whittaker": {
      name: "David Whittaker",
      slug: "david-whittaker",
      platform: "C64 / Amiga",
      born: "1957-04-24",
      birthplace: "Bury, Lancashire, England, UK",
      bio: "David Whittaker is an English video-game composer whose work spans many home computer formats.",
      aliases: []
    },
    "fred-gray": {
      name: "Fred Gray",
      slug: "fred-gray",
      platform: "C64 / Amiga",
      bio: "Fred Gray is an English game-music composer known for work on Commodore 64 and Amiga releases.",
      aliases: []
    },
    "jeroen-tel": {
      name: "Jeroen Tel",
      slug: "jeroen-tel",
      platform: "C64 / Amiga",
      born: "1972-05-19",
      birthplace: "Eindhoven, Netherlands",
      bio: "Jeroen Tel is a Dutch composer best known for late-1980s and early-1990s computer game music.",
      aliases: []
    },
    "jonathan-dunn": {
      name: "Jonathan Dunn",
      slug: "jonathan-dunn",
      platform: "C64",
      born: "8 October 1968",
      birthplace: "Preston, Lancashire, England",
      bio: "Jonathan Dunn is known for distinctive Commodore 64 game music and sound design.",
      aliases: []
    },
    "keith-tinman": {
      name: "Keith Tinman",
      slug: "keith-tinman",
      platform: "C64",
      born: "1966",
      birthplace: "England, UK",
      bio: "Keith Tinman is a British composer associated with Ocean Software in the late 1980s and early 1990s.",
      aliases: []
    },
    "mark-cooksey": {
      name: "Mark Cooksey",
      slug: "mark-cooksey",
      platform: "C64 / Amiga",
      born: "18 January 1966",
      birthplace: "Skegness, Lincolnshire, England",
      bio: "Mark Cooksey is a British video game composer known for adapting arcade soundtracks to home systems including Commodore 64 and Amiga.",
      aliases: []
    },
    "martin-galway": {
      name: "Martin Galway",
      slug: "martin-galway",
      platform: "C64",
      born: "1966-01-03",
      birthplace: "Belfast, Northern Ireland, UK",
      bio: "Martin Galway is a British composer strongly associated with Commodore 64 and ZX Spectrum game music.",
      aliases: []
    },
    "matt-furniss": {
      name: "Matt Furniss",
      slug: "matt-furniss",
      platform: "C64 / Amiga",
      born: "6 March 1973",
      birthplace: "Sheffield, England",
      bio: "Matt Furniss is a British composer and musician who worked across 8-bit and 16-bit platforms including the Commodore 64.",
      aliases: []
    },
    "matt-gray": {
      name: "Matt Gray",
      slug: "matt-gray",
      platform: "C64",
      born: "1970-05",
      birthplace: "Kent, England, UK",
      bio: "Matt Gray is a British producer and composer known for Commodore 64 music including Last Ninja 2.",
      aliases: []
    },
    "neil-brennan": {
      name: "Neil Brennan",
      slug: "neil-brennan",
      platform: "C64",
      birthplace: "Melbourne, Victoria, Australia",
      bio: "Neil Brennan is a composer associated with Commodore-era game development.",
      aliases: []
    },
    "paul-hodgson": {
      name: "Paul Hodgson",
      slug: "paul-hodgson",
      platform: "C64",
      bio: "Paul Hodgson is a video-game composer associated with Commodore-era development.",
      aliases: []
    },
    "richard-joseph": {
      name: "Richard Joseph",
      slug: "richard-joseph",
      platform: "C64 / Amiga",
      born: "23 April 1953",
      birthplace: "London, England",
      bio: "Richard Joseph was a British composer and music director known for Amiga and PC titles including Cannon Fodder and The Chaos Engine.",
      aliases: []
    },
    "rob-hubbard": {
      name: "Rob Hubbard",
      slug: "rob-hubbard",
      platform: "C64 / Amiga",
      born: "1955",
      birthplace: "Kingston upon Hull, England, UK",
      bio: "Rob Hubbard is a British composer and programmer best known for influential Commodore 64 game music in the 1980s.",
      aliases: []
    },
    "russell-lieblich": {
      name: "Russell Lieblich",
      slug: "russell-lieblich",
      platform: "C64",
      bio: "Russell Lieblich is known for his SID music work on the Commodore 64.",
      aliases: []
    }
  };

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

  function getComposerImageCandidates(slug) {
    const base = `/resources/images/composers/${slug}`;
    return [`${base}.jpg`, `${base}.jpeg`, `${base}.png`, `${base}.webp`];
  }

  function applyImageFallback(img, candidates) {
    let index = 0;
    const list = Array.isArray(candidates) ? candidates : [];
    if (!img || !list.length) {
      return;
    }

    img.src = list[index];
    img.onerror = () => {
      index += 1;
      if (index < list.length) {
        img.src = list[index];
      } else {
        const holder = img.closest(".composer-thumb, .ccg-composer-profile__media");
        if (holder) {
          const profile = holder.closest(".ccg-composer-profile");
          holder.remove();
          if (profile) {
            profile.classList.add("ccg-composer-profile--text-only");
          }
        } else {
          img.remove();
        }
      }
    };
  }

  function getComposerNamesFromGame(game) {
    if (!game || typeof game !== "object") {
      return [];
    }

    const credits = game.credits && typeof game.credits === "object" ? game.credits : null;
    const fromCredits = Array.isArray(credits?.musician) ? credits.musician : (typeof credits?.musician === "string" ? [credits.musician] : []);
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

  function createComposerRegistry(games) {
    const discovered = new Map();

    games.forEach((game) => {
      getComposerNamesFromGame(game).forEach((name) => {
        const key = normaliseName(name);
        if (!key || discovered.has(key)) {
          return;
        }
        discovered.set(key, { key, name, slug: slugifyName(name) });
      });
    });

    const metadataByKey = new Map();
    Object.values(COMPOSER_METADATA).forEach((entry) => {
      metadataByKey.set(normaliseName(entry.name), entry);
      (entry.aliases || []).forEach((alias) => metadataByKey.set(normaliseName(alias), entry));
    });

    const composers = [];
    discovered.forEach((item) => {
      const meta = metadataByKey.get(item.key);
      const merged = {
        name: meta?.name || item.name,
        slug: meta?.slug || item.slug,
        platform: meta?.platform || "",
        born: meta?.born || "",
        birthplace: meta?.birthplace || "",
        bio: meta?.bio || "",
        aliases: Array.isArray(meta?.aliases) ? meta.aliases : []
      };
      composers.push(merged);
    });

    Object.values(COMPOSER_METADATA).forEach((entry) => {
      const key = normaliseName(entry.name);
      if (!discovered.has(key)) {
        composers.push({ ...entry });
      }
    });

    const byKey = new Map();
    const bySlug = new Map();

    composers.forEach((composer) => {
      bySlug.set(composer.slug, composer);
      byKey.set(normaliseName(composer.name), composer);
      composer.aliases.forEach((alias) => byKey.set(normaliseName(alias), composer));
    });

    return { composers, byKey, bySlug };
  }

  function getGameUrl(slug) {
    return `/games/${slug}/`;
  }

  function getComposerUrl(slug) {
    return `/music/${slug}.html`;
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

  function getGameMusicCandidates(game) {
    const slug = String(game?.slug || "").trim();
    if (!slug) {
      return [];
    }
    const encodedSlug = encodeURIComponent(slug);
    const encodedUnderscoreSlug = encodeURIComponent(slug.replace(/-/g, "_"));
    const candidates = [`/resources/audio/games/${encodedSlug}.mp3`];
    if (encodedUnderscoreSlug !== encodedSlug) {
      candidates.push(`/resources/audio/games/${encodedUnderscoreSlug}.mp3`);
    }
    return candidates;
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

        const composer = registry.byKey.get(key) || registry.bySlug.get(slugifyName(name));
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

  function createCardMarkup(composer, stats, featured) {
    const bucket = stats.get(composer.slug);
    const trackCount = bucket ? bucket.games.length : 0;
    const systemLabel = bucket && bucket.systems.size ? Array.from(bucket.systems).sort().join(" / ") : (composer.platform || "C64 / Amiga");
    const cardClass = featured ? "composer-card composer-card--featured" : "composer-card composer-card--compact";
    const candidates = getComposerImageCandidates(composer.slug);

    return `
      <a href="${getComposerUrl(composer.slug)}" class="${cardClass}" data-slug="${composer.slug}">
        ${featured ? `<div class="composer-thumb"><img data-composer-image="${composer.slug}" alt="${composer.name}" loading="lazy"></div>` : ""}
        <div class="composer-info">
          <h3>${composer.name}</h3>
          <p class="composer-platform">${systemLabel}</p>
          <p class="composer-count">${trackCount} Tracks</p>
        </div>
      </a>
    `;
  }

  function renderHubCards(composers, stats) {
    const containerFeatured = document.querySelector(".composer-grid-featured");
    const containerAll = document.querySelector(".composer-grid-compact");
    if (!containerFeatured || !containerAll) {
      return;
    }

    const sorted = [...composers].sort((a, b) => a.name.localeCompare(b.name));

    const featured = FEATURED_PRIORITY
      .map((priorityName) => sorted.find((composer) => normaliseName(composer.name) === priorityName))
      .filter(Boolean);

    const featuredKeys = new Set(featured.map((composer) => composer.slug));
    const rest = sorted.filter((composer) => !featuredKeys.has(composer.slug));

    containerFeatured.innerHTML = featured.map((composer) => createCardMarkup(composer, stats, true)).join("");
    containerAll.innerHTML = rest.map((composer) => createCardMarkup(composer, stats, false)).join("");

    document.querySelectorAll("img[data-composer-image]").forEach((img) => {
      const slug = img.getAttribute("data-composer-image");
      applyImageFallback(img, getComposerImageCandidates(slug));
    });

    const totalsLabel = document.getElementById("music-hub-stats");
    if (totalsLabel) {
      const totalTracks = Array.from(stats.values()).reduce((sum, bucket) => sum + bucket.games.length, 0);
      totalsLabel.textContent = `${sorted.length} composers • ${totalTracks} linked game credits`;
    }
  }

  function renderComposerProfile(composer, bucket) {
    const content = document.getElementById("composer-content");
    if (!content) {
      return;
    }

    const systemLabel = bucket.systems.size ? Array.from(bucket.systems).sort().join(" / ") : (composer.platform || "C64 / Amiga");
    const gameCount = bucket.games.length;
    const facts = [`${gameCount} linked game credits`];
    if (composer.born) {
      facts.push(`Born: ${composer.born}`);
    }
    if (composer.birthplace) {
      facts.push(`Birthplace: ${composer.birthplace}`);
    }

    content.innerHTML = `
      <article class="ccg-composer-profile">
        <div class="ccg-composer-profile__media"><img data-composer-image="${composer.slug}" alt="${composer.name}" class="ccg-composer-profile__image" loading="lazy"></div>
        <div>
          <h2 class="ccg-composer-profile__title">${composer.name}</h2>
          <p class="ccg-composer-profile__platform">${systemLabel}</p>
          <p class="ccg-composer-profile__facts">${facts.join(" • ")}</p>
          ${composer.bio ? `<p class="ccg-composer-profile__bio">${composer.bio}</p>` : ""}
        </div>
      </article>
    `;

    const profileImage = content.querySelector("img[data-composer-image]");
    if (profileImage) {
      applyImageFallback(profileImage, getComposerImageCandidates(composer.slug));
    }

    const subtitle = document.querySelector(".ccg-composer-subtitle");
    if (subtitle) {
      subtitle.textContent = `${gameCount} linked game credits across ${systemLabel}`;
    }
  }

  function renderComposerGames(bucket) {
    const gamesList = document.getElementById("composer-games");
    if (!gamesList) {
      return;
    }

    const sortedGames = [...bucket.games].sort((a, b) => (a.title || "").localeCompare(b.title || ""));

    if (!sortedGames.length) {
      gamesList.innerHTML = "<li class='ccg-composer-games__item'>No linked games found for this composer yet.</li>";
      return;
    }

    gamesList.innerHTML = sortedGames.map((game) => {
      const thumbSrc = resolveThumbnailPath(game);
      const musicCandidates = getGameMusicCandidates(game);
      return `
        <li class="ccg-composer-games__item">
          <a class="ccg-composer-game-link" href="${getGameUrl(game.slug)}">
            ${thumbSrc ? `<img src="${thumbSrc}" alt="${game.title}" class="ccg-composer-game-thumb" loading="lazy" onerror="this.remove(); this.closest('.ccg-composer-games__item')?.classList.add('ccg-composer-games__item--no-thumb');">` : ""}
            <span class="ccg-composer-game-meta">
              <span class="ccg-composer-game-title">${game.title}</span>
              <span class="ccg-composer-game-minor">${game.year || ""}${game.system ? ` • ${String(game.system).toUpperCase()}` : ""}</span>
            </span>
            <span class="ccg-composer-game-action">Open game page</span>
          </a>
          ${musicCandidates.length ? `<div class="ccg-composer-game-utility composer-player-row"><div class="ccg-composer-game-player-slot"><audio controls preload="none" class="ccg-composer-mini-player" src="${musicCandidates[0]}" data-fallback-src="${musicCandidates[1] || ""}"></audio></div></div>` : ""}
        </li>
      `;
    }).join("");

    gamesList.querySelectorAll("audio[data-fallback-src]").forEach((audio) => {
      audio.addEventListener("error", () => {
        const fallback = audio.getAttribute("data-fallback-src");
        if (fallback && audio.src.indexOf(fallback) === -1) {
          audio.src = fallback;
          audio.removeAttribute("data-fallback-src");
          audio.load();
          return;
        }
        audio.closest(".composer-player-row")?.remove();
      }, { once: true });
    });
  }

  function renderComposerChips(registry, currentSlug) {
    const featured = document.getElementById("composer-featured-list");
    const all = document.getElementById("composer-all-list");

    const sorted = [...registry.composers].sort((a, b) => a.name.localeCompare(b.name));
    const featuredSet = FEATURED_PRIORITY
      .map((priorityName) => sorted.find((composer) => normaliseName(composer.name) === priorityName))
      .filter((composer) => composer && composer.slug !== currentSlug);

    function chip(composer) {
      const active = composer.slug === currentSlug ? " is-active" : "";
      return `<a class="ccg-btn ccg-btn--secondary ccg-composer-chip${active}" href="${getComposerUrl(composer.slug)}">${composer.name}</a>`;
    }

    if (featured) {
      featured.innerHTML = featuredSet.map((composer) => chip(composer)).join("");
    }

    if (all) {
      const featuredSlugs = new Set(featuredSet.map((composer) => composer.slug));
      all.innerHTML = sorted.filter((composer) => composer.slug !== currentSlug && !featuredSlugs.has(composer.slug)).map((composer) => chip(composer)).join("");
    }
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
    initBackToTop();

    try {
      const games = await loadGames();
      const registry = createComposerRegistry(games);
      const stats = collectComposerStats(games, registry);

      if (document.querySelector(".composer-grid-featured") && document.querySelector(".composer-grid-compact")) {
        renderHubCards(registry.composers, stats);
      }

      const currentSlug = getCurrentComposerSlug(registry);
      if (currentSlug) {
        const composer = registry.bySlug.get(currentSlug);
        const bucket = stats.get(currentSlug) || { games: [], systems: new Set() };

        if (!composer) {
          console.error(`[music-composer] Unknown composer slug: ${currentSlug}`);
        } else {
          renderComposerProfile(composer, bucket);
          renderComposerGames(bucket);
          renderComposerChips(registry, currentSlug);
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
