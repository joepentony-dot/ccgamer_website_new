import { audioContext, cleanupBag, safeCloseAudio, tone } from "./common.js";

export function createExperience({ prefersReducedMotion = false } = {}) {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--cracktro";
    root.innerHTML =
        '<canvas data-cracktro-canvas class="ccg-e11__cracktro-canvas" width="1280" height="720"></canvas>' +
        '<div class="ccg-e11__cracktro-logo">CHEEKY<br><span>COMMODORE GAMER</span></div>' +
        '<div class="ccg-e11__cracktro-scroller"><span>*** CCG DEMOSCENE TRANSMISSION *** GREETINGS TO EVERYONE STILL USING REAL HARDWARE, EMULATORS, CRTS AND QUESTIONABLE JOYSTICKS *** KEEP DIGGING: THE BBS KNOWS MORE THAN IT ADMITS ***</span></div>' +
        '<div class="ccg-e11__cracktro-controls">' +
            '<button class="ccg-e11-btn" type="button" data-cracktro-sound>SOUND: OFF</button>' +
            '<button class="ccg-e11-btn" type="button" data-cracktro-pause>PAUSE</button>' +
        '</div>';

    const canvas = root.querySelector("[data-cracktro-canvas]");
    const context = canvas.getContext("2d");
    const cleanup = cleanupBag();
    const stars = Array.from({ length: 110 }, () => ({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        speed: 0.3 + Math.random() * 1.7,
    }));
    let frame = 0;
    let paused = false;
    let sound = false;
    let audio = null;
    let musicTimer = 0;
    let time = 0;

    const draw = () => {
        if (!context) return;
        if (!paused) time += 0.016;
        context.fillStyle = "#02020a";
        context.fillRect(0, 0, 1280, 720);

        for (let y = 0; y < 720; y += 8) {
            const hue = (y / 720 * 80 + time * 35) % 360;
            const alpha = 0.08 + 0.04 * Math.sin(time * 2 + y * 0.03);
            context.fillStyle = "hsla(" + hue + ",90%,50%," + alpha + ")";
            context.fillRect(0, y, 1280, 4);
        }

        context.fillStyle = "#fff";
        stars.forEach(star => {
            if (!paused) {
                star.y += star.speed * 1.9;
                if (star.y > 720) {
                    star.y = 0;
                    star.x = Math.random() * 1280;
                }
            }
            context.globalAlpha = 0.4 + star.speed * 0.3;
            context.fillRect(star.x, star.y, star.speed * 1.5, star.speed * 1.5);
        });
        context.globalAlpha = 1;
        if (!prefersReducedMotion) frame = requestAnimationFrame(draw);
    };
    draw();

    const toggleSound = () => {
        sound = !sound;
        root.querySelector("[data-cracktro-sound]").textContent = "SOUND: " + (sound ? "ON" : "OFF");
        clearInterval(musicTimer);
        if (!sound) return;
        audio ||= audioContext();
        if (audio?.state === "suspended") audio.resume().catch(() => {});
        let step = 0;
        const notes = [130.81,164.81,196,261.63,196,164.81,146.83,174.61];
        musicTimer = setInterval(() => {
            if (!sound || paused) return;
            tone(audio, notes[step++ % notes.length], 0.11, "square", 0.012);
        }, 140);
    };

    const onClick = event => {
        if (event.target.closest("[data-cracktro-sound]")) toggleSound();
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
        clearInterval(musicTimer);
        safeCloseAudio(audio);
    });

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => root.querySelector("button")?.focus({ preventScroll: true }),
    };
}
