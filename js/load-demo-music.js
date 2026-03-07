document.addEventListener("DOMContentLoaded", function () {

const container = document.getElementById("demo-music-container");

if (!container) return;

fetch("/games/games.json")
.then(response => response.json())
.then(data => {

const demoMusic = data.filter(item => item.type === "demo_music");

demoMusic.forEach(item => {

const media = item.youtube
  ? `<iframe src="https://www.youtube.com/embed/${item.youtube}" title="${item.title}" allowfullscreen loading="lazy"></iframe>`
  : `<audio controls src="/resources/audio/${item.audio}"></audio>`;

const card = document.createElement("div");
card.className = "ccg-card";

card.innerHTML = `
<img src="/resources/images/demo-music/${item.thumbnail}" alt="${item.title} Demo Music">
<h3>${item.title}</h3>
<p>Composer: ${item.composer}<br>
Demo Group: ${item.group}<br>
Year: ${item.year}</p>
<div class="video-container">
${media}
</div>
`;

container.appendChild(card);

});

});

});
