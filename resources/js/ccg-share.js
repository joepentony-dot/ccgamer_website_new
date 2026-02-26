(function () {
    "use strict";

    const root = document.querySelector("[data-ccg-share]");
    if (!root) return;

    const shareBtn = root.querySelector("[data-ccg-share-btn]");
    const status = root.querySelector("[data-ccg-share-status]");
    const fallback = root.querySelector("[data-ccg-share-fallback]");
    const emailLink = root.querySelector("[data-ccg-share-email]");
    const whatsappLink = root.querySelector("[data-ccg-share-whatsapp]");
    const xLink = root.querySelector("[data-ccg-share-x]");
    const facebookLink = root.querySelector("[data-ccg-share-facebook]");
    const copyBtn = root.querySelector("[data-ccg-share-copy]");

    // Canonical host for share URLs (your golden standard).
    const CANONICAL_DOMAIN = "https://www.cheekycommodoregamer.co.uk";
    const GAME_PATH_PREFIX = "/games/";

    function applyShareButtonClasses() {
        if (shareBtn) {
            shareBtn.classList.add("ccg-btn", "ccg-btn--secondary");
        }
        [emailLink, whatsappLink, xLink, facebookLink].forEach((link) => {
            if (!link) return;
            link.classList.add("ccg-btn", "ccg-btn--ghost");
        });
        if (copyBtn) {
            copyBtn.classList.add("ccg-btn", "ccg-btn--ghost");
        }
    }

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

    function getMetaContent(selector) {
        const el = document.querySelector(selector);
        return el ? el.getAttribute("content") || "" : "";
    }

    function getShareDescription() {
        return (
            getMetaContent("#game-meta-description") ||
            getMetaContent("meta[name='description']") ||
            getMetaContent("meta[property='og:description']") ||
            ""
        );
    }

    function decodeValue(value) {
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

    function normaliseSlugCandidate(value) {
        // Key future-proofing:
        // - allow underscore IDs and normalise them to hyphen slugs
        // - strip common noise
        // - enforce final allowed charset (hyphens only after normalisation)
        let slug = stripLeadingNoise(value);
        slug = decodeValue(slug).trim();

        slug = slug.replace(/^games\//i, "");
        slug = slug.replace(/^\/games\//i, "");
        slug = slug.replace(/\/index\.html$/i, "/");
        slug = slug.replace(/\.html$/i, "");
        slug = slug.replace(/\/+$/g, "");
        slug = slug.replace(/^[^a-z0-9]+/i, "");

        // Normalise underscores to hyphens (games.json IDs → share slugs)
        slug = slug.replace(/_/g, "-");

        if (!slug) return "";
        if (!/^[a-z0-9-]+$/i.test(slug)) return "";

        return slug.toLowerCase();
    }

    function getSlugFromPathname(pathname) {
        let cleanedPath = String(pathname || "");
        cleanedPath = cleanedPath.replace(/\/index\.html$/i, "/");
        cleanedPath = cleanedPath.replace(/\.html$/i, "");
        if (!cleanedPath.startsWith(GAME_PATH_PREFIX)) return "";

        let slug = cleanedPath.slice(GAME_PATH_PREFIX.length);
        slug = slug.replace(/\/+$/g, "");
        if (!slug || slug === "game") return "";
        return normaliseSlugCandidate(slug);
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
            if (pathSlug) return pathSlug;

            // Handle /games/game.html?id=... or ?slug=...
            if (parsedUrl.pathname && /\/games\/game\.html$/i.test(parsedUrl.pathname)) {
                const slugParam = normaliseSlugCandidate(parsedUrl.searchParams.get("slug"));
                if (slugParam) return slugParam;

                // id param is underscore-based; normaliseSlugCandidate converts to hyphen slug.
                const idParam = normaliseSlugCandidate(parsedUrl.searchParams.get("id"));
                if (idParam) return idParam;
            }

            return normaliseSlugCandidate(parsedUrl.pathname || "");
        }

        return normaliseSlugCandidate(candidate);
    }

    function getCanonicalGameUrl(slug) {
        const safeSlug = normaliseSlugCandidate(slug);
        if (!safeSlug) return "";
        return `${CANONICAL_DOMAIN}${GAME_PATH_PREFIX}${safeSlug}/`;
    }

    function isValidCanonicalUrl(url) {
        if (!url) return false;
        if (!url.startsWith(`${CANONICAL_DOMAIN}${GAME_PATH_PREFIX}`)) return false;
        if (!url.endsWith("/")) return false;
        if (url.includes(".html") || url.includes("game.html") || url.includes("?")) return false;

        // Block the generic /games/ index from being treated as a game share URL.
        const afterPrefix = url.slice((`${CANONICAL_DOMAIN}${GAME_PATH_PREFIX}`).length);
        if (!afterPrefix || afterPrefix === "/") return false;

        return true;
    }

    function resolveShareUrl() {
        // 1) Prefer <link rel="canonical"> (should be /games/{slug}/).
        const canonicalLink = document.querySelector("link[rel='canonical']");
        const canonicalHref = canonicalLink ? canonicalLink.getAttribute("href") : "";
        if (canonicalHref) {
            try {
                const abs = new URL(canonicalHref, CANONICAL_DOMAIN).toString();
                if (isValidCanonicalUrl(abs)) return abs;
            } catch (error) {
                // Fall through
            }
        }

        // 2) Next prefer og:url
        const ogUrl = document.querySelector("meta[property='og:url']");
        const ogHref = ogUrl ? ogUrl.getAttribute("content") : "";
        if (ogHref) {
            try {
                const abs = new URL(ogHref, CANONICAL_DOMAIN).toString();
                if (isValidCanonicalUrl(abs)) return abs;
            } catch (error) {
                // Fall through
            }
        }

        // 3) If we’re on /games/game.html, derive slug from query params (slug or id)
        try {
            const params = new URLSearchParams(window.location.search || "");
            const slugParam = normaliseSlugCandidate(params.get("slug"));
            if (slugParam) {
                const url = getCanonicalGameUrl(slugParam);
                if (isValidCanonicalUrl(url)) return url;
            }

            const idParam = normaliseSlugCandidate(params.get("id")); // underscore → hyphen handled
            if (idParam) {
                const url = getCanonicalGameUrl(idParam);
                if (isValidCanonicalUrl(url)) return url;
            }
        } catch (error) {
            // ignore
        }

        // 4) Derive from pathname if already on /games/{slug}/
        const fromPath = getSlugFromPathname(window.location.pathname || "");
        if (fromPath) {
            const url = getCanonicalGameUrl(fromPath);
            if (isValidCanonicalUrl(url)) return url;
        }

        // 5) Last resort: try parsing current href
        const fromHref = getSlugFromUrl(window.location.href);
        if (fromHref) {
            const url = getCanonicalGameUrl(fromHref);
            if (isValidCanonicalUrl(url)) return url;
        }

        // If we can’t resolve, share the current URL (better than nothing).
        return window.location.href;
    }

    const shareUrl = resolveShareUrl();
    const title = document.title || "Cheeky Commodore Gamer";
    const gameTitle = getGameTitle();
    const description = getShareDescription();
    const shareText =
        description ||
        (gameTitle
            ? `Discover ${gameTitle} on Cheeky Commodore Gamer.`
            : "Discover this game on Cheeky Commodore Gamer.");

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

    let statusTimeout = null;
    const originalLabel = shareBtn ? shareBtn.textContent : "";

    function setStatus(message) {
        if (statusTimeout) {
            window.clearTimeout(statusTimeout);
        }
        if (status) {
            status.textContent = message;
            status.classList.add("is-visible");
            statusTimeout = window.setTimeout(() => {
                status.classList.remove("is-visible");
                status.textContent = "";
            }, 1600);
            return;
        }
        if (shareBtn) {
            shareBtn.textContent = message;
            shareBtn.classList.add("is-copied");
            statusTimeout = window.setTimeout(() => {
                shareBtn.textContent = originalLabel;
                shareBtn.classList.remove("is-copied");
            }, 1600);
        }
    }

    function copyShareUrl() {
        if (!shareUrl) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard
                .writeText(shareUrl)
                .then(() => {
                    setStatus("Link copied!");
                })
                .catch(() => {
                    copyWithFallback(shareUrl);
                    setStatus("Link copied!");
                });
        } else {
            copyWithFallback(shareUrl);
            setStatus("Link copied!");
        }
    }

    function updateFallbackLinks() {
        if (!shareUrl) return;
        const encodedUrl = encodeURIComponent(shareUrl);
        const subject = encodeURIComponent(gameTitle || title || "Cheeky Commodore Gamer");
        const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`);

        if (emailLink) {
            emailLink.href = `mailto:?subject=${subject}&body=${body}`;
        }
        if (whatsappLink) {
            whatsappLink.href = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
        }
        if (xLink) {
            xLink.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodedUrl}`;
        }
        if (facebookLink) {
            facebookLink.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        }
    }

    if (shareBtn) {
        if (navigator.share) {
            shareBtn.addEventListener("click", () => {
                if (!shareUrl) return;
                navigator.share({ title: gameTitle || title, text: shareText, url: shareUrl }).catch(() => {
                    // Ignore share cancellation/errors.
                });
            });
        } else {
            shareBtn.addEventListener("click", copyShareUrl);
        }
    }

    if (copyBtn) {
        copyBtn.addEventListener("click", copyShareUrl);
    }

    // If there’s a fallback panel, ensure it is visible when Web Share isn't available.
    if (fallback && !navigator.share) {
        fallback.hidden = false;
    }

    updateFallbackLinks();
    applyShareButtonClasses();
})();