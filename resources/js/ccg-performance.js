(function () {
    "use strict";

    if (window.CCG_PERFORMANCE_FOUNDATIONS_READY) return;
    window.CCG_PERFORMANCE_FOUNDATIONS_READY = true;

    const STYLESHEET_PATH = "/resources/css/ccg-performance-foundations.css";
    const root = document.documentElement;
    const desktopQuery = window.matchMedia?.("(min-width: 1024px)");
    const finePointerQuery = window.matchMedia?.("(pointer: fine)");
    const reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const compactViewportQuery = window.matchMedia?.("(max-width: 1199px), (max-height: 700px)");
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const saveData = Boolean(connection?.saveData);

    const state = {
        idle: false,
        scrolling: false,
        visible: !document.hidden,
        mutationObserver: null,
        mutationScopes: new Set(),
        idleTimer: null,
        scrollTimer: null,
        mutationTimer: null,
        pointerActivityAt: 0,
        metrics: {
            cls: 0,
            lcp: 0,
            longTasks: 0
        }
    };

    const IDLE_DELAY = 5000;
    const SCROLL_IDLE_DELAY = 150;
    const MUTATION_DELAY = 80;
    const POINTER_ACTIVITY_INTERVAL = 1000;

    function ensureStylesheet() {
        if (document.querySelector(`link[href="${STYLESHEET_PATH}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = STYLESHEET_PATH;
        link.dataset.ccgPerformanceStyles = "true";
        document.head.appendChild(link);
    }

    function priorityContainerFor(image) {
        return image.closest("[data-ccg-priority-media], .home-hero, .games-hero, .ccg-hero");
    }

    function isPriorityImage(image) {
        if (!(image instanceof HTMLImageElement)) return false;
        if (image.dataset.ccgPriority === "high") return true;
        if (String(image.getAttribute("fetchpriority") || "").toLowerCase() === "high") return true;

        const container = priorityContainerFor(image);
        return Boolean(container && container.querySelector("img") === image);
    }

    function isHeaderImage(image) {
        return Boolean(image.closest("header, .ccg-header, .ccg-brand"));
    }

    function normalizeImage(image) {
        if (!(image instanceof HTMLImageElement)) return;
        if (image.dataset.ccgPerfNormalized === "true") return;

        if (!image.hasAttribute("decoding")) {
            image.setAttribute("decoding", "async");
        }

        const currentLoading = String(image.getAttribute("loading") || "").toLowerCase();

        if (isPriorityImage(image)) {
            image.setAttribute("loading", "eager");
            if (!image.hasAttribute("fetchpriority")) {
                image.setAttribute("fetchpriority", "high");
            }
        } else if (isHeaderImage(image)) {
            image.setAttribute("loading", "eager");
            if (!image.hasAttribute("fetchpriority")) {
                image.setAttribute("fetchpriority", "auto");
            }
        } else {
            if (!currentLoading) {
                image.setAttribute("loading", "lazy");
            }
            if (!image.hasAttribute("fetchpriority") && currentLoading !== "eager") {
                image.setAttribute("fetchpriority", "low");
            }
        }

        image.dataset.ccgPerfNormalized = "true";
    }

    function normalizeIframe(frame) {
        if (!(frame instanceof HTMLIFrameElement)) return;
        if (frame.dataset.ccgPerfNormalized === "true") return;
        if (!frame.closest("[data-ccg-priority-media], .home-hero, .games-hero, .ccg-hero")) {
            if (!frame.hasAttribute("loading")) frame.setAttribute("loading", "lazy");
        }
        frame.dataset.ccgPerfNormalized = "true";
    }

    function normalizeVideo(video) {
        if (!(video instanceof HTMLVideoElement)) return;
        if (video.dataset.ccgPerfNormalized === "true") return;
        if (!video.hasAttribute("preload")) video.setAttribute("preload", "metadata");
        video.dataset.ccgPerfNormalized = "true";
    }

    function normalizeMedia(scope) {
        const host = scope instanceof Element || scope instanceof Document ? scope : document;
        if (host instanceof HTMLImageElement) normalizeImage(host);
        if (host instanceof HTMLIFrameElement) normalizeIframe(host);
        if (host instanceof HTMLVideoElement) normalizeVideo(host);

        host.querySelectorAll?.("img").forEach(normalizeImage);
        host.querySelectorAll?.("iframe").forEach(normalizeIframe);
        host.querySelectorAll?.("video").forEach(normalizeVideo);
    }

    function scheduleMutationPass(scope) {
        if (scope instanceof Element) state.mutationScopes.add(scope);
        window.clearTimeout(state.mutationTimer);
        state.mutationTimer = window.setTimeout(() => {
            const scopes = Array.from(state.mutationScopes);
            state.mutationScopes.clear();
            scopes.forEach(normalizeMedia);
        }, MUTATION_DELAY);
    }

    function observeDynamicMedia() {
        if (!("MutationObserver" in window) || !document.body) return;
        state.mutationObserver = new MutationObserver((records) => {
            for (const record of records) {
                for (const node of record.addedNodes) {
                    if (!(node instanceof Element)) continue;
                    if (node.matches("img, iframe, video") || node.querySelector("img, iframe, video")) {
                        scheduleMutationPass(node);
                    }
                }
            }
        });
        state.mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    function shouldPauseDecorativeWork() {
        if (!state.visible) return true;
        if (state.scrolling) return true;
        return state.idle;
    }

    function applyPauseState() {
        root.classList.toggle("ccg-perf-paused", shouldPauseDecorativeWork());
        root.classList.toggle("ccg-page-hidden", !state.visible);
    }

    function resetIdleTimer() {
        window.clearTimeout(state.idleTimer);
        state.idleTimer = window.setTimeout(() => {
            state.idle = true;
            applyPauseState();
        }, IDLE_DELAY);
    }

    function markActive() {
        const wasIdle = state.idle;
        state.idle = false;
        if (wasIdle) applyPauseState();
        resetIdleTimer();
    }

    function markPointerActive() {
        const now = Date.now();
        if (!state.idle && now - state.pointerActivityAt < POINTER_ACTIVITY_INTERVAL) return;
        state.pointerActivityAt = now;
        markActive();
    }

    function handleScroll() {
        /*
         * Scroll events can fire dozens of times per frame on some mobile
         * browsers. Only mutate the root/body classes when entering or leaving
         * the scrolling state; subsequent events merely renew the quiet timer.
         */
        if (!state.scrolling) {
            state.scrolling = true;
            document.body?.classList.add("scrolling");
            applyPauseState();
        }

        window.clearTimeout(state.scrollTimer);
        state.scrollTimer = window.setTimeout(() => {
            state.scrolling = false;
            document.body?.classList.remove("scrolling");
            applyPauseState();
        }, SCROLL_IDLE_DELAY);
    }

    function handleVisibility() {
        state.visible = !document.hidden;
        applyPauseState();
    }

    function recordMetrics() {
        if (!("PerformanceObserver" in window)) return;

        try {
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) state.metrics.cls += entry.value;
                }
            });
            clsObserver.observe({ type: "layout-shift", buffered: true });
        } catch (error) {}

        try {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const latest = entries[entries.length - 1];
                if (latest) state.metrics.lcp = Math.round(latest.startTime);
            });
            lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
        } catch (error) {}

        try {
            const longTaskObserver = new PerformanceObserver((list) => {
                state.metrics.longTasks += list.getEntries().length;
            });
            longTaskObserver.observe({ type: "longtask", buffered: true });
        } catch (error) {}

        window.CCG_PERFORMANCE_METRICS = state.metrics;
    }

    function dispatchSnapshot() {
        document.dispatchEvent(new CustomEvent("ccg:performance-snapshot", {
            detail: {
                cls: Number(state.metrics.cls.toFixed(4)),
                lcp: state.metrics.lcp,
                longTasks: state.metrics.longTasks,
                saveData,
                reducedMotion: Boolean(reducedMotionQuery?.matches)
            }
        }));
    }

    function bindActivityEvents() {
        const passive = { passive: true };

        if ("PointerEvent" in window) {
            window.addEventListener("pointermove", markPointerActive, passive);
            window.addEventListener("pointerdown", markActive, passive);
        } else {
            window.addEventListener("mousemove", markPointerActive, passive);
            window.addEventListener("mousedown", markActive, passive);
        }

        window.addEventListener("keydown", markActive, passive);
        window.addEventListener("scroll", handleScroll, passive);
        window.addEventListener("focus", markActive, passive);
        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("pagehide", dispatchSnapshot, { once: true });
    }

    function bindCapabilityEvents() {
        [desktopQuery, finePointerQuery, reducedMotionQuery, compactViewportQuery]
            .filter(Boolean)
            .forEach((query) => query.addEventListener?.("change", applyRootCapabilities));
    }

    function applyRootCapabilities() {
        root.classList.add("ccg-perf-enabled");
        root.classList.toggle("ccg-perf-desktop", Boolean(desktopQuery?.matches && finePointerQuery?.matches));
        root.classList.toggle("ccg-perf-reduced-motion", Boolean(reducedMotionQuery?.matches));
        root.classList.toggle("ccg-perf-save-data", saveData);
        root.classList.toggle("ccg-perf-compact", Boolean(compactViewportQuery?.matches));
    }

    function initialise() {
        normalizeMedia(document);
        observeDynamicMedia();
        bindActivityEvents();
        bindCapabilityEvents();
        recordMetrics();
        resetIdleTimer();
        applyPauseState();
    }

    ensureStylesheet();
    applyRootCapabilities();

    if (document.body) {
        initialise();
    } else {
        document.addEventListener("DOMContentLoaded", initialise, { once: true });
    }
})();