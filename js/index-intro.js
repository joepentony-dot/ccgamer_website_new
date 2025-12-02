// =========================================
// CONFIG
// =========================================
const NEXT_URL = 'home.html';
let loadingAborted = false;

// DOM refs
const startScreen = document.getElementById('start-screen');
const loadingScreen = document.getElementById('loading-screen');
const terminal = document.getElementById('loading-terminal');
const rasterBars = document.getElementById('rasterBars');
const skipBtn = document.getElementById('skipIntroBtn');
const sidAudio = document.getElementById('sidAudio');

// Utility delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// TYPE TEXT
async function typeLine(text, speed = 50) {
    for (let i = 0; i < text.length; i++) {
        if (loadingAborted) return;
        terminal.textContent += text[i];
        await delay(speed);
    }
    terminal.textContent += "\n";
}

// START SYSTEM
function startSystem() {
    if (loadingAborted) return;
    startScreen.style.display = 'none';
    loadingScreen.style.display = 'block';
    runLoadSequence();
}

// SKIP
function skipIntro() {
    loadingAborted = true;
    try {
        sidAudio.pause();
        sidAudio.currentTime = 0;
    } catch(e){}
    window.location.href = NEXT_URL;
}

skipBtn.addEventListener('click', skipIntro);

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') skipIntro();
});

// MAIN LOAD FLOW
async function runLoadSequence() {

    await typeLine('LOAD ""', 70);
    await delay(500);

    await typeLine("PRESS PLAY ON TAPE", 50);
    await delay(700);

    terminal.textContent += "SEARCHING\n";
    await delay(800);

    terminal.textContent += "FOUND CHEEKY COMMODORE GAMER\n";
    await delay(500);

    terminal.textContent += "LOADING\n";

    // Show raster
    rasterBars.style.display = 'block';

    // Start SID
    sidAudio.currentTime = 0;
    sidAudio.play().catch(()=>{});

    // Redirect after 3 seconds
    setTimeout(() => {
        if (!loadingAborted) window.location.href = NEXT_URL;
    }, 3000);
}

// CLICK TO POWER ON
startScreen.addEventListener('click', startSystem);
