(() => {
    "use strict";

    const canvas = document.querySelector("[data-canvas]");
    const context = canvas?.getContext("2d");
    const scoreNode = document.querySelector("[data-score]");
    const livesNode = document.querySelector("[data-lives]");
    const message = document.querySelector("[data-message]");
    const startButton = document.querySelector("[data-start]");
    const pauseButton = document.querySelector("[data-pause]");
    const restartButton = document.querySelector("[data-restart]");
    const soundButton = document.querySelector("[data-sound]");
    const root = document.querySelector(".ccg-invaders");

    if (!canvas || !context || !scoreNode || !livesNode || !message || !startButton || !pauseButton || !restartButton || !soundButton || !root) {
        document.documentElement.setAttribute("data-ccg-invaders-ready", "error");
        return;
    }

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const keys = new Set();
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

    let animationFrame = 0;
    let lastTime = performance.now();
    let running = false;
    let paused = false;
    let soundEnabled = true;
    let score = 0;
    let lives = 3;
    let level = 1;
    let fireCooldown = 0;
    let enemyFireCooldown = 0;
    let formationDirection = 1;
    let audioContext = null;
    let player = null;
    let bullets = [];
    let enemyBullets = [];
    let enemies = [];
    let shields = [];
    let stars = [];

    function focusGame() {
        try {
            window.focus();
            if (!document.body.hasAttribute("tabindex")) document.body.tabIndex = -1;
            document.body.focus({ preventScroll: true });
        } catch (_) {}
    }

    function tone(frequency, duration = 0.06, type = "square", volume = 0.035) {
        if (!soundEnabled) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        audioContext ||= new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    }

    function createEnemies() {
        const result = [];
        for (let row = 0; row < 5; row += 1) {
            for (let column = 0; column < 10; column += 1) {
                result.push({
                    x: 96 + column * 55,
                    y: 92 + row * 46,
                    width: 30,
                    height: 22,
                    alive: true,
                    row,
                });
            }
        }
        return result;
    }

    function createShields() {
        return [150, 310, 470].map(x => ({ x, y: 610, width: 90, height: 34, health: 12 }));
    }

    function updateHud() {
        scoreNode.textContent = String(score).padStart(6, "0");
        livesNode.textContent = String(lives);
    }

    function resetGame() {
        score = 0;
        lives = 3;
        level = 1;
        player = { x: WIDTH / 2 - 24, y: 690, width: 48, height: 24, speed: 330 };
        bullets = [];
        enemyBullets = [];
        enemies = createEnemies();
        shields = createShields();
        formationDirection = 1;
        fireCooldown = 0;
        enemyFireCooldown = 0.8;
        updateHud();
    }

    function startGame() {
        if (!player || lives <= 0) resetGame();
        running = true;
        paused = false;
        message.hidden = true;
        pauseButton.textContent = "PAUSE";
        audioContext?.resume?.();
        lastTime = performance.now();
        focusGame();
    }

    function showMessage(title, detail, buttonLabel = "PLAY AGAIN") {
        message.querySelector("strong").textContent = title;
        message.querySelector("span").textContent = detail;
        startButton.textContent = buttonLabel;
        message.hidden = false;
    }

    function restartGame() {
        resetGame();
        startGame();
    }

    function togglePause() {
        if (!running) return;
        paused = !paused;
        pauseButton.textContent = paused ? "RESUME" : "PAUSE";
        if (paused) {
            showMessage("GAME PAUSED", "PRESS RESUME OR P TO CONTINUE", "RESUME");
        } else {
            message.hidden = true;
            lastTime = performance.now();
            focusGame();
        }
    }

    function ensureStarted() {
        if (!running) startGame();
        else if (paused) togglePause();
    }

    function fire() {
        ensureStarted();
        if (paused || fireCooldown > 0 || !player) return;
        bullets.push({ x: player.x + player.width / 2 - 2, y: player.y - 12, width: 4, height: 14, speed: 560 });
        fireCooldown = 0.28;
        tone(620, 0.05);
    }

    function rectsOverlap(a, b) {
        return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    }

    function hitPlayer() {
        lives -= 1;
        updateHud();
        tone(90, 0.35, "sawtooth", 0.06);
        enemyBullets = [];
        if (player) player.x = WIDTH / 2 - player.width / 2;
        if (lives <= 0) {
            running = false;
            showMessage("GAME OVER", `FINAL SCORE ${String(score).padStart(6, "0")}`, "PLAY AGAIN");
        }
    }

    function nextLevel() {
        level += 1;
        enemies = createEnemies();
        shields = createShields();
        formationDirection = 1;
        enemyBullets = [];
        if (player) player.x = WIDTH / 2 - player.width / 2;
        tone(880, 0.14, "square", 0.05);
    }

    function update(delta) {
        if (!player) return;
        if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) player.x -= player.speed * delta;
        if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) player.x += player.speed * delta;
        player.x = Math.max(8, Math.min(WIDTH - player.width - 8, player.x));

        fireCooldown = Math.max(0, fireCooldown - delta);
        enemyFireCooldown -= delta;
        bullets.forEach(bullet => { bullet.y -= bullet.speed * delta; });
        enemyBullets.forEach(bullet => { bullet.y += bullet.speed * delta; });
        bullets = bullets.filter(bullet => bullet.y + bullet.height > 0);
        enemyBullets = enemyBullets.filter(bullet => bullet.y < HEIGHT + 20);

        const living = enemies.filter(enemy => enemy.alive);
        const speed = (20 + level * 5) + (50 - living.length) * 1.8;
        let edgeHit = false;
        living.forEach(enemy => {
            enemy.x += formationDirection * speed * delta;
            if (enemy.x < 14 || enemy.x + enemy.width > WIDTH - 14) edgeHit = true;
        });
        if (edgeHit) {
            formationDirection *= -1;
            living.forEach(enemy => {
                enemy.x = Math.max(14, Math.min(WIDTH - enemy.width - 14, enemy.x));
                enemy.y += 20;
            });
            tone(120, 0.035, "square", 0.018);
        }

        if (enemyFireCooldown <= 0 && living.length) {
            const shooter = living[Math.floor(Math.random() * living.length)];
            enemyBullets.push({ x: shooter.x + shooter.width / 2 - 2, y: shooter.y + shooter.height, width: 4, height: 14, speed: 230 + level * 16 });
            enemyFireCooldown = Math.max(0.28, 0.9 - level * 0.06) + Math.random() * 0.55;
        }

        for (const bullet of bullets) {
            for (const enemy of living) {
                if (enemy.alive && rectsOverlap(bullet, enemy)) {
                    enemy.alive = false;
                    bullet.y = -100;
                    score += (5 - enemy.row) * 10;
                    updateHud();
                    tone(210 + enemy.row * 35, 0.07, "square", 0.03);
                    break;
                }
            }
        }

        for (const shield of shields) {
            if (shield.health <= 0) continue;
            for (const bullet of bullets) {
                if (rectsOverlap(bullet, shield)) {
                    shield.health -= 1;
                    bullet.y = -100;
                }
            }
            for (const bullet of enemyBullets) {
                if (rectsOverlap(bullet, shield)) {
                    shield.health -= 1;
                    bullet.y = HEIGHT + 100;
                }
            }
        }

        for (const bullet of enemyBullets) {
            if (rectsOverlap(bullet, player)) {
                bullet.y = HEIGHT + 100;
                hitPlayer();
                break;
            }
        }

        if (living.some(enemy => enemy.y + enemy.height >= player.y - 16)) {
            lives = 1;
            hitPlayer();
        }
        if (enemies.every(enemy => !enemy.alive)) nextLevel();
    }

    function drawShip(x, y, width, height, colour = "#8cff9f") {
        context.fillStyle = colour;
        context.fillRect(x + width * 0.42, y, width * 0.16, height * 0.25);
        context.fillRect(x + width * 0.25, y + height * 0.25, width * 0.5, height * 0.3);
        context.fillRect(x, y + height * 0.55, width, height * 0.45);
    }

    function drawEnemy(enemy) {
        const pulse = reducedMotion ? 0 : Math.floor(performance.now() / 280) % 2;
        context.fillStyle = enemy.row < 2 ? "#e5ff76" : "#74ff96";
        context.fillRect(enemy.x + 5, enemy.y, enemy.width - 10, 4);
        context.fillRect(enemy.x, enemy.y + 5, enemy.width, 10);
        context.fillRect(enemy.x + 5, enemy.y + 15, 6, 7);
        context.fillRect(enemy.x + enemy.width - 11, enemy.y + 15, 6, 7);
        context.fillStyle = "#000";
        context.fillRect(enemy.x + 7 + pulse, enemy.y + 8, 4, 4);
        context.fillRect(enemy.x + enemy.width - 11 - pulse, enemy.y + 8, 4, 4);
    }

    function draw() {
        context.fillStyle = "#000";
        context.fillRect(0, 0, WIDTH, HEIGHT);
        context.fillStyle = "rgba(110,255,145,0.42)";
        stars.forEach(star => context.fillRect(star.x, star.y, star.size, star.size));
        enemies.forEach(enemy => { if (enemy.alive) drawEnemy(enemy); });
        shields.forEach(shield => {
            if (shield.health <= 0) return;
            context.globalAlpha = 0.35 + shield.health / 18;
            context.fillStyle = "#63ff8b";
            context.fillRect(shield.x, shield.y, shield.width, shield.height);
            context.clearRect(shield.x + shield.width * 0.38, shield.y + shield.height * 0.55, shield.width * 0.24, shield.height * 0.45);
            context.globalAlpha = 1;
        });
        context.fillStyle = "#f6ff88";
        bullets.forEach(bullet => context.fillRect(bullet.x, bullet.y, bullet.width, bullet.height));
        context.fillStyle = "#ff7070";
        enemyBullets.forEach(bullet => context.fillRect(bullet.x, bullet.y, bullet.width, bullet.height));
        if (player) drawShip(player.x, player.y, player.width, player.height);
        context.strokeStyle = "#5dff84";
        context.beginPath();
        context.moveTo(0, 735);
        context.lineTo(WIDTH, 735);
        context.stroke();
    }

    function frame(now) {
        const delta = Math.min(0.033, Math.max(0, (now - lastTime) / 1000));
        lastTime = now;
        if (running && !paused) update(delta);
        draw();
        animationFrame = requestAnimationFrame(frame);
    }

    function normaliseKey(event) {
        if (event.key === "Spacebar") return " ";
        return event.key;
    }

    function handleKeyDown(event) {
        const key = normaliseKey(event);
        if (["ArrowLeft", "ArrowRight", " ", "a", "A", "d", "D", "p", "P", "r", "R"].includes(key)) event.preventDefault();
        if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D"].includes(key)) {
            ensureStarted();
            keys.add(key);
        }
        if (key === " ") fire();
        if ((key === "p" || key === "P") && !event.repeat) togglePause();
        if ((key === "r" || key === "R") && !event.repeat) restartGame();
    }

    function handleKeyUp(event) {
        keys.delete(normaliseKey(event));
    }

    function bindHoldControl(button, control) {
        const press = event => {
            event.preventDefault();
            focusGame();
            ensureStarted();
            button.setPointerCapture?.(event.pointerId);
            if (control === "fire") fire();
            else keys.add(control === "left" ? "ArrowLeft" : "ArrowRight");
        };
        const release = event => {
            event.preventDefault();
            if (control !== "fire") keys.delete(control === "left" ? "ArrowLeft" : "ArrowRight");
        };
        button.addEventListener("pointerdown", press, { passive: false });
        button.addEventListener("pointerup", release, { passive: false });
        button.addEventListener("pointercancel", release, { passive: false });
        button.addEventListener("pointerleave", release, { passive: false });
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    window.addEventListener("message", event => {
        if (!event.data || event.data.type !== "ccg-invaders-key") return;
        handleKeyDown({
            key: event.data.key,
            repeat: false,
            preventDefault() {},
        });
    });
    window.addEventListener("blur", () => keys.clear());

    root.addEventListener("pointerdown", focusGame, { passive: true });
    canvas.addEventListener("pointerdown", event => {
        event.preventDefault();
        focusGame();
        ensureStarted();
    }, { passive: false });

    startButton.addEventListener("click", () => paused ? togglePause() : startGame());
    pauseButton.addEventListener("click", togglePause);
    restartButton.addEventListener("click", restartGame);
    soundButton.addEventListener("click", () => {
        soundEnabled = !soundEnabled;
        soundButton.textContent = soundEnabled ? "SOUND ON" : "SOUND OFF";
        soundButton.setAttribute("aria-pressed", String(soundEnabled));
        focusGame();
    });

    document.querySelectorAll("[data-control]").forEach(button => bindHoldControl(button, button.dataset.control));

    stars = Array.from({ length: reducedMotion ? 35 : 80 }, () => ({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        size: Math.random() > 0.82 ? 2 : 1,
    }));

    resetGame();
    draw();
    document.documentElement.setAttribute("data-ccg-invaders-ready", "ready");
    animationFrame = requestAnimationFrame(frame);
    window.setTimeout(focusGame, 80);
    window.addEventListener("pagehide", () => cancelAnimationFrame(animationFrame), { once: true });
})();
