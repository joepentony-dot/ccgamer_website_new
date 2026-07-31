#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACMAN = ROOT / "resources" / "audio" / "easter-eggs" / "pacman.html"
AUDIO_MARKER = "CCG PACMAN LOCAL SYNTH AUDIO"
CONTROLLER_MARKER = "CCG PACMAN ALWAYS-VISIBLE CONTROLLER"

PACMAN_AUDIO = r'''Pacman.Audio = function(game) {
    /* CCG PACMAN LOCAL SYNTH AUDIO */
    var context = null,
        active = [];

    function audioContext() {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        if (!context) {
            context = new AudioContextClass();
            document.documentElement.setAttribute("data-ccg-pacman-audio", "synth");
        }
        if (context.state === "suspended") {
            var resumePromise = context.resume();
            if (resumePromise && typeof resumePromise.catch === "function") {
                resumePromise.catch(function () {});
            }
        }
        return context;
    }

    function forget(node) {
        active = active.filter(function (item) { return item !== node; });
    }

    function tone(startFrequency, endFrequency, duration, type, volume, delay) {
        if (game.soundDisabled()) return;
        var ctx = audioContext();
        if (!ctx) return;

        var start = ctx.currentTime + (delay || 0),
            oscillator = ctx.createOscillator(),
            gain = ctx.createGain();

        oscillator.type = type || "square";
        oscillator.frequency.setValueAtTime(Math.max(20, startFrequency), start);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency || startFrequency), start + duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume || 0.035, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.addEventListener("ended", function () {
            forget(oscillator);
            try { oscillator.disconnect(); } catch (error) {}
            try { gain.disconnect(); } catch (error) {}
        }, { once: true });
        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
        active.push(oscillator);
    }

    function stopActive() {
        active.forEach(function (oscillator) {
            try { oscillator.stop(); } catch (error) {}
        });
        active = [];
    }

    function load(name, path, callback) {
        if (typeof callback === "function") {
            window.setTimeout(callback, 0);
        }
    }

    function play(name) {
        if (game.soundDisabled()) return;
        switch (name) {
        case "start":
            tone(196, 196, 0.09, "square", 0.035, 0);
            tone(247, 247, 0.09, "square", 0.035, 0.1);
            tone(330, 330, 0.09, "square", 0.04, 0.2);
            tone(494, 494, 0.18, "square", 0.045, 0.3);
            break;
        case "die":
            tone(520, 70, 0.72, "sawtooth", 0.055, 0);
            tone(260, 45, 0.72, "square", 0.025, 0.02);
            break;
        case "eatghost":
            tone(620, 1480, 0.23, "square", 0.045, 0);
            tone(780, 1760, 0.2, "square", 0.025, 0.04);
            break;
        case "eatpill":
            tone(260, 760, 0.12, "square", 0.032, 0);
            break;
        case "eating2":
            tone(215, 165, 0.045, "square", 0.018, 0);
            break;
        case "eating":
        default:
            tone(165, 215, 0.045, "square", 0.018, 0);
            break;
        }
    }

    function disableSound() {
        stopActive();
    }

    function pause() {
        if (context && context.state === "running") {
            context.suspend().catch(function () {});
        }
    }

    function resume() {
        audioContext();
    }

    return {
        "disableSound" : disableSound,
        "load"         : load,
        "play"         : play,
        "pause"        : pause,
        "resume"       : resume
    };
};'''

SOUND_BUTTON = '''\t\t<button type="button" class="ccg-pacman-sound" data-pacman-key-code="83" data-pacman-key="s" data-pacman-code="KeyS">SOUND (S)</button>'''

OLD_CONTROLLER = '''\t\tvar touchCapable = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
\t\ttouchCapable = touchCapable || navigator.maxTouchPoints > 0 || window.innerWidth <= 900;
\t\tif (!touchCapable) return;

\t\tvar controls = document.querySelector("[data-ccg-pacman-controls]");
\t\tif (!controls) return;

\t\tdocument.documentElement.classList.add("ccg-pacman-touch");
\t\tcontrols.hidden = false;'''

NEW_CONTROLLER = '''\t\t/* CCG PACMAN ALWAYS-VISIBLE CONTROLLER */
\t\tvar controls = document.querySelector("[data-ccg-pacman-controls]");
\t\tif (!controls) return;

\t\tdocument.documentElement.classList.add("ccg-pacman-touch");
\t\tdocument.documentElement.setAttribute("data-ccg-pacman-controller", "visible");
\t\tcontrols.hidden = false;'''


def patch(text: str) -> str:
    updated = text

    if AUDIO_MARKER not in updated:
        pattern = re.compile(r"Pacman\.Audio = function\(game\) \{.*?\n\};\n\nvar PACMAN", re.DOTALL)
        replacement = PACMAN_AUDIO + "\n\nvar PACMAN"
        updated, count = pattern.subn(lambda _: replacement, updated, count=1)
        if count != 1:
            raise RuntimeError(f"Pac-Man audio block: expected one match, found {count}")

    if "ccg-pacman-sound" not in updated:
        start_button = '\t\t<button type="button" class="ccg-pacman-start" data-pacman-key-code="78" data-pacman-key="n" data-pacman-code="KeyN">START / NEW GAME</button>'
        if updated.count(start_button) != 1:
            raise RuntimeError("Pac-Man start button marker was not unique")
        updated = updated.replace(start_button, start_button + "\n" + SOUND_BUTTON, 1)

    if CONTROLLER_MARKER not in updated:
        if updated.count(OLD_CONTROLLER) != 1:
            raise RuntimeError("Pac-Man controller bootstrap marker was not unique")
        updated = updated.replace(OLD_CONTROLLER, NEW_CONTROLLER, 1)

    return updated


def validate(text: str) -> None:
    required = [
        AUDIO_MARKER,
        CONTROLLER_MARKER,
        'data-ccg-pacman-audio',
        'data-ccg-pacman-controller',
        'class="ccg-pacman-sound"',
        'data-pacman-key-code="83"',
    ]
    missing = [marker for marker in required if marker not in text]
    if missing:
        raise RuntimeError(f"Pac-Man fit validation missing: {', '.join(missing)}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    original = PACMAN.read_text(encoding="utf-8")
    updated = patch(original)
    validate(updated)

    if args.check:
        if updated != original:
            raise SystemExit("Pac-Man fit patch is not applied")
        print("Pac-Man controller and local audio patch verified.")
        return

    if updated == original:
        print("Pac-Man controller and local audio patch already applied.")
        return

    PACMAN.write_text(updated, encoding="utf-8")
    print("Applied Pac-Man controller and local synth audio patch.")


if __name__ == "__main__":
    main()
