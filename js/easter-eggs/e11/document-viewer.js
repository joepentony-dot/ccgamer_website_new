/* CCG E11 protected Drive PDF viewer */
export function createDriveDocumentExperience({ code, title, subtitle, previewUrl }) {
    if (!/^[a-z0-9]+$/.test(String(code || ""))) throw new Error("Invalid document Easter egg code");
    if (!String(previewUrl || "").endsWith("/preview")) throw new Error("Document Easter egg must use a Drive preview URL");

    const root = document.createElement("section");
    root.className = "ccg-e11 ccg-e11--document ccg-e11--" + code;
    root.innerHTML =
        '<div class="ccg-e11__document-shell">' +
            '<header class="ccg-e11__document-header">' +
                '<div class="ccg-e11__document-title">' +
                    '<strong></strong>' +
                    '<span></span>' +
                '</div>' +
                '<span class="ccg-e11__document-badge">READ ONLINE</span>' +
            '</header>' +
            '<div class="ccg-e11__document-viewer" data-document-viewer>' +
                '<iframe ' +
                    'class="ccg-e11__document-frame" ' +
                    'data-document-frame ' +
                    'title="Protected PDF reader" ' +
                    'loading="eager" ' +
                    'referrerpolicy="no-referrer" ' +
                    'sandbox="allow-scripts allow-same-origin">' +
                '</iframe>' +
                '<div class="ccg-e11__document-shield" data-document-control-shield aria-hidden="true"></div>' +
            '</div>' +
            '<footer class="ccg-e11__document-footer">' +
                '<span>PDF VIEWER</span>' +
                '<span>NO DOWNLOAD LINK</span>' +
                '<span>EXIT RETURNS TO CCGAMER</span>' +
            '</footer>' +
        '</div>';

    root.querySelector(".ccg-e11__document-title strong").textContent = title;
    root.querySelector(".ccg-e11__document-title span").textContent = subtitle;

    const frame = root.querySelector("[data-document-frame]");
    const viewer = root.querySelector("[data-document-viewer]");
    frame.src = previewUrl;

    const blockDrag = event => event.preventDefault();
    viewer?.addEventListener("dragstart", blockDrag);

    return {
        content: root,
        cleanup: () => {
            viewer?.removeEventListener("dragstart", blockDrag);
            if (frame) frame.src = "about:blank";
        },
        focus: () => frame?.focus({ preventScroll: true }),
    };
}
