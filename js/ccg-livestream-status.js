(() => {
    const API_BASE = "https://www.googleapis.com/youtube/v3";
    const CACHE_KEY = "ccg-livestream-status";
    const CACHE_TTL = 45 * 60 * 1000;
    const CHANNEL_HANDLE = "CheekyCommodoreGamer";
    const API_KEY = window.CCG_YT_API_KEY || "";
    const CHANNEL_ID = window.CCG_YT_CHANNEL_ID || "";

    if (!API_KEY) {
        return;
    }

    const footer = document.querySelector("footer.ccg-footer");
    if (!footer) {
        return;
    }

    const cached = readCache();
    if (cached) {
        if (cached.status !== "off") {
            renderStrip(cached);
        }
        return;
    }

    fetchLivestreamStatus()
        .then((status) => {
            if (!status) {
                return;
            }
            writeCache(status);
            if (status.status !== "off") {
                renderStrip(status);
            }
        })
        .catch(() => {
            /* fail silently */
        });

    function readCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.timestamp || !parsed.data) {
                return null;
            }
            if (Date.now() - parsed.timestamp > CACHE_TTL) {
                return null;
            }
            return parsed.data;
        } catch (error) {
            return null;
        }
    }

    function writeCache(data) {
        try {
            localStorage.setItem(
                CACHE_KEY,
                JSON.stringify({
                    timestamp: Date.now(),
                    data
                })
            );
        } catch (error) {
            /* fail silently */
        }
    }

    async function fetchLivestreamStatus() {
        const channelId = CHANNEL_ID || (await fetchChannelId());
        if (!channelId) {
            return null;
        }

        const liveResult = await fetchLiveStream(channelId);
        if (liveResult) {
            return liveResult;
        }

        const upcomingResult = await fetchUpcomingStream(channelId);
        if (upcomingResult) {
            return upcomingResult;
        }

        return {
            status: "off"
        };
    }

    async function fetchChannelId() {
        const url = new URL(`${API_BASE}/channels`);
        url.search = new URLSearchParams({
            part: "id",
            forHandle: CHANNEL_HANDLE,
            key: API_KEY
        }).toString();

        const response = await fetch(url.toString());
        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.items && data.items[0] ? data.items[0].id : null;
    }

    async function fetchLiveStream(channelId) {
        const url = new URL(`${API_BASE}/search`);
        url.search = new URLSearchParams({
            part: "snippet",
            channelId,
            eventType: "live",
            type: "video",
            maxResults: "1",
            key: API_KEY
        }).toString();

        const response = await fetch(url.toString());
        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        const item = data.items && data.items[0];
        if (!item || !item.id || !item.id.videoId) {
            return null;
        }

        return {
            status: "live",
            title: item.snippet ? item.snippet.title : "",
            videoId: item.id.videoId
        };
    }

    async function fetchUpcomingStream(channelId) {
        const searchUrl = new URL(`${API_BASE}/search`);
        searchUrl.search = new URLSearchParams({
            part: "snippet",
            channelId,
            eventType: "upcoming",
            order: "date",
            type: "video",
            maxResults: "1",
            key: API_KEY
        }).toString();

        const searchResponse = await fetch(searchUrl.toString());
        if (!searchResponse.ok) {
            return null;
        }

        const searchData = await searchResponse.json();
        const item = searchData.items && searchData.items[0];
        if (!item || !item.id || !item.id.videoId) {
            return null;
        }

        const detailsUrl = new URL(`${API_BASE}/videos`);
        detailsUrl.search = new URLSearchParams({
            part: "liveStreamingDetails",
            id: item.id.videoId,
            key: API_KEY
        }).toString();

        const detailsResponse = await fetch(detailsUrl.toString());
        if (!detailsResponse.ok) {
            return null;
        }

        const detailsData = await detailsResponse.json();
        const details = detailsData.items && detailsData.items[0];
        const scheduledTime =
            details && details.liveStreamingDetails
                ? details.liveStreamingDetails.scheduledStartTime
                : null;

        if (!scheduledTime) {
            return null;
        }

        return {
            status: "scheduled",
            title: item.snippet ? item.snippet.title : "",
            videoId: item.id.videoId,
            scheduledTime
        };
    }

    function renderStrip(status) {
        const strip = document.createElement("a");
        strip.className = "ccg-livestream-strip";
        strip.href = `https://www.youtube.com/watch?v=${status.videoId}`;
        strip.target = "_blank";
        strip.rel = "noopener";

        const statusSpan = document.createElement("span");
        statusSpan.className = "ccg-livestream-strip__status";

        if (status.status === "live") {
            strip.classList.add("ccg-livestream-strip--live");
            statusSpan.classList.add("ccg-livestream-strip__status--live");
            const dot = document.createElement("span");
            dot.className = "ccg-livestream-strip__live-dot";
            dot.setAttribute("aria-hidden", "true");
            dot.textContent = "🔴";
            statusSpan.append(dot, document.createTextNode("LIVE NOW"));
        } else {
            statusSpan.textContent = "NEXT LIVESTREAM";
        }

        const dividerOne = document.createElement("span");
        dividerOne.className = "ccg-livestream-strip__divider";
        dividerOne.textContent = "·";
        dividerOne.setAttribute("aria-hidden", "true");

        const titleSpan = document.createElement("span");
        titleSpan.className = "ccg-livestream-strip__title";
        titleSpan.textContent = status.title || "Cheeky Commodore Gamer Livestream";

        strip.append(statusSpan, dividerOne, titleSpan);

        if (status.status === "scheduled" && status.scheduledTime) {
            const dividerTwo = document.createElement("span");
            dividerTwo.className = "ccg-livestream-strip__divider";
            dividerTwo.textContent = "·";
            dividerTwo.setAttribute("aria-hidden", "true");

            const timeSpan = document.createElement("span");
            timeSpan.className = "ccg-livestream-strip__time";
            timeSpan.textContent = formatLocalTime(status.scheduledTime);

            strip.append(dividerTwo, timeSpan);
        }

        footer.parentNode.insertBefore(strip, footer);
    }

    function formatLocalTime(isoString) {
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) {
            return "";
        }

        const formatter = new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });

        return formatter.format(date);
    }
})();
