// Ensure global namespace exists (CRITICAL FIX)
window.ccgGameMusic = window.ccgGameMusic || {};

// Game Music Player Renderer
window.ccgGameMusic.renderGameMusicPlayer = function (container, slug) {
  if (!container || !slug) return;

  const url = `https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/${slug}.mp3`;

  // Create audio element
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.preload = "none";
  audio.style.width = "100%";

  // Create source
  const source = document.createElement("source");
  source.src = url;
  source.type = "audio/mpeg";

  audio.appendChild(source);

  // If file fails to load, remove player cleanly
  audio.addEventListener("error", () => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  // Wrapper for styling consistency
  const wrapper = document.createElement("div");
  wrapper.className = "game-music";

  wrapper.appendChild(audio);
  container.appendChild(wrapper);
};