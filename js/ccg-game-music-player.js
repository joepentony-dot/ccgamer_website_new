window.ccgGameMusic.renderGameMusicPlayer = function (container, slug) {
  if (!container || !slug) return;

  const url = `https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/${slug}.mp3`;

  const audio = document.createElement("audio");
  audio.controls = true;
  audio.preload = "none";
  audio.style.width = "100%";

  const source = document.createElement("source");
  source.src = url;
  source.type = "audio/mpeg";

  audio.appendChild(source);

  // Only show player if it actually starts loading
  audio.addEventListener("error", () => {
    container.remove(); // remove empty player cleanly
  });

  const wrapper = document.createElement("div");
  wrapper.className = "game-music";

  wrapper.appendChild(audio);
  container.appendChild(wrapper);
};