(function (global) {
  const COMPOSER_CANONICAL = {
    "chris hulsbeck": "Chris Hülsbeck",
    "chris huelsbeck": "Chris Hülsbeck",
    "chris hülsbeck": "Chris Hülsbeck",
    "oisten eide": "Oisten Eide"
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


const COMPOSER_NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv"]);

function shouldFileComposerByFullName(value) {
  const raw = String(value || "").trim();
  const normalized = normalizeComposerName(raw);
  if (!normalized || !normalized.includes(" ")) return true;
  return /\d/.test(raw) || /(?:^|\s)(?:and|of|the)(?:\s|$)/i.test(raw) || /[&+]/.test(raw);
}

function getComposerSortKey(value) {
  const canonical = getCanonicalComposer(value) || String(value || "").trim();
  const parts = canonical.split(/\s+/).filter(Boolean);
  if (parts.length <= 1 || shouldFileComposerByFullName(canonical)) {
    return normalizeComposerName(canonical);
  }

  let surnameIndex = parts.length - 1;
  while (surnameIndex > 0 && COMPOSER_NAME_SUFFIXES.has(normalizeComposerName(parts[surnameIndex]))) {
    surnameIndex -= 1;
  }

  const surname = normalizeComposerName(parts[surnameIndex]);
  const remainder = normalizeComposerName([
    ...parts.slice(0, surnameIndex),
    ...parts.slice(surnameIndex + 1)
  ].join(" "));
  return [surname, remainder].filter(Boolean).join(" ");
}

function getComposerSortLetter(value) {
  const first = getComposerSortKey(value).charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : "#";
}

function compareComposerNames(a, b) {
  return getComposerSortKey(a).localeCompare(getComposerSortKey(b), "en", { sensitivity: "base" }) ||
    normalizeComposerName(a).localeCompare(normalizeComposerName(b), "en", { sensitivity: "base" });
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
  global.getComposerSortKey = getComposerSortKey;
  global.getComposerSortLetter = getComposerSortLetter;
  global.compareComposerNames = compareComposerNames;
  global.COMPOSER_CANONICAL = COMPOSER_CANONICAL;

  loadTrackShareAssets();
})(window);
