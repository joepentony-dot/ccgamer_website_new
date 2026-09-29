import { appendLine, cleanupBag } from "./common.js";

export function createExperience({ onLaunch } = {}) {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--diskerror";
    root.innerHTML =
        '<div class="ccg-e11__error-screen">' +
            '<div class="ccg-e11__error-terminal" data-error-output aria-live="polite">' +
                '<div>SEARCHING FOR CHEEKY</div><div>LOADING</div><div class="is-error">74,DRIVE NOT READY,00,00</div><div>READY.</div>' +
            '</div>' +
            '<form class="ccg-e11__command" data-error-form><span>&gt;</span><input data-error-input spellcheck="false" autocomplete="off" aria-label="Recovery command"></form>' +
            '<p class="ccg-e11__hint">The disk is sulking. There is a recovery command hidden in plain sight.</p>' +
        '</div>';

    const output = root.querySelector("[data-error-output]");
    const form = root.querySelector("[data-error-form]");
    const input = root.querySelector("[data-error-input]");
    const cleanup = cleanupBag();
    let recovered = false;
    let attempts = 0;

    const execute = raw => {
        const printable = String(raw || "").trim();
        const command = printable.toUpperCase().replace(/\s+/g, "");
        if (!command) return;
        attempts += 1;
        appendLine(output, ">" + printable, "is-command");

        if (command === "OPEN15,8,15" || command === "INITIALIZE" || command === "I0") {
            recovered = true;
            appendLine(output, "00, OK,00,00", "is-success");
            appendLine(output, "DRIVE RECOVERED. TYPE RUN.");
            return;
        }
        if (command === "RUN" && recovered) {
            appendLine(output, "LOADING CCG RECOVERY PROGRAM...", "is-success");
            onLaunch?.("1541");
            return;
        }
        if (command === "HELP") {
            appendLine(output, "HINT: TRY OPEN15,8,15 OR INITIALIZE.");
            return;
        }
        appendLine(
            output,
            attempts < 3 ? "74,DRIVE NOT READY,00,00" : "THE DRIVE WOULD LIKE YOU TO TYPE HELP.",
            "is-error"
        );
    };

    const onSubmit = event => {
        event.preventDefault();
        const value = input.value;
        input.value = "";
        execute(value);
    };
    form.addEventListener("submit", onSubmit);
    cleanup.add(() => form.removeEventListener("submit", onSubmit));

    return {
        content: root,
        cleanup: () => cleanup.run(),
        focus: () => input.focus({ preventScroll: true }),
    };
}
