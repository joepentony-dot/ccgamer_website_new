(function () {
  const MUSIC_PATH_CACHE = new Map();

  function resolveSiteRoot() {
    const root = (typeof window !== "undefined" && typeof window.ccgGetSiteRoot === "function")
      ? window.ccgGetSiteRoot()
      : "/";
    return root.endsWith("/") ? root : `${root}/`;
  }

  function resolveGameMusicPath(slug) {
    const safeSlug = String(slug || "").trim();
    if (!safeSlug) return "";
    return `${resolveSiteRoot()}resources/audio/games/${encodeURIComponent(safeSlug)}.mp3`;
  }

  async function checkGameMusicExists(path) {
    if (!path) return false;
    if (MUSIC_PATH_CACHE.has(path)) {
      return MUSIC_PATH_CACHE.get(path);
    }

    const request = fetch(path, { method: "HEAD", cache: "force-cache" })
      .then((response) => response.ok)
      .catch(() => false);

    MUSIC_PATH_CACHE.set(path, request);
    const exists = await request;
    MUSIC_PATH_CACHE.set(path, exists);
    return exists;
  }

  async function renderGameMusicPlayer({ slug, mount, className = "" }) {
    if (!mount) return false;

    const musicPath = resolveGameMusicPath(slug);

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";

    if (className) {
      audio.className = className;
    }

    const source = document.createElement("source");
    source.src = musicPath;
    source.type = "audio/mpeg";

    audio.appendChild(source);

    // Graceful fallback — if file missing, remove player
    const clearMountOnError = () => {
      mount.innerHTML = "";
    };
    audio.addEventListener("error", clearMountOnError);
    source.addEventListener("error", clearMountOnError);

    mount.appendChild(audio);

    return true;
  }

  window.ccgGameMusic = {
    resolveGameMusicPath,
    checkGameMusicExists,
    renderGameMusicPlayer
  };
})();
