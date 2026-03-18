/* =========================================
   CCG SCHEMA ENGINE (OMEGA SAFE)
   ========================================= */

(function () {
  function injectSchema(data) {
    try {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(data);
      document.head.appendChild(script);
    } catch (e) {
      console.warn("Schema injection failed", e);
    }
  }

  /* ===============================
     GLOBAL WEBSITE SCHEMA
     =============================== */
  function addWebsiteSchema() {
    injectSchema({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Cheeky Commodore Gamer",
      url: window.location.origin
    });
  }

  /* ===============================
     GAME PAGE SCHEMA
     =============================== */
  function addGameSchema() {
    const title = document.querySelector("h1")?.textContent;
    if (!title) return;

    const composerEl = document.querySelector(".ccg-composer, .game-composer");
    const composer = composerEl ? composerEl.textContent.trim() : null;

    injectSchema({
      "@context": "https://schema.org",
      "@type": "VideoGame",
      name: title,
      genre: "Retro",
      gamePlatform: "Commodore 64",
      ...(composer && {
        creator: {
          "@type": "Person",
          name: composer
        }
      })
    });
  }

  /* ===============================
     COMPOSER PAGE SCHEMA
     =============================== */
  function addComposerSchema() {
    const name = document.querySelector("h1")?.textContent;
    if (!name) return;

    injectSchema({
      "@context": "https://schema.org",
      "@type": "Person",
      name: name,
      jobTitle: "Video Game Composer"
    });
  }

  /* ===============================
     PAGE DETECTION
     =============================== */
  function detectPageType() {
    const path = window.location.pathname;

    if (path.includes("/games/")) {
      addGameSchema();
    } else if (path.includes("/music/")) {
      addComposerSchema();
    }

    addWebsiteSchema();
  }

  /* ===============================
     INIT
     =============================== */
  document.addEventListener("DOMContentLoaded", detectPageType);
})();
