window.CCGSharedMusicPlayer = (function () {
  const BASE_URL = "https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev";

  function buildUrl(slug) {
    return `${BASE_URL}/${slug}.mp3`;
  }

  function createOmegaPlayer(container, slug) {
    const wrapper = document.createElement("div");
    wrapper.className = "omega-player";

    const status = document.createElement("div");
    status.className = "omega-player-status";
    status.textContent = "● TRACK READY";

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";

    const source = document.createElement("source");
    source.src = buildUrl(slug);
    source.type = "audio/mpeg";

    audio.appendChild(source);

    wrapper.appendChild(status);
    wrapper.appendChild(audio);

    audio.addEventListener("play", () => {
      status.textContent = "● NOW PLAYING";
      wrapper.classList.add("is-playing");
    });

    audio.addEventListener("pause", () => {
      status.textContent = "● TRACK READY";
      wrapper.classList.remove("is-playing");
    });

    return wrapper;
  }

  function renderIfExists(container, slug) {
    if (!container || !slug) return;

    const url = buildUrl(slug);
    const probe = new Audio();
    probe.src = url;
    probe.preload = "metadata";

    let handled = false;

    probe.addEventListener("loadedmetadata", () => {
      if (handled) return;
      handled = true;

      container.innerHTML = "";

      const player = createOmegaPlayer(container, slug);
      container.appendChild(player);

      console.log("[CCG MUSIC] Loaded:", slug);
    });

    probe.addEventListener("error", () => {
      if (handled) return;
      handled = true;

      container.innerHTML = "";

      console.log("[CCG MUSIC] Not found (hidden):", slug);
    });
  }

  return {
    render: renderIfExists
  };
})();
