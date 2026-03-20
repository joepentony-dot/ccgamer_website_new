(function () {
  if (!window.ccgGameMusic) {
    window.ccgGameMusic = {};
  }

  window.ccgGameMusic.renderGameMusicPlayer = function (container, slug) {
    if (!container) return;
    if (!slug) return;

    const url = `https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/${slug}.mp3`;
    if (!url) {
      return;
    }

    container.innerHTML = `
      <div class="game-music">
        <audio controls preload="none">
          <source src="${url}" type="audio/mpeg">
        </audio>
      </div>
    `;

    const audio = container.querySelector("audio");
    if (!audio) {
      container.innerHTML = "";
      return;
    }

    audio.addEventListener("error", () => {
      container.innerHTML = "";
    }, { once: true });
  };
})();
