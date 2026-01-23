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

    function getGameTitle() {
        const heroTitle = document.getElementById("gameHeroTitle");
        const heroText = heroTitle ? heroTitle.textContent.trim() : "";
        if (heroText) return heroText;

        const docTitle = document.title || "";
        const suffix = " | Cheeky Commodore Gamer";
        if (docTitle.endsWith(suffix)) {
            const trimmed = docTitle.slice(0, -suffix.length).trim();
            if (trimmed) return trimmed;
        }

        return docTitle.trim();
    }

    function getSlugFromPath() {
        let pathname = window.location.pathname || "";
        pathname = pathname.replace(/\/index\.html$/i, "/");
        pathname = pathname.replace(/\.html$/i, "");
        if (!pathname.startsWith("/games/")) return "";

        let slug = pathname.slice("/games/".length);
        slug = slug.replace(/\/+$/g, "");
        if (!slug || slug === "game") return "";
        return slug;
    }

    function buildShareUrlFromSlug(slug) {
        if (!slug) return "";
        if (typeof window.ccgBuildGameUrl === "function") {
            const prettyPath = window.ccgBuildGameUrl("", slug);
            if (prettyPath) {
                return new URL(prettyPath, window.location.origin).toString();
            }
        }
        return new URL(`/games/${slug}/`, window.location.origin).toString();
    }

    function resolveShareUrl() {
        const canonicalLink = document.querySelector("link[rel='canonical']");
        const canonicalHref = canonicalLink ? canonicalLink.getAttribute("href") : "";
        const canonicalUrl = canonicalHref
            ? new URL(canonicalHref, window.location.origin).toString()
            : "";

        if (canonicalUrl && !canonicalUrl.includes("game.html") && !canonicalUrl.includes("?")) {
            return canonicalUrl;
        }

        const params = new URLSearchParams(window.location.search);
        let slug = (params.get("slug") || "").trim();
        if (!slug) {
            slug = getSlugFromPath();
        }
        if (!slug) {
            const id = (params.get("id") || "").trim();
            if (id && typeof window.ccgGameSlugFromId === "function") {
                slug = window.ccgGameSlugFromId(id) || "";
            }
        }

        const prettyUrl = buildShareUrlFromSlug(slug);
        if (prettyUrl) return prettyUrl;
        if (canonicalUrl) return canonicalUrl;

        return window.location.href;
    }

    const shareUrl = resolveShareUrl();
    const title = document.title || "Cheeky Commodore Gamer";
    const gameTitle = getGameTitle();
    const shareText = gameTitle
        ? `Check out this classic game on Cheeky Commodore Gamer: ${gameTitle}`
        : "Check out this classic game on Cheeky Commodore Gamer";

    function setFallbackLinks() {
        if (emailLink) {
            const subject = shareText;
            const body = `${shareText} ${shareUrl}`;
            emailLink.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }
        if (whatsappLink) {
            const text = `${shareText} ${shareUrl}`;
            whatsappLink.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
        }
        if (xLink) {
            const text = `${shareText}`;
            xLink.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        }
        if (facebookLink) {
            facebookLink.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
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
                navigator.clipboard.writeText(shareUrl).then(setCopyFeedback).catch(() => {
                    copyWithFallback(shareUrl);
                    setCopyFeedback();
                });
            } else {
                copyWithFallback(shareUrl);
                setCopyFeedback();
            }
        });
    }

    if (navigator.share && shareBtn) {
        shareBtn.addEventListener("click", () => {
            navigator.share({ title, text: shareText, url: shareUrl }).catch(() => {
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
