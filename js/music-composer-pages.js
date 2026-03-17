(function () {
  const PROFILE_DATA = {
    "allister-brimble": { name: "Allister Brimble", slug: "allister-brimble", platform: "C64 / Amiga", count: 0, bio: "Allister Brimble is a British video-game composer known for 16-bit era soundtracks and home-computer music." },
    "barry-leitch": { name: "Barry Leitch", slug: "barry-leitch", platform: "Amiga", count: 0, bio: "Barry Leitch is a game composer known for energetic music across Amiga and later systems." },
    "ben-daglish": { name: "Ben Daglish", slug: "ben-daglish", platform: "C64 / Amiga", count: 0, bio: "Ben Daglish was an English composer and musician whose work became a major part of 1980s home-computer gaming." },
    "chris-huelsbeck": { name: "Chris Hülsbeck", slug: "chris-huelsbeck", platform: "C64 / Amiga", count: 0, bio: "Chris Hülsbeck is a German game-music composer widely known for European home computer soundtracks." },
    "dave-thomas": { name: "Dave Thomas", slug: "dave-thomas", platform: "C64", count: 0, bio: "Dave Thomas is a composer associated with classic Commodore 64 game music." },
    "david-dunn": { name: "David Dunn", slug: "david-dunn", platform: "C64", count: 0, bio: "David Dunn is a game composer associated with home-computer era releases." },
    "david-whittaker": { name: "David Whittaker", slug: "david-whittaker", platform: "C64 / Amiga", count: 0, bio: "David Whittaker is an English video-game composer whose work spans many home computer formats." },
    "fred-gray": { name: "Fred Gray", slug: "fred-gray", platform: "C64 / Amiga", count: 0, bio: "Fred Gray is an English game-music composer known for Commodore 64 and Amiga releases." },
    "jeroen-tel": { name: "Jeroen Tel", slug: "jeroen-tel", platform: "C64 / Amiga", count: 0, bio: "Jeroen Tel is a Dutch composer known for late-1980s and early-1990s game music." },
    "jonathan-dunn": { name: "Jonathan Dunn", slug: "jonathan-dunn", platform: "C64", count: 0, bio: "Jonathan Dunn is known for distinctive Commodore 64 music and sound design." },
    "keith-tinman": { name: "Keith Tinman", slug: "keith-tinman", platform: "C64", count: 0, bio: "Keith Tinman is a composer associated with classic C64 titles." },
    "mark-cooksey": { name: "Mark Cooksey", slug: "mark-cooksey", platform: "C64 / Amiga", count: 0, bio: "Mark Cooksey is a British composer known for memorable C64 and Amiga game themes." },
    "martin-galway": { name: "Martin Galway", slug: "martin-galway", platform: "C64", count: 0, bio: "Martin Galway is a British composer strongly associated with Commodore 64 and ZX Spectrum game music." },
    "matt-furniss": { name: "Matt Furniss", slug: "matt-furniss", platform: "C64 / Amiga", count: 0, bio: "Matt Furniss is an English composer known for prolific work across Amiga and console generations." },
    "matt-gray": { name: "Matt Gray", slug: "matt-gray", platform: "C64", count: 0, bio: "Matt Gray is a British producer and composer known for Commodore 64 music including Last Ninja 2." },
    "neil-brennan": { name: "Neil Brennan", slug: "neil-brennan", platform: "C64", count: 0, bio: "Neil Brennan is associated with music for classic Commodore 64 releases." },
    "paul-hodgson": { name: "Paul Hodgson", slug: "paul-hodgson", platform: "C64", count: 0, bio: "Paul Hodgson is a game composer known from C64-era productions." },
    "richard-joseph": { name: "Richard Joseph", slug: "richard-joseph", platform: "C64 / Amiga", count: 0, bio: "Richard Joseph was a British game composer and audio director known for his Amiga and C64 era work." },
    "rob-hubbard": { name: "Rob Hubbard", slug: "rob-hubbard", platform: "C64 / Amiga", count: 0, bio: "Rob Hubbard is a British composer and programmer best known for influential Commodore 64 game music in the 1980s." },
    "russell-lieblich": { name: "Russell Lieblich", slug: "russell-lieblich", platform: "C64", count: 0, bio: "Russell Lieblich is known for his SID music work on the Commodore 64." }
  };

  function normaliseSlug(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");
  }

  function normaliseComposer(composer) {
    const name = composer.name || "Unknown Composer";
    return {
      ...composer,
      name,
      slug: normaliseSlug(composer.slug || name)
    };
  }

  function buildComposerData() {
    if (Array.isArray(window.composers) && window.composers.length) {
      return window.composers.map(normaliseComposer);
    }

    return Object.values(PROFILE_DATA).map(normaliseComposer);
  }

  function getComposerTrackCount(composerName, games) {
    let count = 0;

    games.forEach((game) => {
      if (game.music && game.music.includes(composerName)) {
        count++;
      }
    });

    return count;
  }

  function createComposerCard(composer, games) {
    const slug = normaliseSlug(composer.slug || composer.name);
    const imagePath = `/resources/images/composers/${slug}.jpg`;
    const trackCount = getComposerTrackCount(composer.name, games);

    return `
    <a href="/music/${slug}/index.html" class="composer-card" data-slug="${slug}">
      <div class="composer-thumb">
        <img src="${imagePath}" 
             alt="${composer.name}" 
             onerror="this.style.display='none'">
      </div>

      <div class="composer-info">
        <h3>${composer.name}</h3>
        <p class="composer-platform">${composer.platform || "C64"}</p>
        <p class="composer-count">${trackCount} Tracks</p>
      </div>

    </a>
  `;
  }

  function renderComposers(composers, games) {
    const containerFeatured = document.querySelector(".composer-grid-featured");
    const containerAll = document.querySelector(".composer-grid-compact");

    if (!containerFeatured || !containerAll) {
      console.error("Composer containers missing");
      return;
    }

    let featuredHTML = "";
    let allHTML = "";

    composers.forEach((composer, index) => {
      const card = createComposerCard(composer, games);

      if (index < 6) {
        featuredHTML += card;
      } else {
        allHTML += card;
      }
    });

    containerFeatured.innerHTML = featuredHTML;
    containerAll.innerHTML = allHTML;
  }

  async function loadGames() {
    const response = await fetch("/games/games.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load games.json");
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  const composers = buildComposerData();

  document.addEventListener("DOMContentLoaded", async () => {
    if (!document.querySelector(".composer-grid-featured") || !document.querySelector(".composer-grid-compact")) {
      return;
    }

    if (typeof composers === "undefined" || composers.length === 0) {
      console.error("Composer data missing or empty");
      const fallback = document.querySelector(".composer-grid-featured");
      if (fallback) {
        fallback.innerHTML = "<p style='padding:20px'>Unable to load composers.</p>";
      }
      return;
    }

    try {
      const games = await loadGames();
      renderComposers(composers, games);
    } catch (error) {
      console.error("Unable to render composer cards", error);
      renderComposers(composers, []);
    }
  });
})();
