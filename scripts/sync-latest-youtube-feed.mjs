#!/usr/bin/env node
/*
 * Refresh the homepage's public YouTube feed from the channel's Atom RSS.
 * No YouTube API key, browser scraping, or modification to games.json.
 * Fail closed: a missing/malformed feed never overwrites the last good JSON.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CHANNEL_ID = "UCHROCLVcatA449Gg-PoqlKw";
const OUTPUT_PATH = path.resolve(fileURLToPath(new URL("../data/latest-youtube-videos.json", import.meta.url)));
const MAX_ITEMS = 6;

function decodeXml(value) {
    const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    return String(value || "").replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, entity) => {
        if (entity[0] !== "#") return entities[entity.toLowerCase()] ?? match;
        const hex = /^#x/i.test(entity);
        const number = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
        return Number.isInteger(number) && number > 0 && number <= 0x10ffff
            && !(number >= 0xd800 && number <= 0xdfff) ? String.fromCodePoint(number) : "";
    });
}

function tag(xml, name) {
    const rx = new RegExp("<" + name.replace(":", "\\:") + "\\b[^>]*>([\\s\\S]*?)<\\/" + name.replace(":", "\\:") + ">", "i");
    return rx.exec(xml)?.[1]?.trim() || "";
}

export function parseChannelFeed(xml, expectedChannel = CHANNEL_ID) {
    if (typeof xml !== "string" || xml.length > 2_000_000) throw new Error("Invalid YouTube feed response size");
    const channel = tag(xml, "yt:channelId");
    if (channel !== expectedChannel) throw new Error("YouTube RSS channel ID mismatch");
    const seen = new Set();
    const entries = [];
    for (const match of xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)) {
        const entry = match[1];
        const id = tag(entry, "yt:videoId");
        const title = decodeXml(tag(entry, "title")).trim();
        const publishedAt = tag(entry, "published");
        const timestamp = Date.parse(publishedAt);
        if (!/^[A-Za-z0-9_-]{11}$/.test(id) || seen.has(id) || !title || title.length > 300
            || !Number.isFinite(timestamp) || timestamp <= 0) continue;
        if (tag(entry, "yt:channelId") !== expectedChannel) continue;
        seen.add(id);
        entries.push({
            id,
            title,
            publishedAt: new Date(timestamp).toISOString(),
            thumbnail: "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg"
        });
    }
    entries.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id));
    if (entries.length < 3) throw new Error("Insufficient validated public YouTube uploads to replace the feed");
    return entries.slice(0, MAX_ITEMS);
}

export async function refreshFeed(fetchImpl = fetch, outputPath = OUTPUT_PATH) {
    const url = "https://www.youtube.com/feeds/videos.xml?channel_id=" + encodeURIComponent(CHANNEL_ID);
    const response = await fetchImpl(url, {
        headers: { accept: "application/atom+xml, application/xml;q=0.9" },
        signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error("YouTube RSS returned HTTP " + response.status);
    const videos = parseChannelFeed(await response.text());
    let previous = null;
    try {
        previous = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }
    if (previous?.source === "youtube-atom-feed" && previous.channelId === CHANNEL_ID
        && JSON.stringify(previous.videos) === JSON.stringify(videos)) {
        console.log("[CCG recent YouTube] Feed is already current.");
        return { changed: false, videos };
    }
    const payload = {
        version: 1,
        channelId: CHANNEL_ID,
        source: "youtube-atom-feed",
        syncedAt: new Date().toISOString(),
        videos
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
    console.log("[CCG recent YouTube] Refreshed " + videos.length + " channel videos; newest " + videos[0].id + ".");
    return { changed: true, videos };
}

export async function probeFeed(fetchImpl = fetch) {
    const url = "https://www.youtube.com/feeds/videos.xml?channel_id=" + encodeURIComponent(CHANNEL_ID);
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(20000) });
    const xml = await response.text();
    const summary = {
        status: response.status,
        contentType: response.headers?.get?.("content-type") || "",
        expectedChannelId: CHANNEL_ID,
        receivedChannelId: tag(xml, "yt:channelId") || null,
        xmlFeed: /<feed\b/i.test(xml),
        responsePrefix: xml.slice(0, 140).replace(/\s+/g, " ").replace(/[^\x20-\x7e]/g, "")
    };
    console.log("[CCG recent YouTube] RSS diagnostic: " + JSON.stringify(summary));
    return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const run = process.argv.includes("--probe") ? probeFeed : refreshFeed;
    run().catch((error) => {
        console.error("[CCG recent YouTube] Keeping last good feed: " + error.message);
        process.exitCode = 1;
    });
}
