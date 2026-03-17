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
    { name: "Chris Hülsbeck", slug: "chris-huelsbeck" }
  ];

  const PROFILE_DATA = {
    "rob-hubbard": { displayName: "Rob Hubbard", birthDate: "1955", birthPlace: "Kingston upon Hull, England, UK", shortBio: "Rob Hubbard is a British composer and programmer best known for his influential Commodore 64 game music in the 1980s. His best-known C64 credits include Commando, Monty on the Run and International Karate, and his work helped define what many players expect from classic SID soundtracks. He later worked across additional formats including the Amiga and received an honorary Doctor of Music from Abertay University.", seoTitle: "Rob Hubbard — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore the C64 and Amiga game music of Rob Hubbard, including verified biographical details, major credits, and linked game pages on Cheeky Commodore Gamer." },
    "martin-galway": { displayName: "Martin Galway", birthDate: "1966-01-03", birthPlace: "Belfast, Northern Ireland, UK", shortBio: "Martin Galway is a British composer strongly associated with Commodore 64 and ZX Spectrum game music. He is especially remembered for Ocean-era scores and loader music, with standout C64 credits including Rambo: First Blood Part II, Wizball and Arkanoid loader music. His work is often cited among the most recognisable examples of classic 8-bit game audio.", seoTitle: "Martin Galway — C64 Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore Martin Galway’s Commodore 64 music archive, including verified background details, major Ocean-era scores, and linked game pages." },
    "ben-daglish": { displayName: "Ben Daglish", birthDate: "1966-07-31", deathDate: "2018-10-01", birthPlace: "London, England, UK", shortBio: "Ben Daglish was an English composer and musician whose work became a major part of 1980s home-computer gaming. He is best known for C64 music on titles such as The Last Ninja, Krakout and Deflektor, and he also composed for Amiga releases. Daglish remains one of the most celebrated names in classic game music.", seoTitle: "Ben Daglish — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore the C64 and Amiga game music of Ben Daglish, including verified biographical details, notable soundtrack credits, and linked game pages." },
    "matt-gray": { displayName: "Matt Gray", birthDate: "1970-05", birthPlace: "Kent, England, UK", shortBio: "Matt Gray is a British producer and composer best known in retro gaming for his Commodore 64 music, especially the soundtrack to Last Ninja 2. He is also linked with C64-era work including Driller and Deliverance: Stormlord II. Beyond games, he later moved into mainstream music production while continuing to revisit and celebrate his classic C64 work.", seoTitle: "Matt Gray — C64 Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore Matt Gray’s Commodore 64 music archive, including verified background details, notable C64 credits, and linked game pages." },
    "david-whittaker": { displayName: "David Whittaker", birthDate: "1957-04-24", birthPlace: "Bury, Lancashire, England, UK", shortBio: "David Whittaker is an English video-game composer whose music spans many home computer formats from the 1980s and early 1990s. His best-known C64 work includes Lazy Jones and Glider Rider, while his broader catalogue also includes major Amiga-era titles such as Shadow of the Beast. His music for Lazy Jones later gained wider recognition through its connection to the dance track Kernkraft 400.", seoTitle: "David Whittaker — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore the C64 and Amiga game music of David Whittaker, including verified biographical details, major soundtrack credits, and linked game pages." },
    "jeroen-tel": { displayName: "Jeroen Tel", birthDate: "1972-05-19", birthPlace: "Eindhoven, Netherlands", shortBio: "Jeroen Tel is a Dutch composer best known for prolific late-1980s and early-1990s computer game music. His popular C64 work includes Cybernoid II and Hawkeye, and he also built credits on other formats including the Amiga. Tel was also a founding member of Maniacs of Noise, one of the most recognisable names in European game-music history.", seoTitle: "Jeroen Tel — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore the C64 and Amiga game music of Jeroen Tel, including verified background details, key credits, and linked game pages." },
    "fred-gray": { displayName: "Fred Gray", shortBio: "Fred Gray is an English game-music composer known for work on Commodore 64 and Amiga releases. His C64 credits include Shadowfire and Mutants, while his Amiga work includes titles such as Black Lamp. Where precise public biographical details are limited, keep the page focused on verified game credits and the composer’s role in classic home-computer music.", seoTitle: "Fred Gray — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore the C64 and Amiga game music of Fred Gray, including verified credits, background details, and linked game pages." },
    "chris-huelsbeck": { displayName: "Chris Hülsbeck", birthDate: "1968-03-02", birthPlace: "Kassel, Germany", shortBio: "Chris Hülsbeck is a German game-music composer widely known for European home computer soundtracks including The Great Giana Sisters and the Turrican series. His work spans both the Commodore 64 and Amiga eras, with titles such as Apidya also standing out in his catalogue. His official biography notes early piano study, a teenage start on Commodore 64, and a computer-music contest win that helped launch his career.", seoTitle: "Chris Hülsbeck — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore the C64 and Amiga game music of Chris Hülsbeck, including verified biographical details, major soundtrack credits, and linked game pages." }
  };

  const CANONICAL_NAME_MAP = {
    "rob hubbard": "Rob Hubbard", "r hubbard": "Rob Hubbard", "r. hubbard": "Rob Hubbard", "martin galway": "Martin Galway", "ben daglish": "Ben Daglish", "matt gray": "Matt Gray", "matthew del gray": "Matt Gray", "david whittaker": "David Whittaker", "jeroen tel": "Jeroen Tel", "fred gray": "Fred Gray", "chris huelsbeck": "Chris Hülsbeck", "chris hulsbeck": "Chris Hülsbeck", "chris hülsbeck": "Chris Hülsbeck", "christopher hülsbeck": "Chris Hülsbeck"
  };

  const FEATURED_BY_NAME = new Map(FEATURED_COMPOSERS.map((entry) => [normalizeComposerKey(entry.name), entry]));
  const EXISTS_CACHE = new Map();

  function getSiteRoot() { return (typeof window !== "undefined" && typeof window.ccgGetSiteRoot === "function") ? window.ccgGetSiteRoot() : "/"; }
  function normalizeComposerKey(value) { return String(value || "").trim().replace(/\s+/g, " ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function canonicalizeComposerName(value) { const key = normalizeComposerKey(value); return key ? (CANONICAL_NAME_MAP[key] || key.replace(/\b\w/g, (char) => char.toUpperCase())) : ""; }
  function composerSlug(name) { const featured = FEATURED_BY_NAME.get(normalizeComposerKey(name)); return featured ? featured.slug : normalizeComposerKey(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
  function toArray(value) { return Array.isArray(value) ? value : (value ? [value] : []); }

  function getComposerValues(game) {
    const seen = new Set();
    return [...toArray(game?.composer), ...toArray(game?.credits?.musician), ...toArray(game?.music)]
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
      .filter((entry) => !/\.mp3$/i.test(entry))
      .map(canonicalizeComposerName)
      .filter(Boolean)
      .filter((entry) => { const key = normalizeComposerKey(entry); if (seen.has(key)) return false; seen.add(key); return true; });
  }

  function buildComposerIndex(games) {
    const index = new Map();
    (games || []).forEach((game) => getComposerValues(game).forEach((name) => {
      if (!index.has(name)) index.set(name, []);
      const list = index.get(name);
      if (!list.some((entry) => entry?.slug === game?.slug)) list.push(game);
    }));
    return index;
  }

  function gamePlatforms(game) {
    const platformText = [game?.system, game?.platform, game?.computer].map((entry) => String(entry || "").toLowerCase()).join(" ");
    const platforms = new Set();
    if (/\bc64\b|commodore\s*64/.test(platformText)) platforms.add("C64");
    if (/\bamiga\b/.test(platformText)) platforms.add("Amiga");
    return platforms;
  }
  function getComposerPlatformLabel(games) {
    const platforms = new Set();
    (games || []).forEach((game) => gamePlatforms(game).forEach((platform) => platforms.add(platform)));
    if (platforms.has("C64") && platforms.has("Amiga")) return "C64 | Amiga";
    if (platforms.has("Amiga")) return "Amiga";
    return "C64";
  }

  function getEligibleComposerNames(index) {
    return Array.from(index.entries()).filter(([, games]) => games.length >= MIN_ARCHIVE_CREDITS).map(([name]) => name).sort((a, b) => a.localeCompare(b));
  }

  function resolveComposerFromPage(index) {
    const container = document.querySelector("[data-composer-name]");
    const pageComposer = String(container?.getAttribute("data-composer-name") || "").trim();
    const slug = String(container?.getAttribute("data-composer-slug") || "").trim();
    const bySlug = FEATURED_COMPOSERS.find((entry) => entry.slug === slug)?.name;
    const candidate = canonicalizeComposerName(bySlug || pageComposer || slug.replace(/[-_]+/g, " "));
    if (!candidate || !index.has(candidate)) return "";
    return index.get(candidate).length >= MIN_ARCHIVE_CREDITS ? candidate : "";
  }

  function resolveThumbnailUrl(game) {
    const raw = String(game?.thumbnail || "").trim();
    if (!raw) return `${getSiteRoot()}resources/images/thumbnails/placeholder.png`;
    return /^(https?:)?\/\//i.test(raw) ? raw : `${getSiteRoot()}${raw.replace(/^\/+/, "")}`;
  }
  function gameUrl(game) { const slug = String(game?.slug || "").trim(); return slug ? `${getSiteRoot()}games/${slug}.html` : `${getSiteRoot()}games/index.html`; }

  async function pathExists(path) {
    if (!path) return false;
    if (EXISTS_CACHE.has(path)) return EXISTS_CACHE.get(path);
    try {
      const response = await fetch(path, { method: "HEAD", cache: "force-cache" });
      const ok = response.ok;
      EXISTS_CACHE.set(path, ok);
      return ok;
    } catch {
      EXISTS_CACHE.set(path, false);
      return false;
    }
  }

  async function resolveExistingMusicPath(game) {
    const slug = String(game?.slug || "").trim().toLowerCase();
    if (!slug) return "";
    const root = getSiteRoot();
    const candidates = [`${root}resources/audio/games/${encodeURIComponent(slug)}.mp3`, `${root}resources/audio/games/${encodeURIComponent(slug.replace(/-/g, "_"))}.mp3`];
    for (const candidate of candidates) { if (await pathExists(candidate)) return candidate; }
    return "";
  }

  async function resolvePortraitPath(slug) {
    const root = getSiteRoot();
    const png = `${root}resources/images/composers/${slug}.png`;
    if (await pathExists(png)) return png;
    const jpg = `${root}resources/images/composers/${slug}.jpg`;
    if (await pathExists(jpg)) return jpg;
    return "";
  }

  function attachMiniPlayer(placeholder, audioPath) {
    if (!placeholder || !audioPath || placeholder.dataset.hasPlayer === "true") return;
    const audio = document.createElement("audio");
    audio.className = "ccg-composer-mini-player";
    audio.controls = true;
    audio.preload = "none";
    const source = document.createElement("source");
    source.src = audioPath;
    source.type = "audio/mpeg";
    audio.appendChild(source);
    placeholder.appendChild(audio);
    placeholder.dataset.hasPlayer = "true";
  }

  function queueMiniPlayer(game, placeholder) {
    if (!placeholder || placeholder.dataset.musicResolved === "true") return;
    placeholder.dataset.musicResolved = "true";
    const hydrate = async () => { const path = await resolveExistingMusicPath(game); if (path) attachMiniPlayer(placeholder, path); };
    if (typeof IntersectionObserver !== "function") return hydrate();
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (!entry.isIntersecting) return; observer.unobserve(entry.target); hydrate(); }), { rootMargin: "300px 0px" });
    observer.observe(placeholder);
  }

  function renderGames(listEl, games) {
    listEl.innerHTML = "";
    if (!games.length) return;
    games.slice().sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""))).forEach((game) => {
      const li = document.createElement("li");
      li.className = "ccg-composer-games__item";
      li.innerHTML = `<a href="${gameUrl(game)}" class="ccg-composer-game-link"><img class="ccg-composer-game-thumb" src="${resolveThumbnailUrl(game)}" alt="${String(game.title || "Game")} thumbnail" loading="lazy"><span class="ccg-composer-game-meta"><span class="ccg-composer-game-title">${String(game.title || game.slug || "Untitled game")}</span></span></a><span class="ccg-composer-game-utility"><span class="ccg-composer-game-player-slot"></span></span><span class="ccg-composer-games__cue">Open game page</span>`;
      const minor = document.createElement("span");
      minor.className = "ccg-composer-game-minor";
      const year = String(game.year || "").trim();
      const publisher = Array.isArray(game.publisher) ? String(game.publisher[0] || "").trim() : String(game.publisher || "").trim();
      minor.textContent = [year, publisher].filter(Boolean).join(" • ");
      if (minor.textContent) li.querySelector(".ccg-composer-game-meta").appendChild(minor);
      queueMiniPlayer(game, li.querySelector(".ccg-composer-game-player-slot"));
      listEl.appendChild(li);
    });
  }

  function renderComposerChips(id, names, currentName) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = "";
    names.filter((name) => name !== currentName).forEach((name) => {
      const link = document.createElement("a");
      link.href = `${getSiteRoot()}music/${composerSlug(name)}.html`;
      link.className = "ccg-composer-chip";
      link.textContent = name;
      container.appendChild(link);
    });
  }

  async function renderComposerMeta(composerName, count, eligibleNames, composerGames) {
    const slug = composerSlug(composerName);
    const profile = PROFILE_DATA[slug];
    const titleEl = document.querySelector(".ccg-composer-title");
    const subEl = document.querySelector(".ccg-composer-subtitle");
    if (titleEl) titleEl.textContent = `${composerName} — C64 & Amiga Music`;
    if (subEl) subEl.textContent = `${getComposerPlatformLabel(composerGames)} • ${count} games on Cheeky Commodore Gamer`;
    const introEl = document.querySelector(".ccg-composer-intro");
    if (introEl) introEl.textContent = profile?.shortBio || introEl.textContent;

    const pageRoot = document.querySelector(".ccg-composer-page");
    if (pageRoot && !document.querySelector(".ccg-composer-profile")) {
      const portrait = await resolvePortraitPath(slug);
      if (profile || portrait) {
        const section = document.createElement("section");
        section.className = `ccg-composer-profile${portrait ? "" : " ccg-composer-profile--text-only"}`;
        if (portrait) {
          const image = document.createElement("img");
          image.className = "ccg-composer-profile__image";
          image.src = portrait;
          image.alt = `${composerName} portrait`;
          image.loading = "lazy";
          section.appendChild(image);
        }
        const content = document.createElement("div");
        content.className = "ccg-composer-profile__content";
        content.innerHTML = `<h2 class="ccg-composer-profile__title">${composerName}</h2><p class="ccg-composer-profile__platform">${getComposerPlatformLabel(composerGames)}</p>`;
        const details = [profile?.birthDate ? `Born: ${profile.birthDate}` : "", profile?.deathDate ? `Died: ${profile.deathDate}` : "", profile?.birthPlace ? `Birthplace: ${profile.birthPlace}` : ""].filter(Boolean).join(" • ");
        if (details) {
          const meta = document.createElement("p");
          meta.className = "ccg-composer-profile__facts";
          meta.textContent = details;
          content.appendChild(meta);
        }
        if (profile?.shortBio) {
          const bio = document.createElement("p");
          bio.className = "ccg-composer-profile__bio";
          bio.textContent = profile.shortBio;
          content.appendChild(bio);
        }
        section.appendChild(content);
        const nav = document.getElementById("composer-nav-row");
        pageRoot.insertBefore(section, nav || pageRoot.querySelector("h2"));
      }
    }

    document.title = profile?.seoTitle || `${composerName} — C64 & Amiga Music & Games | Cheeky Commodore Gamer`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", profile?.metaDescription || `Explore the C64 and Amiga music of ${composerName}, including linked game pages and archive soundtrack references.`);

    const nav = document.getElementById("composer-nav-row");
    if (!nav) return;
    nav.innerHTML = "";
    [["Back to Music Hub", `${getSiteRoot()}music/index.html`], ["Browse composers", `${getSiteRoot()}music/index.html#all-composers`]].forEach(([label, href]) => {
      const link = document.createElement("a");
      link.className = "ccg-composer-nav__button";
      link.href = href;
      link.textContent = label;
      nav.appendChild(link);
    });
    eligibleNames.filter((name) => name !== composerName).slice(0, 4).forEach((name) => {
      const link = document.createElement("a");
      link.className = "ccg-composer-nav__button ccg-composer-nav__button--secondary";
      link.href = `${getSiteRoot()}music/${composerSlug(name)}.html`;
      link.textContent = name;
      nav.appendChild(link);
    });
  }

  function renderHub(index) {
    const featuredEl = document.getElementById("music-featured-composers");
    const extraEl = document.getElementById("music-additional-composers");
    const eligibleNames = getEligibleComposerNames(index);
    if (featuredEl) {
      featuredEl.innerHTML = "";
      FEATURED_COMPOSERS.filter((entry) => (index.get(entry.name) || []).length >= MIN_ARCHIVE_CREDITS).forEach((entry) => {
        const games = index.get(entry.name) || [];
        const link = document.createElement("a");
        link.className = "ccg-music-hub__composer ccg-music-hub__composer--featured";
        link.href = `${getSiteRoot()}music/${entry.slug}.html`;
        link.innerHTML = `<strong>${entry.name}</strong><span class="ccg-music-hub__platform">${getComposerPlatformLabel(games)}</span><span>${games.length} games on Cheeky Commodore Gamer</span>`;
        featuredEl.appendChild(link);
      });
      featuredEl.id = "featured-composers";
    }
    if (extraEl) {
      extraEl.innerHTML = "";
      eligibleNames.forEach((name) => {
        const games = index.get(name) || [];
        const link = document.createElement("a");
        link.className = `ccg-music-hub__composer${FEATURED_BY_NAME.has(normalizeComposerKey(name)) ? " ccg-music-hub__composer--featured" : ""}`;
        link.href = `${getSiteRoot()}music/${composerSlug(name)}.html`;
        link.innerHTML = `<strong>${name}</strong><span class="ccg-music-hub__platform">${getComposerPlatformLabel(games)}</span><span>${games.length} games on Cheeky Commodore Gamer</span>`;
        extraEl.appendChild(link);
      });
      extraEl.id = "all-composers";
    }
    const stats = document.getElementById("music-hub-stats");
    if (stats) stats.textContent = `${eligibleNames.length} composers in the Cheeky Commodore Gamer archive.`;
    const title = document.querySelector(".ccg-music-hub .ccg-composer-title");
    if (title) title.textContent = "C64 & Amiga Music Hub";
  }

  async function init() {
    const listEl = document.getElementById("composer-games");
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
    if (!composerName) { listEl.innerHTML = "<li>Composer archive unavailable.</li>"; return; }
    renderComposerChips("composer-featured-list", FEATURED_COMPOSERS.map((entry) => entry.name), composerName);
    renderComposerChips("composer-all-list", eligibleNames, composerName);
    const games = composerIndex.get(composerName) || [];
    await renderComposerMeta(composerName, games.length, eligibleNames, games);
    renderGames(listEl, games);
  }

  const boot = () => init().catch(() => {
    renderHub(new Map());
    const listEl = document.getElementById("composer-games");
    if (listEl) listEl.innerHTML = "<li>Unable to load composer games right now.</li>";
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
