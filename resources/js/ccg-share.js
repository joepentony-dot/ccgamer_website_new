(function () {
    "use strict";

    const root = document.querySelector("[data-ccg-share]");
    if (!root) return;

    const shareBtn = root.querySelector("[data-ccg-share-btn]");
    const fallback = root.querySelector("[data-ccg-share-fallback]");
    const emailLink = root.querySelector("[data-ccg-share-email]");
    const whatsappLink = root.querySelector("[data-ccg-share-whatsapp]");
    const xLink = root.querySelector("[data-ccg-share-x]");
    const facebookLink = root.querySelector("[data-ccg-share-facebook]");
    const copyBtn = root.querySelector("[data-ccg-share-copy]");

    const pageUrl = window.location.href;
    const title = document.title || "Cheeky Commodore Gamer";

    function setFallbackLinks() {
        if (emailLink) {
            emailLink.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(pageUrl)}`;
        }
        if (whatsappLink) {
            const text = `${title} ${pageUrl}`;
            whatsappLink.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
        }
        if (xLink) {
            xLink.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(pageUrl)}`;
        }
        if (facebookLink) {
            facebookLink.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
        }
    }

    function showFallback() {
        if (!fallback) return;
        fallback.setAttribute("aria-hidden", "false");
        root.classList.add("ccg-share--fallback");
    }

    function copyWithFallback(text) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.className = "ccg-share-copy-buffer";
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand("copy");
        } catch (err) {
            // Fail quietly.
        }
        document.body.removeChild(textarea);
    }

    function setCopyFeedback() {
        if (!copyBtn) return;
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        copyBtn.classList.add("is-copied");
        window.setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove("is-copied");
        }, 1400);
    }

    if (copyBtn) {
        copyBtn.addEventListener("click", () => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(pageUrl).then(setCopyFeedback).catch(() => {
                    copyWithFallback(pageUrl);
                    setCopyFeedback();
                });
            } else {
                copyWithFallback(pageUrl);
                setCopyFeedback();
            }
        });
    }

    if (navigator.share && shareBtn) {
        shareBtn.addEventListener("click", () => {
            navigator.share({ title, url: pageUrl }).catch(() => {
                // Ignore share cancellation/errors.
            });
        });
    } else {
        setFallbackLinks();
        showFallback();
        if (shareBtn) {
            shareBtn.addEventListener("click", () => {
                showFallback();
            });
        }
    }
})();
