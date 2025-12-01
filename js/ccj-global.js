// ccg-global.js
// Global Easter Eggs, Audio, Mode Switch, and Console for Cheeky Commodore Gamer 😇🕹️👌
//
// This file is SAFE to include on EVERY page.
// It checks for elements before touching them, so pages without the special
// overlays / modals / zx menu / guru stuff will not break.

(function () {
    'use strict';

    // -------------------------------------------------
    // GLOBAL NAMESPACE
    // -------------------------------------------------
    const CCG_GLOBAL = {
        version: '1.0.0',
        pageId: null,
        systemMode: null, // 'c64' | 'amiga'
        audioCtx: null,
        currentAudio: null,
        keyHistory: '',
        zxActive: false,
        zxIndex: 2
    };

    // Attach namespace to window
    window.CCG_GLOBAL = CCG_GLOBAL;

    // -------------------------------------------------
    // AUDIO CORE
    // -------------------------------------------------
    function initAudio() {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) return;

        const audioCtx = new AudioContextCtor();
        CCG_GLOBAL.audioCtx = audioCtx;

        function ensureResumed() {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }
        }

        function simpleBeep(freq, type, dur, gainVal) {
            ensureResumed();
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g);
            g.connect(audioCtx.destination);
            o.type = type;
            o.frequency.setValueAtTime(freq, audioCtx.currentTime);
            g.gain.setValueAtTime(gainVal, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
            o.start();
            o.stop(audioCtx.currentTime + dur);
        }

        function playClickSound() {
            ensureResumed();
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g);
            g.connect(audioCtx.destination);

            const isAmiga = document.body.classList.contains('amiga-mode');
            if (isAmiga) {
                o.type = 'sine';
                o.frequency.setValueAtTime(1200, audioCtx.currentTime);
                o.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
                g.gain.setValueAtTime(0.1, audioCtx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
            } else {
                o.type = 'square';
                o.frequency.setValueAtTime(150, audioCtx.currentTime);
                o.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
                g.gain.setValueAtTime(0.1, audioCtx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            }
            o.start();
            o.stop(audioCtx.currentTime + 0.1);
        }

        function playTypeSound() {
            ensureResumed();
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g);
            g.connect(audioCtx.destination);
            o.type = 'triangle';
            o.frequency.setValueAtTime(800, audioCtx.currentTime);
            g.gain.setValueAtTime(0.02, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
            o.start();
            o.stop(audioCtx.currentTime + 0.05);
        }

        function playTone(freq, type, dur) {
            simpleBeep(freq, type, dur, 0.1);
        }

        function playAuthenticLoad() {
            ensureResumed();

            // Long shrill tone
            const o1 = audioCtx.createOscillator();
            const g1 = audioCtx.createGain();
            o1.connect(g1);
            g1.connect(audioCtx.destination);
            o1.type = 'square';
            o1.frequency.setValueAtTime(800, audioCtx.currentTime);
            g1.gain.setValueAtTime(0.1, audioCtx.currentTime);
            o1.start();
            o1.stop(audioCtx.currentTime + 1.5);

            // Noisy scrambled load
            const o2 = audioCtx.createOscillator();
            const g2 = audioCtx.createGain();
            o2.connect(g2);
            g2.connect(audioCtx.destination);
            o2.type = 'sawtooth';
            g2.gain.setValueAtTime(0, audioCtx.currentTime);
            g2.gain.setValueAtTime(0.1, audioCtx.currentTime + 1.5);
            const startTime = audioCtx.currentTime + 1.5;
            for (let i = 0; i < 50; i++) {
                o2.frequency.setValueAtTime(
                    1000 + Math.random() * 2000,
                    startTime + i * 0.02
                );
            }
            o2.start();
            o2.stop(audioCtx.currentTime + 2.5);
        }

        // Expose helpers
        CCG_GLOBAL.playClickSound = playClickSound;
        CCG_GLOBAL.playTypeSound = playTypeSound;
        CCG_GLOBAL.playTone = playTone;
        CCG_GLOBAL.playAuthenticLoad = playAuthenticLoad;

        // Bind click sound to elements with .play-sound (if any)
        const clickTargets = document.querySelectorAll('.play-sound');
        clickTargets.forEach((el) => {
            el.addEventListener('click', playClickSound);
        });
    }

    // -------------------------------------------------
    // TYPEWRITER EFFECT
    // -------------------------------------------------
    function typeText(elementId, text, delay) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const d = delay || 50;
        el.innerHTML = '';
        let i = 0;

        // Clear previous interval if any
        if (el.dataset.typingInterval) {
            clearInterval(el.dataset.typingInterval);
        }

        const timer = setInterval(function () {
            el.innerHTML += text.charAt(i);
            if (CCG_GLOBAL.playTypeSound) CCG_GLOBAL.playTypeSound();
            i++;
            if (i >= text.length) {
                clearInterval(timer);
                el.innerHTML += '<span class="cursor"></span>';
            }
        }, d);

        el.dataset.typingInterval = timer;
    }

    window.typeText = typeText;

    // -------------------------------------------------
    // MODE SWITCH (C64 / AMIGA)
    // -------------------------------------------------
    function setAmigaMode() {
        const body = document.body;
        body.classList.remove('c64-mode');
        body.classList.add('amiga-mode');

        const sysText = document.getElementById('system-text');
        const ramText = document.getElementById('ram-text');
        const modeLabel = document.querySelector('.mode-label');

        if (sysText) sysText.textContent = '**** AMIGA WORKBENCH 1.3 ****';
        if (ramText) ramText.textContent = '512K CHIP RAM + 512K FAST RAM';
        if (modeLabel) modeLabel.textContent = 'AMIGA MODE';

        try {
            localStorage.setItem('preferredMode', 'amiga');
        } catch (e) {}
        CCG_GLOBAL.systemMode = 'amiga';
    }

    function setC64Mode() {
        const body = document.body;
        body.classList.remove('amiga-mode');
        body.classList.add('c64-mode');

        const sysText = document.getElementById('system-text');
        const ramText = document.getElementById('ram-text');
        const modeLabel = document.querySelector('.mode-label');

        if (sysText) sysText.textContent = '**** COMMODORE 64 BASIC V2 ****';
        if (ramText) ramText.textContent = '64K RAM SYSTEM 38911 BASIC BYTES FREE';
        if (modeLabel) modeLabel.textContent = 'C64 MODE';

        try {
            localStorage.setItem('preferredMode', 'c64');
        } catch (e) {}
        CCG_GLOBAL.systemMode = 'c64';
    }

    function triggerC64Reset() {
        const body = document.body;
        if (!body.classList.contains('c64-mode')) return;

        if (CCG_GLOBAL.playClickSound) CCG_GLOBAL.playClickSound();
        body.classList.add('resetting');

        const typeEl = document.getElementById('typewriter-text');
        if (typeEl) typeEl.innerHTML = '';

        setTimeout(function () {
            body.classList.remove('resetting');
            typeText('typewriter-text', 'COMMODORE 64 BASIC V2', 50);
        }, 600);
    }

    function toggleMode() {
        const body = document.body;
        const isC64 = body.classList.contains('c64-mode');
        const powerOverlay = document.getElementById('power-overlay');

        if (CCG_GLOBAL.playClickSound) CCG_GLOBAL.playClickSound();

        if (powerOverlay) {
            powerOverlay.classList.remove('power-cycle');
            // Force reflow
            void powerOverlay.offsetWidth;
            powerOverlay.classList.add('power-cycle');
        }

        setTimeout(function () {
            if (isC64) {
                setAmigaMode();
                typeText('typewriter-text', 'AMIGA WORKBENCH 1.3 LOADED', 30);
            } else {
                setC64Mode();
                typeText('typewriter-text', 'COMMODORE 64 BASIC V2', 30);
            }
        }, 350);
    }

    window.toggleMode = toggleMode;
    window.triggerC64Reset = triggerC64Reset;
    window.setAmigaMode = setAmigaMode;
    window.setC64Mode = setC64Mode;

    function initModeFromStorage() {
        try {
            const savedMode = localStorage.getItem('preferredMode');
            if (savedMode === 'amiga') {
                setAmigaMode();
            } else if (savedMode === 'c64') {
                setC64Mode();
            }
        } catch (e) {}
    }

    // -------------------------------------------------
    // SECRET MODAL & COMMAND CONSOLE
    // -------------------------------------------------
    let consoleOverlay = null;
    let consoleInput = null;
    let secretModal = null;

    function openSecret() {
        if (!secretModal) return;
        secretModal.style.display = 'flex';
    }

    function closeSecret() {
        if (!secretModal) return;
        secretModal.style.display = 'none';
    }

    window.openSecret = openSecret;
    window.closeSecret = closeSecret;

    function openCommandConsole() {
        closeSecret();
        if (!consoleOverlay || !consoleInput) return;
        consoleOverlay.classList.remove('hidden');
        setTimeout(function () {
            consoleInput.focus();
        }, 100);
    }

    function closeCommandConsole() {
        if (!consoleOverlay || !consoleInput) return;
        consoleOverlay.classList.add('hidden');
        consoleInput.value = '';
    }

    window.openCommandConsole = openCommandConsole;
    window.closeCommandConsole = closeCommandConsole;

    // -------------------------------------------------
    // CHEAT ENGINE
    // -------------------------------------------------
    const cheats = {};

    // Helper to safely get elements & toggle classes
    function safeAddClass(selector, className) {
        const el = document.querySelector(selector);
        if (el) el.classList.add(className);
    }
    function safeRemoveClass(selector, className) {
        const el = document.querySelector(selector);
        if (el) el.classList.remove(className);
    }

    // Lemmings explosion helper
    function lemmingsEgg() {
        const overlay = document.createElement('div');
        overlay.className = 'lemmings-overlay';
        document.body.appendChild(overlay);

        const audio = new Audio(
            'https://raw.githubusercontent.com/joepentony-dot/website-images/main/Lemmings%20Blow.mp3'
        );
        audio.play().catch(() => {});

        let count = 5;
        const countdown = setInterval(function () {
            if (count > 0) {
                overlay.innerText = String(count);
                count--;
            } else {
                clearInterval(countdown);
                overlay.innerText = 'OH NO!';
                overlay.style.color = 'red';

                const boom = document.createElement('div');
                boom.className = 'nuclear-explosion';
                document.body.appendChild(boom);

                document.body.classList.add('poke-effect');
                setTimeout(function () {
                    overlay.remove();
                    boom.remove();
                    document.body.classList.remove('poke-effect');
                }, 1000);
            }
        }, 1000);
    }

    function activateCRTShutdown() {
        const offOverlay = document.createElement('div');
        offOverlay.className = 'tv-off-overlay';
        document.body.appendChild(offOverlay);

        const prevBg = document.body.style.backgroundColor;
        document.body.style.backgroundColor = '#000';

        setTimeout(function () {
            alert(
                'SYSTEM REBOOT INITIALIZED... \nEaster Egg Found: KONAMI CODE'
            );
            offOverlay.remove();
            document.body.style.backgroundColor = prevBg || '';
            resetToSense();
        }, 2000);
    }

    function resetToSense() {
        if (CCG_GLOBAL.currentAudio) {
            CCG_GLOBAL.currentAudio.pause();
            CCG_GLOBAL.currentAudio.currentTime = 0;
        }

        const idsToHide = [
            'emulator-prank-overlay',
            'no-think-so-overlay',
            'zx-menu',
            'secret-modal',
            'guru'
        ];
        idsToHide.forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        const emuFrame = document.getElementById('emulator-frame');
        if (emuFrame) emuFrame.src = '';

        const gameControls = document.getElementById('game-controls');
        const fireBtn = document.getElementById('fire-btn');
        if (gameControls) gameControls.classList.remove('visible');
        if (fireBtn) fireBtn.classList.remove('visible');

        const body = document.body;
        if (CCG_GLOBAL.playClickSound) CCG_GLOBAL.playClickSound();
        body.classList.add('resetting');
        CCG_GLOBAL.zxActive = false;

        document.documentElement.removeAttribute('dir');
        body.classList.remove('arabic-mode');

        const isC64 = body.classList.contains('c64-mode');
        const text = isC64
            ? 'COMMODORE 64 BASIC V2'
            : 'AMIGA WORKBENCH 1.3 LOADED';

        setTimeout(function () {
            body.classList.remove('resetting');
            typeText('typewriter-text', text, 30);
        }, 600);
    }

    window.resetToSense = resetToSense;

    function startEmulatorPrank() {
        const zxMenu = document.getElementById('zx-menu');
        if (zxMenu) zxMenu.style.display = 'none';

        const gameControls = document.getElementById('game-controls');
        const fireBtn = document.getElementById('fire-btn');
        if (gameControls) gameControls.classList.remove('visible');
        if (fireBtn) fireBtn.classList.remove('visible');

        const emuOverlay = document.getElementById('emulator-prank-overlay');
        const emuFrame = document.getElementById('emulator-frame');
        if (!emuOverlay || !emuFrame) return;

        emuOverlay.style.display = 'block';
        emuFrame.src = 'https://jsspeccy.zxdemo.org/';

        setTimeout(function () {
            emuFrame.src = '';
            emuOverlay.style.display = 'none';
            triggerNoThinkSo();
        }, 5000);
    }

    function triggerNoThinkSo() {
        const noOverlay = document.getElementById('no-think-so-overlay');
        if (!noOverlay) return;

        noOverlay.style.display = 'flex';
        CCG_GLOBAL.zxActive = false;

        const audio = new Audio(
            'https://raw.githubusercontent.com/joepentony-dot/website-images/main/no%20i%20dont%20think%20so.mp3'
        );
        CCG_GLOBAL.currentAudio = audio;
        audio.play().catch(() => {});

        const btn = noOverlay.querySelector('.return-btn');
        if (!btn) return;
        setTimeout(function () {
            btn.style.display = 'block';
        }, 3000);
    }

    // ZX related
    function updateZxMenu(zxOptions) {
        zxOptions.forEach(function (opt, idx) {
            if (idx === CCG_GLOBAL.zxIndex) opt.classList.add('selected');
            else opt.classList.remove('selected');
        });
    }

    function simulateKey(keyName, type) {
        const eventType = type === 'down' ? 'keydown' : 'keyup';
        const event = new KeyboardEvent(eventType, {
            key: keyName,
            code: keyName,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    }

    window.simulateKey = simulateKey;

    // ---------------- CHEAT DEFINITIONS ----------------
    function initCheats() {
        const playTone = CCG_GLOBAL.playTone || function () {};
        const playAuthenticLoad = CCG_GLOBAL.playAuthenticLoad || function () {};

        cheats.sys64738 = function () {
            triggerC64Reset();
        };

        cheats.pressplay = function () {
            const d = document.createElement('div');
            d.className = 'press-play-overlay';
            d.innerHTML =
                '<div class="c64-bars"></div>' +
                '<h1 style="color:#fff;margin-top:20px;">PRESS PLAY ON TAPE</h1>' +
                '<div class="c64-bars"></div>';
            document.body.appendChild(d);
            setTimeout(function () {
                d.remove();
            }, 4000);
        };

        cheats.vhs = function () {
            document.body.classList.toggle('vhs-effect');
        };

        cheats.terminator = function () {
            document.body.classList.toggle('terminator-mode');
            playTone(100, 'sawtooth', 0.5);
        };

        cheats.bsod = function () {
            const b = document.createElement('div');
            b.className = 'bsod';
            b.innerHTML =
                '<p>A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) + 00010E36.</p>' +
                '<p>Press any key to continue...</p>';
            document.body.appendChild(b);
            b.onclick = function () {
                b.remove();
            };
        };

        cheats.mario = function () {
            playTone(660, 'square', 0.1);
            setTimeout(function () {
                playTone(1320, 'square', 0.3);
            }, 150);
        };

        cheats.nokia = function () {
            const t = 150;
            playTone(1318, 'square', 0.1);
            setTimeout(function () {
                playTone(1174, 'square', 0.1);
            }, t);
            setTimeout(function () {
                playTone(740, 'square', 0.1);
            }, t * 2);
            setTimeout(function () {
                playTone(830, 'square', 0.2);
            }, t * 3);
        };

        cheats.sonic = function () {
            playTone(1200, 'sine', 0.3);
            setTimeout(function () {
                playTone(1000, 'sine', 0.4);
            }, 300);
        };

        cheats.warp = function () {
            const s = document.getElementById('starfield');
            if (s) {
                s.style.opacity = '1';
            }
            document.body.style.transition = 'transform 5s';
            document.body.style.transform = 'scale(0.1) rotate(360deg)';
            setTimeout(function () {
                document.body.style.transform = 'scale(1) rotate(0deg)';
                if (s) s.style.opacity = '0.4';
            }, 5000);
        };

        cheats.party = function () {
            document.body.classList.toggle('party-mode');
        };

        cheats.pacman = function () {
            const p = document.createElement('i');
            p.className = 'fa-solid fa-ghost pacman-sprite';
            const g = document.createElement('i');
            g.className = 'fa-solid fa-ghost ghost-sprite';
            document.body.appendChild(p);
            document.body.appendChild(g);
            setTimeout(function () {
                p.remove();
                g.remove();
            }, 13000);
        };

        cheats.boing = function () {
            const b = document.createElement('div');
            b.className = 'boing-ball';
            document.body.appendChild(b);
            setTimeout(function () {
                b.remove();
            }, 10000);
        };

        cheats.load = function () {
            const l = document.getElementById('loading-screen');
            if (l) {
                l.style.display = 'flex';
                playTone(1000, 'square', 1.5);
                setTimeout(function () {
                    l.style.display = 'none';
                }, 3000);
            }
        };

        cheats.guru = function () {
            const guru = document.getElementById('guru');
            if (guru) {
                guru.style.display = 'flex';
                playTone(100, 'sawtooth', 1);
            }
        };

        cheats.matrix = function () {
            document.body.classList.toggle('matrix-mode');
            const container = document.querySelector('.container');
            if (container) container.classList.toggle('matrix-mode');
        };

        cheats.invaders = function () {
            const i = document.createElement('i');
            i.className = 'fa-solid fa-robot invader';
            document.body.appendChild(i);
            playTone(150, 'sawtooth', 0.5);
            setTimeout(function () {
                i.remove();
            }, 8500);
        };

        cheats.rainbow = function () {
            document.body.classList.add('rainbow-mode');
            setTimeout(function () {
                document.body.classList.remove('rainbow-mode');
            }, 5000);
        };

        cheats.lemmings = function () {
            lemmingsEgg();
        };

        cheats.zxspectrum = function () {
            const loader = document.getElementById('zx-loading-bars');
            if (!loader) return;
            loader.style.display = 'block';
            playAuthenticLoad();
            setTimeout(function () {
                loader.style.display = 'none';
                CCG_GLOBAL.zxActive = true;
                const zxMenu = document.getElementById('zx-menu');
                if (zxMenu) zxMenu.style.display = 'flex';

                const gameControls = document.getElementById('game-controls');
                const fireBtn = document.getElementById('fire-btn');
                if (gameControls) gameControls.classList.add('visible');
                if (fireBtn) fireBtn.classList.add('visible');
            }, 2500);
        };

        cheats.cheeky = function () {
            window.location.replace('https://gaydar.net/');
        };

        cheats.konamicode = function () {
            playTone(400, 'square', 0.1);
            setTimeout(function () {
                playTone(600, 'square', 0.1);
            }, 150);
            setTimeout(function () {
                playTone(1000, 'square', 0.4);
            }, 300);

            const msg = document.createElement('div');
            msg.className = 'god-mode-msg';
            msg.innerHTML = 'GOD MODE ENABLED<br>30 LIVES ADDED';
            document.body.appendChild(msg);

            setTimeout(function () {
                msg.remove();
                activateCRTShutdown();
            }, 2500);
        };

        // Expose for debugging if needed
        window.CCGEggCheats = cheats;
    }

    function triggerCheat(code) {
        closeSecret();
        const fn = cheats[code.toLowerCase()];
        if (!fn) return;
        fn();
        if (CCG_GLOBAL.playClickSound) CCG_GLOBAL.playClickSound();
        typeText('typewriter-text', 'CHEAT ACTIVATED: ' + code.toUpperCase(), 30);
    }

    window.triggerCheat = triggerCheat;

    function submitConsole() {
        if (!consoleInput) return;
        const rawValue = consoleInput.value;
        const code = rawValue.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        if (cheats[code]) {
            cheats[code]();
            if (CCG_GLOBAL.playClickSound) CCG_GLOBAL.playClickSound();
            closeCommandConsole();
            typeText(
                'typewriter-text',
                'CHEAT ACTIVATED: ' + code.toUpperCase(),
                30
            );
        } else {
            const playTone = CCG_GLOBAL.playTone || function () {};
            playTone(100, 'sawtooth', 0.2);
            consoleInput.classList.add('error');
            consoleInput.value = 'INVALID CODE';
            setTimeout(function () {
                consoleInput.classList.remove('error');
                consoleInput.value = '';
            }, 1500);
        }
    }

    window.submitConsole = submitConsole;

    // -------------------------------------------------
    // GLOBAL KEY LISTENER (CHEAT DETECTION + ZX NAV)
    // -------------------------------------------------
    function initKeyListener(zxOptions) {
        document.addEventListener('keydown', function (e) {
            if (consoleOverlay && !consoleOverlay.classList.contains('hidden')) {
                return; // console active → ignore global keys
            }

            if (CCG_GLOBAL.zxActive && zxOptions.length) {
                if (e.key === 'ArrowUp') {
                    CCG_GLOBAL.zxIndex =
                        (CCG_GLOBAL.zxIndex - 1 + zxOptions.length) %
                        zxOptions.length;
                    updateZxMenu(zxOptions);
                    if (CCG_GLOBAL.playClickSound) CCG_GLOBAL.playClickSound();
                    e.preventDefault();
                    return;
                } else if (e.key === 'ArrowDown') {
                    CCG_GLOBAL.zxIndex =
                        (CCG_GLOBAL.zxIndex + 1) % zxOptions.length;
                    updateZxMenu(zxOptions);
                    if (CCG_GLOBAL.playClickSound) CCG_GLOBAL.playClickSound();
                    e.preventDefault();
                    return;
                } else if (e.key === 'Enter') {
                    if (CCG_GLOBAL.zxIndex === 2) {
                        resetToSense();
                    } else {
                        startEmulatorPrank();
                    }
                    e.preventDefault();
                    return;
                }
            }

            // Cheat typing (only if not in input)
            const targetTag = (e.target && e.target.tagName) || '';
            if (targetTag !== 'INPUT' && targetTag !== 'TEXTAREA') {
                CCG_GLOBAL.keyHistory += e.key.toLowerCase();
                if (CCG_GLOBAL.keyHistory.length > 20) {
                    CCG_GLOBAL.keyHistory =
                        CCG_GLOBAL.keyHistory.slice(-20);
                }
                const cleanHistory =
                    CCG_GLOBAL.keyHistory.replace(/[^a-z0-9]/g, '');
                for (const code in cheats) {
                    if (cleanHistory.endsWith(code)) {
                        cheats[code]();
                        CCG_GLOBAL.keyHistory = '';
                        if (CCG_GLOBAL.playClickSound)
                            CCG_GLOBAL.playClickSound();
                        break;
                    }
                }
            }
        });
    }

    // -------------------------------------------------
    // GURU OVERLAY / WORKBENCH CLOSE
    // -------------------------------------------------
    function initGuruOverlay() {
        const closeBtn = document.querySelector('.close-gadget');
        const guruOverlay = document.getElementById('guru');
        if (!closeBtn || !guruOverlay) return;

        const playTone = CCG_GLOBAL.playTone || function () {};

        closeBtn.addEventListener('click', function () {
            playTone(100, 'sawtooth', 1.5);
            guruOverlay.style.display = 'flex';
        });

        guruOverlay.addEventListener('click', function () {
            resetToSense();
        });
    }

    // -------------------------------------------------
    // ZX MENU CLICK LOGIC
    // -------------------------------------------------
    function initZxMenuClicks(zxOptions) {
        if (!zxOptions.length) return;
        zxOptions.forEach(function (opt, index) {
            opt.addEventListener('click', function () {
                CCG_GLOBAL.zxIndex = index;
                updateZxMenu(zxOptions);
                if (CCG_GLOBAL.zxIndex === 2) {
                    resetToSense();
                } else {
                    startEmulatorPrank();
                }
            });
        });
    }

    // -------------------------------------------------
    // INITIALISATION
    // -------------------------------------------------
    function ready(fn) {
        if (
            document.readyState === 'complete' ||
            document.readyState === 'interactive'
        ) {
            setTimeout(fn, 0);
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    ready(function () {
        const body = document.body;
        CCG_GLOBAL.pageId = body.getAttribute('data-ccg-page') || null;

        // Audio
        initAudio();

        // Mode (load stored preference)
        initModeFromStorage();

        // Secret modal + console elements (if present)
        secretModal = document.getElementById('secret-modal');
        consoleOverlay = document.getElementById('command-console');
        consoleInput = document.getElementById('console-input');

        // Cheats
        initCheats();

        if (consoleInput) {
            consoleInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    submitConsole();
                }
            });
        }

        // ZX menu & options
        const zxOptions = document.querySelectorAll('.zx-option');
        initZxMenuClicks(zxOptions);
        initKeyListener(zxOptions);

        // Guru overlay
        initGuruOverlay();

        // Initial typewriter text (if element present and empty)
        const typeEl = document.getElementById('typewriter-text');
        if (typeEl && !typeEl.textContent.trim()) {
            const defaultText =
                'COMMODORE 64 & AMIGA GAMES DATABASE';
            typeText('typewriter-text', defaultText, 60);
        }
    });
})();
