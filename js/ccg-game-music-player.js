/* =========================================================
   CCG GAME MUSIC PLAYER (R2 SAFE - FIXED)
   ---------------------------------------------------------
   FIX:
   - Removes unreliable HEAD check
   - Uses GET range request (R2-safe)
   - Ensures valid files ALWAYS render
========================================================= */

(function () {
  if (!window.ccgGameMusic) {
    window.ccgGameMusic = {};
  }

  function getMusicUrl(slug) {
    return `https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/${slug}.mp3`;
  }

  /**
   * R2-safe existence check
   * Uses tiny byte-range GET instead of HEAD
   */
  async function musicExists(url) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Range: "bytes=0-1"
        },
        cache: "no-store"
      });

      // Accept both 200 and 206 (partial content)
      return res.ok || res.status === 206;

    } catch (err) {
      console.error("Music check failed:", url, err);
      return false;
    }
  }

  window.ccgGameMusic.renderGameMusicPlayer = async function (container, slug) {
    if (!container || !slug) return;

    const url = getMusicUrl(slug);

    const exists = await musicExists(url);

    if (!exists) {
      return; // cleanly skip
    }

    container.innerHTML = `
      <div class="game-music">
        <audio controls preload="none">
          <source src="${url}" type="audio/mpeg">
        </audio>
      </div>
    `;
  };
})();
