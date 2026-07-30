(() => {
    "use strict";

    const root = document.querySelector("[data-ccg-pacman]");
    const canvas = root?.querySelector("canvas");
    if (!root || !canvas) return;

    const ctx = canvas.getContext("2d");
    const scoreEl = root.querySelector("[data-score]");
    const livesEl = root.querySelector("[data-lives]");
    const message = root.querySelector("[data-message]");
    const pauseButton = root.querySelector('[data-action="pause"]');
    const soundButton = root.querySelector('[data-action="sound"]');

    const TILE = 20;
    const COLS = 19;
    const ROWS = 22;
    const SPEED = 2;
    const GHOST_COLOURS = ["#ff3d4d", "#ff9bd8", "#31d9ff", "#ff9f2e"];
    const DIRECTIONS = {
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 }
    };

    const MAP = [
        "###################",
        "#........#........#",
        "#.###.##.#.##.###.#",
        "#o###.##.#.##.###o#",
        "#.................#",
        "#.###.#.#####.#.###",
        "#.....#...#...#...#",
        "#####.### # ###.###",
        "    #.#       #.#  ",
        "#####.# ##=## #.###",
        "     .  #   #  .   ",
        "#####.# ##### #.###",
        "    #.#       #.#  ",
        "#####.# ##### #.###",
        "#........#........#",
        "#.###.##.#.##.###.#",
        "#o..#.... ....#..o#",
        "###.#.#.#####.#.###",
        "#.....#...#...#...#",
        "#.#######.#.#######",
        "#.................#",
        "###################"
    ];

    let grid;
    let player;
    let ghosts;
    let score;
    let lives;
    let level;
    let started;
    let paused;
    let soundOn = true;
    let frightenedUntil;
    let lastFrame;
    let accumulator;
    let audioContext;

    function cloneMap() {
        return MAP.map(row => row.padEnd(COLS, " ").slice(0, COLS).split(""));
    }

    function tileCentre(col, row) {
        return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
    }

    function createActor(col, row, direction, colour = "#ffe900") {
        const pos = tileCentre(col, row);
        return { ...pos, col, row, direction, queued: direction, colour, radius: TILE * 0.42 };
    }

    function resetActors() {
        player = createActor(9, 16, "left");
        ghosts = [
            createActor(9, 10, "left", GHOST_COLOURS[0]),
            createActor(8, 10, "up", GHOST_COLOURS[1]),
            createActor(10, 10, "right", GHOST_COLOURS[2]),
            createActor(9, 9, "down", GHOST_COLOURS[3])
        ];
        frightenedUntil = 0;
    }

    function resetGame() {
        grid = cloneMap();
        score = 0;
        lives = 3;
        level = 1;
        started = false;
        paused = false;
        accumulator = 0;
        lastFrame = performance.now();
        resetActors();
        updateHud();
        showMessage("READY!", "Press an arrow key or tap a direction to begin.");
    }

    function remainingDots() {
        return grid.reduce((count, row) => count + row.filter(cell => cell === "." || cell === "o").length, 0);
    }

    function isWall(col, row) {
        if (row < 0 || row >= ROWS) return true;
        if (col < 0 || col >= COLS) return false;
        return grid[row][col] === "#" || grid[row][col] === "=";
    }

    function canMove(actor, direction) {
        const dir = DIRECTIONS[direction];
        return !isWall(actor.col + dir.x, actor.row + dir.y);
    }

    function snapActor(actor) {
        const centre = tileCentre(actor.col, actor.row);
        actor.x = centre.x;
        actor.y = centre.y;
    }

    function updateTile(actor) {
        actor.col = Math.floor(actor.x / TILE);
        actor.row = Math.floor(actor.y / TILE);
        if (actor.col < 0) {
            actor.col = COLS - 1;
            actor.x = canvas.width - 1;
        } else if (actor.col >= COLS) {
            actor.col = 0;
            actor.x = 1;
        }
    }

    function closeToCentre(actor) {
        const centre = tileCentre(actor.col, actor.row);
        return Math.abs(actor.x - centre.x) <= SPEED && Math.abs(actor.y - centre.y) <= SPEED;
    }

    function moveActor(actor, speed = SPEED) {
        updateTile(actor);
        if (closeToCentre(actor)) {
            snapActor(actor);
            if (actor.queued && canMove(actor, actor.queued)) actor.direction = actor.queued;
            if (!canMove(actor, actor.direction)) return;
        }
        const dir = DIRECTIONS[actor.direction];
        actor.x += dir.x * speed;
        actor.y += dir.y * speed;
        updateTile(actor);
    }

    function chooseGhostDirection(ghost) {
        if (!closeToCentre(ghost)) return;
        snapActor(ghost);
        const opposite = {
            left: "right",
            right: "left",
            up: "down",
            down: "up"
        }[ghost.direction];
        const choices = Object.keys(DIRECTIONS).filter(direction => direction !== opposite && canMove(ghost, direction));
        if (!choices.length && canMove(ghost, opposite)) choices.push(opposite);
        if (!choices.length) return;

        const frightened = performance.now() < frightenedUntil;
        if (frightened) {
            ghost.queued = choices[Math.floor(Math.random() * choices.length)];
            return;
        }

        choices.sort((a, b) => {
            const da = DIRECTIONS[a];
            const db = DIRECTIONS[b];
            const ax = ghost.col + da.x - player.col;
            const ay = ghost.row + da.y - player.row;
            const bx = ghost.col + db.x - player.col;
            const by = ghost.row + db.y - player.row;
            return (ax * ax + ay * ay) - (bx * bx + by * by);
        });
        ghost.queued = Math.random() < 0.72 ? choices[0] : choices[Math.floor(Math.random() * choices.length)];
    }

    function eatDot() {
        const cell = grid[player.row]?.[player.col];
        if (cell === ".") {
            grid[player.row][player.col] = " ";
            score += 10;
            beep(540, 0.025);
        } else if (cell === "o") {
            grid[player.row][player.col] = " ";
            score += 50;
            frightenedUntil = performance.now() + 7000;
            beep(220, 0.08);
        }
        updateHud();

        if (remainingDots() === 0) {
            level += 1;
            grid = cloneMap();
            resetActors();
            paused = true;
            showMessage(`LEVEL ${level}`, "Maze cleared. Press a direction to continue.");
        }
    }

    function handleCollisions() {
        for (const ghost of ghosts) {
            const dx = ghost.x - player.x;
            const dy = ghost.y - player.y;
            if (dx * dx + dy * dy > TILE * TILE * 0.55) continue;

            if (performance.now() < frightenedUntil) {
                score += 200;
                Object.assign(ghost, createActor(9, 10, "left", ghost.colour));
                beep(880, 0.08);
                updateHud();
            } else {
                lives -= 1;
                updateHud();
                beep(100, 0.2);
                if (lives <= 0) {
                    started = false;
                    paused = true;
                    showMessage("GAME OVER", `Score ${score}. Press Restart or R to play again.`);
                } else {
                    resetActors();
                    paused = true;
                    showMessage("READY!", `${lives} lives remaining. Press a direction to continue.`);
                }
                return;
            }
        }
    }

    function update() {
        if (!started || paused) return;
        moveActor(player, SPEED + Math.min(level - 1, 3) * 0.12);
        eatDot();
        ghosts.forEach((ghost, index) => {
            chooseGhostDirection(ghost);
            const frightened = performance.now() < frightenedUntil;
            const ghostSpeed = frightened ? 1.15 : 1.45 + Math.min(level - 1, 4) * 0.1 + index * 0.02;
            moveActor(ghost, ghostSpeed);
        });
        handleCollisions();
    }

    function drawMaze() {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let row = 0; row < ROWS; row += 1) {
            for (let col = 0; col < COLS; col += 1) {
                const cell = grid[row][col];
                const x = col * TILE;
                const y = row * TILE;
                if (cell === "#") {
                    ctx.strokeStyle = "#194dff";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
                } else if (cell === "=") {
                    ctx.strokeStyle = "#ff66c4";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x + 2, y + TILE / 2);
                    ctx.lineTo(x + TILE - 2, y + TILE / 2);
                    ctx.stroke();
                } else if (cell === "." || cell === "o") {
                    ctx.fillStyle = "#ffd7b0";
                    ctx.beginPath();
                    ctx.arc(x + TILE / 2, y + TILE / 2, cell === "o" ? 5 : 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    function drawPlayer() {
        const dirAngles = {
            right: 0,
            down: Math.PI / 2,
            left: Math.PI,
            up: -Math.PI / 2
        };
        const mouth = 0.18 + Math.abs(Math.sin(performance.now() / 85)) * 0.22;
        const angle = dirAngles[player.direction];
        ctx.fillStyle = "#ffe900";
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.arc(player.x, player.y, player.radius, angle + mouth, angle + Math.PI * 2 - mouth);
        ctx.closePath();
        ctx.fill();
    }

    function drawGhost(ghost) {
        const frightened = performance.now() < frightenedUntil;
        ctx.fillStyle = frightened ? "#204dff" : ghost.colour;
        ctx.beginPath();
        ctx.arc(ghost.x, ghost.y - 2, ghost.radius, Math.PI, 0);
        ctx.lineTo(ghost.x + ghost.radius, ghost.y + ghost.radius);
        ctx.lineTo(ghost.x + ghost.radius / 2, ghost.y + ghost.radius * 0.7);
        ctx.lineTo(ghost.x, ghost.y + ghost.radius);
        ctx.lineTo(ghost.x - ghost.radius / 2, ghost.y + ghost.radius * 0.7);
        ctx.lineTo(ghost.x - ghost.radius, ghost.y + ghost.radius);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(ghost.x - 4, ghost.y - 3, 3, 0, Math.PI * 2);
        ctx.arc(ghost.x + 4, ghost.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    function draw() {
        drawMaze();
        drawPlayer();
        ghosts.forEach(drawGhost);
    }

    function frame(now) {
        const delta = Math.min(50, now - lastFrame);
        lastFrame = now;
        accumulator += delta;
        while (accumulator >= 1000 / 60) {
            update();
            accumulator -= 1000 / 60;
        }
        draw();
        requestAnimationFrame(frame);
    }

    function setDirection(direction) {
        if (!DIRECTIONS[direction]) return;
        player.queued = direction;
        if (!started) started = true;
        paused = false;
        hideMessage();
        pauseButton.textContent = "Pause";
    }

    function togglePause() {
        if (!started) return;
        paused = !paused;
        pauseButton.textContent = paused ? "Resume" : "Pause";
        if (paused) showMessage("PAUSED", "Press P, Resume or a direction to continue.");
        else hideMessage();
    }

    function updateHud() {
        scoreEl.textContent = String(score).padStart(5, "0");
        livesEl.textContent = String(lives);
    }

    function showMessage(title, text) {
        message.querySelector("strong").textContent = title;
        message.querySelector("span").textContent = text;
        message.hidden = false;
    }

    function hideMessage() {
        message.hidden = true;
    }

    function beep(frequency, duration) {
        if (!soundOn) return;
        try {
            audioContext ||= new AudioContext();
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0.04, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
            oscillator.connect(gain).connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + duration);
        } catch (_) {}
    }

    document.addEventListener("keydown", event => {
        const keyMap = {
            ArrowLeft: "left",
            ArrowRight: "right",
            ArrowUp: "up",
            ArrowDown: "down"
        };
        if (keyMap[event.key]) {
            event.preventDefault();
            setDirection(keyMap[event.key]);
        } else if (event.key.toLowerCase() === "p") {
            event.preventDefault();
            togglePause();
        } else if (event.key.toLowerCase() === "r") {
            event.preventDefault();
            resetGame();
        } else if (event.key.toLowerCase() === "m") {
            event.preventDefault();
            soundButton.click();
        }
    });

    root.querySelectorAll("[data-direction]").forEach(button => {
        const direction = button.dataset.direction;
        ["pointerdown", "click"].forEach(type => button.addEventListener(type, event => {
            event.preventDefault();
            setDirection(direction);
        }));
    });

    root.querySelector('[data-action="pause"]').addEventListener("click", togglePause);
    root.querySelector('[data-action="restart"]').addEventListener("click", resetGame);
    soundButton.addEventListener("click", () => {
        soundOn = !soundOn;
        soundButton.textContent = `Sound: ${soundOn ? "On" : "Off"}`;
        soundButton.setAttribute("aria-pressed", String(soundOn));
    });

    resetGame();
    requestAnimationFrame(frame);
})();
