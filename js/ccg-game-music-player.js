// Ensure global namespace exists (CRITICAL FIX)
window.ccgGameMusic = window.ccgGameMusic || {};

// Game Music Player Renderer
window.ccgGameMusic.renderGameMusicPlayer = async function (container, slug) {
  if (!container || !slug) return;

  const url = `https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/${slug}.mp3`;

  container.innerHTML = "";

  try {
    // 🔍 CHECK IF FILE EXISTS (FAST HEAD REQUEST)
    const response = await fetch(url, { method: "HEAD" });

    if (!response.ok) {
      throw new Error("MP3 not found");
    }

    // ✅ BUILD FULL OMEGA PLAYER
    const wrapper = document.createElement("div");
    wrapper.className = "game-music";

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";
    audio.style.width = "100%";

    const source = document.createElement("source");
    source.src = url;
    source.type = "audio/mpeg";

    audio.appendChild(source);
    wrapper.appendChild(audio);
    container.appendChild(wrapper);

    console.log("[CCG MUSIC] Loaded:", slug);
  } catch (err) {
    console.log("[CCG MUSIC] Missing track:", slug);

    // ❌ NO PLAYER — SHOW CLEAN FALLBACK MESSAGE
    const fallback = document.createElement("div");
    fallback.className = "game-music-missing";

    fallback.innerHTML = `
      <div class="music-missing-text">
        🎵 Track currently not available
      </div>
    `;

    container.appendChild(fallback);
  }
};
