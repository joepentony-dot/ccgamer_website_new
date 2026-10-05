import { audioContext, cleanupBag, noiseBurst, safeCloseAudio, tone } from "./common.js";

export function createExperience({ prefersReducedMotion = false } = {}) {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--cracktro";
    root.innerHTML =
        '<canvas data-cracktro-canvas class="ccg-e11__cracktro-canvas" width="1280" height="720" aria-label="Animated demoscene backdrop"></canvas>' +
        '<div class="ccg-e11__cracktro-hud"><span>CCG // DEMO NODE 1985</span><span data-demo-frame>FRAME 000000</span><span data-demo-fx>COPPER + STARFIELD</span></div>' +
        '<div class="ccg-e11__cracktro-logo"><b>CHEEKY</b><span>COMMODORE GAMER</span><small>CRACKTRO DIVISION</small></div>' +
        '<div class="ccg-e11__cracktro-greets">GREETINGS TO <b>REAL HARDWARE</b> · <b>EMULATORS</b> · <b>CRT OWNERS</b> · <b>JOYSTICK SURVIVORS</b></div>' +
        '<div class="ccg-e11__cracktro-scroller"><span>*** CCG DEMOSCENE TRANSMISSION *** ORIGINAL BROWSER DEMO ONLINE *** GREETINGS TO EVERYONE STILL DIGGING THROUGH OLD DISKS, TAPES, MAGAZINES AND BOXES IN THE LOFT *** THE BBS KNOWS MORE THAN IT ADMITS *** 1541 SAYS 00, OK,00,00 *** KEEP SCROLLING, KEEP PLAYING, KEEP IT CHEEKY ***</span></div>' +
        '<div class="ccg-e11__cracktro-controls">' +
            '<button class="ccg-e11-btn" type="button" data-cracktro-sound>SOUND: OFF</button>' +
            '<button class="ccg-e11-btn" type="button" data-cracktro-effect>FX: COPPER</button>' +
            '<button class="ccg-e11-btn" type="button" data-cracktro-pause>PAUSE</button>' +
        '</div>';

    const canvas = root.querySelector("[data-cracktro-canvas]");
    const context = canvas.getContext("2d");
    const cleanup = cleanupBag();
    const frameDisplay = root.querySelector("[data-demo-frame]");
    const fxDisplay = root.querySelector("[data-demo-fx]");
    const stars = Array.from({ length: 180 }, () => ({
        x: (Math.random() - 0.5) * 1280,
        y: (Math.random() - 0.5) * 720,
        z: 120 + Math.random() * 880,
        pz: 1000,
    }));
    const particles = Array.from({ length: 42 }, (_, index) => ({
        angle: index / 42 * Math.PI * 2,
        radius: 120 + (index % 7) * 24,
        speed: 0.15 + (index % 5) * 0.025,
    }));
    let frame = 0;
    let frameCount = 0;
    let paused = false;
    let sound = false;
    let audio = null;
    let musicTimer = 0;
    let time = 0;
    let effect = 0;

    const effects = ["COPPER", "PLASMA", "VECTOR"];

    const drawCopper = () => {
        for (let y = 0; y < 720; y += 7) {
            const phase = time * 2.2 + y * 0.026;
            const hue = (210 + Math.sin(phase) * 80 + y * 0.12) % 360;
            const alpha = 0.08 + 0.07 * (Math.sin(phase * 0.7) + 1) / 2;
            context.fillStyle = "hsla(" + hue + ",95%,55%," + alpha + ")";
            context.fillRect(0, y, 1280, 4);
        }
    };

    const drawPlasma = () => {
        const size = 28;
        for (let y = 0; y < 720; y += size) {
            for (let x = 0; x < 1280; x += size) {
                const value = Math.sin(x * 0.012 + time * 1.8) + Math.sin(y * 0.018 - time * 1.3) + Math.sin((x + y) * 0.008 + time);
                const hue = 220 + value * 38;
                context.fillStyle = "hsla(" + hue + ",90%,52%,.12)";
                context.fillRect(x, y, size + 1, size + 1);
            }
        }
    };

    const drawVector = () => {
        context.save();
        context.translate(640, 350);
        context.rotate(time * 0.18);
        context.strokeStyle = "rgba(124,205,255,.22)";
        context.lineWidth = 2;
        for (let ring = 0; ring < 9; ring += 1) {
            const radius = 80 + ring * 34 + Math.sin(time * 2 + ring) * 12;
            context.beginPath();
            for (let point = 0; point <= 6; point += 1) {
                const angle = point / 6 * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius * 0.55;
                if (!point) context.moveTo(x, y);
                else context.lineTo(x, y);
            }
            context.stroke();
        }
        context.restore();
    };

    const drawStarfield = () => {
        context.save();
        context.translate(640, 360);
        stars.forEach(star => {
            if (!paused) {
                star.pz = star.z;
                star.z -= 6.4;
                if (star.z < 8) {
                    star.x = (Math.random() - 0.5) * 1280;
                    star.y = (Math.random() - 0.5) * 720;
                    star.z = 1000;
                    star.pz = 1000;
                }
            }
            const sx = star.x / star.z * 430;
            const sy = star.y / star.z * 430;
            const px = star.x / star.pz * 430;
            const py = star.y / star.pz * 430;
            const brightness = Math.max(0.18, 1 - star.z / 1000);
            context.strokeStyle = "rgba(255,255,255," + brightness + ")";
            context.lineWidth = 1 + brightness * 2.2;
            context.beginPath();
            context.moveTo(px, py);
            context.lineTo(sx, sy);
            context.stroke();
        });
        context.restore();
    };

    const drawOrbit = () => {
        context.save();
        context.translate(640, 360);
        particles.forEach((particle, index) => {
            const angle = particle.angle + time * particle.speed;
            const wobble = Math.sin(time * 1.8 + index) * 18;
            const x = Math.cos(angle) * (particle.radius + wobble);
            const y = Math.sin(angle) * (particle.radius * 0.46);
            const size = 1.4 + (index % 4) * 0.7;
            context.fillStyle = index % 2 ? "rgba(120,188,255,.6)" : "rgba(228,92,255,.55)";
            context.fillRect(x, y, size, size);
        });
        context.restore();
    };

    const draw = () => {
        if (!context) return;
        if (!paused) {
            time += 0.016;
            frameCount += 1;
        }
        context.fillStyle = "#02020a";
        context.fillRect(0, 0, 1280, 720);
        if (effect === 0) drawCopper();
        if (effect === 1) drawPlasma();
        if (effect === 2) drawVector();
        drawStarfield();
        drawOrbit();

        context.strokeStyle = "rgba(255,255,255,.035)";
        context.lineWidth = 1;
        for (let y = 0; y < 720; y += 4) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(1280, y);
            context.stroke();
        }

        frameDisplay.textContent = "FRAME " + String(frameCount).padStart(6, "0");
        if (!prefersReducedMotion) frame = requestAnimationFrame(draw);
    };
    draw();

    const stopMusic = () => {
        clearInterval(musicTimer);
        musicTimer = 0;
    };

    const startMusic = () => {
        stopMusic();
        audio ||= audioContext();
        if (!audio) return;
        if (audio.state === "suspended") audio.resume().catch(() => {});
        let step = 0;
        const lead = [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 349.23];
        const bass = [65.41, 65.41, 82.41, 98, 73.42, 73.42, 87.31, 98];
        musicTimer = setInterval(() => {
            if (!sound || paused) return;
            const index = step++ % lead.length;
            tone(audio, lead[index], 0.105, index % 3 === 0 ? "square" : "sawtooth", 0.009);
            tone(audio, bass[index], 0.16, "triangle", 0.018, 0.012);
            if (index % 4 === 0) {
                tone(audio, lead[index] * 2, 0.045, "square", 0.004, 0.055);
                noiseBurst(audio, 0.035, 0.004);
            }
        }, 140);
    };

    const toggleSound = () => {
        sound = !sound;
        root.querySelector("[data-cracktro-sound]").textContent = "SOUND: " + (sound ? "ON" : "OFF");
        if (sound) startMusic();
        else stopMusic();
    };

    const cycleEffect = () => {
        effect = (effect + 1) % effects.length;
        root.querySelector("[data-cracktro-effect]").textContent = "FX: " + effects[effect];
        fxDisplay.textContent = effects[effect] + " + STARFIELD";
    };

    const onClick = event => {
        if (event.target.closest("[data-cracktro-sound]")) toggleSound();
        if (event.target.closest("[data-cracktro-effect]")) cycleEffect();
        const pause = event.target.closest("[data-cracktro-pause]");
        if (pause) {
            paused = !paused;
            pause.textContent = paused ? "RESUME" : "PAUSE";
        }
    };
    root.addEventListener("click", onClick);
    cleanup.add(() => root.removeEventListener("click", onClick));
    cleanup.add(() => {
        if (frame) cancelAnimationFrame(frame);
        stopMusic();
        safeCloseAudio(audio);
    });

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => root.querySelector("button")?.focus({ preventScroll: true }),
    };
}
