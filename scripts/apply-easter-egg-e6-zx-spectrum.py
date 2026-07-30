from pathlib import Path

GLOBAL = Path("js/ccg-global.js")
REGISTRY = Path("js/easter-eggs/easter-egg-registry.js")

old_trigger = '''    function triggerZX() {
        const screen = document.createElement("div");
        screen.className = "ccg-egg-overlay__screen ccg-egg-overlay__screen--zx";

        const frame = createScreenFrame("https://jsspeccy.zxdemo.org/", "ccg-egg-overlay__iframe");
        screen.appendChild(frame);

        const interrupt = document.createElement("div");
        interrupt.className = "ccg-egg-overlay__interrupt";
        interrupt.innerHTML = `
            <img src="${getEasterEggAsset("zx-clive.jpg")}" alt="ZX Spectrum interruption screen" />
        `;
        screen.appendChild(interrupt);

        const audio = createAudioElement(getEasterEggAsset("no_i_dont_think_sp.mp3"));
        audio.autoplay = false;
        screen.appendChild(audio);

        const interruptTimers = {
            start: null,
            end: null,
        };

        const startInterrupt = () => {
            screen.classList.add("is-interrupt");
            audio.currentTime = 0;
            audio.play().catch(() => {});
            interruptTimers.end = setTimeout(() => {
                stopActiveEasterEgg();
            }, 5000);
        };

        interruptTimers.start = setTimeout(startInterrupt, 10000);

        openEasterEggOverlay(screen, {
            media: [frame, audio],
            className: "ccg-egg-overlay--square",
            cleanup: () => {
                if (interruptTimers.start) clearTimeout(interruptTimers.start);
                if (interruptTimers.end) clearTimeout(interruptTimers.end);
            },
        });
    }
'''

new_trigger = '''    function triggerZX() {
        const screen = document.createElement("div");
        screen.className = "ccg-egg-overlay__screen ccg-egg-overlay__screen--zx";
        const frame = createScreenFrame(getEasterEggAsset("zx-spectrum.html"), "ccg-egg-overlay__iframe");
        screen.appendChild(frame);
        openEasterEggOverlay(screen, {
            media: [frame],
            className: "ccg-egg-overlay--square ccg-egg-overlay--zx-local",
        });
    }
'''

global_text = GLOBAL.read_text(encoding="utf-8")
if new_trigger not in global_text:
    count = global_text.count(old_trigger)
    if count != 1:
        raise SystemExit(f"Expected one legacy ZX trigger, found {count}")
    GLOBAL.write_text(global_text.replace(old_trigger, new_trigger, 1), encoding="utf-8")
    print("Replaced external ZX Spectrum runtime with local E6 screen.")
else:
    print("Local E6 ZX Spectrum trigger already applied.")

registry_text = REGISTRY.read_text(encoding="utf-8")
old_registry = '{ code: "zxspectrum", label: "ZX SPECTRUM", category: "computer", desktop: true, mobile: true, reducedMotion: "media-controls", runtime: "external" }'
new_registry = '{ code: "zxspectrum", label: "ZX SPECTRUM", category: "computer", desktop: true, mobile: true, reducedMotion: "supported", runtime: "local", phase: "E6" }'
if new_registry not in registry_text:
    count = registry_text.count(old_registry)
    if count != 1:
        raise SystemExit(f"Expected one legacy ZX registry entry, found {count}")
    REGISTRY.write_text(registry_text.replace(old_registry, new_registry, 1), encoding="utf-8")
    print("Marked ZX Spectrum as local E6 runtime.")
else:
    print("ZX Spectrum registry already marks E6 local runtime.")
