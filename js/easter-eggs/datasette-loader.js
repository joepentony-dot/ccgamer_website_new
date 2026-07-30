const STYLE_ID = "ccg-easter-egg-datasette-style";

function normaliseRoot(root) {
    const value = String(root || "/");
    return value.endsWith("/") ? value : `${value}/`;
}

function ensureStylesheet(siteRoot) {
    const existing = document.getElementById(STYLE_ID);
    if (existing) {
        if (existing.dataset.loaded === "true" || existing.sheet) return Promise.resolve();
        return new Promise(resolve => existing.addEventListener("load", resolve, { once: true }));
    }

    return new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.id = STYLE_ID;
        link.rel = "stylesheet";
        link.href = `${normaliseRoot(siteRoot)}resources/css/easter-eggs-datasette.css`;
        link.addEventListener("load", () => {
            link.dataset.loaded = "true";
            resolve();
        }, { once: true });
        link.addEventListener("error", reject, { once: true });
        document.head.appendChild(link);
    });
}

function chooseTarget() {
    const lowSide = Math.random() < 0.5;
    return Math.round(lowSide ? 27 + Math.random() * 12 : 61 + Math.random() * 12);
}

function escapeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[character]);
}

function createTapeNoise() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    const context = new AudioContextClass();
    const seconds = 2;
    const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
        data[index] = (Math.random() * 2 - 1) * 0.6;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const hum = context.createOscillator();
    const humGain = context.createGain();

    source.buffer = buffer;
    source.loop = true;
    filter.type = "bandpass";
    filter.frequency.value = 2600;
    filter.Q.value = 0.55;
    gain.gain.value = 0.035;

    hum.type = "square";
    hum.frequency.value = 58;
    humGain.gain.value = 0.012;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    hum.connect(humGain);
    humGain.connect(context.destination);

    source.start();
    hum.start();

    return {
        context,
        source,
        hum,
        gain,
        humGain,
        setQuality(quality, playing) {
            const now = context.currentTime;
            const hiss = playing ? 0.012 + (1 - quality) * 0.075 : 0.004;
            const humLevel = playing ? 0.008 + quality * 0.012 : 0.002;
            gain.gain.setTargetAtTime(hiss, now, 0.06);
            humGain.gain.setTargetAtTime(humLevel, now, 0.08);
            filter.frequency.setTargetAtTime(1400 + quality * 3800, now, 0.08);
        },
        async resume() {
            if (context.state === "suspended") await context.resume();
        },
        stop() {
            try { source.stop(); } catch (error) {}
            try { hum.stop(); } catch (error) {}
            context.close().catch(() => {});
        },
    };
}

async function loadRandomGame(siteRoot) {
    const root = normaliseRoot(siteRoot);
    const response = await fetch(`${root}games/games.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Game catalogue returned ${response.status}`);
    const games = await response.json();
    const candidates = Array.isArray(games)
        ? games.filter(game => game && typeof game.slug === "string" && game.slug.trim() && game.title)
        : [];
    if (!candidates.length) throw new Error("No eligible games found");
    const game = candidates[Math.floor(Math.random() * candidates.length)];
    return {
        title: String(game.title),
        system: String(game.system || "RETRO"),
        year: String(game.year || ""),
        href: `${root}games/${encodeURIComponent(game.slug.trim())}/`,
    };
}

export async function createDatasetteExperience(options = {}) {
    const siteRoot = normaliseRoot(options.siteRoot || "/");
    const reduceMotion = Boolean(options.prefersReducedMotion);
    await ensureStylesheet(siteRoot);

    const content = document.createElement("section");
    content.className = "ccg-datasette";
    content.dataset.ccgDatasetteReady = "true";
    content.dataset.ccgDatasetteState = "idle";
    content.dataset.soundState = "off";
    content.setAttribute("aria-label", "Interactive Commodore 64 datasette loading challenge");
    content.innerHTML = `
        <div class="ccg-datasette__header">
            <div>
                <span class="ccg-datasette__eyebrow">CCG TAPE DECK 1530</span>
                <h2>DATASETTE LOADING SEQUENCE</h2>
            </div>
            <div class="ccg-datasette__counter" aria-label="Tape counter"><span data-datasette-counter>000</span></div>
        </div>

        <div class="ccg-datasette__screen" aria-live="polite">
            <div class="ccg-datasette__screen-copy">
                <span data-datasette-line-one>PRESS PLAY ON TAPE</span>
                <strong data-datasette-line-two>READY.</strong>
            </div>
            <canvas class="ccg-datasette__signal" data-datasette-canvas aria-label="C64 tape loading signal"></canvas>
        </div>

        <div class="ccg-datasette__deck" aria-hidden="true">
            <div class="ccg-datasette__lid">
                <div class="ccg-datasette__cassette">
                    <div class="ccg-datasette__reel" data-datasette-reel-left><span></span></div>
                    <div class="ccg-datasette__tape-window"><span>CCG / SIDE A</span></div>
                    <div class="ccg-datasette__reel" data-datasette-reel-right><span></span></div>
                </div>
            </div>
            <div class="ccg-datasette__brand">COMMODORE DATASETTE</div>
        </div>

        <div class="ccg-datasette__controls" aria-label="Datasette controls">
            <button type="button" class="ccg-btn ccg-btn--primary ccg-datasette__transport" data-datasette-play>PLAY</button>
            <button type="button" class="ccg-btn ccg-btn--ghost ccg-datasette__transport" data-datasette-stop>STOP</button>
            <button type="button" class="ccg-btn ccg-btn--ghost ccg-datasette__transport" data-datasette-rewind>REW</button>
            <button type="button" class="ccg-btn ccg-btn--ghost ccg-datasette__transport" data-datasette-sound aria-pressed="false">SOUND: OFF</button>
        </div>

        <div class="ccg-datasette__tuning">
            <div class="ccg-datasette__tuning-heading">
                <label for="ccg-datasette-azimuth">AZIMUTH</label>
                <output for="ccg-datasette-azimuth" data-datasette-quality>SIGNAL 0%</output>
            </div>
            <input id="ccg-datasette-azimuth" data-datasette-azimuth type="range" min="0" max="100" value="50" step="1" aria-describedby="ccg-datasette-instruction">
            <div class="ccg-datasette__meter" aria-hidden="true"><span data-datasette-meter></span></div>
            <p id="ccg-datasette-instruction" data-datasette-instruction>Press PLAY, then adjust the azimuth until the signal locks.</p>
        </div>

        <div class="ccg-datasette__reward" data-datasette-reward hidden>
            <span class="ccg-datasette__reward-label">TAPE LOADED</span>
            <strong data-datasette-game-title>ARCHIVE GAME FOUND</strong>
            <span data-datasette-game-meta></span>
            <a class="ccg-btn ccg-btn--primary" data-datasette-game-link href="${siteRoot}games/index.html">OPEN RANDOM GAME</a>
            <button type="button" class="ccg-btn ccg-btn--ghost" data-datasette-again>LOAD ANOTHER</button>
        </div>
    `;

    const canvas = content.querySelector("[data-datasette-canvas]");
    const context = canvas.getContext("2d", { alpha: false });
    const slider = content.querySelector("[data-datasette-azimuth]");
    const meter = content.querySelector("[data-datasette-meter]");
    const qualityOutput = content.querySelector("[data-datasette-quality]");
    const instruction = content.querySelector("[data-datasette-instruction]");
    const lineOne = content.querySelector("[data-datasette-line-one]");
    const lineTwo = content.querySelector("[data-datasette-line-two]");
    const counter = content.querySelector("[data-datasette-counter]");
    const playButton = content.querySelector("[data-datasette-play]");
    const stopButton = content.querySelector("[data-datasette-stop]");
    const rewindButton = content.querySelector("[data-datasette-rewind]");
    const soundButton = content.querySelector("[data-datasette-sound]");
    const reward = content.querySelector("[data-datasette-reward]");
    const gameTitle = content.querySelector("[data-datasette-game-title]");
    const gameMeta = content.querySelector("[data-datasette-game-meta]");
    const gameLink = content.querySelector("[data-datasette-game-link]");
    const againButton = content.querySelector("[data-datasette-again]");
    const leftReel = content.querySelector("[data-datasette-reel-left]");
    const rightReel = content.querySelector("[data-datasette-reel-right]");

    let target = chooseTarget();
    let playing = false;
    let complete = false;
    let stableSince = 0;
    let animationFrame = 0;
    let previousTime = performance.now();
    let elapsedTape = 0;
    let reelRotation = 0;
    let audio = null;
    let destroyed = false;
    let rewardPromise = loadRandomGame(siteRoot).catch(() => null);
    const palette = ["#352879", "#6c5eb5", "#68b6bd", "#ffffff", "#813338", "#c46c71", "#8e3c97", "#57a3ce"];

    content.dataset.azimuthTarget = String(target);

    function qualityForValue(value) {
        return Math.max(0, 1 - Math.abs(Number(value) - target) / 34);
    }

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
        }
        return { width, height };
    }

    function drawSignal(now, quality) {
        const { width, height } = resizeCanvas();
        context.fillStyle = "#171052";
        context.fillRect(0, 0, width, height);

        const bandHeight = Math.max(5, height / 18);
        const speed = playing && !reduceMotion ? now * (0.08 + quality * 0.24) : 0;
        for (let row = -2; row < Math.ceil(height / bandHeight) + 2; row += 1) {
            const jitter = playing ? Math.sin(row * 1.7 + now * 0.009) * (1 - quality) * 13 : 0;
            const y = ((row * bandHeight + speed) % (height + bandHeight * 2)) - bandHeight * 2;
            const colourIndex = Math.abs(row + Math.floor(now / 130)) % palette.length;
            context.fillStyle = palette[colourIndex];
            context.fillRect(jitter, y, width, bandHeight + 1);
        }

        if (playing) {
            const noiseCount = Math.round((1 - quality) * 130);
            context.fillStyle = "rgba(255,255,255,0.75)";
            for (let index = 0; index < noiseCount; index += 1) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                context.fillRect(x, y, 1 + Math.random() * 4, 1);
            }
        }

        const vignette = context.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, Math.max(width, height) * 0.7);
        vignette.addColorStop(0, "rgba(0,0,0,0)");
        vignette.addColorStop(1, "rgba(0,0,0,0.42)");
        context.fillStyle = vignette;
        context.fillRect(0, 0, width, height);
    }

    function updateQuality(quality) {
        const percent = Math.round(quality * 100);
        qualityOutput.textContent = `SIGNAL ${percent}%`;
        meter.style.width = `${percent}%`;
        meter.dataset.locked = quality >= 0.92 ? "true" : "false";
        audio?.setQuality(quality, playing);
    }

    function updateScreen(quality) {
        if (complete) return;
        if (!playing) {
            lineOne.textContent = "PRESS PLAY ON TAPE";
            lineTwo.textContent = "READY.";
            instruction.textContent = "Press PLAY, then adjust the azimuth until the signal locks.";
            return;
        }

        lineOne.textContent = quality >= 0.92 ? "FOUND CCG TAPE" : "SEARCHING FOR CCG TAPE";
        lineTwo.textContent = quality >= 0.92 ? "SIGNAL LOCKING..." : "ADJUST AZIMUTH";
        instruction.textContent = quality >= 0.92
            ? "Hold it there. The loader is synchronising."
            : quality >= 0.7
                ? "Nearly there. Make a small adjustment."
                : "Signal unstable. Move the azimuth slider slowly.";
    }

    async function completeLoad() {
        if (complete || destroyed) return;
        complete = true;
        playing = false;
        content.dataset.ccgDatasetteState = "success";
        lineOne.textContent = "FOUND CCG ARCHIVE";
        lineTwo.textContent = "READY.";
        instruction.textContent = "Loading complete. A game has been selected from the archive.";
        meter.style.width = "100%";
        qualityOutput.textContent = "SIGNAL 100%";
        reward.hidden = false;
        audio?.setQuality(1, false);

        const game = await rewardPromise;
        if (destroyed) return;
        if (game) {
            gameTitle.textContent = game.title;
            gameMeta.textContent = [game.system, game.year].filter(Boolean).join(" • ");
            gameLink.href = game.href;
            gameLink.setAttribute("aria-label", `Open ${game.title}`);
        } else {
            gameTitle.textContent = "CCG GAMES ARCHIVE";
            gameMeta.textContent = "Browse all games";
            gameLink.href = `${siteRoot}games/index.html`;
        }
        /* CCG DATASETTE REWARD VISIBILITY */
        requestAnimationFrame(() => {
            if (destroyed) return;
            reward.scrollIntoView({ block: "center", inline: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
            requestAnimationFrame(() => gameLink.focus({ preventScroll: true }));
        });
    }

    function resetExperience() {
        target = chooseTarget();
        content.dataset.azimuthTarget = String(target);
        content.dataset.ccgDatasetteState = "idle";
        playing = false;
        complete = false;
        stableSince = 0;
        elapsedTape = 0;
        slider.value = "50";
        counter.textContent = "000";
        reward.hidden = true;
        rewardPromise = loadRandomGame(siteRoot).catch(() => null);
        updateQuality(qualityForValue(slider.value));
        updateScreen(0);
        playButton.focus({ preventScroll: true });
    }

    function tick(now) {
        if (destroyed) return;
        const delta = Math.min(50, Math.max(0, now - previousTime));
        previousTime = now;
        const quality = qualityForValue(slider.value);

        if (playing && !complete) {
            elapsedTape += delta;
            counter.textContent = String(Math.floor(elapsedTape / 95) % 1000).padStart(3, "0");
            reelRotation = (reelRotation + delta * (0.08 + quality * 0.11)) % 360;
            leftReel.style.transform = `rotate(${reelRotation}deg)`;
            rightReel.style.transform = `rotate(${-reelRotation * 1.08}deg)`;

            if (quality >= 0.92) {
                if (!stableSince) stableSince = now;
                if (now - stableSince >= 1700) completeLoad();
            } else {
                stableSince = 0;
            }
        }

        drawSignal(now, quality);
        updateQuality(quality);
        updateScreen(quality);
        animationFrame = requestAnimationFrame(tick);
    }

    function handlePlay() {
        if (complete) return;
        playing = true;
        content.dataset.ccgDatasetteState = "loading";
        previousTime = performance.now();
        lineTwo.textContent = "SEARCHING";
    }

    function handleStop() {
        playing = false;
        stableSince = 0;
        if (!complete) content.dataset.ccgDatasetteState = "paused";
        updateScreen(qualityForValue(slider.value));
    }

    function handleRewind() {
        playing = false;
        stableSince = 0;
        elapsedTape = 0;
        counter.textContent = "000";
        content.dataset.ccgDatasetteState = complete ? "success" : "idle";
        if (!complete) updateScreen(qualityForValue(slider.value));
    }

    async function handleSound() {
        if (audio) {
            audio.stop();
            audio = null;
            content.dataset.soundState = "off";
            soundButton.textContent = "SOUND: OFF";
            soundButton.setAttribute("aria-pressed", "false");
            return;
        }

        audio = createTapeNoise();
        if (!audio) {
            soundButton.textContent = "SOUND UNAVAILABLE";
            soundButton.disabled = true;
            return;
        }
        await audio.resume();
        content.dataset.soundState = "on";
        soundButton.textContent = "SOUND: ON";
        soundButton.setAttribute("aria-pressed", "true");
        audio.setQuality(qualityForValue(slider.value), playing);
    }

    const onSliderInput = () => {
        stableSince = 0;
        const quality = qualityForValue(slider.value);
        updateQuality(quality);
        updateScreen(quality);
        drawSignal(performance.now(), quality);
    };

    playButton.addEventListener("click", handlePlay);
    stopButton.addEventListener("click", handleStop);
    rewindButton.addEventListener("click", handleRewind);
    soundButton.addEventListener("click", handleSound);
    slider.addEventListener("input", onSliderInput);
    againButton.addEventListener("click", resetExperience);

    const resizeObserver = typeof ResizeObserver === "function"
        ? new ResizeObserver(() => drawSignal(performance.now(), qualityForValue(slider.value)))
        : null;
    resizeObserver?.observe(canvas);

    drawSignal(performance.now(), qualityForValue(slider.value));
    updateQuality(qualityForValue(slider.value));
    animationFrame = requestAnimationFrame(tick);

    return {
        content,
        focus() {
            playButton.focus({ preventScroll: true });
        },
        cleanup() {
            destroyed = true;
            if (animationFrame) cancelAnimationFrame(animationFrame);
            resizeObserver?.disconnect();
            audio?.stop();
            playButton.removeEventListener("click", handlePlay);
            stopButton.removeEventListener("click", handleStop);
            rewindButton.removeEventListener("click", handleRewind);
            soundButton.removeEventListener("click", handleSound);
            slider.removeEventListener("input", onSliderInput);
            againButton.removeEventListener("click", resetExperience);
        },
    };
}
