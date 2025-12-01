// js/index-intro.js

// ===============================
// CONFIG
// ===============================
const NEXT_URL = 'home.html';
const LOADING_SOUND_URL = 'resources/audio/c64_speech_stayawhile.mp3';

// State
let loadingAborted = false;
let audio = null;
let redirectTimeout = null;

// ===============================
// STARFIELD
// ===============================
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
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speed: Math.random() * 3 + 0.5
        });
    }
}

function animateStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        ctx.fillRect(star.x, star.y, star.size, star.size);
        star.y += star.speed;
        if (star.y > canvas.height) star.y = 0;
    });
    requestAnimationFrame(animateStars);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
animateStars();

// ===============================
// TYPEWRITER
// ===============================
function typeText(elementId, text, delay = 50) {
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
        }, delay);
    });
}

// ===============================
// INTRO FLOW
// ===============================
function startSystem() {
    if (loadingAborted) return; // Just in case

    const startScreen = document.getElementById('start-screen');
    const loadingScreen = document.getElementById('loading-screen');

    startScreen.style.display = 'none';
    loadingScreen.style.display = 'flex';

    runLoadingSequence();
}

function skipIntro() {
    loadingAborted = true;

    // Stop audio if playing
    try {
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    } catch (e) { }

    // Cancel redirect timeout if any
    if (redirectTimeout) {
        clearTimeout(redirectTimeout);
        redirectTimeout = null;
    }

    // Hard redirect to home
    window.location.href = NEXT_URL;
}

async function runLoadingSequence() {
    const terminal = document.getElementById('loading-terminal');
    const rasterBars = document.getElementById('rasterBars');

    if (loadingAborted) return;

    // LOAD ""
    await typeText('loading-terminal', 'LOAD ""', 70);
    await delay(600);
    if (loadingAborted) return;
    terminal.innerHTML += '<br>';

    // PRESS PLAY ON TAPE
    await delay(600);
    if (loadingAborted) return;
    terminal.innerHTML += 'PRESS PLAY ON TAPE<br>';

    await delay(900);
    if (loadingAborted) return;

    // OK
    terminal.innerHTML += 'OK<br>';
    await delay(700);
    if (loadingAborted) return;

    // SEARCHING
    terminal.innerHTML += '<span class="text-highlight">SEARCHING</span><br>';
    await delay(900);
    if (loadingAborted) return;

    // FOUND
    terminal.innerHTML += '<span class="text-highlight">FOUND CHEEKY COMMODORE GAMER</span><br>';
    await delay(1100);
    if (loadingAborted) return;

    // LOADING
    terminal.innerHTML += '<span class="text-highlight">LOADING</span><br>';

    // RASTER BARS ON + SID SPEECH STARTS *NOW*
    rasterBars.style.display = 'block';

    try {
        audio = new Audio(LOADING_SOUND_URL);
        audio.volume = 0.9;

        // When audio ends → go to home (if not skipped)
        audio.addEventListener('ended', () => {
            if (!loadingAborted) {
                goToHome();
            }
        });

        // Fallback: in case ended doesn't fire reliably, force redirect
        audio.addEventListener('loadedmetadata', () => {
            if (loadingAborted) return;
            const duration = audio.duration || 10; // seconds
            redirectTimeout = setTimeout(() => {
                if (!loadingAborted) {
                    goToHome();
                }
            }, (duration + 0.5) * 1000);
        });

        await audio.play();
    } catch (e) {
        // Audio failed; still show raster for a bit then go home
        await delay(5000);
        if (!loadingAborted) {
            goToHome();
        }
    }
}

function goToHome() {
    loadingAborted = true;
    window.location.href = NEXT_URL;
}

// Simple delay helper
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Make skip work via ESC key too (optional nicety)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        skipIntro();
    }
});
