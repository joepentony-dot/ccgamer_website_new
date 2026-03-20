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
  const DEDICATED_COMPOSER_SLUGS = new Set(Object.keys(PROFILE_DATA));
  const FEATURED_COMPOSER_URLS = {
    "allister brimble": "/music/allister-brimble/",
    "barry leitch": "/music/barry-leitch/",
    "ben daglish": "/music/ben-daglish/",
    "chris hulsbeck": "/music/chris-huelsbeck/",
    "david whittaker": "/music/david-whittaker/",
    "fred gray": "/music/fred-gray/",
    "martin galway": "/music/martin-galway/",
    "rob hubbard": "/music/rob-hubbard/"
  };
  const FEATURED_PRIORITY = Object.keys(FEATURED_COMPOSER_URLS);

  function normalizeComposerKey(value) {
    if (typeof window.normalizeComposerName === "function") {
      return window.normalizeComposerName(value);
    }

    return String(value || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function getCanonicalComposerName(value) {
    if (typeof window.getCanonicalComposer === "function") {
      return window.getCanonicalComposer(value);
    }

    return String(value || "").trim();
  }

  function slugifyName(value) {
    return normalizeComposerKey(getCanonicalComposerName(value))
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normaliseName(value) {
    return normalizeComposerKey(value);
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
      .map((name) => getCanonicalComposerName(name))
      .filter(Boolean);
  }

  function buildComposerIndex(games) {
    const composers = {};

    games.forEach((game) => {
      const names = getComposerNamesFromGame(game);
      names.forEach((name) => {
        const normalized = normalizeComposerKey(name);
        const canonical = getCanonicalComposerName(name);

        if (!normalized || /\.(mp3|ogg|wav|flac)$/i.test(canonical)) {
          return;
        }

        if (!composers[normalized]) {
          composers[normalized] = {
            name: canonical,
            slug: slugifyName(canonical),
            games: []
          };
        }

        composers[normalized].games.push(game);
        composers[normalized].games = [
          ...new Map(
            composers[normalized].games.map((g) => [g.slug, g])
          ).values()
        ];
      });
    });

    return composers;
  }

  function createComposerRegistry(games) {
    const composersFromGames = buildComposerIndex(games);
    const composerMap = new Map();
    const profileKeyToSlug = new Map();

    Object.values(PROFILE_DATA).forEach((profile) => {
      const composer = {
        ...profile,
        slug: profile.slug || slugifyName(profile.name),
        aliases: Array.isArray(profile.aliases) ? profile.aliases : [],
        games: []
      };
      composerMap.set(composer.slug, composer);
      profileKeyToSlug.set(normaliseName(composer.name), composer.slug);
      composer.aliases.forEach((alias) => profileKeyToSlug.set(normaliseName(alias), composer.slug));
    });

    Object.values(composersFromGames).forEach((entry) => {
      const normalizedName = normaliseName(entry.name);
      const slug = profileKeyToSlug.get(normalizedName) || slugifyName(entry.slug || entry.name);
      const existing = composerMap.get(slug);
      if (existing) {
        existing.games = entry.games;
        if (!existing.name) {
          existing.name = entry.name;
        }
      } else {
        composerMap.set(slug, {
          name: entry.name,
          slug,
          aliases: [],
          games: entry.games
        });
      }
    });

    const composers = Array.from(composerMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

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

  function getFallbackComposerUrl(name) {
    const params = new URLSearchParams();
    params.set("name", name);
    return `${resolveSiteRoot()}music/composer.html?${params.toString()}`;
  }

  function getFeaturedComposerUrl(name) {
    const featuredPath = FEATURED_COMPOSER_URLS[normaliseName(name)];
    if (!featuredPath) {
      return "";
    }

    const siteRoot = resolveSiteRoot().replace(/\/$/, "");
    return `${siteRoot}${featuredPath}`;
  }

  function getComposerUrl(composerOrSlug, composerName, options = {}) {
    const slug = typeof composerOrSlug === "object" && composerOrSlug
      ? slugifyName(composerOrSlug.slug || composerOrSlug.name)
      : slugifyName(composerOrSlug);
    const name = typeof composerOrSlug === "object" && composerOrSlug
      ? String(composerOrSlug.name || composerName || "").trim()
      : String(composerName || "").trim();
    const { allowDedicated = false } = options;
    const featuredUrl = getFeaturedComposerUrl(name || composerName || composerOrSlug || slug);

    if (featuredUrl) {
      return featuredUrl;
    }

    if (allowDedicated && slug && DEDICATED_COMPOSER_SLUGS.has(slug)) {
      return `${resolveSiteRoot()}music/${slug}/`;
    }

    return getFallbackComposerUrl(name || composerName || composerOrSlug || slug);
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

  async function resolveGameMusicUrl(slug) {
    const resolver = window.CCGMusic && typeof window.CCGMusic.resolveGameMusicUrl === "function"
      ? window.CCGMusic.resolveGameMusicUrl
      : async () => "";
    return resolver(slug);
  }

  function collectComposerStats(registry) {
    const stats = new Map();

    registry.composers.forEach((composer) => {
      const systems = new Set();
      composer.games.forEach((game) => {
        const systemLabel = String(game.system || "").trim().toUpperCase();
        if (systemLabel) {
          systems.add(systemLabel);
        }
      });

      stats.set(composer.slug, {
        games: [...composer.games],
        systems
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
      <a href="${getComposerUrl(composer, composer.name, { allowDedicated: !compact })}" class="${cardClass}" data-slug="${composer.slug}">
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
          .map((composer) => `<a class="ccg-btn ccg-btn--secondary ccg-composer-chip" href="${getComposerUrl(composer, composer.name)}">${composer.name}<span>${stats.get(composer.slug)?.games.length || 0}</span></a>`)
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

    const composerList = Object.values(composers).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const imageLookups = await Promise.all(
      composerList.map(async (composer) => ({ composer, imagePath: await getComposerImagePath(composer.slug) }))
    );

    const featured = buildFeaturedSet(imageLookups, stats);
    containerFeatured.innerHTML = featured.map(({ composer, imagePath }) => cardMarkup(composer, imagePath, stats, false)).join("");

    renderHubAccordion(composerList, stats);

    const totalsLabel = document.getElementById("music-hub-stats");
    if (totalsLabel) {
      const totalTracks = Array.from(stats.values()).reduce((sum, bucket) => sum + bucket.games.length, 0);
      totalsLabel.textContent = `${composerList.length} composers • ${totalTracks} linked game credits`;
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

  async function renderComposerGames(bucket, requestedName) {
    const gamesList = document.getElementById("composer-games");
    if (!gamesList) {
      return;
    }

    const sortedGames = [...bucket.games].sort((a, b) => (a.title || "").localeCompare(b.title || ""));

    if (!sortedGames.length) {
      const safeName = requestedName ? requestedName.replace(/[<>]/g, "") : "this composer";
      gamesList.innerHTML = `<li class="ccg-composer-games__item">No linked games found for ${safeName} yet. Try the <a href="/music/index.html">music hub</a> to browse the full archive.</li>`;
      return;
    }

    const rows = await Promise.all(sortedGames.map(async (game) => {
      const thumbSrc = resolveThumbnailPath(game);
      const hasThumb = thumbSrc ? await assetExists(thumbSrc) : false;
      const card = document.createElement("li");
      card.className = `ccg-composer-games__item ${hasThumb ? "" : "ccg-composer-games__item--no-thumb"}`.trim();

      const cardShell = document.createElement("div");
      cardShell.className = "ccg-composer-game-card-shell";

      const gameLink = document.createElement("a");
      gameLink.className = "ccg-composer-game-link";
      gameLink.href = getGameUrl(game.slug);

      if (hasThumb) {
        const thumbWrap = document.createElement("span");
        thumbWrap.className = "ccg-composer-game-thumb-wrap";

        const image = document.createElement("img");
        image.className = "ccg-composer-game-thumb";
        image.loading = "lazy";
        image.src = thumbSrc;
        image.alt = game.title || "Game thumbnail";
        thumbWrap.appendChild(image);

        const overlay = document.createElement("span");
        overlay.className = "ccg-composer-game-thumb-overlay";
        overlay.setAttribute("aria-hidden", "true");
        overlay.innerHTML = '<span class="ccg-composer-game-thumb-overlay__icon"></span><span class="ccg-composer-game-thumb-overlay__label">Preview track</span>';
        thumbWrap.appendChild(overlay);

        gameLink.appendChild(thumbWrap);
      }

      const content = document.createElement("span");
      content.className = "ccg-composer-game-content";

      const statusRow = document.createElement("span");
      statusRow.className = "ccg-composer-game-status-row";
      const statusBadge = document.createElement("span");
      statusBadge.className = "ccg-composer-game-status";
      statusBadge.textContent = "Track ready";
      statusBadge.dataset.readyLabel = "Track ready";
      statusBadge.dataset.playingLabel = "Now playing";
      statusRow.appendChild(statusBadge);
      content.appendChild(statusRow);

      const meta = document.createElement("span");
      meta.className = "ccg-composer-game-meta";

      const title = document.createElement("span");
      title.className = "ccg-composer-game-title";
      title.textContent = game.title || "Untitled game";
      meta.appendChild(title);

      const tagRow = document.createElement("span");
      tagRow.className = "ccg-composer-game-tags";

      const appendTag = (value, extraClass = "") => {
        if (!value) return;
        const tag = document.createElement("span");
        tag.className = `ccg-composer-game-tag ${extraClass}`.trim();
        tag.textContent = value;
        tagRow.appendChild(tag);
      };

      appendTag(game.year, "ccg-composer-game-tag--year");
      appendTag(game.system ? String(game.system).toUpperCase() : "", "ccg-composer-game-tag--system");

      if (tagRow.childElementCount) {
        meta.appendChild(tagRow);
      }

      if (game.publisher) {
        const minor = document.createElement("span");
        minor.className = "ccg-composer-game-minor";
        minor.textContent = game.publisher;
        meta.appendChild(minor);
      }

      content.appendChild(meta);
      gameLink.appendChild(content);

      const action = document.createElement("span");
      action.className = "ccg-composer-game-action";
      action.innerHTML = '<span>Open game page</span><span aria-hidden="true">↗</span>';
      gameLink.appendChild(action);

      cardShell.appendChild(gameLink);
      card.appendChild(cardShell);

      const musicSrc = await resolveGameMusicUrl(game.slug);
      if (musicSrc) {
        const audioWrap = document.createElement("div");
        audioWrap.className = "ccg-composer-audio-wrap";
        const audioPlayer = window.CCGSharedMusicPlayer && typeof window.CCGSharedMusicPlayer.createAudioPlayer === "function"
          ? window.CCGSharedMusicPlayer.createAudioPlayer({
              src: musicSrc,
              playerClass: "ccg-composer-mini-player",
              wrapperClass: "ccg-composer-game-utility composer-player-row",
              slotClass: "ccg-composer-game-player-slot",
              onError() {
                audioWrap.remove();
                card.classList.remove("ccg-composer-games__item--has-audio");
              }
            })
          : null;

        if (audioPlayer) {
          const audioEl = audioPlayer.querySelector("audio");
          card.classList.add("ccg-composer-games__item--has-audio");
          audioWrap.appendChild(audioPlayer);
          cardShell.appendChild(audioWrap);

          if (audioEl) {
            const syncPlayingState = (isPlaying) => {
              card.classList.toggle("is-playing", isPlaying);
              statusBadge.textContent = isPlaying ? (statusBadge.dataset.playingLabel || "Now playing") : (statusBadge.dataset.readyLabel || "Track ready");
            };

            audioEl.addEventListener("play", () => {
              document.querySelectorAll(".ccg-composer-games__item.is-playing").forEach((item) => {
                if (item !== card) {
                  item.classList.remove("is-playing");
                  const badge = item.querySelector(".ccg-composer-game-status");
                  if (badge) {
                    badge.textContent = badge.dataset.readyLabel || "Track ready";
                  }
                  const otherAudio = item.querySelector("audio");
                  if (otherAudio && !otherAudio.paused) {
                    otherAudio.pause();
                  }
                }
              });
              syncPlayingState(true);
            });
            audioEl.addEventListener("pause", () => syncPlayingState(false));
            audioEl.addEventListener("ended", () => syncPlayingState(false));

            if (hasThumb) {
              const thumbToggle = gameLink.querySelector(".ccg-composer-game-thumb-wrap");
              if (thumbToggle) {
                thumbToggle.setAttribute("role", "button");
                thumbToggle.setAttribute("tabindex", "0");
                thumbToggle.setAttribute("aria-label", `Play or pause music sample for ${game.title || "this game"}`);
                const togglePlayback = (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (audioEl.paused) {
                    audioEl.play().catch(() => {});
                  } else {
                    audioEl.pause();
                  }
                };
                thumbToggle.addEventListener("click", togglePlayback);
                thumbToggle.addEventListener("keydown", (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    togglePlayback(event);
                  }
                });
              }
            }
          }
        }
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
      .map((composer) => `<a class="ccg-btn ccg-btn--secondary ccg-composer-chip" href="${getComposerUrl(composer, composer.name)}">${composer.name}</a>`)
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

  function getCurrentComposerSelection(registry) {
    const pageRoot = document.querySelector("[data-composer-slug], [data-composer-name]");
    const params = new URLSearchParams(window.location.search);
    const slugFromQuery = slugifyName(params.get("slug") || "");
    const nameFromQuery = String(params.get("name") || "").trim();

    const slugFromAttr = pageRoot ? slugifyName(pageRoot.getAttribute("data-composer-slug") || "") : "";
    const nameFromAttr = pageRoot ? String(pageRoot.getAttribute("data-composer-name") || "").trim() : "";

    if (slugFromAttr && registry.bySlug.has(slugFromAttr)) {
      return { slug: slugFromAttr, requestedName: nameFromAttr || registry.bySlug.get(slugFromAttr)?.name || "" };
    }

    if (slugFromQuery && registry.bySlug.has(slugFromQuery)) {
      return { slug: slugFromQuery, requestedName: nameFromQuery || registry.bySlug.get(slugFromQuery)?.name || "" };
    }

    const requestedName = nameFromQuery || nameFromAttr;
    const key = normaliseName(requestedName || "");
    const composer = key ? registry.byKey.get(key) : null;
    return {
      slug: composer ? composer.slug : (slugFromAttr || slugFromQuery || slugifyName(requestedName || "")),
      requestedName
    };
  }

  function updateComposerMetadata(composer, bucket, requestedName) {
    const name = composer?.name || requestedName || "Composer";
    const gameCount = bucket?.games?.length || 0;
    const title = composer
      ? `${name} — C64 & Amiga Music Composer | Cheeky Commodore Gamer`
      : `${name} — Composer Archive Search | Cheeky Commodore Gamer`;
    const description = composer
      ? `Explore C64 and Amiga games featuring music by ${name}, with archive links back to each game page on Cheeky Commodore Gamer.`
      : `Browse the Cheeky Commodore Gamer music archive for ${name} and discover matching game soundtrack credits.`;
    const canonical = composer
      ? `https://www.cheekycommodoregamer.co.uk${getComposerUrl(composer, composer.name, { allowDedicated: true })}`
      : `https://www.cheekycommodoregamer.co.uk/music/composer.html?name=${encodeURIComponent(name)}`;

    document.title = title;

    const mappings = {
      'meta[name="description"]': description,
      'meta[property="og:title"]': title,
      'meta[property="og:description"]': description,
      'meta[property="og:url"]': canonical,
      'meta[name="twitter:title"]': title,
      'meta[name="twitter:description"]': description
    };

    Object.entries(mappings).forEach(([selector, value]) => {
      const node = document.querySelector(selector);
      if (node) {
        node.setAttribute("content", value);
      }
    });

    const canonicalNode = document.querySelector('link[rel="canonical"]');
    if (canonicalNode) {
      canonicalNode.setAttribute("href", canonical);
    }

    const heading = document.querySelector(".ccg-composer-title");
    if (heading && !heading.closest('[data-composer-slug], [data-composer-name]')) {
      heading.textContent = composer
        ? `${name} — C64 & Amiga Music`
        : `${name} — Composer Archive`;
    }

    const intro = document.querySelector(".ccg-composer-intro");
    if (intro) {
      intro.textContent = composer
        ? `Explore soundtrack contributions from ${name}, with linked game pages and playable tracks where available.`
        : `Search the archive for ${name} and browse any matching C64 or Amiga soundtrack credits below.`;
    }

    const gamesHeading = document.querySelector(".ccg-composer-section-title");
    if (gamesHeading) {
      gamesHeading.textContent = composer
        ? `Games featuring ${name}`
        : `Games matching ${name}`;
    }

    const subtitle = document.querySelector(".ccg-composer-subtitle");
    if (subtitle && !composer) {
      subtitle.textContent = gameCount
        ? `${gameCount} linked game credits found for ${name}`
        : `No linked game credits found for ${name}`;
    }
  }

  function ensureBackButton() {
    const pageRoot = document.querySelector(".ccg-composer-page");
    if (!pageRoot || document.querySelector(".back-button")) {
      return;
    }

    const buttonWrap = document.createElement("div");
    buttonWrap.className = "back-button";
    buttonWrap.innerHTML = '<a href="/music/index.html" class="ccg-btn ccg-btn--secondary">← Back to Music Hub</a>';

    const breadcrumbs = pageRoot.querySelector(".ccg-composer-breadcrumbs");
    if (breadcrumbs) {
      breadcrumbs.insertAdjacentElement("afterend", buttonWrap);
    } else {
      pageRoot.insertAdjacentElement("afterbegin", buttonWrap);
    }
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
    ensureBackButton();

    try {
      const games = await loadGames();
      const registry = createComposerRegistry(games);
      const stats = collectComposerStats(registry);

      if (document.querySelector(".composer-grid-featured") && document.getElementById("composer-discovery-accordion")) {
        await renderHubCards(registry.composers, stats);
      }

      const selection = getCurrentComposerSelection(registry);
      if (selection.slug || selection.requestedName) {
        const composer = registry.bySlug.get(selection.slug) || registry.byKey.get(normaliseName(selection.requestedName || ""));
        const bucket = composer ? (stats.get(composer.slug) || { games: [], systems: new Set() }) : { games: [], systems: new Set() };
        updateComposerMetadata(composer || null, bucket, selection.requestedName);

        if (composer) {
          await renderComposerProfile(composer, bucket);
          await renderComposerGames(bucket, composer.name);
          renderComposerChips(registry, stats, composer.slug);

          if (typeof window.ccgSchemaComposer === "function") {
            window.ccgSchemaComposer(composer.name, bucket.games);
          }
          if (typeof window.ccgSchemaBreadcrumb === "function") {
            window.ccgSchemaBreadcrumb([
              { name: "Home", url: "https://www.cheekycommodoregamer.co.uk/" },
              { name: "Music Hub", url: "https://www.cheekycommodoregamer.co.uk/music/" },
              { name: composer.name, url: `https://www.cheekycommodoregamer.co.uk${getComposerUrl(composer, composer.name)}` }
            ]);
          }
        } else {
          await renderComposerGames(bucket, selection.requestedName || "this composer");
          renderComposerChips(registry, stats, "");
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
