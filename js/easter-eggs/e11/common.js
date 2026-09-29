/* CCG E11 shared interactive Easter egg helpers */
export function cleanupBag() {
    const cleanups = [];
    return {
        add(fn) { if (typeof fn === "function") cleanups.push(fn); },
        run() {
            while (cleanups.length) {
                try { cleanups.pop()(); } catch (_) {}
            }
        },
    };
}

export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function button(label, action, className) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = ("ccg-e11-btn " + (className || "")).trim();
    el.textContent = label;
    el.dataset.e11Action = action;
    return el;
}

export function audioContext() {
    try {
        const Context = window.AudioContext || window.webkitAudioContext;
        return Context ? new Context() : null;
    } catch (_) {
        return null;
    }
}

export function tone(context, frequency, duration, type, volume, startOffset) {
    if (!context) return null;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime + (startOffset || 0);
    oscillator.type = type || "square";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume || 0.02), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (duration || 0.12));
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + (duration || 0.12) + 0.03);
    return oscillator;
}

export function noiseBurst(context, duration, volume) {
    if (!context) return;
    const seconds = duration || 0.22;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 1500;
    filter.Q.value = 0.8;
    gain.gain.value = volume || 0.018;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
}

export function terminalShell(title, subtitle) {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--terminal";
    root.innerHTML =
        '<div class="ccg-e11__chrome">' +
            '<div class="ccg-e11__titlebar">' +
                '<span class="ccg-e11__lamp" aria-hidden="true"></span>' +
                '<div><strong>' + title + '</strong>' +
                (subtitle ? '<small>' + subtitle + '</small>' : '') +
                '</div>' +
            '</div>' +
            '<div class="ccg-e11__terminal" data-terminal-output aria-live="polite"></div>' +
            '<form class="ccg-e11__command" data-terminal-form autocomplete="off">' +
                '<span aria-hidden="true">&gt;</span>' +
                '<input data-terminal-input spellcheck="false" autocomplete="off" aria-label="Command">' +
            '</form>' +
            '<div class="ccg-e11__quick" data-terminal-quick></div>' +
        '</div>';
    return root;
}

export function appendLine(output, text, className) {
    const line = document.createElement("div");
    line.className = ("ccg-e11__line " + (className || "")).trim();
    line.textContent = text || "";
    output.appendChild(line);
    while (output.childElementCount > 180) output.firstElementChild?.remove();
    output.scrollTop = output.scrollHeight;
    return line;
}

export function safeCloseAudio(context) {
    try { context?.close(); } catch (_) {}
}
