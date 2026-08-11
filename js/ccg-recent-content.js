/* CCG RECENT VIDEO UPLOADS */
(function () {
    "use strict";

    if (window.CCG_RECENT_CONTENT_READY) return;
    window.CCG_RECENT_CONTENT_READY = true;

    const CSS_PATH = "/resources/css/recent-content.css";
    const VIDEO_INDEX_PATH = "/videos/video-index.json";
    const MAX_VIDEOS = 3;

    function isHome() {
        return Boolean(
            document.querySelector(".ccg-page--home") ||
            document.documentElement.matches('[data-ccg-page="home"]')
        );
    }

    function ensureCss() {
        if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_PATH;
        document.head.appendChild(link);
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function target() {
        return document.querySelector(
            ".ccg-page--home .ccg-main--home, .ccg-page--home main, main"
        );
    }

    function latestUniqueVideos(items) {
        const seen = new Set();
        const videos = [];

        for (const item of Array.isArray(items) ? items : []) {
            const id = String(item?.id || "").trim();
            if (!id || seen.has(id)) continue;
            seen.add(id);
            videos.push(item);
            if (videos.length >= MAX_VIDEOS) break;
        }

        return videos;
    }

    function render(items) {
        const root = target();
        if (!root || document.querySelector("[data-ccg-recent-content]")) return;

        const videos = latestUniqueVideos(items);
        if (!videos.length) return;

        const section = document.createElement("section");
        section.className = "ccg-recent-content ccg-amiga-window";
        section.setAttribute("data-ccg-recent-content", "true");
        section.setAttribute("aria-labelledby", "ccg-recent-content-title");

        section.innerHTML = `
            <div class="ccg-recent-content__header">
                <div>
                    <p class="ccg-recent-content__kicker">Latest from YouTube</p>
                    <h2 class="ccg-recent-content__title" id="ccg-recent-content-title">Recently Uploaded</h2>
                </div>
            </div>
            <div class="ccg-recent-content__grid">
                ${videos.map((video) => {
                    const id = String(video.id || "").trim();
                    const title = escapeHtml(video.title || "Cheeky Commodore Gamer video");
                    const thumbnail = escapeHtml(
                        video.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
                    );
                    const youtubeUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;

                    return `
                        <a class="ccg-recent-content__card"
                           href="${youtubeUrl}"
                           target="_blank"
                           rel="noopener noreferrer"
                           aria-label="Watch ${title} on YouTube">
                            <span class="ccg-recent-content__media">
                                <img src="${thumbnail}"
                                     alt="${title}"
                                     loading="lazy"
                                     decoding="async"
                                     width="480"
                                     height="270">
                                <span class="ccg-recent-content__play" aria-hidden="true">▶</span>
                            </span>
                            <span class="ccg-recent-content__name">${title}</span>
                        </a>
                    `;
                }).join("")}
            </div>
        `;

        root.appendChild(section);
    }

    async function init() {
        if (!isHome()) return;
        ensureCss();

        try {
            const response = await fetch(VIDEO_INDEX_PATH, { cache: "no-cache" });
            if (!response.ok) return;
            const data = await response.json();
            render(data?.items);
        } catch (error) {
            console.error("[CCG-RECENT-VIDEOS] Failed to load latest videos", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
