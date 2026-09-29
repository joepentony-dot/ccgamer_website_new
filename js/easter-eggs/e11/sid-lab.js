import { audioContext, cleanupBag, safeCloseAudio } from "./common.js";

export function createExperience({ prefersReducedMotion = false } = {}) {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--sid";
    root.innerHTML =
        '<header class="ccg-e11__panel-header">' +
            '<div><strong>SID LAB</strong><span>3-VOICE C64-STYLE SYNTH LAB</span></div>' +
            '<div class="ccg-e11__sid-status" data-sid-status>READY</div>' +
        '</header>' +
        '<canvas class="ccg-e11__scope" data-sid-scope width="960" height="180" aria-label="Synth oscilloscope"></canvas>' +
        '<div class="ccg-e11__sid-grid">' +
            [1,2,3].map(function (voice) {
                return '<fieldset class="ccg-e11__voice" data-voice="' + voice + '">' +
                    '<legend>VOICE ' + voice + '</legend>' +
                    '<label>WAVE<select data-wave>' +
                        '<option value="square">PULSE</option><option value="sawtooth">SAW</option><option value="triangle">TRIANGLE</option>' +
                    '</select></label>' +
                    '<label>DETUNE<input data-detune type="range" min="-24" max="24" step="1" value="' + ((voice - 2) * 7) + '"></label>' +
                    '<label>LEVEL<input data-level type="range" min="0" max="0.16" step="0.01" value="' + (voice === 1 ? "0.08" : "0.04") + '"></label>' +
                '</fieldset>';
            }).join("") +
        '</div>' +
        '<div class="ccg-e11__sid-master">' +
            '<label>FILTER CUTOFF<input data-cutoff type="range" min="180" max="8000" step="20" value="2400"></label>' +
            '<label>RESONANCE<input data-resonance type="range" min="0.1" max="14" step="0.1" value="1.4"></label>' +
            '<button class="ccg-e11-btn" type="button" data-sid-panic>PANIC / MUTE</button>' +
        '</div>' +
        '<div class="ccg-e11__keyboard" aria-label="Playable synth keyboard">' +
            ["C","D","E","F","G","A","B","C2"].map(function (name, index) {
                return '<button type="button" data-note="' + index + '" class="ccg-e11__key">' + name + '</button>';
            }).join("") +
        '</div>' +
        '<p class="ccg-e11__hint">Keyboard: A S D F G H J K · change waveforms and filter while notes play.</p>';

    const cleanup = cleanupBag();
    const status = root.querySelector("[data-sid-status]");
    const canvas = root.querySelector("[data-sid-scope]");
    const drawContext = canvas?.getContext("2d");
    const audio = audioContext();
    const analyser = audio?.createAnalyser();
    const filter = audio?.createBiquadFilter();
    const cutoff = root.querySelector("[data-cutoff]");
    const resonance = root.querySelector("[data-resonance]");
    let activeVoices = [];
    let frame = 0;

    if (analyser && filter) {
        analyser.fftSize = 512;
        filter.type = "lowpass";
        filter.frequency.value = 2400;
        filter.Q.value = 1.4;
        filter.connect(analyser).connect(audio.destination);
    }

    const stopAll = () => {
        if (!audio) return;
        activeVoices.forEach(function (voice) {
            try {
                voice.gain.gain.cancelScheduledValues(audio.currentTime);
                voice.gain.gain.setTargetAtTime(0.0001, audio.currentTime, 0.015);
                voice.oscillator.stop(audio.currentTime + 0.08);
            } catch (_) {}
        });
        activeVoices = [];
        status.textContent = "MUTED";
    };

    const play = semitone => {
        if (!audio || !filter) {
            status.textContent = "AUDIO UNAVAILABLE";
            return;
        }
        if (audio.state === "suspended") audio.resume().catch(() => {});
        stopAll();
        const base = 261.6256 * Math.pow(2, semitone / 12);
        root.querySelectorAll("[data-voice]").forEach(function (field) {
            const oscillator = audio.createOscillator();
            const gain = audio.createGain();
            const detune = Number(field.querySelector("[data-detune]").value || 0);
            const level = Number(field.querySelector("[data-level]").value || 0.04);
            oscillator.type = field.querySelector("[data-wave]").value;
            oscillator.frequency.value = base * Math.pow(2, detune / 12);
            gain.gain.setValueAtTime(0.0001, audio.currentTime);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), audio.currentTime + 0.015);
            oscillator.connect(gain).connect(filter);
            oscillator.start();
            activeVoices.push({ oscillator, gain });
        });
        status.textContent = base.toFixed(1) + " HZ";
    };

    const syncFilter = () => {
        if (!filter) return;
        filter.frequency.value = Number(cutoff.value);
        filter.Q.value = Number(resonance.value);
    };
    cutoff.addEventListener("input", syncFilter);
    resonance.addEventListener("input", syncFilter);
    cleanup.add(() => cutoff.removeEventListener("input", syncFilter));
    cleanup.add(() => resonance.removeEventListener("input", syncFilter));

    const onClick = event => {
        const key = event.target.closest("[data-note]");
        if (key) play(Number(key.dataset.note));
        if (event.target.closest("[data-sid-panic]")) stopAll();
    };
    root.addEventListener("click", onClick);
    cleanup.add(() => root.removeEventListener("click", onClick));

    const keyMap = { a:0, s:1, d:2, f:3, g:4, h:5, j:6, k:7 };
    const onKey = event => {
        if (event.repeat) return;
        const note = keyMap[String(event.key || "").toLowerCase()];
        if (Number.isInteger(note)) play(note);
    };
    document.addEventListener("keydown", onKey);
    cleanup.add(() => document.removeEventListener("keydown", onKey));

    const draw = () => {
        if (!drawContext || prefersReducedMotion) return;
        const width = canvas.width;
        const height = canvas.height;
        drawContext.fillStyle = "#06160f";
        drawContext.fillRect(0, 0, width, height);
        drawContext.strokeStyle = "rgba(82,255,163,.18)";
        drawContext.lineWidth = 1;
        for (let x = 0; x < width; x += 48) {
            drawContext.beginPath();
            drawContext.moveTo(x, 0);
            drawContext.lineTo(x, height);
            drawContext.stroke();
        }
        for (let y = 0; y < height; y += 36) {
            drawContext.beginPath();
            drawContext.moveTo(0, y);
            drawContext.lineTo(width, y);
            drawContext.stroke();
        }
        if (analyser) {
            const data = new Uint8Array(analyser.fftSize);
            analyser.getByteTimeDomainData(data);
            drawContext.strokeStyle = "#65ffae";
            drawContext.lineWidth = 3;
            drawContext.beginPath();
            data.forEach(function (value, index) {
                const x = index / (data.length - 1) * width;
                const y = value / 255 * height;
                if (!index) drawContext.moveTo(x, y);
                else drawContext.lineTo(x, y);
            });
            drawContext.stroke();
        }
        frame = requestAnimationFrame(draw);
    };
    draw();

    cleanup.add(() => {
        if (frame) cancelAnimationFrame(frame);
        stopAll();
        safeCloseAudio(audio);
    });

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => root.querySelector("[data-note]")?.focus({ preventScroll: true }),
    };
}
