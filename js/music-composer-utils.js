(function (global) {
  const COMPOSER_CANONICAL = {
    "chris hulsbeck": "Chris Hülsbeck",
    "chris huelsbeck": "Chris Hülsbeck",
    "chris hülsbeck": "Chris Hülsbeck"
  };

  // Unicode transliteration and punctuation handling must match scripts/composer-utils.js exactly.
  function normalizeComposerName(name) {
    if (!name) return "";

    return String(name)
      .toLowerCase()
      .replace(/ø/g, "o")
      .replace(/ł/g, "l")
      .replace(/[đð]/g, "d")
      .replace(/þ/g, "th")
      .replace(/æ/g, "ae")
      .replace(/œ/g, "oe")
      .replace(/ß/g, "ss")
      .replace(/[’‘]/g, "'")
      .replace(/&/g, " and ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getCanonicalComposer(name) {
    const normalized = normalizeComposerName(name);
    return COMPOSER_CANONICAL[normalized] || String(name || "").trim();
  }

  function loadTrackShareAssets() {
    if (typeof document === "undefined") return;

    const isComposerPage = document.documentElement?.getAttribute("data-ccg-page") === "music-composer"
      || Boolean(document.querySelector(".ccg-composer-page"));
    if (!isComposerPage) return;

    if (!document.querySelector('link[data-ccg-music-track-share]')) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "/resources/css/music-track-share.css";
      stylesheet.setAttribute("data-ccg-music-track-share", "true");
      document.head.appendChild(stylesheet);
    }

    if (!document.querySelector('script[data-ccg-music-track-share]')) {
      const script = document.createElement("script");
      script.src = "/js/music-track-share.js";
      script.setAttribute("data-ccg-music-track-share", "true");
      document.body.appendChild(script);
    }
  }

  global.normalizeComposerName = normalizeComposerName;
  global.getCanonicalComposer = getCanonicalComposer;
  global.COMPOSER_CANONICAL = COMPOSER_CANONICAL;

  loadTrackShareAssets();
})(window);
