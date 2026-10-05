import { audioContext, cleanupBag, noiseBurst, safeCloseAudio, tone } from "./common.js";

export function createExperience({ prefersReducedMotion = false, onLaunch } = {}) {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--kickstart";
    if (prefersReducedMotion) root.classList.add("is-reduced-motion");
    root.innerHTML =
        '<div class="ccg-e11__kick-screen">' +
            '<div class="ccg-e11__kick-raster" aria-hidden="true"></div>' +
            '<div class="ccg-e11__kick-machine" aria-hidden="true">' +
                '<div class="ccg-e11__kick-check"><i></i></div>' +
                '<div class="ccg-e11__kick-drive"><span>DF0:</span><i data-kick-drive-led></i><b></b></div>' +
                '<div class="ccg-e11__kick-hand"><i></i><b></b></div>' +
            '</div>' +
            '<div class="ccg-e11__kick-disk" data-kick-disk aria-hidden="true">' +
                '<div class="ccg-e11__kick-notch"></div>' +
                '<div class="ccg-e11__kick-label"><strong>CCG</strong><span>WORKBENCH</span><small>SYSTEM DISK</small></div>' +
            '</div>' +
            '<div class="ccg-e11__kick-copy">' +
                '<p data-kick-text>INSERT CCG WORKBENCH DISK</p>' +
                '<div class="ccg-e11__kick-progress" data-kick-progress hidden><i></i><span data-kick-stage>WAITING FOR DISK</span></div>' +
            '</div>' +
            '<button class="ccg-e11-btn" type="button" data-kick-insert>INSERT DISK</button>' +
            '<div class="ccg-e11__kick-bootlog" data-kick-bootlog aria-live="polite"></div>' +
        '</div>';

    const cleanup = cleanupBag();
    const button = root.querySelector("[data-kick-insert]");
    const text = root.querySelector("[data-kick-text]");
    const disk = root.querySelector("[data-kick-disk]");
    const progress = root.querySelector("[data-kick-progress]");
    const progressBar = progress.querySelector("i");
    const stage = root.querySelector("[data-kick-stage]");
    const driveLed = root.querySelector("[data-kick-drive-led]");
    const bootlog = root.querySelector("[data-kick-bootlog]");
    const audio = audioContext();
    const timers = [];
    let booting = false;

    const schedule = (delay, fn) => {
        const timer = setTimeout(fn, delay);
        timers.push(timer);
        return timer;
    };

    const clearTimers = () => {
        while (timers.length) clearTimeout(timers.pop());
    };

    const clickDrive = () => {
        if (!audio) return;
        if (audio.state === "suspended") audio.resume().catch(() => {});
        noiseBurst(audio, 0.07, 0.011);
        tone(audio, 78, 0.06, "square", 0.014, 0.02);
        tone(audio, 102, 0.04, "square", 0.01, 0.095);
    };

    const setBootStage = (label, amount, log) => {
        stage.textContent = label;
        progressBar.style.width = amount + "%";
        if (log) {
            const line = document.createElement("span");
            line.textContent = log;
            bootlog.appendChild(line);
        }
    };

    const startBoot = () => {
        if (booting) return;
        booting = true;
        button.disabled = true;
        disk.classList.add("is-inserted");
        driveLed.classList.add("is-on");
        progress.hidden = false;
        text.textContent = "BOOTING CCG WORKBENCH...";
        root.classList.add("is-booting");
        setBootStage("DISK INSERTED", 12, "DF0: diskchange detected");
        clickDrive();

        const scale = prefersReducedMotion ? 0.08 : 1;
        schedule(180 * scale, () => {
            setBootStage("READING BOOT BLOCK", 32, "bootblock checksum: OK");
            clickDrive();
        });
        schedule(380 * scale, () => {
            setBootStage("LOADING EXEC", 55, "exec.library 34.2");
            clickDrive();
        });
        schedule(590 * scale, () => {
            setBootStage("STARTING INTUITION", 76, "intuition.library 34.86");
            clickDrive();
        });
        schedule(760 * scale, () => {
            setBootStage("MOUNTING CCG_ARCHIVE", 91, "CCG_ARCHIVE: mounted");
            clickDrive();
        });
        schedule(900 * scale, () => {
            setBootStage("WORKBENCH READY", 100, "Workbench loaded");
            text.textContent = "CCG WORKBENCH READY.";
            button.textContent = "OPEN WORKBENCH";
            button.disabled = false;
            button.dataset.kickOpen = "1";
            driveLed.classList.remove("is-on");
            root.classList.add("is-ready");
            booting = false;
        });
    };

    const onClick = () => {
        if (button.dataset.kickOpen === "1") {
            onLaunch?.("workbench");
            return;
        }
        startBoot();
    };

    button.addEventListener("click", onClick);
    cleanup.add(() => button.removeEventListener("click", onClick));
    cleanup.add(() => {
        clearTimers();
        safeCloseAudio(audio);
    });

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => button.focus({ preventScroll: true }),
    };
}
