(function (global) {
  const COMPOSER_CANONICAL = {
    "chris hulsbeck": "Chris Hülsbeck",
    "chris huelsbeck": "Chris Hülsbeck",
    "chris hülsbeck": "Chris Hülsbeck"
  };

  function normalizeComposerName(name) {
    if (!name) return "";

    return String(name)
      .toLowerCase()
      .replace(/ü/g, "u")
      .replace(/ä/g, "a")
      .replace(/ö/g, "o")
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getCanonicalComposer(name) {
    const normalized = normalizeComposerName(name);
    return COMPOSER_CANONICAL[normalized] || String(name || "").trim();
  }

  global.normalizeComposerName = normalizeComposerName;
  global.getCanonicalComposer = getCanonicalComposer;
  global.COMPOSER_CANONICAL = COMPOSER_CANONICAL;
})(window);
