(function () {
  if (!window.ccgGameMusic) {
    window.ccgGameMusic = {};
  }

  window.ccgGameMusic.renderGameMusicPlayer = async function (container, slug) {
    if (!container || !slug) return;

    const url = `https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/${slug}.mp3`;

    try {
      const res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-1" } });

      if (!(res.status === 200 || res.status === 206)) {
        return; // file does NOT exist → no player
      }

    } catch (e) {
      return;
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
