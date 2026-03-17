(function () {
  const PROFILE_DATA = {
    "rob-hubbard": { name: "Rob Hubbard", slug: "rob-hubbard", platform: "C64 / Amiga", count: 0, bio: "Rob Hubbard is a British composer and programmer best known for influential Commodore 64 game music in the 1980s." },
    "martin-galway": { name: "Martin Galway", slug: "martin-galway", platform: "C64", count: 0, bio: "Martin Galway is a British composer strongly associated with Commodore 64 and ZX Spectrum game music." },
    "ben-daglish": { name: "Ben Daglish", slug: "ben-daglish", platform: "C64 / Amiga", count: 0, bio: "Ben Daglish was an English composer and musician whose work became a major part of 1980s home-computer gaming." },
    "matt-gray": { name: "Matt Gray", slug: "matt-gray", platform: "C64", count: 0, bio: "Matt Gray is a British producer and composer known for Commodore 64 music including Last Ninja 2." },
    "david-whittaker": { name: "David Whittaker", slug: "david-whittaker", platform: "C64 / Amiga", count: 0, bio: "David Whittaker is an English video-game composer whose work spans many home computer formats." },
    "jeroen-tel": { name: "Jeroen Tel", slug: "jeroen-tel", platform: "C64 / Amiga", count: 0, bio: "Jeroen Tel is a Dutch composer known for late-1980s and early-1990s game music." },
    "fred-gray": { name: "Fred Gray", slug: "fred-gray", platform: "C64 / Amiga", count: 0, bio: "Fred Gray is an English game-music composer known for Commodore 64 and Amiga releases." },
    "chris-huelsbeck": { name: "Chris Hülsbeck", slug: "chris-huelsbeck", platform: "C64 / Amiga", count: 0, bio: "Chris Hülsbeck is a German game-music composer widely known for European home computer soundtracks." }
  };

  function getComposerBySlug(slug, composers) {
    return composers.find(c =>
      c.slug === slug ||
      c.slug === slug.toLowerCase() ||
      c.name.toLowerCase().replace(/\s+/g, '-') === slug
    );
  }

  function buildComposerData() {
    if (Array.isArray(window.composers) && window.composers.length) {
      return window.composers;
    }

    const fromProfile = Object.values(PROFILE_DATA);
    const pageMain = document.querySelector("[data-composer-name]");
    if (!pageMain) return fromProfile;

    const pageName = pageMain.getAttribute("data-composer-name") || "";
    const pageSlug = pageMain.getAttribute("data-composer-slug") || "";
    if (!pageName || !pageSlug) return fromProfile;

    const existing = fromProfile.find((composer) => composer.slug === pageSlug);
    if (existing) return fromProfile;

    return fromProfile.concat([{
      name: pageName,
      slug: pageSlug,
      platform: "C64 / Amiga",
      count: 0,
      bio: "Biography coming soon."
    }]);
  }

  function renderComposerPage(composers) {

    const pathParts = window.location.pathname.split('/');
    const slug = pathParts[pathParts.length - 2] || pathParts[pathParts.length - 1].replace(/\.html$/, '');

    const composer = getComposerBySlug(slug, composers);

    const container = document.getElementById("composer-content");
    if (!container) {
      console.error("#composer-content container is missing");
      return;
    }

    console.log("Composer slug:", slug);
    console.log("Composer found:", composer);

    // 🔥 FAILSAFE — NEVER RETURN BLANK PAGE
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
      <p>${composer.platform || 'C64 / Amiga'}</p>
      <p>${composer.count || 0} Tracks</p>
    </section>

    <section class="composer-bio">
      <p>${composer.bio || 'Biography coming soon.'}</p>
    </section>

    <section class="composer-tracks">
      <h2>🎧 Tracks</h2>
      <div id="composer-track-list"></div>
    </section>
  `;
  }

  const composers = buildComposerData();

  document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("composer-content")) return;
    if (typeof composers !== "undefined") {
      renderComposerPage(composers);
    } else {
      console.error("Composer data not found");
    }
  });
})();
