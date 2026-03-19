(function () {
  "use strict";

  if (!window.ccgGameMusic) {
    window.ccgGameMusic = {};
  }

  function normalizeSlug(slug) {
    if (window.CCGMusic && typeof window.CCGMusic.normalizeSlug === "function") {
      return window.CCGMusic.normalizeSlug(slug);
    }

    return String(slug || "")
      .trim()
      .replace(/\.mp3$/i, "")
      .replace(/^\/+|\/+$/g, "");
  }

  function createSharedPlayer(url, options = {}) {
    const factory = window.CCGSharedMusicPlayer && typeof window.CCGSharedMusicPlayer.createAudioPlayer === "function"
      ? window.CCGSharedMusicPlayer.createAudioPlayer
      : null;

    if (!factory || !url) {
      return null;
    }

    return factory(Object.assign({
      src: url
    }, options));
  }

  async function resolveMusicUrl(slug) {
    if (!slug) {
      return "";
    }

    if (window.CCGMusic && typeof window.CCGMusic.resolveGameMusicUrl === "function") {
      return window.CCGMusic.resolveGameMusicUrl(slug);
    }

    const normalizedSlug = normalizeSlug(slug);
    if (!normalizedSlug) {
      return "";
    }

    return `https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/${normalizedSlug}.mp3`;
  }

  window.ccgGameMusic.getMusicUrl = async function (slug) {
    return resolveMusicUrl(slug);
  };

  window.ccgGameMusic.renderGameMusicPlayer = async function (container, slug, options = {}) {
    if (!container || !slug) {
      return null;
    }

    const normalizedSlug = normalizeSlug(slug);
    if (!normalizedSlug) {
      return null;
    }

    if (container.dataset.ccgMusicRenderState === "pending") {
      return null;
    }

    if (container.dataset.ccgMusicRendered === "true") {
      return container.firstElementChild || null;
    }

    container.dataset.ccgMusicRenderState = "pending";

    const url = await resolveMusicUrl(normalizedSlug);

    if (!url) {
      container.dataset.ccgMusicRenderState = "missing";
      return null;
    }

    container.innerHTML = "";

    const player = createSharedPlayer(url, options);
    if (player) {
      container.appendChild(player);
      container.dataset.ccgMusicRendered = "true";
      container.dataset.ccgMusicRenderState = "ready";
      return player;
    }

    container.innerHTML = `
      <div class="game-music">
        <audio controls preload="none">
          <source src="${url}" type="audio/mpeg">
          Your browser does not support the audio element.
        </audio>
      </div>
    `;

    container.dataset.ccgMusicRendered = "true";
    container.dataset.ccgMusicRenderState = "ready";
    return container.firstElementChild;
  };

  async function initGlobalMusicPlayers() {
    const players = document.querySelectorAll(".music-player");

    await Promise.all(Array.from(players).map(async (element) => {
      if (element.dataset.initialised === "true") {
        return;
      }

      const slug = element.dataset.slug;
      if (!slug) {
        return;
      }

      await window.ccgGameMusic.renderGameMusicPlayer(element, slug);
      element.dataset.initialised = "true";
    }));
  }

  document.addEventListener("DOMContentLoaded", () => {
    initGlobalMusicPlayers();
  });

  document.addEventListener("gamesLoaded", () => {
    initGlobalMusicPlayers();
  });
})();
