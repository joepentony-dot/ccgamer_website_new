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

  function getComposerBySlug(slug, composers) {
    return composers.find((composer) => composer.slug === normaliseSlug(slug));
  }

  function buildComposerData() {
    if (Array.isArray(window.composers) && window.composers.length) {
      return window.composers.map(normaliseComposer);
    }

    const fromProfile = Object.values(PROFILE_DATA).map(normaliseComposer);
    const pageMain = document.querySelector("[data-composer-name]");
    if (!pageMain) return fromProfile;

    const pageName = pageMain.getAttribute("data-composer-name") || "";
    const pageSlug = normaliseSlug(pageMain.getAttribute("data-composer-slug") || "");
    if (!pageName || !pageSlug) return fromProfile;

    const existing = fromProfile.find((composer) => composer.slug === pageSlug);
    if (existing) return fromProfile;

    return fromProfile.concat([
      normaliseComposer({
        name: pageName,
        slug: pageSlug,
        platform: "C64 / Amiga",
        count: 0,
        bio: "Biography coming soon."
      })
    ]);
  }

  function createComposerCard(composer) {
    const slug = normaliseSlug(composer.slug || composer.name);
    const imagePath = `/resources/images/composers/${slug}.jpg`;

    return `
    <a href="/music/${slug}/" class="composer-card">
      
      <div class="composer-thumb">
        <img src="${imagePath}" 
             alt="${composer.name}" 
             onerror="this.style.display='none'">
      </div>

      <div class="composer-info">
        <h3>${composer.name}</h3>
        <p class="composer-platform">${composer.platform || 'C64'}</p>
        <p class="composer-count">${composer.count || 0} Tracks</p>
      </div>

    </a>
  `;
  }

  function renderComposers(composers) {

    const containerFeatured = document.querySelector(".composer-grid-featured");
    const containerAll = document.querySelector(".composer-grid-compact");

    if (!containerFeatured || !containerAll) {
      console.error("Composer containers missing");
      return;
    }

    let featuredHTML = '';
    let allHTML = '';

    composers.forEach((composer, index) => {

      const card = createComposerCard(composer);

      // First 6 = featured
      if (index < 6) {
        featuredHTML += card;
      } else {
        allHTML += card;
      }

    });

    containerFeatured.innerHTML = featuredHTML;
    containerAll.innerHTML = allHTML;
  }

  function renderComposerPage(composers) {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const slug = normaliseSlug(pathParts[pathParts.length - 1] || "");

    const composer = getComposerBySlug(slug, composers);

    const container = document.getElementById("composer-content");
    if (!container) {
      console.error("#composer-content container is missing");
      return;
    }

    if (!composer) {
      container.innerHTML = `
      <div class="composer-error">
        <h1>Composer Not Found</h1>
        <p>We couldn't load this composer page properly.</p>
        <a href="/music/composers/">← Back to Music Hub</a>
      </div>
    `;
      return;
    }

    container.innerHTML = `
    <section class="composer-hero">
      <h1>${composer.name}</h1>
      <p>${composer.platform || "C64 / Amiga"}</p>
      <p>${composer.count || 0} Tracks</p>
    </section>

    <section class="composer-bio">
      <p>${composer.bio || "Biography coming soon."}</p>
    </section>

    <section class="composer-tracks">
      <h2>🎧 Tracks</h2>
      <div id="composer-track-list"></div>
    </section>
  `;
  }

  const composers = buildComposerData();

  document.addEventListener("DOMContentLoaded", () => {

    if (typeof composers !== "undefined" && composers.length > 0) {
      if (document.querySelector(".composer-grid-featured") && document.querySelector(".composer-grid-compact")) {
        renderComposers(composers);
      }

      if (document.getElementById("composer-content")) {
        renderComposerPage(composers);
      }
    } else {
      console.error("Composer data missing or empty");

      const fallback = document.querySelector(".composer-grid-featured");
      if (fallback) {
        fallback.innerHTML = "<p style='padding:20px'>Unable to load composers.</p>";
      }
    }

  });
})();
