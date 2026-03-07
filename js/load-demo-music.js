document.addEventListener("DOMContentLoaded", function () {

const container = document.getElementById("demo-music-container");

if (!container) return;

fetch("/games/games.json")
.then(response => response.json())
.then(data => {

const demoMusic = data.filter(item => item.type === "demo_music");

demoMusic.forEach(item => {

const card = document.createElement("div");
card.className = "ccg-card";

card.innerHTML = `
<img src="/resources/images/demo-music/${item.thumbnail}" alt="${item.title}">
<h3>${item.title}</h3>
<p>${item.composer} – ${item.group} (${item.year})</p>

<a href="https://youtu.be/${item.youtube}" target="_blank" class="watch-btn">
Watch Video
</a>
`;

container.appendChild(card);

});

});

});
