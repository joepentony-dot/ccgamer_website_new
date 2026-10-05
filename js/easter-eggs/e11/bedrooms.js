/* CCG E11 BEDROOMS streaming media Easter egg */
const DRIVE_PREVIEW_URL = "https://drive.google.com/file/d/1Cy5CW7bfsFyD757lnTF3RO9ksuAvNwHb/preview";

export function createExperience() {
    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--bedrooms";
    root.innerHTML =
        '<div class="ccg-e11__bedrooms-shell">' +
            '<header class="ccg-e11__bedrooms-header">' +
                '<div>' +
                    '<strong>BEDROOMS</strong>' +
                    '<span>FROM BEDROOMS TO BILLIONS</span>' +
                '</div>' +
                '<span class="ccg-e11__bedrooms-badge">STREAMING VIEW ONLY</span>' +
            '</header>' +
            '<div class="ccg-e11__bedrooms-player" data-bedrooms-player>' +
                '<iframe ' +
                    'class="ccg-e11__bedrooms-frame" ' +
                    'data-bedrooms-frame ' +
                    'title="BEDROOMS video player" ' +
                    'src="' + DRIVE_PREVIEW_URL + '" ' +
                    'allow="autoplay; fullscreen" ' +
                    'allowfullscreen ' +
                    'loading="eager" ' +
                    'referrerpolicy="no-referrer" ' +
                    'sandbox="allow-scripts allow-same-origin allow-presentation">' +
                '</iframe>' +
                '<div class="ccg-e11__bedrooms-shield" aria-hidden="true"></div>' +
            '</div>' +
            '<footer class="ccg-e11__bedrooms-footer">' +
                '<span>VIDEO STREAM</span>' +
                '<span>DOWNLOADS DISABLED</span>' +
                '<span>EXIT RETURNS TO CCGAMER</span>' +
            '</footer>' +
        '</div>';

    const frame = root.querySelector("[data-bedrooms-frame]");
    const player = root.querySelector("[data-bedrooms-player]");

    const blockDrag = event => event.preventDefault();
    player?.addEventListener("dragstart", blockDrag);

    return {
        content: root,
        cleanup: () => {
            player?.removeEventListener("dragstart", blockDrag);
            if (frame) frame.src = "about:blank";
        },
        focus: () => frame?.focus({ preventScroll: true }),
    };
}
