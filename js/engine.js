
let audioCtx;
try {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
  audioCtx = null;
}

function safeTone(freq = 440, type = 'square', dur = 0.08, gain = 0.08) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g);
  g.connect(audioCtx.destination);
  o.type = type;
  o.frequency.setValueAtTime(freq, audioCtx.currentTime);
  g.gain.setValueAtTime(gain, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.start();
  o.stop(audioCtx.currentTime + dur);
}

function playClickSound() {
  safeTone(150, 'square', 0.09, 0.08);
}

function setC64Mode() {
  const body = document.body;
  body.classList.remove('amiga-mode');
  body.classList.add('c64-mode');
  const sys = document.getElementById('system-text');
  const ram = document.getElementById('ram-text');
  const label = document.querySelector('.mode-label');
  if (sys) sys.textContent = '**** COMMODORE 64 BASIC V2 ****';
  if (ram) ram.textContent = '64K RAM SYSTEM 38911 BASIC BYTES FREE';
  if (label) label.textContent = 'C64 MODE';
  localStorage.setItem('ccg-mode', 'c64');
}

function setAmigaMode() {
  const body = document.body;
  body.classList.remove('c64-mode');
  body.classList.add('amiga-mode');
  const sys = document.getElementById('system-text');
  const ram = document.getElementById('ram-text');
  const label = document.querySelector('.mode-label');
  if (sys) sys.textContent = '**** AMIGA WORKBENCH 1.3 ****';
  if (ram) ram.textContent = '512K CHIP RAM + 512K FAST RAM';
  if (label) label.textContent = 'AMIGA MODE';
  localStorage.setItem('ccg-mode', 'amiga');
}

function modeBootEffect(nextModeFn) {
  const overlay = document.getElementById('power-overlay');
  if (!overlay) {
    nextModeFn();
    return;
  }
  overlay.style.opacity = '1';
  overlay.style.transition = 'none';
  overlay.style.transform = 'scaleY(0.02)';
  overlay.style.background = '#fff';
  playClickSound();
  requestAnimationFrame(() => {
    overlay.style.transition = 'transform 0.35s ease, opacity 0.35s ease, background 0.35s ease';
    overlay.style.transform = 'scaleY(1)';
    overlay.style.background = '#000';
    setTimeout(() => {
      nextModeFn();
      overlay.style.opacity = '0';
    }, 350);
  });
}

function toggleMode() {
  const isC64 = document.body.classList.contains('c64-mode');
  if (isC64) modeBootEffect(setAmigaMode);
  else modeBootEffect(setC64Mode);
}

function typeText(elementId, text, delay = 50) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = '';
  let i = 0;
  const timer = setInterval(() => {
    el.innerHTML += text.charAt(i);
    safeTone(900, 'triangle', 0.03, 0.02);
    i++;
    if (i >= text.length) clearInterval(timer);
  }, delay);
}

function initStarfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.3,
        speed: Math.random() * 2 + 0.4
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
      ctx.fillRect(star.x, star.y, star.size, star.size);
      star.y += star.speed;
      if (star.y > canvas.height) star.y = 0;
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
}

// Secret modal

function openSecret() {
  const m = document.getElementById('secret-modal');
  if (m) m.style.display = 'flex';
}

function closeSecret() {
  const m = document.getElementById('secret-modal');
  if (m) m.style.display = 'none';
}

// Command console

function openCommandConsole() {
  closeSecret();
  const c = document.getElementById('command-console');
  const i = document.getElementById('console-input');
  if (!c || !i) return;
  c.style.display = 'block';
  setTimeout(() => i.focus(), 50);
}

function closeCommandConsole() {
  const c = document.getElementById('command-console');
  const i = document.getElementById('console-input');
  if (!c || !i) return;
  c.style.display = 'none';
  i.value = '';
}

// Cheats

const cheats = {
  sys64738() {
    typeText('typewriter-text', 'SYSTEM RESET COMPLETE', 40);
    safeTone(120, 'sawtooth', 0.25, 0.08);
  },
  pressplay() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = '#352879';
    overlay.style.zIndex = '2000000';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.innerHTML = '<div style="width:100%;max-width:600px;height:200px;background:repeating-linear-gradient(0deg, red, cyan, purple, green, blue, yellow, orange, brown, pink, grey);animation: ccgBars 0.12s infinite;"></div><h1 style="color:#fff;margin-top:20px;">PRESS PLAY ON TAPE</h1>';
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 3500);
  },
  zxspectrum() {
    typeText('typewriter-text', 'LOADING ZX SPECTRUM MENU...', 40);
    safeTone(800, 'square', 0.2, 0.1);
  },
  konamicode() {
    safeTone(400, 'square', 0.1);
    setTimeout(() => safeTone(600, 'square', 0.1), 150);
    setTimeout(() => safeTone(1000, 'square', 0.25), 300);
    alert('GOD MODE ENABLED - 30 LIVES ADDED');
  },
  cheeky() {
    window.location.href = "https://gaydar.net/";
  }
};

function submitConsole() {
  const input = document.getElementById('console-input');
  if (!input) return;
  const raw = input.value || '';
  const key = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cheats[key]) {
    cheats[key]();
    closeCommandConsole();
  } else {
    safeTone(100, 'sawtooth', 0.2, 0.12);
    input.value = 'INVALID CODE';
    setTimeout(() => { input.value = ''; }, 900);
  }
}

let keyHistory = '';

document.addEventListener('keydown', (e) => {
  const c = document.getElementById('command-console');
  if (c && c.style.display === 'block') {
    if (e.key === 'Enter') {
      submitConsole();
      e.preventDefault();
    }
    return;
  }
  keyHistory += e.key.toLowerCase();
  if (keyHistory.length > 24) keyHistory = keyHistory.slice(-24);
  const clean = keyHistory.replace(/[^a-z0-9]/g, '');
  Object.keys(cheats).forEach(code => {
    if (clean.endsWith(code)) {
      cheats[code]();
      keyHistory = '';
    }
  });
});

window.addEventListener('load', () => {
  initStarfield();
  const saved = localStorage.getItem('ccg-mode');
  if (saved === 'amiga') setAmigaMode();
  else setC64Mode();
  const defaultText = document.body.getAttribute('data-ccg-title');
  if (defaultText) typeText('typewriter-text', defaultText, 60);
});

