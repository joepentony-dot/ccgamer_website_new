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

    const CANONICAL_DOMAIN = "https://www.cheekycommodoregamer.co.uk";
    const GAME_PATH_PREFIX = "/games/";

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

    function getSlugFromPathname(pathname) {
        let cleanedPath = String(pathname || "");
        cleanedPath = cleanedPath.replace(/\/index\.html$/i, "/");
        cleanedPath = cleanedPath.replace(/\.html$/i, "");
        if (!cleanedPath.startsWith(GAME_PATH_PREFIX)) return "";

        let slug = cleanedPath.slice(GAME_PATH_PREFIX.length);
        slug = slug.replace(/\/+$/g, "");
        if (!slug || slug === "game") return "";
        return slug;
    }

    function decodeSlug(value) {
        try {
            return decodeURIComponent(value);
        } catch (error) {
            return value;
        }
    }

    function stripLeadingNoise(value) {
        return String(value || "")
            .replace(/^[\s;,:|]+/g, "")
            .replace(/^[^a-z0-9]+/i, "");
    }

    function cleanSlug(value) {
        let slug = stripLeadingNoise(value);
        slug = decodeSlug(slug).trim();
        slug = slug.replace(/^games\//i, "");
        slug = slug.replace(/^\/games\//i, "");
        slug = slug.replace(/\.html$/i, "");
        slug = slug.replace(/\/+$/g, "");
        slug = slug.replace(/^[^a-z0-9]+/i, "");
        if (!slug) return "";
        if (!/^[a-z0-9-]+$/i.test(slug)) return "";
        return slug;
    }

    function getSlugFromUrl(rawValue) {
        const candidate = stripLeadingNoise(rawValue);
        if (!candidate) return "";

        let parsedUrl = null;
        try {
            parsedUrl = new URL(candidate, window.location.origin);
        } catch (error) {
            parsedUrl = null;
        }

        if (parsedUrl) {
            const pathSlug = getSlugFromPathname(parsedUrl.pathname || "");
            if (pathSlug) return cleanSlug(pathSlug);

            if (parsedUrl.pathname && parsedUrl.pathname.endsWith("game.html")) {
                const slugParam = cleanSlug(parsedUrl.searchParams.get("slug"));
                if (slugParam) return slugParam;

                const idParam = cleanSlug(parsedUrl.searchParams.get("id"));
                if (idParam) return idParam;
            }

            return cleanSlug(parsedUrl.pathname || "");
        }

        return cleanSlug(candidate);
    }

    function getCanonicalGameUrl(slug) {
        const safeSlug = cleanSlug(slug);
        if (!safeSlug) return "";
        return `${CANONICAL_DOMAIN}${GAME_PATH_PREFIX}${safeSlug}/`;
    }

    function isValidCanonicalUrl(url) {
        if (!url) return false;
        if (!url.startsWith(`${CANONICAL_DOMAIN}${GAME_PATH_PREFIX}`)) return false;
        if (!url.endsWith("/")) return false;
        if (url.includes(".html") || url.includes("game.html") || url.includes("?")) return false;
        return true;
    }

    function resolveShareUrl() {
        const canonicalLink = document.querySelector("link[rel='canonical']");
        const canonicalHref = canonicalLink ? canonicalLink.getAttribute("href") : "";
        let slug = canonicalHref ? getSlugFromUrl(canonicalHref) : "";

        if (!slug) {
            const ogUrl = document.querySelector("meta[property='og:url']");
            const ogHref = ogUrl ? ogUrl.getAttribute("content") : "";
            slug = ogHref ? getSlugFromUrl(ogHref) : "";
        }

        if (!slug) {
            const params = new URLSearchParams(window.location.search || "");
            slug = cleanSlug(params.get("slug"));
        }

        if (!slug) {
            slug = getSlugFromPathname(window.location.pathname || "");
        }

        if (!slug) {
            const params = new URLSearchParams(window.location.search || "");
            slug = cleanSlug(params.get("id"));
        }

        if (!slug) {
            slug = getSlugFromUrl(window.location.href);
        }

        const canonicalUrl = getCanonicalGameUrl(slug);
        if (isValidCanonicalUrl(canonicalUrl)) return canonicalUrl;
        return "";
    }

    const shareUrl = resolveShareUrl();
    const title = document.title || "Cheeky Commodore Gamer";
    const gameTitle = getGameTitle();
    const shareText = gameTitle
        ? `Check out this classic game on Cheeky Commodore Gamer: ${gameTitle}`
        : "Check out this classic game on Cheeky Commodore Gamer";

    function setFallbackLinks() {
        if (!shareUrl) return;
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
            if (!shareUrl) return;
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
            if (!shareUrl) return;
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
