(function () {
    "use strict";

    const root = document.querySelector("[data-quiz-share]");
    if (!root) return;

    const xLink = root.querySelector("[data-quiz-share-x]");
    const facebookLink = root.querySelector("[data-quiz-share-facebook]");
    const whatsappLink = root.querySelector("[data-quiz-share-whatsapp]");
    const copyButton = root.querySelector("[data-quiz-share-copy]");
    const status = root.querySelector("[data-quiz-share-status]");

    const shareText = "Test your retro knowledge with this Commodore 64 quiz on Cheeky Commodore Gamer!";

    function getCanonicalQuizUrl() {
        const currentUrl = new URL(window.location.href);
        currentUrl.hash = "";
        return currentUrl.toString();
    }

    const shareUrl = getCanonicalQuizUrl();

    function updateShareLinks() {
        const encodedUrl = encodeURIComponent(shareUrl);
        const encodedText = encodeURIComponent(shareText);

        if (xLink) {
            xLink.href = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        }

        if (facebookLink) {
            facebookLink.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        }

        if (whatsappLink) {
            whatsappLink.href = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
        }
    }

    let statusTimeout = null;

    function showStatus(message) {
        if (!status) return;

        if (statusTimeout) {
            window.clearTimeout(statusTimeout);
        }

        status.textContent = message;
        status.classList.add("is-visible");

        statusTimeout = window.setTimeout(() => {
            status.classList.remove("is-visible");
            status.textContent = "";
        }, 1600);
    }

    function fallbackCopy(text) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.className = "ccg-share-copy-buffer";
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand("copy");
        } catch (error) {
            // Intentionally ignored for graceful degradation.
        }

        document.body.removeChild(textarea);
    }

    function copyShareLink() {
        if (!shareUrl) return;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                showStatus("Link copied!");
            }).catch(() => {
                fallbackCopy(shareUrl);
                showStatus("Link copied!");
            });
            return;
        }

        fallbackCopy(shareUrl);
        showStatus("Link copied!");
    }

    if (copyButton) {
        copyButton.addEventListener("click", copyShareLink);
    }

    updateShareLinks();
})();
