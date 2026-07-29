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

  global.normalizeComposerName = normalizeComposerName;
  global.getCanonicalComposer = getCanonicalComposer;
  global.COMPOSER_CANONICAL = COMPOSER_CANONICAL;
})(window);
