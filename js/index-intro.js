// js/index-intro.js

// =========================================
// CONFIG
// =========================================
const NEXT_URL = 'home.html';
const LOADING_SOUND_URL = 'resources/audio/c64_speech_stayawhile.mp3';

// State
let loadingAborted = false;
let audio = null;
let redirectTimeout = null;

// =========================================
// STARFIELD BACKGROUND
// =========================================
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');
let stars = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars();
}

function initStars() {
    stars = [];
    for (let i = 0; i < 120; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speed: Math.random() * 2 + 0.4
        });
    }
}

function animateStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        ctx.fillRect(star.x, star.y, star.size, star.size);
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
    requestAnimationFrame(animateStars);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
animateStars();

// =========================================
// UTILITIES
// =========================================
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function typeText(elementId, text, delayMs = 55) {
    return new Promise(resolve => {
        if (loadingAborted) {
            resolve();
            return;
        }
        const el = document.getElementById(elementId);
        let i = 0;
        const timer = setInterval(() => {
            if (loadingAborted) {
                clearInterval(timer);
                resolve();
                return;
            }
            el.innerHTML += text.charAt(i);
            i++;
            if (i >= text.length) {
                clearInterval(timer);
                resolve();
            }
        }, delayMs);
    });
}

// =========================================
// INTRO FLOW
// =========================================
function startSystem() {
    if (loadingAborted) return;

    const startScreen = document.getElementById('start-screen');
    const loadingScreen = document.getElementById('loading-screen');

    startScreen.style.display = 'none';
    loadingScreen.style.display = 'flex';

    runLoadingSequence();
}

function skipIntro() {
    loadingAborted = true;

    // Stop audio
    try {
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    } catch (e) {}

    // Cancel any pending redirect
    if (redirectTimeout) {
        clearTimeout(redirectTimeout);
        redirectTimeout = null;
    }

    window.location.href = NEXT_URL;
}

async function runLoadingSequence() {
    const terminal = document.getElementById('loading-terminal');
    const rasterBars = document.getElementById('rasterBars');

    if (loadingAborted) return;

    // Line 1: LOAD ""
    await typeText('loading-terminal', 'LOAD ""', 70);
    await delay(550);
    if (loadingAborted) return;
    terminal.innerHTML += '<br>';

    // Line 2: PRESS PLAY ON TAPE
    await delay(550);
    if (loadingAborted) return;
    terminal.innerHTML += 'PRESS PLAY ON TAPE<br>';

    await delay(850);
    if (loadingAborted) return;

    // Line 3: OK
    terminal.innerHTML += 'OK<br>';
    await delay(650);
    if (loadingAborted) return;

    // Line 4: SEARCHING
    terminal.innerHTML += '<span class="text-highlight">SEARCHING</span><br>';
    await delay(900);
    if (loadingAborted) return;

    // Line 5: FOUND
    terminal.innerHTML += '<span class="text-highlight">FOUND CHEEKY COMMODORE GAMER</span><br>';
    await delay(1100);
    if (loadingAborted) return;

    // Line 6: LOADING
    terminal.innerHTML += '<span class="text-highlight">LOADING</span><br>';

    // RASTER BARS ON
    rasterBars.style.display = 'block';

    // Start SID speech *exactly when raster bars appear*
    playIntroAudio();

    // HARD AUTO-REDIRECT after ~3 seconds of raster bars,
    // regardless of audio success, so it never gets "stuck".
    redirectTimeout = setTimeout(() => {
        if (!loadingAborted) {
            goToHome();
        }
    }, 3000);
}

function playIntroAudio() {
    try {
        audio = new Audio(LOADING_SOUND_URL);
        audio.volume = 0.9;
        // We don't rely on audio events for redirect anymore,
        // but still try to play for the full effect.
        audio.play().catch(() => {
            // If autoplay fails, we just let the 3s timeout handle redirect.
        });
    } catch (e) {
        // Fail silently; redirect handled by timeout.
    }
}

function goToHome() {
    loadingAborted = true;
    window.location.href = NEXT_URL;
}

// ESC key also skips
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        skipIntro();
    }
});
