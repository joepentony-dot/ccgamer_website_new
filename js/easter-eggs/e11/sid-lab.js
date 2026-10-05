import { audioContext, cleanupBag, safeCloseAudio } from "./common.js";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C2"];
const KEY_LABELS = ["A", "W", "S", "E", "D", "F", "T", "G", "Y", "H", "U", "J", "K"];

function makeVoiceMarkup(voice) {
    const detune = (voice - 2) * 7;
    const level = voice === 1 ? "0.09" : "0.05";
    return '<fieldset class="ccg-e11__voice" data-voice="' + voice + '">' +
        '<legend>VOICE ' + voice + '</legend>' +
        '<div class="ccg-e11__voice-meter"><i data-voice-meter></i></div>' +
        '<label>WAVE<select data-wave>' +
            '<option value="square">PULSE</option>' +
            '<option value="sawtooth">SAW</option>' +
            '<option value="triangle">TRIANGLE</option>' +
            '<option value="sine">SINE</option>' +
        '</select></label>' +
        '<label>OCTAVE<select data-octave>' +
            '<option value="-1">-1</option><option value="0" selected>0</option><option value="1">+1</option>' +
        '</select></label>' +
        '<label>DETUNE <output data-detune-out>' + detune + '</output> ST<input data-detune type="range" min="-24" max="24" step="1" value="' + detune + '"></label>' +
        '<label>LEVEL <output data-level-out>' + level + '</output><input data-level type="range" min="0" max="0.18" step="0.01" value="' + level + '"></label>' +
        '<label>ATTACK <output data-attack-out>0.02</output><input data-attack type="range" min="0.01" max="0.35" step="0.01" value="0.02"></label>' +
        '<label>RELEASE <output data-release-out>0.12</output><input data-release type="range" min="0.03" max="0.8" step="0.01" value="0.12"></label>' +
    '</fieldset>';
}

export function createExperience({ prefersReducedMotion = false } = {}) {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--sid";
    root.innerHTML =
        '<header class="ccg-e11__panel-header">' +
            '<div><strong>SID LAB</strong><span>3-VOICE C64-STYLE SYNTH LAB · LIVE FILTER · STEP SEQUENCER</span></div>' +
            '<div class="ccg-e11__sid-status" data-sid-status>READY</div>' +
        '</header>' +
        '<div class="ccg-e11__sid-transport">' +
            '<span class="ccg-e11__sid-chip">MOS 6581-ish</span>' +
            '<button class="ccg-e11-btn" type="button" data-sid-preset="BASS">BASS</button>' +
            '<button class="ccg-e11-btn" type="button" data-sid-preset="LEAD">LEAD</button>' +
            '<button class="ccg-e11-btn" type="button" data-sid-preset="CHORD">CHORD</button>' +
            '<button class="ccg-e11-btn" type="button" data-sid-seq>ARPEGGIO</button>' +
            '<span class="ccg-e11__sid-step" data-sid-step>STEP --</span>' +
        '</div>' +
        '<div class="ccg-e11__scope-wrap">' +
            '<canvas class="ccg-e11__scope" data-sid-scope width="960" height="220" aria-label="Synth oscilloscope and spectrum"></canvas>' +
            '<div class="ccg-e11__scope-labels"><span>OSCILLOSCOPE</span><span>FFT</span></div>' +
        '</div>' +
        '<div class="ccg-e11__sid-grid">' + [1, 2, 3].map(makeVoiceMarkup).join("") + '</div>' +
        '<div class="ccg-e11__sid-master">' +
            '<label>FILTER<select data-filter-type><option value="lowpass">LOW PASS</option><option value="bandpass">BAND PASS</option><option value="highpass">HIGH PASS</option></select></label>' +
            '<label>CUTOFF <output data-cutoff-out>2400</output> HZ<input data-cutoff type="range" min="180" max="8000" step="20" value="2400"></label>' +
            '<label>RESONANCE <output data-resonance-out>1.4</output><input data-resonance type="range" min="0.1" max="14" step="0.1" value="1.4"></label>' +
            '<label>MASTER <output data-master-out>0.65</output><input data-master type="range" min="0" max="1" step="0.01" value="0.65"></label>' +
            '<button class="ccg-e11-btn" type="button" data-sid-panic>PANIC / MUTE</button>' +
        '</div>' +
        '<div class="ccg-e11__keyboard" aria-label="Playable synth keyboard">' +
            NOTE_NAMES.map(function (name, index) {
                const sharp = name.includes("#");
                return '<button type="button" data-note="' + index + '" class="ccg-e11__key' + (sharp ? ' is-sharp' : '') + '">' +
                    '<span>' + name + '</span><small>' + KEY_LABELS[index] + '</small>' +
                '</button>';
            }).join("") +
        '</div>' +
        '<p class="ccg-e11__hint">Keyboard: A W S E D F T G Y H U J K · presets change all three voices · ARPEGGIO runs an original local step pattern.</p>';

    const cleanup = cleanupBag();
    const status = root.querySelector("[data-sid-status]");
    const canvas = root.querySelector("[data-sid-scope]");
    const drawContext = canvas?.getContext("2d");
    const audio = audioContext();
    const analyser = audio?.createAnalyser();
    const filter = audio?.createBiquadFilter();
    const master = audio?.createGain();
    const cutoff = root.querySelector("[data-cutoff]");
    const resonance = root.querySelector("[data-resonance]");
    const filterType = root.querySelector("[data-filter-type]");
    const masterInput = root.querySelector("[data-master]");
    const stepDisplay = root.querySelector("[data-sid-step]");
    let activeVoices = [];
    let frame = 0;
    let sequenceTimer = 0;
    let sequenceStep = 0;
    let sequenceRunning = false;

    if (analyser && filter && master) {
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.72;
        filter.type = "lowpass";
        filter.frequency.value = 2400;
        filter.Q.value = 1.4;
        master.gain.value = 0.65;
        filter.connect(master).connect(analyser).connect(audio.destination);
    }

    const voiceFields = Array.from(root.querySelectorAll("[data-voice]"));

    const syncReadouts = () => {
        voiceFields.forEach(field => {
            const pairs = [
                ["[data-detune]", "[data-detune-out]"],
                ["[data-level]", "[data-level-out]"],
                ["[data-attack]", "[data-attack-out]"],
                ["[data-release]", "[data-release-out]"],
            ];
            pairs.forEach(([inputSelector, outputSelector]) => {
                const input = field.querySelector(inputSelector);
                const output = field.querySelector(outputSelector);
                if (input && output) output.textContent = input.value;
            });
        });
        root.querySelector("[data-cutoff-out]").textContent = cutoff.value;
        root.querySelector("[data-resonance-out]").textContent = resonance.value;
        root.querySelector("[data-master-out]").textContent = masterInput.value;
    };

    const syncFilter = () => {
        if (filter) {
            filter.type = filterType.value;
            filter.frequency.setTargetAtTime(Number(cutoff.value), audio.currentTime, 0.012);
            filter.Q.setTargetAtTime(Number(resonance.value), audio.currentTime, 0.012);
        }
        if (master) master.gain.setTargetAtTime(Number(masterInput.value), audio.currentTime, 0.012);
        syncReadouts();
    };

    root.querySelectorAll("input,select").forEach(control => {
        control.addEventListener("input", syncFilter);
        control.addEventListener("change", syncFilter);
        cleanup.add(() => {
            control.removeEventListener("input", syncFilter);
            control.removeEventListener("change", syncFilter);
        });
    });

    const stopVoices = (immediate = false) => {
        if (!audio) return;
        activeVoices.forEach(function (voice) {
            try {
                const now = audio.currentTime;
                const release = immediate ? 0.02 : voice.release;
                voice.gain.gain.cancelScheduledValues(now);
                voice.gain.gain.setTargetAtTime(0.0001, now, Math.max(0.008, release / 4));
                voice.oscillator.stop(now + release + 0.08);
            } catch (_) {}
        });
        activeVoices = [];
        voiceFields.forEach(field => field.classList.remove("is-active"));
    };

    const play = semitone => {
        if (!audio || !filter) {
            status.textContent = "AUDIO UNAVAILABLE";
            return;
        }
        if (audio.state === "suspended") audio.resume().catch(() => {});
        stopVoices(true);
        syncFilter();
        const base = 261.6256 * Math.pow(2, semitone / 12);
        voiceFields.forEach(function (field, index) {
            const oscillator = audio.createOscillator();
            const gain = audio.createGain();
            const detune = Number(field.querySelector("[data-detune]").value || 0);
            const octave = Number(field.querySelector("[data-octave]").value || 0);
            const level = Number(field.querySelector("[data-level]").value || 0.04);
            const attack = Number(field.querySelector("[data-attack]").value || 0.02);
            const release = Number(field.querySelector("[data-release]").value || 0.12);
            oscillator.type = field.querySelector("[data-wave]").value;
            oscillator.frequency.value = base * Math.pow(2, octave) * Math.pow(2, detune / 12);
            gain.gain.setValueAtTime(0.0001, audio.currentTime);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), audio.currentTime + attack);
            oscillator.connect(gain).connect(filter);
            oscillator.start();
            activeVoices.push({ oscillator, gain, release, field });
            field.classList.add("is-active");
            const meter = field.querySelector("[data-voice-meter]");
            if (meter) meter.style.width = Math.min(100, Math.round(level / 0.18 * 100)) + "%";
            field.style.setProperty("--sid-phase", String(index));
        });
        status.textContent = NOTE_NAMES[semitone] + " · " + base.toFixed(1) + " HZ";
        root.querySelectorAll("[data-note]").forEach(key => key.classList.toggle("is-playing", Number(key.dataset.note) === semitone));
    };

    const panic = () => {
        stopVoices(true);
        clearInterval(sequenceTimer);
        sequenceTimer = 0;
        sequenceRunning = false;
        root.querySelector("[data-sid-seq]").textContent = "ARPEGGIO";
        stepDisplay.textContent = "STEP --";
        root.querySelectorAll("[data-note]").forEach(key => key.classList.remove("is-playing"));
        status.textContent = "MUTED";
    };

    const presets = {
        BASS: [
            { wave: "square", octave: -1, detune: 0, level: 0.11, attack: 0.01, release: 0.09 },
            { wave: "sawtooth", octave: -1, detune: 0, level: 0.05, attack: 0.01, release: 0.12 },
            { wave: "triangle", octave: 0, detune: -12, level: 0.035, attack: 0.02, release: 0.18 },
        ],
        LEAD: [
            { wave: "square", octave: 0, detune: 0, level: 0.085, attack: 0.02, release: 0.24 },
            { wave: "square", octave: 0, detune: 7, level: 0.04, attack: 0.03, release: 0.28 },
            { wave: "sawtooth", octave: 1, detune: -12, level: 0.025, attack: 0.04, release: 0.32 },
        ],
        CHORD: [
            { wave: "triangle", octave: 0, detune: 0, level: 0.06, attack: 0.08, release: 0.5 },
            { wave: "triangle", octave: 0, detune: 4, level: 0.05, attack: 0.09, release: 0.55 },
            { wave: "triangle", octave: 0, detune: 7, level: 0.05, attack: 0.1, release: 0.6 },
        ],
    };

    const applyPreset = name => {
        const preset = presets[name];
        if (!preset) return;
        preset.forEach((settings, index) => {
            const field = voiceFields[index];
            field.querySelector("[data-wave]").value = settings.wave;
            field.querySelector("[data-octave]").value = String(settings.octave);
            field.querySelector("[data-detune]").value = String(settings.detune);
            field.querySelector("[data-level]").value = String(settings.level);
            field.querySelector("[data-attack]").value = String(settings.attack);
            field.querySelector("[data-release]").value = String(settings.release);
        });
        cutoff.value = name === "BASS" ? "1200" : name === "LEAD" ? "3600" : "2200";
        resonance.value = name === "LEAD" ? "4.8" : "1.8";
        syncFilter();
        status.textContent = "PRESET " + name;
    };

    const toggleSequence = () => {
        const button = root.querySelector("[data-sid-seq]");
        if (sequenceRunning) {
            clearInterval(sequenceTimer);
            sequenceTimer = 0;
            sequenceRunning = false;
            button.textContent = "ARPEGGIO";
            stepDisplay.textContent = "STEP --";
            stopVoices(true);
            status.textContent = "READY";
            return;
        }
        sequenceRunning = true;
        sequenceStep = 0;
        button.textContent = "STOP SEQ";
        const pattern = [0, 4, 7, 12, 7, 4, 10, 7];
        const tick = () => {
            const step = sequenceStep++ % pattern.length;
            stepDisplay.textContent = "STEP " + String(step + 1).padStart(2, "0");
            play(pattern[step]);
        };
        tick();
        sequenceTimer = setInterval(tick, 185);
    };

    const onClick = event => {
        const key = event.target.closest("[data-note]");
        if (key) play(Number(key.dataset.note));
        const preset = event.target.closest("[data-sid-preset]")?.dataset.sidPreset;
        if (preset) applyPreset(preset);
        if (event.target.closest("[data-sid-seq]")) toggleSequence();
        if (event.target.closest("[data-sid-panic]")) panic();
    };
    root.addEventListener("click", onClick);
    cleanup.add(() => root.removeEventListener("click", onClick));

    const keyMap = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12 };
    const onKey = event => {
        if (event.repeat || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || "")) return;
        const note = keyMap[String(event.key || "").toLowerCase()];
        if (Number.isInteger(note)) play(note);
        if (event.key === "Escape") panic();
    };
    document.addEventListener("keydown", onKey);
    cleanup.add(() => document.removeEventListener("keydown", onKey));

    const draw = () => {
        if (!drawContext) return;
        const width = canvas.width;
        const height = canvas.height;
        drawContext.fillStyle = "#04130c";
        drawContext.fillRect(0, 0, width, height);
        drawContext.strokeStyle = "rgba(82,255,163,.14)";
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
            const wave = new Uint8Array(analyser.fftSize);
            analyser.getByteTimeDomainData(wave);
            drawContext.strokeStyle = "#65ffae";
            drawContext.lineWidth = 3;
            drawContext.beginPath();
            wave.forEach(function (value, index) {
                const x = index / (wave.length - 1) * width;
                const y = value / 255 * (height * 0.58);
                if (!index) drawContext.moveTo(x, y);
                else drawContext.lineTo(x, y);
            });
            drawContext.stroke();

            const spectrum = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(spectrum);
            const bins = 64;
            const baseY = height;
            const barWidth = width / bins;
            for (let index = 0; index < bins; index += 1) {
                const value = spectrum[index * 2] / 255;
                const barHeight = value * height * 0.32;
                drawContext.fillStyle = "rgba(101,255,174," + (0.18 + value * 0.62) + ")";
                drawContext.fillRect(index * barWidth + 1, baseY - barHeight, Math.max(1, barWidth - 2), barHeight);
            }
        }
        if (!prefersReducedMotion) frame = requestAnimationFrame(draw);
    };

    syncFilter();
    draw();

    cleanup.add(() => {
        if (frame) cancelAnimationFrame(frame);
        clearInterval(sequenceTimer);
        stopVoices(true);
        safeCloseAudio(audio);
    });

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => root.querySelector("[data-note]")?.focus({ preventScroll: true }),
    };
}
