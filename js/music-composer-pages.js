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
    "chris-huelsbeck": { displayName: "Chris Hülsbeck", birthDate: "1968-03-02", birthPlace: "Kassel, Germany", shortBio: "Chris Hülsbeck is a German game-music composer widely known for European home computer soundtracks including The Great Giana Sisters and the Turrican series. His work spans both the Commodore 64 and Amiga eras, with titles such as Apidya also standing out in his catalogue. His official biography notes early piano study, a teenage start on Commodore 64, and a computer-music contest win that helped launch his career.", seoTitle: "Chris Hülsbeck — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore the C64 and Amiga game music of Chris Hülsbeck, including verified biographical details, major soundtrack credits, and linked game pages." },
    "allister-brimble": { displayName: "Allister Brimble", birthDate: "1970", birthPlace: "Westminster, London, England, UK", shortBio: "Allister Mark Brimble is a British video game composer who began working in the industry in the mid-1980s. He created music across Commodore 64, Amiga and later console platforms, with credits including Alien Breed, Project-X, Superfrog and RollerCoaster Tycoon. His work spans multiple generations of game audio development.", seoTitle: "Allister Brimble — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore the C64 and Amiga game music work of Allister Brimble, including verified background details, notable credits, and linked game pages." },
    "jonathan-dunn": { displayName: "Jonathan Dunn", birthDate: "8 October 1968", birthPlace: "Preston, Lancashire, England", shortBio: "Jonathan Dunn is an English composer and programmer best known for his work at Ocean Software. He created music and audio systems for titles including RoboCop, Platoon and Total Recall across Commodore 64, Amiga and console platforms, often developing his own sound drivers. His work is closely associated with late-1980s home-computer game audio.", seoTitle: "Jonathan Dunn — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore Jonathan Dunn’s Commodore 64 and Amiga game music credits, with verified details and linked archive game pages." },
    "david-dunn": { displayName: "David Dunn", shortBio: "David Dunn, now known as Julie Dunn, is an early Commodore 64 composer credited on titles such as Flight Path 737, The Fourth Protocol and Nonterraqueous. Classically trained at the Royal College of Music, her work combined traditional composition methods with early computer sound programming. Her credits form part of the formative years of C64 game audio.", seoTitle: "David Dunn — C64 Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore David Dunn’s Commodore 64 game music credits, with verified context and linked archive game pages." },
    "barry-leitch": { displayName: "Barry Leitch", birthDate: "27 April 1970", birthPlace: "Strathaven, Scotland", shortBio: "Barry Leitch is a Scottish video game composer known for late-1980s and early-1990s work, including Lotus Turbo Challenge 2. His music helped define the sound of racing and action titles across Commodore and Amiga platforms. He remains associated with the era’s fast-paced home-computer soundtrack style.", seoTitle: "Barry Leitch — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore Barry Leitch’s Commodore and Amiga game music credits, including verified profile details and linked game pages." },
    "mark-cooksey": { displayName: "Mark Cooksey", birthDate: "18 January 1966", birthPlace: "Skegness, Lincolnshire, England", shortBio: "Mark Cooksey is a British video game composer known for adapting arcade-style soundtracks to home systems including the Commodore 64 and Amiga. His credits include Ghosts 'n Goblins, Track & Field and Out Run Europa, where he translated complex audio ideas into limited early hardware. His catalogue is a notable part of C64 adaptation-era music.", seoTitle: "Mark Cooksey — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore Mark Cooksey’s Commodore 64 and Amiga game music work, including verified background details and linked game pages." },
    "keith-tinman": { displayName: "Keith Tinman", birthDate: "1966", birthPlace: "England, UK", shortBio: "Keith Tinman is a British composer associated with Ocean Software in the late 1980s and early 1990s. He contributed music across Commodore 64 and additional home-computer platforms as part of Ocean’s in-house audio team. His credits reflect the studio-driven soundtrack production model of the period.", seoTitle: "Keith Tinman — C64 Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore Keith Tinman’s Commodore 64 game music profile, with verified details and linked archive game pages." },
    "matt-furniss": { displayName: "Matt Furniss", birthDate: "6 March 1973", birthPlace: "Sheffield, England", shortBio: "Matt Furniss is a British composer and musician who worked across 8-bit and 16-bit platforms including the Commodore 64, ZX Spectrum and Sega systems. Known for prolific output, he contributed to many titles in the late 1980s and 1990s. He continued working in game audio beyond the home-computer era.", seoTitle: "Matt Furniss — C64 & Multi-Platform Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore Matt Furniss’s Commodore 64 and broader game music credits, including verified profile details and linked game pages." },
    "richard-joseph": { displayName: "Richard Joseph", birthDate: "23 April 1953", birthPlace: "London, England", shortBio: "Richard Joseph was a British composer and music director known for Amiga and PC titles including Cannon Fodder, Mega-Lo-Mania and The Chaos Engine. His work helped raise production standards for game audio during the 1990s. He later founded audio production companies and remained influential in the wider games industry.", seoTitle: "Richard Joseph — Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore Richard Joseph’s Amiga-era game music profile, with verified details, major credits, and linked game pages." },
    "paul-hodgson": { displayName: "Paul Hodgson", shortBio: "Paul Hodgson is a video game composer associated with Commodore-era development. He contributed music to a range of home computer titles during the 1980s, working within the technical limits of early sound hardware. His credits sit within the broader C64 and Amiga-era soundtrack scene.", seoTitle: "Paul Hodgson — Commodore-Era Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore Paul Hodgson’s Commodore-era game music profile, with verified context and linked archive game pages." },
    "dave-thomas": { displayName: "Dave Thomas", shortBio: "Dave Thomas is credited as a composer on multiple home computer titles from the 1980s and early 1990s. His work forms part of the wider development scene around Commodore and Amiga game audio. His archive credits reflect the collaborative production style of the period.", seoTitle: "Dave Thomas — Commodore-Era Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore Dave Thomas’s Commodore-era game music credits, with verified context and linked game pages." },
    "neil-brennan": { displayName: "Neil Brennan", birthPlace: "Melbourne, Victoria, Australia", shortBio: "Neil Brennan is a composer associated with Commodore-era game development. Based in Australia, his work contributed to the wider international home-computer music scene of the 1980s and early 1990s. His credits add regional depth to the C64-era soundtrack landscape.", seoTitle: "Neil Brennan — Commodore-Era Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore Neil Brennan’s Commodore-era game music profile, with verified context and linked archive game pages." }
  };

  const CANONICAL_NAME_MAP = {
    "rob hubbard": "Rob Hubbard", "r hubbard": "Rob Hubbard", "r. hubbard": "Rob Hubbard", "martin galway": "Martin Galway", "ben daglish": "Ben Daglish", "matt gray": "Matt Gray", "matthew del gray": "Matt Gray", "david whittaker": "David Whittaker", "jeroen tel": "Jeroen Tel", "fred gray": "Fred Gray", "chris huelsbeck": "Chris Hülsbeck", "chris hulsbeck": "Chris Hülsbeck", "chris hülsbeck": "Chris Hülsbeck", "christopher hülsbeck": "Chris Hülsbeck", "allister brimble": "Allister Brimble", "jonathan dunn": "Jonathan Dunn", "david dunn": "David Dunn", "barry leitch": "Barry Leitch", "mark cooksey": "Mark Cooksey", "keith tinman": "Keith Tinman", "matt furniss": "Matt Furniss", "richard joseph": "Richard Joseph", "paul hodgson": "Paul Hodgson", "dave thomas": "Dave Thomas", "neil brennan": "Neil Brennan"
  };

  const FEATURED_BY_NAME = new Map(FEATURED_COMPOSERS.map((entry) => [normalizeComposerKey(entry.name), entry]));
  const EXISTS_CACHE = new Map();
  const IMAGE_EXISTS_CACHE = new Map();

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
    if (await imageExists(png)) return png;
    const jpg = `${root}resources/images/composers/${slug}.jpg`;
    if (await imageExists(jpg)) return jpg;
    return "";
  }

  function imageExists(path) {
    if (!path) return Promise.resolve(false);
    if (IMAGE_EXISTS_CACHE.has(path)) return IMAGE_EXISTS_CACHE.get(path);
    const check = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = `${path}${path.includes("?") ? "&" : "?"}ccg_image_probe=1`;
    });
    IMAGE_EXISTS_CACHE.set(path, check);
    return check;
  }

  function initBackToTop() {
    const button = document.querySelector("[data-ccg-back-to-top]");
    const wrap = document.querySelector("[data-ccg-back-to-top-wrap]");
    if (!button || !wrap) return;

    wrap.hidden = false;
    button.addEventListener("click", () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
    });

    const updateVisibility = () => {
      const scrollBottom = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      wrap.classList.toggle("is-visible", scrollBottom >= docHeight - 80);
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateVisibility();
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateVisibility();
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
      link.className = "ccg-btn ccg-btn--ghost ccg-composer-chip";
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
    if (subEl) subEl.textContent = `${getComposerPlatformLabel(composerGames)} • ${count} Tracks`;
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
        const details = [profile?.birthDate ? `Born: ${profile.birthDate}` : "", profile?.birthPlace ? `Birthplace: ${profile.birthPlace}` : ""].filter(Boolean).join(" • ");
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
    [["Back to Music Hub", `${getSiteRoot()}music/index.html`], ["Browse composers", `${getSiteRoot()}music/composers/index.html`]].forEach(([label, href]) => {
      const link = document.createElement("a");
      link.className = "ccg-btn ccg-btn--primary ccg-composer-nav__button";
      link.href = href;
      link.textContent = label;
      nav.appendChild(link);
    });
    eligibleNames.filter((name) => name !== composerName).slice(0, 4).forEach((name) => {
      const link = document.createElement("a");
      link.className = "ccg-btn ccg-btn--ghost ccg-composer-nav__button ccg-composer-nav__button--secondary";
      link.href = `${getSiteRoot()}music/${composerSlug(name)}.html`;
      link.textContent = name;
      nav.appendChild(link);
    });
  }

  async function createComposerCard(composer) {
    const slug = composer.slug;
    const imagePath = `/resources/images/composers/${slug}.jpg`;
    const hasImage = await imageExists(imagePath);

    if (hasImage) {
      return `
        <a href="/music/${slug}/" class="composer-card composer-card--featured">
          <div class="composer-thumb">
            <img src="${imagePath}" alt="${composer.name}">
          </div>
          <div class="composer-info">
            <h3>${composer.name}</h3>
            <p class="composer-platform">${composer.platform || "C64"}</p>
            <p class="composer-count">${composer.count} Tracks</p>
          </div>
        </a>
      `;
    }

    return `
      <a href="/music/${slug}/" class="composer-card composer-card--compact">
        <div class="composer-info">
          <h3>${composer.name}</h3>
          <p class="composer-platform">${composer.platform || "C64"}</p>
          <p class="composer-count">${composer.count} Tracks</p>
        </div>
      </a>
    `;
  }

  async function renderComposers(composers) {
    const featured = [];
    const compact = [];

    for (const composer of composers) {
      const card = await createComposerCard(composer);

      if (card.includes("composer-card--featured")) {
        featured.push(card);
      } else {
        compact.push(card);
      }
    }

    const featuredGrid = document.querySelector(".composer-grid-featured");
    const compactGrid = document.querySelector(".composer-grid-compact");
    if (featuredGrid) featuredGrid.innerHTML = featured.join("");
    if (compactGrid) compactGrid.innerHTML = compact.join("");
  }

  async function renderHub(index) {
    const eligibleNames = getEligibleComposerNames(index);
    const composers = eligibleNames.map((name) => {
      const games = index.get(name) || [];
      return {
        name,
        slug: composerSlug(name),
        count: games.length,
        platform: getComposerPlatformLabel(games)
      };
    });
    await renderComposers(composers);
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
    await renderHub(composerIndex);
    if (!listEl) {
      initBackToTop();
      return;
    }
    const composerName = resolveComposerFromPage(composerIndex);
    if (!composerName) { listEl.innerHTML = "<li>Composer archive unavailable.</li>"; return; }
    renderComposerChips("composer-featured-list", FEATURED_COMPOSERS.map((entry) => entry.name), composerName);
    renderComposerChips("composer-all-list", eligibleNames, composerName);
    const games = composerIndex.get(composerName) || [];
    await renderComposerMeta(composerName, games.length, eligibleNames, games);
    renderGames(listEl, games);
    initBackToTop();
  }

  const boot = () => init().catch(() => {
    renderComposers([]);
    const listEl = document.getElementById("composer-games");
    if (listEl) listEl.innerHTML = "<li>Unable to load composer games right now.</li>";
    initBackToTop();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
